// Для совместимости с Firefox и Chrome
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Элементы DOM
const tabButtons = document.querySelectorAll('.tab-button');
const tabPanes = document.querySelectorAll('.tab-pane');
const deepseekApiKey = document.getElementById('deepseekApiKey');
const openrouterApiKey = document.getElementById('openrouterApiKey');
const chatgptApiKey = document.getElementById('chatgptApiKey');
const saveDeepseekKey = document.getElementById('saveDeepseekKey');
const saveOpenrouterKey = document.getElementById('saveOpenrouterKey');
const saveChatgptKey = document.getElementById('saveChatgptKey');
const deepseekStatus = document.getElementById('deepseekStatus');
const openrouterStatus = document.getElementById('openrouterStatus');
const chatgptStatus = document.getElementById('chatgptStatus');
const defaultProviderRadios = document.getElementsByName('defaultProvider');
const defaultModel = document.getElementById('defaultModel');
const defaultTargetLanguage = document.getElementById('defaultTargetLanguage');
const clearLogs = document.getElementById('clearLogs');
const copyLogs = document.getElementById('copyLogs');
const logLevels = document.querySelectorAll('.log-level');
const logContent = document.getElementById('logContent');

// Загрузка настроек при открытии страницы
document.addEventListener('DOMContentLoaded', async () => {
    const settings = await browserAPI.storage.local.get([
        'deepseekApiKey',
        'openrouterApiKey',
        'chatgptApiKey',
        'defaultProvider',
        'defaultModel',
        'defaultTargetLanguage'
    ]);

    // Заполняем поля API ключей
    if (settings.deepseekApiKey) {
        deepseekApiKey.value = settings.deepseekApiKey;
    }
    if (settings.openrouterApiKey) {
        openrouterApiKey.value = settings.openrouterApiKey;
    }
    if (settings.chatgptApiKey) {
        chatgptApiKey.value = settings.chatgptApiKey;
    }

    // Устанавливаем провайдера по умолчанию
    if (settings.defaultProvider) {
        const radio = document.querySelector(`input[name="defaultProvider"][value="${settings.defaultProvider}"]`);
        if (radio) radio.checked = true;
    }

    // Устанавливаем модель по умолчанию
    if (settings.defaultModel) {
        defaultModel.value = settings.defaultModel;
    }

    // Устанавливаем язык по умолчанию
    if (settings.defaultTargetLanguage) {
        defaultTargetLanguage.value = settings.defaultTargetLanguage;
    }

    // Загружаем логи
    loadLogs();
});

// Обработка вкладок
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tabId = button.dataset.tab;
        
        // Обновляем активные классы кнопок
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Показываем соответствующую вкладку
        tabPanes.forEach(pane => {
            pane.classList.remove('active');
            if (pane.id === tabId) {
                pane.classList.add('active');
            }
        });
    });
});

// Сохранение API ключей
saveDeepseekKey.addEventListener('click', async () => {
    const key = deepseekApiKey.value.trim();
    if (!key) {
        deepseekStatus.textContent = 'Введите API ключ';
        deepseekStatus.className = 'status error';
        return;
    }

    try {
        await browserAPI.storage.local.set({ deepseekApiKey: key });
        deepseekStatus.textContent = 'API ключ сохранен';
        deepseekStatus.className = 'status success';
    } catch (error) {
        deepseekStatus.textContent = 'Ошибка при сохранении ключа';
        deepseekStatus.className = 'status error';
    }
});

saveOpenrouterKey.addEventListener('click', async () => {
    const key = openrouterApiKey.value.trim();
    if (!key) {
        openrouterStatus.textContent = 'Введите API ключ';
        openrouterStatus.className = 'status error';
        return;
    }

    try {
        await browserAPI.storage.local.set({ openrouterApiKey: key });
        openrouterStatus.textContent = 'API ключ сохранен';
        openrouterStatus.className = 'status success';
    } catch (error) {
        openrouterStatus.textContent = 'Ошибка при сохранении ключа';
        openrouterStatus.className = 'status error';
    }
});

saveChatgptKey.addEventListener('click', async () => {
    const key = chatgptApiKey.value.trim();
    if (!key) {
        chatgptStatus.textContent = 'Введите API ключ';
        chatgptStatus.className = 'status error';
        return;
    }

    try {
        await browserAPI.storage.local.set({ chatgptApiKey: key });
        chatgptStatus.textContent = 'API ключ сохранен';
        chatgptStatus.className = 'status success';
    } catch (error) {
        chatgptStatus.textContent = 'Ошибка при сохранении ключа';
        chatgptStatus.className = 'status error';
    }
});

// Сохранение настроек перевода
defaultProviderRadios.forEach(radio => {
    radio.addEventListener('change', async (e) => {
        await browserAPI.storage.local.set({ defaultProvider: e.target.value });
    });
});

defaultModel.addEventListener('change', async () => {
    await browserAPI.storage.local.set({ defaultModel: defaultModel.value });
});

defaultTargetLanguage.addEventListener('change', async () => {
    await browserAPI.storage.local.set({ defaultTargetLanguage: defaultTargetLanguage.value });
});

// Работа с логами
async function loadLogs() {
    try {
        const result = await browserAPI.storage.local.get('logs');
        const logs = result.logs || [];
        
        const enabledLevels = Array.from(logLevels)
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.value);

        const filteredLogs = logs.filter(log => enabledLevels.includes(log.level));
        const formattedLogs = filteredLogs.map(log => 
            `[${log.timestamp}] [${log.level}] ${log.message}${log.data ? '\n' + JSON.stringify(log.data, null, 2) : ''}`
        ).join('\n\n');

        logContent.textContent = formattedLogs || 'Нет логов для отображения';
    } catch (error) {
        console.error('Error loading logs:', error);
        logContent.textContent = 'Ошибка при загрузке логов: ' + error.message;
    }
}

// Обработчики для логов
clearLogs.addEventListener('click', async () => {
    try {
        await browserAPI.storage.local.set({ logs: [] });
        loadLogs();
    } catch (error) {
        console.error('Error clearing logs:', error);
    }
});

copyLogs.addEventListener('click', () => {
    const text = logContent.textContent;
    navigator.clipboard.writeText(text).then(() => {
        const originalText = copyLogs.textContent;
        copyLogs.textContent = 'Скопировано!';
        setTimeout(() => {
            copyLogs.textContent = originalText;
        }, 2000);
    });
});

logLevels.forEach(checkbox => {
    checkbox.addEventListener('change', loadLogs);
}); 