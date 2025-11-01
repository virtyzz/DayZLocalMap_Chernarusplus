// Конфигурация карты
const CONFIG = {
    tileSize: 480,
    minZoom: 5,
    maxZoom: 12,
    initialZoom: 5,
    maxTilesX: 31,
    maxTilesY: 31,
    mapPixelWidth: 15360,
    mapPixelHeight: 15360
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
        
        // Проверяем существование элемента карты
        if (!document.getElementById('map')) {
            console.error('Element #map not found');
            this.showError('Элемент карты не найден на странице');
            return;
        }

        this.map = L.map('map', {
            crs: L.CRS.Simple,
            minZoom: CONFIG.minZoom,
            maxZoom: CONFIG.maxZoom,
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
        this.loadTiles();
    }

    formatTileNumber(num) {
        return num.toString().padStart(3, '0');
    }

    formatGridCoordinate(num) {
        return Math.round(num / 100).toString().padStart(3, '0');
    }

    getTileFileName(x, y) {
        const formattedX = this.formatTileNumber(x);
        const formattedY = this.formatTileNumber(y);
        return `S_${formattedX}_${formattedY}_lco.png`;
    }

    tileToLeafletBounds(tileX, tileY) {
        const left = tileX;
        const right = tileX + 1;
        const top = 31 - tileY;
        const bottom = top + 1;
        
        return new L.LatLngBounds(
            [bottom, left],
            [top, right]
        );
    }

    async loadTiles() {
        console.log('=== НАЧАЛО ЗАГРУЗКИ ТАЙЛОВ ===');
        
        const tilePromises = [];
        
        for (let x = 0; x <= CONFIG.maxTilesX; x++) {
            for (let y = 0; y <= CONFIG.maxTilesY; y++) {
                const tileFileName = this.getTileFileName(x, y);
                const tileUrl = `tiles_cropped/${tileFileName}`;
                const bounds = this.tileToLeafletBounds(x, y);
                
                tilePromises.push(
                    this.loadTileImage(tileUrl, bounds, x, y)
                        .then(() => {
                            console.log(`✅ Тайл загружен: ${tileFileName}`);
                            return { success: true, tile: tileFileName };
                        })
                        .catch((error) => {
                            console.error(`❌ Ошибка загрузки: ${tileFileName}`, error.message);
                            return { success: false, tile: tileFileName, error: error.message };
                        })
                );
            }
        }

        try {
            const results = await Promise.allSettled(tilePromises);
            this.processTileLoadResults(results);
        } catch (error) {
            console.error('Ошибка при загрузке тайлов:', error);
            this.showError('Критическая ошибка при загрузке карты');
        }
    }

    loadTileImage(url, bounds, x, y) {
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
            
            // Увеличиваем таймаут для медленных соединений
            timeoutId = setTimeout(() => {
                if (!testImg.complete) {
                    reject(new Error('Таймаут загрузки'));
                }
            }, 10000); // 10 секунд
        });
    }

    processTileLoadResults(results) {
        const loaded = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const errors = results.length - loaded;
        const total = results.length;
        
        console.log(`=== ИТОГ ЗАГРУЗКИ: ${loaded} успешно, ${errors} ошибок ===`);
        
        if (loaded === 0) {
            this.showError('Не загружено ни одного тайла! Проверьте папку tiles_cropped');
        } else {
            console.log('Карта успешно загружена!');
            this.loadMarkers();
            this.addGrid();
            
            if (errors > 0) {
                this.showSuccess(`Загружено ${loaded} тайлов, ${errors} ошибок`);
            } else {
                this.showSuccess(`Все ${loaded} тайлов успешно загружены!`);
            }
        }
    }

    leafletToGameCoords(leafletLatLng) {
        const gameX = (leafletLatLng.lng / 32) * 15360;
        // Исправление: инвертируем Y координату
        const gameY = 15360 - (leafletLatLng.lat / 32) * 15360;
        
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
        }, 10000);
        
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

            this.map.on('zoomend', () => {
                if (this.gridEnabled) {
                    this.updateGrid();
                }
            });

            this.map.on('moveend', () => {
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

        } catch (error) {
            console.error('Ошибка при привязке событий:', error);
        }
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
        this.removeGrid();
        if (!this.gridEnabled) return;

        this.gridLayer = L.layerGroup().addTo(this.map);
        this.axisLayer = L.layerGroup().addTo(this.map);

        this.drawGrid();
        this.updateAxes();
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
        
        const visibleSouthWest = this.leafletToGameCoords(bounds.getSouthWest());
        const visibleNorthEast = this.leafletToGameCoords(bounds.getNorthEast());

        const minX = Math.floor(visibleSouthWest.x / gridSize) * gridSize;
        const maxX = Math.ceil(visibleNorthEast.x / gridSize) * gridSize;
        const minY = Math.floor(visibleSouthWest.y / gridSize) * gridSize;
        const maxY = Math.ceil(visibleNorthEast.y / gridSize) * gridSize;

        for (let x = minX; x <= maxX; x += gridSize) { 
            if (x >= 0 && x <= CONFIG.mapPixelWidth) { 
                const leafletX = (x / CONFIG.mapPixelWidth) * 32; 
                const label = L.marker([31.9, leafletX], { 
                    icon: L.divIcon({ 
                        className: 'axis-label', 
                        html: `<div style="color: white; background: rgba(0,0,0,0.7); padding: 2px 4px; border-radius: 2px; font-size: 11px; font-weight: bold;">${this.formatGridCoordinate(x)}</div>`,
                        iconSize: [40, 20],
                        iconAnchor: [20, 10]
                    }),
                    interactive: false
                }).addTo(this.axisLayer);
            }
        }

        for (let y = minY; y <= maxY; y += gridSize) { 
            if (y >= 0 && y <= CONFIG.mapPixelHeight) { 
                const leafletY = (y / CONFIG.mapPixelHeight) * 32; 
                const label = L.marker([leafletY, 31.9], { 
                    icon: L.divIcon({ 
                        className: 'axis-label', 
                        html: `<div style="color: white; background: rgba(0,0,0,0.7); padding: 2px 4px; border-radius: 2px; font-size: 11px; font-weight: bold;">${this.formatGridCoordinate(y)}</div>`,
                        iconSize: [40, 20],
                        iconAnchor: [20, 10]
                    }),
                    interactive: false
                }).addTo(this.axisLayer);
            }
        }
    }

    drawGrid() {
        const gridSize = this.getGridSize();
        const stepsX = Math.ceil(CONFIG.mapPixelWidth / gridSize);
        const stepsY = Math.ceil(CONFIG.mapPixelHeight / gridSize);

        const zoom = this.map.getZoom();
        const opacity = zoom >= 8 ? 0.3 : 0.2;

        for (let x = 0; x <= stepsX; x++) { 
            const pixelX = x * gridSize; 
            const leafletX = (pixelX / CONFIG.mapPixelWidth) * 32; 
            L.polyline([ [0, leafletX], [32, leafletX] ], { 
                color: 'rgba(255, 255, 255, 0.3)', 
                weight: 1, 
                opacity: opacity, 
                interactive: false 
            }).addTo(this.gridLayer); 
        } 
        
        for (let y = 0; y <= stepsY; y++) { 
            const pixelY = y * gridSize; 
            const leafletY = (pixelY / CONFIG.mapPixelHeight) * 32; 
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
        const modal = document.createElement('div');
        modal.className = 'marker-modal';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #2d2d2d;
            padding: 20px;
            border-radius: 8px;
            z-index: 10000;
            color: white;
            min-width: 300px;
            border: 2px solid #444;
            max-height: 80vh;
            overflow-y: auto;
        `;

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

        modal.innerHTML = `
            <h3>Добавление новой метки</h3>
            <div style="margin-bottom: 15px;">
                <label>Текст метки:</label>
                <input type="text" id="newMarkerText" value="${this.lastMarkerParams.text}" style="width: 100%; padding: 5px; margin-top: 5px; background: #444; color: white; border: 1px solid #666;">
            </div>
            <div style="margin-bottom: 15px;">
                <label>Тип метки:</label>
                <select id="newMarkerType" style="width: 100%; padding: 5px; margin-top: 5px; background: #444; color: white; border: 1px solid #666;">
                    ${this.getMarkerTypeOptions(this.lastMarkerParams.type)}
                </select>
            </div>
            <div style="margin-bottom: 15px;">
                <label>Цвет метки (RGB):</label>
                <div style="display: flex; gap: 5px; margin-top: 5px; align-items: center;">
                    <input type="number" id="newColorR" min="0" max="255" value="${r}" placeholder="R" style="width: 60px; padding: 5px; background: #444; color: white; border: 1px solid #666;">
                    <input type="number" id="newColorG" min="0" max="255" value="${g}" placeholder="G" style="width: 60px; padding: 5px; background: #444; color: white; border: 1px solid #666;">
                    <input type="number" id="newColorB" min="0" max="255" value="${b}" placeholder="B" style="width: 60px; padding: 5px; background: #444; color: white; border: 1px solid #666;">
                    <div style="width: 30px; height: 30px; background: ${this.lastMarkerParams.color}; border: 1px solid white;" id="newColorPreview"/>
                </div>
            </div>
            <div style="margin-bottom: 15px; padding: 10px; background: #34495e; border-radius: 4px;">
                <strong>Координаты:</strong>
                <br>
                X: ${gameCoords.x}<br>
                Y: ${gameCoords.y}
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 20px;">
                <button id="saveNewMarker" style="padding: 8px 15px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer;">Добавить</button>
                <button id="cancelNewMarker" style="padding: 8px 15px; background: #7f8c8d; color: white; border: none; border-radius: 4px; cursor: pointer;">Отмена</button>
            </div>
        `;

        document.body.appendChild(modal);

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

        // Создаем обработчики с правильным управлением памятью
        const saveHandler = () => {
            this.saveNewMarker(leafletLatLng, gameCoords);
            this.closeModal(modal);
        };

        const cancelHandler = () => {
            this.closeModal(modal);
            this.disableMarkerMode();
        };

        const keyHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeModal(modal);
                this.disableMarkerMode();
            }
        };

        document.getElementById('saveNewMarker').addEventListener('click', saveHandler);
        document.getElementById('cancelNewMarker').addEventListener('click', cancelHandler);
        document.addEventListener('keydown', keyHandler);

        // Сохраняем обработчики для последующей очистки
        this.modalCloseHandlers.set(modal, {
            saveHandler,
            cancelHandler,
            keyHandler
        });
    }

    closeModal(modal) {
        const handlers = this.modalCloseHandlers.get(modal);
        if (handlers) {
            document.removeEventListener('keydown', handlers.keyHandler);
            this.modalCloseHandlers.delete(modal);
        }
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
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
                    Координаты: X:${gameCoords.x} Y:${gameCoords.y}
                </div>
            `);

        const textLabel = L.marker(leafletLatLng, {
            icon: this.createTextLabel(markerText, markerColor, opacity),
            interactive: false
        }).addTo(this.map);

        // Для новых меток создаем базовый набор оригинальных данных
        const originalData = {
            type: 5,
            uid: Date.now(),
            name: markerText,
            icon: this.getIconPathFromType(markerType),
            position: [gameCoords.x, 0, gameCoords.y], // Z = 0 для новых меток
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
            circleLayer: 0,
            showAllPlayerNametags: 0
        };

        const markerData = {
            id: Date.now(),
            leafletLatLng: { lat: leafletLatLng.lat, lng: leafletLatLng.lng },
            gameCoords: { ...gameCoords, z: 0 }, // Сохраняем Z координату
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
                    background-color: ${color};
                    width: 32px;
                    height: 32px;
                    border-radius: ${this.getMarkerShape(type)};
                    border: 3px solid white;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    color: white;
                    font-weight: bold;
                    opacity: ${opacity};
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
                font-size: 12px; 
                white-space: nowrap;
                margin-left: 20px;
                font-weight: bold;
                opacity: ${opacity};
            ">${text}</div>`,
            iconSize: [100, 20],
            iconAnchor: [0, 10]
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
        const modal = document.createElement('div');
        modal.className = 'marker-modal';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #2d2d2d;
            padding: 20px;
            border-radius: 8px;
            z-index: 10000;
            color: white;
            min-width: 300px;
            border: 2px solid #444;
        `;

        // Получаем RGB значения из цвета метки
        let r, g, b;
        if (markerData.color.startsWith('rgb')) {
            // Если цвет в формате RGB
            const rgbMatch = markerData.color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (rgbMatch) {
                r = rgbMatch[1];
                g = rgbMatch[2];
                b = rgbMatch[3];
            } else {
                r = 52; g = 152; b = 219; // значения по умолчанию
            }
        } else {
            // Если цвет в формате HEX
            const rgb = this.hexToRgb(markerData.color);
            r = rgb.r;
            g = rgb.g;
            b = rgb.b;
        }

        modal.innerHTML = `
            <h3>Редактирование метки</h3>
            <div style="margin-bottom: 15px;">
                <label>Текст метки:</label>
                <input type="text" id="editMarkerText" value="${markerData.text}" style="width: 100%; padding: 5px; margin-top: 5px; background: #444; color: white; border: 1px solid #666;">
            </div>
            <div style="margin-bottom: 15px;">
                <label>Тип метки:</label>
                <select id="editMarkerType" style="width: 100%; padding: 5px; margin-top: 5px; background: #444; color: white; border: 1px solid #666;">
                    ${this.getMarkerTypeOptions(markerData.type)}
                </select>
            </div>
            <div style="margin-bottom: 15px;">
                <label>Цвет метки (RGB):</label>
                <div style="display: flex; gap: 5px; margin-top: 5px;">
                    <input type="number" id="editColorR" min="0" max="255" value="${r}" placeholder="R" style="width: 60px; padding: 5px; background: #444; color: white; border: 1px solid #666;">
                    <input type="number" id="editColorG" min="0" max="255" value="${g}" placeholder="G" style="width: 60px; padding: 5px; background: #444; color: white; border: 1px solid #666;">
                    <input type="number" id="editColorB" min="0" max="255" value="${b}" placeholder="B" style="width: 60px; padding: 5px; background: #444; color: white; border: 1px solid #666;">
                    <div style="width: 30px; height: 30px; background: ${markerData.color}; border: 1px solid white;" id="colorPreview"/>
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 20px;">
                <button id="saveEdit" style="padding: 8px 15px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer;">Сохранить</button>
                <button id="deleteMarker" style="padding: 8px 15px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">Удалить</button>
                <button id="cancelEdit" style="padding: 8px 15px; background: #7f8c8d; color: white; border: none; border-radius: 4px; cursor: pointer;">Отмена</button>
            </div>
        `;

        document.body.appendChild(modal);

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

        // Создаем обработчики с правильным управлением памятью
        const saveHandler = () => {
            this.saveMarkerEdit(markerData);
            this.closeModal(modal);
        };

        const deleteHandler = () => {
            if (confirm('Вы уверены, что хотите удалить эту метку?')) {
                this.removeMarker(markerData.id);
                this.closeModal(modal);
            }
        };

        const cancelHandler = () => {
            this.closeModal(modal);
        };

        const keyHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeModal(modal);
            }
        };

        document.getElementById('saveEdit').addEventListener('click', saveHandler);
        document.getElementById('deleteMarker').addEventListener('click', deleteHandler);
        document.getElementById('cancelEdit').addEventListener('click', cancelHandler);
        document.addEventListener('keydown', keyHandler);

        // Сохраняем обработчики для последующей очистки
        this.modalCloseHandlers.set(modal, {
            saveHandler,
            deleteHandler,
            cancelHandler,
            keyHandler
        });
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

        // Обновляем оригинальные данные если они есть
        if (markerData.originalData) {
            markerData.originalData.name = newText;
            markerData.originalData.icon = this.getIconPathFromType(newType);
            markerData.originalData.colorR = parseInt(r);
            markerData.originalData.colorG = parseInt(g);
            markerData.originalData.colorB = parseInt(b);
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
        const markersToShow = this.searchFilter ? this.filteredMarkers : this.markers;
        
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
                
                // Добавляем обработчик клика для центрирования на метке
                item.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('delete')) {
                        this.map.setView(markerData.leafletLatLng, this.map.getZoom());
                        markerData.marker.openPopup();
                    }
                });
                
                container.appendChild(item);
            });
        }

        // Обновляем счетчик и состояние кнопок
        this.updateMarkersCounter();
        this.updateSearchButtons();
    }

    // Метод для обновления состояния кнопок
    updateSearchButtons() {
        const searchBtn = document.getElementById('searchBtn');
        const showAllBtn = document.getElementById('showAllBtn');
        const hideOthersBtn = document.getElementById('hideOthersBtn');

        if (!searchBtn || !showAllBtn || !hideOthersBtn) return;

        if (this.isFilterActive && this.searchFilter) {
            searchBtn.textContent = 'Отменить';
            searchBtn.style.background = '#e74c3c';
            showAllBtn.style.display = 'inline-block';
            hideOthersBtn.disabled = this.filteredMarkers.length === 0;
            
            if (this.filteredMarkers.length === 0) {
                hideOthersBtn.title = 'Нет найденных меток для отображения';
            } else {
                hideOthersBtn.title = '';
            }
        } else {
            searchBtn.textContent = 'Поиск';
            searchBtn.style.background = '#3498db';
            showAllBtn.style.display = 'none';
            hideOthersBtn.disabled = true;
            hideOthersBtn.title = 'Сначала выполните поиск';
        }
        
        // Обновляем состояние кнопки "Скрыть остальные" в зависимости от наличия результатов
        hideOthersBtn.disabled = !this.isFilterActive || this.filteredMarkers.length === 0;
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
                
                // Загружаем настройки
                if (data.settings) {
                    this.globalMarkerOpacity = data.settings.globalOpacity || 0.8;
                    
                    // Загружаем последние параметры если есть
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
                
                // Загружаем метки
                if (data.markers) {
                    data.markers.forEach(markerData => {
                        const leafletLatLng = L.latLng(
                            markerData.leafletLatLng.lat, 
                            markerData.leafletLatLng.lng
                        );
                        
                        const color = markerData.color || this.getMarkerColor(markerData.type);
                        // Используем глобальную прозрачность при загрузке
                        const icon = this.createMarkerIcon(markerData.type, color, this.globalMarkerOpacity);

                        const marker = L.marker(leafletLatLng, { icon: icon })
                            .addTo(this.map)
                            .bindPopup(`
                                <div class="marker-popup">
                                    <strong>${markerData.text}</strong><br>
                                    Тип: ${this.getMarkerTypeName(markerData.type)}<br>
                                    Координаты: X:${markerData.gameCoords.x} Y:${markerData.gameCoords.y}${markerData.gameCoords.z ? ` Z:${markerData.gameCoords.z}` : ''}
                                </div>
                            `);

                        const textLabel = L.marker(leafletLatLng, {
                            icon: this.createTextLabel(markerData.text, color, this.globalMarkerOpacity),
                            interactive: false
                        }).addTo(this.map);

                        marker.on('dblclick', () => {
                            this.editMarker({
                                ...markerData,
                                marker: marker,
                                textLabel: textLabel
                            });
                        });

                        this.markers.push({
                            ...markerData,
                            leafletLatLng: leafletLatLng,
                            color: color,
                            marker: marker,
                            textLabel: textLabel
                        });
                    });
                    this.updateMarkersList();
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
                                gameCoords: gameCoords,
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
        
        if (!this.searchFilter) {
            this.clearSearch();
            return;
        }

        this.filteredMarkers = this.markers.filter(marker => 
            marker.text.toLowerCase().includes(this.searchFilter)
        );

        this.isFilterActive = true;
        this.updateMarkersList();
        this.showSearchResults();
        
        // Показываем уведомление о количестве найденных меток
        if (this.filteredMarkers.length > 0) {
            this.showSuccess(`Найдено ${this.filteredMarkers.length} меток`);
        } else {
            this.showError('Метки не найдены');
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
        
        // Показываем все метки на карте
        this.markers.forEach(markerData => {
            markerData.marker.addTo(this.map);
            if (markerData.textLabel) {
                markerData.textLabel.addTo(this.map);
            }
        });
        
        this.updateMarkersList();
        const searchInput = document.getElementById('searchMarkers');
        if (searchInput) {
            searchInput.value = '';
        }
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
    }

    // Подготовка данных для экспорта в совместимом формате
    prepareExportData() {
        const servers = [{
            param1: "ip:port", // Пустой param1 как в оригинальном файле
            param2: this.markers.map(marker => {
                // Если есть оригинальные данные, используем их КАК ЕСТЬ
                if (marker.originalData) {
                    // Обновляем только изменяемые поля
                    const updatedData = { ...marker.originalData };
                    updatedData.name = marker.text;
                    updatedData.icon = this.getIconPathFromType(marker.type);
                    
                    // Обновляем координаты
                    updatedData.position = [
                        marker.gameCoords.x,
                        marker.originalData.position ? marker.originalData.position[1] : 0, // Сохраняем оригинальную Z координату
                        marker.gameCoords.y
                    ];
                    
                    // Обновляем цвет если он изменился
                    const colorComponents = this.parseColorToComponents(marker.color);
                    updatedData.colorR = colorComponents.r;
                    updatedData.colorG = colorComponents.g;
                    updatedData.colorB = colorComponents.b;
                    
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
                
                // Создаем объект с базовыми параметрами
                return {
                    type: 5,
                    uid: marker.id,
                    name: marker.text,
                    icon: iconPath,
                    position: [x, z, y], // [x, z, y] - формат DayZ
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
                    circleLayer: 0,
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
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен, создаем карту...');
    window.dayzMap = new DayZMap();
});