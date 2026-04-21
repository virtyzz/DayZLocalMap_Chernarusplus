window.DayzMapBootstrap = (function () {
    const validMapIds = ["cherno", "deerisle", "deadfall"];
    const storageKey = "dayzMapSelectedMap";

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
        core: "shared"
    };
})();
