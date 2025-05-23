# 🚀 TranzlitAI - Smart AI Translation Extension

Умное расширение для перевода текста с использованием ИИ (DeepSeek, OpenRouter, ChatGPT) с поддержкой HTML, оптимизацией токенов и шифрованием API ключей.

## ✨ Возможности

### 🔄 **Умный Перевод**
- **3 провайдера ИИ**: DeepSeek (~$0.07/1M токенов), OpenRouter, ChatGPT
- **HTML поддержка**: Сохранение форматирования и тегов
- **Оптимизация токенов**: До 90% экономии для коротких текстов
- **Множественные окна**: Несколько переводов одновременно

### 🎨 **Продвинутый UI**
- **Расширяемые окна**: Чистый вид с hover-контролами
- **Drag & Drop**: Перетаскивание окон перевода
- **Pin система**: Закрепление важных переводов
- **Неоновые эффекты**: Современный дизайн с анимациями

### 🔒 **Безопасность**
- **AES-256-GCM шифрование**: Военный стандарт защиты
- **Локальное хранение**: Данные не покидают ваш компьютер
- **Мастер-пароль**: Дополнительная защита API ключей
- **PBKDF2**: 100,000 итераций против брутфорса

## 📦 Быстрая Установка

### Firefox Developer Edition
```bash
1. Скачайте build/TranzlitAI-v1.1.0-firefox.xpi
2. Откройте about:config → xpinstall.signatures.required = false
3. Откройте about:addons → ⚙️ → Install Add-on From File
4. Выберите .xpi файл
```

### Chrome
```bash
1. chrome://extensions/ → Developer mode ON
2. Load unpacked → выберите папку расширения
```

## 🔧 Настройка

1. **Получите API ключи:**
   - [DeepSeek](https://platform.deepseek.com/api_keys) - $5 = ~70M токенов
   - [OpenRouter](https://openrouter.ai/keys) - $5 = ~50M токенов  
   - [OpenAI](https://platform.openai.com/api-keys) - $5 = ~3M токенов

2. **Введите ключи в настройках расширения**

3. **Включите шифрование** для безопасности (опционально)

## 💰 Стоимость Использования

| Провайдер | Стоимость | Пример (1000 переводов) |
|-----------|-----------|-------------------------|
| DeepSeek  | $0.07/1M  | ~$0.01                 |
| OpenRouter| $0.10/1M  | ~$0.02                 |
| ChatGPT   | $1.50/1M  | ~$0.30                 |

## 🔗 Приватная Публикация

### Firefox Add-ons (Unlisted)
1. [Зарегистрируйтесь](https://addons.mozilla.org/developers/)
2. Submit New Add-on → "No, I only want to sign"
3. Загрузите `TranzlitAI-v1.1.0-firefox.xpi`
4. Получите подписанную версию через 1-7 дней

### Chrome Web Store (Private)
1. [Developer Dashboard](https://chrome.google.com/webstore/devconsole/) ($5)
2. New Item → загрузите `TranzlitAI-v1.1.0-chrome.zip`
3. Visibility → Private/Unlisted
4. Опубликуйте

## 📚 Документация

- [📖 Полное руководство](INSTALLATION_GUIDE.md)
- [🔧 Устранение проблем](INSTALLATION_GUIDE.md#4-устранение-проблем)
- [🔒 Настройка безопасности](INSTALLATION_GUIDE.md#2-приватная-публикация)

## 🎯 Архитектура

```
TranzlitAI/
├── manifest.json          # Конфигурация расширения
├── js/
│   ├── background.js       # API интеграция
│   ├── content.js          # UI логика
│   ├── popup.js            # Popup интерфейс
│   ├── options.js          # Настройки
│   └── security.js         # Шифрование
├── html/
│   ├── popup.html          # Popup интерфейс
│   └── options.html        # Страница настроек
├── css/
│   ├── content.css         # Стили UI
│   ├── popup.css           # Стили popup
│   └── options.css         # Стили настроек
└── icons/                  # Иконки и графика
```

## 📈 Возможности v1.1.0

- ✅ Токен-оптимизированные промпты
- ✅ Умная логика выбора max_tokens
- ✅ AES-256 шифрование API ключей
- ✅ Множественные окна переводов
- ✅ Поддержка HTML форматирования
- ✅ Современный UI с анимациями

## 🤝 Поддержка

- **Ошибки**: Проверьте консоль браузера (F12)
- **Логи**: Настройки → Вкладка "Логи"
- **API проблемы**: Проверьте ключи и лимиты

---

**TranzlitAI v1.1.0** - Умный перевод с ИИ и безопасностью 🔒 