/**
 * Менеджер профилей пользователей для DayZ карты
 * Отвечает за сохранение, загрузку и переключение между наборами меток
 */
class UserProfilesManager {
    constructor(dayzMapInstance) {
        this.dayzMap = dayzMapInstance;
        this.profilesData = null;
        this.currentProfile = null;
        this.storageKey = 'dayzMapProfiles';
        this.init();
    }

    /**
     * Инициализация менеджера профилей
     */
    init() {
        this.loadProfilesData();
        this.migrateOldDataIfNeeded();
        this.setupUI();
        // Загружаем текущий профиль после настройки UI
        this.loadCurrentProfile();
    }

    /**
     * Загрузка данных профилей из localStorage
     */
    loadProfilesData() {
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
            try {
                this.profilesData = JSON.parse(saved);
                console.log('Данные профилей загружены');
            } catch (e) {
                console.error('Ошибка загрузки данных профилей:', e);
                this.createDefaultProfilesData();
            }
        } else {
            console.log('Данные профилей не найдены, создаем по умолчанию');
            this.createDefaultProfilesData();
        }

        // Проверяем и восстанавливаем систему если нужно
        this.recoverProfilesSystem();
    }

    /**
     * Создание структуры данных профилей по умолчанию
     */
    createDefaultProfilesData() {
        this.profilesData = {
            currentProfile: 'default',
            defaultProfile: 'default',
            profiles: {
                'default': {
                    name: 'Профиль по умолчанию',
                    markers: [],
                    settings: {
                        markersVisible: true,
                        lastMarkerParams: {
                            text: 'Метка',
                            type: 'default',
                            color: '#3498db'
                        }
                    },
                    created: new Date().toISOString(),
                    modified: new Date().toISOString()
                }
            }
        };
        this.currentProfile = 'default';
        this.saveProfilesData();
    }

    /**
     * Восстановление системы после повреждения данных
     */
    recoverProfilesSystem() {
        console.log('Восстановление системы профилей...');

        // Если данных совсем нет, создаем заново
        if (!this.profilesData || !this.profilesData.profiles) {
            console.log('Данные профилей отсутствуют, создаем новые');
            this.createDefaultProfilesData();
            return;
        }

        // Если есть профили, но нет текущего или он не существует
        const availableProfiles = Object.keys(this.profilesData.profiles);
        if (availableProfiles.length === 0) {
            console.log('Профили отсутствуют, создаем профиль по умолчанию');
            this.createDefaultProfilesData();
            return;
        }

        // Если текущий профиль не существует, восстанавливаем его
        if (!this.currentProfile || !this.profilesData.profiles[this.currentProfile]) {
            // Сначала пробуем загрузить профиль по умолчанию (избранный)
            let profileToLoad = null;
            
            if (this.profilesData.defaultProfile && this.profilesData.profiles[this.profilesData.defaultProfile]) {
                profileToLoad = this.profilesData.defaultProfile;
                console.log('Восстановление избранного профиля:', profileToLoad);
            } else {
                // Если избранного нет, берем первый доступный
                profileToLoad = availableProfiles[0];
                console.log('Избранный профиль не найден, выбираем первый:', profileToLoad);
            }
            
            this.currentProfile = profileToLoad;
            this.profilesData.currentProfile = profileToLoad;

            // Если профиля по умолчанию нет, устанавливаем первый доступный
            if (!this.profilesData.defaultProfile || !this.profilesData.profiles[this.profilesData.defaultProfile]) {
                this.profilesData.defaultProfile = profileToLoad;
            }
        }

        this.saveProfilesData();
        console.log('Система профилей восстановлена');
    }

    /**
     * Назначение профиля по умолчанию
     */
    setDefaultProfile(profileId) {
        if (!this.profilesData.profiles[profileId]) {
            throw new Error('Профиль не найден');
        }

        // Просто сохраняем ID профиля по умолчанию
        this.profilesData.defaultProfile = profileId;

        this.saveProfilesData();
        this.updateProfilesUI();
        this.dayzMap.showSuccess(`Профиль "${this.profilesData.profiles[profileId].name}" назначен по умолчанию`);
    }

    /**
     * Загрузка текущего профиля
     */
    loadCurrentProfile() {
        if (this.currentProfile && this.profilesData.profiles[this.currentProfile]) {
            console.log(`Загрузка текущего профиля: ${this.currentProfile}`);
            this.loadProfile(this.currentProfile, true); // skipSave = true для начальной загрузки
        }
    }

    /**
     * Миграция старых данных в новый формат профилей
     */
    migrateOldDataIfNeeded() {
        const oldData = localStorage.getItem('dayzMapData');
        if (oldData && !this.profilesData.migrated) {
            try {
                const parsedOldData = JSON.parse(oldData);
                // Импортируем старые данные в профиль по умолчанию
                this.profilesData.profiles.default.markers = parsedOldData.markers || [];
                if (parsedOldData.settings) {
                    this.profilesData.profiles.default.settings = {
                        ...this.profilesData.profiles.default.settings,
                        ...parsedOldData.settings
                    };
                }
                this.profilesData.migrated = true;
                this.saveProfilesData();
                console.log('Старые данные успешно мигрированы в систему профилей');
            } catch (e) {
                console.error('Ошибка миграции старых данных:', e);
            }
        }
    }

    /**
     * Сохранение данных профилей в localStorage
     */
    saveProfilesData() {
        try {
            // Обновляем время модификации текущего профиля
            if (this.profilesData.profiles[this.currentProfile]) {
                this.profilesData.profiles[this.currentProfile].modified = new Date().toISOString();
            }
            
            localStorage.setItem(this.storageKey, JSON.stringify(this.profilesData));
        } catch (e) {
            console.error('Ошибка сохранения профилей:', e);
            this.dayzMap.showError('Ошибка сохранения профилей');
        }
    }

    /**
     * Получение списка профилей
     */
    getProfileList() {
        return Object.keys(this.profilesData.profiles).map(key => ({
            id: key,
            name: this.profilesData.profiles[key].name,
            markersCount: this.profilesData.profiles[key].markers.length,
            created: this.profilesData.profiles[key].created,
            modified: this.profilesData.profiles[key].modified,
            isCurrent: key === this.currentProfile
        }));
    }

    /**
     * Создание нового профиля
     */
    createProfile(name) {
        if (!name || name.trim() === '') {
            throw new Error('Имя профиля не может быть пустым');
        }

        const profileId = this.generateProfileId(name);
        
        if (this.profilesData.profiles[profileId]) {
            throw new Error('Профиль с таким именем уже существует');
        }

        this.profilesData.profiles[profileId] = {
            name: name.trim(),
            markers: [],
            settings: {
                markersVisible: true,
                lastMarkerParams: {
                    text: 'Метка',
                    type: 'default',
                    color: '#3498db'
                }
            },
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        };

        this.saveProfilesData();
        this.updateProfilesUI();
        return profileId;
    }

    /**
     * Сохранение текущего профиля
     */
    saveCurrentProfile() {
        if (!this.currentProfile) {
            throw new Error('Текущий профиль не найден');
        }

        if (!this.profilesData || !this.profilesData.profiles) {
            throw new Error('Данные профилей не инициализированы');
        }

        if (!this.profilesData.profiles[this.currentProfile]) {
            throw new Error('Текущий профиль не найден в данных');
        }

        // Получаем текущие метки из DayZMap
        const currentMarkers = this.dayzMap.markers.map(m => ({
            id: m.id,
            leafletLatLng: m.leafletLatLng,
            gameCoords: m.gameCoords,
            text: m.text,
            type: m.type,
            color: m.color,
            originalData: m.originalData
        }));

        this.profilesData.profiles[this.currentProfile].markers = currentMarkers;
        this.profilesData.profiles[this.currentProfile].settings = {
            markersVisible: this.dayzMap.markersVisible,
            lastMarkerParams: this.dayzMap.lastMarkerParams
        };

        this.profilesData.profiles[this.currentProfile].modified = new Date().toISOString();
        this.saveProfilesData();
        this.updateProfilesUI();
    }

    /**
     * Загрузка профиля
     */
    loadProfile(profileId, skipSave = false) {
        console.log(`Загрузка профиля: ${profileId}, skipSave: ${skipSave}`);
        
        if (!this.profilesData || !this.profilesData.profiles) {
            console.error('Данные профилей не инициализированы');
            this.recoverProfilesSystem();
            return;
        }
        
        if (!this.profilesData.profiles[profileId]) {
            console.error(`Профиль ${profileId} не найден`);
            console.error('Доступные профили:', Object.keys(this.profilesData.profiles));
            
            // Пытаемся восстановиться
            this.recoverProfilesSystem();
            throw new Error('Профиль не найден');
        }

        // Сохраняем текущие метки перед переключением (только если не начальная загрузка)
        if (!skipSave) {
            this.saveCurrentProfile();
        }

        // Переключаемся на новый профиль
        this.currentProfile = profileId;
        this.profilesData.currentProfile = profileId;

        // Загружаем метки из нового профиля
        const profileData = this.profilesData.profiles[profileId];
        console.log(`Загружаем ${profileData.markers ? profileData.markers.length : 0} меток из профиля "${profileData.name}"`);
        
        // Очищаем текущие метки
        this.dayzMap.markers.forEach(markerData => {
            this.dayzMap.map.removeLayer(markerData.marker);
            if (markerData.textLabel) {
                this.dayzMap.map.removeLayer(markerData.textLabel);
            }
        });
        this.dayzMap.markers = [];

        // Загружаем новые метки
        if (profileData.markers && profileData.markers.length > 0) {
            profileData.markers.forEach(savedMarkerData => {
                const leafletLatLng = L.latLng(
                    savedMarkerData.leafletLatLng.lat, 
                    savedMarkerData.leafletLatLng.lng
                );
                
                const color = savedMarkerData.color || this.dayzMap.getMarkerColor(savedMarkerData.type);
                const icon = this.dayzMap.createMarkerIcon(savedMarkerData.type, color, 1.0);

                const marker = L.marker(leafletLatLng, { icon: icon });

                // Создаем объект markerData ДО привязки обработчика
                const markerData = {
                    id: savedMarkerData.id,
                    marker: marker,
                    textLabel: null, // будет установлен ниже
                    leafletLatLng: leafletLatLng,
                    gameCoords: savedMarkerData.gameCoords,
                    text: savedMarkerData.text,
                    type: savedMarkerData.type,
                    color: savedMarkerData.color,
                    originalData: savedMarkerData.originalData
                };

                // Добавляем double-click обработчик ДО привязки popup
                marker.on('dblclick', (e) => {
                    e.originalEvent.preventDefault();
                    e.originalEvent.stopPropagation();
                    this.dayzMap.editMarker(markerData);
                });

                // Создаем popup для маркера
                marker.bindPopup(this.dayzMap.createMarkerPopup(savedMarkerData));

                // Используем правильный метод создания текстовой метки
                const textLabel = L.marker(leafletLatLng, {
                    icon: this.dayzMap.createTextLabel(savedMarkerData.text, savedMarkerData.color, 1.0),
                    interactive: false
                });

                // Обновляем textLabel в markerData
                markerData.textLabel = textLabel;

                // Добавляем метки на карту только если они видимы
                if (this.dayzMap.markersVisible) {
                    marker.addTo(this.dayzMap.map);
                    textLabel.addTo(this.dayzMap.map);
                }

                // Добавляем метку в массив (уже созданный выше)
                this.dayzMap.markers.push(markerData);
            });
        }

        console.log(`Загружено ${this.dayzMap.markers.length} меток в карту`);

        // Загружаем настройки
        if (profileData.settings) {
            this.dayzMap.markersVisible = profileData.settings.markersVisible !== undefined ? profileData.settings.markersVisible : true;
            
            if (profileData.settings.lastMarkerParams) {
                this.dayzMap.lastMarkerParams = profileData.settings.lastMarkerParams;
            }

            // Обновляем кнопку видимости меток
            const toggleBtn = document.getElementById('toggleMarkersBtn');
            if (toggleBtn) {
                toggleBtn.textContent = this.dayzMap.markersVisible ? 'Скрыть метки' : 'Показать метки';
            }

            // Обновляем видимость всех меток после загрузки
            this.dayzMap.markers.forEach(markerData => {
                if (this.dayzMap.markersVisible) {
                    if (!this.dayzMap.map.hasLayer(markerData.marker)) {
                        markerData.marker.addTo(this.dayzMap.map);
                    }
                    if (!this.dayzMap.map.hasLayer(markerData.textLabel)) {
                        markerData.textLabel.addTo(this.dayzMap.map);
                    }
                } else {
                    if (this.dayzMap.map.hasLayer(markerData.marker)) {
                        this.dayzMap.map.removeLayer(markerData.marker);
                    }
                    if (this.dayzMap.map.hasLayer(markerData.textLabel)) {
                        this.dayzMap.map.removeLayer(markerData.textLabel);
                    }
                }
            });
        }

        this.saveProfilesData();
        this.updateProfilesUI();
        this.dayzMap.updateMarkersList();
        
        if (!skipSave) {
            this.dayzMap.showSuccess(`Загружен профиль: ${profileData.name}`);
        }
    }

    /**
     * Удаление профиля
     */
    deleteProfile(profileId) {
        console.log(`Удаление профиля: ${profileId}`);
        
        if (profileId === 'default') {
            throw new Error('Нельзя удалить профиль по умолчанию');
        }

        if (!this.profilesData.profiles[profileId]) {
            console.error('Профиль не найден для удаления:', profileId);
            console.error('Доступные профили:', Object.keys(this.profilesData.profiles));
            throw new Error('Профиль не найден');
        }

        if (profileId === this.currentProfile) {
            // Переключаемся на профиль по умолчанию
            console.log('Переключение на профиль по умолчанию после удаления');
            
            // Очищаем текущие метки
            this.dayzMap.markers.forEach(markerData => {
                this.dayzMap.map.removeLayer(markerData.marker);
                if (markerData.textLabel) {
                    this.dayzMap.map.removeLayer(markerData.textLabel);
                }
            });
            this.dayzMap.markers = [];
            
            // Устанавливаем текущий профиль - профиль по умолчанию
            const newCurrentProfile = this.profilesData.defaultProfile || 'default';
            this.currentProfile = newCurrentProfile;
            this.profilesData.currentProfile = newCurrentProfile;
            console.log('Новый текущий профиль:', newCurrentProfile);
            
            // Загружаем метки из нового текущего профиля
            if (this.profilesData.profiles[this.currentProfile] && this.profilesData.profiles[this.currentProfile].markers) {
                const defaultMarkers = this.profilesData.profiles[this.currentProfile].markers;
                defaultMarkers.forEach(savedMarkerData => {
                    const leafletLatLng = L.latLng(
                        savedMarkerData.leafletLatLng.lat, 
                        savedMarkerData.leafletLatLng.lng
                    );
                    
                    const color = savedMarkerData.color || this.dayzMap.getMarkerColor(savedMarkerData.type);
                    const icon = this.dayzMap.createMarkerIcon(savedMarkerData.type, color, 1.0);

                    const marker = L.marker(leafletLatLng, { icon: icon });

                    // Создаем объект markerData ДО привязки обработчика
                    const markerData = {
                        id: savedMarkerData.id,
                        marker: marker,
                        textLabel: null, // будет установлен ниже
                        leafletLatLng: leafletLatLng,
                        gameCoords: savedMarkerData.gameCoords,
                        text: savedMarkerData.text,
                        type: savedMarkerData.type,
                        color: savedMarkerData.color,
                        originalData: savedMarkerData.originalData
                    };

                    // Добавляем double-click обработчик ДО привязки popup
                    marker.on('dblclick', (e) => {
                        e.originalEvent.preventDefault();
                        e.originalEvent.stopPropagation();
                        this.dayzMap.editMarker(markerData);
                    });

                    marker.bindPopup(this.dayzMap.createMarkerPopup(savedMarkerData));

                    const textLabel = L.marker(leafletLatLng, {
                        icon: this.dayzMap.createTextLabel(savedMarkerData.text, savedMarkerData.color, 1.0),
                        interactive: false
                    });

                    // Обновляем textLabel в markerData
                    markerData.textLabel = textLabel;

                    if (this.dayzMap.markersVisible) {
                        marker.addTo(this.dayzMap.map);
                        textLabel.addTo(this.dayzMap.map);
                    }

                    // Добавляем метку в массив (уже созданный выше)
                    this.dayzMap.markers.push(markerData);
                });
            }
        }

        // Если удаляем профиль по умолчанию, назначаем новый
        if (profileId === this.profilesData.defaultProfile) {
            const availableProfiles = Object.keys(this.profilesData.profiles).filter(id => id !== profileId);
            if (availableProfiles.length > 0) {
                this.profilesData.defaultProfile = availableProfiles[0];
                console.log('Новый профиль по умолчанию:', availableProfiles[0]);
                
                // Если текущий профиль был удален, переключаемся на новый профиль по умолчанию
                if (this.currentProfile === profileId) {
                    this.currentProfile = availableProfiles[0];
                    this.profilesData.currentProfile = availableProfiles[0];
                    console.log('Текущий профиль изменен на:', availableProfiles[0]);
                }
            } else {
                // Если это последний профиль, создаем новый default
                this.profilesData.defaultProfile = 'default';
                if (this.currentProfile === profileId) {
                    this.currentProfile = 'default';
                    this.profilesData.currentProfile = 'default';
                }
            }
        }

        delete this.profilesData.profiles[profileId];
        this.saveProfilesData();
        this.updateProfilesUI();
        console.log('Профиль успешно удален');
    }

    /**
     * Генерация ID профиля из имени
     */
    generateProfileId(name) {
        return name.toLowerCase()
            .replace(/[^a-zа-яё0-9\s]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 20);
    }

    /**
     * Настройка UI элементов
     */
    setupUI() {
        // Создаем контейнер для управления профилями
        const profilesContainer = document.createElement('div');
        profilesContainer.className = 'profiles-container';
        profilesContainer.innerHTML = `
            <div class="profiles-controls">
                <select id="profileSelector" title="Выбрать профиль">
                </select>
                <button id="setDefaultBtn" title="Сделать профиль по умолчанию">⭐</button>
                <button id="createProfileBtn" title="Создать новый профиль">➕</button>
                <button id="editProfileBtn" title="Редактировать имя профиля">✏️</button>
                <button id="deleteProfileBtn" title="Удалить профиль">🗑️</button>
            </div>
        `;

        // Вставляем в header перед controls
        const header = document.querySelector('.header');
        const controls = document.querySelector('.controls');
        header.insertBefore(profilesContainer, controls);

        // Добавляем обработчики событий
        document.getElementById('profileSelector').addEventListener('change', (e) => {
            const selectedProfileId = e.target.value;
            if (selectedProfileId && selectedProfileId !== this.currentProfile) {
                try {
                    this.loadProfile(selectedProfileId);
                } catch (error) {
                    this.dayzMap.showError(error.message);
                    // Восстанавливаем предыдущий выбор в селекторе
                    e.target.value = this.currentProfile;
                }
            }
        });

        document.getElementById('createProfileBtn').addEventListener('click', () => {
            this.showCreateProfileDialog();
        });

        document.getElementById('setDefaultBtn').addEventListener('click', () => {
            const currentProfileId = this.currentProfile;
            if (!this.profilesData.profiles[currentProfileId]) {
                this.dayzMap.showError('Текущий профиль не найден');
                return;
            }
            try {
                this.setDefaultProfile(currentProfileId);
            } catch (error) {
                this.dayzMap.showError(error.message);
            }
        });

        document.getElementById('editProfileBtn').addEventListener('click', () => {
            const currentProfileId = this.currentProfile;
            if (!this.profilesData.profiles[currentProfileId]) {
                this.dayzMap.showError('Текущий профиль не найден');
                return;
            }
            this.showEditProfileDialog();
        });

        document.getElementById('deleteProfileBtn').addEventListener('click', () => {
            const currentProfileId = this.currentProfile;
            if (!this.profilesData.profiles[currentProfileId]) {
                this.dayzMap.showError('Текущий профиль не найден');
                return;
            }
            
            if (currentProfileId === 'default') {
                this.dayzMap.showError('Нельзя удалить профиль по умолчанию');
                return;
            }
            
            const profileName = this.profilesData.profiles[currentProfileId].name;
            if (confirm(`Удалить профиль "${profileName}"?`)) {
                try {
                    this.deleteProfile(currentProfileId);
                    this.dayzMap.showSuccess('Профиль удален');
                } catch (error) {
                    this.dayzMap.showError(error.message);
                }
            }
        });

        this.updateProfilesUI();
    }

    /**
     * Обновление UI профилей
     */
    updateProfilesUI() {
        const selector = document.getElementById('profileSelector');
        if (!selector) {
            console.error('Селектор профилей не найден');
            return;
        }

        if (!this.profilesData || !this.profilesData.profiles) {
            console.error('Данные профилей не инициализированы');
            selector.innerHTML = '<option>Загрузка...</option>';
            return;
        }

        const profiles = this.getProfileList();
        console.log('Обновление UI профилей, текущий профиль:', this.currentProfile);
        console.log('Доступные профили:', profiles.map(p => p.id));
        
        selector.innerHTML = '';

        profiles.forEach(profile => {
            const option = document.createElement('option');
            option.value = profile.id;
            
            // Показываем звездочку для профиля по умолчанию
            const isDefault = profile.id === this.profilesData.defaultProfile;
            const defaultStar = isDefault ? '⭐ ' : '';
            option.textContent = `${defaultStar}${profile.name} (${profile.markersCount} меток)`;
            option.selected = profile.isCurrent;
            selector.appendChild(option);
        });

        console.log('Селектор профилей обновлен');
    }

    /**
     * Показать диалог редактирования профиля
     */
    showEditProfileDialog() {
        console.log('Попытка редактирования профиля:', this.currentProfile);
        
        const currentProfileData = this.profilesData.profiles[this.currentProfile];
        if (!currentProfileData) {
            console.error('Профиль не найден при редактировании:', this.currentProfile);
            console.error('Доступные профили:', Object.keys(this.profilesData.profiles));
            this.dayzMap.showError('Профиль не найден');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h3>Редактировать профиль</h3>
                <input type="text" id="editProfileName" value="${currentProfileData.name}" placeholder="Введите имя профиля" maxlength="30">
                <div style="margin-top: 15px;">
                    <button id="confirmEditProfile">Сохранить</button>
                    <button id="cancelEditProfile">Отмена</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const closeBtn = modal.querySelector('.close');
        const cancelBtn = document.getElementById('cancelEditProfile');
        const confirmBtn = document.getElementById('confirmEditProfile');
        const input = document.getElementById('editProfileName');

        const closeModal = () => {
            document.body.removeChild(modal);
        };

        closeBtn.onclick = closeModal;
        cancelBtn.onclick = closeModal;

        confirmBtn.onclick = () => {
            const newName = input.value.trim();
            try {
                this.renameProfile(this.currentProfile, newName);
                closeModal();
                this.dayzMap.showSuccess(`Профиль переименован в "${newName}"`);
            } catch (error) {
                this.dayzMap.showError(error.message);
            }
        };

        input.focus();
        input.select();
        input.onkeypress = (e) => {
            if (e.key === 'Enter') {
                confirmBtn.click();
            }
        };

        // Закрытие по клику вне модального окна
        modal.onclick = (e) => {
            if (e.target === modal) {
                closeModal();
            }
        };
    }

    /**
     * Переименование профиля
     */
    renameProfile(profileId, newName) {
        console.log(`Переименование профиля: ${profileId} -> ${newName}`);
        
        if (!newName || newName.trim() === '') {
            throw new Error('Имя профиля не может быть пустым');
        }

        if (!this.profilesData.profiles[profileId]) {
            console.error('Профиль не найден:', profileId);
            console.error('Доступные профили:', Object.keys(this.profilesData.profiles));
            throw new Error('Профиль не найден');
        }

        // Проверяем, что новое имя не занято (кроме текущего профиля)
        const existingProfileId = this.generateProfileId(newName);
        if (existingProfileId !== profileId && this.profilesData.profiles[existingProfileId]) {
            throw new Error('Профиль с таким именем уже существует');
        }

        // Если ID изменился, нужно перенести данные
        if (existingProfileId !== profileId) {
            this.profilesData.profiles[existingProfileId] = this.profilesData.profiles[profileId];
            this.profilesData.profiles[existingProfileId].name = newName.trim();
            delete this.profilesData.profiles[profileId];
            
            // Обновляем текущий профиль если нужно
            if (this.currentProfile === profileId) {
                this.currentProfile = existingProfileId;
                this.profilesData.currentProfile = existingProfileId;
            }
        } else {
            // Просто обновляем имя
            this.profilesData.profiles[profileId].name = newName.trim();
        }

        this.saveProfilesData();
        this.updateProfilesUI();
        console.log('Профиль успешно переименован');
    }

    /**
     * Показать диалог создания профиля
     */
    showCreateProfileDialog() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h3>Создать новый профиль</h3>
                <input type="text" id="newProfileName" placeholder="Введите имя профиля" maxlength="30">
                <div style="margin-top: 15px;">
                    <button id="confirmCreateProfile">Создать</button>
                    <button id="cancelCreateProfile">Отмена</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const closeBtn = modal.querySelector('.close');
        const cancelBtn = document.getElementById('cancelCreateProfile');
        const confirmBtn = document.getElementById('confirmCreateProfile');
        const input = document.getElementById('newProfileName');

        const closeModal = () => {
            document.body.removeChild(modal);
        };

        closeBtn.onclick = closeModal;
        cancelBtn.onclick = closeModal;

        confirmBtn.onclick = () => {
            const name = input.value.trim();
            try {
                const profileId = this.createProfile(name);
                this.loadProfile(profileId);
                closeModal();
                this.dayzMap.showSuccess(`Профиль "${name}" создан`);
            } catch (error) {
                this.dayzMap.showError(error.message);
            }
        };

        input.focus();
        input.onkeypress = (e) => {
            if (e.key === 'Enter') {
                confirmBtn.click();
            }
        };

        // Закрытие по клику вне модального окна
        modal.onclick = (e) => {
            if (e.target === modal) {
                closeModal();
            }
        };
    }
}
