window.DayzMapRuntime = (function () {
    const maps = {
        cherno: {
            config: {
                tileSize: 480,
                minZoom: 2,
                maxZoom: 12,
                initialZoom: 4,
                maxTilesX: 31,
                maxTilesY: 31,
                mapPixelWidth: 15360,
                mapPixelHeight: 15360,
                tileSets: {
                    z8: { folder: "../../tiles/cherno/tiles_z8", gridSize: 256, zoomLevels: [11, 11.5, 12], scale: 1 },
                    z7: { folder: "../../tiles/cherno/tiles_z7", gridSize: 128, zoomLevels: [10, 10.5], scale: 2 },
                    z6: { folder: "../../tiles/cherno/tiles_z6", gridSize: 64, zoomLevels: [9, 9.5], scale: 4 },
                    z5: { folder: "../../tiles/cherno/tiles_z5", gridSize: 32, zoomLevels: [8, 8.5], scale: 8 },
                    z4: { folder: "../../tiles/cherno/tiles_z4", gridSize: 16, zoomLevels: [7, 7.5], scale: 16 },
                    z3: { folder: "../../tiles/cherno/tiles_z3", gridSize: 8, zoomLevels: [6, 6.5], scale: 32 },
                    z2: { folder: "../../tiles/cherno/tiles_z2", gridSize: 4, zoomLevels: [5, 5.5], scale: 64 },
                    z1: { folder: "../../tiles/cherno/tiles_z1", gridSize: 2, zoomLevels: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5], scale: 128 }
                },
                lazyLoading: {
                    enabled: true,
                    buffer: 3,
                    throttleDelay: 20,
                    maxConcurrentLoads: 32,
                    preloadBuffer: 12,
                    unloadDelay: 300,
                    memoryLimit: 1000,
                    timeout: 4000
                }
            },
            exportServers: [
                { label: "chernarus-1", ip: "109.248.4.32", port: "2200" },
                { label: "chernarus-2", ip: "109.248.4.32", port: "2206" },
                { label: "chernarus-3", ip: "109.248.4.106", port: "2200" },
                { label: "chernarus-4", ip: "109.248.4.106", port: "2206" }
            ]
        },
        deerisle: {
            config: {
                tileSize: 480,
                minZoom: 2,
                maxZoom: 12,
                initialZoom: 4,
                maxTilesX: 31,
                maxTilesY: 31,
                mapPixelWidth: 16384,
                mapPixelHeight: 16384,
                tileSets: {
                    z7: { folder: "../../tiles/deerisle/tiles_z7", gridSize: 128, zoomLevels: [10, 10.5, 11, 11.5, 12], scale: 2 },
                    z6: { folder: "../../tiles/deerisle/tiles_z6", gridSize: 64, zoomLevels: [9, 9.5], scale: 4 },
                    z5: { folder: "../../tiles/deerisle/tiles_z5", gridSize: 32, zoomLevels: [8, 8.5], scale: 8 },
                    z4: { folder: "../../tiles/deerisle/tiles_z4", gridSize: 16, zoomLevels: [7, 7.5], scale: 16 },
                    z3: { folder: "../../tiles/deerisle/tiles_z3", gridSize: 8, zoomLevels: [6, 6.5], scale: 32 },
                    z2: { folder: "../../tiles/deerisle/tiles_z2", gridSize: 4, zoomLevels: [5, 5.5], scale: 64 },
                    z1: { folder: "../../tiles/deerisle/tiles_z1", gridSize: 2, zoomLevels: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5], scale: 128 }
                },
                lazyLoading: {
                    enabled: true,
                    buffer: 3,
                    throttleDelay: 20,
                    maxConcurrentLoads: 32,
                    preloadBuffer: 12,
                    unloadDelay: 300,
                    memoryLimit: 1000,
                    timeout: 4000
                }
            },
            exportServers: [
                { label: "dungeon-1", ip: "109.248.4.32", port: "2218" },
                { label: "dungeon-2", ip: "109.248.4.106", port: "2218" }
            ]
        },
        deadfall: {
            config: {
                tileSize: 480,
                minZoom: 2,
                maxZoom: 12,
                initialZoom: 4,
                maxTilesX: 31,
                maxTilesY: 31,
                mapPixelWidth: 10240,
                mapPixelHeight: 10240,
                tileSets: {
                    z7: { folder: "../../tiles/deadfall/tiles_z7", gridSize: 128, zoomLevels: [10, 10.5, 11, 11.5, 12], scale: 2 },
                    z6: { folder: "../../tiles/deadfall/tiles_z6", gridSize: 64, zoomLevels: [9, 9.5], scale: 4 },
                    z5: { folder: "../../tiles/deadfall/tiles_z5", gridSize: 32, zoomLevels: [8, 8.5], scale: 8 },
                    z4: { folder: "../../tiles/deadfall/tiles_z4", gridSize: 16, zoomLevels: [7, 7.5], scale: 16 },
                    z3: { folder: "../../tiles/deadfall/tiles_z3", gridSize: 8, zoomLevels: [6, 6.5], scale: 32 },
                    z2: { folder: "../../tiles/deadfall/tiles_z2", gridSize: 4, zoomLevels: [5, 5.5], scale: 64 },
                    z1: { folder: "../../tiles/deadfall/tiles_z1", gridSize: 2, zoomLevels: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5], scale: 128 }
                },
                lazyLoading: {
                    enabled: true,
                    buffer: 3,
                    throttleDelay: 20,
                    maxConcurrentLoads: 32,
                    preloadBuffer: 12,
                    unloadDelay: 300,
                    memoryLimit: 1000,
                    timeout: 4000
                }
            },
            exportServers: [
                { label: "deadfall-1", ip: "109.248.4.32", port: "2212" },
                { label: "deadfall-2", ip: "109.248.4.106", port: "2212" }
            ]
        }
    };

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function get(mapId) {
        const resolvedId = mapId || "cherno";
        const entry = maps[resolvedId];
        if (!entry) {
            return null;
        }

        const config = clone(entry.config);
        Object.values(config.tileSets).forEach((tileSet) => {
            tileSet.folder = window.DayzMapScriptHelpers.resolveConfigPath(tileSet.folder);
        });

        return {
            config: config,
            exportServers: clone(entry.exportServers)
        };
    }

    return {
        get: get
    };
})();
