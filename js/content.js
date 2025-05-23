// Для совместимости с Firefox и Chrome
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Глобальные переменные для сохранения выделенного текста
let lastSelectedText = '';
let lastSelectedHTML = ''; // Добавляем переменную для HTML
let lastSelectionRange = null;
let isDraggingPopup = false; // Флаг для отслеживания перетаскивания
let translationInProgress = false; // Флаг для отслеживания процесса перевода
let isTranslationWindowOpen = false; // Флаг для отслеживания открытого окна перевода

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

// Функция для получения HTML содержимого выделения
function getSelectionHTML(selection) {
    if (selection.rangeCount === 0) return '';
    
    const range = selection.getRangeAt(0);
    const clonedSelection = range.cloneContents();
    const div = document.createElement('div');
    div.appendChild(clonedSelection);
    return div.innerHTML;
}

// Позиционируем иконку рядом с выделенным текстом
function positionTriggerIcon(icon, selection) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Сохраняем выделенный текст и HTML и диапазон
    lastSelectedText = selection.toString().trim();
    lastSelectedHTML = getSelectionHTML(selection); // Получаем HTML версию
    lastSelectionRange = range;
    
    console.log('positionTriggerIcon - raw selection.toString():', selection.toString());
    console.log('positionTriggerIcon - trimmed lastSelectedText:', lastSelectedText);
    console.log('positionTriggerIcon - HTML version:', lastSelectedHTML);
    console.log('positionTriggerIcon - selection range:', range);
    
    icon.style.left = `${rect.right + window.scrollX + 5}px`;
    icon.style.top = `${rect.top + window.scrollY - 12}px`;
    icon.style.display = 'flex';
}

// Обработчик выделения текста
function handleTextSelection() {
    // Игнорируем если идет перетаскивание popup или перевод или уже открыто окно перевода
    if (isDraggingPopup || translationInProgress || isTranslationWindowOpen) {
        console.log('Ignoring text selection - dragging popup, translation in progress, or translation window is open');
        return;
    }
    
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    // Проверяем, что выделение не внутри модального окна перевода
    const popup = document.getElementById('smart-translate-popup');
    if (popup && selection.anchorNode && popup.contains(selection.anchorNode)) {
        console.log('Selection inside translation popup, ignoring');
        return;
    }
    
    // Дополнительная отладочная информация
    console.log('handleTextSelection - current window.getSelection():', selection);
    console.log('handleTextSelection - raw selection.toString():', selection.toString());
    console.log('handleTextSelection - trimmed selectedText:', selectedText);
    
    if (selectedText && selectedText.length > 0) {
        // Проверяем размер текста (максимум 5000 символов)
        if (selectedText.length > 5000) {
            console.warn('Selected text is too long:', selectedText.length, 'characters');
            // Показываем иконку но будем предупреждать при переводе
        }
        
        console.log('Text selected:', selectedText);
        if (!window.triggerIcon) {
            window.triggerIcon = createTriggerIcon();
        }
        positionTriggerIcon(window.triggerIcon, selection);
        
        // Сохраняем выделенный текст (уже сохраняется в positionTriggerIcon)
    } else {
        // Если нет выделенного текста, скрываем иконку
        console.log('No text selected, hiding icon');
        if (window.triggerIcon) {
            window.triggerIcon.style.display = 'none';
        }
        // Очищаем сохраненные данные
        lastSelectedText = '';
        lastSelectedHTML = '';
        lastSelectionRange = null;
    }
}

// Обработчик клика по иконке
function handleTriggerClick(event) {
    // Используем сохраненный текст и HTML
    const selectedText = lastSelectedText;
    const selectedHTML = lastSelectedHTML;
    
    console.log('Handling trigger click, selected text from lastSelectedText:', selectedText);
    console.log('Handling trigger click, selected HTML from lastSelectedHTML:', selectedHTML);
    console.log('Handling trigger click, current window.getSelection().toString():', window.getSelection().toString().trim());
    
    // Проверяем размер текста
    if (selectedText.length > 5000) {
        createTranslationPopup(`Ошибка: Текст слишком длинный (${selectedText.length} символов). Максимум 5000 символов. Попробуйте выделить меньший фрагмент.`, event.target);
        return;
    }
    
    if (selectedText.length > 2000) {
        console.warn('Large text selected, may take longer to translate:', selectedText.length, 'characters');
    }
    
    // Устанавливаем флаг процесса перевода
    translationInProgress = true;
    
    // Добавляем индикатор процесса перевода
    const icon = event.target.closest('.smart-translate-trigger') || event.target;
    icon.classList.add('loading');
    
    // Показываем анимацию загрузки на 800ms, затем скрываем иконку
    setTimeout(() => {
        icon.style.display = 'none';
    }, 800);
    
    if (selectedText) {
        console.log('Sending translation request to background script');
        
        // Отправляем как HTML если есть разметка, иначе как обычный текст
        const textToTranslate = selectedHTML && selectedHTML !== selectedText ? selectedHTML : selectedText;
        
        browserAPI.runtime.sendMessage({
            action: 'translate',
            text: textToTranslate,
            isHTML: selectedHTML && selectedHTML !== selectedText // Указываем, что это HTML
        }).then(response => {
            console.log('Received response from background script:', response);
            // Восстанавливаем иконку (но она уже скрыта)
            icon.classList.remove('loading');
            translationInProgress = false;
            
            if (response && response.success) {
                // Создаем всплывающее окно перевода рядом с выделенным текстом
                createTranslationPopup(response.translatedText, icon, response.isHTML);
            } else {
                createTranslationPopup('Ошибка перевода: ' + (response?.error || 'Неизвестная ошибка'), icon);
            }
        }).catch(error => {
            console.error('Error during translation:', error);
            icon.classList.remove('loading');
            translationInProgress = false;
            createTranslationPopup('Ошибка: ' + error.message, icon);
        });
    }
}

// Функция для создания всплывающего окна с переводом
function createTranslationPopup(text, icon, isHTML = false) {
    console.log('Creating translation popup with text:', text);
    console.log('Is HTML:', isHTML);
    
    // Устанавливаем флаг что окно перевода открыто
    isTranslationWindowOpen = true;
    
    // Иконка уже скрыта при клике, дополнительно скрывать не нужно
    
    // Удаляем предыдущее всплывающее окно, если оно существует
    const existingPopup = document.getElementById('smart-translate-popup');
    if (existingPopup) {
        document.body.removeChild(existingPopup);
    }
    
    // Создаем новое всплывающее окно
    const popup = document.createElement('div');
    popup.id = 'smart-translate-popup';
    
    // Флаг закрепления
    let isPinned = false;
    
    // Позиционирование
    const selectionRect = lastSelectionRange ? lastSelectionRange.getBoundingClientRect() : null;
    let popupLeft, popupTop;
    
    if (selectionRect) {
        popupLeft = selectionRect.left + window.scrollX;
        popupTop = selectionRect.top + window.scrollY - 10;
    } else {
        const iconRect = icon ? icon.getBoundingClientRect() : { right: 100, top: 100 };
        popupLeft = iconRect.right + window.scrollX + 5;
        popupTop = iconRect.top + window.scrollY - 5;
    }
    
    popup.style.position = 'absolute';
    popup.style.left = `${popupLeft}px`;
    popup.style.top = `${popupTop}px`;
    
    // Создаем header с pin button и кнопками
    const header = document.createElement('div');
    header.className = 'popup-header';
    
    // Переменные для расширения
    let isExpanded = false;
    let originalWidth = '';
    let originalHeight = '';
    
    function toggleExpanded() {
        if (!isExpanded) {
            // Сохраняем оригинальные размеры
            originalWidth = popup.style.width || '400px';
            originalHeight = popup.style.height || '200px';
            
            // Расширяем окно
            popup.style.width = '600px';
            popup.style.height = '400px';
            popup.style.transition = 'width 0.3s ease, height 0.3s ease';
            
            // Расширяем содержимое перевода
            const translationTextElement = popup.querySelector('.translation-text');
            if (translationTextElement) {
                translationTextElement.style.maxHeight = '320px';
                translationTextElement.style.transition = 'max-height 0.3s ease';
            }
            
            isExpanded = true;
            expandButton.innerHTML = `<img src="${browserAPI.runtime.getURL('icons/collapse-icon.svg')}" alt="Collapse" style="width: 16px; height: 16px;">`;
            expandButton.title = 'Свернуть окно';
        } else {
            // Возвращаем к оригинальным размерам
            popup.style.width = originalWidth;
            popup.style.height = originalHeight;
            popup.style.transition = 'width 0.3s ease, height 0.3s ease';
            
            // Возвращаем размер содержимого
            const translationTextElement = popup.querySelector('.translation-text');
            if (translationTextElement) {
                translationTextElement.style.maxHeight = '';
                translationTextElement.style.transition = 'max-height 0.3s ease';
            }
            
            isExpanded = false;
            expandButton.innerHTML = `<img src="${browserAPI.runtime.getURL('icons/expand-icon.svg')}" alt="Expand" style="width: 16px; height: 16px;">`;
            expandButton.title = 'Расширить окно';
        }
        
        // Убираем transition после анимации
        setTimeout(() => {
            popup.style.transition = '';
            const translationTextElement = popup.querySelector('.translation-text');
            if (translationTextElement) {
                translationTextElement.style.transition = '';
            }
        }, 300);
    }
    
    // Контейнер для левых кнопок
    const leftActions = document.createElement('div');
    leftActions.className = 'popup-left-actions';
    
    // Pin button
    const pinButton = document.createElement('div');
    pinButton.className = 'popup-pin-button';
    pinButton.innerHTML = `<img src="${browserAPI.runtime.getURL('icons/pin-icon.svg')}" alt="Pin" style="width: 16px; height: 16px;">`;
    pinButton.title = 'Закрепить окно';
    
    // Expand button
    const expandButton = document.createElement('div');
    expandButton.className = 'popup-expand-button';
    expandButton.innerHTML = `<img src="${browserAPI.runtime.getURL('icons/expand-icon.svg')}" alt="Expand" style="width: 16px; height: 16px;">`;
    expandButton.title = 'Расширить окно';
    
    expandButton.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleExpanded();
    });
    
    leftActions.appendChild(pinButton);
    leftActions.appendChild(expandButton);
    
    // Контейнер для кнопок действий
    const headerActions = document.createElement('div');
    headerActions.className = 'popup-header-actions';
    
    // Кнопка копирования
    const copyButton = document.createElement('button');
    copyButton.className = 'popup-action-button popup-copy-button';
    copyButton.innerHTML = `<img src="${browserAPI.runtime.getURL('icons/copy-icon-white.svg')}" alt="Copy" style="width: 16px; height: 16px;">`;
    copyButton.title = 'Копировать';
    
    // Кнопка закрытия
    const closeButton = document.createElement('button');
    closeButton.className = 'popup-action-button popup-close-button';
    closeButton.innerHTML = `<img src="${browserAPI.runtime.getURL('icons/close-icon-white.svg')}" alt="Close" style="width: 16px; height: 16px;">`;
    closeButton.title = 'Закрыть';
    
    headerActions.appendChild(copyButton);
    headerActions.appendChild(closeButton);
    
    header.appendChild(leftActions);
    header.appendChild(headerActions);
    
    // Добавляем элемент частиц
    const particlesElement = document.createElement('div');
    particlesElement.className = 'popup-particles';
    
    // Добавляем resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'popup-resize-handle';
    
    // Функция закрепления/открепления
    function togglePin() {
        isPinned = !isPinned;
        if (isPinned) {
            pinButton.innerHTML = `<img src="${browserAPI.runtime.getURL('icons/pinned-icon.svg')}" alt="Unpin" style="width: 16px; height: 16px;">`;
            pinButton.title = 'Открепить окно';
            pinButton.classList.add('pinned');
        } else {
            pinButton.innerHTML = `<img src="${browserAPI.runtime.getURL('icons/pin-icon.svg')}" alt="Pin" style="width: 16px; height: 16px;">`;
            pinButton.title = 'Закрепить окно';
            pinButton.classList.remove('pinned');
        }
    }
    
    pinButton.addEventListener('click', togglePin);
    
    // Drag functionality для всего popup (только если не закреплено)
    let isDragging = false;
    let offsetX, offsetY;
    
    // Делаем весь popup перетаскиваемым, но исключаем кнопки и нижнюю область для resize
    popup.addEventListener('mousedown', (e) => {
        // Проверяем, что клик не по кнопкам действий, resize handle или нижней области
        if (e.target.closest('.popup-action-button') || 
            e.target.closest('.popup-header-actions') ||
            e.target.closest('.popup-pin-button') ||
            e.target.closest('.popup-expand-button') ||
            e.target.closest('.popup-resize-handle') ||
            e.target.classList.contains('translation-text')) {
            return;
        }
        
        // Проверяем, что клик не в нижней части окна (последние 20px)
        const rect = popup.getBoundingClientRect();
        const clickY = e.clientY;
        if (clickY > rect.bottom - 20) {
            return; // Не начинаем dragging в нижней области
        }
        
        if (e.button !== 0) return;
        isDragging = true;
        isDraggingPopup = true; // Устанавливаем глобальный флаг
        offsetX = e.clientX - parseFloat(popup.style.left || 0);
        offsetY = e.clientY - parseFloat(popup.style.top || 0);
        document.body.style.userSelect = 'none';
        popup.style.cursor = 'move';
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        e.preventDefault();
    });
    
    function handleMouseMove(e) {
        if (!isDragging) return;
        popup.style.left = `${e.clientX - offsetX}px`;
        popup.style.top = `${e.clientY - offsetY}px`;
    }
    
    function handleMouseUp() {
        if (!isDragging) return;
        isDragging = false;
        isDraggingPopup = false; // Сбрасываем глобальный флаг
        document.body.style.userSelect = '';
        popup.style.cursor = '';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        // Добавляем небольшую задержку чтобы предотвратить срабатывание handleTextSelection
        setTimeout(() => {
            isDraggingPopup = false;
        }, 100);
    }
    
    // Обработчик клика вне окна для закрытия (только если не закреплено)
    function handleOutsideClick(e) {
        // Не закрываем окно если идет resize или окно закреплено
        if (isResizingPopup || isPinned || popup.contains(e.target)) {
            return;
        }
        
        if (popup.parentNode) {
            popup.style.opacity = '0';
            popup.style.transform = 'scale(0.8) translateY(10px)';
            setTimeout(() => {
                if (popup.parentNode) {
                    document.body.removeChild(popup);
                    document.removeEventListener('click', handleOutsideClick);
                    // Сбрасываем флаг открытого окна перевода
                    isTranslationWindowOpen = false;
                }
            }, 200);
        }
    }
    
    // Добавляем обработчик клика вне окна с небольшой задержкой
    setTimeout(() => {
        document.addEventListener('click', handleOutsideClick);
    }, 100);
    
    // Resize functionality
    let isResizing = false;
    let isResizingPopup = false; // Флаг для предотвращения закрытия окна после resize
    let startX, startY, startWidth, startHeight;
    
    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        isResizingPopup = true; // Устанавливаем флаг resize
        startX = e.clientX;
        startY = e.clientY;
        startWidth = parseInt(window.getComputedStyle(popup).width, 10);
        startHeight = parseInt(window.getComputedStyle(popup).height, 10);
        
        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResize);
        e.preventDefault();
    });
    
    function handleResize(e) {
        if (!isResizing) return;
        
        const newWidth = startWidth + (e.clientX - startX);
        const newHeight = startHeight + (e.clientY - startY);
        
        // Ограничиваем размеры
        const minWidth = 200;
        const maxWidth = 600;
        const minHeight = 120;
        const maxHeight = 500;
        
        popup.style.width = Math.min(Math.max(newWidth, minWidth), maxWidth) + 'px';
        popup.style.height = Math.min(Math.max(newHeight, minHeight), maxHeight) + 'px';
        
        // Обновляем размер текстового содержимого
        const translationTextElement = popup.querySelector('.translation-text');
        if (translationTextElement) {
            const contentHeight = parseInt(popup.style.height) - 100; // Учитываем header и padding
            translationTextElement.style.maxHeight = Math.max(contentHeight, 80) + 'px';
        }
    }
    
    function stopResize() {
        isResizing = false;
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
        
        // Добавляем задержку перед сбросом флага чтобы предотвратить срабатывание handleOutsideClick
        setTimeout(() => {
            isResizingPopup = false;
        }, 200);
    }
    
    // Контент
    const content = document.createElement('div');
    content.className = 'popup-content';
    
    // Контент перевода
    const textContent = document.createElement('div');
    textContent.className = 'translation-text';
    
    // Если это HTML, используем innerHTML, иначе textContent
    if (isHTML) {
        textContent.innerHTML = text;
    } else {
        textContent.textContent = text;
    }
    
    content.appendChild(textContent);
    
    // События кнопок
    copyButton.addEventListener('click', () => {
        // Копируем в буфер простой текст для совместимости
        const textToCopy = isHTML ? textContent.textContent : text;
        navigator.clipboard.writeText(textToCopy).then(() => {
            copyButton.title = 'Скопировано!';
            setTimeout(() => {
                copyButton.title = 'Копировать';
            }, 2000);
        });
    });
    
    closeButton.addEventListener('click', () => {
        if (popup.parentNode) {
            popup.style.opacity = '0';
            popup.style.transform = 'scale(0.8) translateY(10px)';
            setTimeout(() => {
                if (popup.parentNode) {
                    document.body.removeChild(popup);
                    document.removeEventListener('click', handleOutsideClick);
                    // Сбрасываем флаг открытого окна перевода
                    isTranslationWindowOpen = false;
                }
            }, 200);
        }
    });
    
    // Собираем popup
    popup.appendChild(header);
    popup.appendChild(content);
    popup.appendChild(particlesElement); // Добавляем частицы
    popup.appendChild(resizeHandle); // Добавляем resize handle
    document.body.appendChild(popup);
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