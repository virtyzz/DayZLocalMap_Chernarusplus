class RaceTimer {
    constructor() {
        this.races = [];
        this.activeRaceId = null;
        this.timers = {};
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.setupEventListeners();
        this.render();
        
        if (this.races.length === 0) {
            this.addRace();
        }
    }

    setupEventListeners() {
        document.getElementById('addTabBtn').addEventListener('click', () => this.addRace());
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    addRace() {
        const raceId = this.generateId();
        const race = {
            id: raceId,
            name: `Забег ${this.races.length + 1}`,
            laps: []
        };
        
        this.races.push(race);
        this.activeRaceId = raceId;
        this.saveToStorage();
        this.render();
    }

    deleteRace(raceId) {
        if (this.races.length <= 1) return;
        
        const raceIndex = this.races.findIndex(r => r.id === raceId);
        if (raceIndex > -1) {
            // Очищаем таймеры для этого забега
            this.races[raceIndex].laps.forEach(lap => {
                if (this.timers[lap.id]) {
                    clearInterval(this.timers[lap.id]);
                    delete this.timers[lap.id];
                }
            });
            
            this.races.splice(raceIndex, 1);
            
            if (this.activeRaceId === raceId) {
                this.activeRaceId = this.races[0]?.id || null;
            }
            
            this.saveToStorage();
            this.render();
        }
    }

    renameRace(raceId, newName) {
        const race = this.races.find(r => r.id === raceId);
        if (race) {
            race.name = newName;
            this.saveToStorage();
        }
    }

    setActiveRace(raceId) {
        this.activeRaceId = raceId;
        this.saveToStorage();
        this.render();
    }

    addLap(raceId) {
        const race = this.races.find(r => r.id === raceId);
        if (!race) return;

        const lapId = this.generateId();
        const lap = {
            id: lapId,
            number: race.laps.length + 1,
            time: 0,
            isRunning: false,
            comment: ''
        };

        race.laps.push(lap);
        this.saveToStorage();
        this.renderRaceContent(raceId);
    }

    deleteLap(raceId, lapId) {
        const race = this.races.find(r => r.id === raceId);
        if (!race) return;

        // Очищаем таймер для этого круга
        if (this.timers[lapId]) {
            clearInterval(this.timers[lapId]);
            delete this.timers[lapId];
        }

        const lapIndex = race.laps.findIndex(l => l.id === lapId);
        if (lapIndex > -1) {
            race.laps.splice(lapIndex, 1);
            // Перенумеровываем оставшиеся круги
            race.laps.forEach((lap, index) => {
                lap.number = index + 1;
            });
        }

        this.saveToStorage();
        this.renderRaceContent(raceId);
    }

    startPauseLap(raceId, lapId) {
        const race = this.races.find(r => r.id === raceId);
        if (!race) return;

        const lap = race.laps.find(l => l.id === lapId);
        if (!lap) return;

        if (lap.isRunning) {
            // Пауза
            lap.isRunning = false;
            if (this.timers[lapId]) {
                clearInterval(this.timers[lapId]);
                delete this.timers[lapId];
            }
        } else {
            // Старт
            lap.isRunning = true;
            const startTime = Date.now() - lap.time;
            
            this.timers[lapId] = setInterval(() => {
                lap.time = Date.now() - startTime;
                this.updateStopwatchDisplay(lapId, lap.time);
            }, 10);
        }

        this.saveToStorage();
        this.renderRaceContent(raceId);
    }

    stopLap(raceId, lapId) {
        const race = this.races.find(r => r.id === raceId);
        if (!race) return;

        const lap = race.laps.find(l => l.id === lapId);
        if (!lap) return;

        // Останавливаем таймер
        lap.isRunning = false;
        if (this.timers[lapId]) {
            clearInterval(this.timers[lapId]);
            delete this.timers[lapId];
        }

        // Сбрасываем время
        lap.time = 0;
        this.updateStopwatchDisplay(lapId, 0);
        this.saveToStorage();
        this.renderRaceContent(raceId);
    }

    setLapTime(raceId, lapId, timeInput) {
        const race = this.races.find(r => r.id === raceId);
        if (!race) return;

        const lap = race.laps.find(l => l.id === lapId);
        if (!lap) return;

        // Парсим время из формата ч:мм:сс
        const timeParts = timeInput.split(':');
        if (timeParts.length === 3) {
            const hours = parseInt(timeParts[0]) || 0;
            const minutes = parseInt(timeParts[1]) || 0;
            const seconds = parseInt(timeParts[2]) || 0;
            
            lap.time = (hours * 3600 + minutes * 60 + seconds) * 1000;
            
            // Обновляем отображение в любом случае
            this.updateStopwatchDisplay(lapId, lap.time);
            
            this.saveToStorage();
        }
    }

    updateComment(raceId, lapId, comment) {
        const race = this.races.find(r => r.id === raceId);
        if (!race) return;

        const lap = race.laps.find(l => l.id === lapId);
        if (!lap) return;

        lap.comment = comment;
        this.saveToStorage();
    }

    updateStopwatchDisplay(lapId, time) {
        const display = document.getElementById(`stopwatch-${lapId}`);
        if (display) {
            display.value = this.formatTime(time);
        }
    }

    formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    render() {
        this.renderTabs();
        this.renderContent();
    }

    renderTabs() {
        const tabsList = document.getElementById('tabsList');
        tabsList.innerHTML = '';

        this.races.forEach(race => {
            const tab = document.createElement('button');
            tab.className = `tab ${race.id === this.activeRaceId ? 'active' : ''}`;
            tab.dataset.raceId = race.id;
            
            const title = document.createElement('input');
            title.className = 'tab-title';
            title.type = 'text';
            title.value = race.name;
            title.addEventListener('click', (e) => e.stopPropagation());
            title.addEventListener('input', (e) => {
                this.renameRace(race.id, e.target.value);
            });
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-tab-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteRace(race.id);
            });
            
            tab.appendChild(title);
            if (this.races.length > 1) {
                tab.appendChild(deleteBtn);
            }
            tab.addEventListener('click', (e) => {
                if (e.target === tab) {
                    this.setActiveRace(race.id);
                }
            });
            
            tabsList.appendChild(tab);
        });
    }

    renderContent() {
        const tabsContent = document.getElementById('tabsContent');
        tabsContent.innerHTML = '';

        this.races.forEach(race => {
            const tabContent = document.createElement('div');
            tabContent.className = `tab-content ${race.id === this.activeRaceId ? 'active' : ''}`;
            tabContent.id = `race-content-${race.id}`;
            
            this.renderRaceContentInContainer(race, tabContent);
            tabsContent.appendChild(tabContent);
        });
    }

    renderRaceContent(raceId) {
        const race = this.races.find(r => r.id === raceId);
        if (!race) return;

        const container = document.getElementById(`race-content-${raceId}`);
        if (container) {
            this.renderRaceContentInContainer(race, container);
        }
    }

    renderRaceContentInContainer(race, container) {
        container.innerHTML = '';

        const controls = document.createElement('div');
        controls.className = 'race-controls';
        
        const addLapBtn = document.createElement('button');
        addLapBtn.className = 'add-lap-btn';
        addLapBtn.textContent = 'Добавить круг';
        addLapBtn.addEventListener('click', () => this.addLap(race.id));
        
        controls.appendChild(addLapBtn);
        container.appendChild(controls);

        if (race.laps.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <h3>Нет кругов</h3>
                <p>Нажмите "Добавить круг" чтобы начать</p>
            `;
            container.appendChild(emptyState);
        } else {
            const lapsContainer = document.createElement('div');
            lapsContainer.className = 'laps-container';
            
            race.laps.forEach(lap => {
                const lapCard = this.createLapCard(race.id, lap);
                lapsContainer.appendChild(lapCard);
            });
            
            container.appendChild(lapsContainer);
        }
    }

    createLapCard(raceId, lap) {
        const card = document.createElement('div');
        card.className = 'lap-card';
        if (lap.isRunning) {
            card.classList.add('active');
        }

        const header = document.createElement('div');
        header.className = 'lap-header';
        
        const title = document.createElement('div');
        title.className = 'lap-title';
        title.textContent = `Круг ${lap.number}`;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-lap-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.addEventListener('click', () => this.deleteLap(raceId, lap.id));
        
        header.appendChild(title);
        header.appendChild(deleteBtn);

        const stopwatchContainer = document.createElement('div');
        stopwatchContainer.className = 'stopwatch-container';
        
        const stopwatch = document.createElement('input');
        stopwatch.className = 'stopwatch-input';
        stopwatch.id = `stopwatch-${lap.id}`;
        stopwatch.value = this.formatTime(lap.time);
        stopwatch.maxLength = 6; // Максимальное количество цифр (ччммсс)
        stopwatch.addEventListener('input', (e) => {
            // Отключаем автоматическое форматирование при вводе
            // Пользователь вводит цифры, форматирование при Enter или blur
        });
        stopwatch.addEventListener('click', () => {
            stopwatch.select();
        });
        stopwatch.addEventListener('blur', (e) => {
            // Форматируем при потере фокуса
            const currentValue = e.target.value;
            const digitsOnly = currentValue.replace(/[^0-9]/g, '');
            
            let formattedValue = '00:00:00';
            if (digitsOnly.length > 0) {
                if (digitsOnly.length <= 2) {
                    const seconds = digitsOnly.padStart(2, '0');
                    formattedValue = `00:00:${seconds}`;
                } else if (digitsOnly.length <= 4) {
                    const minutes = digitsOnly.slice(0, -2).padStart(2, '0');
                    const seconds = digitsOnly.slice(-2).padStart(2, '0');
                    formattedValue = `00:${minutes}:${seconds}`;
                } else {
                    const hours = digitsOnly.slice(0, -4).padStart(2, '0');
                    const minutes = digitsOnly.slice(-4, -2).padStart(2, '0');
                    const seconds = digitsOnly.slice(-2).padStart(2, '0');
                    formattedValue = `${hours}:${minutes}:${seconds}`;
                }
            }
            
            e.target.value = formattedValue;
            this.setLapTime(raceId, lap.id, formattedValue);
        });
        stopwatch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                // Получаем текущее значение и форматируем его
                const currentValue = e.target.value;
                const digitsOnly = currentValue.replace(/[^0-9]/g, '');
                
                let formattedValue = '00:00:00';
                if (digitsOnly.length > 0) {
                    if (digitsOnly.length <= 2) {
                        const seconds = digitsOnly.padStart(2, '0');
                        formattedValue = `00:00:${seconds}`;
                    } else if (digitsOnly.length <= 4) {
                        const minutes = digitsOnly.slice(0, -2).padStart(2, '0');
                        const seconds = digitsOnly.slice(-2).padStart(2, '0');
                        formattedValue = `00:${minutes}:${seconds}`;
                    } else {
                        const hours = digitsOnly.slice(0, -4).padStart(2, '0');
                        const minutes = digitsOnly.slice(-4, -2).padStart(2, '0');
                        const seconds = digitsOnly.slice(-2).padStart(2, '0');
                        formattedValue = `${hours}:${minutes}:${seconds}`;
                    }
                }
                
                // Обновляем значение и применяем время
                e.target.value = formattedValue;
                this.setLapTime(raceId, lap.id, formattedValue);
                e.target.blur();
            }
        });

        const controls = document.createElement('div');
        controls.className = 'lap-controls';
        
        const startPauseBtn = document.createElement('button');
        startPauseBtn.className = `control-btn start-pause-btn ${!lap.isRunning ? 'paused' : ''}`;
        startPauseBtn.textContent = lap.isRunning ? 'Пауза' : 'Старт';
        startPauseBtn.addEventListener('click', () => this.startPauseLap(raceId, lap.id));
        
        const stopBtn = document.createElement('button');
        stopBtn.className = 'control-btn stop-btn';
        stopBtn.textContent = 'Стоп (обнулить)';
        stopBtn.addEventListener('click', () => this.stopLap(raceId, lap.id));
        
        controls.appendChild(startPauseBtn);
        controls.appendChild(stopBtn);

        const commentField = document.createElement('textarea');
        commentField.className = 'comment-field';
        commentField.placeholder = 'Комментарий...';
        commentField.value = lap.comment;
        commentField.addEventListener('input', (e) => {
            this.updateComment(raceId, lap.id, e.target.value);
        });

        stopwatchContainer.appendChild(stopwatch);
        card.appendChild(header);
        card.appendChild(stopwatchContainer);
        card.appendChild(controls);
        card.appendChild(commentField);

        return card;
    }

    handleTimeInput(e, raceId, lapId) {
        let value = e.target.value;
        
        // Удаляем все символы кроме цифр
        let digitsOnly = value.replace(/[^0-9]/g, '');
        
        // Форматируем в чч:мм:сс
        if (digitsOnly.length > 0) {
            let hours = '';
            let minutes = '';
            let seconds = '';
            
            if (digitsOnly.length <= 2) {
                // Только секунды
                seconds = digitsOnly.padStart(2, '0');
                value = `00:00:${seconds}`;
            } else if (digitsOnly.length <= 4) {
                // Минуты и секунды
                minutes = digitsOnly.slice(0, -2).padStart(2, '0');
                seconds = digitsOnly.slice(-2).padStart(2, '0');
                value = `00:${minutes}:${seconds}`;
            } else {
                // Часы, минуты и секунды
                hours = digitsOnly.slice(0, -4).padStart(2, '0');
                minutes = digitsOnly.slice(-4, -2).padStart(2, '0');
                seconds = digitsOnly.slice(-2).padStart(2, '0');
                value = `${hours}:${minutes}:${seconds}`;
            }
        } else {
            value = '00:00:00';
        }
        
        // Обновляем значение в поле
        e.target.value = value;
        
        // Обновляем время в реальном времени
        this.setLapTime(raceId, lapId, value);
    }

    saveToStorage() {
        const data = {
            races: this.races,
            activeRaceId: this.activeRaceId
        };
        localStorage.setItem('raceTimerData', JSON.stringify(data));
    }

    loadFromStorage() {
        const saved = localStorage.getItem('raceTimerData');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.races = data.races || [];
                this.activeRaceId = data.activeRaceId;
                
                // Восстанавливаем состояние таймеров (не запускаем их автоматически)
                this.races.forEach(race => {
                    race.laps.forEach(lap => {
                        lap.isRunning = false; // Все таймеры останавливаются при загрузке
                    });
                });
            } catch (e) {
                console.error('Error loading data from storage:', e);
            }
        }
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new RaceTimer();
});
