# 🔧 TranzlitAI - Руководство по Установке и Публикации

## 📋 Оглавление
- [1. Постоянная Установка](#1-постоянная-установка)
- [2. Приватная Публикация](#2-приватная-публикация)
- [3. Публичная Публикация](#3-публичная-публикация)
- [4. Устранение Проблем](#4-устранение-проблем)

---

## 1. 🔒 Постоянная Установка

### Вариант A: Firefox Developer Edition (Рекомендуется)

#### Шаг 1: Скачайте Firefox Developer Edition
```bash
# macOS
https://www.mozilla.org/en-US/firefox/developer/

# Или через Homebrew
brew install --cask firefox-developer-edition
```

#### Шаг 2: Соберите расширение
```bash
# Сделайте скрипт исполняемым
chmod +x build.sh

# Запустите сборку
./build.sh
```

#### Шаг 3: Отключите проверку подписей
1. Откройте Firefox Developer Edition
2. В адресной строке введите: `about:config`
3. Нажмите "I accept the risk!"
4. Найдите: `xpinstall.signatures.required`
5. Измените значение на `false`

#### Шаг 4: Установите расширение
1. Откройте `about:addons`
2. Нажмите ⚙️ (шестеренка) → "Install Add-on From File"
3. Выберите файл `build/TranzlitAI-v1.1.0-firefox.xpi`
4. Подтвердите установку

#### Шаг 5: Включите проверку подписей обратно
1. Вернитесь в `about:config`
2. Измените `xpinstall.signatures.required` обратно на `true`

### Вариант B: Firefox ESR
- Скачайте [Firefox ESR](https://www.mozilla.org/en-US/firefox/enterprise/)
- Следуйте тем же шагам, что и для Developer Edition

### ⚠️ Важно для обычного Firefox
В обычной версии Firefox нельзя отключить `xpinstall.signatures.required`. Нужен Developer Edition или ESR.

---

## 2. 🔐 Приватная Публикация

### Firefox Add-ons (Unlisted)

#### Преимущества:
- ✅ Расширение подписывается Mozilla
- ✅ Работает в обычном Firefox
- ✅ Доступно только вам по прямой ссылке
- ✅ Автоматические обновления

#### Шаги:

1. **Создайте аккаунт разработчика**
   ```
   https://addons.mozilla.org/developers/
   ```

2. **Подготовьте исходный код**
   ```bash
   # Создайте архив исходников (требование Mozilla)
   zip -r source-code.zip . --exclude=build/\* --exclude=.git\*
   ```

3. **Загрузите расширение**
   - Войдите в Developer Hub
   - Нажмите "Submit a New Add-on"
   - Выберите "On this site" → "No, I only want to sign my add-on"
   - Загрузите `.xpi` файл
   - Загрузите `source-code.zip`

4. **Дождитесь проверки**
   - Обычно 1-7 дней
   - Получите уведомление на email

5. **Скачайте подписанную версию**
   - Скачайте подписанный `.xpi`
   - Установите в любом Firefox

### Chrome Web Store (Private)

#### Шаги:

1. **Зарегистрируйтесь как разработчик**
   ```
   https://chrome.google.com/webstore/devconsole/
   Плата: $5 (единоразово)
   ```

2. **Загрузите расширение**
   - Нажмите "New Item"
   - Загрузите `build/TranzlitAI-v1.1.0-chrome.zip`

3. **Настройте приватность**
   - В разделе "Visibility" выберите:
     - **Private**: Только вы
     - **Unlisted**: По прямой ссылке
     - **Trusted testers**: Указанные email'ы

4. **Опубликуйте**
   - Заполните описание
   - Добавьте скриншоты
   - Нажмите "Publish"

---

## 3. 🌍 Публичная Публикация

### Firefox Add-ons (Listed)

#### Требования:
- Подробное описание на английском
- Скриншоты высокого качества
- Соответствие политикам Mozilla
- Исходный код для проверки

#### Процесс:
1. Следуйте шагам приватной публикации
2. При загрузке выберите "On this site" → "Yes"
3. Дождитесь модерации (1-2 недели)
4. Расширение появится в каталоге

### Chrome Web Store (Public)

#### Дополнительные требования:
- Политика конфиденциальности
- Подробные разрешения
- Качественные иконки (128x128, 48x48, 16x16)

---

## 4. 🛠️ Устранение Проблем

### Проблема: "Add-on could not be installed"

**Решение:**
```bash
# Проверьте консоль браузера (Ctrl+Shift+J)
# Частые причины:
# - Отсутствует ID в manifest.json ✅ (исправлено)
# - Неправильная структура файлов
# - Поврежденный ZIP архив
```

### Проблема: "This add-on is not signed"

**Решение:**
```
1. Используйте Firefox Developer Edition
2. Или получите подпись через addons.mozilla.org
3. Или используйте about:debugging для временной установки
```

### Проблема: Расширение исчезает после перезапуска

**Решение:**
```
- Установите постоянно через about:addons (не about:debugging)
- Используйте подписанную версию
- Проверьте, что xpinstall.signatures.required = false
```

---

## 🎯 Рекомендуемая Стратегия

### Для личного использования:
1. **Firefox Developer Edition** + локальная сборка
2. Или **Firefox Add-ons (Unlisted)** для подписи

### Для команды/компании:
1. **Chrome Web Store (Private)** с trusted testers
2. **Firefox Add-ons (Unlisted)** с рассылкой ссылки

### Для публики:
1. **Chrome Web Store (Public)**
2. **Firefox Add-ons (Listed)**

---

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте консоль браузера (F12)
2. Проверьте логи расширения в настройках
3. Убедитесь, что все API ключи введены
4. Проверьте версию браузера

---

## 📝 Полезные Ссылки

- [Firefox Developer Hub](https://addons.mozilla.org/developers/)
- [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
- [Firefox Extension API](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions)
- [Chrome Extension API](https://developer.chrome.com/docs/extensions/)

---

**TranzlitAI v1.1.0** | *Smart AI Translation with Security* 