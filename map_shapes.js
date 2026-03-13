/**
 * Менеджер рисования фигур на карте DayZ
 * Поддерживает: круг, прямоугольник, линию, многоугольник
 * Импорт/экспорт, редактирование
 */
class MapShapesManager {
    constructor(dayzMapInstance) {
        this.dayzMap = dayzMapInstance;
        this.map = dayzMapInstance.map;

        // Хранение фигур
        this.shapes = [];
        this.currentProfileId = null;

        // Состояние рисования
        this.currentDrawingMode = null;
        this.drawingPoints = [];
        this.tempShape = null;
        this.isDrawing = false;

        // Выделение
        this.highlightedShape = null; // Выделенная фигура

        // Хранение ключей
        this.storageKeyPrefix = 'dayzMapShapes_';
        this.templatesStorageKeyPrefix = 'dayzMapShapesTemplates_';

        // Шаблоны
        this.templates = [];

        // Цвет по умолчанию (светло-серый)
        this.defaultColor = { r: 200, g: 200, b: 200 };
        this.defaultFillColor = 'rgba(200, 200, 200, 0.5)';
        this.defaultStrokeColor = 'rgba(200, 200, 200, 0.8)';
        this.defaultStrokeWidth = 2;

        // Контекстное меню
        this.contextMenu = null;

        // Подсказка
        this.hintElement = null;

        this.init();
    }

    init() {
        this.setupUI();
        this.setupEventListeners();
        this.loadCurrentProfileShapes();
        this.initDrawControl();
    }

    // ========================================
    // Control на карте
    // ========================================
    
    initDrawControl() {
        // Используем контрол созданный в script.js
        const container = this.dayzMap.drawControl?.getContainer();
        if (!container) {
            console.error('Draw control container not found');
            return;
        }

        this.initDrawControlEvents(container);
    }

    initDrawControlEvents(container) {
        const toggleBtn = container.querySelector('.draw-toggle-btn');
        const panel = container.querySelector('.draw-map-panel');
        
        if (!toggleBtn || !panel) return;
        
        // Переключение панели
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = panel.style.display === 'block';
            
            // Закрываем все меню
            this.closeAllMenus();
            
            if (isVisible) {
                panel.style.display = 'none';
                toggleBtn.classList.remove('active');
            } else {
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
        
        // Обработчики кнопок режимов
        panel.querySelectorAll('.draw-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.target.dataset.mode;
                const action = e.target.dataset.action;

                if (mode) {
                    this.startDrawing(mode);
                    panel.style.display = 'none';
                    toggleBtn.classList.remove('active');
                } else if (action === 'clear') {
                    this.clearAllShapes();
                    panel.style.display = 'none';
                    toggleBtn.classList.remove('active');
                }
            });
        });
    }

    // ========================================
    // Работа с профилями
    // ========================================
    
    getCurrentProfileId() {
        return this.dayzMap.profilesManager ? this.dayzMap.profilesManager.currentProfile : 'default';
    }

    getStorageKey() {
        return this.storageKeyPrefix + this.getCurrentProfileId();
    }

    getTemplatesStorageKey() {
        return this.templatesStorageKeyPrefix + this.getCurrentProfileId();
    }

    loadCurrentProfileShapes() {
        const key = this.getStorageKey();
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                this.shapes = JSON.parse(saved);
                this.renderAllShapes();
                console.log(`Загружено ${this.shapes.length} фигур для профиля`);
            } catch (e) {
                console.error('Ошибка загрузки фигур:', e);
                this.shapes = [];
            }
        } else {
            this.shapes = [];
        }
    }

    saveCurrentProfileShapes() {
        const key = this.getStorageKey();
        localStorage.setItem(key, JSON.stringify(this.shapes));
    }

    loadCurrentProfileTemplates() {
        const key = this.getTemplatesStorageKey();
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                this.templates = JSON.parse(saved);
                console.log(`Загружено ${this.templates.length} шаблонов для профиля`);
            } catch (e) {
                console.error('Ошибка загрузки шаблонов:', e);
                this.templates = [];
            }
        } else {
            this.templates = [];
        }
    }

    saveCurrentProfileTemplates() {
        const key = this.getTemplatesStorageKey();
        localStorage.setItem(key, JSON.stringify(this.templates));
    }

    // ========================================
    // UI элементы
    // ========================================
    
    setupUI() {
        // Создаем подсказку
        this.hintElement = document.createElement('div');
        this.hintElement.className = 'drawing-hint hidden';
        document.body.appendChild(this.hintElement);
    }

    closeAllMenus() {
        document.getElementById('toolsDropdownMenu')?.classList.remove('show');
        document.getElementById('toolsDropdownBtn')?.classList.remove('active');

        // Закрываем панель измерения расстояния
        const measurementPanel = document.querySelector('.measurement-map-panel');
        const measurementBtn = document.querySelector('.measurement-toggle-btn');
        if (measurementPanel) measurementPanel.style.display = 'none';
        if (measurementBtn) measurementBtn.classList.remove('active');
    }

    showHint(message) {
        if (!this.hintElement) return;
        this.hintElement.innerHTML = message;
        this.hintElement.classList.remove('hidden');
    }

    hideHint() {
        if (this.hintElement) {
            this.hintElement.classList.add('hidden');
        }
    }

    // ========================================
    // Рисование фигур
    // ========================================
    
    startDrawing(type) {
        if (this.isDrawing) {
            this.cancelDrawing();
            return;
        }
        
        this.currentDrawingMode = type;
        this.isDrawing = true;
        this.drawingPoints = [];
        this.closeAllMenus();
        
        // Подсказки для разных режимов
        const hints = {
            circle: '<kbd>ЛКМ</kbd> центр + <kbd>ЛКМ</kbd> радиус | <kbd>Esc</kbd> отмена',
            rectangle: '<kbd>ЛКМ</kbd> первый угол + <kbd>ЛКМ</kbd> второй угол | <kbd>Esc</kbd> отмена',
            line: '<kbd>ЛКМ</kbd> точки + <kbd>Enter</kbd> завершить | <kbd>Esc</kbd> отмена',
            polygon: '<kbd>ЛКМ</kbd> точки + <kbd>Enter</kbd> завершить | <kbd>Esc</kbd> отмена'
        };
        
        this.showHint(hints[type] || '');
        
        // Включаем режим рисования
        this.map.getContainer().style.cursor = 'crosshair';
    }

    cancelDrawing() {
        this.isDrawing = false;
        this.currentDrawingMode = null;
        this.drawingPoints = [];
        
        if (this.tempShape) {
            this.map.removeLayer(this.tempShape);
            this.tempShape = null;
        }
        
        this.hideHint();
        this.map.getContainer().style.cursor = '';
    }

    setupEventListeners() {
        this.map.on('click', (e) => this.onMapClick(e));
        this.map.on('mousemove', (e) => this.onMouseMove(e));

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isDrawing) {
                this.cancelDrawing();
            }
            if (e.key === 'Enter' && this.isDrawing &&
                (this.currentDrawingMode === 'line' || this.currentDrawingMode === 'polygon')) {
                this.finishDrawing();
            }
            // Удаление выделенной фигуры по Delete
            if (e.key === 'Delete' && this.highlightedShape) {
                if (confirm('Удалить выделенную фигуру?')) {
                    this.removeShape(this.highlightedShape.id);
                }
            }
            // Снятие выделения по Esc
            if (e.key === 'Escape' && this.highlightedShape) {
                this.highlightedShape = null;
                this.hideHint();
                // Сбрасываем выделение - восстанавливаем оригинальные цвета
                this.shapes.forEach(s => {
                    const layer = this.getShapeLayer(s);
                    if (layer) {
                        layer.setStyle({ 
                            weight: s.strokeWidth || 2, 
                            color: s.strokeColor || this.defaultStrokeColor 
                        });
                    }
                });
            }
        });
    }

    onMapClick(e) {
        if (!this.isDrawing) return;
        
        const latlng = e.latlng;
        
        switch (this.currentDrawingMode) {
            case 'circle':
                this.handleCircleClick(latlng);
                break;
            case 'rectangle':
                this.handleRectangleClick(latlng);
                break;
            case 'line':
            case 'polygon':
                this.handleMultiPointClick(latlng);
                break;
        }
    }

    onMouseMove(e) {
        if (!this.isDrawing) return;

        const latlng = e.latlng;

        switch (this.currentDrawingMode) {
            case 'circle':
                if (this.drawingPoints.length === 1) {
                    this.updateCirclePreview(latlng);
                }
                break;
            case 'rectangle':
                if (this.drawingPoints.length === 1) {
                    this.updateRectanglePreview(latlng);
                }
                break;
        }
    }

    // ========================================
    // Круг
    // ========================================
    
    handleCircleClick(latlng) {
        if (this.drawingPoints.length === 0) {
            // Первый клик - центр
            this.drawingPoints.push(latlng);
            this.showHint('<kbd>ЛКМ</kbd> радиус | <kbd>Esc</kbd> отмена');
        } else {
            // Второй клик - радиус
            this.finishCircle(latlng);
        }
    }

    updateCirclePreview(latlng) {
        if (this.tempShape) {
            this.map.removeLayer(this.tempShape);
        }

        const center = this.drawingPoints[0];
        const radius = this.calculateDistance(center, latlng);

        this.tempShape = L.circle(center, {
            radius: radius,
            color: this.defaultStrokeColor,
            fillColor: this.defaultFillColor,
            fillOpacity: 0.2,
            weight: this.defaultStrokeWidth,
            dashArray: '5, 5'
        }).addTo(this.map);
    }

    finishCircle(endLatlng) {
        const center = this.drawingPoints[0];
        const radius = this.calculateDistance(center, endLatlng);
        
        if (this.tempShape) {
            this.map.removeLayer(this.tempShape);
        }
        
        const circle = L.circle(center, {
            radius: radius,
            color: this.defaultStrokeColor,
            fillColor: this.defaultFillColor,
            fillOpacity: 0.5,
            weight: this.defaultStrokeWidth
        }).addTo(this.map);
        
        const shape = {
            id: this.generateId(),
            type: 'circle',
            center: { lat: center.lat, lng: center.lng },
            radius: radius,
            color: this.defaultFillColor,
            strokeColor: this.defaultStrokeColor,
            strokeWidth: this.defaultStrokeWidth,
            leafletId: circle._leaflet_id
        };
        
        this.bindShapeEvents(circle, shape);
        this.shapes.push(shape);
        this.saveCurrentProfileShapes();
        this.cancelDrawing();
    }

    // ========================================
    // Прямоугольник
    // ========================================
    
    handleRectangleClick(latlng) {
        if (this.drawingPoints.length === 0) {
            // Первый клик - первый угол
            this.drawingPoints.push(latlng);
            this.showHint('<kbd>ЛКМ</kbd> второй угол | <kbd>Esc</kbd> отмена');
        } else {
            // Второй клик - второй угол
            this.finishRectangle(latlng);
        }
    }

    updateRectanglePreview(latlng) {
        if (this.tempShape) {
            this.map.removeLayer(this.tempShape);
        }

        const start = this.drawingPoints[0];
        const bounds = L.latLngBounds(start, latlng);

        this.tempShape = L.rectangle(bounds, {
            color: this.defaultStrokeColor,
            fillColor: this.defaultFillColor,
            fillOpacity: 0.2,
            weight: this.defaultStrokeWidth,
            dashArray: '5, 5'
        }).addTo(this.map);
    }

    finishRectangle(endLatlng) {
        const start = this.drawingPoints[0];
        const bounds = L.latLngBounds(start, endLatlng);
        
        if (this.tempShape) {
            this.map.removeLayer(this.tempShape);
        }
        
        const rectangle = L.rectangle(bounds, {
            color: this.defaultStrokeColor,
            fillColor: this.defaultFillColor,
            fillOpacity: 0.5,
            weight: this.defaultStrokeWidth
        }).addTo(this.map);
        
        const shape = {
            id: this.generateId(),
            type: 'rectangle',
            bounds: [
                { lat: bounds.getSouthWest().lat, lng: bounds.getSouthWest().lng },
                { lat: bounds.getNorthEast().lat, lng: bounds.getNorthEast().lng }
            ],
            color: this.defaultFillColor,
            strokeColor: this.defaultStrokeColor,
            strokeWidth: this.defaultStrokeWidth,
            leafletId: rectangle._leaflet_id
        };
        
        this.bindShapeEvents(rectangle, shape);
        this.shapes.push(shape);
        this.saveCurrentProfileShapes();
        this.cancelDrawing();
    }

    // ========================================
    // Линия и многоугольник
    // ========================================
    
    handleMultiPointClick(latlng) {
        this.drawingPoints.push(latlng);
        
        if (this.tempShape) {
            this.map.removeLayer(this.tempShape);
        }
        
        if (this.currentDrawingMode === 'line') {
            this.tempShape = L.polyline(this.drawingPoints, {
                color: this.defaultStrokeColor,
                weight: 3,
                opacity: 0.8,
                dashArray: '5, 5'
            }).addTo(this.map);
        } else {
            this.tempShape = L.polygon(this.drawingPoints, {
                color: this.defaultStrokeColor,
                fillColor: this.defaultFillColor,
                fillOpacity: 0.5,
                weight: this.defaultStrokeWidth,
                dashArray: '5, 5'
            }).addTo(this.map);
        }
        
        this.showHint(`<kbd>ЛКМ</kbd> еще точки + <kbd>Enter</kbd> завершить | <kbd>Esc</kbd> отмена<br>Точек: ${this.drawingPoints.length}`);
    }

    finishDrawing() {
        if (this.drawingPoints.length < 2) {
            this.cancelDrawing();
            return;
        }
        
        if (this.tempShape) {
            this.map.removeLayer(this.tempShape);
        }
        
        let shapeLayer;
        if (this.currentDrawingMode === 'line') {
            shapeLayer = L.polyline(this.drawingPoints, {
                color: this.defaultStrokeColor,
                weight: 3,
                opacity: 0.8
            }).addTo(this.map);
        } else {
            shapeLayer = L.polygon(this.drawingPoints, {
                color: this.defaultStrokeColor,
                fillColor: this.defaultFillColor,
                fillOpacity: 0.5,
                weight: this.defaultStrokeWidth
            }).addTo(this.map);
        }
        
        const shape = {
            id: this.generateId(),
            type: this.currentDrawingMode,
            points: this.drawingPoints.map(p => ({ lat: p.lat, lng: p.lng })),
            color: this.defaultFillColor,
            strokeColor: this.defaultStrokeColor,
            strokeWidth: this.currentDrawingMode === 'line' ? 3 : this.defaultStrokeWidth,
            leafletId: shapeLayer._leaflet_id
        };
        
        this.bindShapeEvents(shapeLayer, shape);
        this.shapes.push(shape);
        this.saveCurrentProfileShapes();
        this.cancelDrawing();
    }

    // ========================================
    // Общие методы
    // ========================================
    
    bindShapeEvents(shapeLayer, shape) {
        // Контекстное меню по правому клику
        shapeLayer.on('contextmenu', (e) => {
            L.DomEvent.stopPropagation(e);
            this.showContextMenu(e, shape);
        });

        // Двойной клик - удалить фигуру
        shapeLayer.on('dblclick', (e) => {
            L.DomEvent.stopPropagation(e);
            if (confirm('Удалить эту фигуру?')) {
                this.removeShape(shape.id);
            }
        });

        // Клик - выделение
        shapeLayer.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            this.highlightShape(shape);
        });
    }

    highlightShape(shape) {
        this.highlightedShape = shape;
        
        // Снимаем выделение со всех
        this.shapes.forEach(s => {
            const layer = this.getShapeLayer(s);
            if (layer) {
                layer.setStyle({ 
                    weight: s.strokeWidth || 2, 
                    color: s.strokeColor || this.defaultStrokeColor 
                });
            }
        });

        // Выделяем текущий - только увеличиваем толщину
        const layer = this.getShapeLayer(shape);
        if (layer) {
            layer.setStyle({ weight: 4 });
        }
        
        this.showHint('<kbd>ПКМ</kbd> меню | <kbd>Delete</kbd> удалить | <kbd>Esc</kbd> снять выделение');
    }

    getShapeLayer(shape) {
        // Ищем слой по leafletId перебирая все слои на карте
        let foundLayer = null;
        this.map.eachLayer((layer) => {
            if (layer._leaflet_id === shape.leafletId) {
                foundLayer = layer;
            }
        });
        return foundLayer;
    }

    calculateDistance(latlng1, latlng2) {
        return this.map.distance(latlng1, latlng2);
    }

    generateId() {
        return 'shape_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    renderAllShapes() {
        this.shapes.forEach(shape => {
            this.renderShape(shape);
        });
    }

    renderShape(shape) {
        let layer;
        
        switch (shape.type) {
            case 'circle':
                layer = L.circle(shape.center, {
                    radius: shape.radius,
                    color: shape.strokeColor || this.defaultStrokeColor,
                    fillColor: shape.color || this.defaultFillColor,
                    fillOpacity: 0.5,
                    weight: shape.strokeWidth || this.defaultStrokeWidth
                }).addTo(this.map);
                break;
                
            case 'rectangle':
                const bounds = L.latLngBounds(shape.bounds[0], shape.bounds[1]);
                layer = L.rectangle(bounds, {
                    color: shape.strokeColor || this.defaultStrokeColor,
                    fillColor: shape.color || this.defaultFillColor,
                    fillOpacity: 0.5,
                    weight: shape.strokeWidth || this.defaultStrokeWidth
                }).addTo(this.map);
                break;
                
            case 'line':
                const linePoints = shape.points.map(p => [p.lat, p.lng]);
                layer = L.polyline(linePoints, {
                    color: shape.strokeColor || this.defaultStrokeColor,
                    weight: shape.strokeWidth || 3,
                    opacity: 0.8
                }).addTo(this.map);
                break;
                
            case 'polygon':
                const polyPoints = shape.points.map(p => [p.lat, p.lng]);
                layer = L.polygon(polyPoints, {
                    color: shape.strokeColor || this.defaultStrokeColor,
                    fillColor: shape.color || this.defaultFillColor,
                    fillOpacity: 0.5,
                    weight: shape.strokeWidth || this.defaultStrokeWidth
                }).addTo(this.map);
                break;
        }
        
        if (layer) {
            shape.leafletId = layer._leaflet_id;
            this.bindShapeEvents(layer, shape);
        }
    }

    clearAllShapes() {
        if (this.shapes.length === 0) return;
        
        if (!confirm('Удалить все фигуры?')) return;
        
        this.shapes.forEach(shape => {
            const layer = this.getShapeLayer(shape);
            if (layer) {
                this.map.removeLayer(layer);
            }
        });
        
        this.shapes = [];
        this.saveCurrentProfileShapes();
    }

    removeShape(shapeId) {
        const index = this.shapes.findIndex(s => s.id === shapeId);
        if (index === -1) return;

        const shape = this.shapes[index];
        const layer = this.getShapeLayer(shape);
        if (layer) {
            this.map.removeLayer(layer);
        }

        this.shapes.splice(index, 1);
        this.saveCurrentProfileShapes();
        this.hideContextMenu();
        
        // Сбрасываем выделение и скрываем подсказку
        this.highlightedShape = null;
        this.hideHint();
    }

    // ========================================
    // Контекстное меню
    // ========================================
    
    showContextMenu(e, shape) {
        this.hideContextMenu();
        
        this.contextMenu = document.createElement('div');
        this.contextMenu.className = 'shape-context-menu';
        this.contextMenu.innerHTML = `
            <button class="ctx-delete">🗑️ Удалить</button>
            <div class="divider"></div>
            <button class="ctx-color">🎨 Изменить цвет</button>
        `;
        
        document.body.appendChild(this.contextMenu);
        
        // Позиционирование
        const x = e.originalEvent.clientX;
        const y = e.originalEvent.clientY;
        this.contextMenu.style.left = x + 'px';
        this.contextMenu.style.top = y + 'px';
        
        // Обработчики
        this.contextMenu.querySelector('.ctx-delete').addEventListener('click', () => {
            this.removeShape(shape.id);
        });

        this.contextMenu.querySelector('.ctx-color').addEventListener('click', () => {
            this.showColorPicker(shape);
            this.hideContextMenu();
        });
        
        // Закрытие по клику
        setTimeout(() => {
            document.addEventListener('click', this.hideContextMenu.bind(this), { once: true });
        }, 100);
    }

    hideContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.remove();
            this.contextMenu = null;
        }
    }

    showColorPicker(shape) {
        const modal = document.createElement('div');
        modal.className = 'shape-modal-overlay';
        
        // Получаем текущие цвета
        const fillColor = shape.color || this.defaultFillColor;
        const strokeColor = shape.strokeColor || this.defaultStrokeColor;
        
        modal.innerHTML = `
            <div class="shape-modal">
                <h3>Изменить цвет фигуры</h3>
                
                <label>Цвет заполнения:</label>
                <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 15px;">
                    <input type="color" id="shapeFillColor" value="${this.rgbToHex(fillColor)}">
                    <span id="fillColorValue" style="color: var(--text-secondary); font-family: monospace;">${this.rgbaToString(fillColor)}</span>
                    <span style="color: var(--text-muted); font-size: 0.85em;">(прозрачность 50%)</span>
                </div>
                
                <label>Цвет контура:</label>
                <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 15px;">
                    <input type="color" id="shapeStrokeColor" value="${this.rgbToHex(strokeColor)}">
                    <span id="strokeColorValue" style="color: var(--text-secondary); font-family: monospace;">${this.rgbaToString(strokeColor)}</span>
                    <span style="color: var(--text-muted); font-size: 0.85em;">(прозрачность 80%)</span>
                </div>
                
                <div class="shape-modal-buttons">
                    <button class="btn-secondary modal-cancel">Отмена</button>
                    <button class="btn-primary modal-ok">Применить</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Обновление RGB значений при изменении цвета
        modal.querySelector('#shapeFillColor').addEventListener('input', (e) => {
            const hex = e.target.value;
            const rgb = this.hexToRgbString(hex);
            document.getElementById('fillColorValue').textContent = rgb;
        });
        
        modal.querySelector('#shapeStrokeColor').addEventListener('input', (e) => {
            const hex = e.target.value;
            const rgb = this.hexToRgbString(hex);
            document.getElementById('strokeColorValue').textContent = rgb;
        });

        modal.querySelector('.modal-cancel').addEventListener('click', () => modal.remove());
        modal.querySelector('.modal-ok').addEventListener('click', () => {
            const newFillColor = modal.querySelector('#shapeFillColor').value;
            const newStrokeColor = modal.querySelector('#shapeStrokeColor').value;
            
            const fillRgba = this.hexToRgba(newFillColor, 0.5);
            const strokeRgba = this.hexToRgba(newStrokeColor, 0.8);

            const layer = this.getShapeLayer(shape);
            if (layer) {
                layer.setStyle({ fillColor: fillRgba, color: strokeRgba });
            }
            shape.color = fillRgba;
            shape.strokeColor = strokeRgba;
            this.saveCurrentProfileShapes();
            modal.remove();
        });
    }

    // Преобразование rgba() строки в RGB строку (без альфа)
    rgbaToString(rgba) {
        if (!rgba) return 'rgb(200, 200, 200)';
        const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!match) return 'rgb(200, 200, 200)';
        return `rgb(${match[1]}, ${match[2]}, ${match[3]})`;
    }

    // Преобразование HEX в RGB строку
    hexToRgbString(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgb(${r}, ${g}, ${b})`;
    }

    rgbToHex(rgb) {
        if (!rgb) return '#c8c8c8';
        const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!match) return '#c8c8c8';
        return '#' + [match[1], match[2], match[3]].map(x => {
            const hex = parseInt(x).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // ========================================
    // Импорт/Экспорт
    // ========================================

    exportShapes() {
        const data = {
            version: 1,
            profileId: this.getCurrentProfileId(),
            exportedAt: new Date().toISOString(),
            shapes: this.shapes.map(s => ({
                id: s.id,
                type: s.type,
                center: s.center,
                radius: s.radius,
                bounds: s.bounds,
                points: s.points,
                color: s.color,
                strokeColor: s.strokeColor,
                strokeWidth: s.strokeWidth
            }))
        };
        
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `dayz_shapes_${this.getCurrentProfileId()}_${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.dayzMap.showSuccess('Фигуры экспортированы');
    }

    showImportDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    this.importShapes(data);
                } catch (err) {
                    this.dayzMap.showError('Ошибка чтения файла: ' + err.message);
                }
            };
            reader.readAsText(file);
        });
        
        input.click();
    }

    importShapes(data) {
        if (!data.shapes || !Array.isArray(data.shapes)) {
            this.dayzMap.showError('Неверный формат файла');
            return;
        }
        
        let imported = 0;
        
        data.shapes.forEach(s => {
            let shapeLayer;
            let shape;
            
            try {
                if (s.type === 'circle') {
                    shapeLayer = L.circle(s.center, {
                        radius: s.radius,
                        color: s.strokeColor || this.defaultStrokeColor,
                        fillColor: s.color || this.defaultFillColor,
                        fillOpacity: 0.5,
                        weight: s.strokeWidth || this.defaultStrokeWidth
                    }).addTo(this.map);
                    
                    shape = {
                        id: this.generateId(),
                        type: 'circle',
                        center: s.center,
                        radius: s.radius,
                        color: s.color || this.defaultFillColor,
                        strokeColor: s.strokeColor || this.defaultStrokeColor,
                        strokeWidth: s.strokeWidth || this.defaultStrokeWidth,
                        leafletId: shapeLayer._leaflet_id
                    };
                    
                    this.bindShapeEvents(shapeLayer, shape);
                    this.shapes.push(shape);
                    imported++;
                    
                } else if (s.type === 'rectangle') {
                    const bounds = L.latLngBounds(s.bounds[0], s.bounds[1]);
                    shapeLayer = L.rectangle(bounds, {
                        color: s.strokeColor || this.defaultStrokeColor,
                        fillColor: s.color || this.defaultFillColor,
                        fillOpacity: 0.5,
                        weight: s.strokeWidth || this.defaultStrokeWidth
                    }).addTo(this.map);
                    
                    shape = {
                        id: this.generateId(),
                        type: 'rectangle',
                        bounds: s.bounds,
                        color: s.color || this.defaultFillColor,
                        strokeColor: s.strokeColor || this.defaultStrokeColor,
                        strokeWidth: s.strokeWidth || this.defaultStrokeWidth,
                        leafletId: shapeLayer._leaflet_id
                    };
                    
                    this.bindShapeEvents(shapeLayer, shape);
                    this.shapes.push(shape);
                    imported++;
                    
                } else if (s.type === 'line' || s.type === 'polygon') {
                    const latlngs = s.points.map(p => [p.lat, p.lng]);
                    
                    if (s.type === 'line') {
                        shapeLayer = L.polyline(latlngs, {
                            color: s.strokeColor || this.defaultStrokeColor,
                            weight: s.strokeWidth || 3,
                            opacity: 0.8
                        }).addTo(this.map);
                    } else {
                        shapeLayer = L.polygon(latlngs, {
                            color: s.strokeColor || this.defaultStrokeColor,
                            fillColor: s.color || this.defaultFillColor,
                            fillOpacity: 0.5,
                            weight: s.strokeWidth || this.defaultStrokeWidth
                        }).addTo(this.map);
                    }
                    
                    shape = {
                        id: this.generateId(),
                        type: s.type,
                        points: s.points,
                        color: s.color || this.defaultFillColor,
                        strokeColor: s.strokeColor || this.defaultStrokeColor,
                        strokeWidth: s.strokeWidth || this.defaultStrokeWidth,
                        leafletId: shapeLayer._leaflet_id
                    };
                    
                    this.bindShapeEvents(shapeLayer, shape);
                    this.shapes.push(shape);
                    imported++;
                }
            } catch (err) {
                console.error('Ошибка импорта фигуры:', err);
            }
        });
        
        this.saveCurrentProfileShapes();
        this.dayzMap.showSuccess(`Импортировано ${imported} фигур`);
    }

    // ========================================
    // Обработка смены профиля
    // ========================================
    
    onProfileChanged() {
        // Очищаем текущие фигуры с карты
        this.shapes.forEach(shape => {
            const layer = this.getShapeLayer(shape);
            if (layer) {
                this.map.removeLayer(layer);
            }
        });
        this.shapes = [];

        // Сбрасываем выделение
        this.highlightedShape = null;
        this.hideHint();

        // Загружаем фигуры нового профиля
        this.loadCurrentProfileShapes();
        this.loadCurrentProfileTemplates();
    }
}

// Инициализация после создания карты
document.addEventListener('DOMContentLoaded', () => {
    // Ждем инициализации dayzMap
    const checkDayZMap = setInterval(() => {
        if (window.dayzMap) {
            clearInterval(checkDayZMap);
            window.dayzMap.shapesManager = new MapShapesManager(window.dayzMap);
            
            // Подписываемся на смену профиля
            if (window.dayzMap.profilesManager) {
                const originalLoadProfile = window.dayzMap.profilesManager.loadProfile;
                window.dayzMap.profilesManager.loadProfile = function(...args) {
                    const result = originalLoadProfile.apply(this, args);
                    if (window.dayzMap.shapesManager) {
                        window.dayzMap.shapesManager.onProfileChanged();
                    }
                    return result;
                };
            }
        }
    }, 100);
});

// Делаем класс доступным глобально
window.MapShapesManager = MapShapesManager;
