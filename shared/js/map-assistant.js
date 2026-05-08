(function () {
    const assistantRoot = document.getElementById("mapAssistant");
    if (!assistantRoot) {
        return;
    }

    const toggleButton = document.getElementById("mapAssistantToggle");
    const panel = document.getElementById("mapAssistantPanel");
    const statusNode = document.getElementById("mapAssistantStatus");
    const messagesNode = document.getElementById("mapAssistantMessages");
    const form = document.getElementById("mapAssistantForm");
    const input = document.getElementById("mapAssistantInput");
    const clearButton = document.getElementById("mapAssistantClear");
    const sendButton = document.getElementById("mapAssistantSend");
    const assistantConfig = window.DayzMapAssistantConfig || {};

    const storageKey = "dayzMapAssistantOpen";
    const historyStorageKey = "dayzMapAssistantDraft";
    let pending = false;
    let knowledgeBase = null;

    const kbUrl = assistantConfig.kbUrl || "shared/data/assistant-kb.json";
    const ollamaBaseUrl = assistantConfig.ollamaBaseUrl || "./assistant-api/";
    const chatModel = assistantConfig.chatModel || "qwen3:4b";
    const topK = Number(assistantConfig.topK || 4);
    const maxContextChars = Number(assistantConfig.maxContextChars || 5200);

    function getSelectedMap() {
        const mapId = document.body?.dataset?.mapId || window.DayzMapBootstrap?.defaultMapId || "cherno";
        const mapName = window.DayzMapScriptHelpers?.getMapName
            ? window.DayzMapScriptHelpers.getMapName(mapId)
            : mapId;
        return { mapId: mapId, mapName: mapName };
    }

    function setStatus(text, tone) {
        statusNode.textContent = text;
        statusNode.dataset.tone = tone || "neutral";
    }

    function getEndpoint(path) {
        const normalizedBase = String(ollamaBaseUrl).replace(/\/+$/, "");
        const normalizedPath = String(path || "").replace(/^\/+/, "");
        return normalizedBase + "/" + normalizedPath;
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function formatMultiline(text) {
        return escapeHtml(text).replace(/\n/g, "<br>");
    }

    function addMessage(role, text, sources) {
        const article = document.createElement("article");
        article.className = "map-assistant__message " + (
            role === "user"
                ? "map-assistant__message--user"
                : "map-assistant__message--assistant"
        );

        const body = document.createElement("p");
        body.innerHTML = formatMultiline(text);
        article.appendChild(body);

        if (Array.isArray(sources) && sources.length > 0) {
            const sourcesBlock = document.createElement("div");
            sourcesBlock.className = "map-assistant__sources";
            const label = document.createElement("strong");
            label.textContent = "Источники:";
            sourcesBlock.appendChild(label);

            const list = document.createElement("ul");
            sources.slice(0, 4).forEach(function (source) {
                const item = document.createElement("li");
                item.textContent = source.title + " (" + source.source + ", score " + source.score + ")";
                list.appendChild(item);
            });
            sourcesBlock.appendChild(list);
            article.appendChild(sourcesBlock);
        }

        messagesNode.appendChild(article);
        messagesNode.scrollTop = messagesNode.scrollHeight;
    }

    function normalizeRussianYo(value) {
        return String(value || "").toLowerCase().replace(/ё/g, "е");
    }

    function tokenize(text) {
        return normalizeRussianYo(text)
            .replace(/[^a-zа-я0-9\s@_-]+/gi, " ")
            .split(/\s+/)
            .filter(function (token) {
                return token.length >= 2;
            });
    }

    function expandQuestion(question) {
        const lowered = normalizeRussianYo(question);
        const additions = [];

        if (lowered.includes("метк")) {
            additions.push("метка метки маркер маркеры");
        }
        if (lowered.includes("постав")) {
            additions.push("поставить добавить воткнуть разместить");
        }
        if (lowered.includes("добав")) {
            additions.push("добавить поставить создать");
        }
        if (lowered.includes("координат")) {
            additions.push("координаты x y dayz");
        }
        if (lowered.includes("маршрут")) {
            additions.push("построить маршрут route");
        }
        if (lowered.includes("иск") || lowered.includes("найт")) {
            additions.push("поиск найти фильтр история поиска");
        }
        if (lowered.includes("фигур") || lowered.includes("рисова")) {
            additions.push("фигуры круг прямоугольник линия многоугольник");
        }
        if (lowered.includes("измер")) {
            additions.push("измерение расстояние линейка");
        }

        return [question.trim()].concat(additions).join(" ");
    }

    function buildSearchQuery(question, selectedMap) {
        return [
            expandQuestion(question),
            selectedMap.mapId ? "selected map " + selectedMap.mapId : "",
            selectedMap.mapName ? "selected map " + selectedMap.mapName : ""
        ].filter(Boolean).join(" ");
    }

    async function ensureKnowledgeBase() {
        if (knowledgeBase) {
            return knowledgeBase;
        }

        const response = await fetch(kbUrl, { method: "GET" });
        if (!response.ok) {
            throw new Error("Не удалось загрузить локальную базу знаний");
        }

        knowledgeBase = await response.json();
        return knowledgeBase;
    }

    function scoreChunk(chunk, queryTokens, selectedMap) {
        const chunkText = normalizeRussianYo(chunk.text || "");
        const chunkTitle = normalizeRussianYo(chunk.title || "");
        const chunkSource = normalizeRussianYo(chunk.source || "");
        const chunkTokens = new Set(tokenize(chunkText));
        let overlap = 0;

        queryTokens.forEach(function (token) {
            if (chunkTokens.has(token)) {
                overlap += 1;
            }
        });

        let score = overlap / Math.max(queryTokens.length, 1);
        const queryText = queryTokens.join(" ");

        queryTokens.forEach(function (token) {
            if (chunkText.includes(token)) {
                score += 0.015;
            }
            if (chunkTitle.includes(token)) {
                score += 0.03;
            }
        });

        if (chunkText.includes(normalizeRussianYo(selectedMap.mapName))) {
            score += 0.12;
        }
        if (chunkText.includes(normalizeRussianYo(selectedMap.mapId))) {
            score += 0.08;
        }
        if (chunkTitle.includes(normalizeRussianYo(selectedMap.mapName))) {
            score += 0.1;
        }
        if (chunk.source === "training_corpus.jsonl") {
            score += 0.04;
        }
        if (chunk.source === "dayz_map_kb.md") {
            score += 0.03;
        }
        if (chunk.source === "user_guide.html") {
            score += 0.05;
        }
        if (chunkSource.includes("user_guide") && (queryText.includes("как") || queryText.includes("постав"))) {
            score += 0.08;
        }

        if (queryText.includes("метк")) {
            if (chunkText.includes("добавление меток")) {
                score += 0.35;
            }
            if (chunkText.includes("добавление метки")) {
                score += 0.35;
            }
            if (chunkText.includes("добавить метку")) {
                score += 0.35;
            }
            if (chunkText.includes("добавить по координатам")) {
                score += 0.12;
            }
            if (chunkText.includes("мои метки")) {
                score += 0.04;
            }
        }

        if (queryText.includes("как") && queryText.includes("постав")) {
            if (chunkText.includes("нажмите кнопку")) {
                score += 0.18;
            }
            if (chunkText.includes("кликните")) {
                score += 0.12;
            }
            if (chunkText.includes("пошаг")) {
                score += 0.1;
            }
        }

        return score;
    }

    function retrieveChunks(question, selectedMap) {
        const items = Array.isArray(knowledgeBase?.chunks) ? knowledgeBase.chunks : [];
        const query = buildSearchQuery(question, selectedMap);
        const queryTokens = tokenize(query);

        return items
            .map(function (chunk) {
                return {
                    chunk: chunk,
                    score: scoreChunk(chunk, queryTokens, selectedMap)
                };
            })
            .filter(function (item) {
                return item.score > 0.05;
            })
            .sort(function (left, right) {
                return right.score - left.score;
            })
            .slice(0, topK);
    }

    function buildContextBlocks(retrievedItems) {
        const parts = [];
        let currentSize = 0;

        retrievedItems.forEach(function (item, index) {
            const chunk = item.chunk;
            const part = [
                "[Source " + (index + 1) + "]",
                "Title: " + (chunk.title || "unknown"),
                "File: " + (chunk.source || "unknown"),
                "Chunk: " + String(chunk.chunk_index ?? "?"),
                chunk.text || ""
            ].join("\n");

            if (currentSize + part.length > maxContextChars) {
                return;
            }

            parts.push(part);
            currentSize += part.length;
        });

        return parts.join("\n\n");
    }

    async function askOllama(question, selectedMap, context, sources) {
        const systemPrompt = [
            "You answer only about the DayZ map website knowledge base.",
            "Use only facts from the provided knowledge snippets.",
            "If the snippets are insufficient, answer exactly in Russian: В базе знаний нет точного ответа на этот вопрос.",
            "Always answer in Russian.",
            "If the user refers to the current map, interpret it as the selected website map.",
            "Do not mention the word context.",
            "Do not invent links, files, settings, coordinates, interface labels, or gameplay facts."
        ].join("\n");

        const userPrompt = [
            "Selected map:",
            "- id: " + selectedMap.mapId,
            "- name: " + selectedMap.mapName,
            "",
            "Knowledge snippets:",
            context,
            "",
            "Question: " + question
        ].join("\n");

        const response = await fetch(getEndpoint("chat"), {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: chatModel,
                stream: false,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ]
            })
        });

        const payload = await response.json();
        if (!response.ok) {
            throw new Error(payload.error || payload.message || "Ollama не вернула ответ");
        }

        const answer = payload?.message?.content;
        if (!answer) {
            throw new Error("Локальная модель вернула пустой ответ");
        }

        return {
            answer: answer.trim(),
            sources: sources
        };
    }

    function addTypingMessage() {
        const article = document.createElement("article");
        article.className = "map-assistant__message map-assistant__message--assistant map-assistant__message--loading";
        article.id = "mapAssistantPending";
        article.innerHTML = "<p>Думаю над ответом...</p>";
        messagesNode.appendChild(article);
        messagesNode.scrollTop = messagesNode.scrollHeight;
    }

    function removeTypingMessage() {
        const node = document.getElementById("mapAssistantPending");
        if (node) {
            node.remove();
        }
    }

    function setOpen(nextOpen) {
        panel.hidden = !nextOpen;
        assistantRoot.classList.toggle("is-open", nextOpen);
        toggleButton.setAttribute("aria-expanded", nextOpen ? "true" : "false");
        try {
            window.localStorage.setItem(storageKey, nextOpen ? "1" : "0");
        } catch (error) {
            // Ignore storage errors.
        }
    }

    function loadInitialUiState() {
        try {
            const savedOpen = window.localStorage.getItem(storageKey) === "1";
            const savedDraft = window.localStorage.getItem(historyStorageKey);
            if (savedDraft) {
                input.value = savedDraft;
            }
            setOpen(savedOpen);
        } catch (error) {
            setOpen(false);
        }
    }

    function persistDraft() {
        try {
            window.localStorage.setItem(historyStorageKey, input.value || "");
        } catch (error) {
            // Ignore storage errors.
        }
    }

    async function checkHealth() {
        try {
            await ensureKnowledgeBase();
            const response = await fetch(getEndpoint("tags"), { method: "GET" });
            const payload = await response.json();
            if (Array.isArray(payload.models)) {
                setStatus("Локальная база загружена, Ollama доступна", "success");
                return;
            }
            setStatus("Ollama недоступна через assistant-api", "error");
        } catch (error) {
            setStatus("Ассистент недоступен: проверьте assistant-api и базу знаний", "error");
        }
    }

    async function submitQuestion(question) {
        if (pending) {
            return;
        }

        const trimmed = question.trim();
        if (!trimmed) {
            setStatus("Введите вопрос по карте", "error");
            input.focus();
            return;
        }

        const selectedMap = getSelectedMap();
        pending = true;
        sendButton.disabled = true;
        input.disabled = true;

        addMessage("user", trimmed);
        addTypingMessage();
        setStatus("Запрос отправлен в локальную RAG-модель", "neutral");

        try {
            await ensureKnowledgeBase();
            const retrievedItems = retrieveChunks(trimmed, selectedMap);
            removeTypingMessage();
            if (retrievedItems.length === 0) {
                addMessage("assistant", "В базе знаний нет точного ответа на этот вопрос.");
                setStatus("Подходящие фрагменты не найдены", "error");
                input.value = "";
                persistDraft();
                return;
            }

            addTypingMessage();
            const context = buildContextBlocks(retrievedItems);
            const answerPayload = await askOllama(
                trimmed,
                selectedMap,
                context,
                retrievedItems.map(function (item) {
                    return {
                        title: item.chunk.title,
                        source: item.chunk.source,
                        score: item.score.toFixed(3)
                    };
                })
            );
            removeTypingMessage();

            addMessage("assistant", answerPayload.answer, answerPayload.sources || []);
            setStatus("Ответ получен для карты " + selectedMap.mapName, "success");
            input.value = "";
            persistDraft();
        } catch (error) {
            removeTypingMessage();
            addMessage("assistant", "Не удалось получить ответ: " + error.message);
            setStatus("Ошибка запроса к локальному ассистенту", "error");
        } finally {
            pending = false;
            sendButton.disabled = false;
            input.disabled = false;
            input.focus();
        }
    }

    toggleButton.addEventListener("click", function () {
        setOpen(panel.hidden);
        if (!panel.hidden) {
            input.focus();
        }
    });

    clearButton.addEventListener("click", function () {
        messagesNode.innerHTML = "";
        addMessage("assistant", "Спросите про текущую карту, функции сайта, координаты, маркеры или поиск по карте.");
    });

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        submitQuestion(input.value);
    });

    input.addEventListener("input", persistDraft);
    input.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submitQuestion(input.value);
        }
    });

    loadInitialUiState();
    checkHealth();
})();
