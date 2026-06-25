window.DayzMapBootstrap = (function () {
    const validMapIds = ["cherno", "deerisle", "deadfall"];
    const storageKey = "dayzMapSelectedMap";
    const scriptPromises = new Map();

    function normalizeMapId(value) {
        return validMapIds.includes(value) ? value : null;
    }

    function getSearchMapId() {
        try {
            const params = new URLSearchParams(window.location.search);
            return normalizeMapId(params.get("map"));
        } catch (error) {
            return null;
        }
    }

    function getStoredMapId() {
        try {
            return normalizeMapId(window.localStorage.getItem(storageKey));
        } catch (error) {
            return null;
        }
    }

    function persistMapId(mapId) {
        try {
            window.localStorage.setItem(storageKey, mapId);
        } catch (error) {
            // Ignore storage errors in file:// mode or private windows.
        }
    }

    function getRootPath() {
        return "";
    }

    function loadScriptOnce(src) {
        if (!src) {
            return Promise.reject(new Error("Script source is required."));
        }

        if (scriptPromises.has(src)) {
            return scriptPromises.get(src);
        }

        const scriptPromise = new Promise((resolve, reject) => {
            const existingScript = document.querySelector(`script[src="${src}"]`);
            if (existingScript) {
                if (existingScript.dataset.loaded === "true") {
                    resolve();
                    return;
                }

                existingScript.addEventListener("load", () => {
                    existingScript.dataset.loaded = "true";
                    resolve();
                }, { once: true });
                existingScript.addEventListener("error", () => {
                    reject(new Error(`Failed to load script: ${src}`));
                }, { once: true });
                return;
            }

            const script = document.createElement("script");
            script.src = src;
            script.async = false;
            script.defer = true;
            script.addEventListener("load", () => {
                script.dataset.loaded = "true";
                resolve();
            }, { once: true });
            script.addEventListener("error", () => {
                reject(new Error(`Failed to load script: ${src}`));
            }, { once: true });
            document.head.appendChild(script);
        });

        scriptPromises.set(src, scriptPromise);
        return scriptPromise;
    }

    function loadNamesData(mapId) {
        const normalizedMapId = normalizeMapId(mapId) || defaultMapId;
        const src = window.DayzMapScriptHelpers
            ? window.DayzMapScriptHelpers.getNamesDataPath(normalizedMapId)
            : `${getRootPath()}data/names_data_${normalizedMapId}.js`;

        return loadScriptOnce(src).then(() => window.namesData || []);
    }

    const bodyMapId = normalizeMapId(document.body?.dataset?.mapId);
    const defaultMapId = getSearchMapId() || bodyMapId || getStoredMapId() || "cherno";

    if (document.body) {
        document.body.dataset.mapId = defaultMapId;
    }

    persistMapId(defaultMapId);

    return {
        defaultMapId,
        rootPath: getRootPath(),
        selectedMapStorageKey: storageKey,
        core: "shared",
        loadNamesData,
        loadScriptOnce
    };
})();
