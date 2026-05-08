from __future__ import annotations

import argparse

from kb_service import DayzKnowledgeService
from rag_core import build_context_block


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
    parser = argparse.ArgumentParser(description="Ask local DayZ knowledge base via the same pipeline as the web chat")
    parser.add_argument("question", help="Question for the knowledge base")
    parser.add_argument("--show-context", action="store_true", help="Print retrieved context chunks")
    parser.add_argument("--top-k", type=int, default=None, help="Override KB_TOP_K")
    parser.add_argument("--min-score", type=float, default=None, help="Override KB_MIN_SCORE")
    args = parser.parse_args()

    service = DayzKnowledgeService()
    resolved_top_k = args.top_k if args.top_k is not None else service.top_k
    resolved_min_score = args.min_score if args.min_score is not None else service.min_score

    _, kb = service._ensure_clients()
    results = kb.search(args.question, top_k=resolved_top_k)
    context = build_context_block(results, min_score=resolved_min_score)

    print("=== Question ===")
    print(args.question)
    print()

    print("=== Sources ===")
    sources_text = format_sources(results, resolved_min_score)
    print(sources_text if sources_text else "No sources above score threshold")
    print()

    if args.show_context:
        print("=== Context ===")
        print(context if context else "No context above score threshold")
        print()

    print("=== Answer ===")
    answer = service.answer_question(
        question=args.question,
        top_k=resolved_top_k,
        min_score=resolved_min_score,
    )
    print(answer.answer)


if __name__ == "__main__":
    main()
