from __future__ import annotations

import argparse
import json
import logging
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Lock
from urllib.parse import urlparse

from kb_service import DayzKnowledgeService


LOGGER = logging.getLogger("dayz-rag-api")
ALLOWED_MAP_IDS = {"cherno", "deerisle", "deadfall"}


class ServiceRuntime:
    def __init__(self) -> None:
        self._lock = Lock()
        self._service: DayzKnowledgeService | None = None

    def get_service(self) -> DayzKnowledgeService:
        with self._lock:
            if self._service is None:
                self._service = DayzKnowledgeService()
            return self._service


RUNTIME = ServiceRuntime()


class AssistantApiHandler(BaseHTTPRequestHandler):
    server_version = "DayzAssistantApi/1.0"

    def do_GET(self) -> None:
        if urlparse(self.path).path == "/health":
            self._handle_health()
            return
        self._send_json(HTTPStatus.NOT_FOUND, {"ok": False, "error": "Not found"})

    def do_POST(self) -> None:
        if urlparse(self.path).path == "/ask":
            self._handle_ask()
            return
        self._send_json(HTTPStatus.NOT_FOUND, {"ok": False, "error": "Not found"})

    def _handle_health(self) -> None:
        try:
            service = RUNTIME.get_service()
            self._send_json(HTTPStatus.OK, {"ok": True, "chat_model": service.chat_model, "embed_model": service.embed_model, "collection": service.collection_name})
        except Exception as error:
            LOGGER.exception("Healthcheck failed")
            self._send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"ok": False, "error": str(error)})

    def _handle_ask(self) -> None:
        try:
            payload = self._read_json_body()
        except ValueError as error:
            self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": str(error)})
            return

        question = str(payload.get("question", "")).strip()
        map_id = str(payload.get("map_id", "")).strip().lower() or None
        map_name = str(payload.get("map_name", "")).strip() or None
        if not question:
            self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Question is required"})
            return
        if map_id and map_id not in ALLOWED_MAP_IDS:
            self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Unsupported map id"})
            return

        try:
            result = RUNTIME.get_service().answer_question(question=question, map_id=map_id, map_name=map_name)
            self._send_json(HTTPStatus.OK, {"ok": True, "answer": result.answer, "sources": result.sources, "used_context": result.used_context})
        except Exception as error:
            LOGGER.exception("Request failed")
            self._send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"ok": False, "error": str(error)})

    def _read_json_body(self) -> dict:
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError as error:
            raise ValueError("Invalid Content-Length") from error
        raw = self.rfile.read(content_length)
        try:
            payload = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError as error:
            raise ValueError("Invalid JSON body") from error
        if not isinstance(payload, dict):
            raise ValueError("JSON body must be an object")
        return payload

    def _send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args) -> None:
        LOGGER.info("%s - %s", self.address_string(), format % args)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run local DayZ map assistant API")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8098)
    return parser.parse_args()


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    args = parse_args()
    with ThreadingHTTPServer((args.host, args.port), AssistantApiHandler) as server:
        LOGGER.info("Listening on http://%s:%s", args.host, args.port)
        server.serve_forever()


if __name__ == "__main__":
    main()
