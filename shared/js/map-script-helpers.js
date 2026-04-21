window.DayzMapScriptHelpers = (function () {
    const MAP_META = {
        cherno: {
            name: "Chernarus",
            subtitle: "Классика / Большая / Узнаваемая",
            size: "15.36 km"
        },
        deerisle: {
            name: "DeerIsle",
            subtitle: "Плотная / Многослойная / Островная",
            size: "16.38 km"
        },
        deadfall: {
            name: "Deadfall",
            subtitle: "Компактная / Суровая / Хардкорная",
            size: "10.24 km"
        }
    };

    function getMapId(defaultMapId) {
        return document.body?.dataset?.mapId || defaultMapId || "cherno";
    }

    function getRootPath() {
        return window.DayzMapBootstrap?.rootPath || "";
    }

    function getAssetPath(relativePath) {
        const normalizedPath = String(relativePath || "").replace(/^\/+/, "");
        return `${getRootPath()}${normalizedPath}`;
    }

    function getMapName(mapId) {
        return MAP_META[mapId]?.name || MAP_META.cherno.name;
    }

    function getMapMeta(mapId) {
        return MAP_META[mapId] || MAP_META.cherno;
    }

    function getMapHref(mapId) {
        return `${getRootPath()}index.html?map=${mapId}`;
    }

    function getNamesDataPath(mapId) {
        return getAssetPath(`data/names_data_${mapId}.js`);
    }

    function resolveConfigPath(path) {
        if (typeof path !== "string") {
            return path;
        }

        return path.replace(/^\.\.\/\.\.\//, getRootPath());
    }

    function getStorageKeys(mapId) {
        return {
            data: `dayzMapData_${mapId}`,
            searchHistory: `dayzMapSearchHistory_${mapId}`,
            theme: `dayzMapTheme_${mapId}`
        };
    }

    function renderPresetServerRows(exportServers) {
        return exportServers
            .map((server) => {
                return `<div class="preset-server" data-ip="${server.ip}" data-port="${server.port}">${server.label} --> ${server.ip}:${server.port}</div>`;
            })
            .join("");
    }

    function leafletToGameCoords(leafletLatLng, config) {
        return {
            x: Math.round((leafletLatLng.lng / 32) * config.mapPixelWidth),
            y: Math.round((leafletLatLng.lat / 32) * config.mapPixelHeight)
        };
    }

    function buildCoordsTooltipHtml(config) {
        return `
			<div class="coords-tooltip-content">
				<input type="number" id="tooltipCoordX" placeholder="X" min="0" max="${config.mapPixelWidth}">
				<input type="number" id="tooltipCoordY" placeholder="Y" min="0" max="${config.mapPixelHeight}">
				<button id="tooltipCenterOnCoordsBtn">Центрировать</button>
				<button id="tooltipAddMarkerByCoords">Добавить по координатам</button>
			</div>
		`;
    }

    return {
        getMapId,
        getRootPath,
        getAssetPath,
        getMapName,
        getMapMeta,
        getMapHref,
        getNamesDataPath,
        resolveConfigPath,
        getStorageKeys,
        renderPresetServerRows,
        leafletToGameCoords,
        buildCoordsTooltipHtml
    };
})();
