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
    const assistantApiBaseUrl = assistantConfig.ollamaBaseUrl || "./assistant-api/";
    const requestTimeoutMs = Number(assistantConfig.requestTimeoutMs || 300000);
    let pending = false;

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
        const normalizedBase = String(assistantApiBaseUrl).replace(/\/+$/, "");
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

    function normalizeAssistantText(text) {
        return String(text || "")
            .replace(/\r\n/g, "\n")
            .replace(/^\s{0,3}#{1,6}\s*/gm, "")
            .replace(/\*\*(.*?)\*\*/g, "$1")
            .replace(/\*(.*?)\*/g, "$1")
            .replace(/`([^`]+)`/g, "$1")
            .replace(/^\s*[-*]\s+/gm, "• ")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
    }

    function addMessage(role, text) {
        const article = document.createElement("article");
        article.className = "map-assistant__message " + (
            role === "user"
                ? "map-assistant__message--user"
                : "map-assistant__message--assistant"
        );

        const body = document.createElement("p");
        body.innerHTML = formatMultiline(role === "assistant" ? normalizeAssistantText(text) : text);
        article.appendChild(body);

        messagesNode.appendChild(article);
        messagesNode.scrollTop = messagesNode.scrollHeight;
    }

    async function fetchWithTimeout(url, options) {
        const controller = new AbortController();
        const timer = window.setTimeout(function () {
            controller.abort();
        }, requestTimeoutMs);

        try {
            return await fetch(url, Object.assign({}, options || {}, { signal: controller.signal }));
        } finally {
            window.clearTimeout(timer);
        }
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
            const response = await fetchWithTimeout(getEndpoint("health"), { method: "GET" });
            const payload = await response.json();
            if (response.ok && payload.ok) {
                setStatus("Локальный RAG-ассистент подключен", "success");
                return;
            }
            setStatus("RAG API недоступен: " + (payload.error || "ошибка"), "error");
        } catch (error) {
            setStatus("Ассистент недоступен: проверьте RAG API", "error");
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
            const response = await fetchWithTimeout(getEndpoint("ask"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    question: trimmed,
                    map_id: selectedMap.mapId,
                    map_name: selectedMap.mapName
                })
            });

            const payload = await response.json();
            removeTypingMessage();

            if (!response.ok || !payload.ok) {
                throw new Error(payload.error || "Не удалось получить ответ");
            }

            addMessage("assistant", payload.answer);
            setStatus("Ответ получен для карты " + selectedMap.mapName, "success");
            input.value = "";
            persistDraft();
        } catch (error) {
            removeTypingMessage();
            addMessage("assistant", "Не удалось получить ответ: " + error.message);
            setStatus("Ошибка запроса к локальному RAG API", "error");
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
