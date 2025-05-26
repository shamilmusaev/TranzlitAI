// Для совместимости с Firefox и Chrome
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Элементы DOM
const sourceText = document.getElementById('sourceText');
const sourceLanguage = document.getElementById('sourceLanguage');
const targetLanguage = document.getElementById('targetLanguage');
const swapLanguagesButton = document.getElementById('swapLanguagesButton'); // Новая кнопка
const deepseekButton = document.getElementById('deepseekButton'); // Новая кнопка
const openrouterButton = document.getElementById('openrouterButton'); // Новая кнопка
const chatgptButton = document.getElementById('chatgptButton'); // Новая кнопка для ChatGPT
const providerButtons = [deepseekButton, openrouterButton, chatgptButton]; // Массив кнопок провайдеров
const openrouterModelContainer = document.getElementById('openrouterModelContainer');
const chatgptContainer = document.getElementById('chatgptContainer'); // Новый контейнер для ChatGPT
const chatgptModelSelect = document.getElementById('chatgptModelSelect'); // Селектор моделей ChatGPT
const translateButton = document.getElementById('translateButton');
const translatedText = document.getElementById('translatedText');
const copyButton = document.getElementById('copyButton');
const pasteButton = document.getElementById('pasteButton'); // Новая кнопка paste
const settingsButton = document.getElementById('settingsButton'); // Новая кнопка настроек

// Элементы для управления моделями OpenRouter
const openrouterModelInput = document.getElementById('openrouterModelInput');
const openrouterModelDropdown = document.getElementById('openrouterModelDropdown');
const openrouterModelDropdownArrow = document.getElementById('openrouterModelDropdownArrow'); 
let openRouterModels = [];
let selectedOpenRouterModel = '';
let currentProvider = 'deepseek'; // Провайдер по умолчанию
let selectedChatGPTModel = 'gpt-4.1-nano'; // Модель ChatGPT по умолчанию

// Массив актуальных моделей ChatGPT
const chatgptModels = [
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
  { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
];

// Функция для заполнения <select> опциями
function renderChatGPTModels() {
  // Очищаем старые опции
  chatgptModelSelect.innerHTML = '';

  chatgptModels.forEach(({ value, label }) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    // Выбираем опцию по умолчанию
    if (value === selectedChatGPTModel) {
      option.selected = true;
    }
    chatgptModelSelect.appendChild(option);
  });
}

// Загрузка настроек и моделей при открытии popup
document.addEventListener('DOMContentLoaded', async () => {
    // Проверяем, нужно ли показать окно приветствия
    const welcomeData = await browserAPI.storage.local.get(['welcomeCompleted']);
    
    if (!welcomeData.welcomeCompleted) {
        // Если приветствие не было показано, перенаправляем на страницу приветствия
        window.location.href = 'welcome.html';
        return;
    }
    
    // Рендерим модели ChatGPT
    renderChatGPTModels();
    
    const data = await browserAPI.storage.local.get([
        'defaultProvider',
        'defaultTargetLanguage',
        'openRouterModels',
        'selectedOpenRouterModel',
        'selectedChatGPTModel', // Добавляем сохраненную модель ChatGPT
        'sourceLanguage',
        'targetLanguage',
        'chatgptApiKey' // Добавляем API ключ для ChatGPT
    ]);

    // Устанавливаем значения по умолчанию для провайдера
    if (data.defaultProvider) {
        currentProvider = data.defaultProvider;
    } // currentProvider уже 'deepseek' по умолчанию
    updateProviderUI(currentProvider);
    setActiveProviderButton(currentProvider);

    // Загружаем модели OpenRouter
    if (data.openRouterModels) {
        openRouterModels = data.openRouterModels;
    }
    if (data.selectedOpenRouterModel) {
        selectedOpenRouterModel = data.selectedOpenRouterModel;
        openrouterModelInput.value = selectedOpenRouterModel; 
    } else if (openRouterModels.length > 0) {
        selectedOpenRouterModel = openRouterModels[0];
        openrouterModelInput.value = selectedOpenRouterModel;
    }

    // Загружаем выбранную модель ChatGPT
    if (data.selectedChatGPTModel) {
        selectedChatGPTModel = data.selectedChatGPTModel;
        // Обновляем селектор с учетом сохраненной модели
        renderChatGPTModels();
    }

    // Загружаем настройки языков
    if (data.sourceLanguage) {
        sourceLanguage.value = data.sourceLanguage;
    }
    if (data.defaultTargetLanguage) {
        targetLanguage.value = data.defaultTargetLanguage;
    }
    else if (data.targetLanguage) {
        targetLanguage.value = data.targetLanguage;
    }

    renderOpenRouterModels();
});

// Обработчик изменения провайдера
providerButtons.forEach(button => {
    button.addEventListener('click', () => {
        const provider = button.dataset.provider;
        currentProvider = provider;
        updateProviderUI(provider);
        setActiveProviderButton(provider);
        browserAPI.storage.local.set({ defaultProvider: provider });
    });
});

function setActiveProviderButton(provider) {
    providerButtons.forEach(btn => {
        if (btn.dataset.provider === provider) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Обновление UI в зависимости от выбранного провайдера
function updateProviderUI(provider) {
    // Скрываем все контейнеры сначала
    openrouterModelContainer.style.display = 'none';
    chatgptContainer.style.display = 'none';
    
    // Показываем только нужный контейнер
    if (provider === 'openrouter') {
        openrouterModelContainer.style.display = 'block';
    } else if (provider === 'chatgpt') {
        chatgptContainer.style.display = 'block';
    }
}

// Сохранение выбранных языков
sourceLanguage.addEventListener('change', () => {
    browserAPI.storage.local.set({ sourceLanguage: sourceLanguage.value });
});

targetLanguage.addEventListener('change', () => {
    browserAPI.storage.local.set({ defaultTargetLanguage: targetLanguage.value });
});

// Обработчик для кнопки смены языков
swapLanguagesButton.addEventListener('click', () => {
    const sourceLangValue = sourceLanguage.value;
    const targetLangValue = targetLanguage.value;

    if (sourceLangValue === 'auto') { // Нельзя поменять "Автоопределение" на целевой
        // Можно добавить уведомление пользователю
        console.warn("Cannot swap 'auto' with target language. Please select a specific source language first.");
        return;
}

    sourceLanguage.value = targetLangValue;
    targetLanguage.value = sourceLangValue;

    // Сохраняем изменения в хранилище
    browserAPI.storage.local.set({
        sourceLanguage: sourceLanguage.value,
        defaultTargetLanguage: targetLanguage.value
    });
});

// Заменяем обработчик для кнопки настроек
settingsButton.addEventListener('click', () => {
    // Открываем модальное окно настроек
    // Проверяем существует ли уже модальное окно
    let settingsModal = document.getElementById('settingsModal');
    
    if (!settingsModal) {
        // Создаем модальное окно, если его нет
        settingsModal = document.createElement('div');
        settingsModal.id = 'settingsModal';
        settingsModal.className = 'modal';
        
        // Добавляем содержимое модального окна
        settingsModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Настройки</h2>
                    <button class="close-button">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="settings-tabs">
                        <button class="tab-button active" data-tab="general">Основные</button>
                        <button class="tab-button" data-tab="api">API ключи</button>
                        <button class="tab-button" data-tab="logs">Логи</button>
                    </div>
                    
                    <!-- Основные настройки -->
                    <div class="settings-section active" id="general-tab">
                        <h3>Основные настройки</h3>
                        <div class="settings-option">
                            <label for="defaultTargetLanguage">Язык перевода по умолчанию:</label>
                            <select id="defaultTargetLanguage">
                                <option value="ru">Русский</option>
                                <option value="en">Английский</option>
                                <!-- Другие языки -->
                            </select>
                        </div>
                        <div class="settings-option">
                            <label>Интерфейс:</label>
                            <button id="resetWelcomeButton" class="reset-welcome-button">Показать приветствие заново</button>
                        </div>
                    </div>
                    
                    <!-- API настройки -->
                    <div class="settings-section" id="api-tab">
                        <h3>API настройки</h3>
                        <div class="settings-option">
                            <label for="deepseekApiKey">DeepSeek API ключ:</label>
                            <input type="password" id="deepseekApiKey" placeholder="Введите API ключ">
                        </div>
                        <div class="settings-option">
                            <label for="openrouterApiKey">OpenRouter API ключ:</label>
                            <input type="password" id="openrouterApiKey" placeholder="Введите API ключ">
                        </div>
                        <div class="settings-option">
                            <label for="chatgptApiKey">OpenAI API ключ:</label>
                            <input type="password" id="chatgptApiKey" placeholder="Введите API ключ">
                        </div>
                    </div>
                    
                    <!-- Логи -->
                    <div class="settings-section" id="logs-tab">
                        <h3>Логи</h3>
                        <div class="logs-container">
                            <div class="logs-header">
                                <button id="clearLogsButton" class="clear-logs-button">Очистить логи</button>
                                <button id="refreshLogsButton" class="refresh-logs-button">Обновить</button>
                            </div>
                            <div id="logsContent" class="logs-content">
                                <p class="loading-logs">Загрузка логов...</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="saveSettingsButton" class="save-button">Сохранить</button>
                </div>
            </div>
        `;
        
        // Добавляем модальное окно в DOM
        document.body.appendChild(settingsModal);
        
        // Обработчик для закрытия модального окна
        const closeButton = settingsModal.querySelector('.close-button');
        closeButton.addEventListener('click', () => {
            settingsModal.style.display = 'none';
        });
        
        // Обработчик для сохранения настроек
        const saveSettingsButton = settingsModal.querySelector('#saveSettingsButton');
        saveSettingsButton.addEventListener('click', async () => {
            // Получаем значения полей
            const defaultTargetLanguage = settingsModal.querySelector('#defaultTargetLanguage').value;
            const deepseekApiKey = settingsModal.querySelector('#deepseekApiKey').value;
            const openrouterApiKey = settingsModal.querySelector('#openrouterApiKey').value;
            const chatgptApiKey = settingsModal.querySelector('#chatgptApiKey').value;
            
            // Сохраняем в хранилище
            await browserAPI.storage.local.set({
                defaultTargetLanguage,
                deepseekApiKey,
                openrouterApiKey,
                chatgptApiKey
            });
            
            // Закрываем модальное окно после сохранения
            settingsModal.style.display = 'none';
            
            // Обновляем значения в UI, если необходимо
            if (defaultTargetLanguage) {
                targetLanguage.value = defaultTargetLanguage;
            }
        });
        
        // Загружаем сохраненные настройки в модальное окно
        (async () => {
            const data = await browserAPI.storage.local.get([
                'defaultTargetLanguage',
                'deepseekApiKey',
                'openrouterApiKey',
                'chatgptApiKey'
            ]);
            
            if (data.defaultTargetLanguage) {
                settingsModal.querySelector('#defaultTargetLanguage').value = data.defaultTargetLanguage;
            }
            if (data.deepseekApiKey) {
                settingsModal.querySelector('#deepseekApiKey').value = data.deepseekApiKey;
            }
            if (data.openrouterApiKey) {
                settingsModal.querySelector('#openrouterApiKey').value = data.openrouterApiKey;
            }
            if (data.chatgptApiKey) {
                settingsModal.querySelector('#chatgptApiKey').value = data.chatgptApiKey;
            }
        })();
        
        // Обработчик для табов настроек
        const tabButtons = settingsModal.querySelectorAll('.tab-button');
        const settingsSections = settingsModal.querySelectorAll('.settings-section');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Удаляем активный класс у всех кнопок и секций
                tabButtons.forEach(btn => btn.classList.remove('active'));
                settingsSections.forEach(section => section.classList.remove('active'));
                
                // Добавляем активный класс текущей кнопке
                button.classList.add('active');
                
                // Показываем соответствующую секцию
                const tabId = button.getAttribute('data-tab');
                document.getElementById(`${tabId}-tab`).classList.add('active');
                
                // Если выбрана вкладка логов, загружаем их
                if (tabId === 'logs') {
                    loadLogs();
                }
            });
        });
        
        // Функция загрузки логов
        async function loadLogs() {
            const logsContent = document.getElementById('logsContent');
            logsContent.innerHTML = '<p class="loading-logs">Загрузка логов...</p>';
            
            try {
                const result = await browserAPI.storage.local.get('logs');
                const logs = result.logs ? result.logs : [];
                
                if (logs.length === 0) {
                    logsContent.innerHTML = '<p class="no-logs">Логи отсутствуют</p>';
                    return;
                }
                
                // Форматируем логи
                let logsHtml = '<div class="logs-list">';
                logs.forEach(logEntry => {
                    const timestamp = new Date(logEntry.timestamp).toLocaleString();
                    const level = logEntry.level;
                    const message = logEntry.message;
                    const data = JSON.stringify(logEntry.data, null, 2);
                    
                    // Выбираем класс в зависимости от уровня лога
                    let levelClass = 'log-level-info';
                    if (level === 'ERROR') levelClass = 'log-level-error';
                    if (level === 'WARNING') levelClass = 'log-level-warning';
                    if (level === 'DEBUG') levelClass = 'log-level-debug';
                    
                    logsHtml += `
                        <div class="log-entry ${levelClass}">
                            <div class="log-timestamp">${timestamp}</div>
                            <div class="log-level">${level}</div>
                            <div class="log-message">${message}</div>
                            <div class="log-data">${data}</div>
                        </div>
                    `;
                });
                logsHtml += '</div>';
                
                logsContent.innerHTML = logsHtml;
            } catch (error) {
                console.error('Ошибка загрузки логов:', error);
                logsContent.innerHTML = `<p class="logs-error">Ошибка загрузки логов: ${error.message}</p>`;
            }
        }
        
        // Обработчик для кнопки очистки логов
        const clearLogsButton = settingsModal.querySelector('#clearLogsButton');
        clearLogsButton.addEventListener('click', async () => {
            if (confirm('Вы уверены, что хотите очистить все логи?')) {
                try {
                    await browserAPI.storage.local.set({ logs: [] });
                    loadLogs(); // Перезагружаем (пустые) логи
                    alert('Логи успешно очищены');
                } catch (error) {
                    console.error('Ошибка очистки логов:', error);
                    alert(`Ошибка очистки логов: ${error.message}`);
                }
            }
        });
        
        // Обработчик для кнопки обновления логов
        const refreshLogsButton = settingsModal.querySelector('#refreshLogsButton');
        refreshLogsButton.addEventListener('click', () => {
            loadLogs();
        });
        
        // Обработчик для кнопки сброса приветствия
        const resetWelcomeButton = settingsModal.querySelector('#resetWelcomeButton');
        resetWelcomeButton.addEventListener('click', async () => {
            if (confirm('Вы хотите снова показать окно приветствия при следующем открытии расширения?')) {
                try {
                    await browserAPI.storage.local.set({ welcomeCompleted: false });
                    alert('Окно приветствия будет показано при следующем открытии расширения');
                } catch (error) {
                    console.error('Ошибка сброса приветствия:', error);
                    alert(`Ошибка: ${error.message}`);
                }
            }
        });
    } else {
        // Модальное окно уже существует, просто показываем его
        // Обновляем сохраненные настройки перед показом
        (async () => {
            const data = await browserAPI.storage.local.get([
                'defaultTargetLanguage',
                'deepseekApiKey',
                'openrouterApiKey',
                'chatgptApiKey'
            ]);
            
            if (data.defaultTargetLanguage) {
                settingsModal.querySelector('#defaultTargetLanguage').value = data.defaultTargetLanguage;
            }
            if (data.deepseekApiKey) {
                settingsModal.querySelector('#deepseekApiKey').value = data.deepseekApiKey;
            }
            if (data.openrouterApiKey) {
                settingsModal.querySelector('#openrouterApiKey').value = data.openrouterApiKey;
            }
            if (data.chatgptApiKey) {
                settingsModal.querySelector('#chatgptApiKey').value = data.chatgptApiKey;
            }
        })();
    }
    
    // Показываем модальное окно
    settingsModal.style.display = 'block';
});

// Убираем закрытие модального окна по клику вне элемента
// Теперь модальное окно закрывается только по кнопке "X" или "Сохранить"

// --- Логика управления моделями OpenRouter ---

// Рендер списка моделей в dropdown
function renderOpenRouterModels() {
    openrouterModelDropdown.innerHTML = ''; // Очищаем список
    if (openRouterModels.length === 0) {
        const noModelsItem = document.createElement('div');
        noModelsItem.classList.add('dropdown-item', 'no-models');
        noModelsItem.textContent = 'Модели не добавлены';
        openrouterModelDropdown.appendChild(noModelsItem);
    } else {
        openRouterModels.forEach(modelName => {
            const modelItem = document.createElement('div');
            modelItem.classList.add('dropdown-item');
            if (modelName === selectedOpenRouterModel) {
                modelItem.classList.add('selected');
            }

            const iconPlaceholder = document.createElement('span');
            iconPlaceholder.classList.add('model-icon-placeholder');
            // Сюда можно будет добавить логику для разных иконок
            // Пока простой кружок или первая буква
            iconPlaceholder.textContent = modelName.substring(0, 1).toUpperCase(); 

            const modelNameSpan = document.createElement('span');
            modelNameSpan.classList.add('model-name');
            modelNameSpan.textContent = modelName;
            
            modelItem.addEventListener('click', () => {
                selectOpenRouterModel(modelName);
                openrouterModelDropdown.style.display = 'none';
                openrouterModelDropdownArrow.textContent = '▼'; // Стрелка вниз при закрытии
            });

            const deleteButton = document.createElement('button');
            deleteButton.classList.add('delete-model-button');
            deleteButton.innerHTML = '&#x2715;'; // Крестик
            deleteButton.title = 'Удалить модель';
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Предотвращаем выбор модели при клике на удаление
                if (confirm(`Вы точно хотите удалить модель "${modelName}"?`)) {
                    deleteOpenRouterModel(modelName);
                }
            });

            modelItem.appendChild(iconPlaceholder);
            modelItem.appendChild(modelNameSpan);
            modelItem.appendChild(deleteButton);
            openrouterModelDropdown.appendChild(modelItem);
        });
    }
}

// Выбор модели OpenRouter
async function selectOpenRouterModel(modelName) {
    selectedOpenRouterModel = modelName;
    openrouterModelInput.value = modelName; // Обновляем значение в input
    await browserAPI.storage.local.set({ selectedOpenRouterModel: modelName });
    renderOpenRouterModels(); // Перерисовываем, чтобы отметить выбранную
    console.log("Selected OpenRouter Model:", modelName);
}

// Добавление новой модели OpenRouter
async function addOpenRouterModel(modelName) {
    modelName = modelName.trim();
    if (modelName && !openRouterModels.includes(modelName)) {
        openRouterModels.push(modelName);
        await browserAPI.storage.local.set({ openRouterModels: openRouterModels });
        if (!selectedOpenRouterModel) { // Если это первая добавленная модель, выбираем ее
            await selectOpenRouterModel(modelName);
        } else {
            renderOpenRouterModels(); // Просто обновляем список
        }
        return true; // Модель добавлена
    }
    return false; // Модель не добавлена (пустое имя или дубликат)
}

// Удаление модели OpenRouter
async function deleteOpenRouterModel(modelName) {
    openRouterModels = openRouterModels.filter(m => m !== modelName);
    await browserAPI.storage.local.set({ openRouterModels: openRouterModels });

    if (selectedOpenRouterModel === modelName) { // Если удаляемая модель была выбрана
        if (openRouterModels.length > 0) {
            await selectOpenRouterModel(openRouterModels[0]); // Выбираем первую из оставшихся
        } else {
            selectedOpenRouterModel = ''; // Сбрасываем выбор
            openrouterModelInput.value = ''; // Очищаем input
            await browserAPI.storage.local.remove('selectedOpenRouterModel');
        }
    }
    renderOpenRouterModels();
}

// Обработчики для input и dropdown моделей
openrouterModelInput.addEventListener('focus', () => {
    renderOpenRouterModels(); // Обновляем список при фокусе
    openrouterModelDropdown.style.display = 'block';
    openrouterModelDropdownArrow.textContent = '▲'; // Стрелка вверх при открытии
});

// Скрытие dropdown при клике вне его и вне input
document.addEventListener('click', (event) => {
    if (!openrouterModelContainer.contains(event.target)) {
        openrouterModelDropdown.style.display = 'none';
        openrouterModelDropdownArrow.textContent = '▼'; // Стрелка вниз при закрытии
    }
});


openrouterModelInput.addEventListener('input', async () => {
    const modelName = openrouterModelInput.value;
    // Пытаемся добавить модель "на лету".
    // Если модель с таким именем уже есть в списке openRouterModels,
    // то addOpenRouterModel вернет false и ничего не сделает.
    // Если это новое имя, модель добавится.
    // Это реализует "После ввода модель сразу добавляется в список"
    // Однако, чтобы пользователь мог "выбрать" существующую модель, начав её вводить,
    // мы не должны сразу выбирать её, если она уже есть.
    // Вместо этого, мы покажем её в dropdown.
    // Если пользователь закончил ввод и модель новая, она добавится и выберется.

    const potentialNewModelName = modelName.trim();
    if (potentialNewModelName && !openRouterModels.includes(potentialNewModelName)) {
        // Это новая модель, которую можно добавить
        // Чтобы не добавлять каждую букву как новую модель при вводе,
        // можно добавить небольшую задержку или добавлять при потере фокуса/нажатии Enter.
        // Но по ТЗ "После ввода модель сразу добавляется в список".
        // Это может привести к большому количеству моделей, если пользователь печатает по одной букве.
        // Пока реализуем строго по ТЗ.
        await addOpenRouterModel(potentialNewModelName);
        await selectOpenRouterModel(potentialNewModelName); // Сразу выбираем новую добавленную модель
    } else if (potentialNewModelName && openRouterModels.includes(potentialNewModelName)) {
        // Модель уже существует, просто обновим инпут и убедимся, что она выбрана
        // Это условие нужно, если пользователь вставил имя уже существующей модели
        if (selectedOpenRouterModel !== potentialNewModelName) {
             await selectOpenRouterModel(potentialNewModelName);
        }
    }


    // Показываем/обновляем dropdown, чтобы пользователь видел, что происходит
    renderOpenRouterModels();
    openrouterModelDropdown.style.display = 'block';
    openrouterModelDropdownArrow.textContent = '▲'; // Стрелка вверх, когда есть ввод и дропдаун открыт
});


// --- Конец логики управления моделями OpenRouter ---

// --- Логика перевода (адаптируем для поддержки ChatGPT) ---
async function translate() {
    const text = sourceText.value.trim();
    console.log('[DEBUG] Исходный текст для перевода:', text);
    if (!text) {
        console.warn('[DEBUG] Текст пустой, перевод не выполняется');
        return;
    }

    let provider = currentProvider;
    let model = '';
    console.log('[DEBUG] Выбранный провайдер:', provider);

    // Определяем, какую модель использовать в зависимости от провайдера
    if (provider === 'openrouter') {
        model = selectedOpenRouterModel;
        console.log('[DEBUG] OpenRouter модель:', model);
        if (!model) {
            showMessage('Пожалуйста, выберите или введите модель OpenRouter.', 'error');
            return;
        }
    } else if (provider === 'chatgpt') {
        model = selectedChatGPTModel;
        console.log('[DEBUG] ChatGPT модель:', model);
        
        // Проверяем, есть ли API ключ для ChatGPT
        const data = await browserAPI.storage.local.get(['chatgptApiKey']);
        if (!data.chatgptApiKey) {
            console.error('[DEBUG] API ключ для ChatGPT не установлен');
            showMessage('Пожалуйста, добавьте API ключ для ChatGPT в настройках.', 'error');
            // Открываем модальное окно настроек
            settingsButton.click();
            return;
        } else {
            console.log('[DEBUG] API ключ для ChatGPT установлен');
        }
    }

    console.log('[DEBUG] Начинаем перевод');
    translateButton.classList.add('loading');
    translateButton.disabled = true;
    translateButton.textContent = 'Переводим...';
    
    // Очищаем поле результата
    translatedText.value = '';
    translatedText.innerHTML = '';

    try {
        console.log('[DEBUG] Отправляем запрос на перевод в background.js:', {
            action: 'translate',
            text: text,
            sourceLang: sourceLanguage.value,
            targetLang: targetLanguage.value,
            provider: provider,
            model: model
        });
        
        const response = await browserAPI.runtime.sendMessage({
            action: 'translate',
            text: text,
            sourceLang: sourceLanguage.value,
            targetLang: targetLanguage.value,
            provider: provider,
            model: model
        });

        console.log('[DEBUG] Получен ответ от background.js:', response);

        if (response && response.success === false && response.error) {
            console.error('[DEBUG] Ошибка перевода:', response.error);
            translatedText.value = `Ошибка: ${response.error}`;
        } else if (response && response.success === true && response.translatedText) {
            console.log('[DEBUG] Перевод успешно получен:', response.translatedText);
            console.log('[DEBUG] Is HTML response:', response.isHTML);
            
            if (response.isHTML) {
                // Если это HTML, устанавливаем innerHTML и убираем стандартные стили textarea
                translatedText.style.whiteSpace = 'normal';
                translatedText.style.fontFamily = 'inherit';
                translatedText.innerHTML = response.translatedText;
                translatedText.setAttribute('data-html', 'true');
                // Также устанавливаем value для обратной совместимости с копированием
                translatedText.value = response.translatedText;
            } else {
                // Обычный текст
                translatedText.style.whiteSpace = '';
                translatedText.style.fontFamily = '';
            translatedText.value = response.translatedText;
                translatedText.innerHTML = '';
                translatedText.removeAttribute('data-html');
            }
        } else {
            console.error('[DEBUG] Получен некорректный ответ от background.js:', response);
            translatedText.value = 'Ошибка: Некорректный ответ от сервера';
        }
    } catch (err) {
        console.error('[DEBUG] Ошибка при отправке сообщения в background.js:', err);
        translatedText.value = `Ошибка связи с фоновым скриптом: ${err.message}`;
    } finally {
        console.log('[DEBUG] Завершаем перевод');
        translateButton.classList.remove('loading');
        translateButton.disabled = false;
        translateButton.textContent = 'Перевести';
    }
}

translateButton.addEventListener('click', translate);

// --- Логика копирования (проверяем, что работает как ожидается) ---
// Функция для показа сообщений пользователю
function showMessage(text, type = 'info', duration = 3000) {
    const messageArea = document.getElementById('messageArea');
    const messageText = document.getElementById('messageText');
    
    if (messageArea && messageText) {
        messageText.textContent = text;
        messageArea.className = `message-area ${type}`;
        messageArea.style.display = 'block';
        
        // Автоматически скрываем сообщение через указанное время
        setTimeout(() => {
            messageArea.style.display = 'none';
        }, duration);
    }
}

// Обработчик кнопки paste
pasteButton.addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText();
        if (text) {
            sourceText.value = text;
            // Визуальная обратная связь
            const originalButtonContent = pasteButton.innerHTML;
            pasteButton.innerHTML = '<img src="../icons/check-icon.svg" alt="Pasted">';
            setTimeout(() => {
                pasteButton.innerHTML = originalButtonContent;
            }, 1500);
            // Убрали сообщение об успешной вставке
        } else {
            showMessage('Буфер обмена пуст.', 'error');
        }
    } catch (err) {
        console.error('Ошибка вставки:', err);
        showMessage('Не удалось вставить текст из буфера обмена. Проверьте разрешения браузера.', 'error');
    }
});

copyButton.addEventListener('click', () => {
    const isHTML = translatedText.hasAttribute('data-html');
    let textToCopy;
    
    if (isHTML && translatedText.innerHTML) {
        // Для HTML получаем простой текст для лучшей совместимости
        textToCopy = translatedText.textContent || translatedText.innerText || translatedText.value;
    } else {
        // Для обычного текста
        textToCopy = translatedText.value;
    }
    
    if (textToCopy) {
        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                console.log('Перевод скопирован в буфер обмена');
                const originalButtonContent = copyButton.innerHTML;
                copyButton.innerHTML = '<img src="../icons/check-icon.svg" alt="Copied">';
    setTimeout(() => {
                    copyButton.innerHTML = originalButtonContent;
                }, 1500);
                // Убрали сообщение об успешном копировании
            })
            .catch(err => {
                console.error('Ошибка копирования:', err);
                showMessage('Не удалось скопировать текст.', 'error');
            });
    } else {
        showMessage('Нет текста для копирования.', 'error');
    }
});

// Сохранение настроек при изменении
targetLanguage.addEventListener('change', async () => {
    await browserAPI.storage.local.set({ defaultTargetLanguage: targetLanguage.value });
});

// Сохранение выбранной модели ChatGPT при изменении
chatgptModelSelect.addEventListener('change', () => {
    selectedChatGPTModel = chatgptModelSelect.value;
    browserAPI.storage.local.set({ selectedChatGPTModel });
});
