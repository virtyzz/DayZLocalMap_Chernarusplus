# DayZ Map Assistant Backend

Локальный backend помощника, встроенного прямо в `dayzmap_all_in_one`.

Состав:

- `assistant_api.py` — HTTP API для чата на карте
- `kb_service.py` — поиск по базе знаний и генерация ответа через локальную Ollama
- `rag_core.py` — индексация и поиск в `ChromaDB`
- `index_kb.py` — ручная переиндексация базы знаний
- `ask_kb.py` — локальная CLI-проверка ответов
- `start-assistant-api.ps1` — локальный запуск на Windows

База знаний берётся из:

- `../../knowledge_base/dayz_map_kb.md`
- `../../knowledge_base/training_corpus.jsonl`
- `../shared/guide/user_guide.html`

Быстрый запуск:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python assistant_api.py --host 127.0.0.1 --port 8098
```

Основные настройки в `.env`:

- `OLLAMA_CHAT_MODEL` — чат-модель
- `OLLAMA_EMBED_MODEL` — embedding-модель
- `OLLAMA_THINK` — включает или выключает reasoning/thinking режим у thinking-моделей; для RAG рекомендуется `false`
- `OLLAMA_TEMPERATURE` — температура генерации; для стабильных ответов по базе знаний рекомендуется `0`

Индексация базы:

```bash
python index_kb.py
```

Проверка ответа из той же базы:

```bash
python ask_kb.py "Как поставить метку?"
```
