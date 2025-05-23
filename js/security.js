// Модуль безопасности для шифрования API ключей
class SecurityManager {
    constructor() {
        this.keyDerivationIterations = 100000;
    }

    // Генерация ключа шифрования из пароля пользователя
    async deriveKey(password) {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );

        return await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: encoder.encode('tranzlit-salt-v1'), // В реальном приложении используйте случайную соль
                iterations: this.keyDerivationIterations,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    // Шифрование данных
    async encrypt(plaintext, password) {
        try {
            const encoder = new TextEncoder();
            const key = await this.deriveKey(password);
            const iv = crypto.getRandomValues(new Uint8Array(12));
            
            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encoder.encode(plaintext)
            );

            // Объединяем IV и зашифрованные данные
            const result = new Uint8Array(iv.length + encrypted.byteLength);
            result.set(iv);
            result.set(new Uint8Array(encrypted), iv.length);
            
            return btoa(String.fromCharCode.apply(null, result));
        } catch (error) {
            console.error('Encryption failed:', error);
            throw error;
        }
    }

    // Расшифровка данных
    async decrypt(encryptedData, password) {
        try {
            const decoder = new TextDecoder();
            const key = await this.deriveKey(password);
            
            const data = new Uint8Array(atob(encryptedData).split('').map(char => char.charCodeAt(0)));
            const iv = data.slice(0, 12);
            const encrypted = data.slice(12);

            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encrypted
            );

            return decoder.decode(decrypted);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Неверный пароль или поврежденные данные');
        }
    }

    // Проверка, включено ли шифрование
    async isEncryptionEnabled() {
        const settings = await browserAPI.storage.local.get('encryptionEnabled');
        return settings.encryptionEnabled === true;
    }

    // Безопасное сохранение API ключа
    async saveSecureApiKey(keyName, apiKey, masterPassword = null) {
        try {
            if (masterPassword && await this.isEncryptionEnabled()) {
                const encryptedKey = await this.encrypt(apiKey, masterPassword);
                await browserAPI.storage.local.set({ 
                    [keyName]: encryptedKey,
                    [`${keyName}_encrypted`]: true 
                });
                console.log(`✅ API ключ ${keyName} сохранен с шифрованием`);
            } else {
                await browserAPI.storage.local.set({ 
                    [keyName]: apiKey,
                    [`${keyName}_encrypted`]: false 
                });
                console.log(`⚠️ API ключ ${keyName} сохранен БЕЗ шифрования`);
            }
        } catch (error) {
            console.error('Failed to save API key:', error);
            throw error;
        }
    }

    // Безопасное получение API ключа
    async getSecureApiKey(keyName, masterPassword = null) {
        try {
            const result = await browserAPI.storage.local.get([keyName, `${keyName}_encrypted`]);
            const apiKey = result[keyName];
            const isEncrypted = result[`${keyName}_encrypted`];

            if (!apiKey) {
                return null;
            }

            if (isEncrypted && masterPassword) {
                return await this.decrypt(apiKey, masterPassword);
            } else if (isEncrypted && !masterPassword) {
                throw new Error('Требуется мастер-пароль для расшифровки');
            }

            return apiKey;
        } catch (error) {
            console.error('Failed to get API key:', error);
            throw error;
        }
    }

    // Включение шифрования для существующих ключей
    async enableEncryption(masterPassword) {
        try {
            const keyNames = ['deepseekApiKey', 'openrouterApiKey', 'chatgptApiKey'];
            
            for (const keyName of keyNames) {
                const result = await browserAPI.storage.local.get([keyName, `${keyName}_encrypted`]);
                const apiKey = result[keyName];
                const isEncrypted = result[`${keyName}_encrypted`];

                if (apiKey && !isEncrypted) {
                    console.log(`🔐 Шифрую существующий ключ: ${keyName}`);
                    await this.saveSecureApiKey(keyName, apiKey, masterPassword);
                }
            }

            await browserAPI.storage.local.set({ encryptionEnabled: true });
            console.log('✅ Шифрование включено для всех ключей');
        } catch (error) {
            console.error('Failed to enable encryption:', error);
            throw error;
        }
    }

    // Отключение шифрования
    async disableEncryption(masterPassword) {
        try {
            const keyNames = ['deepseekApiKey', 'openrouterApiKey', 'chatgptApiKey'];
            
            for (const keyName of keyNames) {
                const result = await browserAPI.storage.local.get([keyName, `${keyName}_encrypted`]);
                const apiKey = result[keyName];
                const isEncrypted = result[`${keyName}_encrypted`];

                if (apiKey && isEncrypted) {
                    console.log(`🔓 Расшифровываю ключ: ${keyName}`);
                    const decryptedKey = await this.decrypt(apiKey, masterPassword);
                    await this.saveSecureApiKey(keyName, decryptedKey, null);
                    await browserAPI.storage.local.remove(`${keyName}_encrypted`);
                }
            }

            await browserAPI.storage.local.set({ encryptionEnabled: false });
            console.log('⚠️ Шифрование отключено - ключи хранятся в открытом виде');
        } catch (error) {
            console.error('Failed to disable encryption:', error);
            throw error;
        }
    }
}

// Глобальный экземпляр менеджера безопасности
const securityManager = new SecurityManager(); 