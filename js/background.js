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
async function translateWithDeepSeek(text, sourceLang, targetLang, apiKey) {
    try {
        console.log('Starting DeepSeek translation', { text, sourceLang, targetLang });
        
        const systemPrompt = "Ты — опытный переводчик, специализирующийся на живом и естественном языке. Твоя задача — переводить текст, максимально сохраняя его смысл, стиль и нюансы, включая идиомы, сленг и устойчивые выражения. Адаптируй перевод так, чтобы он звучал естественно на целевом языке. При этом, не добавляй никаких комментариев, объяснений или информации, выходящей за рамки самого переведенного текста.";
        
        const userPrompt = `Переведи следующий текст на ${targetLang}. Предоставь только перевод, ничего больше: "${text}"`;

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
                model: 'deepseek-chat'
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
async function translateWithOpenRouter(text, sourceLang, targetLang, apiKey, model) {
    try {
        console.log('Starting OpenRouter translation', { text, sourceLang, targetLang, model });
        
        const systemPrompt = "Ты — опытный переводчик, специализирующийся на живом и естественном языке. Твоя задача — переводить текст, максимально сохраняя его смысл, стиль и нюансы, включая идиомы, сленг и устойчивые выражения. Адаптируй перевод так, чтобы он звучал естественно на целевом языке. При этом, не добавляй никаких комментариев, объяснений или информации, выходящей за рамки самого переведенного текста.";
        
        const userPrompt = `Переведи следующий текст на ${targetLang}. Предоставь только перевод, ничего больше: "${text}"`;

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
                model: model
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

// Обработчик сообщений
browserAPI.runtime.onMessage.addListener((message, sender) => {
    console.log('Received message:', message);
    if (message.action === 'translate') {
        // Возвращаем Promise для правильной обработки асинхронных ответов
        return (async () => {
            try {
                const settings = await getSettings();
                const { text, sourceLang = 'auto', targetLang = settings.defaultTargetLanguage || 'Русский' } = message;
                
                // Провайдер может быть передан в сообщении или взят из настроек
                const provider = message.provider || settings.defaultProvider || 'deepseek';
                
                await log(LOG_LEVELS.INFO, 'Translation request received', { text, provider });
                console.log('Translation settings:', { provider, sourceLang, targetLang });
                
                let translatedText;
                if (provider === 'deepseek') {
                    if (!settings.deepseekApiKey) {
                        throw new Error('DeepSeek API key not set');
                    }
                    translatedText = await translateWithDeepSeek(
                        text,
                        sourceLang,
                        targetLang,
                        settings.deepseekApiKey
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
                        message.model || settings.defaultModel || 'mistralai/mistral-7b-instruct'
                    );
                } else {
                    throw new Error('Invalid provider selected');
                }

                console.log('Translation result:', translatedText);
                await log(LOG_LEVELS.INFO, 'Translation completed', { translatedText });
                return { success: true, translatedText };
            } catch (error) {
                console.error('Translation error:', error);
                await log(LOG_LEVELS.ERROR, 'Translation failed', { error: error.message });
                return { success: false, error: error.message };
            }
        })();
    }
}); 