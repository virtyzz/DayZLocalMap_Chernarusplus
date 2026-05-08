from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from rag_core import KnowledgeBase, OllamaClient, build_context_block, get_env, get_float_env, get_int_env, load_env, resolve_path_env


DEFAULT_EMPTY_ANSWER = "В базе знаний нет точного ответа на этот вопрос."

SYSTEM_PROMPT = """Ты отвечаешь только по базе знаний веб-карты DayZ.

Правила:
1. Используй только факты из переданного материала базы знаний.
2. Если данных недостаточно, прямо скажи: "В базе знаний нет точного ответа на этот вопрос."
3. Не выдумывай функций, файлов, форматов, настроек, URL, координат или названий элементов интерфейса.
4. Отвечай по-русски.
5. Если вопрос формата "как сделать", "как поставить", "как включить", "как использовать", отвечай пошагово, если шаги есть в материале.
6. Для пользовательских действий по возможности указывай точные названия кнопок, полей и пунктов интерфейса из базы знаний.
7. Если есть несколько способов выполнить действие, перечисли их явно.
8. Будь конкретным: не ограничивайся общим описанием, если в материале есть шаги.
9. Никогда не вставляй выдуманные ссылки, URL, ссылки вида [Context 1] и фразы вроде "как указано в Context 6".
10. Не упоминай слова "контекст", "context", "источник", "sources" в ответе пользователю.
11. Не оформляй ответ как сообщение для Discord: не используй разделители из ---, цитаты через >, заголовки ### и лишнюю markdown-разметку.
12. Отвечай обычным текстом. Допустимы только простые нумерованные шаги и короткие списки.
13. Не ссылайся на служебные пометки вида (#context-6) или похожие якоря.
""".strip()


@dataclass
class AnswerPayload:
    answer: str
    sources: list[dict]
    used_context: bool


def format_sources(results: list[dict], min_score: float) -> list[dict]:
    sources: list[dict] = []
    for item in results:
        if item["score"] < min_score:
            continue
        meta = item["metadata"]
        sources.append(
            {
                "source": meta.get("source", "unknown"),
                "title": meta.get("title", "unknown"),
                "chunk_index": meta.get("chunk_index", "?"),
                "score": round(float(item["score"]), 3),
            }
        )
    return sources


def cleanup_answer(text: str) -> str:
    cleaned = text.strip()
    cleaned = re.sub(r"\[Context\s*\d+\]", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\bContext\s*\d+\b", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\bкак указано в Context\s*\d+\b", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\bисточники:\s*$", "", cleaned, flags=re.IGNORECASE | re.MULTILINE)
    cleaned = re.sub(r"(?im)^\s*(source|title|chunk|document|документ)\s*:\s*", "", cleaned)
    cleaned = re.sub(r"(?m)^\s*---\s*$", "", cleaned)
    cleaned = re.sub(r"(?m)^\s{0,3}#{1,6}\s*", "", cleaned)
    cleaned = re.sub(r"(?m)^\s*>\s*", "", cleaned)
    cleaned = re.sub(r"\[([^\]]+)\]\((#[^)]+|[^)]+)\)", r"\1", cleaned)
    cleaned = re.sub(r"\(#context-[^)]+\)", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\*\*(.*?)\*\*", r"\1", cleaned)
    cleaned = re.sub(r"\*(.*?)\*", r"\1", cleaned)
    cleaned = re.sub(r"`([^`]+)`", r"\1", cleaned)
    cleaned = re.sub(r"(?m)^\s*[-*]\s+", "- ", cleaned)
    cleaned = re.sub(r"\(\s*согласно[^)]*\)", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\(\s*как указано[^)]*\)", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    cleaned = re.sub(r"[ \t]{2,}", " ", cleaned)
    cleaned = re.sub(r"\(\s*\)", "", cleaned)
    cleaned = re.sub(r"\s+\.", ".", cleaned)
    return cleaned.strip()


class DayzKnowledgeService:
    def __init__(self) -> None:
        load_env()
        self.ollama_url = get_env("OLLAMA_URL", "http://127.0.0.1:11434")
        self.chat_model = get_env("OLLAMA_CHAT_MODEL", "qwen3:4b")
        self.embed_model = get_env("OLLAMA_EMBED_MODEL", "bge-m3")
        self.temperature = get_float_env("OLLAMA_TEMPERATURE", 0.0)
        self.chroma_dir = resolve_path_env("CHROMA_DIR", Path("./chroma_db"))
        self.collection_name = get_env("CHROMA_COLLECTION", "dayz_map_kb")
        self.top_k = get_int_env("KB_TOP_K", 3)
        self.min_score = get_float_env("KB_MIN_SCORE", 0.20)
        self._ollama: OllamaClient | None = None
        self._kb: KnowledgeBase | None = None

    def _ensure_clients(self) -> tuple[OllamaClient, KnowledgeBase]:
        if self._ollama is None:
            self._ollama = OllamaClient(
                self.ollama_url,
                self.chat_model,
                self.embed_model,
                temperature=self.temperature,
            )
            self._ollama.healthcheck()
        if self._kb is None:
            self._kb = KnowledgeBase(self.chroma_dir, self.collection_name, self._ollama)
        return self._ollama, self._kb

    def build_search_query(self, question: str, map_id: str | None = None, map_name: str | None = None) -> str:
        pieces = [question.strip()]
        if map_id:
            pieces.append(f"selected map id {map_id}")
        if map_name:
            pieces.append(f"selected map {map_name}")
        return "\n".join(piece for piece in pieces if piece)

    def answer_question(
        self,
        question: str,
        map_id: str | None = None,
        map_name: str | None = None,
        top_k: int | None = None,
        min_score: float | None = None,
    ) -> AnswerPayload:
        cleaned_question = (question or "").strip()
        if not cleaned_question:
            raise ValueError("Question is empty")

        resolved_top_k = top_k if top_k is not None else self.top_k
        resolved_min_score = min_score if min_score is not None else self.min_score
        ollama, kb = self._ensure_clients()
        search_query = self.build_search_query(cleaned_question, map_id=map_id, map_name=map_name)
        results = kb.search(search_query, top_k=resolved_top_k)
        context = build_context_block(results, min_score=resolved_min_score)
        sources = format_sources(results, resolved_min_score)

        if not context:
            return AnswerPayload(DEFAULT_EMPTY_ANSWER, sources, False)

        selected_map_block = ""
        if map_id or map_name:
            selected_map_block = f"Выбранная карта на сайте:\n- id: {map_id or 'unknown'}\n- name: {map_name or 'unknown'}\n\n"

        answer = ollama.chat(
            [
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"{selected_map_block}"
                        f"Материал базы знаний:\n\n{context}\n\n"
                        f"Вопрос: {cleaned_question}\n\n"
                        "Ответь обычным текстом без markdown-разметки и без ссылок на контекст."
                    ),
                },
            ]
        )
        return AnswerPayload(cleanup_answer(answer), sources, True)
