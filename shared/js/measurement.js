/**
 * Менеджер измерения расстояний на карте DayZ
 * Инструмент "линейка" для измерения расстояний между точками
 */
class DistanceMeasurement {
    constructor(dayzMapInstance) {
        this.dayzMap = dayzMapInstance;
        this.map = dayzMapInstance.map;

        // Состояние измерения
        this.isMeasuring = false;
        this.measurementPoints = []; // Массив точек измерения (LatLng)
        this.measurementMarkers = []; // Массив маркеров точек
        this.measurementLines = []; // Массив линий между точками
        this.segmentLabels = []; // Массив меток расстояний сегментов
        this.pointLabels = []; // Массив меток накопленного расстояния точек
        this.tempLine = null; // Временная линия до курсора

        // Элементы UI
        this.distanceDisplay = null;
        this.controlContainer = null;

        this.init();
    }

    init() {
        this.setupUI();
        this.setupEventListeners();
        this.initMeasurementControl();
    }

    // ========================================
    // UI элементы
    // ========================================

    setupUI() {
        // Создаем элемент отображения расстояния
        this.distanceDisplay = document.createElement('div');
        this.distanceDisplay.className = 'measurement-distance-display hidden';
        this.distanceDisplay.innerHTML = `
            <div class="measurement-distance-item">
                <span class="measurement-label">Последний сегмент:</span>
                <span class="measurement-value" id="lastSegmentDistance">0 м</span>
            </div>
            <div class="measurement-distance-item">
                <span class="measurement-label">Общее расстояние:</span>
                <span class="measurement-value" id="totalDistance">0 м</span>
            </div>
            <div class="measurement-hint">
                <kbd>Enter</kbd> завершить &nbsp; <kbd>Esc</kbd> отмена
            </div>
        `;
        document.body.appendChild(this.distanceDisplay);
    }

    setupEventListeners() {
        // Глобальные обработчики клавиш
        document.addEventListener('keydown', (e) => {
            if (!this.isMeasuring) return;

            if (e.key === 'Enter') {
                e.preventDefault();
                this.finishMeasurement();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.cancelMeasurement();
            }
        });
    }

    // ========================================
    // Control на карте
    // ========================================

    initMeasurementControl() {
        // Используем контрол созданный в script.js
        const container = this.dayzMap.measurementControl?.getContainer();
        if (!container) {
            console.error('Measurement control container not found');
            return;
        }

        this.controlContainer = container;

        const toggleBtn = container.querySelector('.measurement-toggle-btn');
        const panel = container.querySelector('.measurement-map-panel');

        if (!toggleBtn || !panel) return;

        // Переключение панели
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = panel.style.display === 'block';

            if (isVisible) {
                // Если измерение активно - отменяем
                if (this.isMeasuring) {
                    this.cancelMeasurement();
                }
                panel.style.display = 'none';
                toggleBtn.classList.remove('active');
            } else {
                // Закрываем другие меню
                this.closeAllMenus();
                panel.style.display = 'block';
                toggleBtn.classList.add('active');
            }
        });

        // Закрытие по клику вне
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                panel.style.display = 'none';
                toggleBtn.classList.remove('active');
            }
        });

        // Кнопка начала измерения
        const startBtn = container.querySelector('.measurement-start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                this.startMeasurement();
                panel.style.display = 'none';
                toggleBtn.classList.remove('active');
            });
        }
        
        // Кнопка очистки измерений
        const clearBtn = container.querySelector('.measurement-clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearAllMeasurements();
                panel.style.display = 'none';
                toggleBtn.classList.remove('active');
            });
        }
    }

    closeAllMenus() {
        document.getElementById('toolsDropdownMenu')?.classList.remove('show');
        document.getElementById('toolsDropdownBtn')?.classList.remove('active');
        
        const drawPanel = document.querySelector('.draw-map-panel');
        const drawBtn = document.querySelector('.draw-toggle-btn');
        if (drawPanel) drawPanel.style.display = 'none';
        if (drawBtn) drawBtn.classList.remove('active');
    }

    // ========================================
    // Измерение расстояний
    // ========================================

    startMeasurement() {
        if (this.isMeasuring) return;

        this.isMeasuring = true;
        this.measurementPoints = [];
        this.measurementMarkers = [];
        this.measurementLines = [];
        this.tempLine = null;

        // Показываем отображение расстояния
        this.distanceDisplay.classList.remove('hidden');
        this.updateDistanceDisplay(0, 0);

        // Добавляем обработчик клика по карте
        this.map.on('click', this.onMapClick, this);
        this.map.on('mousemove', this.onMouseMove, this);

        // Меняем курсор
        this.map.getContainer().style.cursor = 'crosshair';

        this.dayzMap.showHint('Кликните по карте для начала измерения');
    }

    onMapClick(e) {
        if (!this.isMeasuring) return;

        // Останавливаем всплытие чтобы избежать конфликтов с другими инструментами
        L.DomEvent.stopPropagation(e);

        const latlng = e.latlng;

        // Добавляем точку
        this.measurementPoints.push(latlng);

        // Создаем маркер точки
        const marker = L.circleMarker(latlng, {
            radius: 6,
            fillColor: '#e74c3c',
            color: '#c0392b',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(this.map);

        this.measurementMarkers.push(marker);

        // Создаем метку накопленного расстояния для этой точки
        const totalDistance = this.calculateTotalDistance();
        this.createPointLabel(latlng, totalDistance);

        // Если это не первая точка, создаем линию от предыдущей
        if (this.measurementPoints.length > 1) {
            const lastIndex = this.measurementPoints.length - 2;
            const line = L.polyline([
                this.measurementPoints[lastIndex],
                latlng
            ], {
                color: '#e74c3c',
                weight: 3,
                opacity: 0.8,
                dashArray: '5, 10'
            }).addTo(this.map);

            this.measurementLines.push(line);

            // Считаем расстояние последнего сегмента
            const lastSegmentDistance = this.calculateDistance(
                this.measurementPoints[lastIndex],
                latlng
            );

            // Создаем метку расстояния для этого сегмента
            this.createSegmentLabel(
                this.measurementPoints[lastIndex],
                latlng,
                lastSegmentDistance
            );

            // Обновляем общее расстояние
            const totalDistance = this.calculateTotalDistance();

            this.updateDistanceDisplay(lastSegmentDistance, totalDistance);
        }

        this.dayzMap.showHint(`Точек: ${this.measurementPoints.length}. Кликните для добавления следующей точки, Enter для завершения`);
    }

    onMouseMove(e) {
        if (!this.isMeasuring || this.measurementPoints.length === 0) return;

        // Останавливаем всплытие чтобы избежать конфликтов с другими инструментами
        L.DomEvent.stopPropagation(e);

        const latlng = e.latlng;
        const lastPoint = this.measurementPoints[this.measurementPoints.length - 1];

        // Удаляем временную линию если есть
        if (this.tempLine) {
            this.map.removeLayer(this.tempLine);
        }

        // Создаем новую временную линию
        this.tempLine = L.polyline([lastPoint, latlng], {
            color: '#e74c3c',
            weight: 2,
            opacity: 0.5,
            dashArray: '5, 10'
        }).addTo(this.map);

        // Считаем расстояние до курсора
        const distanceToCursor = this.calculateDistance(lastPoint, latlng);
        const totalDistance = this.calculateTotalDistance() + distanceToCursor;

        this.updateDistanceDisplay(distanceToCursor, totalDistance);
    }

    calculateDistance(latlng1, latlng2) {
        // Конвертируем Leaflet координаты в игровые (метры)
        const game1 = this.leafletToGameCoords(latlng1);
        const game2 = this.leafletToGameCoords(latlng2);
        
        // Считаем расстояние по теореме Пифагора (1 единица = 1 метр)
        const dx = game2.x - game1.x;
        const dy = game2.y - game1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // Конвертация Leaflet координат в игровые
    leafletToGameCoords(latlng) {
        const gameX = (latlng.lng / 32) * 15360;
        const gameY = (latlng.lat / 32) * 15360;
        return { x: gameX, y: gameY };
    }

    calculateTotalDistance() {
        let total = 0;
        for (let i = 1; i < this.measurementPoints.length; i++) {
            total += this.calculateDistance(this.measurementPoints[i - 1], this.measurementPoints[i]);
        }
        return total;
    }

    updateDistanceDisplay(lastSegment, total) {
        const lastSegmentEl = document.getElementById('lastSegmentDistance');
        const totalEl = document.getElementById('totalDistance');

        if (lastSegmentEl) {
            lastSegmentEl.textContent = this.formatDistance(lastSegment);
        }
        if (totalEl) {
            totalEl.textContent = this.formatDistance(total);
        }
    }

    formatDistance(meters) {
        // Форматируем расстояние - всегда в метрах
        if (meters < 1) {
            return `${(meters * 100).toFixed(1)} см`;
        } else if (meters < 10) {
            return `${meters.toFixed(2)} м`;
        } else if (meters < 100) {
            return `${meters.toFixed(1)} м`;
        } else {
            return `${Math.round(meters)} м`;
        }
    }

    // Создание метки расстояния сегмента (без фона, чтобы не мешала)
    createSegmentLabel(start, end, distance) {
        const midPoint = L.latLng(
            (start.lat + end.lat) / 2,
            (start.lng + end.lng) / 2
        );

        const label = L.marker(midPoint, {
            icon: L.divIcon({
                className: 'measurement-segment-label',
                html: `<span>${this.formatDistance(distance)}</span>`,
                iconSize: [60, 16],
                iconAnchor: [30, 8]
            }),
            interactive: false
        }).addTo(this.map);

        this.segmentLabels.push(label);
    }

    // Создание метки накопленного расстояния точки
    createPointLabel(latlng, totalDistance) {
        // Смещаем метку немного вправо-вниз от точки
        const offset = 0.0003; // Примерно 30 метров
        const labelPosition = L.latLng(
            latlng.lat + offset,
            latlng.lng + offset
        );

        const label = L.marker(labelPosition, {
            icon: L.divIcon({
                className: 'measurement-point-label',
                html: `<span>${this.formatDistance(totalDistance)}</span>`,
                iconSize: [50, 18],
                iconAnchor: [0, 0]
            }),
            interactive: false
        }).addTo(this.map);

        this.pointLabels.push(label);
    }

    finishMeasurement() {
        if (!this.isMeasuring) return;

        this.isMeasuring = false;

        // Удаляем временную линию
        if (this.tempLine) {
            this.map.removeLayer(this.tempLine);
            this.tempLine = null;
        }

        // Меняем стиль линий на полупрозрачный для индикации завершения
        this.measurementLines.forEach(line => {
            line.setStyle({
                opacity: 0.4,
                dashArray: '10, 10'
            });
        });

        // Удаляем обработчики
        this.map.off('click', this.onMapClick, this);
        this.map.off('mousemove', this.onMouseMove, this);

        // Возвращаем курсор
        this.map.getContainer().style.cursor = '';

        // Скрываем отображение расстояния через небольшую задержку
        setTimeout(() => {
            this.distanceDisplay.classList.add('hidden');
        }, 2000);

        this.dayzMap.showHint('Измерение завершено. Нажмите 🗑️ Очистить для удаления линий');
    }

    cancelMeasurement() {
        if (!this.isMeasuring) return;

        this.isMeasuring = false;

        // Удаляем все элементы измерения
        this.clearMeasurementElements();

        // Удаляем обработчики
        this.map.off('click', this.onMapClick, this);
        this.map.off('mousemove', this.onMouseMove, this);

        // Возвращаем курсор
        this.map.getContainer().style.cursor = '';

        // Скрываем отображение расстояния
        this.distanceDisplay.classList.add('hidden');

        this.dayzMap.showHint('Измерение отменено');
    }

    clearMeasurementElements() {
        // Удаляем маркеры
        this.measurementMarkers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.measurementMarkers = [];

        // Удаляем линии
        this.measurementLines.forEach(line => {
            this.map.removeLayer(line);
        });
        this.measurementLines = [];

        // Удаляем метки сегментов
        this.segmentLabels.forEach(label => {
            this.map.removeLayer(label);
        });
        this.segmentLabels = [];

        // Удаляем метки точек
        this.pointLabels.forEach(label => {
            this.map.removeLayer(label);
        });
        this.pointLabels = [];

        // Удаляем временную линию
        if (this.tempLine) {
            this.map.removeLayer(this.tempLine);
            this.tempLine = null;
        }

        // Очищаем массив точек
        this.measurementPoints = [];
    }
    
    // Очистить все измерения (публичный метод для кнопки)
    clearAllMeasurements() {
        this.clearMeasurementElements();
        this.isMeasuring = false;
        this.distanceDisplay.classList.add('hidden');
        this.dayzMap.showHint('Измерения очищены');
    }
}

// Инициализация после создания карты
document.addEventListener('DOMContentLoaded', () => {
    // Ждем инициализации dayzMap
    const checkDayZMap = setInterval(() => {
        if (window.dayzMap) {
            clearInterval(checkDayZMap);
            window.dayzMap.distanceMeasurement = new DistanceMeasurement(window.dayzMap);
        }
    }, 100);
});

// Делаем класс доступным глобально
window.DistanceMeasurement = DistanceMeasurement;
