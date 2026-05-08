from __future__ import annotations

import argparse
from pathlib import Path

from rag_core import (
    KnowledgeBase,
    OllamaClient,
    build_context_block,
    get_env,
    get_float_env,
    get_int_env,
    load_env,
    resolve_path_env,
)


SYSTEM_PROMPT = """Ты отвечаешь только по базе знаний веб-карты DayZ.

Правила:
1. Используй только факты из переданного материала базы знаний.
2. Если данных недостаточно, прямо скажи: "В базе знаний нет точного ответа на этот вопрос."
3. Не выдумывай функций, файлов, форматов или настроек, которых нет в материале.
4. Отвечай по-русски.
5. Если вопрос формата "как сделать", "как поставить", "как включить", "как использовать", отвечай пошагово, если шаги есть в материале.
6. Для пользовательских действий по возможности указывай точные названия кнопок, полей и пунктов интерфейса из базы знаний.
7. Если есть несколько способов выполнить действие, перечисли их явно.
8. Будь конкретным: не ограничивайся общим описанием, если в материале есть шаги.
9. Никогда не вставляй выдуманные ссылки, URL, ссылки вида [Context 1] и фразы вроде "как указано в Context 6".
10. Не упоминай слово "контекст" в ответе пользователю.
11. Не используй markdown-разметку, цитаты через >, заголовки ### и ссылки вида (#context-6). Отвечай обычным текстом.
""".strip()


def format_sources(results: list[dict], min_score: float) -> str:
    lines = []
    for item in results:
        if item["score"] < min_score:
            continue
        meta = item["metadata"]
        lines.append(
            f"- source={meta.get('source', 'unknown')} | title={meta.get('title', 'unknown')} | "
            f"chunk={meta.get('chunk_index', '?')} | score={item['score']:.3f} | "
            f"vector={item.get('vector_score', 0.0):.3f} | lexical={item.get('lexical_score', 0.0):.3f}"
        )
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Ask local DayZ knowledge base via Chroma + Ollama")
    parser.add_argument("question", help="Question for the knowledge base")
    parser.add_argument("--show-context", action="store_true", help="Print retrieved context chunks")
    parser.add_argument("--top-k", type=int, default=None, help="Override KB_TOP_K")
    parser.add_argument("--min-score", type=float, default=None, help="Override KB_MIN_SCORE")
    args = parser.parse_args()

    load_env()

    ollama_url = get_env("OLLAMA_URL", "http://127.0.0.1:11434")
    chat_model = get_env("OLLAMA_CHAT_MODEL", "qwen3:4b")
    embed_model = get_env("OLLAMA_EMBED_MODEL", "bge-m3")
    chroma_dir = resolve_path_env("CHROMA_DIR", Path("./chroma_db"))
    collection_name = get_env("CHROMA_COLLECTION", "dayz_map_kb")
    top_k = args.top_k if args.top_k is not None else get_int_env("KB_TOP_K", 3)
    min_score = args.min_score if args.min_score is not None else get_float_env("KB_MIN_SCORE", 0.20)

    ollama = OllamaClient(
        base_url=ollama_url,
        chat_model=chat_model,
        embed_model=embed_model,
    )
    ollama.healthcheck()

    kb = KnowledgeBase(chroma_dir=chroma_dir, collection_name=collection_name, ollama=ollama)
    results = kb.search(args.question, top_k=top_k)

    print("=== Question ===")
    print(args.question)
    print()

    print("=== Sources ===")
    sources_text = format_sources(results, min_score)
    print(sources_text if sources_text else "No sources above score threshold")
    print()

    context = build_context_block(results, min_score=min_score)
    if not context:
        print("=== Answer ===")
        print("В базе знаний нет точного ответа на этот вопрос.")
        return

    if args.show_context:
        print("=== Context ===")
        print(context)
        print()

    answer = ollama.chat(
        [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Материал базы знаний:\n\n{context}\n\n"
                    f"Вопрос: {args.question}\n\n"
                    "Ответь обычным текстом без markdown-разметки и без ссылок на контекст."
                ),
            },
        ]
    )

    print("=== Answer ===")
    print(answer)


if __name__ == "__main__":
    main()
