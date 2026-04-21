/**
 * Bulk Import Manager
 * Менеджер массового импорта меток
 * Позволяет добавлять метки вручную с использованием предустановленных стилей
 */

class BulkImportManager {
    constructor(dayzMapInstance) {
        this.dayzMap = dayzMapInstance;
        this.map = dayzMapInstance.map;

        // Массив меток для импорта
        this.markers = [];

        // Режим отображения: 'table' или 'cards'
        this.viewMode = 'table';

        // Ключ localStorage для стилей
        this.stylesKey = 'dayzMap_bulkImportStyles';

        // Цвет по умолчанию (берем из MARKER_TYPES.default)
        this.defaultColor = '#3498db';
        this.defaultType = 'default';

        // Загрузка стилей
        this.styles = this.loadStyles();

        this.init();
    }

    init() {
        // Инициализация при создании
    }

    // ========================================
    // Управление стилями
    // ========================================

    loadStyles() {
        const saved = localStorage.getItem(this.stylesKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Убеждаемся что есть стиль "Пустая строка"
                if (!parsed.find(s => s.isDefault)) {
                    parsed.unshift(this.getEmptyStyle());
                }
                return parsed;
            } catch (e) {
                console.error('Ошибка загрузки стилей:', e);
            }
        }
        return [this.getEmptyStyle()];
    }

    saveStyles() {
        localStorage.setItem(this.stylesKey, JSON.stringify(this.styles));
    }

    getEmptyStyle() {
        return {
            id: 'empty',
            name: 'Пустая строка',
            markerName: '',
            type: this.defaultType,
            color: this.defaultColor,
            isDefault: true
        };
    }

    addStyle(style) {
        // Проверяем существует ли уже стиль с таким именем
        const existing = this.styles.find(s => s.name === style.name && s.id !== style.id);
        if (existing) {
            console.warn('Стиль с таким именем уже существует:', style.name);
            return false;
        }
        
        if (!style.id) {
            style.id = 'style_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
        // Не даём удалить стиль по умолчанию
        if (style.isDefault) {
            const existingDefault = this.styles.find(s => s.isDefault);
            if (existingDefault) {
                style.isDefault = false;
            }
        }
        this.styles.push(style);
        this.saveStyles();
        return true;
    }

    updateStyle(id, updatedStyle) {
        const index = this.styles.findIndex(s => s.id === id);
        if (index !== -1) {
            this.styles[index] = { ...this.styles[index], ...updatedStyle };
            this.saveStyles();
        }
    }

    deleteStyle(id) {
        const style = this.styles.find(s => s.id === id);
        if (style && style.isDefault) {
            return false; // Нельзя удалить стиль по умолчанию
        }
        this.styles = this.styles.filter(s => s.id !== id);
        this.saveStyles();
        return true;
    }

    // ========================================
    // Основное окно импорта
    // ========================================

    showImportModal() {
        // Добавляем одну пустую строку по умолчанию
        if (this.markers.length === 0) {
            this.addMarkerRow();
        }

        const content = `
            <div class="bulk-import-container">
                <!-- Панель инструментов -->
                <div class="bulk-import-toolbar">
                    <button id="bulkImportAddBtn" class="bulk-import-btn bulk-import-btn-primary">
                        <span>➕</span> Добавить
                    </button>
                    <select id="bulkImportStyleSelect" class="bulk-import-style-select">
                        ${this.renderStyleOptions()}
                    </select>
                    <input type="number" id="bulkImportQuantity" class="bulk-import-quantity" 
                           value="1" min="1" max="100" title="Количество строк">
                    <div style="flex: 1;"></div>
                    <div class="bulk-import-view-toggle">
                        <button id="bulkImportTableBtn" class="bulk-import-view-btn ${this.viewMode === 'table' ? 'active' : ''}" title="Таблица">
                            📊
                        </button>
                        <button id="bulkImportCardsBtn" class="bulk-import-view-btn ${this.viewMode === 'cards' ? 'active' : ''}" title="Карточки">
                            📋
                        </button>
                    </div>
                    <button id="bulkImportStylesBtn" class="bulk-import-btn bulk-import-btn-sm" title="Настроить стили">
                        ⚙️ Стили
                    </button>
                </div>

                <!-- Счётчик -->
                <div style="margin-bottom: 10px;">
                    <span class="bulk-import-counter">Всего меток: <span id="bulkImportCount">${this.markers.length}</span></span>
                </div>

                <!-- Контент -->
                <div id="bulkImportContent" class="bulk-import-content"></div>
            </div>
        `;

        const modal = this.createModal('Массовый ввод меток', content);
        modal.classList.add('bulk-import-modal');

        this.setupModalEvents(modal);
        this.renderContent(modal);
    }

    renderStyleOptions() {
        // Убираем дубликаты по id
        const uniqueStyles = this.styles.filter((style, index, self) => 
            index === self.findIndex(s => s.id === style.id)
        );
        return uniqueStyles.map(style =>
            `<option value="${style.id}">${this.escapeHtml(style.name)}</option>`
        ).join('');
    }

    createModal(title, content) {
        // Создаём overlay
        const overlay = document.createElement('div');
        overlay.classList.add('bulk-import-overlay');
        document.body.appendChild(overlay);

        // Создаём модальное окно
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div class="bulk-import-header">
                <h3>${this.escapeHtml(title)}</h3>
                <button class="bulk-import-close">&times;</button>
            </div>
            <div class="bulk-import-body">${content}</div>
            <div class="bulk-import-footer">
                <div class="bulk-import-footer-left"></div>
                <div class="bulk-import-footer-right">
                    <button id="bulkImportCancelBtn" class="bulk-import-btn bulk-import-btn-secondary">Отмена</button>
                    <button id="bulkImportSubmitBtn" class="bulk-import-btn bulk-import-btn-success">Добавить все на карту</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        overlay.classList.add('active');

        // Перетаскивание
        this.makeDraggable(modal, modal.querySelector('.bulk-import-header'));

        // Обработчик закрытия
        modal.querySelector('.bulk-import-close').addEventListener('click', () => {
            this.closeModal(modal, overlay);
        });

        return modal;
    }

    makeDraggable(modal, header) {
        // Сбрасываем transform сразу при создании
        modal.style.transform = 'none';
        modal.style.position = 'fixed';
        
        let isDragging = false;
        let shiftX = 0;
        let shiftY = 0;

        header.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e.preventDefault();
            isDragging = true;
            
            // Получаем координаты курсора относительно окна
            const rect = modal.getBoundingClientRect();
            shiftX = e.clientX - rect.left;
            shiftY = e.clientY - rect.top;
            
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            if (!isDragging) return;
            e.preventDefault();
            
            // Вычисляем новые координаты
            const newLeft = e.clientX - shiftX;
            const newTop = e.clientY - shiftY;
            
            modal.style.left = newLeft + 'px';
            modal.style.top = newTop + 'px';
        }

        function closeDragElement() {
            isDragging = false;
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    closeModal(modal, overlay) {
        modal.remove();
        overlay.remove();
        this.markers = [];
    }

    setupModalEvents(modal) {
        const addBtn = modal.querySelector('#bulkImportAddBtn');
        const styleSelect = modal.querySelector('#bulkImportStyleSelect');
        const quantityInput = modal.querySelector('#bulkImportQuantity');
        const tableBtn = modal.querySelector('#bulkImportTableBtn');
        const cardsBtn = modal.querySelector('#bulkImportCardsBtn');
        const stylesBtn = modal.querySelector('#bulkImportStylesBtn');
        const cancelBtn = modal.querySelector('#bulkImportCancelBtn');
        const submitBtn = modal.querySelector('#bulkImportSubmitBtn');

        // Кнопка "Добавить"
        addBtn.addEventListener('click', () => {
            const styleId = styleSelect.value;
            const quantity = parseInt(quantityInput.value) || 1;
            const style = this.styles.find(s => s.id === styleId);
            
            for (let i = 0; i < quantity; i++) {
                this.addMarkerRow(style);
            }
            this.renderContent(modal);
            this.updateCount(modal);
            this.validateAll(modal);
        });

        // Переключатель вида - Таблица
        tableBtn.addEventListener('click', () => {
            this.viewMode = 'table';
            tableBtn.classList.add('active');
            cardsBtn.classList.remove('active');
            this.renderContent(modal);
        });

        // Переключатель вида - Карточки
        cardsBtn.addEventListener('click', () => {
            this.viewMode = 'cards';
            cardsBtn.classList.add('active');
            tableBtn.classList.remove('active');
            this.renderContent(modal);
        });

        // Кнопка настройки стилей
        stylesBtn.addEventListener('click', () => {
            this.showStylesModal(modal);
        });

        // Кнопка Отмена
        cancelBtn.addEventListener('click', () => {
            const overlay = document.querySelector('.bulk-import-overlay');
            this.closeModal(modal, overlay);
        });

        // Кнопка Добавить все на карту
        submitBtn.addEventListener('click', () => {
            this.addAllMarkers(modal);
        });
    }

    // ========================================
    // Управление метками
    // ========================================

    addMarkerRow(style) {
        const s = style || this.getEmptyStyle();
        this.markers.push({
            id: 'marker_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            coords: '',
            name: s.markerName || '',
            type: s.type || this.defaultType,
            color: s.color || this.defaultColor,
            error: null
        });
    }

    removeMarker(id, modal) {
        this.markers = this.markers.filter(m => m.id !== id);
        this.renderContent(modal);
        this.updateCount(modal);
        this.validateAll(modal);
    }

    updateMarker(id, field, value) {
        const marker = this.markers.find(m => m.id === id);
        if (marker) {
            marker[field] = value;
            // Автоподбор цвета при изменении типа
            if (field === 'type' && MARKER_TYPES[value]) {
                marker.color = MARKER_TYPES[value].color;
            }
        }
    }

    // ========================================
    // Рендеринг
    // ========================================

    renderContent(modal) {
        const container = modal.querySelector('#bulkImportContent');
        
        if (this.viewMode === 'table') {
            container.innerHTML = this.renderTableView();
        } else {
            container.innerHTML = this.renderCardsView();
        }

        this.setupContentEvents(modal);
    }

    renderTableView() {
        if (this.markers.length === 0) {
            return '<div style="text-align: center; color: var(--text-muted); padding: 40px;">Нет меток. Нажмите "+ Добавить" чтобы добавить первую метку.</div>';
        }

        const rows = this.markers.map((marker) => {
            const errorClass = marker.error ? 'bulk-import-invalid' : (marker.duplicate ? 'bulk-import-duplicate' : 'bulk-import-valid');
            const errorAttr = marker.error ? `data-error="${this.escapeHtml(marker.error)}"` : (marker.duplicate ? 'data-error="Дубликат координат"' : '');
            // Конвертируем цвет в hex для input type="color"
            const colorHex = this.rgbToHex(marker.color);

            return `
                <div class="bulk-import-row ${errorClass}" ${errorAttr} data-id="${marker.id}">
                    <div class="bulk-import-cell">
                        <button class="bulk-import-btn bulk-import-btn-sm bulk-center-btn" title="Центрировать на координатах" data-id="${marker.id}">🎯</button>
                        <input type="text" class="bulk-import-input bulk-coords"
                               value="${this.escapeHtml(marker.coords)}"
                               placeholder="<X Z Y> Degree">
                    </div>
                    <div class="bulk-import-cell">
                        <input type="text" class="bulk-import-input bulk-name"
                               value="${this.escapeHtml(marker.name)}"
                               placeholder="Название">
                    </div>
                    <div class="bulk-import-cell">
                        <select class="bulk-import-select bulk-type">
                            ${this.renderTypeOptions(marker.type)}
                        </select>
                    </div>
                    <div class="bulk-import-cell bulk-import-color-wrapper">
                        <input type="color" class="bulk-import-color bulk-color" value="${colorHex}">
                        <span class="bulk-import-color-preview" style="background-color: ${colorHex}"></span>
                    </div>
                    <div class="bulk-import-cell">
                        <button class="bulk-import-btn bulk-import-btn-icon bulk-delete" title="Удалить">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');

        return `<div class="bulk-import-table">${rows}</div>`;
    }

    renderCardsView() {
        if (this.markers.length === 0) {
            return '<div style="text-align: center; color: var(--text-muted); padding: 40px;">Нет меток. Нажмите "+ Добавить" чтобы добавить первую метку.</div>';
        }

        const cards = this.markers.map((marker, index) => {
            const errorClass = marker.error ? 'bulk-import-invalid' : (marker.duplicate ? 'bulk-import-duplicate' : 'bulk-import-valid');
            const errorAttr = marker.error ? `data-error="${this.escapeHtml(marker.error)}"` : (marker.duplicate ? 'data-error="Дубликат координат"' : '');
            // Конвертируем цвет в hex для input type="color"
            const colorHex = this.rgbToHex(marker.color);

            return `
                <div class="bulk-import-card ${errorClass}" ${errorAttr} data-id="${marker.id}">
                    <div class="bulk-import-card-header">
                        <span class="bulk-import-card-index">#${index + 1}</span>
                        ${marker.error ? '<span class="bulk-import-card-error-badge">⚠️ Ошибка</span>' : (marker.duplicate ? '<span class="bulk-import-card-error-badge">🔄 Дубликат</span>' : '')}
                    </div>
                    <div class="bulk-import-card-body">
                        <div class="bulk-import-card-field">
                            <label>Координаты:</label>
                            <div style="display: flex; gap: 5px; align-items: center;">
                                <button class="bulk-import-btn bulk-import-btn-sm bulk-center-btn" title="Центрировать на координатах" data-id="${marker.id}">🎯</button>
                                <input type="text" class="bulk-import-input bulk-coords"
                                       value="${this.escapeHtml(marker.coords)}"
                                       placeholder="<X Z Y> Degree" style="flex: 1;">
                            </div>
                        </div>
                        <div class="bulk-import-card-field">
                            <label>Название:</label>
                            <input type="text" class="bulk-import-input bulk-name"
                                   value="${this.escapeHtml(marker.name)}"
                                   placeholder="Название">
                        </div>
                        <div class="bulk-import-card-field">
                            <label>Тип метки:</label>
                            <select class="bulk-import-select bulk-type">
                                ${this.renderTypeOptions(marker.type)}
                            </select>
                        </div>
                        <div class="bulk-import-card-field">
                            <label>Цвет:</label>
                            <div class="bulk-import-color-wrapper">
                                <input type="color" class="bulk-import-color bulk-color" value="${colorHex}">
                                <span class="bulk-import-color-preview" style="background-color: ${colorHex}"></span>
                            </div>
                        </div>
                    </div>
                    <div class="bulk-import-card-footer">
                        <button class="bulk-import-btn bulk-import-btn-danger bulk-import-btn-sm bulk-delete">Удалить</button>
                    </div>
                </div>
            `;
        }).join('');

        return `<div class="bulk-import-cards">${cards}</div>`;
    }

    renderTypeOptions(selectedType) {
        return Object.entries(MARKER_TYPES).map(([type, data]) => {
            const selected = type === selectedType ? 'selected' : '';
            return `<option value="${type}" ${selected}>${this.escapeHtml(data.name)}</option>`;
        }).join('');
    }

    setupContentEvents(modal) {
        // Кнопка центрирования
        modal.querySelectorAll('.bulk-center-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.dataset.id;
                const marker = this.markers.find(m => m.id === id);
                if (marker && marker.coords) {
                    const coords = this.parseCoords(marker.coords);
                    if (coords) {
                        const leafletLatLng = this.dayzMap.gameToLeafletCoords(coords.x, coords.y);
                        this.map.setView(leafletLatLng, 8);
                        // Показываем временный маркер (стандартный метод из script.js)
                        this.dayzMap.showTemporaryMarker(leafletLatLng, coords.x, coords.y, coords.z || 0);
                    }
                }
            });
        });

        // Удаление метки
        modal.querySelectorAll('.bulk-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const row = e.target.closest('[data-id]');
                const id = row.dataset.id;
                this.removeMarker(id, modal);
            });
        });

        // Изменение координат
        modal.querySelectorAll('.bulk-coords').forEach(input => {
            input.addEventListener('input', (e) => {
                const row = e.target.closest('[data-id]');
                const id = row.dataset.id;
                this.updateMarker(id, 'coords', e.target.value);
                this.validateMarker(id, modal);
                // Проверяем дубликаты для всех маркеров
                this.checkDuplicates();
                this.renderContent(modal);
                this.updateSubmitButton(modal);
            });
        });

        // Изменение названия
        modal.querySelectorAll('.bulk-name').forEach(input => {
            input.addEventListener('input', (e) => {
                const row = e.target.closest('[data-id]');
                const id = row.dataset.id;
                this.updateMarker(id, 'name', e.target.value);
            });
        });

        // Изменение типа
        modal.querySelectorAll('.bulk-type').forEach(select => {
            select.addEventListener('change', (e) => {
                const row = e.target.closest('[data-id]');
                const id = row.dataset.id;
                this.updateMarker(id, 'type', e.target.value);
                // Обновляем цвет превью
                const marker = this.markers.find(m => m.id === id);
                if (marker) {
                    const colorInput = row.querySelector('.bulk-color');
                    const colorPreview = row.querySelector('.bulk-import-color-preview');
                    if (colorInput && MARKER_TYPES[e.target.value]) {
                        colorInput.value = this.rgbToHex(MARKER_TYPES[e.target.value].color);
                        if (colorPreview) {
                            colorPreview.style.backgroundColor = MARKER_TYPES[e.target.value].color;
                        }
                    }
                }
            });
        });

        // Изменение цвета
        modal.querySelectorAll('.bulk-color').forEach(input => {
            input.addEventListener('input', (e) => {
                const row = e.target.closest('[data-id]');
                const id = row.dataset.id;
                const marker = this.markers.find(m => m.id === id);
                if (marker) {
                    marker.color = this.hexToRgb(e.target.value);
                    const colorPreview = row.querySelector('.bulk-import-color-preview');
                    if (colorPreview) {
                        colorPreview.style.backgroundColor = e.target.value;
                    }
                }
            });
        });
    }

    // ========================================
    // Валидация
    // ========================================

    validateCoords(coords) {
        if (!coords || !coords.trim()) {
            return { valid: false, error: 'Координаты не заполнены' };
        }

        const coordsRegex = /<([\d.]+)\s+([\d.]+)\s+([\d.]+)>\s+([\d.]+)\s+Degree/i;
        const match = coords.match(coordsRegex);

        if (!match) {
            return { valid: false, error: 'Неверный формат (ожидается: <X Z Y> Degree)' };
        }

        const x = parseFloat(match[1]);
        const z = parseFloat(match[2]);
        const y = parseFloat(match[3]);

        if (isNaN(x) || isNaN(y) || isNaN(z)) {
            return { valid: false, error: 'Координаты содержат нечисловые значения' };
        }

        if (x < 0 || x > 15360 || y < 0 || y > 15360) {
            return { valid: false, error: `Координаты за пределами карты (X: ${x}, Y: ${y})` };
        }

        return { valid: true, error: null };
    }

    validateMarker(id, modal) {
        const marker = this.markers.find(m => m.id === id);
        if (!marker) return;

        const validation = this.validateCoords(marker.coords);
        marker.error = validation.error;

        // Проверяем дубликаты
        this.checkDuplicates();

        // Обновляем визуальное отображение
        const row = modal.querySelector(`[data-id="${id}"]`);
        if (row) {
            row.classList.remove('bulk-import-valid', 'bulk-import-invalid', 'bulk-import-duplicate');
            if (marker.duplicate) {
                row.classList.add('bulk-import-duplicate');
                row.setAttribute('data-error', 'Дубликат координат');
            } else if (validation.valid) {
                row.classList.add('bulk-import-valid');
                row.removeAttribute('data-error');
            } else {
                row.classList.add('bulk-import-invalid');
                row.setAttribute('data-error', validation.error);
            }
        }

        this.updateSubmitButton(modal);
    }

    checkDuplicates() {
        // Сбрасываем флаги дубликатов
        this.markers.forEach(m => m.duplicate = false);

        // Находим маркеры с заполненными координатами
        const markersWithCoords = this.markers.filter(m => m.coords && m.coords.trim());

        // Сравниваем координаты
        for (let i = 0; i < markersWithCoords.length; i++) {
            for (let j = i + 1; j < markersWithCoords.length; j++) {
                const coords1 = this.parseCoords(markersWithCoords[i].coords);
                const coords2 = this.parseCoords(markersWithCoords[j].coords);

                if (coords1 && coords2 &&
                    coords1.x === coords2.x &&
                    coords1.y === coords2.y) {
                    markersWithCoords[i].duplicate = true;
                    markersWithCoords[j].duplicate = true;
                }
            }
        }
    }

    parseCoords(coordsString) {
        if (!coordsString || !coordsString.trim()) return null;
        const match = coordsString.match(/<([\d.]+)\s+([\d.]+)\s+([\d.]+)>\s+([\d.]+)\s+Degree/i);
        if (!match) return null;
        return {
            x: parseFloat(match[1]),
            y: parseFloat(match[3])
        };
    }

    validateAll(modal) {
        this.markers.forEach(marker => {
            const validation = this.validateCoords(marker.coords);
            marker.error = validation.error;
        });

        // Проверяем дубликаты
        this.checkDuplicates();

        // Перерисовываем для обновления стилей
        this.renderContent(modal);
        this.updateSubmitButton(modal);
    }

    updateSubmitButton(modal) {
        const submitBtn = modal.querySelector('#bulkImportSubmitBtn');
        const hasErrors = this.markers.some(m => m.error);
        const hasEmpty = this.markers.length === 0;
        const hasDuplicates = this.markers.some(m => m.duplicate);

        submitBtn.disabled = hasErrors || hasEmpty || hasDuplicates;
    }

    updateCount(modal) {
        const countEl = modal.querySelector('#bulkImportCount');
        if (countEl) {
            countEl.textContent = this.markers.length;
        }
    }

    // ========================================
    // Добавление меток на карту
    // ========================================

    addAllMarkers(modal) {
        const validMarkers = this.markers.filter(m => !m.error && m.coords.trim());

        if (validMarkers.length === 0) {
            this.dayzMap.showError('Нет валидных меток для добавления');
            return;
        }

        // Создаём временные элементы формы если их нет
        this.ensureFormElementsExist();

        // Сохраняем текущие значения формы для восстановления
        const savedFormValues = {
            text: document.getElementById('newMarkerText')?.value || '',
            type: document.getElementById('newMarkerType')?.value || 'default',
            r: document.getElementById('newColorR')?.value || '52',
            g: document.getElementById('newColorG')?.value || '152',
            b: document.getElementById('newColorB')?.value || '219'
        };

        let addedCount = 0;

        validMarkers.forEach(markerData => {
            try {
                // Парсим координаты
                const coordsRegex = /<([\d.]+)\s+([\d.]+)\s+([\d.]+)>\s+([\d.]+)\s+Degree/i;
                const match = markerData.coords.match(coordsRegex);

                if (!match) return;

                const x = parseFloat(match[1]);
                const y = parseFloat(match[3]);
                const z = parseFloat(match[2]);
                const degree = parseFloat(match[4]);

                const gameCoords = { x: x, y: y, z: z, degree: degree };
                const leafletLatLng = this.dayzMap.gameToLeafletCoords(x, y);

                // Преобразуем цвет в RGB
                let colorRgb;
                if (typeof markerData.color === 'string') {
                    if (markerData.color.startsWith('#')) {
                        const rgb = this.hexToRgb(markerData.color);
                        colorRgb = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
                    } else {
                        colorRgb = markerData.color;
                    }
                } else {
                    colorRgb = this.rgbToString(markerData.color);
                }

                // Получаем RGB компоненты
                const rgbMatch = colorRgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                const r = rgbMatch ? parseInt(rgbMatch[1]) : 52;
                const g = rgbMatch ? parseInt(rgbMatch[2]) : 152;
                const b = rgbMatch ? parseInt(rgbMatch[3]) : 219;

                // Временно заполняем форму значениями из этой метки
                this.fillFormValues(markerData.name || 'Метка', markerData.type || 'default', r, g, b, colorRgb);

                // Вызываем стандартную функцию добавления метки
                this.dayzMap.saveNewMarker(leafletLatLng, gameCoords);

                addedCount++;
            } catch (error) {
                console.error('Ошибка добавления метки:', error);
            }
        });

        // Восстанавливаем исходные значения формы
        this.restoreFormValues(savedFormValues);

        // Закрываем модальное окно
        const overlay = document.querySelector('.bulk-import-overlay');
        this.closeModal(modal, overlay);

        this.dayzMap.showSuccess(`Добавлено ${addedCount} меток`);
    }

    ensureFormElementsExist() {
        // Проверяем существование элементов формы
        if (!document.getElementById('newMarkerText')) {
            // Создаём скрытые элементы формы
            const container = document.createElement('div');
            container.id = 'bulkImportHiddenForm';
            container.style.display = 'none';
            container.innerHTML = `
                <input type="text" id="newMarkerText" value="">
                <select id="newMarkerType">
                    ${this.dayzMap.getMarkerTypeOptions('default')}
                </select>
                <input type="number" id="newColorR" min="0" max="255" value="52">
                <input type="number" id="newColorG" min="0" max="255" value="152">
                <input type="number" id="newColorB" min="0" max="255" value="219">
                <div id="newColorPreview"></div>
            `;
            document.body.appendChild(container);
        }
    }

    fillFormValues(text, type, r, g, b, colorRgb) {
        const textInput = document.getElementById('newMarkerText');
        const typeSelect = document.getElementById('newMarkerType');
        const rInput = document.getElementById('newColorR');
        const gInput = document.getElementById('newColorG');
        const bInput = document.getElementById('newColorB');
        const colorPreview = document.getElementById('newColorPreview');

        if (textInput) textInput.value = text;
        if (typeSelect) typeSelect.value = type;
        if (rInput) rInput.value = r;
        if (gInput) gInput.value = g;
        if (bInput) bInput.value = b;
        if (colorPreview) colorPreview.style.background = colorRgb;
    }

    restoreFormValues(saved) {
        const textInput = document.getElementById('newMarkerText');
        const typeSelect = document.getElementById('newMarkerType');
        const rInput = document.getElementById('newColorR');
        const gInput = document.getElementById('newColorG');
        const bInput = document.getElementById('newColorB');
        const colorPreview = document.getElementById('newColorPreview');

        if (textInput) textInput.value = saved.text;
        if (typeSelect) typeSelect.value = saved.type;
        if (rInput) rInput.value = saved.r;
        if (gInput) gInput.value = saved.g;
        if (bInput) bInput.value = saved.b;
        if (colorPreview) colorPreview.style.background = `rgb(${saved.r}, ${saved.g}, ${saved.b})`;
    }

    // ========================================
    // Окно управления стилями
    // ========================================

    showStylesModal(parentModal) {
        const content = `
            <div class="bulk-import-styles-container">
                <div id="bulkImportStylesList" class="bulk-import-styles-list">
                    ${this.renderStylesList()}
                </div>
                <div style="margin-top: 10px;">
                    <button id="bulkImportAddStyleBtn" class="bulk-import-btn bulk-import-btn-secondary">
                        ➕ Добавить стиль
                    </button>
                </div>
            </div>
        `;

        const overlay = document.createElement('div');
        overlay.classList.add('bulk-import-overlay');
        document.body.appendChild(overlay);

        const modal = document.createElement('div');
        modal.classList.add('bulk-import-styles-modal');
        modal.innerHTML = `
            <div class="bulk-import-header">
                <h3>Управление стилями</h3>
                <button class="bulk-import-close">&times;</button>
            </div>
            <div class="bulk-import-styles-body">${content}</div>
            <div class="bulk-import-styles-footer">
                <button id="bulkImportStylesCancelBtn" class="bulk-import-btn bulk-import-btn-secondary">Отмена</button>
                <button id="bulkImportStylesSaveBtn" class="bulk-import-btn bulk-import-btn-success">Сохранить</button>
            </div>
        `;

        document.body.appendChild(modal);
        overlay.classList.add('active');

        this.makeDraggable(modal, modal.querySelector('.bulk-import-header'));

        // Закрытие
        modal.querySelector('.bulk-import-close').addEventListener('click', () => {
            modal.remove();
            overlay.remove();
        });

        modal.querySelector('#bulkImportStylesCancelBtn').addEventListener('click', () => {
            modal.remove();
            overlay.remove();
        });

        modal.querySelector('#bulkImportStylesSaveBtn').addEventListener('click', () => {
            this.saveStyles();
            // Обновляем выпадающий список в родительском окне
            const styleSelect = parentModal.querySelector('#bulkImportStyleSelect');
            if (styleSelect) {
                styleSelect.innerHTML = this.renderStyleOptions();
            }
            modal.remove();
            overlay.remove();
        });

        modal.querySelector('#bulkImportAddStyleBtn').addEventListener('click', () => {
            this.addStyleRow(modal);
        });

        this.setupStyleItemEvents(modal);
    }

    renderStylesList() {
        return this.styles.map(style => `
            <div class="bulk-import-style-item ${style.isDefault ? 'default-style' : ''}" data-id="${style.id}">
                <input type="text" class="bulk-import-input bulk-style-name" 
                       value="${this.escapeHtml(style.name)}" 
                       placeholder="Название стиля" ${style.isDefault ? 'readonly' : ''}>
                <input type="text" class="bulk-import-input bulk-style-marker-name" 
                       value="${this.escapeHtml(style.markerName)}" 
                       placeholder="Название метки">
                <select class="bulk-import-select bulk-style-type">
                    ${this.renderTypeOptions(style.type)}
                </select>
                <div class="bulk-import-color-wrapper">
                    <input type="color" class="bulk-import-color bulk-style-color" value="${this.rgbToHex(style.color)}">
                </div>
                ${style.isDefault ? '' : `<button class="bulk-import-btn bulk-import-btn-icon bulk-import-btn-danger bulk-style-delete" title="Удалить">🗑️</button>`}
            </div>
        `).join('');
    }

    addStyleRow(modal) {
        const container = modal.querySelector('#bulkImportStylesList');
        const newStyle = {
            id: 'new_' + Date.now(),
            name: 'Новый стиль',
            markerName: '',
            type: 'default',
            color: this.defaultColor,
            isDefault: false
        };

        const html = `
            <div class="bulk-import-style-item" data-id="${newStyle.id}">
                <input type="text" class="bulk-import-input bulk-style-name" 
                       value="${newStyle.name}" 
                       placeholder="Название стиля">
                <input type="text" class="bulk-import-input bulk-style-marker-name" 
                       value="${newStyle.markerName}" 
                       placeholder="Название метки">
                <select class="bulk-import-select bulk-style-type">
                    ${this.renderTypeOptions(newStyle.type)}
                </select>
                <div class="bulk-import-color-wrapper">
                    <input type="color" class="bulk-import-color bulk-style-color" value="${this.rgbToHex(newStyle.color)}">
                </div>
                <button class="bulk-import-btn bulk-import-btn-icon bulk-import-btn-danger bulk-style-delete" title="Удалить">🗑️</button>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', html);
        this.setupStyleItemEvents(modal);
    }

    setupStyleItemEvents(modal) {
        modal.querySelectorAll('.bulk-import-style-item').forEach(item => {
            const id = item.dataset.id;
            const nameInput = item.querySelector('.bulk-style-name');
            const markerNameInput = item.querySelector('.bulk-style-marker-name');
            const typeSelect = item.querySelector('.bulk-style-type');
            const colorInput = item.querySelector('.bulk-style-color');
            const deleteBtn = item.querySelector('.bulk-style-delete');

            // Флаг что стиль уже добавлен в массив
            let isAdded = this.styles.find(s => s.id === id) !== undefined;

            // Обновление стиля
            const updateStyle = () => {
                const existingStyle = this.styles.find(s => s.id === id);
                if (existingStyle) {
                    // Обновляем существующий
                    existingStyle.name = nameInput.value;
                    existingStyle.markerName = markerNameInput.value;
                    existingStyle.type = typeSelect.value;
                    existingStyle.color = this.hexToRgb(colorInput.value);
                    this.saveStyles();
                } else if (!isAdded) {
                    // Добавляем новый (только один раз)
                    isAdded = true;
                    this.addStyle({
                        id: id,
                        name: nameInput.value,
                        markerName: markerNameInput.value,
                        type: typeSelect.value,
                        color: this.hexToRgb(colorInput.value),
                        isDefault: false
                    });
                }
            };

            nameInput.addEventListener('input', updateStyle);
            markerNameInput.addEventListener('input', updateStyle);
            typeSelect.addEventListener('change', updateStyle);
            colorInput.addEventListener('input', updateStyle);

            // Удаление
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    this.deleteStyle(id);
                    item.remove();
                });
            }
        });
    }

    // ========================================
    // Утилиты
    // ========================================

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    rgbToHex(color) {
        if (!color) return this.defaultColor;
        if (typeof color !== 'string') {
            // Если это объект {r, g, b}
            if (color.r !== undefined) {
                return this.rgbObjectToHex(color);
            }
            return this.defaultColor;
        }
        if (color.startsWith('#')) return color;
        
        // Парсим rgb(r, g, b)
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
            const r = parseInt(match[1]).toString(16).padStart(2, '0');
            const g = parseInt(match[2]).toString(16).padStart(2, '0');
            const b = parseInt(match[3]).toString(16).padStart(2, '0');
            return `#${r}${g}${b}`;
        }
        
        return this.defaultColor;
    }

    rgbObjectToHex(rgb) {
        const r = rgb.r.toString(16).padStart(2, '0');
        const g = rgb.g.toString(16).padStart(2, '0');
        const b = rgb.b.toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
    }

    hexToRgb(hex) {
        if (!hex) return this.defaultColor;
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : this.defaultColor;
    }

    rgbToString(rgb) {
        if (!rgb) return this.defaultColor;
        if (typeof rgb === 'string') return rgb;
        if (rgb.r !== undefined && rgb.g !== undefined && rgb.b !== undefined) {
            return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        }
        return this.defaultColor;
    }
}

// Экспортируем класс (для совместимости)
if (typeof window !== 'undefined') {
    window.BulkImportManager = BulkImportManager;
}
