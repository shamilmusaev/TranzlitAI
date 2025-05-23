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

// Функция для определения оптимального промпта
function getOptimalPrompt(text, targetLang, isHTML) {
    const textLength = text.length;
    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
    
    // 1. HTML контент - всегда расширенный промпт
    if (isHTML) {
        return `Переводи HTML на ${targetLang}, сохраняя теги. Только перевод.`; // ~9 токенов
    }
    
    // 2. Одно слово - с примером формата
    if (wordCount === 1 && textLength <= 15) {
        return `Переведи слово на ${targetLang}, отвечай только переводом:`; // ~8 токенов, но точно работает
    }
    
    // 3. Очень короткий текст (2 слова)
    if (textLength <= 20 || wordCount <= 2) {
        return `Переводи на ${targetLang}:`; // ~3 токена
    }
    
    // 4. Короткий текст (3-10 слов)
    if (textLength <= 100 || wordCount <= 10) {
        return `Переводи на ${targetLang}:`; // ~3 токена
    }
    
    // 5. Средний текст
    if (textLength <= 500) {
        return `Переводи на ${targetLang}. Только перевод.`; // ~6 токенов
    }
    
    // 6. Длинный текст (нужно сохранить структуру)
    return `Переводи на ${targetLang}, сохраняя структуру и форматирование.`; // ~8 токенов
}

// Функция для определения оптимального количества max_tokens
function getOptimalMaxTokens(inputText, isHTML) {
    const inputLength = inputText.length;
    
    // Для HTML контента нужно больше токенов из-за тегов
    const multiplier = isHTML ? 2.0 : 1.5;
    
    // Эмпирическое правило: выходной текст ≈ 1.2-2.0x входной
    const estimatedOutputLength = Math.ceil(inputLength * multiplier);
    
    // Токенов примерно в 4 раза меньше символов для русского/английского
    const estimatedTokens = Math.ceil(estimatedOutputLength / 4);
    
    // Минимум 20, максимум 500, с буфером +10
    const result = Math.max(20, Math.min(500, estimatedTokens + 10));
    
    console.log(`[TOKEN OPTIMIZATION] Input: ${inputLength} chars, Estimated output: ${estimatedOutputLength} chars, Max tokens: ${result}`);
    
    return result;
}

// Функция для перевода через DeepSeek
async function translateWithDeepSeek(text, sourceLang, targetLang, apiKey, isHTML = false) {
    try {
        console.log('Starting DeepSeek translation', { text, sourceLang, targetLang, isHTML });
        
        const systemPrompt = getOptimalPrompt(text, targetLang, isHTML);
        
        const userPrompt = text;

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
                max_tokens: getOptimalMaxTokens(text, isHTML),
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
        
        const systemPrompt = getOptimalPrompt(text, targetLang, isHTML);
        
        const userPrompt = text;

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
                max_tokens: getOptimalMaxTokens(text, isHTML),
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
        
        const systemPrompt = getOptimalPrompt(text, targetLang, isHTML);
            
        const userPrompt = text;

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
                max_tokens: getOptimalMaxTokens(text, isHTML),
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