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

// Элементы безопасности
const encryptionStatus = document.getElementById('encryptionStatus');
const encryptionIcon = document.getElementById('encryptionIcon');
const masterPassword = document.getElementById('masterPassword');
const strengthBar = document.getElementById('strengthBar');
const strengthText = document.getElementById('strengthText');
const enableEncryption = document.getElementById('enableEncryption');
const disableEncryption = document.getElementById('disableEncryption');

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
    
    // Загружаем статус шифрования
    await loadEncryptionStatus();
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

// Функции безопасности
async function loadEncryptionStatus() {
    try {
        const isEnabled = await securityManager.isEncryptionEnabled();
        updateEncryptionStatus(isEnabled);
    } catch (error) {
        console.error('Error loading encryption status:', error);
        encryptionStatus.textContent = 'Ошибка загрузки статуса';
        encryptionIcon.textContent = '❌';
    }
}

function updateEncryptionStatus(isEnabled) {
    if (isEnabled) {
        encryptionStatus.textContent = 'Шифрование включено';
        encryptionIcon.textContent = '🔒';
        enableEncryption.disabled = true;
        disableEncryption.disabled = false;
    } else {
        encryptionStatus.textContent = 'Шифрование отключено';
        encryptionIcon.textContent = '🔓';
        enableEncryption.disabled = false;
        disableEncryption.disabled = true;
    }
}

function checkPasswordStrength(password) {
    let strength = 0;
    let feedback = [];

    if (password.length >= 8) strength += 1;
    else feedback.push('минимум 8 символов');

    if (/[a-z]/.test(password)) strength += 1;
    else feedback.push('строчные буквы');

    if (/[A-Z]/.test(password)) strength += 1;
    else feedback.push('заглавные буквы');

    if (/[0-9]/.test(password)) strength += 1;
    else feedback.push('цифры');

    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    else feedback.push('специальные символы');

    const levels = ['', 'weak', 'fair', 'good', 'strong'];
    const texts = ['', 'Слабый', 'Удовлетворительный', 'Хороший', 'Сильный'];
    
    return {
        level: levels[strength],
        text: texts[strength],
        feedback: feedback
    };
}

function updatePasswordStrength() {
    const password = masterPassword.value;
    const strength = checkPasswordStrength(password);
    
    // Обновляем индикатор силы
    strengthBar.className = `strength-bar ${strength.level}`;
    
    if (password.length === 0) {
        strengthText.textContent = '';
        enableEncryption.disabled = true;
        disableEncryption.disabled = true;
    } else {
        strengthText.textContent = `${strength.text}${strength.feedback.length > 0 ? ` (нужно: ${strength.feedback.join(', ')})` : ''}`;
        
        // Кнопки активны только при достаточно сильном пароле
        const isEnabled = securityManager && 
            encryptionStatus.textContent.includes('включено');
        const isStrongEnough = strength.level === 'good' || strength.level === 'strong';
        
        enableEncryption.disabled = isEnabled || !isStrongEnough;
        disableEncryption.disabled = !isEnabled || password.length < 1;
    }
}

// Обработчики событий для безопасности
masterPassword.addEventListener('input', updatePasswordStrength);

enableEncryption.addEventListener('click', async () => {
    const password = masterPassword.value;
    if (!password) {
        alert('Введите мастер-пароль');
        return;
    }

    try {
        enableEncryption.disabled = true;
        enableEncryption.textContent = '🔄 Шифрование...';
        
        await securityManager.enableEncryption(password);
        
        updateEncryptionStatus(true);
        masterPassword.value = '';
        updatePasswordStrength();
        
        alert('✅ Шифрование успешно включено!\nВаши API ключи теперь зашифрованы.');
        
    } catch (error) {
        console.error('Encryption error:', error);
        alert('❌ Ошибка при включении шифрования: ' + error.message);
        enableEncryption.disabled = false;
    } finally {
        enableEncryption.textContent = '🔐 Включить шифрование';
    }
});

disableEncryption.addEventListener('click', async () => {
    const password = masterPassword.value;
    if (!password) {
        alert('Введите мастер-пароль для расшифровки ключей');
        return;
    }

    const confirmed = confirm(
        '⚠️ Вы уверены, что хотите отключить шифрование?\n\n' +
        'API ключи будут сохранены в незашифрованном виде.'
    );
    
    if (!confirmed) return;

    try {
        disableEncryption.disabled = true;
        disableEncryption.textContent = '🔄 Расшифровка...';
        
        await securityManager.disableEncryption(password);
        
        updateEncryptionStatus(false);
        masterPassword.value = '';
        updatePasswordStrength();
        
        alert('✅ Шифрование отключено.\nAPI ключи сохранены в открытом виде.');
        
    } catch (error) {
        console.error('Decryption error:', error);
        alert('❌ Ошибка при отключении шифрования: ' + error.message);
        disableEncryption.disabled = false;
    } finally {
        disableEncryption.textContent = '🔓 Отключить шифрование';
    }
});

// Включаем проверку силы пароля при загрузке
document.addEventListener('DOMContentLoaded', () => {
    updatePasswordStrength();
}); 