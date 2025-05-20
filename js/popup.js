// Для совместимости с Firefox и Chrome
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Элементы DOM
const sourceText = document.getElementById('sourceText');
const sourceLanguage = document.getElementById('sourceLanguage');
const targetLanguage = document.getElementById('targetLanguage');
const providerRadios = document.getElementsByName('provider');
const openrouterModelContainer = document.getElementById('openrouterModelContainer');
// const openrouterModel = document.getElementById('openrouterModel'); // Удалено, будет заменено openrouterModelInput
const translateButton = document.getElementById('translateButton');
const translatedText = document.getElementById('translatedText');
const copyButton = document.getElementById('copyButton');
const loadingIndicator = document.querySelector('.loading-indicator');

// Новые элементы для управления моделями OpenRouter
const openrouterModelInput = document.getElementById('openrouterModelInput');
const openrouterModelDropdown = document.getElementById('openrouterModelDropdown');
const openrouterModelDropdownArrow = document.getElementById('openrouterModelDropdownArrow'); // Элемент стрелки
let openRouterModels = [];
let selectedOpenRouterModel = '';

// Загрузка настроек и моделей при открытии popup
document.addEventListener('DOMContentLoaded', async () => {
    const data = await browserAPI.storage.local.get([
        'defaultProvider',
        // 'defaultModel', // Загрузка defaultModel будет обработана ниже, если провайдер OpenRouter
        'defaultTargetLanguage',
        'openRouterModels',
        'selectedOpenRouterModel'
    ]);

    // Устанавливаем значения по умолчанию
    if (data.defaultProvider) {
        const radio = document.querySelector(`input[name="provider"][value="${data.defaultProvider}"]`);
        if (radio) radio.checked = true;
        updateProviderUI(data.defaultProvider);
    } else {
        // Если провайдер по умолчанию не задан, выбираем первый (DeepSeek)
        providerRadios[0].checked = true;
        updateProviderUI(providerRadios[0].value);
    }

    if (data.openRouterModels) {
        openRouterModels = data.openRouterModels;
    }
    if (data.selectedOpenRouterModel) {
        selectedOpenRouterModel = data.selectedOpenRouterModel;
        openrouterModelInput.value = selectedOpenRouterModel; // Отображаем выбранную модель в input
    } else if (openRouterModels.length > 0) {
        // Если выбранной модели нет, но есть сохраненные, выбираем первую
        selectedOpenRouterModel = openRouterModels[0];
        openrouterModelInput.value = selectedOpenRouterModel;
    }


    if (data.defaultTargetLanguage) {
        targetLanguage.value = data.defaultTargetLanguage;
    }

    renderOpenRouterModels();
});

// Обработчик изменения провайдера
providerRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        updateProviderUI(e.target.value);
        browserAPI.storage.local.set({ defaultProvider: e.target.value });
    });
});

// Обновление UI в зависимости от выбранного провайдера
function updateProviderUI(provider) {
    openrouterModelContainer.style.display = provider === 'openrouter' ? 'block' : 'none';
}

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

// Обработчик кнопки перевода
translateButton.addEventListener('click', async () => {
    const text = sourceText.value.trim();
    if (!text) return;

    const sourceLang = sourceLanguage.value;
    const targetLang = targetLanguage.value;
    const currentProvider = document.querySelector('input[name="provider"]:checked').value;
    
    let modelToUse = '';
    if (currentProvider === 'openrouter') {
        modelToUse = selectedOpenRouterModel; // Используем выбранную модель
        if (!modelToUse) {
            alert("Пожалуйста, выберите или добавьте модель OpenRouter.");
            return;
        }
    } else if (currentProvider === 'deepseek') {
        // Для DeepSeek модель не указывается явно в popup, а берется из настроек background-скрипта
        // или передается как null/undefined, чтобы background использовал дефолтную для DeepSeek
        modelToUse = null; 
    }


    // Показываем индикатор загрузки
    loadingIndicator.style.display = 'flex';
    translateButton.disabled = true;

    try {
        const response = await browserAPI.runtime.sendMessage({
            action: 'translate',
            text,
            sourceLang,
            targetLang,
            provider: currentProvider,
            model: modelToUse
        });

        if (response && response.success) {
            translatedText.value = response.translatedText;
        } else {
            throw new Error(response ? response.error : 'Неизвестная ошибка');
        }
    } catch (error) {
        console.error('Error during translation:', error);
        translatedText.value = `Ошибка: ${error.message}`;
    } finally {
        // Скрываем индикатор загрузки
        loadingIndicator.style.display = 'none';
        translateButton.disabled = false;
    }
});

// Обработчик кнопки копирования
copyButton.addEventListener('click', () => {
    translatedText.select();
    document.execCommand('copy');
    
    // Визуальная обратная связь
    const originalText = copyButton.textContent;
    copyButton.textContent = 'Скопировано!';
    setTimeout(() => {
        copyButton.textContent = originalText;
    }, 2000);
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