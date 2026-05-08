from __future__ import annotations

import json
import re
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[2]
SITE_DIR = ROOT_DIR / "dayzmap_all_in_one"
KB_DIR = ROOT_DIR / "knowledge_base"
OUTPUT_PATH = SITE_DIR / "shared" / "data" / "assistant-kb.json"


def normalize_whitespace(text: str) -> str:
    return re.sub(r"\n{3,}", "\n\n", text.strip())


def split_text(text: str, target_size: int = 1100, overlap: int = 180) -> list[str]:
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
            continue

        start = 0
        while start < len(paragraph):
            end = min(start + target_size, len(paragraph))
            piece = paragraph[start:end].strip()
            if piece:
                chunks.append(piece)
            if end >= len(paragraph):
                break
            start = max(0, end - overlap)

    if current:
        chunks.append(current)

    return chunks


def extract_text_from_html(html: str) -> str:
    html = re.sub(r"<script\b[^>]*>.*?</script>", " ", html, flags=re.IGNORECASE | re.DOTALL)
    html = re.sub(r"<style\b[^>]*>.*?</style>", " ", html, flags=re.IGNORECASE | re.DOTALL)
    html = re.sub(r"<br\s*/?>", "\n", html, flags=re.IGNORECASE)
    html = re.sub(r"</(p|div|section|article|li|ul|ol|details|summary)>", "\n", html, flags=re.IGNORECASE)
    html = re.sub(r"<h[1-4][^>]*>", "\n\n## ", html, flags=re.IGNORECASE)
    html = re.sub(r"</h[1-4]>", "\n", html, flags=re.IGNORECASE)
    html = re.sub(r"<[^>]+>", " ", html)
    html = (
        html.replace("&nbsp;", " ")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&amp;", "&")
    )
    return normalize_whitespace(html)


def build_markdown_chunks(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8")
    return [
        {
            "source": path.name,
            "title": path.stem,
            "chunk_index": index,
            "text": chunk,
        }
        for index, chunk in enumerate(split_text(text, target_size=1100, overlap=180))
    ]


def build_html_chunks(path: Path) -> list[dict]:
    html = path.read_text(encoding="utf-8")
    text = extract_text_from_html(html)
    return [
        {
            "source": path.name,
            "title": path.stem,
            "chunk_index": index,
            "text": chunk,
        }
        for index, chunk in enumerate(split_text(text, target_size=1000, overlap=160))
    ]


def build_jsonl_chunks(path: Path) -> list[dict]:
    chunks: list[dict] = []
    with path.open("r", encoding="utf-8") as handle:
        for index, line in enumerate(handle):
            line = line.strip()
            if not line:
                continue
            item = json.loads(line)
            title = item.get("title", f"{path.stem}-{index}")
            tags = ", ".join(item.get("tags", []))
            text = item.get("text", "").strip()
            combined = f"Title: {title}\nTags: {tags}\n\n{text}".strip()
            chunks.append(
                {
                    "source": path.name,
                    "title": title,
                    "chunk_index": index,
                    "text": combined,
                }
            )
    return chunks


def load_chunks() -> list[dict]:
    files = [
        KB_DIR / "dayz_map_kb.md",
        KB_DIR / "LOCAL_LLM_SETUP.md",
        KB_DIR / "UBUNTU_24_04_RAG_SETUP.md",
        KB_DIR / "training_corpus.jsonl",
        KB_DIR / "user_guide.html",
    ]

    chunks: list[dict] = []
    for path in files:
        if path.suffix.lower() == ".jsonl":
            chunks.extend(build_jsonl_chunks(path))
        elif path.suffix.lower() in {".html", ".htm"}:
            chunks.extend(build_html_chunks(path))
        else:
            chunks.extend(build_markdown_chunks(path))
    return chunks


def main() -> None:
    chunks = load_chunks()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(
            {
                "version": 1,
                "generated_from": "knowledge_base",
                "chunk_count": len(chunks),
                "chunks": chunks,
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    print(f"Wrote {len(chunks)} chunks to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
