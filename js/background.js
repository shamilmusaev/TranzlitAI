// Константы для API
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Для совместимости между Firefox и Chrome
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Уровни логирования
const LOG_LEVELS = {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR'
};

// Функция логирования
async function log(level, message, data = {}) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        data
    };

    try {
        // Сохраняем лог в storage
        const result = await browserAPI.storage.local.get('logs');
        const logs = result.logs ? result : { logs: [] };
        logs.logs.push(logEntry);
        await browserAPI.storage.local.set(logs);

        // Выводим в консоль
        console.log(`[${level}] ${message}`, data);
    } catch (error) {
        console.error('Error logging:', error);
    }
}

// Функция для получения настроек
async function getSettings() {
    try {
        const settings = await browserAPI.storage.local.get([
            'deepseekApiKey',
            'openrouterApiKey',
            'defaultProvider',
            'defaultModel',
            'defaultTargetLanguage'
        ]);
        return settings || {};
    } catch (error) {
        console.error('Error getting settings:', error);
        return {};
    }
}

// Функция для перевода через DeepSeek
async function translateWithDeepSeek(text, sourceLang, targetLang, apiKey, isHTML = false) {
    try {
        console.log('Starting DeepSeek translation', { text, sourceLang, targetLang, isHTML });
        
        const systemPrompt = isHTML 
            ? "Переводи HTML текст точно, сохраняя всю HTML разметку, теги, форматирование, структуру и стиль. Переводи только текстовое содержимое внутри тегов, но сохраняй все HTML теги без изменений. Отвечай только переведенным HTML."
            : "Переводи текст точно, сохраняя оригинальное форматирование, разметку, структуру и стиль. Если текст содержит жирный шрифт, заголовки или особое форматирование - сохраняй их в переводе. Отвечай только переводом.";
        
        const userPrompt = `На ${targetLang}: ${text}`;

        const response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                model: 'deepseek-chat',
                max_tokens: 500, // Увеличиваем для HTML
                temperature: 0.3
            })
        });

        if (!response.ok) {
            throw new Error(`DeepSeek API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        await log(LOG_LEVELS.ERROR, 'DeepSeek translation error', { error: error.message });
        throw error;
    }
}

// Функция для перевода через OpenRouter
async function translateWithOpenRouter(text, sourceLang, targetLang, apiKey, model, isHTML = false) {
    try {
        console.log('Starting OpenRouter translation', { text, sourceLang, targetLang, model, isHTML });
        
        const systemPrompt = isHTML 
            ? "Переводи HTML текст точно, сохраняя всю HTML разметку, теги, форматирование, структуру и стиль. Переводи только текстовое содержимое внутри тегов, но сохраняй все HTML теги без изменений. Отвечай только переведенным HTML."
            : "Переводи текст точно, сохраняя оригинальное форматирование, разметку, структуру и стиль. Если текст содержит жирный шрифт, заголовки или особое форматирование - сохраняй их в переводе. Отвечай только переводом.";
        
        const userPrompt = `На ${targetLang}: ${text}`;

        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                model: model,
                max_tokens: 500, // Увеличиваем для HTML
                temperature: 0.3
            })
        });

        if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        await log(LOG_LEVELS.ERROR, 'OpenRouter translation error', { error: error.message });
        throw error;
    }
}

// Функция для перевода через ChatGPT (OpenAI)
async function translateWithChatGPT(text, sourceLang, targetLang, apiKey, model, isHTML = false) {
    try {
        console.log('Starting ChatGPT translation', { text, sourceLang, targetLang, model, isHTML });
        
        const systemPrompt = isHTML 
            ? "Переводи HTML текст точно, сохраняя всю HTML разметку, теги, форматирование, структуру и стиль. Переводи только текстовое содержимое внутри тегов, но сохраняй все HTML теги без изменений. Отвечай только переведенным HTML."
            : "Переводи текст точно, сохраняя оригинальное форматирование, разметку, структуру и стиль. Если текст содержит жирный шрифт, заголовки или особое форматирование - сохраняй их в переводе. Отвечай только переводом.";
            
        const userPrompt = `На ${targetLang}: ${text}`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                model: model,
                max_tokens: 500, // Увеличиваем для HTML
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(`OpenAI API error: ${response.status} ${errData.error?.message || ''}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        await log(LOG_LEVELS.ERROR, 'ChatGPT translation error', { error: error.message });
        throw error;
    }
}

// Обработчик сообщений
browserAPI.runtime.onMessage.addListener((message, sender) => {
    console.log('[DEBUG] Получено сообщение в background.js:', message);
    if (message.action === 'translate') {
        console.log('[DEBUG] Обрабатываем запрос на перевод');
        // Возвращаем Promise для правильной обработки асинхронных ответов
        return (async () => {
            try {
                const settings = await getSettings();
                console.log('[DEBUG] Получены настройки:', settings);
                
                const { text, sourceLang = 'auto', targetLang = settings.defaultTargetLanguage || 'Русский', isHTML = false } = message;
                // Провайдер может быть передан в сообщении или взят из настроек
                const provider = message.provider || settings.defaultProvider || 'deepseek';
                
                console.log('[DEBUG] Параметры перевода:', { 
                    text, 
                    sourceLang, 
                    targetLang, 
                    provider, 
                    model: message.model,
                    isHTML
                });
                
                await log(LOG_LEVELS.INFO, 'Translation request received', { text, provider, isHTML });
                
                let translatedText;
                if (provider === 'deepseek') {
                    if (!settings.deepseekApiKey) {
                        throw new Error('DeepSeek API key not set');
                    }
                    translatedText = await translateWithDeepSeek(
                        text,
                        sourceLang,
                        targetLang,
                        settings.deepseekApiKey,
                        isHTML
                    );
                } else if (provider === 'openrouter') {
                    if (!settings.openrouterApiKey) {
                        throw new Error('OpenRouter API key not set');
                    }
                    translatedText = await translateWithOpenRouter(
                        text,
                        sourceLang,
                        targetLang,
                        settings.openrouterApiKey,
                        message.model || settings.defaultModel || 'mistralai/mistral-7b-instruct',
                        isHTML
                    );
                } else if (provider === 'chatgpt') {
                    // Новый провайдер ChatGPT (OpenAI)
                    const apiKey = (await browserAPI.storage.local.get('chatgptApiKey')).chatgptApiKey;
                    if (!apiKey) {
                        throw new Error('OpenAI API key not set');
                    }

                    const allowedModels = ['gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-3.5-turbo'];
                    const requestedModel = message.model || 'gpt-4.1-nano'; // Default is gpt-4.1-nano

                    if (!allowedModels.includes(requestedModel)) {
                        throw new Error(`Model ${requestedModel} is not supported for ChatGPT. Supported models are: ${allowedModels.join(', ')}`);
                    }

                    translatedText = await translateWithChatGPT(
                        text,
                        sourceLang,
                        targetLang,
                        apiKey,
                        requestedModel,
                        isHTML
                    );
                } else {
                    throw new Error('Invalid provider selected');
                }

                console.log('[DEBUG] Результат перевода:', translatedText);
                await log(LOG_LEVELS.INFO, 'Translation completed', { translatedText, isHTML });
                
                const response = { success: true, translatedText, isHTML };
                console.log('[DEBUG] Отправляем ответ в popup.js:', response);
                return response;
            } catch (error) {
                console.error('[DEBUG] Ошибка перевода:', error);
                await log(LOG_LEVELS.ERROR, 'Translation failed', { error: error.message });
                
                const errorResponse = { success: false, error: error.message };
                console.log('[DEBUG] Отправляем ошибку в popup.js:', errorResponse);
                return errorResponse;
            }
        })();
    }
}); 