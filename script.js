// Конфигурация карты
const CONFIG = {
    tileSize: 480,
    minZoom: 5,
    maxZoom: 12,
    initialZoom: 5,
    maxTilesX: 31,
    maxTilesY: 31,
    mapPixelWidth: 15360,
    mapPixelHeight: 15360,

    // Конфигурация для разных уровней тайлов
    tileSets: {
        high: {
            folder: 'tiles_cropped',
            prefix: 'S',
            format: 3,
            gridSize: 32,
            zoomLevels: [10, 11, 12],
            scale: 1
        },
        medium: {
            folder: 'tiles_medium',
            prefix: 'L',
            format: 2,
            gridSize: 16,
            zoomLevels: [7, 8, 9],
            scale: 2
        },
        low: {
            folder: 'tiles_low',
            prefix: 'L',
            format: 2,
            gridSize: 8,
            zoomLevels: [5, 6],
            scale: 4
        }
    },

    // Конфигурация ленивой загрузки
    lazyLoading: {
        enabled: true,
        buffer: 1,
        throttleDelay: 250
    }
};

// Константы для типов меток
const MARKER_TYPES = {
    default: { name: 'Обычный маркер', color: '#3498db', symbol: '' },
    cross: { name: 'X', color: '#3498db', symbol: 'X' },
    home: { name: 'Дом', color: '#e74c3c', symbol: 'H' },
    camp: { name: 'Лагерь', color: '#27ae60', symbol: 'C' },
    safezone: { name: 'Безопасная зона', color: '#2ecc71', symbol: 'S' },
    blackmarket: { name: 'Черный рынок', color: '#34495e', symbol: 'B' },
    hospital: { name: 'Госпиталь', color: '#e74c8c', symbol: '+' },
    sniper: { name: 'Снайпер', color: '#c0392b', symbol: '⊙' },
    player: { name: 'Игрок', color: '#9b59b6', symbol: 'P' },
    flag: { name: 'Флаг', color: '#d35400', symbol: '⚑' },
    star: { name: 'Звезда', color: '#f1c40f', symbol: '★' },
    car: { name: 'Автомобиль', color: '#16a085', symbol: '🚗' },
    parking: { name: 'Парковка', color: '#7f8c8d', symbol: 'P' },
    heli: { name: 'Вертолет', color: '#2980b9', symbol: '🚁' },
    rail: { name: 'Железная дорога', color: '#8e44ad', symbol: '🚆' },
    ship: { name: 'Корабль', color: '#3498db', symbol: '⛴' },
    scooter: { name: 'Скутер', color: '#1abc9c', symbol: '🛵' },
    bank: { name: 'Банк', color: '#f39c12', symbol: '💳' },
    restaurant: { name: 'Ресторан', color: '#e67e22', symbol: '🍴' },
    post: { name: 'Почта', color: '#95a5a6', symbol: '✉' },
    castle: { name: 'Замок', color: '#7d3c98', symbol: '🏰' },
    'ranger-station': { name: 'Станция рейнджера', color: '#27ae60', symbol: '🌲' },
    water: { name: 'Вода', color: '#3498db', symbol: '💧' },
    triangle: { name: 'Треугольник', color: '#e74c3c', symbol: '▲' },
    cow: { name: 'Корова', color: '#8b4513', symbol: '🐄' },
    bear: { name: 'Медведь', color: '#2c3e50', symbol: '🐻' },
    'car-repair': { name: 'Ремонт авто', color: '#d35400', symbol: '🔧' },
    communications: { name: 'Коммуникации', color: '#9b59b6', symbol: '📡' },
    roadblock: { name: 'Блокпост', color: '#c0392b', symbol: '🚧' },
    stadium: { name: 'Стадион', color: '#f1c40f', symbol: '🏟' },
    skull: { name: 'Череп', color: '#2c3e50', symbol: '💀' },
    rocket: { name: 'Ракета', color: '#e74c3c', symbol: '🚀' },
    bbq: { name: 'BBQ', color: '#d35400', symbol: '🍖' },
    ping: { name: 'Пинг', color: '#2ecc71', symbol: '📍' },
    circle: { name: 'Круг', color: '#3498db', symbol: '●' }
};

class DayZMap {
    constructor() {
        this.map = null;
        this.markers = [];
        this.currentMarkerType = 'default';
        this.markerModeEnabled = false;
        this.gridEnabled = true;
        this.gridLayer = null;
        this.axisLayer = null;
        this.editingMarker = null;
        this.globalMarkerOpacity = 0.8; // 80%
        this.searchFilter = '';
        this.filteredMarkers = [];
        this.isFilterActive = false;
        this.lastMarkerParams = {
            text: 'Метка',
            type: 'default',
            color: '#3498db'
        };
        this.modalCloseHandlers = new Map(); // Для управления обработчиками модальных окон
		this.lastTileSet = 'high';
		this.loadedTiles = new Set(); // отслеживаем загруженные тайлы
		this.lastLoadBounds = null; // последняя загруженная область
		this.loadThrottle = null; // для троттлинга
		this.currentTileLayers = new Map(); // храним ссылки на загруженные тайлы
		this.markersLoaded = false;
		this.gridLoaded = false;
		this.currentSort = {
            field: 'name',
            direction: 'asc' // 'asc' или 'desc'
        };
        this.sortDirection = 1;
        this.init();
    }

    iconMapping = {
        'LBmaster_Groups\\gui\\icons\\marker.paa': 'default',
        'LBmaster_Groups\\gui\\icons\\marker-stroked.paa': 'default', 
        'LBmaster_Groups\\gui\\icons\\cross.paa': 'cross',
        'LBmaster_Groups\\gui\\icons\\home.paa': 'home',
        'LBmaster_Groups\\gui\\icons\\camp.paa': 'camp',
        'LBmaster_Groups\\gui\\icons\\safezone.paa': 'safezone',
        'LBmaster_Groups\\gui\\icons\\blackmarket.paa': 'blackmarket',
        'LBmaster_Groups\\gui\\icons\\hospital.paa': 'hospital',
        'LBmaster_Groups\\gui\\icons\\sniper.paa': 'sniper',
        'LBmaster_Groups\\gui\\icons\\player.paa': 'player',
        'LBmaster_Groups\\gui\\icons\\flag.paa': 'flag',
        'LBmaster_Groups\\gui\\icons\\star.paa': 'star',
        'LBmaster_Groups\\gui\\icons\\car.paa': 'car',
        'LBmaster_Groups\\gui\\icons\\parking.paa': 'parking',
        'LBmaster_Groups\\gui\\icons\\heli.paa': 'heli',
        'LBmaster_Groups\\gui\\icons\\rail.paa': 'rail',
        'LBmaster_Groups\\gui\\icons\\ship.paa': 'ship',
        'LBmaster_Groups\\gui\\icons\\scooter.paa': 'scooter',
        'LBmaster_Groups\\gui\\icons\\bank.paa': 'bank',
        'LBmaster_Groups\\gui\\icons\\restaurant.paa': 'restaurant',
        'LBmaster_Groups\\gui\\icons\\post.paa': 'post',
        'LBmaster_Groups\\gui\\icons\\castle.paa': 'castle',
        'LBmaster_Groups\\gui\\icons\\ranger-station.paa': 'ranger-station',
        'LBmaster_Groups\\gui\\icons\\water.paa': 'water',
        'LBmaster_Groups\\gui\\icons\\triangle.paa': 'triangle',
        'LBmaster_Groups\\gui\\icons\\cow.paa': 'cow',
        'LBmaster_Groups\\gui\\icons\\bear.paa': 'bear',
        'LBmaster_Groups\\gui\\icons\\car-repair.paa': 'car-repair',
        'LBmaster_Groups\\gui\\icons\\communications.paa': 'communications',
        'LBmaster_Groups\\gui\\icons\\roadblock.paa': 'roadblock',
        'LBmaster_Groups\\gui\\icons\\stadium.paa': 'stadium',
        'LBmaster_Groups\\gui\\icons\\skull.paa': 'skull',
        'LBmaster_Groups\\gui\\icons\\rocket.paa': 'rocket',
        'LBmaster_Groups\\gui\\icons\\bbq.paa': 'bbq',
        'LBmaster_Groups\\gui\\icons\\ping.paa': 'ping',
        'LBmaster_Groups\\gui\\icons\\circle.paa': 'circle'
    };

    hexToRgb(hex) {
        // Убираем # если есть
        hex = hex.replace(/^#/, '');
        
        // Если короткий формат (#RGB), преобразуем в полный (#RRGGBB)
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        
        // Парсим HEX
        const bigint = parseInt(hex, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        
        return { r, g, b };
    }

    getMarkerTypeFromIcon(iconPath) {
        return this.iconMapping[iconPath] || 'default';
    }

    init() {
        console.log('Инициализация карты...');
        this.initMap();
        this.bindEvents();
    }

    initMap() {
		console.log('Создание карты Leaflet...');
		
		if (!document.getElementById('map')) {
			console.error('Element #map not found');
			this.showError('Элемент карты не найден на странице');
			return;
		}

		this.map = L.map('map', {
			crs: L.CRS.Simple,
			minZoom: CONFIG.minZoom,
			maxZoom: CONFIG.maxZoom,
			zoomSnap: 0.5,
			zoomDelta: 0.5,
			wheelPxPerZoomLevel: 100,
			attributionControl: false
		});

		const bounds = new L.LatLngBounds(
			[0, 0],
			[32, 32]
		);
		this.map.setMaxBounds(bounds);
		
		const center = [16, 16];
		this.map.setView(center, CONFIG.initialZoom);
		
		console.log('Карта инициализирована');
		
		// Загружаем тайлы
		this.loadTiles();
		
		// Загружаем маркеры и сетку независимо от тайлов
		this.loadMarkers();
		this.addGrid();
	}

    formatTileNumber(num) {
        return num.toString().padStart(3, '0');
    }

    formatGridCoordinate(num) {
        return Math.round(num / 100).toString().padStart(3, '0');
    }

    getTileFileName(x, y, tileSet = 'high') {
		const config = CONFIG.tileSets[tileSet];
		const formattedX = x.toString().padStart(config.format, '0');
		const formattedY = y.toString().padStart(config.format, '0');
		return `${config.prefix}_${formattedX}_${formattedY}_lco.webp`;
	}

    tileToLeafletBounds(tileX, tileY, tileSet = 'high') {
		const config = CONFIG.tileSets[tileSet];
		const gridSize = config.gridSize;
		
		// Нормализуем координаты для Leaflet (0-32)
		const tileWidth = 32 / gridSize;
		const tileHeight = 32 / gridSize;
		
		const left = tileX * tileWidth;
		const right = (tileX + 1) * tileWidth;
		const top = (gridSize - tileY - 1) * tileHeight; // Инвертируем Y
		const bottom = (gridSize - tileY) * tileHeight;
		
		return new L.LatLngBounds(
			[bottom, left],
			[top, right]
		);
	}

	//метод для определения текущего набора тайлов
	getCurrentTileSet(zoom) {
		for (const [setName, config] of Object.entries(CONFIG.tileSets)) {
			if (config.zoomLevels.includes(zoom)) {
				return setName;
			}
		}
		// Если зум выходит за пределы настроенных уровней, используем ближайший
		if (zoom < 7) return 'low';
		if (zoom < 10) return 'medium';
		return 'high';
	}
	
    async loadTiles() {
		return this.loadVisibleTiles();
	}
	
	async loadVisibleTiles() {
        const currentZoom = this.map.getZoom();
        const tileSet = this.getCurrentTileSet(currentZoom);
        const config = CONFIG.tileSets[tileSet];
        
        const bounds = this.map.getBounds();
        const pixelBounds = this.getVisibleTileBounds(bounds, config.gridSize);
        
        if (this.shouldReloadTiles(pixelBounds)) {
            console.log(`Загрузка видимых тайлов (${tileSet}): ${pixelBounds.minX}-${pixelBounds.maxX}, ${pixelBounds.minY}-${pixelBounds.maxY}`);
            
            await this.loadTilesInBounds(pixelBounds, tileSet);
            this.lastLoadBounds = pixelBounds;
        }
    }

	getVisibleTileBounds(bounds, gridSize) {
        const southWest = bounds.getSouthWest();
        const northEast = bounds.getNorthEast();
        
        const minX = Math.max(0, Math.floor(southWest.lng / 32 * gridSize));
        const maxX = Math.min(gridSize - 1, Math.floor(northEast.lng / 32 * gridSize));
        const minY = Math.max(0, Math.floor((32 - northEast.lat) / 32 * gridSize));
        const maxY = Math.min(gridSize - 1, Math.floor((32 - southWest.lat) / 32 * gridSize));
        
        const buffer = CONFIG.lazyLoading.buffer;
        return {
            minX: Math.max(0, minX - buffer),
            maxX: Math.min(gridSize - 1, maxX + buffer),
            minY: Math.max(0, minY - buffer),
            maxY: Math.min(gridSize - 1, maxY + buffer),
            gridSize: gridSize
        };
    }

	shouldReloadTiles(newBounds) {
        if (!this.lastLoadBounds) return true;
        
        return Math.abs(newBounds.minX - this.lastLoadBounds.minX) > 1 ||
               Math.abs(newBounds.maxX - this.lastLoadBounds.maxX) > 1 ||
               Math.abs(newBounds.minY - this.lastLoadBounds.minY) > 1 ||
               Math.abs(newBounds.maxY - this.lastLoadBounds.maxY) > 1;
    }
	
	//загрузка тайлов в области
	async loadTilesInBounds(bounds, tileSet) {
        const config = CONFIG.tileSets[tileSet];
        const promises = [];
        
        const tilesToLoad = [];
        for (let x = bounds.minX; x <= bounds.maxX; x++) {
            for (let y = bounds.minY; y <= bounds.maxY; y++) {
                const tileKey = `${tileSet}_${x}_${y}`;
                
                if (!this.loadedTiles.has(tileKey)) {
                    tilesToLoad.push({ x, y, key: tileKey });
                }
            }
        }
        
        if (tilesToLoad.length === 0) {
            console.log('Все видимые тайлы уже загружены');
            return;
        }
        
        console.log(`Загружаем ${tilesToLoad.length} новых тайлов`);
        
        for (const tile of tilesToLoad) {
            const promise = this.loadSingleTile(tile.x, tile.y, tileSet)
                .then(layer => {
                    if (layer) {
                        this.loadedTiles.add(tile.key);
                        this.currentTileLayers.set(tile.key, layer);
                    }
                    return { success: true, tile: tile.key };
                })
                .catch(error => {
                    console.error(`Ошибка загрузки тайла ${tile.key}:`, error);
                    return { success: false, tile: tile.key, error: error.message };
                });
            
            promises.push(promise);
        }
        
        this.unloadOutOfBoundsTiles(bounds, tileSet);
        
        const results = await Promise.allSettled(promises);
        const loaded = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const errors = results.length - loaded;
        
        if (errors > 0) {
            console.warn(`Загружено ${loaded} тайлов, ошибок: ${errors}`);
        }
    }
	
	//загрузка одного тайла
	loadSingleTile(x, y, tileSet) {
        return new Promise((resolve, reject) => {
            const config = CONFIG.tileSets[tileSet];
            const fileName = this.getTileFileName(x, y, tileSet);
            const url = `${config.folder}/${fileName}`;
            const bounds = this.tileToLeafletBounds(x, y, tileSet);
            
            const img = new Image();
            let timeoutId;
            
            img.onload = () => {
                clearTimeout(timeoutId);
                try {
                    const layer = L.imageOverlay(url, bounds).addTo(this.map);
                    resolve(layer);
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => {
                clearTimeout(timeoutId);
                reject(new Error(`Не удалось загрузить: ${fileName}`));
            };
            
            img.src = url;
            
            timeoutId = setTimeout(() => {
                reject(new Error(`Таймаут загрузки: ${fileName}`));
            }, 10000);
        });
    }
	
	//выгрузка невидимых тайлов
	unloadOutOfBoundsTiles(currentBounds, tileSet) {
        const tilesToRemove = [];
        
        for (const tileKey of this.loadedTiles) {
            if (!tileKey.startsWith(tileSet + '_')) continue;
            
            const [_, x, y] = tileKey.split('_').map(Number);
            
            if (x < currentBounds.minX || x > currentBounds.maxX || 
                y < currentBounds.minY || y > currentBounds.maxY) {
                tilesToRemove.push(tileKey);
            }
        }
        
        tilesToRemove.forEach(tileKey => {
            const layer = this.currentTileLayers.get(tileKey);
            if (layer) {
                this.map.removeLayer(layer);
                this.currentTileLayers.delete(tileKey);
            }
            this.loadedTiles.delete(tileKey);
        });
        
        if (tilesToRemove.length > 0) {
            console.log(`Выгружено ${tilesToRemove.length} тайлов вне видимой области`);
        }
    }
	
	clearExistingTiles() {
		// Удаляем все ImageOverlay слои (тайлы)
		this.map.eachLayer(layer => {
			if (layer instanceof L.ImageOverlay) {
				this.map.removeLayer(layer);
			}
		});
	}
	
	showLoadingIndicator(message) {
		// Удаляем старый индикатор если есть
		this.hideLoadingIndicator();
		
		const loadingDiv = document.createElement('div');
		loadingDiv.id = 'tileLoadingIndicator';
		loadingDiv.style.cssText = `
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			background: rgba(0,0,0,0.9);
			color: white;
			padding: 20px;
			border-radius: 8px;
			z-index: 1000;
			text-align: center;
			border: 2px solid #3498db;
			min-width: 300px;
		`;
		
		loadingDiv.innerHTML = `
			<div style="margin-bottom: 10px;">
				<div style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">${message}</div>
				<div id="tileLoadingProgress" style="font-size: 12px; color: #bdc3c7;">Загрузка...</div>
			</div>
			<div style="width: 100%; height: 4px; background: #34495e; border-radius: 2px; overflow: hidden;">
				<div id="tileLoadingBar" style="width: 0%; height: 100%; background: #3498db; transition: width 0.3s;"></div>
			</div>
		`;
		
		document.getElementById('map').appendChild(loadingDiv);
		this.loadingIndicator = loadingDiv;
	}

	updateLoadingProgress(loaded, totalTiles, tileSet) {
		const percent = Math.round((loaded / totalTiles) * 100);
		
		const progressElement = document.getElementById('tileLoadingProgress');
		const barElement = document.getElementById('tileLoadingBar');
		
		if (progressElement && barElement) {
			progressElement.textContent = `${loaded}/${totalTiles} тайлов (${percent}%) - ${tileSet}`;
			barElement.style.width = `${percent}%`;
		}
	}

	hideLoadingIndicator() {
		if (this.loadingIndicator && this.loadingIndicator.parentNode) {
			this.loadingIndicator.parentNode.removeChild(this.loadingIndicator);
		}
	}

    loadTileImage(url, bounds, x, y, tileSet = 'high') {
		return new Promise((resolve, reject) => {
			const testImg = new Image();
			let timeoutId;
			
			testImg.onload = () => {
				clearTimeout(timeoutId);
				try {
					L.imageOverlay(url, bounds).addTo(this.map);
					resolve();
				} catch (error) {
					reject(error);
				}
			};
			
			testImg.onerror = () => {
				clearTimeout(timeoutId);
				reject(new Error('Файл не найден или ошибка загрузки'));
			};
			
			testImg.src = url;
			
			timeoutId = setTimeout(() => {
				if (!testImg.complete) {
					reject(new Error('Таймаут загрузки'));
				}
			}, 15000); // Увеличиваем таймаут до 15 секунд
		});
	}

    processTileLoadResults(results, tileSet) {
		const loaded = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
		const errors = results.length - loaded;
		
		console.log(`=== ИТОГ ЗАГРУЗКИ (${tileSet}): ${loaded} успешно, ${errors} ошибок ===`);
		
		if (loaded === 0) {
			this.showError(`Не загружено ни одного тайла в наборе ${tileSet}!`);
		} else {
			if (errors > 0) {
				console.warn(`Загружено ${loaded} тайлов (${tileSet}), ${errors} ошибок`);
			} else {
				console.log(`Все ${loaded} тайлов (${tileSet}) успешно загружены!`);
			}
		}
	}

    leafletToGameCoords(leafletLatLng) {
        const gameX = (leafletLatLng.lng / 32) * 15360;
        const gameY = (leafletLatLng.lat / 32) * 15360;
        
        return {
            x: Math.round(gameX),
            y: Math.round(gameY)
        };
    }

    getGridSize() {
        const zoom = this.map.getZoom();
        if (zoom >= 8) {
            return 100;
        } else {
            return 1000;
        }
    }

    showError(message) {
        // Удаляем старые ошибки если есть
        const oldError = document.querySelector('.error-notification');
        if (oldError) {
            oldError.remove();
        }

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-notification';
        errorDiv.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(231, 76, 60, 0.95);
            color: white;
            padding: 20px;
            border-radius: 8px;
            z-index: 1000;
            text-align: center;
            max-width: 80%;
            border: 2px solid #c0392b;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        `;
        
        errorDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 style="margin: 0; color: white;">🚨 Ошибка загрузки карты</h3>
                <button id="closeErrorBtn" style="
                    background: none;
                    border: none;
                    color: white;
                    font-size: 20px;
                    cursor: pointer;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">×</button>
            </div>
            <p style="margin: 0;">${message}</p>
        `;
        
        document.getElementById('map').appendChild(errorDiv);
        
        // Добавляем обработчик закрытия
        const closeBtn = document.getElementById('closeErrorBtn');
        const closeHandler = () => {
            errorDiv.remove();
            closeBtn.removeEventListener('click', closeHandler);
        };
        closeBtn.addEventListener('click', closeHandler);
        
        // Также закрываем по клику на затемненную область
        const overlayHandler = (e) => {
            if (e.target === errorDiv) {
                errorDiv.remove();
                errorDiv.removeEventListener('click', overlayHandler);
            }
        };
        errorDiv.addEventListener('click', overlayHandler);
        
        // Закрытие по ESC
        const keyHandler = (e) => {
            if (e.key === 'Escape') {
                errorDiv.remove();
                document.removeEventListener('keydown', keyHandler);
            }
        };
        document.addEventListener('keydown', keyHandler);
        
        // Автоматическое закрытие через 10 секунд
        const autoCloseTimeout = setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
                document.removeEventListener('keydown', keyHandler);
            }
        }, 3000);
        
        // Очистка таймера при ручном закрытии
        closeBtn.addEventListener('click', () => {
            clearTimeout(autoCloseTimeout);
            document.removeEventListener('keydown', keyHandler);
        });
    }

    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(46, 204, 113, 0.9);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 1000;
            text-align: center;
            max-width: 80%;
            font-weight: bold;
        `;
        successDiv.innerHTML = `✅ ${message}`;
        document.getElementById('map').appendChild(successDiv);
        
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, 3000);
    }

    bindEvents() {
        try {
            // Кнопка добавления метки
            const addMarkerBtn = document.getElementById('addMarkerBtn');
            if (addMarkerBtn) {
                addMarkerBtn.addEventListener('click', () => {
                    this.enableMarkerMode();
                });
            }

            // Кнопка очистки меток
            const clearMarkersBtn = document.getElementById('clearMarkersBtn');
            if (clearMarkersBtn) {
                clearMarkersBtn.addEventListener('click', () => {
                    this.clearAllMarkers();
                });
            }

            // Кнопка для экспорта меток
            const exportButton = document.createElement('button');
            exportButton.textContent = 'Экспорт меток';
            exportButton.addEventListener('click', () => {
                this.exportMarkers();
            });
            document.querySelector('.controls').appendChild(exportButton);

            // Поиск меток
            const searchBtn = document.getElementById('searchBtn');
            if (searchBtn) {
                searchBtn.addEventListener('click', () => {
                    if (this.isFilterActive) {
                        this.clearSearch();
                    } else {
                        const searchInput = document.getElementById('searchMarkers');
                        const searchTerm = searchInput.value.trim();
                        if (searchTerm) {
                            this.searchMarkers(searchTerm);
                        } else {
                            this.showError('Введите текст для поиска');
                        }
                    }
                });
            }

            const searchMarkersInput = document.getElementById('searchMarkers');
            if (searchMarkersInput) {
                searchMarkersInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        const searchTerm = e.target.value.trim();
                        if (searchTerm) {
                            this.searchMarkers(searchTerm);
                        } else {
                            this.showError('Введите текст для поиска');
                        }
                    }
                });
            }
			
			const searchTypeInput = document.getElementById('searchType');
			if (searchTypeInput) {
				searchTypeInput.addEventListener('change', () => {
					// Автопоиск при изменении типа
					if (this.searchFilter || searchTypeInput.value) {
						this.performSearch();
					this.updateSearchButtons();
					}
				});
			}

            const showAllBtn = document.getElementById('showAllBtn');
            if (showAllBtn) {
                showAllBtn.addEventListener('click', () => {
                    this.clearSearch();
                });
            }

            const hideOthersBtn = document.getElementById('hideOthersBtn');
            if (hideOthersBtn) {
                hideOthersBtn.addEventListener('click', () => {
                    this.hideOtherMarkers();
                });
            }

            // Кнопка переключения сетки
            const gridToggleBtn = document.createElement('button');
            gridToggleBtn.textContent = 'Сетка: ВКЛ';
            gridToggleBtn.addEventListener('click', () => {
                this.toggleGrid();
                gridToggleBtn.textContent = this.gridEnabled ? 'Сетка: ВКЛ' : 'Сетка: ВЫКЛ';
            });
            document.querySelector('.controls').appendChild(gridToggleBtn);

            // События карты
            this.map.on('click', (e) => {
                if (this.markerModeEnabled) {
                    const gameCoords = this.leafletToGameCoords(e.latlng);
                    this.addMarker(e.latlng, gameCoords);
                }
            });

            this.map.on('movestart', () => {
                this.disableMarkerMode();
            });

            this.map.on('mousemove', (e) => {
                const gameCoords = this.leafletToGameCoords(e.latlng);
                this.showCoordinates(gameCoords);
            });

            this.map.on('moveend', () => {
                if (this.gridEnabled) {
                    this.updateAxes();
                }
            });
			
			this.map.on('resize', () => {
                if (this.gridEnabled) {
                    this.updateAxes();
                }
            });

            // Кнопка для импорта меток из JSON
            const importButton = document.createElement('button');
            importButton.textContent = 'Импорт меток';
            importButton.style.marginLeft = '10px';

            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json';
            fileInput.style.display = 'none';
            fileInput.addEventListener('change', (e) => this.handleFileUpload(e));

            importButton.addEventListener('click', () => {
                fileInput.click();
            });

            document.querySelector('.controls').appendChild(importButton);
            document.querySelector('.controls').appendChild(fileInput);
			
			// Обработчики для новых кнопок координат DayZ
			const centerCoordsBtn = document.getElementById('centerCoordsBtn');
			if (centerCoordsBtn) {
				centerCoordsBtn.addEventListener('click', () => {
					this.centerOnDayZCoords();
				});
			}

			const imHereBtn = document.getElementById('imHereBtn');
			if (imHereBtn) {
				imHereBtn.addEventListener('click', () => {
					this.imHereAtDayZCoords();
				});
			}

			// Обработчик Enter для поля ввода DayZ координат
			const dayzCoordsInput = document.getElementById('dayzCoordsInput');
			if (dayzCoordsInput) {
				dayzCoordsInput.addEventListener('keypress', (e) => {
					if (e.key === 'Enter') {
						this.centerOnDayZCoords();
					}
				});
			}

            // Обработчик общей прозрачности  
            const globalOpacitySlider = document.getElementById('globalOpacity');
            if (globalOpacitySlider) {
                globalOpacitySlider.addEventListener('input', (e) => {
                    const value = e.target.value;
                    const opacityValueElement = document.getElementById('globalOpacityValue');
                    if (opacityValueElement) {
                        opacityValueElement.textContent = `${value}%`;
                    }
                    this.globalMarkerOpacity = value / 100;
                    this.updateAllMarkersOpacity();
                });
            }
			
			// Обработчик для добавления метки по координатам
            const addMarkerByCoordsBtn = document.getElementById('addMarkerByCoords');
            if (addMarkerByCoordsBtn) {
                addMarkerByCoordsBtn.addEventListener('click', () => {
                    this.addMarkerByCoordinates();
                });
            }

            // Обработчики Enter для полей координат
            const coordXInput = document.getElementById('coordX');
            const coordYInput = document.getElementById('coordY');
            
            if (coordXInput && coordYInput) {
                const handleEnter = (e) => {
                    if (e.key === 'Enter') {
                        this.addMarkerByCoordinates();
                    }
                };
                
                coordXInput.addEventListener('keypress', handleEnter);
                coordYInput.addEventListener('keypress', handleEnter);
            }
			
			// Обработчик для экспорта фильтрованных меток
            const exportFilteredBtn = document.getElementById('exportFilteredBtn');
            if (exportFilteredBtn) {
                exportFilteredBtn.addEventListener('click', () => {
                    this.exportFilteredMarkers();
                });
            }
			
			// Обработчик движения карты с троттлингом
			this.map.on('move', () => {
				if (CONFIG.lazyLoading.enabled) {
					clearTimeout(this.loadThrottle);
					this.loadThrottle = setTimeout(() => {
						this.loadTiles();
					}, CONFIG.lazyLoading.throttleDelay);
				}
			});

			// Обработчик зума
			this.map.on('zoomend', () => {
				console.log('Zoom changed to:', this.map.getZoom());
				
				// 1. Обновляем сетку и оси (если сетка включена)
				if (this.gridEnabled) {
					this.updateGrid();
					this.updateAxes();
				}
				
				const newZoom = this.map.getZoom();
				const currentTileSet = this.getCurrentTileSet(newZoom);
				
				// 2. Проверяем смену набора тайлов
				if (this.lastTileSet !== currentTileSet) {
					console.log(`Переключение с ${this.lastTileSet} на ${currentTileSet} тайлы`);
					this.clearAllTiles();
					this.lastTileSet = currentTileSet;
				}
				
				// 3. Загружаем тайлы для новой области (если ленивая загрузка включена)
				if (CONFIG.lazyLoading.enabled) {
					this.loadTiles();
				}
				
				// 4. Обновляем поиск если он активен (дополнительная логика если нужна)
				if (this.isFilterActive) {
					this.updateMarkersList();
				}
			});
			
			// Обработчик для сортировки меток
            const sortSelect = document.getElementById('sortMarkers');
            if (sortSelect) {
                sortSelect.addEventListener('change', (e) => {
                    this.currentSort = e.target.value;
                    this.updateMarkersList();
                });
            }
			
			// Обработчики для кнопок сортировки
            document.querySelectorAll('.sort-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const sortField = e.currentTarget.dataset.sort;
                    this.toggleSort(sortField);
                    this.updateSortButtons();
                    this.updateMarkersList();
                });
            });
			
			// Обработчик для кнопки помощи по координатам
			const coordsHelpBtn = document.getElementById('coordsHelpBtn');
			if (coordsHelpBtn) {
				coordsHelpBtn.addEventListener('click', () => {
					this.showCoordsHelp();
				});
			}
			// Обработчик для кнопки помощи по координатам 2
			const coordsHelpBtn2 = document.getElementById('coordsHelpBtn2');
			if (coordsHelpBtn2) {
				coordsHelpBtn2.addEventListener('click', () => {
					this.showCoordsHelp2(); // Будет другой текст подсказки
				});
			}
			
        } catch (error) {
            console.error('Ошибка при привязке событий:', error);
        }
    }
	
	//для просмотра статистики
	getTileStats() {
        return {
            loaded: this.loadedTiles.size,
            visible: this.currentTileLayers.size,
            lastBounds: this.lastLoadBounds
        };
    }
	// в консоли dayzMap.getTileStats() // посмотреть статистику загрузки
	
	clearAllTiles() {
        this.currentTileLayers.forEach(layer => {
            this.map.removeLayer(layer);
        });
        
        this.loadedTiles.clear();
        this.currentTileLayers.clear();
        this.lastLoadBounds = null;
    }
	
	async loadAllTiles() {
        console.log('Полная загрузка всех тайлов...');
        
        const currentZoom = this.map.getZoom();
        const tileSet = this.getCurrentTileSet(currentZoom);
        const config = CONFIG.tileSets[tileSet];
        
        this.clearAllTiles();
        
        const promises = [];
        for (let x = 0; x < config.gridSize; x++) {
            for (let y = 0; y < config.gridSize; y++) {
                const tileKey = `${tileSet}_${x}_${y}`;
                const promise = this.loadSingleTile(x, y, tileSet)
                    .then(layer => {
                        this.loadedTiles.add(tileKey);
                        this.currentTileLayers.set(tileKey, layer);
                        return { success: true, tile: tileKey };
                    })
                    .catch(error => {
                        return { success: false, tile: tileKey, error: error.message };
                    });
                promises.push(promise);
            }
        }
        
        const results = await Promise.allSettled(promises);
        const loaded = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        console.log(`Полная загрузка завершена: ${loaded} тайлов`);
    }
	
	// Метод для преобразования игровых координат в Leaflet координаты
    gameToLeafletCoords(gameX, gameY) {
        const leafletX = (gameX / CONFIG.mapPixelWidth) * 32;
        const leafletY = (gameY / CONFIG.mapPixelHeight) * 32;
        
        return L.latLng(leafletY, leafletX);
    }
	
	// Метод для добавления метки по координатам
    addMarkerByCoordinates() {
        const coordXInput = document.getElementById('coordX');
        const coordYInput = document.getElementById('coordY');
        
        if (!coordXInput || !coordYInput) {
            this.showError('Поля для ввода координат не найдены');
            return;
        }

        const x = parseInt(coordXInput.value);
        const y = parseInt(coordYInput.value);

        // Валидация координат
        if (isNaN(x) || isNaN(y)) {
            this.showError('Введите корректные числовые значения для координат');
            return;
        }

        if (x < 0 || x > CONFIG.mapPixelWidth || y < 0 || y > CONFIG.mapPixelHeight) {
            this.showError(`Координаты должны быть в пределах: X: 0-${CONFIG.mapPixelWidth}, Y: 0-${CONFIG.mapPixelHeight}`);
            return;
        }

        // Преобразуем игровые координаты в Leaflet координаты
        const leafletLatLng = this.gameToLeafletCoords(x, y);
        const gameCoords = { x: x, y: y };

        // Центрируем карту на указанных координатах
        this.map.setView(leafletLatLng, this.map.getZoom());

        // Показываем модальное окно для создания метки
        this.showAddMarkerModal(leafletLatLng, gameCoords);

        // Очищаем поля ввода после успешного добавления
        coordXInput.value = '';
        coordYInput.value = '';
    }
	
    toggleGrid() {
        this.gridEnabled = !this.gridEnabled;
        if (this.gridEnabled) {
            this.addGrid();
        } else {
            this.removeGrid();
        }
    }

    addGrid() {
		// Если сетка уже добавлена, не добавляем повторно
		if (this.gridLoaded) {
			return;
		}
		
		this.removeGrid();
		if (!this.gridEnabled) return;

		this.gridLayer = L.layerGroup().addTo(this.map);
		this.axisLayer = L.layerGroup().addTo(this.map);

		this.drawGrid();
		this.updateAxes();
		
		this.gridLoaded = true;
	}

    updateGrid() {
        if (this.gridLayer) {
            this.gridLayer.clearLayers();
            this.drawGrid();
        }
        this.updateAxes();
    }

	updateAxes() {
    if (!this.axisLayer) return;
    
    this.axisLayer.clearLayers();

    const bounds = this.map.getBounds();
    const gridSize = this.getGridSize();
    
    // Получаем видимые границы в Leaflet координатах
    const southWest = bounds.getSouthWest();
    const northEast = bounds.getNorthEast();
    
    const minX = Math.floor(southWest.lng / 32 * CONFIG.mapPixelWidth / gridSize) * gridSize;
    const maxX = Math.ceil(northEast.lng / 32 * CONFIG.mapPixelWidth / gridSize) * gridSize;
    const minY = Math.floor((32 - northEast.lat) / 32 * CONFIG.mapPixelHeight / gridSize) * gridSize;
    const maxY = Math.ceil((32 - southWest.lat) / 32 * CONFIG.mapPixelHeight / gridSize) * gridSize;

    const mapContainer = this.map.getContainer();
    const mapRect = mapContainer.getBoundingClientRect();
    const padding = 10;

    let axesContainer = document.getElementById('map-axes-container');
    if (!axesContainer) {
        axesContainer = document.createElement('div');
        axesContainer.id = 'map-axes-container';
        axesContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 500;
        `;
        mapContainer.style.position = 'relative';
        mapContainer.appendChild(axesContainer);
    }
    
    axesContainer.innerHTML = '';

    // Метки для оси X
    for (let x = minX; x <= maxX; x += gridSize) { 
        if (x >= 0 && x <= CONFIG.mapPixelWidth) { 
			const centeredX = x + gridSize / 2;
            const leafletX = (centeredX / CONFIG.mapPixelWidth) * 32;
            
            // Проверяем, находится ли координата в видимой области по X
            if (leafletX >= southWest.lng && leafletX <= northEast.lng) {
                const point = this.map.latLngToContainerPoint([southWest.lat + 0.02, leafletX]);
                
                if (point.x >= padding && point.x <= mapRect.width - padding) {
                    const xLabel = document.createElement('div');
                    xLabel.className = 'axis-label axis-label-x';
                    xLabel.style.cssText = `
                        position: absolute;
                        left: ${point.x}px;
                        bottom: ${padding}px;
                        color: white;
                        background: rgba(0,0,0,0.7);
                        padding: 2px 6px;
                        border-radius: 3px;
                        font-size: 11px;
                        font-weight: bold;
                        border: 1px solid rgba(255,255,255,0.3);
                        transform: translateX(-50%);
                        white-space: nowrap;
                        pointer-events: none;
                    `;
                    xLabel.textContent = this.formatGridCoordinate(x);
                    axesContainer.appendChild(xLabel);
                }
            }
        }
    }
	for (let x = minX; x <= maxX; x += gridSize) { 
        if (x >= 0 && x <= CONFIG.mapPixelWidth) { 
			const centeredX = x + gridSize / 2;
            const leafletX = (centeredX / CONFIG.mapPixelWidth) * 32;
            
            // Проверяем, находится ли координата в видимой области по X
            if (leafletX >= southWest.lng && leafletX <= northEast.lng) {
                const point = this.map.latLngToContainerPoint([southWest.lat + 31.98, leafletX]);
                
                if (point.x >= padding && point.x <= mapRect.width - padding) {
                    const xLabel = document.createElement('div');
                    xLabel.className = 'axis-label axis-label-x';
                    xLabel.style.cssText = `
                        position: absolute;
                        left: ${point.x}px;
                        top: ${padding}px;
                        color: white;
                        background: rgba(0,0,0,0.7);
                        padding: 2px 6px;
                        border-radius: 3px;
                        font-size: 11px;
                        font-weight: bold;
                        border: 1px solid rgba(255,255,255,0.3);
                        transform: translateX(-50%);
                        white-space: nowrap;
                        pointer-events: none;
                    `;
                    xLabel.textContent = this.formatGridCoordinate(x);
                    axesContainer.appendChild(xLabel);
                }
            }
        }
    }

    // Метки для оси Y
    for (let y = minY; y <= maxY; y += gridSize) { 
        if (y >= 0 && y <= CONFIG.mapPixelHeight) { 
            
			const centeredY = y + gridSize / 2;
            const leafletY = 32 - (centeredY / CONFIG.mapPixelHeight) * 32;
            
            // Проверяем, находится ли координата в видимой области по Y
            if (leafletY >= southWest.lat && leafletY <= northEast.lat) {
                const point = this.map.latLngToContainerPoint([leafletY, northEast.lng - 0.02]);
                
                if (point.y >= padding && point.y <= mapRect.height - padding) {
                    const yLabel = document.createElement('div');
                    yLabel.className = 'axis-label axis-label-y';
                    yLabel.style.cssText = `
                        position: absolute;
                        top: ${point.y}px;
                        right: ${padding}px;
                        color: white;
                        background: rgba(0,0,0,0.7);
                        padding: 2px 6px;
                        border-radius: 3px;
                        font-size: 11px;
                        font-weight: bold;
                        border: 1px solid rgba(255,255,255,0.3);
                        transform: translateY(-50%);
                        white-space: nowrap;
                        pointer-events: none;
                    `;
                    yLabel.textContent = this.formatGridCoordinate(y);
                    axesContainer.appendChild(yLabel);
                }
            }
        }
    }
	for (let y = minY; y <= maxY; y += gridSize) { 
        if (y >= 0 && y <= CONFIG.mapPixelHeight) { 
            
			const centeredY = y + gridSize / 2;
            const leafletY = 32 - (centeredY / CONFIG.mapPixelHeight) * 32;
            
            // Проверяем, находится ли координата в видимой области по Y
            if (leafletY >= southWest.lat && leafletY <= northEast.lat) {
                const point = this.map.latLngToContainerPoint([leafletY, northEast.lng - 31.98]);
                
                if (point.y >= padding && point.y <= mapRect.height - padding) {
                    const yLabel = document.createElement('div');
                    yLabel.className = 'axis-label axis-label-y';
                    yLabel.style.cssText = `
                        position: absolute;
                        top: ${point.y}px;
                        left: ${padding}px;
                        color: white;
                        background: rgba(0,0,0,0.7);
                        padding: 2px 6px;
                        border-radius: 3px;
                        font-size: 11px;
                        font-weight: bold;
                        border: 1px solid rgba(255,255,255,0.3);
                        transform: translateY(-50%);
                        white-space: nowrap;
                        pointer-events: none;
                    `;
                    yLabel.textContent = this.formatGridCoordinate(y);
                    axesContainer.appendChild(yLabel);
                }
            }
        }
    }
}

    drawGrid() {
		const gridSize = this.getGridSize();
		
		const zoom = this.map.getZoom();
		const opacity = zoom >= 8 ? 0.3 : 0.2;

		// Вертикальные линии (X = const)
		for (let x = 0; x <= CONFIG.mapPixelWidth; x += gridSize) { 
			const leafletX = (x / CONFIG.mapPixelWidth) * 32; 
			L.polyline([ [0, leafletX], [32, leafletX] ], { 
				color: 'rgba(255, 255, 255, 0.3)', 
				weight: 1, 
				opacity: opacity, 
				interactive: false 
			}).addTo(this.gridLayer); 
		} 
		
		// Горизонтальные линии (Y = const)
		for (let y = 0; y <= CONFIG.mapPixelHeight; y += gridSize) { 
			// Преобразуем Y координату в Leaflet систему (инвертируем)
			const leafletY = 32 - (y / CONFIG.mapPixelHeight) * 32;
			L.polyline([ [leafletY, 0], [leafletY, 32] ], { 
				color: 'rgba(255, 255, 255, 0.3)', 
				weight: 1, 
				opacity: opacity, 
				interactive: false 
			}).addTo(this.gridLayer); 
		} 
	}

    removeGrid() {
		if (this.gridLayer) {
			this.map.removeLayer(this.gridLayer);
			this.gridLayer = null;
		}
		if (this.axisLayer) {
			this.map.removeLayer(this.axisLayer);
			this.axisLayer = null;
		}
    
		// Удаляем контейнер осей
		const axesContainer = document.getElementById('map-axes-container');
		if (axesContainer) {
			axesContainer.remove();
		}
	}

    showCoordinates(gameCoords) {
        const coordsElement = document.getElementById('coordinatesDisplay') || this.createCoordsDisplay();
        coordsElement.textContent = `X: ${gameCoords.x} Y: ${gameCoords.y}`;
    }

    createCoordsDisplay() {
        const coordsDiv = document.createElement('div');
        coordsDiv.id = 'coordinatesDisplay';
        coordsDiv.style.cssText = `
            position: absolute;
            bottom: 10px;
            left: 10px;
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 5px 10px;
            border-radius: 3px;
            z-index: 1000;
            font-family: monospace;
        `;
        document.getElementById('map').appendChild(coordsDiv);
        return coordsDiv;
    }

    enableMarkerMode() {
        this.markerModeEnabled = true;
        const btn = document.getElementById('addMarkerBtn');
        if (btn) {
            btn.style.backgroundColor = '#27ae60';
            btn.textContent = 'Кликните на карту для размещения метки';
        }
        this.map.getContainer().style.cursor = 'crosshair';
    }

    disableMarkerMode() {
        this.markerModeEnabled = false;
        const btn = document.getElementById('addMarkerBtn');
        if (btn) {
            btn.style.backgroundColor = '';
            btn.textContent = 'Добавить метку';
        }
        this.map.getContainer().style.cursor = '';
    }

    // Метод для проверки дубликатов при обычном добавлении метки
    isMarkerDuplicate(text, gameCoords) {
        return this.markers.some(marker => 
            marker.text === text && 
            marker.gameCoords.x === gameCoords.x && 
            marker.gameCoords.y === gameCoords.y
        );
    }

    addMarker(leafletLatLng, gameCoords) {
        // Показываем модальное окно для ввода параметров метки
        this.showAddMarkerModal(leafletLatLng, gameCoords);
    }
    
	showAddMarkerModal(leafletLatLng, gameCoords) {
        // Получаем RGB значения из последних параметров
        let r, g, b;
        if (this.lastMarkerParams.color.startsWith('rgb')) {
            const rgbMatch = this.lastMarkerParams.color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (rgbMatch) {
                r = rgbMatch[1];
                g = rgbMatch[2];
                b = rgbMatch[3];
            } else {
                r = 52; g = 152; b = 219;
            }
        } else {
            const rgb = this.hexToRgb(this.lastMarkerParams.color);
            r = rgb.r;
            g = rgb.g;
            b = rgb.b;
        }

        const content = `
			<div class="modal-field">
				<label>Текст метки:</label>
				<input type="text" id="newMarkerText" value="${this.lastMarkerParams.text}">
			</div>
			
			<div class="modal-field">
				<label>Тип метки:</label>
				<select id="newMarkerType">
					${this.getMarkerTypeOptions(this.lastMarkerParams.type)}
				</select>
			</div>
			
			<div class="modal-field">
				<label>Цвет метки (кликните на палитру или введите RGB):</label>
				<div class="color-palette-container">
					<div class="color-inputs">
						<div class="color-palette-wrapper">
							<div id="colorPalette"></div>
						</div>
						<div class="color-controls">
							<div class="color-rgb-inputs">
								<div class="color-rgb-row">
									<span>R:</span>
									<input type="number" id="newColorR" min="0" max="255" value="${r}">
								</div>
								<div class="color-rgb-row">
									<span>G:</span>
									<input type="number" id="newColorG" min="0" max="255" value="${g}">
								</div>
								<div class="color-rgb-row">
									<span>B:</span>
									<input type="number" id="newColorB" min="0" max="255" value="${b}">
								</div>
							</div>
							<div class="color-preview" id="newColorPreview" style="background: ${this.lastMarkerParams.color};"></div>
						</div>
					</div>
				</div>
			</div>
			
			<div class="coordinates-display">
				<strong>Координаты:</strong><br>
				X: ${gameCoords.x}<br>
				Y: ${gameCoords.y}
			</div>
			
			<div class="modal-buttons">
				<button id="saveNewMarker" style="background: #27ae60; color: white;">Добавить</button>
				<button id="cancelNewMarker" style="background: #7f8c8d; color: white;">Отмена</button>
			</div>
		`;

		const modal = this.createDraggableModal('Добавление новой метки', content, () => {
			this.disableMarkerMode();
		});

         // Создаем цветовую палитру
		this.createColorPalette('colorPalette', 'newColorR', 'newColorG', 'newColorB', 'newColorPreview');

		const updateColorPreview = () => {
			const r = document.getElementById('newColorR').value;
			const g = document.getElementById('newColorG').value;
			const b = document.getElementById('newColorB').value;
			const color = `rgb(${r}, ${g}, ${b})`;
			document.getElementById('newColorPreview').style.background = color;
		};

		document.getElementById('newColorR').addEventListener('input', updateColorPreview);
		document.getElementById('newColorG').addEventListener('input', updateColorPreview);
		document.getElementById('newColorB').addEventListener('input', updateColorPreview);

		// Обработчики кнопок
		document.getElementById('saveNewMarker').addEventListener('click', () => {
			this.saveNewMarker(leafletLatLng, gameCoords);
			this.closeModal(modal);
		});

		document.getElementById('cancelNewMarker').addEventListener('click', () => {
			this.closeModal(modal);
			this.disableMarkerMode();
		});

		return modal;
	}


    closeModal(modal) {
        const handlers = this.modalCloseHandlers.get(modal);
        if (handlers) {
            if (handlers.closeHandler) {
                handlers.closeHandler();
            }
            
            // Удаляем обработчики перетаскивания
            if (handlers.dragHandlers) {
                document.removeEventListener('mousemove', handlers.dragHandlers.drag);
                document.removeEventListener('mouseup', handlers.dragHandlers.dragEnd);
            }
            
            this.modalCloseHandlers.delete(modal);
        }
        
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
        
        // Убираем оверлей если нет других модальных окон
        const activeModals = document.querySelectorAll('.marker-modal');
        if (activeModals.length === 0) {
            const overlay = document.querySelector('.modal-overlay');
            if (overlay) {
                overlay.classList.remove('active');
            }
        }
    }
    
    saveNewMarker(leafletLatLng, gameCoords) {
		const markerText = document.getElementById('newMarkerText').value || 'Метка';
		const markerType = document.getElementById('newMarkerType').value;
		const r = document.getElementById('newColorR').value;
		const g = document.getElementById('newColorG').value;
		const b = document.getElementById('newColorB').value;
		const markerColor = `rgb(${r}, ${g}, ${b})`;

		// Сохраняем параметры для следующей метки
		this.lastMarkerParams = {
			text: markerText,
			type: markerType,
			color: markerColor
		};

		// Проверяем на дубликаты
		if (this.isMarkerDuplicate(markerText, gameCoords)) {
			this.showError('Метка с таким названием и координатами уже существует');
			this.disableMarkerMode();
			return;
		}

		const opacity = this.globalMarkerOpacity;
		const icon = this.createMarkerIcon(markerType, markerColor, opacity);

		const marker = L.marker(leafletLatLng, { icon: icon })
			.addTo(this.map)
			.bindPopup(`
				<div class="marker-popup">
					<strong>${markerText}</strong>
					<br>
					Тип: ${this.getMarkerTypeName(markerType)}<br>
					Координаты: X:${gameCoords.x} Y:${gameCoords.y}${gameCoords.z ? ` Z:${gameCoords.z}` : ''}
				</div>
			`);

		const textLabel = L.marker(leafletLatLng, {
			icon: this.createTextLabel(markerText, markerColor, opacity),
			interactive: false
		}).addTo(this.map);

		// Для новых меток создаем базовый набор оригинальных данных С Z КООРДИНАТОЙ
		const originalData = {
			type: 5,
			uid: Date.now() / 1000,
			name: markerText,
			icon: this.getIconPathFromType(markerType),
			position: [gameCoords.x, gameCoords.z || 0, gameCoords.y], // Сохраняем Z координату
			currentSubgroup: 0,
			colorA: 255,
			colorR: parseInt(r),
			colorG: parseInt(g),
			colorB: parseInt(b),
			creatorSteamID: "",
			circleRadius: 0.0,
			circleColorA: 255,
			circleColorR: 255,
			circleColorG: 255,
			circleColorB: 255,
			circleStriked: 0,
			circleLayer: -1,
			showAllPlayerNametags: 0
		};

		const markerData = {
			id: Date.now(),
			leafletLatLng: { lat: leafletLatLng.lat, lng: leafletLatLng.lng },
			gameCoords: { 
				x: gameCoords.x, 
				y: gameCoords.y, 
				z: gameCoords.z || 0 // Сохраняем Z координату
			},
			text: markerText,
			type: markerType,
			color: markerColor,
			marker: marker,
			textLabel: textLabel,
			originalData: originalData // Сохраняем оригинальные данные
		};

		marker.on('dblclick', () => {
			this.editMarker(markerData);
		});

		this.markers.push(markerData);
		this.saveMarkers();
		this.updateMarkersList();
		this.disableMarkerMode();

		this.showSuccess('Метка добавлена');
	}

    createMarkerIcon(type, customColor = null, opacity = this.globalMarkerOpacity) {
        const markerType = MARKER_TYPES[type] || MARKER_TYPES.default;
        const color = customColor || markerType.color;

        return L.divIcon({
            className: `custom-marker marker-${type}`,
            html: `
                <div style="
                    background: none;
                    width: 32px;
                    height: 32px;
					border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    color: ${color};
                    font-weight: bold;
                    opacity: ${opacity};
					text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
                ">${markerType.symbol}</div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });
    }

    createTextLabel(text, color, opacity = this.globalMarkerOpacity) {
        return L.divIcon({
            className: 'text-label',
            html: `<div style="
                color: ${color}; 
                background: none; 
                padding: 2px 6px; 
                font-size: 14px; 
                white-space: nowrap;
                margin-left: 8px;
                font-weight: bold;
                opacity: ${opacity};
            ">${text}</div>`,
            iconSize: [100, 20],
            iconAnchor: [0, 12]
        });
    }

    getMarkerColor(type) {
        const markerType = MARKER_TYPES[type] || MARKER_TYPES.default;
        return markerType.color;
    }

    getMarkerShape(type) {
        const shapes = {
            triangle: '50% 0%, 0% 100%, 100% 100%',
            circle: '50%',
            star: '50%',
            flag: '50%',
            skull: '50%',
            rocket: '50%',
            ping: '50%',
            default: '50%'
        };
        return shapes[type] || '50%';
    }

    getMarkerSymbol(type) {
        const markerType = MARKER_TYPES[type] || MARKER_TYPES.default;
        return markerType.symbol;
    }

    getMarkerTypeName(type) {
        const markerType = MARKER_TYPES[type] || MARKER_TYPES.default;
        return markerType.name;
    }

    editMarker(markerData) {
        this.editingMarker = markerData;
        this.showEditModal(markerData);
    }

    showEditModal(markerData) {
        // Получаем RGB значения из цвета метки
        let r, g, b;
        if (markerData.color.startsWith('rgb')) {
            const rgbMatch = markerData.color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (rgbMatch) {
                r = rgbMatch[1];
                g = rgbMatch[2];
                b = rgbMatch[3];
            } else {
                r = 52; g = 152; b = 219;
            }
        } else {
            const rgb = this.hexToRgb(markerData.color);
            r = rgb.r;
            g = rgb.g;
            b = rgb.b;
        }

        const content = `
			<div class="modal-field">
				<label>Текст метки:</label>
				<input type="text" id="editMarkerText" value="${markerData.text}">
			</div>
			
			<div class="modal-field">
				<label>Тип метки:</label>
				<select id="editMarkerType">
					${this.getMarkerTypeOptions(markerData.type)}
				</select>
			</div>
			
			<div class="modal-field">
				<label>Цвет метки (кликните на палитру или введите RGB):</label>
				<div class="color-palette-container">
					<div class="color-inputs">
						<div class="color-palette-wrapper">
							<div id="editColorPalette"></div>
						</div>
						<div class="color-controls">
							<div class="color-rgb-inputs">
								<div class="color-rgb-row">
									<span>R:</span>
									<input type="number" id="editColorR" min="0" max="255" value="${r}">
								</div>
								<div class="color-rgb-row">
									<span>G:</span>
									<input type="number" id="editColorG" min="0" max="255" value="${g}">
								</div>
								<div class="color-rgb-row">
									<span>B:</span>
									<input type="number" id="editColorB" min="0" max="255" value="${b}">
								</div>
							</div>
							<div class="color-preview" id="colorPreview" style="background: ${markerData.color};"></div>
						</div>
					</div>
				</div>
			</div>
			
			<div class="modal-buttons">
				<button id="saveEdit" style="background: #27ae60; color: white;">Сохранить</button>
				<button id="deleteMarker" style="background: #e74c3c; color: white;">Удалить</button>
				<button id="cancelEdit" style="background: #7f8c8d; color: white;">Отмена</button>
			</div>
		`;

		const modal = this.createDraggableModal('Редактирование метки', content);

		// Создаем цветовую палитру для редактирования
		this.createColorPalette('editColorPalette', 'editColorR', 'editColorG', 'editColorB', 'colorPreview');

		const updateColorPreview = () => {
			const r = document.getElementById('editColorR').value;
			const g = document.getElementById('editColorG').value;
			const b = document.getElementById('editColorB').value;
			const color = `rgb(${r}, ${g}, ${b})`;
			document.getElementById('colorPreview').style.background = color;
		};

		document.getElementById('editColorR').addEventListener('input', updateColorPreview);
		document.getElementById('editColorG').addEventListener('input', updateColorPreview);
		document.getElementById('editColorB').addEventListener('input', updateColorPreview);

		// Обработчики кнопок
		document.getElementById('saveEdit').addEventListener('click', () => {
			this.saveMarkerEdit(markerData);
			this.closeModal(modal);
		});

		document.getElementById('deleteMarker').addEventListener('click', () => {
			if (confirm('Вы уверены, что хотите удалить эту метку?')) {
				this.removeMarker(markerData.id);
				this.closeModal(modal);
			}
		});

		document.getElementById('cancelEdit').addEventListener('click', () => {
			this.closeModal(modal);
		});

		return modal;
	}
	
// Метод для создания цветовой палитры на Canvas
createColorPalette(containerId, rInputId, gInputId, bInputId, previewId) {
    const paletteContainer = document.getElementById(containerId);
    paletteContainer.innerHTML = '';
    
    // Создаем canvas элемент
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    canvas.style.cssText = `
        width: 256px;
        height: 256px;
        margin-top: 8px;
        border: 2px solid #555;
        border-radius: 4px;
        cursor: crosshair;
    `;
    
    paletteContainer.appendChild(canvas);
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    // Создаем основной градиент (оттенки)
    let gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, "rgb(255, 0, 0)");
    gradient.addColorStop(0.15, "rgb(255, 0, 255)");
    gradient.addColorStop(0.33, "rgb(0, 0, 255)");
    gradient.addColorStop(0.49, "rgb(0, 255, 255)");
    gradient.addColorStop(0.67, "rgb(0, 255, 0)");
    gradient.addColorStop(0.84, "rgb(255, 255, 0)");
    gradient.addColorStop(1, "rgb(255, 0, 0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Создаем градиент для яркости/насыщенности
    gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.5, "rgba(255, 255, 255, 0)");
    gradient.addColorStop(0.5, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 1)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Функция для получения цвета из координат
    const getColorAt = (x, y) => {
        const imageData = ctx.getImageData(x, y, 1, 1).data;
        return {
            r: imageData[0],
            g: imageData[1],
            b: imageData[2]
        };
    };

    // Обработчик перемещения и клика
    const handleColorSelect = (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(canvas.width - 1, e.clientX - rect.left));
        const y = Math.max(0, Math.min(canvas.height - 1, e.clientY - rect.top));
        
        const color = getColorAt(x, y);
        
        document.getElementById(rInputId).value = color.r;
        document.getElementById(gInputId).value = color.g;
        document.getElementById(bInputId).value = color.b;
        
        // Триггерим событие input чтобы обновился preview
        document.getElementById(rInputId).dispatchEvent(new Event('input'));
    };

    // Обработчики событий
    let isMouseDown = false;
    
    canvas.addEventListener('mousedown', (e) => {
        isMouseDown = true;
        handleColorSelect(e);
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isMouseDown) {
            handleColorSelect(e);
        }
    });

    document.addEventListener('mouseup', () => {
        isMouseDown = false;
    });

    canvas.addEventListener('click', handleColorSelect);
}

    saveMarkerEdit(markerData) {
		const newText = document.getElementById('editMarkerText').value;
		const newType = document.getElementById('editMarkerType').value;
		const r = document.getElementById('editColorR').value;
		const g = document.getElementById('editColorG').value;
		const b = document.getElementById('editColorB').value;
		const newColor = `rgb(${r}, ${g}, ${b})`;

		// Сохраняем параметры для следующей метки
		this.lastMarkerParams = {
			text: newText,
			type: newType,
			color: newColor
		};

		markerData.text = newText;
		markerData.type = newType;
		markerData.color = newColor;

		// Обновляем оригинальный данные С СОХРАНЕНИЕМ Z КООРДИНАТЫ
		if (markerData.originalData) {
			markerData.originalData.name = newText;
			markerData.originalData.icon = this.getIconPathFromType(newType);
			markerData.originalData.position = [
				markerData.gameCoords.x,
				markerData.gameCoords.z || 0, // Сохраняем Z координату
				markerData.gameCoords.y
			];
			markerData.originalData.colorR = parseInt(r);
			markerData.originalData.colorG = parseInt(g);
			markerData.originalData.colorB = parseInt(b);
		} else {
			// Если оригинальных данных нет (для новых меток), создаем их С Z КООРДИНАТОЙ
			markerData.originalData = {
				type: 5,
				uid: markerData.id,
				name: newText,
				icon: this.getIconPathFromType(newType),
				position: [markerData.gameCoords.x, markerData.gameCoords.z || 0, markerData.gameCoords.y], // Z координата
				currentSubgroup: 0,
				colorA: 255,
				colorR: parseInt(r),
				colorG: parseInt(g),
				colorB: parseInt(b),
				creatorSteamID: "",
				circleRadius: 0.0,
				circleColorA: 255,
				circleColorR: 255,
				circleColorG: 255,
				circleColorB: 255,
				circleStriked: 0,
				circleLayer: -1,
				showAllPlayerNametags: 0
			};
		}

		const newIcon = this.createMarkerIcon(newType, newColor, this.globalMarkerOpacity);
		markerData.marker.setIcon(newIcon);

		const newTextLabel = this.createTextLabel(newText, newColor, this.globalMarkerOpacity);
		markerData.textLabel.setIcon(newTextLabel);

		markerData.marker.bindPopup(`
			<div class="marker-popup">
				<strong>${newText}</strong>
				<br>
				Тип: ${this.getMarkerTypeName(newType)}<br>
				Координаты: X:${markerData.gameCoords.x} Y:${markerData.gameCoords.y}${markerData.gameCoords.z ? ` Z:${markerData.gameCoords.z}` : ''}
			</div>
		`);

		this.saveMarkers();
		this.updateMarkersList();
		
		this.showSuccess('Метка обновлена');
	}

    getMarkerTypeOptions(currentType) {
        let options = '';
        for (const [key, value] of Object.entries(MARKER_TYPES)) {
            const selected = key === currentType ? 'selected' : '';
            options += `<option value="${key}" ${selected}>${value.name}</option>`;
        }
        return options;
    }

    // Метод для обновления счетчика меток
    updateMarkersCounter() {
        const counterElement = document.getElementById('markersCounter') || this.createMarkersCounter();
        const totalMarkers = this.markers.length;
        const visibleMarkers = this.isFilterActive ? this.filteredMarkers.length : totalMarkers;
        
        if (this.isFilterActive && this.searchFilter) {
            counterElement.textContent = ` (${visibleMarkers}/${totalMarkers})`;
            counterElement.title = `Показано: ${visibleMarkers} из ${totalMarkers} меток`;
        } else {
            counterElement.textContent = ` (${totalMarkers})`;
            counterElement.title = `Всего меток: ${totalMarkers}`;
        }
    }

    // Метод для создания элемента счетчика
    createMarkersCounter() {
        const counterSpan = document.createElement('span');
        counterSpan.id = 'markersCounter';
        counterSpan.style.cssText = `
            color: #95a5a6;
            font-size: 0.9em;
            font-weight: normal;
            margin-left: 8px;
        `;
        const markersTitle = document.querySelector('.markers-list h3');
        if (markersTitle) {
            markersTitle.appendChild(counterSpan);
        }
        return counterSpan;
    }

    updateMarkersList() {
        const container = document.getElementById('markersContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Получаем метки для отображения и сортируем их
        let markersToShow = this.searchFilter ? this.filteredMarkers : this.markers;
        markersToShow = this.sortMarkers(markersToShow);
        
        if (this.searchFilter && markersToShow.length === 0) {
            container.innerHTML = `<div class="no-results">Метки по запросу "${this.searchFilter}" не найдены</div>`;
        } else {
            markersToShow.forEach(markerData => {
                const isFiltered = this.searchFilter && 
                                markerData.text.toLowerCase().includes(this.searchFilter);
                
                const item = document.createElement('div');
                item.className = `marker-item marker-${markerData.type} ${isFiltered ? 'filtered' : ''}`;
                item.innerHTML = `
                    <div>
                        <strong>${markerData.text || 'Без названия'}</strong>
                        <div class="coords">
                            X:${markerData.gameCoords.x} Y:${markerData.gameCoords.y}
                        </div>
                        <div class="type">${this.getMarkerTypeName(markerData.type)}</div>
                    </div>
                    <button class="delete" onclick="dayzMap.removeMarker(${markerData.id})">×</button>
                `;
                
                // Обработчик двойного клика для центрирования и зума
                item.addEventListener('dblclick', (e) => {
                    if (!e.target.classList.contains('delete')) {
                        // Центрируем карту на метке с зумом 8
                        this.map.setView(markerData.leafletLatLng, 8);
                        // Открываем попап метки
                        markerData.marker.openPopup();
                        
                        // Показываем анимацию или подсветку для визуальной обратной связи
                        this.highlightMarker(markerData);
                    }
                });
                
                // Обычный клик (одинарный) - просто центрируем без зума
                item.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('delete')) {
                        // Просто центрируем на метке без изменения зума
                        this.map.setView(markerData.leafletLatLng);
                        markerData.marker.openPopup();
                        
                        // Показываем анимацию или подсветку для визуальной обратной связи
                        this.highlightMarker(markerData);
                    }
                });
                
                container.appendChild(item);
            });
        }

        // Обновляем счетчик и состояние кнопок
        this.updateMarkersCounter();
        this.updateSearchButtons();
    }
	
	// Добавьте метод для подсветки метки при выборе
	highlightMarker(markerData) {
		// Временно добавляем класс для подсветки
		markerData.marker.getElement().classList.add('marker-highlighted');
		
		// Убираем подсветку через 2 секунды
		setTimeout(() => {
			if (markerData.marker.getElement()) {
				markerData.marker.getElement().classList.remove('marker-highlighted');
			}
		}, 2000);
		
		// Также подсвечиваем соответствующий элемент в списке
		const markerItems = document.querySelectorAll('.marker-item');
		markerItems.forEach(item => {
			item.classList.remove('selected');
		});
		
		// Находим и подсвечиваем текущий элемент
		const currentItem = Array.from(markerItems).find(item => {
			const coordsDiv = item.querySelector('.coords');
			return coordsDiv && coordsDiv.textContent.includes(`X:${markerData.gameCoords.x} Y:${markerData.gameCoords.y}`);
		});
		
		if (currentItem) {
			currentItem.classList.add('selected');
			
			// Прокручиваем список чтобы элемент был виден
			currentItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		}
	}

    // Метод для обновления состояния кнопок
    updateSearchButtons() {
		const searchBtn = document.getElementById('searchBtn');
		const showAllBtn = document.getElementById('showAllBtn');
		const hideOthersBtn = document.getElementById('hideOthersBtn');
		const exportFilteredBtn = document.getElementById('exportFilteredBtn');

		if (!searchBtn || !showAllBtn || !hideOthersBtn || !exportFilteredBtn) return;

		const searchType = document.getElementById('searchType').value;
		const hasActiveFilter = this.searchFilter || searchType;

		if (hasActiveFilter) {
			searchBtn.textContent = 'Отменить';
			searchBtn.style.background = '#e74c3c';
			showAllBtn.style.display = 'inline-block';
			exportFilteredBtn.style.display = 'inline-block';
			hideOthersBtn.disabled = this.filteredMarkers.length === 0;
			exportFilteredBtn.disabled = this.filteredMarkers.length === 0;
			
			if (this.filteredMarkers.length === 0) {
				hideOthersBtn.title = 'Нет найденных меток для отображения';
				exportFilteredBtn.title = 'Нет найденных меток для экспорта';
			} else {
				hideOthersBtn.title = '';
				exportFilteredBtn.title = `Экспортировать ${this.filteredMarkers.length} найденных меток`;
			}
		} else {
			searchBtn.textContent = 'Поиск';
			searchBtn.style.background = '';
			showAllBtn.style.display = 'none';
			exportFilteredBtn.style.display = 'none';
			hideOthersBtn.disabled = true;
			exportFilteredBtn.disabled = true;
			hideOthersBtn.title = 'Сначала выполните поиск';
			exportFilteredBtn.title = 'Сначала выполните поиск';
		}
		
		// Обновляем состояние кнопок в зависимости от наличия результатов
		hideOthersBtn.disabled = !hasActiveFilter || this.filteredMarkers.length === 0;
		exportFilteredBtn.disabled = !hasActiveFilter || this.filteredMarkers.length === 0;
	}
	
	// Метод для экспорта фильтрованных меток
    exportFilteredMarkers() {
        if (!this.isFilterActive || this.filteredMarkers.length === 0) {
            this.showError('Нет найденных меток для экспорта');
            return;
        }

        const exportData = this.prepareExportData(this.filteredMarkers);
        const searchTerm = this.searchFilter || 'filtered';
        const searchType = document.getElementById('searchType').value;
        
        // Формируем имя файла на основе параметров поиска
        let filename = 'FilteredMarkers';
        if (searchTerm && searchTerm !== 'filtered') {
            filename += `_${searchTerm}`;
        }
        if (searchType) {
            const typeName = this.getMarkerTypeName(searchType).replace(/\s+/g, '');
            filename += `_${typeName}`;
        }
        filename += '.json';
        
        this.downloadJSON(exportData, filename);
        
        this.showSuccess(`Экспортировано ${this.filteredMarkers.length} найденных меток`);
    }

    saveMarkers() {
        const data = {
            markers: this.markers.map(m => ({
                id: m.id,
                leafletLatLng: m.leafletLatLng,
                gameCoords: m.gameCoords,
                text: m.text,
                type: m.type,
                color: m.color,
                originalData: m.originalData // Сохраняем оригинальные данные
            })),
            settings: {
                globalOpacity: this.globalMarkerOpacity,
                lastMarkerParams: this.lastMarkerParams
            }
        };
		console.log('Сохраняемые данные:', data); // Отладочная информация
        localStorage.setItem('dayzMapData', JSON.stringify(data));
    }

    clearAllMarkers() {
        if (this.markers.length === 0) {
            return;
        }

        if (confirm('Вы уверены, что хотите удалить все метки?')) {
            // Удаляем все маркеры с карты
            this.markers.forEach(markerData => {
                this.map.removeLayer(markerData.marker);
                if (markerData.textLabel) {
                    this.map.removeLayer(markerData.textLabel);
                }
            });

            // Очищаем массив меток
            this.markers = [];

            // Сбрасываем фильтры поиска
            this.searchFilter = '';
            this.filteredMarkers = [];
            this.isFilterActive = false;

            // Обновляем localStorage и список меток
            this.saveMarkers();
            this.updateMarkersList();

            // Сбрасываем поле поиска
            const searchInput = document.getElementById('searchMarkers');
            if (searchInput) {
                searchInput.value = '';
            }
            
            // Обновляем состояние кнопок поиска
            this.updateSearchButtons();

            this.showSuccess('Все метки удалены');
        }
    }

    removeMarker(markerId) {
        const markerIndex = this.markers.findIndex(m => m.id === markerId);
        if (markerIndex !== -1) {
            const markerData = this.markers[markerIndex];
            
            // Удаляем с карты
            this.map.removeLayer(markerData.marker);
            this.map.removeLayer(markerData.textLabel);
            
            // Удаляем из массива
            this.markers.splice(markerIndex, 1);
            
            // Обновляем фильтры если поиск активен
            if (this.isFilterActive) {
                this.filteredMarkers = this.filteredMarkers.filter(m => m.id !== markerId);
            }
            
            // Обновляем localStorage и список
            this.saveMarkers();
            this.updateMarkersList();
            
            this.showSuccess('Метка удалена');
        }
    }

    loadMarkers() {
		const saved = localStorage.getItem('dayzMapData');
		if (saved) {
			try {
				const data = JSON.parse(saved);
				console.log('Загружаемые данные маркеров:', data);
				
				// Загружаем настройки
				if (data.settings) {
					this.globalMarkerOpacity = data.settings.globalOpacity || 0.8;
					
					if (data.settings.lastMarkerParams) {
						this.lastMarkerParams = data.settings.lastMarkerParams;
					}
					
					// Обновляем слайдеры
					const globalOpacitySlider = document.getElementById('globalOpacity');
					const globalOpacityValue = document.getElementById('globalOpacityValue');
					
					if (globalOpacitySlider && globalOpacityValue) {
						globalOpacitySlider.value = this.globalMarkerOpacity * 100;
						globalOpacityValue.textContent = `${Math.round(this.globalMarkerOpacity * 100)}%`;
					}
				}
				
				// Загружаем метки только если они еще не загружены
				if (data.markers && !this.markersLoaded) {
					// Очищаем текущие метки
					this.markers.forEach(markerData => {
						this.map.removeLayer(markerData.marker);
						if (markerData.textLabel) {
							this.map.removeLayer(markerData.textLabel);
						}
					});
					this.markers = [];

					data.markers.forEach(savedMarkerData => {
						const leafletLatLng = L.latLng(
							savedMarkerData.leafletLatLng.lat, 
							savedMarkerData.leafletLatLng.lng
						);
						
						const color = savedMarkerData.color || this.getMarkerColor(savedMarkerData.type);
						const icon = this.createMarkerIcon(savedMarkerData.type, color, this.globalMarkerOpacity);

						const marker = L.marker(leafletLatLng, { icon: icon })
							.addTo(this.map)
							.bindPopup(`
								<div class="marker-popup">
									<strong>${savedMarkerData.text}</strong><br>
									Тип: ${this.getMarkerTypeName(savedMarkerData.type)}<br>
									Координаты: X:${savedMarkerData.gameCoords.x} Y:${savedMarkerData.gameCoords.y}${savedMarkerData.gameCoords.z ? ` Z:${savedMarkerData.gameCoords.z}` : ''}
								</div>
							`);

						const textLabel = L.marker(leafletLatLng, {
							icon: this.createTextLabel(savedMarkerData.text, color, this.globalMarkerOpacity),
							interactive: false
						}).addTo(this.map);

						// ВОССТАНАВЛИВАЕМ Z КООРДИНАТУ ПРИ ЗАГРУЗКЕ
						const markerData = {
							...savedMarkerData,
							leafletLatLng: leafletLatLng,
							color: color,
							marker: marker,
							textLabel: textLabel,
							// Гарантируем что Z координата есть
							gameCoords: {
								...savedMarkerData.gameCoords,
								z: savedMarkerData.gameCoords.z || 0
							}
						};

						marker.on('dblclick', () => {
							this.editMarker(markerData);
						});

						this.markers.push(markerData);
					});
					
					this.markersLoaded = true;
					this.updateMarkersList();
					console.log(`Загружено ${this.markers.length} маркеров`);
				}
			} catch (e) {
				console.error('Ошибка загрузки меток:', e);
			}
		}
		this.updateAllMarkersOpacity();
	}

    // Функция для массовой загрузки меток из JSON
    importMarkersFromJSON(jsonData) {
        try {
            const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
            let importedCount = 0;
            let skippedCount = 0;
            let duplicateCount = 0;
            const skipReasons = {
                noPosition: 0,
                invalidPosition: 0,
                outOfBounds: 0,
                duplicate: 0,
                other: 0
            };

            // Функция для проверки дубликатов
            const isDuplicateMarker = (markerName, x, y) => {
                return this.markers.some(existingMarker => {
                    const sameName = existingMarker.text === markerName;
                    const samePosition = 
                        existingMarker.gameCoords.x === Math.round(x) && 
                        existingMarker.gameCoords.y === Math.round(y);
                    return sameName && samePosition;
                });
            };

            // Обрабатываем массив серверов
            data.forEach(server => {
                if (server.param2 && Array.isArray(server.param2)) {
                    server.param2.forEach(marker => {
                        try {
                            // Проверяем обязательные поля (название теперь не обязательно)
                            if (!marker.position || !Array.isArray(marker.position)) {
                                skipReasons.noPosition++;
                                skippedCount++;
                                return;
                            }

                            if (marker.position.length < 2) {
                                skipReasons.invalidPosition++;
                                skippedCount++;
                                return;
                            }

                            const [x, z, y] = marker.position;
                            
                            // Пропускаем метки с координатами за пределами карты
                            if (x < 0 || x > CONFIG.mapPixelWidth || y < 0 || y > CONFIG.mapPixelHeight) {
                                skipReasons.outOfBounds++;
                                skippedCount++;
                                return;
                            }

                            // Используем название если есть, иначе оставляем пустым
                            const markerName = marker.name || '';
                            
                            // Проверяем на дубликаты (только если есть название)
                            if (markerName && isDuplicateMarker(markerName, x, y)) {
                                skipReasons.duplicate++;
                                duplicateCount++;
                                skippedCount++;
                                return;
                            }

                            // Определяем тип метки
                            const markerType = this.getMarkerTypeFromIcon(marker.icon);
                            
                            // Получаем цвет из RGB компонентов (используем оригинальные значения)
                            const colorR = marker.colorR !== undefined ? marker.colorR : 255;
                            const colorG = marker.colorG !== undefined ? marker.colorG : 255;
                            const colorB = marker.colorB !== undefined ? marker.colorB : 255;
                            const markerColor = `rgb(${colorR}, ${colorG}, ${colorB})`;

                            // Преобразуем координаты в Leaflet
                            const leafletX = (x / CONFIG.mapPixelWidth) * 32;
                            const leafletY = (y / CONFIG.mapPixelHeight) * 32;
                            const leafletLatLng = L.latLng(leafletY, leafletX);

                            const gameCoords = { x: Math.round(x), y: Math.round(y), z: z };

                            // Создаем метку с глобальной прозрачностью
                            const icon = this.createMarkerIcon(markerType, markerColor, this.globalMarkerOpacity);

                            const markerObj = L.marker(leafletLatLng, { icon: icon })
                                .addTo(this.map)
                                .bindPopup(`
                                    <div class="marker-popup">
                                        <strong>${markerName || 'Без названия'}</strong><br>
                                        Тип: ${this.getMarkerTypeName(markerType)}<br>
                                        Координаты: X:${gameCoords.x} Y:${gameCoords.y} Z:${z}
                                    </div>
                                `);

                            // Создаем текстовую метку только если есть название
                            let textLabel = null;
                            if (markerName) {
                                textLabel = L.marker(leafletLatLng, {
                                    icon: this.createTextLabel(markerName, markerColor, this.globalMarkerOpacity),
                                    interactive: false
                                }).addTo(this.map);
                            }

                            // Сохраняем ВСЕ оригинальные параметры из файла КАК ЕСТЬ
                            const originalData = { ...marker };
                            
                            // Обновляем только координаты на корректные значения
                            originalData.position = [x, z, y];

                            const markerData = {
								id: Date.now() + Math.random(),
								leafletLatLng: { lat: leafletLatLng.lat, lng: leafletLatLng.lng },
								gameCoords: { 
									x: Math.round(x), 
									y: Math.round(y), 
									z: z // Сохраняем Z координату
								},
								text: markerName,
								type: markerType,
								color: markerColor,
								marker: markerObj,
								textLabel: textLabel,
								originalData: originalData // Сохраняем ВСЕ оригинальные данные как есть
							};

                            markerObj.on('dblclick', () => {
                                this.editMarker(markerData);
                            });

                            this.markers.push(markerData);
                            importedCount++;

                        } catch (markerError) {
                            console.warn('Ошибка обработки метки:', marker, markerError);
                            skipReasons.other++;
                            skippedCount++;
                        }
                    });
                }
            });

            this.saveMarkers();
            this.updateMarkersList();
            
            // Формируем детальное сообщение о результате импорта
            let resultMessage = `Импортировано ${importedCount} меток`;
            
            if (skippedCount > 0) {
                resultMessage += `<br>Пропущено ${skippedCount} меток:`;
                if (skipReasons.noPosition > 0) resultMessage += `<br>• ${skipReasons.noPosition} - отсутствуют координаты`;
                if (skipReasons.invalidPosition > 0) resultMessage += `<br>• ${skipReasons.invalidPosition} - неверный формат координат`;
                if (skipReasons.outOfBounds > 0) resultMessage += `<br>• ${skipReasons.outOfBounds} - координаты за пределами карты`;
                if (skipReasons.duplicate > 0) resultMessage += `<br>• ${skipReasons.duplicate} - дубликаты (совпадают название и координаты)`;
                if (skipReasons.other > 0) resultMessage += `<br>• ${skipReasons.other} - другие ошибки`;
            }
            
            // Показываем специальное уведомление если были найдены дубликаты
            if (duplicateCount > 0) {
                this.showSuccess(resultMessage);
                console.log(`Импорт завершен: ${importedCount} меток добавлено, ${skippedCount} пропущено (${duplicateCount} дубликатов)`, skipReasons);
            } else {
                this.showSuccess(resultMessage);
                console.log(`Импорт завершен: ${importedCount} меток добавлено, ${skippedCount} пропущено`, skipReasons);
            }
            
        } catch (error) {
            console.error('Ошибка импорта меток:', error);
            this.showError('Ошибка при импорте меток. Проверьте формат файла.');
        }
    }

    // Функция для обработки загрузки файла
    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Проверяем расширение файла
        if (!file.name.toLowerCase().endsWith('.json')) {
            this.showError('Пожалуйста, выберите JSON файл');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                console.log('Начинаем импорт файла:', file.name);
                this.importMarkersFromJSON(e.target.result);
            } catch (error) {
                console.error('Ошибка чтения файла:', error);
                this.showError('Ошибка при импорте меток. Убедитесь, что это валидный JSON файл с метками DayZ.');
            }
        };
        reader.onerror = () => {
            this.showError('Ошибка при чтении файла');
        };
        reader.readAsText(file);
        
        // Сбрасываем input чтобы можно было загрузить тот же файл снова
        event.target.value = '';
    }

    // Функция обновления прозрачности всех меток
    updateAllMarkersOpacity() {
        // Используем requestAnimationFrame для лучшей производительности
        requestAnimationFrame(() => {
            this.markers.forEach(markerData => {
                // Обновляем основную иконку метки
                const newIcon = this.createMarkerIcon(markerData.type, markerData.color, this.globalMarkerOpacity);
                markerData.marker.setIcon(newIcon);
        
                // Обновляем текстовую метку
                if (markerData.textLabel) {
                    const newTextLabel = this.createTextLabel(markerData.text, markerData.color, this.globalMarkerOpacity);
                    markerData.textLabel.setIcon(newTextLabel);
                }
            });
        });
    }

    // Метод для поиска меток
    searchMarkers(searchTerm) {
		this.searchFilter = searchTerm.toLowerCase().trim();
		const searchType = document.getElementById('searchType').value;
		
		this.filteredMarkers = this.markers.filter(marker => {
			const textMatch = !this.searchFilter || marker.text.toLowerCase().includes(this.searchFilter);
			const typeMatch = !searchType || marker.type === searchType;
			return textMatch && typeMatch;
		});

		this.isFilterActive = true;
		this.updateMarkersList();
		this.showSearchResults();
		
		this.updateSearchButtons();
		
		// Показываем уведомление о количестве найденных меток
		if (this.filteredMarkers.length > 0) {
			let message = `Найдено ${this.filteredMarkers.length} меток`;
			if (searchType) {
				const typeName = this.getMarkerTypeName(searchType);
				message += ` (тип: ${typeName})`;
			}
			this.showSuccess(message);
		} else {
			this.showError('Метки не найдены');
		}
	}
	
	performSearch() {
		const searchInput = document.getElementById('searchMarkers');
		const searchTerm = searchInput.value.trim();
		this.searchMarkers(searchTerm);
	}

    // Метод для показа результатов поиска
    showSearchResults() {
        // Сначала показываем все метки на карте
        this.markers.forEach(markerData => {
            markerData.marker.addTo(this.map);
            if (markerData.textLabel) {
                markerData.textLabel.addTo(this.map);
            }
        });

        // Если поиск активен, скрываем несоответствующие метки
        if (this.isFilterActive && this.filteredMarkers.length > 0) {
            this.markers.forEach(markerData => {
                const isVisible = this.filteredMarkers.some(fm => fm.id === markerData.id);
                if (!isVisible) {
                    this.map.removeLayer(markerData.marker);
                    if (markerData.textLabel) {
                        this.map.removeLayer(markerData.textLabel);
                    }
                }
            });
        }

        this.updateSearchButtons();
    }

    // Метод для очистки поиска
    clearSearch() {
		this.searchFilter = '';
		this.filteredMarkers = [];
		this.isFilterActive = false;
		
		// Сбрасываем поля поиска
		const searchInput = document.getElementById('searchMarkers');
		const searchType = document.getElementById('searchType');
		if (searchInput) searchInput.value = '';
		if (searchType) searchType.value = '';
		
		// Показываем все метки на карте
		this.markers.forEach(markerData => {
			markerData.marker.addTo(this.map);
			if (markerData.textLabel) {
				markerData.textLabel.addTo(this.map);
			}
		});
		
		this.updateMarkersList();
		// ОБНОВЛЯЕМ КНОПКИ ПОСЛЕ ОЧИСТКИ
		this.updateSearchButtons();
	}

    // Метод для скрытия всех меток кроме найденных
    hideOtherMarkers() {
        if (!this.searchFilter || this.filteredMarkers.length === 0) {
            this.showError('Сначала выполните поиск меток');
            return;
        }

        // Скрываем все метки
        this.markers.forEach(markerData => {
            this.map.removeLayer(markerData.marker);
            if (markerData.textLabel) {
                this.map.removeLayer(markerData.textLabel);
            }
        });

        // Показываем только отфильтрованные
        this.filteredMarkers.forEach(markerData => {
            markerData.marker.addTo(this.map);
            if (markerData.textLabel) {
                markerData.textLabel.addTo(this.map);
            }
        });

        this.showSuccess(`Показано ${this.filteredMarkers.length} меток`);
    }

    // Метод для экспорта меток
    exportMarkers() {
        if (this.markers.length === 0) {
            this.showError('Нет меток для экспорта');
            return;
        }

        const exportData = this.prepareExportData();
        this.downloadJSON(exportData, 'PrivateMarkers.json');
        
        this.showSuccess(`Экспортировано ${this.markers.length} меток`);
    }

    // Подготовка данных для экспорта в совместимом формате
    prepareExportData(markersToExport = null) {
		const markers = markersToExport || this.markers;
		
		const servers = [{
			param1: "ip:port", // Пустой param1 как в оригинальном файле
			param2: markers.map(marker => {
				// Если есть оригинальные данные, используем их КАК ЕСТЬ
				if (marker.originalData) {
					// Обновляем только изменяемые поля
					const updatedData = { ...marker.originalData };
					updatedData.name = marker.text;
					updatedData.icon = this.getIconPathFromType(marker.type);
					
					// Обновляем координаты (Z координата уже сохранена в originalData.position[1])
					updatedData.position = [
						marker.gameCoords.x,
						marker.originalData.position ? marker.originalData.position[1] : (marker.gameCoords.z || 0), // Используем сохраненную Z координату
						marker.gameCoords.y
					];
					
					// Обновляем цвет если он изменился
					const colorComponents = this.parseColorToComponents(marker.color);
					updatedData.colorR = colorComponents.r;
					updatedData.colorG = colorComponents.g;
					updatedData.colorB = colorComponents.b;
					
					// Проверяем и обрезаем UID если нужно
					if (updatedData.uid && updatedData.uid.toString().length > 10) {
						updatedData.uid = parseInt(updatedData.uid.toString().slice(0, 10));
					}
					
					return updatedData;
				}
				
				// Иначе создаем данные из текущего состояния метки
				const x = marker.gameCoords.x;
				const y = marker.gameCoords.y;
				const z = marker.gameCoords.z || 0; // Используем сохраненную Z координату
				
				// Получаем путь к иконке из типа метки
				const iconPath = this.getIconPathFromType(marker.type);
				
				// Преобразуем цвет из RGB в компоненты
				const colorComponents = this.parseColorToComponents(marker.color);
				
				// Проверяем и обрезаем UID если нужно
				let uid = marker.id;
				if (uid && uid.toString().length > 10) {
					uid = parseInt(uid.toString().slice(0, 10));
				}
				
				// Создаем объект с базовыми параметрами
				return {
					type: 5,
					uid: marker.id,
					name: marker.text,
					icon: iconPath,
					position: [x, z, y], // [x, z, y] - формат DayZ (Z координата включена)
					currentSubgroup: 0,
					colorA: 255,
					colorR: colorComponents.r,
					colorG: colorComponents.g,
					colorB: colorComponents.b,
					creatorSteamID: "",
					circleRadius: 0.0,
					circleColorA: 255,
					circleColorR: 255,
					circleColorG: 255,
					circleColorB: 255,
					circleStriked: 0,
					circleLayer: -1,
					showAllPlayerNametags: 0
				};
			})
		}];

		return servers;
	}

    // Получение пути к иконке из типа метки
    getIconPathFromType(type) {
        const typeToIcon = {
            'default': 'LBmaster_Groups\\gui\\icons\\marker.paa',
            'cross': 'LBmaster_Groups\\gui\\icons\\cross.paa',
            'home': 'LBmaster_Groups\\gui\\icons\\home.paa',
            'camp': 'LBmaster_Groups\\gui\\icons\\camp.paa',
            'safezone': 'LBmaster_Groups\\gui\\icons\\safezone.paa',
            'blackmarket': 'LBmaster_Groups\\gui\\icons\\blackmarket.paa',
            'hospital': 'LBmaster_Groups\\gui\\icons\\hospital.paa',
            'sniper': 'LBmaster_Groups\\gui\\icons\\sniper.paa',
            'player': 'LBmaster_Groups\\gui\\icons\\player.paa',
            'flag': 'LBmaster_Groups\\gui\\icons\\flag.paa',
            'star': 'LBmaster_Groups\\gui\\icons\\star.paa',
            'car': 'LBmaster_Groups\\gui\\icons\\car.paa',
            'parking': 'LBmaster_Groups\\gui\\icons\\parking.paa',
            'heli': 'LBmaster_Groups\\gui\\icons\\heli.paa',
            'rail': 'LBmaster_Groups\\gui\\icons\\rail.paa',
            'ship': 'LBmaster_Groups\\gui\\icons\\ship.paa',
            'scooter': 'LBmaster_Groups\\gui\\icons\\scooter.paa',
            'bank': 'LBmaster_Groups\\gui\\icons\\bank.paa',
            'restaurant': 'LBmaster_Groups\\gui\\icons\\restaurant.paa',
            'post': 'LBmaster_Groups\\gui\\icons\\post.paa',
            'castle': 'LBmaster_Groups\\gui\\icons\\castle.paa',
            'ranger-station': 'LBmaster_Groups\\gui\\icons\\ranger-station.paa',
            'water': 'LBmaster_Groups\\gui\\icons\\water.paa',
            'triangle': 'LBmaster_Groups\\gui\\icons\\triangle.paa',
            'cow': 'LBmaster_Groups\\gui\\icons\\cow.paa',
            'bear': 'LBmaster_Groups\\gui\\icons\\bear.paa',
            'car-repair': 'LBmaster_Groups\\gui\\icons\\car-repair.paa',
            'communications': 'LBmaster_Groups\\gui\\icons\\communications.paa',
            'roadblock': 'LBmaster_Groups\\gui\\icons\\roadblock.paa',
            'stadium': 'LBmaster_Groups\\gui\\icons\\stadium.paa',
            'skull': 'LBmaster_Groups\\gui\\icons\\skull.paa',
            'rocket': 'LBmaster_Groups\\gui\\icons\\rocket.paa',
            'bbq': 'LBmaster_Groups\\gui\\icons\\bbq.paa',
            'ping': 'LBmaster_Groups\\gui\\icons\\ping.paa',
            'circle': 'LBmaster_Groups\\gui\\icons\\circle.paa'
        };
        
        return typeToIcon[type] || 'LBmaster_Groups\\gui\\icons\\marker.paa';
    }

    // Парсинг цвета в RGB компоненты
    parseColorToComponents(color) {
        if (color.startsWith('rgb')) {
            const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (match) {
                return {
                    r: parseInt(match[1]),
                    g: parseInt(match[2]),
                    b: parseInt(match[3])
                };
            }
        } else if (color.startsWith('#')) {
            const rgb = this.hexToRgb(color);
            return {
                r: rgb.r,
                g: rgb.g,
                b: rgb.b
            };
        }
        
        // Значения по умолчанию
        return { r: 255, g: 255, b: 255 };
    }

    // Скачивание JSON файла
    downloadJSON(data, filename) {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showSuccess(`Экспортировано ${this.markers.length} меток`);
    }
	
	createDraggableModal(title, content, onClose = null) {
		// Создаем оверлей
		let overlay = document.querySelector('.modal-overlay');
		if (!overlay) {
			overlay = document.createElement('div');
			overlay.className = 'modal-overlay';
			document.body.appendChild(overlay);
		}
		overlay.classList.add('active');

		// Создаем модальное окно
		const modal = document.createElement('div');
		modal.className = 'marker-modal';
		
		// Адаптивные размеры с увеличенной шириной
		const isMobile = window.innerWidth <= 480;
		const isSmallHeight = window.innerHeight <= 600;
		
		let modalWidth = 450; // Увеличили базовую ширину
		let modalHeight = 'auto';
		let topPosition = '50%';
		
		if (isMobile) {
			modalWidth = Math.min(380, window.innerWidth - 40);
			topPosition = '20px';
		}
		
		if (isSmallHeight) {
			topPosition = '10px';
			modalHeight = 'calc(100vh - 20px)';
		}

		modal.style.cssText = `
			position: fixed;
			top: ${topPosition};
			left: 50%;
			transform: translate(-50%, ${isMobile || isSmallHeight ? '0' : '-50%'});
			width: ${modalWidth}px;
			height: ${modalHeight};
			max-width: 95vw;
			max-height: ${isSmallHeight ? '98vh' : '90vh'};
			overflow: hidden;
		`;

		modal.innerHTML = `
			<div class="modal-header">
				<h3>${title}</h3>
				<button class="modal-close">×</button>
			</div>
			<div class="modal-content">
				${content}
			</div>
		`;

		document.body.appendChild(modal);

		// Добавляем функционал перетаскивания (только для десктопных размеров)
		if (!isMobile) {
			this.makeDraggable(modal);
		}

		// Обработчики событий
		const closeHandler = () => {
			this.closeModal(modal);
			if (onClose) onClose();
		};

		const closeBtn = modal.querySelector('.modal-close');
		closeBtn.addEventListener('click', closeHandler);

		// Закрытие по клику на оверлей
		const overlayHandler = (e) => {
			if (e.target === overlay) {
				closeHandler();
			}
		};
		overlay.addEventListener('click', overlayHandler);

		// Закрытие по ESC
		const keyHandler = (e) => {
			if (e.key === 'Escape') {
				closeHandler();
			}
		};
		document.addEventListener('keydown', keyHandler);

		// Сохраняем обработчики
		this.modalCloseHandlers.set(modal, {
			closeHandler: () => {
				closeBtn.removeEventListener('click', closeHandler);
				overlay.removeEventListener('click', overlayHandler);
				document.removeEventListener('keydown', keyHandler);
				overlay.classList.remove('active');
			}
		});

		return modal;
	}
	
	makeDraggable(element) {
		const header = element.querySelector('.modal-header');
		let isDragging = false;
		let startX, startY, initialX, initialY;

		// Сохраняем начальную позицию
		const rect = element.getBoundingClientRect();
		initialX = rect.left;
		initialY = rect.top;

		header.addEventListener('mousedown', dragStart);
		document.addEventListener('mousemove', drag);
		document.addEventListener('mouseup', dragEnd);

		function dragStart(e) {
			if (e.target.classList.contains('modal-close')) return;
			
			isDragging = true;
			
			// Получаем текущую позицию элемента
			const currentRect = element.getBoundingClientRect();
			initialX = currentRect.left;
			initialY = currentRect.top;
			
			// Запоминаем позицию курсора относительно элемента
			startX = e.clientX - initialX;
			startY = e.clientY - initialY;
			
			// Добавляем класс для визуальной обратной связи
			element.style.transition = 'none';
			header.style.cursor = 'grabbing';
		}

		function drag(e) {
			if (!isDragging) return;
			
			e.preventDefault();
			
			// Вычисляем новую позицию
			const newX = e.clientX - startX;
			const newY = e.clientY - startY;
			
			// Устанавливаем новую позицию
			element.style.left = newX + 'px';
			element.style.top = newY + 'px';
			element.style.transform = 'none';
		}

		function dragEnd() {
			if (!isDragging) return;
			
			isDragging = false;
			header.style.cursor = 'move';
			element.style.transition = '';
		}

		// Сохраняем обработчики для очистки
		const dragHandlers = {
			dragStart: dragStart,
			drag: drag,
			dragEnd: dragEnd
		};
		
		this.modalCloseHandlers.set(element, {
			...this.modalCloseHandlers.get(element),
			dragHandlers
		});
	}
	
	// Метод для парсинга координат из формата DayZ
	parseDayZCoordinates(coordsString) {
		try {
			// Регулярное выражение для извлечения чисел из формата: <6643.34 345.259 6601.01> 160.805 Degree
			const regex = /<([\d.]+)\s+([\d.]+)\s+([\d.]+)>\s+([\d.]+)\s+Degree/;
			const match = coordsString.match(regex);
			
			if (!match) {
				throw new Error('Неверный формат координат');
			}
			
			const x = parseFloat(match[1]);
			const z = parseFloat(match[2]); // Высота (Z координата)
			const y = parseFloat(match[3]);
			const degree = parseFloat(match[4]);
			
			// Валидация координат
			if (isNaN(x) || isNaN(y) || isNaN(z) || isNaN(degree)) {
				throw new Error('Координаты содержат нечисловые значения');
			}
			
			if (x < 0 || x > CONFIG.mapPixelWidth || y < 0 || y > CONFIG.mapPixelHeight) {
				throw new Error(`Координаты должны быть в пределах: X: 0-${CONFIG.mapPixelWidth}, Y: 0-${CONFIG.mapPixelHeight}`);
			}
			
			return { x, y, z, degree };
		} catch (error) {
			console.error('Ошибка парсинга координат:', error);
			throw error;
		}
	}

	// Метод для центрирования карты на координатах DayZ
	centerOnDayZCoords() {
		const coordsInput = document.getElementById('dayzCoordsInput');
		if (!coordsInput) {
			this.showError('Поле для ввода координат не найдено');
			return;
		}

		const coordsString = coordsInput.value.trim();
		if (!coordsString) {
			this.showError('Введите координаты в формате: <X Z Y> Degree');
			return;
		}

		try {
			const { x, y, z } = this.parseDayZCoordinates(coordsString);
			
			// Преобразуем игровые координаты в Leaflet координаты
			const leafletLatLng = this.gameToLeafletCoords(x, y);
			
			// Центрируем карту с зумом 8
			this.map.setView(leafletLatLng, 8);
			
			this.showSuccess(`Центрировано на координатах: X:${x} Y:${y} Z:${z}`);
			
		} catch (error) {
			this.showError(error.message);
		}
	}

	// Метод "Я тут" - центрирование и открытие окна добавления метки
	imHereAtDayZCoords() {
		const coordsInput = document.getElementById('dayzCoordsInput');
		if (!coordsInput) {
			this.showError('Поле для ввода координат не найдено');
			return;
		}

		const coordsString = coordsInput.value.trim();
		if (!coordsString) {
			this.showError('Введите координаты в формате: <X Z Y> Degree');
			return;
		}

		try {
			const { x, y, z } = this.parseDayZCoordinates(coordsString);
			
			// Преобразуем игровые координаты в Leaflet координаты
			const leafletLatLng = this.gameToLeafletCoords(x, y);
			
			// Центрируем карту с зумом 8
			this.map.setView(leafletLatLng, 8);
			
			// Создаем объект координат с Z значением
			const gameCoords = { x: x, y: y, z: z };
			
			// Показываем модальное окно для создания метки
			this.showAddMarkerModal(leafletLatLng, gameCoords);
			
			this.showSuccess(`Готово к добавлению метки: X:${x} Y:${y} Z:${z}`);
			
		} catch (error) {
			this.showError(error.message);
		}
	}
	
	// Метод для переключения сортировки
    toggleSort(field) {
		if (this.currentSort.field === field) {
			// Циклическое переключение: нет → asc → desc → нет
			if (this.currentSort.direction === 'asc') {
				this.currentSort.direction = 'desc';
			} else if (this.currentSort.direction === 'desc') {
				// Сбрасываем сортировку
				this.currentSort.field = null;
				this.currentSort.direction = null;
			}
		} else {
			// Новая сортировка - начинаем с asc
			this.currentSort.field = field;
			this.currentSort.direction = 'asc';
		}
	}

    // Метод для обновления внешнего вида кнопок сортировки
    updateSortButtons() {
		document.querySelectorAll('.sort-btn').forEach(btn => {
			const sortField = btn.dataset.sort;
			
			// Убираем все классы
			btn.classList.remove('active', 'asc', 'desc');
			
			// Если это активная кнопка сортировки
			if (sortField === this.currentSort.field) {
				btn.classList.add('active', this.currentSort.direction);
			}
		});
	}
	
	// Метод для сортировки меток
    sortMarkers(markers) {
		// Если сортировка не активна, возвращаем исходный порядок
		if (!this.currentSort.field || !this.currentSort.direction) {
			return markers;
		}

		const { field, direction } = this.currentSort;
		const directionMultiplier = direction === 'asc' ? 1 : -1;

		return [...markers].sort((a, b) => {
			switch (field) {
				case 'name':
					return this.compareStrings(a.text, b.text) * directionMultiplier;
				
				case 'x':
					return this.compareNumbers(a.gameCoords.x, b.gameCoords.x) * directionMultiplier;
				
				case 'y':
					return this.compareNumbers(a.gameCoords.y, b.gameCoords.y) * directionMultiplier;
				
				default:
					return 0;
			}
		});
	}
	
	// Вспомогательные методы для сравнения
    compareStrings(a, b) {
        const strA = (a || '').toLowerCase();
        const strB = (b || '').toLowerCase();
        return strA.localeCompare(strB);
    }

    compareNumbers(a, b) {
        return (a || 0) - (b || 0);
    }
	
	// Метод для показа подсказки по координатам
	showCoordsHelp() {
		// Удаляем старый тултип если есть
		const oldTooltip = document.querySelector('.help-tooltip');
		if (oldTooltip) {
			oldTooltip.remove();
		}

		const tooltip = document.createElement('div');
		tooltip.className = 'help-tooltip';
		tooltip.innerHTML = 'Подходит для установки меток например после прочтения документов или писем с координатами клада.';
		
		// Добавляем тултип в DOM сначала чтобы получить его размеры
		document.body.appendChild(tooltip);
		
		// Позиционируем тултип под кнопкой
		const helpBtn = document.getElementById('coordsHelpBtn');
		const rect = helpBtn.getBoundingClientRect();
		const tooltipHeight = tooltip.offsetHeight;
		
		tooltip.style.position = 'fixed';
		tooltip.style.top = (rect.bottom + 10) + 'px'; // Позиционируем под кнопкой
		tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px'; // Центрируем
		
		// Обработчик для закрытия при клике вне тултипа
		const clickHandler = (e) => {
			if (!tooltip.contains(e.target) && e.target !== helpBtn) {
				if (tooltip.parentNode) {
					tooltip.parentNode.removeChild(tooltip);
				}
				document.removeEventListener('click', clickHandler);
			}
		};

		// Обработчик для закрытия по ESC
		const keyHandler = (e) => {
			if (e.key === 'Escape') {
				if (tooltip.parentNode) {
					tooltip.parentNode.removeChild(tooltip);
				}
				document.removeEventListener('keydown', keyHandler);
				document.removeEventListener('click', clickHandler);
			}
		};

		// Добавляем обработчики
		setTimeout(() => {
			document.addEventListener('click', clickHandler);
			document.addEventListener('keydown', keyHandler);
		}, 100);
		
		// Автоматическое скрытие через 8 секунд
		const autoClose = setTimeout(() => {
			if (tooltip.parentNode) {
				tooltip.parentNode.removeChild(tooltip);
				document.removeEventListener('click', clickHandler);
				document.removeEventListener('keydown', keyHandler);
			}
		}, 8000);

		// Сохраняем ID таймера для очистки при ручном закрытии
		tooltip.autoCloseId = autoClose;
	}
	
	// Метод для показа второй подсказки по координатам
	showCoordsHelp2() {
		// Удаляем старый тултип если есть
		const oldTooltip = document.querySelector('.help-tooltip');
		if (oldTooltip) {
			oldTooltip.remove();
		}

		const tooltip = document.createElement('div');
		tooltip.className = 'help-tooltip';
		tooltip.innerHTML = 'Откройте карту в игре DayZ, на вкладке "Информация" слева внизу нажмите "Копировать координаты", вставьте координаты в поле "X Z Y Degree"';
		
		// Добавляем тултип в DOM сначала чтобы получить его размеры
		document.body.appendChild(tooltip);
		
		// Позиционируем тултип под кнопкой
		const helpBtn = document.getElementById('coordsHelpBtn2');
		const rect = helpBtn.getBoundingClientRect();
		const tooltipHeight = tooltip.offsetHeight;
		
		tooltip.style.position = 'fixed';
		tooltip.style.top = (rect.bottom + 10) + 'px'; // Позиционируем под кнопкой
		tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px'; // Центрируем
		
		// Обработчик для закрытия при клике вне тултипа
		const clickHandler = (e) => {
			if (!tooltip.contains(e.target) && e.target !== helpBtn) {
				if (tooltip.parentNode) {
					tooltip.parentNode.removeChild(tooltip);
				}
				document.removeEventListener('click', clickHandler);
			}
		};

		// Обработчик для закрытия по ESC
		const keyHandler = (e) => {
			if (e.key === 'Escape') {
				if (tooltip.parentNode) {
					tooltip.parentNode.removeChild(tooltip);
				}
				document.removeEventListener('keydown', keyHandler);
				document.removeEventListener('click', clickHandler);
			}
		};

		// Добавляем обработчики
		setTimeout(() => {
			document.addEventListener('click', clickHandler);
			document.addEventListener('keydown', keyHandler);
		}, 100);
		
		// Автоматическое скрытие через 8 секунд
		const autoClose = setTimeout(() => {
			if (tooltip.parentNode) {
				tooltip.parentNode.removeChild(tooltip);
				document.removeEventListener('click', clickHandler);
				document.removeEventListener('keydown', keyHandler);
			}
		}, 8000);

		// Сохраняем ID таймера для очистки при ручном закрытии
		tooltip.autoCloseId = autoClose;
	}
	
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен, создаем карту...');
    window.dayzMap = new DayZMap();
    
    // Инициализируем кнопки сортировки после создания карты
    setTimeout(() => {
        if (window.dayzMap) {
            window.dayzMap.updateSortButtons();
        }
    }, 100);
});