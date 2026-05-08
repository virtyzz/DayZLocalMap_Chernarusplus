from __future__ import annotations

from pathlib import Path

from rag_core import KnowledgeBase, OllamaClient, get_env, load_all_chunks, load_env, resolve_path_env


def main() -> None:
    load_env()

    ollama_url = get_env("OLLAMA_URL", "http://127.0.0.1:11434")
    chat_model = get_env("OLLAMA_CHAT_MODEL", "qwen3:4b")
    embed_model = get_env("OLLAMA_EMBED_MODEL", "bge-m3")
    chroma_dir = resolve_path_env("CHROMA_DIR", Path("./chroma_db"))
    collection_name = get_env("CHROMA_COLLECTION", "dayz_map_kb")

    ollama = OllamaClient(
        base_url=ollama_url,
        chat_model=chat_model,
        embed_model=embed_model,
    )
    ollama.healthcheck()

    kb = KnowledgeBase(chroma_dir=chroma_dir, collection_name=collection_name, ollama=ollama)
    kb.reset_collection()

    chunks = load_all_chunks()
    added = kb.add_chunks(chunks)

    print(f"Indexed chunks: {added}")
    print(f"Collection: {collection_name}")
    print(f"Chroma dir: {chroma_dir}")


if __name__ == "__main__":
    main()
