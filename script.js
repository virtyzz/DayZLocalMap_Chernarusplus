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
    home: { name: 'Дом H', color: '#e74c3c', symbol: 'H' },
    camp: { name: 'Лагерь C', color: '#27ae60', symbol: 'C' },
    safezone: { name: 'Безопасная зона S', color: '#2ecc71', symbol: 'S' },
    blackmarket: { name: 'Черный рынок B', color: '#34495e', symbol: 'B' },
    hospital: { name: 'Госпиталь +', color: '#e74c8c', symbol: '+' },
    sniper: { name: 'Снайпер ⊙', color: '#c0392b', symbol: '⊙' },
    player: { name: 'Игрок P', color: '#9b59b6', symbol: 'P' },
    flag: { name: 'Флаг ⚑', color: '#d35400', symbol: '⚑' },
    star: { name: 'Звезда ★', color: '#f1c40f', symbol: '★' },
    car: { name: 'Автомобиль 🚗', color: '#16a085', symbol: '🚗' },
    parking: { name: 'Парковка P', color: '#7f8c8d', symbol: 'P' },
    heli: { name: 'Вертолет 🚁', color: '#2980b9', symbol: '🚁' },
    rail: { name: 'Железная дорога 🚆', color: '#8e44ad', symbol: '🚆' },
    ship: { name: 'Корабль ⛴', color: '#3498db', symbol: '⛴' },
    scooter: { name: 'Скутер 🛵', color: '#1abc9c', symbol: '🛵' },
    bank: { name: 'Банк 💳', color: '#f39c12', symbol: '💳' },
    restaurant: { name: 'Ресторан 🍴', color: '#e67e22', symbol: '🍴' },
    post: { name: 'Почта ✉', color: '#95a5a6', symbol: '✉' },
    castle: { name: 'Замок 🏰', color: '#7d3c98', symbol: '🏰' },
    'ranger-station': { name: 'Станция рейнджера 🌲', color: '#27ae60', symbol: '🌲' },
    water: { name: 'Вода 💧', color: '#3498db', symbol: '💧' },
    triangle: { name: 'Треугольник ▲', color: '#e74c3c', symbol: '▲' },
    cow: { name: 'Корова 🐄', color: '#8b4513', symbol: '🐄' },
    bear: { name: 'Медведь 🐻', color: '#2c3e50', symbol: '🐻' },
    'car-repair': { name: 'Ремонт авто 🔧', color: '#d35400', symbol: '🔧' },
    communications: { name: 'Коммуникации 📡', color: '#9b59b6', symbol: '📡' },
    roadblock: { name: 'Блокпост 🚧', color: '#c0392b', symbol: '🚧' },
    stadium: { name: 'Стадион 🏟', color: '#f1c40f', symbol: '🏟' },
    skull: { name: 'Череп 💀', color: '#2c3e50', symbol: '💀' },
    rocket: { name: 'Ракета 🚀', color: '#e74c3c', symbol: '🚀' },
    bbq: { name: 'BBQ 🍖', color: '#d35400', symbol: '🍖' },
    ping: { name: 'Пинг 📍', color: '#2ecc71', symbol: '📍' },
    circle: { name: 'Круг ●', color: '#3498db', symbol: '●' }
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
            direction: 'asc'
        };
        this.sortDirection = 1;
		this.temporaryMarker = null;
		this.temporaryMarkerTimeout = null;
		this.nearbySearchEnabled = false;
        this.nearbySearchRadius = 500; // радиус по умолчанию в метрах игровых координат
        this.nearbyMarkers = [];
        this.nearbyCircle = null;
        this.originalMarkerParams = null; // для сохранения параметров формы
        this.currentMarkerPosition = null; // для сохранения позиции новой метки
		this.temporaryAddMarker = null; // Временный маркер при добавлении
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
					const searchInput = document.getElementById('searchMarkers');
					const searchTerm = searchInput ? searchInput.value.trim() : '';
					
					// Вызываем поиск в любом случае, даже если оба поля пустые
					this.searchMarkers(searchTerm);
					this.updateSearchButtons();
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
			
			// Кнопка для экспорта на серверы
			const exportToServersButton = document.createElement('button');
			exportToServersButton.textContent = 'Экспорт меток';
			exportToServersButton.style.marginLeft = '10px';
			exportToServersButton.addEventListener('click', () => {
				this.exportMarkersToServers();
			});
			
			const controls = document.querySelector('.controls');
			if (controls) {
				controls.appendChild(exportToServersButton);
			}
			
            const exportFilteredToServersBtn = document.getElementById('exportFilteredToServersBtn');
			if (exportFilteredToServersBtn) {
				exportFilteredToServersBtn.addEventListener('click', () => {
					this.exportFilteredMarkersToServers();
				});
			}

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

		// Показываем временный маркер
		this.showTemporaryAddMarker(leafletLatLng, gameCoords);

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
		// Закрываем все существующие модальные окна перед созданием нового
		this.closeAllModals();
		// Сохраняем текущие параметры формы перед любыми изменениями
		const currentParams = { ...this.lastMarkerParams };
		
		// Получаем RGB значения
		let r, g, b;
		if (currentParams.color.startsWith('rgb')) {
			const rgbMatch = currentParams.color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
			if (rgbMatch) {
				r = rgbMatch[1];
				g = rgbMatch[2];
				b = rgbMatch[3];
			} else {
				r = 52; g = 152; b = 219;
			}
		} else {
			const rgb = this.hexToRgb(currentParams.color);
			r = rgb.r;
			g = rgb.g;
			b = rgb.b;
		}

		// Создаем временный маркер-индикатор
		this.showTemporaryAddMarker(leafletLatLng, gameCoords);

		const content = `
			<div class="modal-field">
				<label>Текст метки:</label>
				<input type="text" id="newMarkerText" value="${currentParams.text}">
			</div>
			
			<div class="modal-field">
				<label>Тип метки:</label>
				<select id="newMarkerType">
					${this.getMarkerTypeOptions(currentParams.type)}
				</select>
			</div>
			
			<div class="modal-field">
				<label>Цвет метки:</label>
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
							<div class="color-preview" id="newColorPreview" style="background: ${currentParams.color};"></div>
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
				<button id="saveNewMarker" style="background: #27ae60; color: white;">Добавить метку</button>
				<button id="checkNearbyBtn" style="background: #3498db; color: white;">Показать ближайшие метки</button>
				<button id="cancelNewMarker" style="background: #7f8c8d; color: white;">Отмена</button>
			</div>
		`;

		const modal = this.createDraggableModal('Добавление новой метки', content, () => {
			// Этот колбэк вызывается только при закрытии через ESC или клик мимо окна добавления метки
			console.log('🔴 Закрытие окна добавления метки через ESC/клик мимо');
			this.disableMarkerMode();
			this.removeTemporaryAddMarker(); // Удаляем маркер только при прямом закрытии окна добавления
			this.cleanupNearbySearch();
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
			// Сохраняем метку напрямую
			this.saveNewMarker(leafletLatLng, gameCoords);
			this.removeTemporaryAddMarker(); // Удаляем временный маркер после сохранения
			this.closeModal(modal);
		});

		document.getElementById('checkNearbyBtn').addEventListener('click', () => {
			// Сохраняем текущие параметры формы
			const currentFormParams = this.getCurrentFormParams();
			this.originalMarkerParams = currentFormParams;
			this.currentMarkerPosition = { x: gameCoords.x, y: gameCoords.y };
			
			// Рисуем круг и показываем ближайшие метки
			this.drawSearchCircle(gameCoords.x, gameCoords.y, this.nearbySearchRadius);
			// НЕ удаляем временный маркер - он должен оставаться
			this.showNearbyMarkersModal(gameCoords.x, gameCoords.y, this.nearbySearchRadius, currentFormParams);
			this.closeModal(modal);
			// НЕ вызываем this.removeTemporaryAddMarker() здесь
		});
		
		document.getElementById('cancelNewMarker').addEventListener('click', () => {
			console.log('🔴 Явная отмена добавления метки');
			this.removeTemporaryAddMarker(); // Удаляем маркер при явной отмене
			this.closeModal(modal);
			this.disableMarkerMode();
			this.cleanupNearbySearch(); // Полная очистка
		});

		return modal;
	}
	
	// Вспомогательный метод для получения текущих параметров формы
	getCurrentFormParams() {
		return {
			text: document.getElementById('newMarkerText').value || 'Метка',
			type: document.getElementById('newMarkerType').value,
			color: document.getElementById('newColorPreview').style.backgroundColor
		};
	}


	closeModal(modal) {
		if (!modal) return;
		
		// Проверяем, не переходим ли мы к другому модальному окну
		const isTransitioningToNearby = this.currentMarkerPosition && this.originalMarkerParams;
		
		// Очищаем переопределенные обработчики если они есть
		if (modal._escapeHandler) {
			document.removeEventListener('keydown', modal._escapeHandler);
			delete modal._escapeHandler;
		}

		if (modal._overlayHandler) {
			const overlay = document.querySelector('.modal-overlay');
			if (overlay) {
				overlay.removeEventListener('click', modal._overlayHandler);
			}
			delete modal._overlayHandler;
		}

		// Очищаем стандартные обработчики
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
			
			// Если закрыто последнее модальное окно и нет активного поиска ближайших, удаляем временный маркер
			if (!isTransitioningToNearby) {
				this.removeTemporaryAddMarker();
				this.disableMarkerMode();
			}
		}
	}
	
    saveNewMarker(leafletLatLng, gameCoords) {
		console.log('💾 Сохранение новой метки');
		this.cleanupNearbySearch();
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

		// Удаляем временный маркер только после успешного сохранения
		this.removeTemporaryAddMarker();
		
		// Полная очистка
		this.cleanupNearbySearch();
		
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
		// Закрываем все существующие модальные окна перед созданием нового
		this.closeAllModals();
		this.editingMarker = markerData;
		
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
		
		// Проверяем, что контейнер существует
		if (!paletteContainer) {
			console.error(`Контейнер с ID '${containerId}' не найден`);
			return;
		}
		
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
		
		// Проверяем, что контекст получен
		if (!ctx) {
			console.error('Не удалось получить контекст Canvas');
			return;
		}
		
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
			try {
				const imageData = ctx.getImageData(x, y, 1, 1).data;
				return {
					r: imageData[0],
					g: imageData[1],
					b: imageData[2]
				};
			} catch (error) {
				console.error('Ошибка получения цвета:', error);
				return { r: 255, g: 255, b: 255 }; // Значение по умолчанию
			}
		};

		// Обработчик перемещения и клика
		const handleColorSelect = (e) => {
			const rect = canvas.getBoundingClientRect();
			const x = Math.max(0, Math.min(canvas.width - 1, e.clientX - rect.left));
			const y = Math.max(0, Math.min(canvas.height - 1, e.clientY - rect.top));
			
			const color = getColorAt(x, y);
			
			// Обновляем поля ввода
			const rInput = document.getElementById(rInputId);
			const gInput = document.getElementById(gInputId);
			const bInput = document.getElementById(bInputId);
			const preview = document.getElementById(previewId);
			
			if (rInput && gInput && bInput && preview) {
				rInput.value = color.r;
				gInput.value = color.g;
				bInput.value = color.b;
				
				// Триггерим событие input чтобы обновился preview
				rInput.dispatchEvent(new Event('input'));
			}
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
		let markersToShow = this.isFilterActive ? this.filteredMarkers : this.markers; // Ключевое изменение!
		markersToShow = this.sortMarkers(markersToShow);
		
		if (this.isFilterActive && markersToShow.length === 0) { // Используем isFilterActive вместо searchFilter
			container.innerHTML = `<div class="no-results">Метки по заданным критериям не найдены</div>`;
		} else {
			markersToShow.forEach(markerData => {
				const item = document.createElement('div');
				item.className = `marker-item marker-${markerData.type}`;
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
			item.classList.remove('selected'); // Убираем выделение со всех
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
			
			// Дополнительная анимация для лучшей видимости
			currentItem.style.animation = 'none';
			setTimeout(() => {
				currentItem.style.animation = 'pulse-border 1s ease-in-out';
			}, 10);
		}
	}

    // Метод для обновления состояния кнопок
    updateSearchButtons() {
		const searchBtn = document.getElementById('searchBtn');
		const showAllBtn = document.getElementById('showAllBtn');
		const hideOthersBtn = document.getElementById('hideOthersBtn');
		const exportFilteredToServersBtn = document.getElementById('exportFilteredToServersBtn'); // Новая кнопка

		if (!searchBtn || !showAllBtn || !hideOthersBtn || !exportFilteredToServersBtn) return;

		const searchType = document.getElementById('searchType').value;
		const searchInput = document.getElementById('searchMarkers');
		const searchTerm = searchInput ? searchInput.value.trim() : '';
		
		const hasActiveFilter = this.searchFilter || searchType;

		if (hasActiveFilter) {
			searchBtn.textContent = 'Отменить';
			searchBtn.style.background = '#e74c3c';
			showAllBtn.style.display = 'inline-block';
			exportFilteredToServersBtn.style.display = 'inline-block';
			
			// Обновляем состояние кнопок
			const hasResults = this.filteredMarkers.length > 0;
			hideOthersBtn.disabled = !hasResults;
			exportFilteredToServersBtn.disabled = !hasResults;
			
			// Обновляем подсказки
			if (!hasResults) {
				hideOthersBtn.title = 'Нет найденных меток для отображения';
				exportFilteredToServersBtn.title = 'Нет найденных меток для экспорта на серверы';
			} else {
				hideOthersBtn.title = '';
				exportFilteredToServersBtn.title = `Экспортировать ${this.filteredMarkers.length} найденных меток на серверы`;
			}
		} else {
			searchBtn.textContent = 'Поиск';
			searchBtn.style.background = '';
			showAllBtn.style.display = 'none';
			exportFilteredToServersBtn.style.display = 'none'; // Скрываем новую кнопку
			
			// Сбрасываем состояние
			hideOthersBtn.disabled = true;
			exportFilteredToServersBtn.disabled = true;
			hideOthersBtn.title = 'Сначала выполните поиск';
			exportFilteredToServersBtn.title = 'Сначала выполните поиск';
		}
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
		this.searchFilter = searchTerm.trim();
		const searchType = document.getElementById('searchType').value;
		
		console.log('=== НАЧАЛО ПОИСКА ===');
		console.log('Поисковый запрос:', this.searchFilter);
		console.log('Тип поиска из селекта:', searchType);
		
		// Парсим сложный запрос
		const parsedQuery = this.parseComplexSearch(this.searchFilter);
		console.log('Распарсенный запрос:', parsedQuery);
		
		this.filteredMarkers = this.markers.filter(marker => {
			// Проверка по типу из выпадающего списка (имеет высший приоритет)
			if (searchType) {
				if (marker.type !== searchType) {
					return false;
				}
			}
			
			// Если нет поискового запроса, возвращаем все подходящие по типу из селекта
			if (!this.searchFilter) {
				return true;
			}
			
			// Проверяем сложный запрос
			return this.checkComplexQuery(marker, parsedQuery);
		});

		console.log('=== РЕЗУЛЬТАТЫ ПОИСКА ===');
		console.log('Найдено меток:', this.filteredMarkers.length);
		console.log('Фильтрованные метки:', this.filteredMarkers.map(m => ({
			name: m.text,
			type: m.type
		})));

		this.isFilterActive = this.searchFilter || searchType;
		this.updateMarkersList();
		this.showSearchResults();
		this.updateSearchButtons();
		
		// Показываем уведомление
		if (this.filteredMarkers.length > 0) {
			let message = `Найдено ${this.filteredMarkers.length} меток`;
			
			if (searchType) {
				const typeName = this.getMarkerTypeName(searchType);
				message += ` (тип: ${typeName})`;
			}
			
			if (this.searchFilter) {
				message += ` по запросу: "${this.searchFilter}"`;
			}
			
			this.showSuccess(message);
		} else {
			let message = 'Метки не найдены';
			
			if (searchType || this.searchFilter) {
				message += ' по заданным критериям';
			}
			
			this.showError(message);
		}
	}

	// Умный текстовый поиск с поддержкой комбинированных операторов
	// Упростим метод smartTextSearch (он теперь не нужен для основной логики)
	smartTextSearch(markerText, searchQuery) {
		// Этот метод теперь используется только для простых текстовых поисков
		const text = markerText.toLowerCase();
		const query = searchQuery.toLowerCase();
		
		if (!query) return true;
		
		if (query.startsWith('"') && query.endsWith('"')) {
			const exactPhrase = query.slice(1, -1);
			return exactPhrase && text === exactPhrase;
		}
		
		return text.includes(query);
	}

	// Добавьте вспомогательный метод для экранирования спецсимволов в регулярных выражениях
	escapeRegExp(string) {
		return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}
	
	performSearch() {
		const searchInput = document.getElementById('searchMarkers');
		const searchTerm = searchInput.value.trim();
		const searchType = document.getElementById('searchType').value;
		
		// Если есть либо текст, либо тип - выполняем поиск
		if (searchTerm || searchType) {
			this.searchMarkers(searchTerm);
		} else {
			// Если оба поля пустые - очищаем фильтр
			this.clearSearch();
		}
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
	
	// Метод для экспорта меток с выбором серверов
	exportMarkersToServers() {
		if (this.markers.length === 0) {
			this.showError('Нет меток для экспорта');
			return;
		}

		this.showServerExportModal(this.markers, false);
	}

	// Метод для выполнения экспорта на выбранные серверы
	performServerExport(selectedServers) {
		// Получаем данные для экспорта (используем существующий метод)
		const markersData = this.prepareExportData();
		
		if (!markersData || !markersData[0] || !markersData[0].param2) {
			this.showError('Ошибка подготовки данных для экспорта');
			return;
		}

		// Создаем структуру данных для каждого выбранного сервера
		const exportData = selectedServers.map(server => ({
			param1: server.ip,
			param2: markersData[0].param2 // Копируем метки для каждого сервера
		}));

		// Формируем имя файла
		const filename = `Markers_${selectedServers.length}_servers_${this.formatDate()}.json`;
		
		// Скачиваем файл
		this.downloadJSON(exportData, filename);
		
		this.showSuccess(`Экспортировано ${this.markers.length} меток на ${selectedServers.length} серверов`);
	}

	// Вспомогательный метод для форматирования даты
	formatDate() {
		const now = new Date();
		return now.toISOString().slice(0, 10).replace(/-/g, '');
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
			
			// Создаем временный маркер для визуальной индикации
			this.showTemporaryMarker(leafletLatLng, x, y, z);
			
			this.showSuccess(`Центрировано на координатах: X:${x} Y:${y} Z:${z}`);
			
		} catch (error) {
			this.showError(error.message);
		}
	}

	// Метод для показа временного маркера-индикатора
	showTemporaryMarker(leafletLatLng, x, y, z) {
		// Удаляем предыдущий временный маркер если есть
		this.removeTemporaryMarker();
		
		// Создаем анимированный маркер
		const temporaryIcon = L.divIcon({
			className: 'temporary-marker-indicator',
			html: `
				<div class="pulsating-circle">
					<div class="inner-circle"></div>
					<div class="pulse-ring"></div>
					<div class="pulse-ring delay-1"></div>
					<div class="pulse-ring delay-2"></div>
				</div>
				<div class="coordinates-label">X:${x} Y:${y}</div>
			`,
			iconSize: [60, 60],
			iconAnchor: [30, 30]
		});
		
		// Создаем маркер
		this.temporaryMarker = L.marker(leafletLatLng, {
			icon: temporaryIcon,
			interactive: false
		}).addTo(this.map);
		
		// Автоматически удаляем маркер через 5 секунд
		this.temporaryMarkerTimeout = setTimeout(() => {
			this.removeTemporaryMarker();
		}, 10000);
	}

	// Метод для удаления временного маркера
	removeTemporaryMarker() {
		if (this.temporaryMarker) {
			this.map.removeLayer(this.temporaryMarker);
			this.temporaryMarker = null;
		}
		if (this.temporaryMarkerTimeout) {
			clearTimeout(this.temporaryMarkerTimeout);
			this.temporaryMarkerTimeout = null;
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
	
	// Метод для экспорта найденных меток на серверы
	exportFilteredMarkersToServers() {
		if (!this.isFilterActive || this.filteredMarkers.length === 0) {
			this.showError('Нет найденных меток для экспорта');
			return;
		}

		this.showServerExportModal(this.filteredMarkers, true);
	}
	
	// Универсальный метод для показа модального окна экспорта на серверы
	showServerExportModal(markersToExport, isFiltered = false) {
		const markerCount = markersToExport.length;
		const title = isFiltered ? 
			`Экспорт найденных меток на серверы (${markerCount} меток)` : 
			`Экспорт всех меток на серверы (${markerCount} меток)`;

		// Создаем форму для ввода серверов
		const content = `
			<div class="modal-field">
				<label>Настройки серверов для экспорта:</label>
				<div class="servers-config">
					<div class="server-presets">
						<details>
							<summary><strong>Предустановленные серверы YW</strong></summary>
							<div class="preset-servers" style="margin-top: 10px;">
								<div class="preset-server" data-ip="109.248.4.32" data-port="2200">chernarus1 - 109.248.4.32:2200</div>
								<div class="preset-server" data-ip="109.248.4.32" data-port="2206">chernarus2 - 109.248.4.32:2206</div>
								<div class="preset-server" data-ip="109.248.4.32" data-port="2212">chernarus3 - 109.248.4.32:2212</div>
								<div class="preset-server" data-ip="109.248.4.106" data-port="2200">chernarus4 - 109.248.4.106:2200</div>
								<div class="preset-server" data-ip="109.248.4.106" data-port="2206">chernarus5 - 109.248.4.106:2206</div>
								<div class="preset-server" data-ip="109.248.4.106" data-port="2212">chernarus6 - 109.248.4.106:2212</div>
								<div class="preset-server" data-ip="109.248.4.32" data-port="2218">dungeon-1 - 109.248.4.32:2218</div>
								<div class="preset-server" data-ip="109.248.4.106" data-port="2218">dungeon-2 - 109.248.4.106:2218</div>
							</div>
						</details>
					</div>
					
					<div class="custom-servers">
						<div class="servers-header">
							<strong>Пользовательские серверы:</strong>
							<button type="button" id="addServerBtn" class="small-btn">+ Добавить сервер</button>
						</div>
						<div id="customServersList" class="servers-list">
							<div class="server-input-row">
								<input type="text" class="server-ip" placeholder="IP адрес" value="109.248.4.32">
								<input type="text" class="server-port" placeholder="Порт" value="2200">
								<button type="button" class="remove-server-btn small-btn">×</button>
							</div>
						</div>
						<div class="servers-count">Добавлено серверов: <span id="serversCount">1</span>/20</div>
					</div>
				</div>
			</div>
			
			<div class="modal-field">
				<label>
					<input type="checkbox" id="includeServerName" checked>
					Включить название сервера в файл
				</label>
			</div>
			
			<div class="modal-buttons">
				<button id="performServerExport" style="background: #27ae60; color: white;">Экспортировать</button>
				<button id="cancelServerExport" style="background: #7f8c8d; color: white;">Отмена</button>
			</div>
		`;

		const modal = this.createDraggableModal(title, content);

		// Инициализация функционала серверов
		this.initServerExportForm(modal, markersToExport);

		return modal;
	}
	
	// Инициализация формы экспорта на серверы
	initServerExportForm(modal, markersToExport) {
		const serversList = modal.querySelector('#customServersList');
		const addServerBtn = modal.querySelector('#addServerBtn');
		const serversCount = modal.querySelector('#serversCount');
		const presetServers = modal.querySelectorAll('.preset-server');

		// Функция для обновления счетчика серверов
		const updateServersCount = () => {
			const count = serversList.querySelectorAll('.server-input-row').length;
			serversCount.textContent = count;
			addServerBtn.disabled = count >= 20;
		};

		// Функция для добавления строки сервера
		const addServerRow = (ip = '', port = '') => {
			if (serversList.querySelectorAll('.server-input-row').length >= 20) return;

			const row = document.createElement('div');
			row.className = 'server-input-row';
			row.innerHTML = `
				<input type="text" class="server-ip" placeholder="IP адрес" value="${ip}">
				<input type="text" class="server-port" placeholder="Порт" value="${port}">
				<button type="button" class="remove-server-btn small-btn">×</button>
			`;
			
			serversList.appendChild(row);

			// Обработчик удаления
			row.querySelector('.remove-server-btn').addEventListener('click', () => {
				row.remove();
				updateServersCount();
			});

			updateServersCount();
		};

		// Обработчик добавления сервера
		addServerBtn.addEventListener('click', () => {
			addServerRow();
		});

		// Обработчики для предустановленных серверов
		presetServers.forEach(preset => {
			preset.addEventListener('click', () => {
				const ip = preset.dataset.ip;
				const port = preset.dataset.port;
				addServerRow(ip, port);
				
				// Подсветка добавленного сервера
				preset.style.background = '#27ae60';
				setTimeout(() => {
					preset.style.background = '';
				}, 1000);
			});
		});

		// Обработчик экспорта
		modal.querySelector('#performServerExport').addEventListener('click', () => {
			const servers = this.getServersFromForm(modal);
			
			if (servers.length === 0) {
				this.showError('Добавьте хотя бы один сервер');
				return;
			}

			const includeServerName = modal.querySelector('#includeServerName').checked;
			this.performAdvancedServerExport(markersToExport, servers, includeServerName);
			this.closeModal(modal);
		});

		// Обработчик отмены
		modal.querySelector('#cancelServerExport').addEventListener('click', () => {
			this.closeModal(modal);
		});

		updateServersCount();
	}
	
	// Получение списка серверов из формы
	getServersFromForm(modal) {
		const servers = [];
		const rows = modal.querySelectorAll('.server-input-row');
		
		rows.forEach(row => {
			const ip = row.querySelector('.server-ip').value.trim();
			const port = row.querySelector('.server-port').value.trim();
			
			if (ip && port) {
				servers.push({
					ip: ip,
					port: port,
					address: `${ip}:${port}`
				});
			}
		});
		
		return servers;
	}
	
	// Улучшенный метод экспорта на серверы
	performAdvancedServerExport(markersToExport, servers, includeServerName = true) {
		// Получаем данные для экспорта
		const markersData = this.prepareExportData(markersToExport);
		
		if (!markersData || !markersData[0] || !markersData[0].param2) {
			this.showError('Ошибка подготовки данных для экспорта');
			return;
		}

		// Создаем структуру данных для каждого сервера
		const exportData = servers.map(server => ({
			param1: server.address,
			param2: markersData[0].param2
		}));

		// Формируем имя файла
		let filename = '';
		if (this.isFilterActive && this.searchFilter) {
			// Для фильтрованных меток добавляем параметр поиска
			const searchTerm = this.searchFilter.replace(/[^a-zA-Z0-9а-яА-Я]/g, '_').substring(0, 20);
			filename = `FilteredMarkers_${searchTerm}_${this.formatDate()}.json`;
		} else {
			// Для общего экспорта используем стандартное имя
			filename = 'PrivateMarkers.json';
		}
		
		// Скачиваем файл
		this.downloadJSON(exportData, filename);
		
		this.showSuccess(`Экспортировано ${markersToExport.length} меток на ${servers.length} серверов`);
	}
	
	// Метод для поиска ближайших меток
	findNearbyMarkers(centerX, centerY, radius = this.nearbySearchRadius) {
		console.log('=== findNearbyMarkers called ===');
		console.log('centerX:', centerX, 'centerY:', centerY, 'radius:', radius);
		console.log('Всего меток в this.markers:', this.markers.length);
		
		const nearby = this.markers.filter(marker => {
			const dx = marker.gameCoords.x - centerX;
			const dy = marker.gameCoords.y - centerY;
			const distance = Math.sqrt(dx * dx + dy * dy);
			console.log(`Метка "${marker.text}": расстояние ${distance}м`);
			return distance <= radius && distance > 0; // исключаем саму метку (distance = 0)
		}).sort((a, b) => {
			const distA = Math.sqrt(
				Math.pow(a.gameCoords.x - centerX, 2) + 
				Math.pow(a.gameCoords.y - centerY, 2)
			);
			const distB = Math.sqrt(
				Math.pow(b.gameCoords.x - centerX, 2) + 
				Math.pow(b.gameCoords.y - centerY, 2)
			);
			return distA - distB;
		});
		
		console.log('Найдено nearby меток:', nearby.length);
		return nearby;
	}

	// Метод для отрисовки круга радиуса
	drawSearchCircle(centerX, centerY, radius) {
		// Удаляем старый круг если есть
		if (this.nearbyCircle) {
			this.map.removeLayer(this.nearbyCircle);
		}
		
		// Преобразуем игровые координаты в Leaflet
		const centerLatLng = this.gameToLeafletCoords(centerX, centerY);
		
		// Преобразуем радиус из игровых метров в Leaflet метры
		// 1 игровой метр = (32 / 15360) Leaflet единиц
		const radiusInLeafletUnits = radius * (32 / CONFIG.mapPixelWidth);
		
		// Создаем круг с правильными единицами измерения
		this.nearbyCircle = L.circle(centerLatLng, {
			radius: radiusInLeafletUnits,
			color: '#3498db',
			fillColor: '#2980b9',
			fillOpacity: 0.1,
			weight: 2,
			dashArray: '10, 10', // пунктирная линия
			className: 'search-radius-circle'
		}).addTo(this.map);
		
		// Добавляем подпись с радиусом
		if (this.nearbyCircleLabel) {
			this.map.removeLayer(this.nearbyCircleLabel);
		}
		
		this.nearbyCircleLabel = L.marker(centerLatLng, {
			icon: L.divIcon({
				className: 'circle-radius-label',
				html: `<div style="
					background: rgba(52, 152, 219, 0.9);
					color: white;
					padding: 4px 8px;
					border-radius: 4px;
					font-size: 12px;
					font-weight: bold;
					border: 1px solid white;
					white-space: nowrap;
				">Радиус: ${radius}м</div>`,
				iconSize: [100, 20],
				iconAnchor: [50, -30]
			}),
			interactive: false
		}).addTo(this.map);
	}
	
	// Метод для удаления круга поиска
	removeSearchCircle() {
		if (this.nearbyCircle) {
			this.map.removeLayer(this.nearbyCircle);
			this.nearbyCircle = null;
		}
		if (this.nearbyCircleLabel) {
			this.map.removeLayer(this.nearbyCircleLabel);
			this.nearbyCircleLabel = null;
		}
	}

	// Метод для показа модального окна ближайших меток
	showNearbyMarkersModal(centerX, centerY, radius, originalParams) {
		// Закрываем все существующие модальные окна перед созданием нового
		this.closeAllModals();
		console.log('=== showNearbyMarkersModal called ===');
		
		const foundMarkers = this.findNearbyMarkers(centerX, centerY, radius);
		
		console.log('Найдено ближайших меток:', foundMarkers.length);
		
		// Гарантируем, что временный маркер отображается
		if (!this.temporaryAddMarker) {
			const leafletLatLng = this.gameToLeafletCoords(centerX, centerY);
			this.showTemporaryAddMarker(leafletLatLng, { x: centerX, y: centerY });
		}
		
		const content = `
			<div class="modal-field">
				<label>Радиус поиска: <span id="radiusValue">${radius}</span>м</label>
				<div class="radius-control" style="display: flex; align-items: center; gap: 10px; margin-top: 5px;">
					<input type="range" id="radiusSlider" min="50" max="2000" value="${radius}" step="50" style="flex: 1;">
					<button id="updateRadiusBtn" class="small-btn" style="white-space: nowrap;">Применить</button>
				</div>
				<div style="display: flex; justify-content: space-between; font-size: 0.8em; color: #95a5a6; margin-top: 5px;">
					<span>50м</span>
					<span>1000м</span>
					<span>2000м</span>
				</div>
			</div>
			
			<div class="modal-field">
				<label>Найдено меток в радиусе: <strong id="markersCount">${foundMarkers.length}</strong></label>
				<div id="nearbyMarkersList" style="max-height: 300px; overflow-y: auto; margin-top: 10px;">
					${foundMarkers.map((marker, index) => {
						const markerText = marker.text || 'Без названия';
						const markerColor = marker.color || '#3498db';
						const distance = Math.round(this.calculateDistance(centerX, centerY, marker.gameCoords.x, marker.gameCoords.y));
						const coords = `X:${marker.gameCoords.x} Y:${marker.gameCoords.y}`;
						
						const markerId = marker.id.toString();
						
						return `
							<div class="nearby-marker-item" data-index="${index}" style="
								padding: 8px; 
								margin: 4px 0; 
								background: #34495e; 
								border-radius: 4px; 
								border-left: 4px solid ${markerColor};
								cursor: pointer;
								display: flex;
								justify-content: space-between;
								align-items: center;
							">
								<div style="flex: 1;">
									<strong>${markerText}</strong>
									<div style="font-size: 0.8em; color: #95a5a6;">
										Расстояние: ${distance}м
									</div>
									<div style="font-size: 0.8em; color: #bdc3c7;">
										Координаты: ${coords}
									</div>
								</div>
								<button class="edit-nearby-btn" data-marker-id="${markerId}" style="
									background: #f39c12; 
									color: white; 
									border: none; 
									padding: 6px 12px; 
									border-radius: 3px; 
									cursor: pointer;
									margin-left: 10px;
									white-space: nowrap;
								">Редактировать</button>
							</div>
						`;
					}).join('')}
				</div>
			</div>
			
			<div class="modal-buttons">
				<button id="continueWithNewMarker" style="background: #27ae60; color: white;">Продолжить добавление новой метки</button>
				<button id="cancelNearbySearch" style="background: #7f8c8d; color: white;">Отмена</button>
			</div>
		`;

		const modal = this.createDraggableModal('Ближайшие метки', content, () => {
			// Обработчик закрытия для ESC и клика мимо окна
			this.returnToAddMarkerModal();
		});

		// Сохраняем оригинальные параметры и позицию
		this.originalMarkerParams = originalParams;
		this.currentMarkerPosition = { x: centerX, y: centerY };

		// Используем setTimeout чтобы дать время DOM полностью обновиться
		setTimeout(() => {
			try {
				this.initializeRadiusControls(modal, centerX, centerY);
				this.attachNearbyMarkersEventHandlers(modal);
				this.attachNearbyModalCloseHandlers(modal);
			} catch (error) {
				console.error('Error initializing nearby markers modal:', error);
				// В случае ошибки все равно показываем модальное окно
			}
		}, 100); // Увеличиваем задержку для гарантии

		return modal;
	}

	// Метод для расчета расстояния между точками
	calculateDistance(x1, y1, x2, y2) {
		const dx = x2 - x1;
		const dy = y2 - y1;
		return Math.sqrt(dx * dx + dy * dy);
	}

	// Метод для редактирования ближайшей метки
	editNearbyMarker(index, nearbyModal) {
		console.log('=== editNearbyMarker called ===');
		console.log('index:', index);
		console.log('nearbyMarkers length:', this.nearbyMarkers ? this.nearbyMarkers.length : 'undefined');
		console.log('nearbyMarkers content:', this.nearbyMarkers);
		
		// Проверяем, что nearbyMarkers существует и не пустой
		if (!this.nearbyMarkers || this.nearbyMarkers.length === 0) {
			console.error('nearbyMarkers пустой или не определен');
			return;
		}
		
		// Проверяем, что индекс корректен и метка существует
		if (index < 0 || index >= this.nearbyMarkers.length) {
			console.error('Неверный индекс метки:', index, 'при длине массива:', this.nearbyMarkers.length);
			return;
		}
		
		const markerData = this.nearbyMarkers[index];
		
		// Проверяем, что markerData корректен
		if (!markerData || !markerData.id) {
			console.error('Некорректные данные метки:', markerData);
			return;
		}
		
		console.log('Редактирование метки:', markerData);
		
		// Сохраняем ссылку на текущее окно ближайших меток
		const currentNearbyModal = nearbyModal;
		
		// Функция колбэка для возврата
		const returnCallback = () => {
			this.returnToNearbySearch();
		};
		
		// Закрываем модальное окно ближайших меток
		if (currentNearbyModal) {
			this.closeModal(currentNearbyModal);
		}
		
		// Небольшая задержка перед открытием окна редактирования
		setTimeout(() => {
			// Показываем стандартное окно редактирования с колбэком для возврата
			this.showEditModalWithCallback(markerData, returnCallback);
		}, 100);
	}
	
	// Возврат к поиску ближайших меток
	returnToNearbySearch() {
		console.log('=== returnToNearbySearch called ===');
		
		// Очищаем переопределенные обработчики если они есть
		const editModal = document.querySelector('.marker-modal');
		if (editModal && editModal._overriddenHandlers) {
			document.removeEventListener('keydown', editModal._overriddenHandlers.keyHandler);
			delete editModal._overriddenHandlers;
		}

		if (this.originalMarkerParams && this.currentMarkerPosition) {
			// Обновляем список меток (на случай изменений)
			this.nearbyMarkers = this.findNearbyMarkers(
				this.currentMarkerPosition.x, 
				this.currentMarkerPosition.y, 
				this.nearbySearchRadius
			);
			
			// Временный маркер НЕ удаляем - он должен оставаться видимым
			
			try {
				// Показываем окно ближайших меток с сохраненными параметрами
				this.showNearbyMarkersModal(
					this.currentMarkerPosition.x,
					this.currentMarkerPosition.y,
					this.nearbySearchRadius,
					this.originalMarkerParams
				);
			} catch (error) {
				console.error('Error returning to nearby search:', error);
				// В случае ошибки возвращаемся к добавлению метки
				this.returnToAddMarkerModal();
			}
		} else {
			console.warn('No original params or position for return to nearby search');
			this.returnToAddMarkerModal();
		}
	}

	// Возврат к окну добавления новой метки
	returnToAddMarkerModal() {
		console.log('🔄 Полный возврат к добавлению новой метки (с очисткой)');
		
		if (this.originalMarkerParams && this.currentMarkerPosition) {
			const leafletLatLng = this.gameToLeafletCoords(
				this.currentMarkerPosition.x, 
				this.currentMarkerPosition.y
			);
			
			const gameCoords = { 
				x: this.currentMarkerPosition.x, 
				y: this.currentMarkerPosition.y 
			};
			
			// Восстанавливаем оригинальные параметры формы
			this.lastMarkerParams = { ...this.originalMarkerParams };
			
			// Гарантируем, что временный маркер отображается
			if (!this.temporaryAddMarker) {
				this.showTemporaryAddMarker(leafletLatLng, gameCoords);
			}
			
			// Показываем окно добавления метки
			this.showAddMarkerModal(leafletLatLng, gameCoords);
			
			// Полная очистка (используется только при явной отмене)
			this.cleanupNearbySearch();
		} else {
			// Если данных нет, просто отключаем режим метки
			this.disableMarkerMode();
			this.removeTemporaryAddMarker();
		}
	}

	// Отмена поиска ближайших меток
	cancelNearbySearch() {
		this.cleanupNearbySearch();
		this.disableMarkerMode();
	}

	// Очистка данных поиска ближайших меток
	cleanupNearbySearch() {
		console.log('🧹 Полная очистка nearby search (включая временный маркер)');
		this.removeSearchCircle();
		this.removeTemporaryAddMarker(); // Удаляем временный маркер только при полной отмене
		this.originalMarkerParams = null;
		this.currentMarkerPosition = null;
		this.nearbyMarkers = [];
	}
	
	// Метод для обновления списка ближайших меток в реальном времени
	updateNearbyMarkersList(markers, centerX, centerY) {
		const markersList = document.getElementById('nearbyMarkersList');
		const markersCount = document.getElementById('markersCount');
		
		if (!markersList || !markersCount) return;
		
		markersList.innerHTML = markers.map((marker, index) => {
			// Проверяем, что marker и его свойства существуют
			const markerText = marker.text || 'Без названия';
			const markerColor = marker.color || '#3498db';
			const distance = Math.round(this.calculateDistance(centerX, centerY, marker.gameCoords.x, marker.gameCoords.y));
			const coords = `X:${marker.gameCoords.x} Y:${marker.gameCoords.y}`;
			
			// Сохраняем точный ID как строку чтобы избежать потери точности
			const markerId = marker.id.toString();
			
			return `
				<div class="nearby-marker-item" data-index="${index}" style="
					padding: 8px; 
					margin: 4px 0; 
					background: #34495e; 
					border-radius: 4px; 
					border-left: 4px solid ${markerColor};
					cursor: pointer;
					display: flex;
					justify-content: space-between;
					align-items: center;
				">
					<div style="flex: 1;">
						<strong>${markerText}</strong>
						<div style="font-size: 0.8em; color: #95a5a6;">
							Расстояние: ${distance}м
						</div>
						<div style="font-size: 0.8em; color: #bdc3c7;">
							Координаты: ${coords}
						</div>
					</div>
					<button class="edit-nearby-btn" data-marker-id="${markerId}" style="
						background: #f39c12; 
						color: white; 
						border: none; 
						padding: 6px 12px; 
						border-radius: 3px; 
						cursor: pointer;
						margin-left: 10px;
						white-space: nowrap;
					">Редактировать</button>
				</div>
			`;
		}).join('');
		
		// Обновляем счетчик найденных меток
		markersCount.textContent = markers.length;
	}


	// Метод для прикрепления обработчиков событий к элементам списка
	attachNearbyMarkersEventHandlers(modal = null) {
		console.log('=== attachNearbyMarkersEventHandlers called ===');
		
		// Используем делегирование событий для динамических элементов
		const markersList = document.getElementById('nearbyMarkersList');
		if (!markersList) {
			console.error('markersList not found');
			return;
		}

		// Обработчик для кликов по списку (делегирование событий)
		markersList.addEventListener('click', (e) => {
			console.log('Click event on markersList:', e.target);
			
			const editBtn = e.target.closest('.edit-nearby-btn');
			const markerItem = e.target.closest('.nearby-marker-item');
			
			if (editBtn) {
				// Получаем ID как строку чтобы сохранить точность
				const markerId = editBtn.dataset.markerId;
				console.log('Edit button clicked, markerId:', markerId);
				e.stopPropagation();
				this.editNearbyMarkerById(markerId, modal);
			} else if (markerItem && !e.target.closest('button')) {
				const editBtn = markerItem.querySelector('.edit-nearby-btn');
				if (editBtn) {
					const markerId = editBtn.dataset.markerId;
					console.log('Marker item clicked, markerId:', markerId);
					this.editNearbyMarkerById(markerId, modal);
				}
			}
		});
	}
	
	// Метод для инициализации элементов управления радиусом
	initializeRadiusControls(modal, centerX, centerY) {
		const radiusSlider = document.getElementById('radiusSlider');
		const radiusValue = document.getElementById('radiusValue');
		const updateRadiusBtn = document.getElementById('updateRadiusBtn');
		
		if (!radiusSlider || !radiusValue || !updateRadiusBtn) {
			console.error('Radius controls not found');
			return;
		}

		// Сохраняем исходные найденные метки
		const originalNearbyMarkers = [...this.nearbyMarkers];
		
		// Обновление значения радиуса в реальном времени
		radiusSlider.addEventListener('input', () => {
			const newRadius = parseInt(radiusSlider.value);
			radiusValue.textContent = newRadius;
			
			// Автоматически обновляем поиск при изменении ползунка
			this.nearbySearchRadius = newRadius;
			this.drawSearchCircle(centerX, centerY, newRadius);
			
			// Обновляем список меток в реальном времени
			const updatedMarkers = this.findNearbyMarkers(centerX, centerY, newRadius);
			this.updateNearbyMarkersList(updatedMarkers, centerX, centerY);
		});
		
		// Обработчик кнопки применения
		updateRadiusBtn.addEventListener('click', () => {
			const newRadius = parseInt(radiusSlider.value);
			if (newRadius && newRadius > 0) {
				this.nearbySearchRadius = newRadius;
				this.drawSearchCircle(centerX, centerY, newRadius);
				
				// Обновляем список меток, но сохраняем исходные данные для редактирования
				const updatedMarkers = this.findNearbyMarkers(centerX, centerY, newRadius);
				this.updateNearbyMarkersList(updatedMarkers, centerX, centerY);
			}
		});

		// Обработчики основных кнопок с проверками
		const continueBtn = document.getElementById('continueWithNewMarker');
		const cancelBtn = document.getElementById('cancelNearbySearch');
		
		if (continueBtn) {
			continueBtn.addEventListener('click', () => {
				this.closeModal(modal);
				this.returnToAddMarkerModalFromNearby(); // Используем новый метод
			});
		}

		if (cancelBtn) {
			cancelBtn.addEventListener('click', () => {
				this.closeModal(modal);
				this.returnToAddMarkerModalFromNearby(); // Используем новый метод
			});
		}
	}
	
	// Метод для показа модального окна редактирования с колбэком при закрытии
	showEditModalWithCallback(markerData, onCloseCallback) {
		// Закрываем все существующие модальные окна перед созданием нового
		this.closeAllModals();
		// Проверяем, что markerData корректен
		if (!markerData) {
			console.error('Некорректные данные метки для редактирования');
			if (onCloseCallback) onCloseCallback();
			return;
		}

		// Получаем RGB значения из цвета метки
		let r, g, b;
		let markerColor = markerData.color || '#3498db';
		
		if (markerColor.startsWith('rgb')) {
			const rgbMatch = markerColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
			if (rgbMatch) {
				r = rgbMatch[1];
				g = rgbMatch[2];
				b = rgbMatch[3];
			} else {
				r = 52; g = 152; b = 219;
			}
		} else {
			const rgb = this.hexToRgb(markerColor);
			r = rgb.r;
			g = rgb.g;
			b = rgb.b;
		}

		const markerText = markerData.text || 'Метка';
		const markerType = markerData.type || 'default';

		const content = `
			<div class="modal-field">
				<label>Текст метки:</label>
				<input type="text" id="editMarkerText" value="${markerText}">
			</div>
			
			<div class="modal-field">
				<label>Тип метки:</label>
				<select id="editMarkerType">
					${this.getMarkerTypeOptions(markerType)}
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
							<div class="color-preview" id="colorPreview" style="background: ${markerColor};"></div>
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

		const modal = this.createDraggableModal('Редактирование метки', content, () => {
			// При закрытии окна редактирования (ESC, клик мимо) возвращаемся к поиску ближайших
			if (onCloseCallback) onCloseCallback();
		});

		// Создаем цветовую палитру сразу после создания модального окна
		this.createColorPalette('editColorPalette', 'editColorR', 'editColorG', 'editColorB', 'colorPreview');

		const updateColorPreview = () => {
			const r = document.getElementById('editColorR').value;
			const g = document.getElementById('editColorG').value;
			const b = document.getElementById('editColorB').value;
			const color = `rgb(${r}, ${g}, ${b})`;
			const preview = document.getElementById('colorPreview');
			if (preview) {
				preview.style.background = color;
			}
		};

		// Добавляем обработчики событий
		const rInput = document.getElementById('editColorR');
		const gInput = document.getElementById('editColorG');
		const bInput = document.getElementById('editColorB');
		
		if (rInput && gInput && bInput) {
			rInput.addEventListener('input', updateColorPreview);
			gInput.addEventListener('input', updateColorPreview);
			bInput.addEventListener('input', updateColorPreview);
		}

		// Обработчики кнопок
		const saveBtn = document.getElementById('saveEdit');
		const deleteBtn = document.getElementById('deleteMarker');
		const cancelBtn = document.getElementById('cancelEdit');
		
		if (saveBtn) {
			saveBtn.addEventListener('click', () => {
				this.saveMarkerEdit(markerData);
				this.closeModal(modal);
				if (onCloseCallback) onCloseCallback();
			});
		}
		
		if (deleteBtn) {
			deleteBtn.addEventListener('click', () => {
				if (confirm('Вы уверены, что хотите удалить эту метку?')) {
					this.removeMarker(markerData.id);
					this.closeModal(modal);
					if (onCloseCallback) onCloseCallback();
				}
			});
		}
		
		if (cancelBtn) {
			cancelBtn.addEventListener('click', () => {
				this.closeModal(modal);
				if (onCloseCallback) onCloseCallback();
			});
		}

		return modal;
	}
	
	// Метод для редактирования ближайшей метки по ID
	editNearbyMarkerById(markerId, nearbyModal) {
		console.log('=== editNearbyMarkerById called ===');
		
		// Преобразуем ID в число для поиска (если это число)
		const searchId = !isNaN(markerId) ? parseFloat(markerId) : markerId;
		
		// Ищем метку в основном массиве markers по ID
		const markerData = this.markers.find(marker => {
			if (typeof marker.id === 'number' && typeof searchId === 'number') {
				return Math.abs(marker.id - searchId) < 0.001;
			}
			return marker.id.toString() === searchId.toString();
		});
		
		if (!markerData) {
			console.error('Метка не найдена по ID:', searchId);
			return;
		}
		
		console.log('Найдена метка для редактирования:', markerData);
		
		// Сохраняем ссылку на текущее окно ближайших меток
		const currentNearbyModal = nearbyModal;
		
		// Функция колбэка для возврата
		const returnCallback = () => {
			this.returnToNearbySearch();
		};
		
		// Закрываем модальное окно ближайших меток
		if (currentNearbyModal) {
			this.closeModal(currentNearbyModal);
		}
		
		// Показываем стандартное окно редактирования с колбэком для возврата
		this.showEditModalWithCallback(markerData, returnCallback);
	}
	
	// Метод для прикрепления обработчиков закрытия к модальному окну ближайших меток
	attachNearbyModalCloseHandlers(modal) {
		if (!modal) {
			console.error('Modal is null in attachNearbyModalCloseHandlers');
			return;
		}

		// Получаем элементы управления закрытием с проверками
		const closeBtn = modal.querySelector('.modal-close');
		const cancelBtn = modal.querySelector('#cancelNearbySearch');
		const continueBtn = modal.querySelector('#continueWithNewMarker');

		// Функция для возврата к окну добавления метки БЕЗ удаления временного маркера
		const returnToAddMarker = () => {
			console.log('🔙 Возврат из ближайших меток');
			this.returnToAddMarkerModalFromNearby();
		};

		// Обработчики для кнопок закрытия с проверками
		if (closeBtn) {
			closeBtn.addEventListener('click', returnToAddMarker);
		}

		if (cancelBtn) {
			cancelBtn.addEventListener('click', returnToAddMarker);
		}

		if (continueBtn) {
			continueBtn.addEventListener('click', returnToAddMarker);
		}

		// Переопределяем обработчик ESC для этого модального окна
		const keyHandler = (e) => {
			if (e.key === 'Escape') {
				returnToAddMarker();
			}
		};

		// Сохраняем ссылку на обработчик для последующей очистки
		modal._escapeHandler = keyHandler;
		document.addEventListener('keydown', keyHandler);

		// Также переопределяем обработчик клика на оверлей
		const overlay = document.querySelector('.modal-overlay');
		if (overlay) {
			const overlayHandler = (e) => {
				if (e.target === overlay) {
					returnToAddMarker();
				}
			};
			modal._overlayHandler = overlayHandler;
			overlay.addEventListener('click', overlayHandler);
		}
	}

	
	// Метод для показа временного маркера при добавлении
	showTemporaryAddMarker(leafletLatLng, gameCoords) {
		console.log('🟢 ПОКАЗЫВАЕМ временный маркер в координатах:', gameCoords);
		
		// Удаляем предыдущий временный маркер если есть
		this.removeTemporaryAddMarker();
		
		// Создаем красный анимированный маркер
		const temporaryIcon = L.divIcon({
			className: 'temporary-add-marker-indicator',
			html: `
				<div class="pulsating-add-circle">
					<div class="add-inner-circle"></div>
					<div class="add-pulse-ring"></div>
					<div class="add-pulse-ring add-delay-1"></div>
					<div class="add-pulse-ring add-delay-2"></div>
				</div>
				<div class="add-coordinates-label">X:${gameCoords.x} Y:${gameCoords.y}</div>
			`,
			iconSize: [60, 60],
			iconAnchor: [30, 30]
		});
		
		// Создаем маркер
		this.temporaryAddMarker = L.marker(leafletLatLng, {
			icon: temporaryIcon,
			interactive: false
		}).addTo(this.map);
		
		console.log('🟢 Временный маркер создан:', this.temporaryAddMarker);
	}

	// Метод для удаления временного маркера при добавлении
	removeTemporaryAddMarker() {
		if (this.temporaryAddMarker) {
			console.log('🔴 УДАЛЯЕМ временный маркер');
			this.map.removeLayer(this.temporaryAddMarker);
			this.temporaryAddMarker = null;
		} else {
			console.log('🔴 Временный маркер уже удален или не существует');
		}
	}
	
	// Очистка данных поиска ближайших меток без удаления временного маркера
	cleanupNearbySearchButKeepMarker() {
		this.removeSearchCircle();
		// НЕ удаляем временный маркер: this.removeTemporaryAddMarker();
		this.originalMarkerParams = null;
		this.currentMarkerPosition = null;
		this.nearbyMarkers = [];
	}
	
	// Метод для проверки, активно ли окно ближайших меток
	isNearbySearchActive() {
		return !!document.querySelector('.marker-modal .modal-header h3')?.textContent?.includes('Ближайшие метки');
	}
	
	// Вспомогательный метод для безопасного добавления обработчиков событий
	safeAddEventListener(element, event, handler) {
		if (element && typeof element.addEventListener === 'function') {
			element.addEventListener(event, handler);
			return true;
		} else {
			console.warn(`Cannot add event listener to element:`, element);
			return false;
		}
	}
	
	// Возврат к окну добавления новой метки из окна ближайших меток (без удаления временного маркера)
	returnToAddMarkerModalFromNearby() {
		console.log('🔄 Возврат из ближайших меток к добавлению новой метки');
		
		// Закрываем ВСЕ существующие модальные окна перед созданием нового
		this.closeAllModals();
		
		if (this.originalMarkerParams && this.currentMarkerPosition) {
			const leafletLatLng = this.gameToLeafletCoords(
				this.currentMarkerPosition.x, 
				this.currentMarkerPosition.y
			);
			
			const gameCoords = { 
				x: this.currentMarkerPosition.x, 
				y: this.currentMarkerPosition.y 
			};
			
			// Восстанавливаем оригинальные параметры формы
			this.lastMarkerParams = { ...this.originalMarkerParams };
			
			// Гарантируем, что временный маркер отображается
			if (!this.temporaryAddMarker) {
				console.log('🟡 Восстанавливаем временный маркер при возврате из ближайших');
				this.showTemporaryAddMarker(leafletLatLng, gameCoords);
			} else {
				console.log('🟢 Временный маркер уже на месте при возврате из ближайших');
				// Если маркер уже есть, обновляем его позицию на всякий случай
				this.temporaryAddMarker.setLatLng(leafletLatLng);
			}
			
			// Удаляем круг поиска, но НЕ временный маркер
			this.removeSearchCircle();
			
			// Показываем окно добавления метки
			this.showAddMarkerModal(leafletLatLng, gameCoords);
			
			console.log('✅ Возврат к добавлению метки завершен, временный маркер сохранен');
		} else {
			console.warn('❌ Нет данных для возврата к добавлению метки');
			this.disableMarkerMode();
		}
	}
	
	// Метод для закрытия всех модальных окон
	closeAllModals() {
		console.log('🗑️ Закрываем все модальные окна');
		
		// Закрываем все модальные окна
		const allModals = document.querySelectorAll('.marker-modal');
		allModals.forEach(modal => {
			this.closeModal(modal);
		});
		
		// Убираем оверлей
		const overlay = document.querySelector('.modal-overlay');
		if (overlay) {
			overlay.classList.remove('active');
		}
	}
	
	getSearchPrefixes() {
		return {
			TYPE_PREFIX: '@',       // @дом - поиск по типу метки
			EXACT_TYPE_PREFIX: '@@' // @@дом - точное совпадение типа
		};
	}
	
	//проверка типа метки по запросу
	isMarkerTypeSearch(searchTerm) {
		const { TYPE_PREFIX, EXACT_TYPE_PREFIX } = this.getSearchPrefixes();
		const normalizedSearch = searchTerm.toLowerCase().trim();
		
		// Проверяем префиксы
		const isTypeSearch = normalizedSearch.startsWith(TYPE_PREFIX);
		const isExactTypeSearch = normalizedSearch.startsWith(EXACT_TYPE_PREFIX);
		
		if (!isTypeSearch && !isExactTypeSearch) {
			return null; // Не поиск по типу
		}
		
		// Убираем префикс для поиска
		const searchWithoutPrefix = isExactTypeSearch ? 
			normalizedSearch.slice(EXACT_TYPE_PREFIX.length) : 
			normalizedSearch.slice(TYPE_PREFIX.length);
		
		if (!searchWithoutPrefix) {
			return null; // Пустой запрос после префикса
		}
		
		console.log('Поиск по типу:', { 
			original: searchTerm, 
			withoutPrefix: searchWithoutPrefix,
			exact: isExactTypeSearch 
		});
		
		// Ищем подходящий тип метки
		for (const [typeKey, typeData] of Object.entries(MARKER_TYPES)) {
			const typeName = typeData.name.toLowerCase();
			const typeSymbol = typeData.symbol.toLowerCase();
			const typeKeyLower = typeKey.toLowerCase();
			
			let match = false;
			
			if (isExactTypeSearch) {
				// Точное совпадение для @@ префикса
				match = typeName === searchWithoutPrefix || 
					   typeSymbol === searchWithoutPrefix ||
					   typeKeyLower === searchWithoutPrefix;
			} else {
				// Частичное совпадение для @ префикса
				match = typeName.includes(searchWithoutPrefix) || 
					   typeSymbol.includes(searchWithoutPrefix) ||
					   typeKeyLower.includes(searchWithoutPrefix);
			}
			
			if (match) {
				console.log('Найден тип:', typeKey);
				return typeKey;
			}
		}
		
		console.log('Тип не найден для запроса:', searchWithoutPrefix);
		return null;
	}
	
	//метод для парсинга сложных поисковых запросов
	parseComplexSearch(query) {
		const { TYPE_PREFIX, EXACT_TYPE_PREFIX } = this.getSearchPrefixes();
		
		// Если запрос содержит оператор ИЛИ, разбиваем на части
		if (query.includes('|')) {
			const parts = query.split('|').map(part => part.trim()).filter(part => part.length > 0);
			const parsedParts = [];
			
			for (let part of parts) {
				if (part.startsWith(EXACT_TYPE_PREFIX)) {
					// Точный поиск по типу @@тип
					const typeQuery = part.slice(EXACT_TYPE_PREFIX.length);
					const detectedType = this.findExactMarkerType(typeQuery);
					parsedParts.push({ type: 'exact-type', value: detectedType, original: part });
				} else if (part.startsWith(TYPE_PREFIX)) {
					// Поиск по типу @тип
					const typeQuery = part.slice(TYPE_PREFIX.length);
					const detectedType = this.findPartialMarkerType(typeQuery);
					parsedParts.push({ type: 'type', value: detectedType, original: part });
				} else if (part.startsWith('"') && part.endsWith('"')) {
					// Точная текстовая фраза
					const textQuery = part.slice(1, -1);
					parsedParts.push({ type: 'exact-text', value: textQuery, original: part });
				} else {
					// Обычный текстовый поиск
					parsedParts.push({ type: 'text', value: part, original: part });
				}
			}
			
			return { type: 'or', parts: parsedParts };
		}
		
		// Одиночный запрос
		if (query.startsWith(EXACT_TYPE_PREFIX)) {
			const typeQuery = query.slice(EXACT_TYPE_PREFIX.length);
			const detectedType = this.findExactMarkerType(typeQuery);
			return { type: 'exact-type', value: detectedType, original: query };
		} else if (query.startsWith(TYPE_PREFIX)) {
			const typeQuery = query.slice(TYPE_PREFIX.length);
			const detectedType = this.findPartialMarkerType(typeQuery);
			return { type: 'type', value: detectedType, original: query };
		} else if (query.startsWith('"') && query.endsWith('"')) {
			const textQuery = query.slice(1, -1);
			return { type: 'exact-text', value: textQuery, original: query };
		} else {
			return { type: 'text', value: query, original: query };
		}
	}
	
	// Вспомогательные методы для поиска типов
	findExactMarkerType(query) {
		const normalizedQuery = query.toLowerCase().trim();
		
		for (const [typeKey, typeData] of Object.entries(MARKER_TYPES)) {
			const typeName = typeData.name.toLowerCase();
			const typeSymbol = typeData.symbol.toLowerCase();
			const typeKeyLower = typeKey.toLowerCase();
			
			if (typeName === normalizedQuery || 
				typeSymbol === normalizedQuery ||
				typeKeyLower === normalizedQuery) {
				return typeKey;
			}
		}
		return null;
	}

	findPartialMarkerType(query) {
		const normalizedQuery = query.toLowerCase().trim();
		
		for (const [typeKey, typeData] of Object.entries(MARKER_TYPES)) {
			const typeName = typeData.name.toLowerCase();
			const typeSymbol = typeData.symbol.toLowerCase();
			const typeKeyLower = typeKey.toLowerCase();
			
			if (typeName.includes(normalizedQuery) || 
				typeSymbol.includes(normalizedQuery) ||
				typeKeyLower.includes(normalizedQuery)) {
				return typeKey;
			}
		}
		return null;
	}
	
	// Метод для проверки сложного запроса
	checkComplexQuery(marker, parsedQuery) {
		if (parsedQuery.type === 'or') {
			// Оператор ИЛИ - достаточно одного совпадения
			for (const part of parsedQuery.parts) {
				if (this.checkQueryPart(marker, part)) {
					return true;
				}
			}
			return false;
		} else {
			// Одиночный запрос
			return this.checkQueryPart(marker, parsedQuery);
		}
	}
	
	// Метод для проверки отдельной части запроса
	checkQueryPart(marker, queryPart) {
		switch (queryPart.type) {
			case 'exact-type':
				// Точное совпадение типа @@тип
				return queryPart.value && marker.type === queryPart.value;
				
			case 'type':
				// Частичное совпадение типа @тип
				return queryPart.value && marker.type === queryPart.value;
				
			case 'exact-text':
				// Точное совпадение текста
				return marker.text && marker.text.toLowerCase() === queryPart.value.toLowerCase();
				
			case 'text':
				// Частичное совпадение текста
				return marker.text && marker.text.toLowerCase().includes(queryPart.value.toLowerCase());
				
			default:
				return false;
		}
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