from __future__ import annotations

import json
import os
import re
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import chromadb
import requests
from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parent
SITE_DIR = ROOT_DIR.parent
PROJECT_ROOT = SITE_DIR.parent
KB_DIR = PROJECT_ROOT / "knowledge_base"
MAP_GUIDE_PATH = SITE_DIR / "shared" / "guide" / "user_guide.html"


def load_env() -> None:
    load_dotenv(ROOT_DIR / ".env")


def get_env(name: str, default: str | None = None) -> str:
    value = os.getenv(name, default)
    if value is None:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def get_float_env(name: str, default: float) -> float:
    return float(os.getenv(name, str(default)))


def get_int_env(name: str, default: int) -> int:
    return int(os.getenv(name, str(default)))


def resolve_path_env(name: str, default: Path) -> Path:
    raw_value = get_env(name, str(default))
    candidate = Path(raw_value)
    if candidate.is_absolute():
        return candidate.resolve()
    return (ROOT_DIR / candidate).resolve()


@dataclass
class DocumentChunk:
    chunk_id: str
    text: str
    source: str
    title: str
    chunk_index: int


class OllamaClient:
    def __init__(self, base_url: str, chat_model: str, embed_model: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.chat_model = chat_model
        self.embed_model = embed_model
        self.session = requests.Session()
        self.session.timeout = 120

    def healthcheck(self) -> None:
        response = self.session.get(f"{self.base_url}/api/tags", timeout=30)
        response.raise_for_status()

    def embed(self, text: str) -> list[float]:
        payload = {"model": self.embed_model, "input": text}
        response = self.session.post(f"{self.base_url}/api/embed", json=payload, timeout=120)
        response.raise_for_status()
        data = response.json()
        embeddings = data.get("embeddings")
        if not embeddings or not isinstance(embeddings, list):
            raise RuntimeError("Ollama embed response does not contain embeddings")
        return embeddings[0]

    def chat(self, messages: list[dict[str, str]]) -> str:
        payload = {"model": self.chat_model, "messages": messages, "stream": False}
        response = self.session.post(f"{self.base_url}/api/chat", json=payload, timeout=240)
        response.raise_for_status()
        data = response.json()
        message = data.get("message", {})
        content = message.get("content", "").strip()
        if not content:
            raise RuntimeError("Ollama chat response is empty")
        return content


class KnowledgeBase:
    def __init__(self, chroma_dir: Path, collection_name: str, ollama: OllamaClient) -> None:
        self.chroma_dir = chroma_dir
        self.collection_name = collection_name
        self.ollama = ollama
        self.client = chromadb.PersistentClient(path=str(chroma_dir))
        self.collection = self.client.get_or_create_collection(name=collection_name)

    def reset_collection(self) -> None:
        try:
            self.client.delete_collection(self.collection_name)
        except Exception:
            pass
        self.collection = self.client.get_or_create_collection(name=self.collection_name)

    def add_chunks(self, chunks: Iterable[DocumentChunk]) -> int:
        count = 0
        for chunk in chunks:
            embedding = self.ollama.embed(chunk.text)
            self.collection.add(
                ids=[chunk.chunk_id],
                documents=[chunk.text],
                embeddings=[embedding],
                metadatas=[{"source": chunk.source, "title": chunk.title, "chunk_index": chunk.chunk_index}],
            )
            count += 1
        return count

    def search(self, query: str, top_k: int) -> list[dict]:
        expanded_query = expand_query(query)
        query_embedding = self.ollama.embed(expanded_query)
        fetch_k = max(top_k * 4, 12)
        result = self.collection.query(query_embeddings=[query_embedding], n_results=fetch_k)

        documents = result.get("documents", [[]])[0]
        metadatas = result.get("metadatas", [[]])[0]
        distances = result.get("distances", [[]])[0]
        ids = result.get("ids", [[]])[0]

        query_tokens = set(tokenize_for_search(expanded_query))
        items = []
        for doc_id, document, metadata, distance in zip(ids, documents, metadatas, distances):
            vector_score = 1.0 / (1.0 + float(distance))
            doc_tokens = set(tokenize_for_search(document))
            overlap = len(query_tokens & doc_tokens)
            lexical_score = overlap / max(1, len(query_tokens))
            score = (vector_score * 0.7) + (lexical_score * 0.3)
            items.append(
                {
                    "id": doc_id,
                    "document": document,
                    "metadata": metadata or {},
                    "distance": float(distance),
                    "score": score,
                    "vector_score": vector_score,
                    "lexical_score": lexical_score,
                }
            )
        items.sort(key=lambda item: item["score"], reverse=True)
        return items[:top_k]


def normalize_whitespace(text: str) -> str:
    return re.sub(r"\n{3,}", "\n\n", text.strip())


def tokenize_for_search(text: str) -> list[str]:
    normalized = text.lower().replace("ё", "е")
    normalized = re.sub(r"[^a-zа-я0-9\s<>@_-]+", " ", normalized)
    return [token for token in normalized.split() if len(token) >= 2]


def expand_query(query: str) -> str:
    expanded = query
    replacements = {
        "поставить метку": "поставить метку добавить метку воткнуть метку",
        "как поставить": "как поставить как добавить как воткнуть",
        "поставить": "поставить добавить воткнуть",
        "метку": "метку маркер",
        "координаты": "координаты x y dayz",
    }
    lowered = query.lower()
    for original, replacement in replacements.items():
        if original in lowered:
            expanded += f" {replacement}"
    return expanded


def split_text(text: str, target_size: int = 1400, overlap: int = 250) -> list[str]:
    clean = normalize_whitespace(text)
    if len(clean) <= target_size:
        return [clean]

    paragraphs = clean.split("\n\n")
    chunks: list[str] = []
    current = ""

    for paragraph in paragraphs:
        paragraph = paragraph.strip()
        if not paragraph:
            continue

        candidate = f"{current}\n\n{paragraph}".strip() if current else paragraph
        if len(candidate) <= target_size:
            current = candidate
            continue

        if current:
            chunks.append(current)
            tail = current[-overlap:] if overlap > 0 else ""
            current = f"{tail}\n\n{paragraph}".strip()
        else:
            start = 0
            while start < len(paragraph):
                end = min(start + target_size, len(paragraph))
                chunk = paragraph[start:end].strip()
                if chunk:
                    chunks.append(chunk)
                if end >= len(paragraph):
                    break
                start = max(0, end - overlap)
            current = ""

    if current:
        chunks.append(current)

    return chunks


def build_chunks_from_markdown(path: Path) -> list[DocumentChunk]:
    text = path.read_text(encoding="utf-8")
    raw_chunks = split_text(text, target_size=1100, overlap=180)
    return [
        DocumentChunk(str(uuid.uuid4()), chunk, path.name, path.stem, index)
        for index, chunk in enumerate(raw_chunks)
    ]


def extract_text_from_html(html: str) -> str:
    html = re.sub(r"<script\b[^>]*>.*?</script>", " ", html, flags=re.IGNORECASE | re.DOTALL)
    html = re.sub(r"<style\b[^>]*>.*?</style>", " ", html, flags=re.IGNORECASE | re.DOTALL)
    html = re.sub(r"<br\s*/?>", "\n", html, flags=re.IGNORECASE)
    html = re.sub(r"</(p|div|section|article|li|ul|ol|details)>", "\n", html, flags=re.IGNORECASE)
    html = re.sub(r"<h[1-4][^>]*>", "\n\n## ", html, flags=re.IGNORECASE)
    html = re.sub(r"</h[1-4]>", "\n", html, flags=re.IGNORECASE)
    html = re.sub(r"<[^>]+>", " ", html)
    html = html.replace("&nbsp;", " ").replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")
    return normalize_whitespace(html)


def build_chunks_from_html(path: Path) -> list[DocumentChunk]:
    html = path.read_text(encoding="utf-8")
    text = extract_text_from_html(html)
    raw_chunks = split_text(text, target_size=1000, overlap=160)
    return [
        DocumentChunk(str(uuid.uuid4()), chunk, path.name, path.stem, index)
        for index, chunk in enumerate(raw_chunks)
    ]


def build_chunks_from_jsonl(path: Path) -> list[DocumentChunk]:
    chunks: list[DocumentChunk] = []
    with path.open("r", encoding="utf-8") as handle:
        for index, line in enumerate(handle):
            line = line.strip()
            if not line:
                continue
            item = json.loads(line)
            title = item.get("title", f"{path.stem}-{index}")
            text = item.get("text", "").strip()
            tags = item.get("tags", [])
            source_text = f"Title: {title}\nTags: {', '.join(tags)}\n\n{text}".strip()
            chunks.append(DocumentChunk(item.get("id", str(uuid.uuid4())), source_text, path.name, title, index))
    return chunks


def default_kb_files() -> list[Path]:
    return [KB_DIR / "dayz_map_kb.md", KB_DIR / "training_corpus.jsonl", MAP_GUIDE_PATH]


def load_all_chunks() -> list[DocumentChunk]:
    chunks: list[DocumentChunk] = []
    for path in default_kb_files():
        if not path.exists():
            raise FileNotFoundError(f"Knowledge base file not found: {path}")
        if path.suffix.lower() == ".jsonl":
            chunks.extend(build_chunks_from_jsonl(path))
        elif path.suffix.lower() in {".html", ".htm"}:
            chunks.extend(build_chunks_from_html(path))
        else:
            chunks.extend(build_chunks_from_markdown(path))
    return chunks


def build_context_block(results: list[dict], min_score: float) -> str:
    filtered = [item for item in results if item["score"] >= min_score]
    if not filtered:
        return ""

    parts = []
    for idx, item in enumerate(filtered, start=1):
        meta = item["metadata"]
        parts.append(
            "\n".join(
                [
                    f"[Context {idx}]",
                    f"Source: {meta.get('source', 'unknown')}",
                    f"Title: {meta.get('title', 'unknown')}",
                    f"Chunk: {meta.get('chunk_index', '?')}",
                    item["document"],
                ]
            )
        )
    return "\n\n".join(parts)
