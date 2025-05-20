// Для совместимости с Firefox и Chrome
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Создаем иконку-триггер
function createTriggerIcon() {
    const icon = document.createElement('div');
    icon.className = 'smart-translate-trigger';
    const img = document.createElement('img');
    img.src = browserAPI.runtime.getURL('icons/Tranzlit_icon.png');
    img.style.width = '30px';  // Фиксированный размер
    img.style.height = '30px'; // Фиксированный размер
    img.style.objectFit = 'contain';
    img.style.display = 'block';
    img.style.background = 'none';
    icon.appendChild(img);
    
    icon.style.cssText = `
        position: absolute;
        width: 30px;
        height: 30px;
        background: none;
        box-shadow: none;
        display: none;
        padding: 0;
        margin: 0;
        cursor: pointer;
        border: none;
        overflow: visible;
        transition: transform 0.2s ease;
    `;
    
    // Добавляем hover эффект
    icon.addEventListener('mouseover', () => {
        icon.style.transform = 'scale(1.1)';
    });
    
    icon.addEventListener('mouseout', () => {
        icon.style.transform = 'scale(1)';
    });
    
    // Добавляем прямой обработчик клика на иконку
    icon.addEventListener('click', (event) => {
        console.log('Icon clicked');
        handleTriggerClick(event);
        event.stopPropagation(); // Предотвращаем всплытие события
    });
    
    document.body.appendChild(icon);
    return icon;
}

// Глобальные переменные для сохранения выделенного текста
let lastSelectedText = '';
let lastSelectionRange = null;

// Позиционируем иконку рядом с выделенным текстом
function positionTriggerIcon(icon, selection) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Сохраняем выделенный текст и диапазон
    lastSelectedText = selection.toString().trim();
    lastSelectionRange = range;
    
    console.log('positionTriggerIcon - raw selection.toString():', selection.toString());
    console.log('positionTriggerIcon - trimmed lastSelectedText:', lastSelectedText);
    console.log('positionTriggerIcon - selection range:', range);
    
    icon.style.left = `${rect.right + window.scrollX + 5}px`;
    icon.style.top = `${rect.top + window.scrollY - 12}px`;
    icon.style.display = 'flex';
}

// Обработчик выделения текста
function handleTextSelection() {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    // Дополнительная отладочная информация
    console.log('handleTextSelection - current window.getSelection():', selection);
    console.log('handleTextSelection - raw selection.toString():', selection.toString());
    console.log('handleTextSelection - trimmed selectedText:', selectedText);
    
    if (selectedText) {
        console.log('Text selected:', selectedText);
        if (!window.triggerIcon) {
            window.triggerIcon = createTriggerIcon();
        }
        positionTriggerIcon(window.triggerIcon, selection);
        
        // Сохраняем выделенный текст
        lastSelectedText = selectedText;
    } else if (window.triggerIcon) {
        window.triggerIcon.style.display = 'none';
    }
}

// Обработчик клика по иконке
function handleTriggerClick(event) {
    // Используем сохраненный текст
    const selectedText = lastSelectedText;
    
    console.log('Handling trigger click, selected text from lastSelectedText:', selectedText);
    console.log('Handling trigger click, current window.getSelection().toString():', window.getSelection().toString().trim());
    
    // Добавляем индикатор процесса перевода
    const icon = event.target.closest('.smart-translate-trigger') || event.target;
    const originalContent = icon.innerHTML;
    icon.innerHTML = '⌛';
    
    if (selectedText) {
        console.log('Sending translation request to background script');
        
        browserAPI.runtime.sendMessage({
            action: 'translate',
            text: selectedText
        }).then(response => {
            console.log('Received response from background script:', response);
            // Восстанавливаем иконку
            icon.innerHTML = originalContent;
            
            if (response && response.success) {
                // Создаем всплывающее окно перевода рядом с выделенным текстом
                createTranslationPopup(response.translatedText, icon);
            } else {
                createTranslationPopup('Ошибка перевода: ' + (response?.error || 'Неизвестная ошибка'), icon);
            }
        }).catch(error => {
            console.error('Error during translation:', error);
            icon.innerHTML = originalContent;
            createTranslationPopup('Ошибка: ' + error.message, icon);
        });
    }
}

// Функция для создания всплывающего окна с переводом
function createTranslationPopup(text, icon) {
    console.log('Creating translation popup with text:', text);
    
    // Скрываем иконку при появлении перевода
    if (icon) {
        icon.style.display = 'none';
    }
    
    // Удаляем предыдущее всплывающее окно, если оно существует
    const existingPopup = document.getElementById('smart-translate-popup');
    if (existingPopup) {
        document.body.removeChild(existingPopup);
    }
    
    // Создаем новое всплывающее окно
    const popup = document.createElement('div');
    popup.id = 'smart-translate-popup';
    
    // --- НАЧАЛО КОДА ДЛЯ ПЕРЕТАСКИВАНИЯ ---
    const dragHandle = document.createElement('div');
    dragHandle.style.cssText = `
        height: 25px;
        background-color: rgba(0, 0, 0, 0.15); /* Немного темнее для контраста */
        cursor: move;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        user-select: none; /* Предотвратить выделение текста на ручке */
        border-top-left-radius: 5px; /* Если у popup есть border-radius */
        border-top-right-radius: 5px; /* Если у popup есть border-radius */
    `;
    // Можно добавить визуальный индикатор, например, точки
    dragHandle.innerHTML = `<svg width="24" height="10" viewBox="0 0 24 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 2H2M6 2H6M10 2H10M14 2H14M18 2H18M22 2H22M2 6H2M6 6H6M10 6H10M14 6H14M18 6H18M22 6H22" stroke="rgba(255,255,255,0.5)" stroke-width="3" stroke-linecap="round"/></svg>`;


    popup.appendChild(dragHandle); // Добавляем ручку в начало окна

    let isDragging = false;
    let offsetX, offsetY;
    let originalBodyUserSelect = '';

    dragHandle.addEventListener('mousedown', (e) => {
        // Игнорируем клики не левой кнопкой мыши
        if (e.button !== 0) return;

        isDragging = true;
        // Получаем смещение курсора относительно левого верхнего угла popup
        // Исправляем расчет offsetX и offsetY, чтобы учитывать текущее положение popup
        offsetX = e.clientX - parseFloat(popup.style.left || 0); // Используем parseFloat, так как style.left возвращает строку (напр. "100px")
        offsetY = e.clientY - parseFloat(popup.style.top || 0);   // или 0, если значение еще не установлено

        originalBodyUserSelect = document.body.style.userSelect;
        document.body.style.userSelect = 'none'; // Предотвращаем выделение текста на странице

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        e.preventDefault(); // Предотвращаем стандартное поведение (например, выделение текста)
    });

    function handleMouseMove(e) {
        if (!isDragging) return;
        let newX = e.clientX - offsetX;
        let newY = e.clientY - offsetY;

        popup.style.left = `${newX}px`;
        popup.style.top = `${newY}px`;
    }

    function handleMouseUp() {
        if (!isDragging) return;
        isDragging = false;
        document.body.style.userSelect = originalBodyUserSelect; // Восстанавливаем userSelect

        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }
    // --- КОНЕЦ КОДА ДЛЯ ПЕРЕТАСКИВАНИЯ ---

    // Используем позицию последнего выделенного текста
    const selectionRect = lastSelectionRange ? lastSelectionRange.getBoundingClientRect() : null;
    
    // Если у нас есть позиция выделения, используем её, иначе позиционируем возле иконки
    let popupLeft, popupTop;
    
    if (selectionRect) {
        // Позиционируем окно над выделением
        popupLeft = selectionRect.left + window.scrollX;
        popupTop = selectionRect.top + window.scrollY - 10; // Немного выше выделения
    } else {
        // Запасной вариант - возле иконки
        const iconRect = icon.getBoundingClientRect();
        popupLeft = iconRect.right + window.scrollX + 5;
        popupTop = iconRect.top + window.scrollY - 5;
    }
    
    // Применяем стили к popup индивидуально
    popup.style.position = 'absolute';
    popup.style.left = `${popupLeft}px`;
    popup.style.top = `${popupTop}px`;
    popup.style.background = 'rgba(157, 145, 145, 0.9)'; // Цвет фона из скриншота
    popup.style.color = '#222'; // Темный цвет текста
    popup.style.border = 'none'; // Убираем стандартную рамку
    // popup.style.borderRadius = '5px'; // Небольшое скругление углов
    popup.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.3)'; // Тень для объема
    popup.style.zIndex = '9999'; // Поверх всех элементов
    popup.style.minWidth = '250px'; // Минимальная ширина
    popup.style.maxWidth = '600px'; // Максимальная ширина (было 60%)
    popup.style.fontFamily = "'Arial', sans-serif"; // Шрифт
    popup.style.fontSize = '16px'; // Размер шрифта
    popup.style.fontWeight = '400'; // Насыщенность шрифта
    popup.style.lineHeight = '1.4'; // Межстрочный интервал
    popup.style.backdropFilter = 'blur(5px)'; // Эффект размытия фона
    popup.style.overflow = 'hidden'; // Чтобы скругление углов работало для дочерних элементов (ручки)
    
    // Содержимое всплывающего окна
    const textContent = document.createElement('div');
    textContent.style.cssText = `
        margin-bottom: 15px;
        white-space: pre-wrap;
        padding: 15px; /* Добавляем отступы для основного текста */
        padding-top: 5px; /* Меньший отступ сверху, так как есть ручка */
    `;
    textContent.textContent = text;
    
    // Кнопка копирования
    const copyButton = document.createElement('button');
    copyButton.textContent = 'Копировать';
    copyButton.style.cssText = `
        background: rgba(0, 0, 0, 0.6);
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        margin-right: 10px;
        transition: background-color 0.2s;
    `;
    
    // Кнопка закрытия
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Закрыть';
    closeButton.style.cssText = `
        background: rgba(0, 0, 0, 0.6);
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
    `;
    
    // События кнопок
    copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(text).then(() => {
            copyButton.textContent = 'Скопировано!';
            setTimeout(() => {
                copyButton.textContent = 'Копировать';
            }, 2000);
        });
    });
    
    closeButton.addEventListener('click', () => {
        if (popup.parentNode) {
            document.body.removeChild(popup);
        }
    });
    
    // Добавляем все в всплывающее окно
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.display = 'flex';
    buttonsContainer.style.justifyContent = 'flex-end';
    buttonsContainer.style.marginTop = '0px'; /* Убрали верхний отступ, есть отступ у textContent */
    buttonsContainer.style.padding = '0 15px 15px 15px'; /* Отступы для кнопок */
    buttonsContainer.appendChild(copyButton);
    buttonsContainer.appendChild(closeButton);
    
    popup.appendChild(textContent);
    popup.appendChild(buttonsContainer);
    document.body.appendChild(popup);
    
    // Добавляем анимацию появления
    popup.style.opacity = '0';
    popup.style.transform = 'translateY(-10px)';
    popup.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    
    setTimeout(() => {
        popup.style.opacity = '1';
        popup.style.transform = 'translateY(0)';
    }, 10);
    
    // Закрытие по клику вне всплывающего окна
    document.addEventListener('click', function closePopupOnClickOutside(e) {
        if (e.target !== popup && !popup.contains(e.target) && e.target !== icon) {
            if (popup.parentNode) {
                // Анимация закрытия
                popup.style.opacity = '0';
                popup.style.transform = 'translateY(-10px)';
                
                setTimeout(() => {
                    if (popup.parentNode) {
                        document.body.removeChild(popup);
                    }
                }, 300);
            }
            document.removeEventListener('click', closePopupOnClickOutside);
        }
    });
}

// Инициализация
document.addEventListener('mouseup', handleTextSelection);
document.addEventListener('keyup', handleTextSelection);

// Добавляем глобальный обработчик клика
document.addEventListener('click', (event) => {
    if (event.target.classList.contains('smart-translate-trigger')) {
        console.log('Click detected on trigger icon via global handler');
        handleTriggerClick(event);
    }
}); 