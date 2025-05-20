// Для совместимости с Firefox и Chrome
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Элементы DOM
const sourceText = document.getElementById('sourceText');
const sourceLanguage = document.getElementById('sourceLanguage');
const targetLanguage = document.getElementById('targetLanguage');
const swapLanguagesButton = document.getElementById('swapLanguagesButton'); // Новая кнопка
const deepseekButton = document.getElementById('deepseekButton'); // Новая кнопка
const openrouterButton = document.getElementById('openrouterButton'); // Новая кнопка
const providerButtons = [deepseekButton, openrouterButton]; // Массив кнопок провайдеров
const openrouterModelContainer = document.getElementById('openrouterModelContainer');
const translateButton = document.getElementById('translateButton');
const translatedText = document.getElementById('translatedText');
const copyButton = document.getElementById('copyButton');
const loadingIndicator = document.querySelector('.loading-indicator'); // Убедимся, что класс .loading-indicator еще используется или обновим
const settingsButton = document.getElementById('settingsButton'); // Новая кнопка настроек

// Новые элементы для управления моделями OpenRouter
const openrouterModelInput = document.getElementById('openrouterModelInput');
const openrouterModelDropdown = document.getElementById('openrouterModelDropdown');
const openrouterModelDropdownArrow = document.getElementById('openrouterModelDropdownArrow'); 
let openRouterModels = [];
let selectedOpenRouterModel = '';
let currentProvider = 'deepseek'; // Провайдер по умолчанию

// Загрузка настроек и моделей при открытии popup
document.addEventListener('DOMContentLoaded', async () => {
    const data = await browserAPI.storage.local.get([
        'defaultProvider',
        'defaultTargetLanguage',
        'openRouterModels',
        'selectedOpenRouterModel',
        'sourceLanguage',
        'targetLanguage' // Загружаем сохраненные языки
    ]);

    // Устанавливаем значения по умолчанию для провайдера
    if (data.defaultProvider) {
        currentProvider = data.defaultProvider;
    } // currentProvider уже 'deepseek' по умолчанию
    updateProviderUI(currentProvider);
    setActiveProviderButton(currentProvider);

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

    if (data.sourceLanguage) { // Загружаем сохраненный исходный язык
        sourceLanguage.value = data.sourceLanguage;
    }
    if (data.defaultTargetLanguage) { // Используем defaultTargetLanguage для целевого языка
        targetLanguage.value = data.defaultTargetLanguage;
    }
    // Если в хранилище есть targetLanguage (старое название), используем его, если нет defaultTargetLanguage
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
    openrouterModelContainer.style.display = provider === 'openrouter' ? 'block' : 'none';
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
                    <!-- Настройки будут добавлены здесь -->
                    <div class="settings-section">
                        <h3>Основные настройки</h3>
                        <div class="settings-option">
                            <label for="defaultTargetLanguage">Язык перевода по умолчанию:</label>
                            <select id="defaultTargetLanguage">
                                <option value="ru">Русский</option>
                                <option value="en">Английский</option>
                                <!-- Другие языки -->
                            </select>
                        </div>
                    </div>
                    <div class="settings-section">
                        <h3>API настройки</h3>
                        <div class="settings-option">
                            <label for="deepseekApiKey">DeepSeek API ключ:</label>
                            <input type="password" id="deepseekApiKey" placeholder="Введите API ключ">
                        </div>
                        <div class="settings-option">
                            <label for="openrouterApiKey">OpenRouter API ключ:</label>
                            <input type="password" id="openrouterApiKey" placeholder="Введите API ключ">
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
            
            // Сохраняем в хранилище
            await browserAPI.storage.local.set({
                defaultTargetLanguage,
                deepseekApiKey,
                openrouterApiKey
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
                'openrouterApiKey'
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
        })();
    } else {
        // Модальное окно уже существует, просто показываем его
        // Обновляем сохраненные настройки перед показом
        (async () => {
            const data = await browserAPI.storage.local.get([
                'defaultTargetLanguage',
                'deepseekApiKey',
                'openrouterApiKey'
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
        })();
    }
    
    // Показываем модальное окно
    settingsModal.style.display = 'block';
});

// Закрытие модального окна при клике вне его
document.addEventListener('click', (event) => {
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal && event.target === settingsModal) {
        settingsModal.style.display = 'none';
    }
});

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

// --- Логика перевода (адаптируем получение провайдера) ---
async function translate() {
    const text = sourceText.value.trim();
    if (!text) return;

    let provider = currentProvider; // Используем currentProvider
    let model = '';

    if (provider === 'openrouter') {
        model = selectedOpenRouterModel;
        if (!model) {
            alert('Пожалуйста, выберите или введите модель OpenRouter.');
            return;
        }
    }

    loadingIndicator.style.display = 'flex';
    translatedText.value = '';

    try {
        const response = await browserAPI.runtime.sendMessage({
            action: 'translate',
            text: text,
            sourceLang: sourceLanguage.value,
            targetLang: targetLanguage.value,
            provider: provider,
            model: model
        });

        if (response.error) {
            translatedText.value = `Ошибка: ${response.error}`;
            console.error('Translation error:', response.errorDetails);
        } else {
            translatedText.value = response.translation;
        }
    } catch (err) {
        console.error('Error sending message to background:', err);
        translatedText.value = `Ошибка связи с фоновым скриптом: ${err.message}`;
    }

    loadingIndicator.style.display = 'none';
}

translateButton.addEventListener('click', translate);

// --- Логика копирования (проверяем, что работает как ожидается) ---
copyButton.addEventListener('click', () => {
    if (translatedText.value) {
        navigator.clipboard.writeText(translatedText.value)
            .then(() => {
                // Можно добавить визуальную обратную связь (например, текст "Скопировано!")
                console.log('Перевод скопирован в буфер обмена');
                 // Просто для примера, можно сделать более заметное уведомление
                const originalButtonContent = copyButton.innerHTML;
                copyButton.innerHTML = '<img src="../icons/check-icon.svg" alt="Copied">'; // Предполагаем, что есть check-icon.svg
                setTimeout(() => {
                    copyButton.innerHTML = originalButtonContent;
                }, 1500);
            })
            .catch(err => {
                console.error('Ошибка копирования:', err);
                alert('Не удалось скопировать текст.');
            });
    }
});

// Сохранение настроек при изменении
targetLanguage.addEventListener('change', async () => {
    await browserAPI.storage.local.set({ defaultTargetLanguage: targetLanguage.value });
});

// Удаляем старый слушатель для openrouterModel, так как элемент удален
// openrouterModel.addEventListener('change', async () => {
// await browserAPI.storage.local.set({ defaultModel: openrouterModel.value });
// });

// Слушатель для defaultProvider уже есть и он корректен
// providerRadios.forEach(radio => {
// radio.addEventListener('change', async (e) => {
// await browserAPI.storage.local.set({ defaultProvider: e.target.value });
// });
// }); 
// }); 