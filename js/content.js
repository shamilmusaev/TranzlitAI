// Для совместимости с Firefox и Chrome
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Глобальные переменные для сохранения выделенного текста
let lastSelectedText = '';
let lastSelectedHTML = ''; // Добавляем переменную для HTML
let lastSelectionRange = null;
let isDraggingPopup = false; // Флаг для отслеживания перетаскивания
let translationInProgress = false; // Флаг для отслеживания процесса перевода
let hasUnpinnedTranslationWindow = false; // Флаг для отслеживания незакрепленного окна перевода

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
    // Игнорируем если идет перетаскивание popup или перевод или есть незакрепленное окно перевода
    if (isDraggingPopup || translationInProgress || hasUnpinnedTranslationWindow) {
        console.log('Ignoring text selection - dragging popup, translation in progress, or unpinned translation window is open');
        return;
    }
    
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    // Проверяем, что выделение не внутри модального окна перевода
    const popups = document.querySelectorAll('.smart-translate-popup, #smart-translate-popup');
    for (let popup of popups) {
        if (popup && selection.anchorNode && popup.contains(selection.anchorNode)) {
            console.log('Selection inside translation popup, ignoring');
            return;
        }
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
    
    // Устанавливаем флаг что есть незакрепленное окно перевода
    hasUnpinnedTranslationWindow = true;
    
    // Иконка уже скрыта при клике, дополнительно скрывать не нужно
    
    // Создаем уникальный ID для popup
    const popupId = 'smart-translate-popup-' + Date.now();
    
    // Создаем новое всплывающее окно
    const popup = document.createElement('div');
    popup.id = popupId;
    popup.className = 'smart-translate-popup';
    
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
    
    function toggleExpanded() {
        if (!isExpanded) {
            // Режим "развернуто" - скрываем UI, показываем только содержимое
            isExpanded = true;
            
            // Добавляем класс для expanded режима
            popup.classList.add('expanded-mode');
            
            // Скрываем все элементы UI с анимацией
            header.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            header.style.opacity = '0';
            header.style.transform = 'translateY(-20px)';
            
            particlesElement.style.transition = 'opacity 0.3s ease';
            particlesElement.style.opacity = '0';
            
            resizeHandle.style.transition = 'opacity 0.3s ease';
            resizeHandle.style.opacity = '0';
            
            // Убираем рамку и тень
            popup.style.transition = 'all 0.4s ease';
            popup.style.background = 'transparent';
            popup.style.border = 'none';
            popup.style.boxShadow = 'none';
            popup.style.backdropFilter = 'none';
            
            // Изменяем стили содержимого
            const translationTextElement = popup.querySelector('.translation-text');
            if (translationTextElement) {
                translationTextElement.style.transition = 'all 0.4s ease';
                translationTextElement.style.background = 'rgba(44, 44, 58, 0.95)';
                translationTextElement.style.border = 'none';
                translationTextElement.style.borderLeft = '3px solid #6B73FF';
                translationTextElement.style.borderRadius = '12px';
                translationTextElement.style.margin = '0';
                translationTextElement.style.padding = '20px';
                translationTextElement.style.maxHeight = 'none';
                translationTextElement.style.fontSize = '16px';
                translationTextElement.style.lineHeight = '1.6';
                translationTextElement.style.boxShadow = 'none';
                translationTextElement.style.backdropFilter = 'blur(15px)';
            }
            
            // Через 300ms полностью скрываем элементы UI
            setTimeout(() => {
                header.style.display = 'none';
                particlesElement.style.display = 'none';
                resizeHandle.style.display = 'none';
                
                // Создаем hover зону для показа кнопок
                createHoverZone();
            }, 300);
            
        } else {
            // Режим "свернуто" - восстанавливаем UI
            isExpanded = false;
            
            // Удаляем класс expanded режима
            popup.classList.remove('expanded-mode');
            
            // Удаляем hover зону
            removeHoverZone();
            
            // Показываем элементы UI
            header.style.display = 'flex';
            particlesElement.style.display = 'block';
            resizeHandle.style.display = 'block';
            
            // Восстанавливаем стили popup
            popup.style.transition = 'all 0.4s ease';
            popup.style.background = 'rgba(44, 44, 58, 0.98)';
            popup.style.border = '2px solid transparent';
            popup.style.boxShadow = `
                0 0 20px rgba(107, 115, 255, 0.3),
                0 0 40px rgba(199, 107, 255, 0.2),
                0 15px 35px rgba(0, 0, 0, 0.4)
            `;
            popup.style.backdropFilter = 'blur(15px)';
            
            // Восстанавливаем стили содержимого
            const translationTextElement = popup.querySelector('.translation-text');
            if (translationTextElement) {
                translationTextElement.style.transition = 'all 0.4s ease';
                translationTextElement.style.background = 'rgba(59, 59, 77, 0.6)';
                translationTextElement.style.border = 'none';
                translationTextElement.style.borderLeft = '3px solid #6B73FF';
                translationTextElement.style.borderRadius = '8px';
                translationTextElement.style.margin = '0';
                translationTextElement.style.padding = '12px';
                translationTextElement.style.maxHeight = '180px';
                translationTextElement.style.fontSize = '14px';
                translationTextElement.style.lineHeight = '1.5';
            }
            
            // Через 100ms показываем элементы UI с анимацией
            setTimeout(() => {
                header.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                header.style.opacity = '1';
                header.style.transform = 'translateY(0px)';
                
                particlesElement.style.transition = 'opacity 0.3s ease';
                particlesElement.style.opacity = '1';
                
                resizeHandle.style.transition = 'opacity 0.3s ease';
                resizeHandle.style.opacity = '1';
            }, 100);
        }
        
        // Обновляем иконку кнопки
        updateExpandButton();
        
        // Убираем transition после анимации
        setTimeout(() => {
            popup.style.transition = '';
            const translationTextElement = popup.querySelector('.translation-text');
            if (translationTextElement) {
                translationTextElement.style.transition = '';
            }
        }, 400);
    }
    
    function updateExpandButton() {
        if (isExpanded) {
            expandButton.innerHTML = `<img src="${browserAPI.runtime.getURL('icons/collapse-icon.svg')}" alt="Collapse" style="width: 16px; height: 16px;">`;
            expandButton.title = 'Свернуть окно';
        } else {
            expandButton.innerHTML = `<img src="${browserAPI.runtime.getURL('icons/expand-icon.svg')}" alt="Expand" style="width: 16px; height: 16px;">`;
            expandButton.title = 'Развернуть окно';
        }
    }
    
    // Функции для hover зоны
    function createHoverZone() {
        if (popup.querySelector('.hover-zone')) return; // Уже существует
        
        const hoverZone = document.createElement('div');
        hoverZone.className = 'hover-zone';
        hoverZone.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 60px;
            z-index: 10;
            background: transparent;
            cursor: default;
        `;
        
        // Создаем полупрозрачные кнопки
        const hoverButtons = document.createElement('div');
        hoverButtons.className = 'hover-buttons';
        hoverButtons.style.cssText = `
        display: flex;
            justify-content: space-between;
        align-items: center;
            padding: 15px 20px;
            opacity: 0;
            transform: translateY(-10px);
            transition: all 0.3s ease;
            background: rgba(44, 44, 58, 0.8);
            border-radius: 8px;
            margin: 10px;
            backdrop-filter: blur(10px);
        `;
        
        // Левые кнопки
        const leftHoverActions = leftActions.cloneNode(true);
        leftHoverActions.style.opacity = '0.8';
        
        // Правые кнопки  
        const rightHoverActions = headerActions.cloneNode(true);
        rightHoverActions.style.opacity = '0.8';
        
        hoverButtons.appendChild(leftHoverActions);
        hoverButtons.appendChild(rightHoverActions);
        hoverZone.appendChild(hoverButtons);
        
        // События для hover
        hoverZone.addEventListener('mouseenter', () => {
            hoverButtons.style.opacity = '1';
            hoverButtons.style.transform = 'translateY(0px)';
        });
        
        hoverZone.addEventListener('mouseleave', () => {
            hoverButtons.style.opacity = '0';
            hoverButtons.style.transform = 'translateY(-10px)';
        });
        
        // Привязываем события к клонированным кнопкам
        const hoverExpandButton = leftHoverActions.querySelector('.popup-expand-button');
        if (hoverExpandButton) {
            hoverExpandButton.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                toggleExpanded();
            });
        }
        
        const hoverPinButton = leftHoverActions.querySelector('.popup-pin-button');
        if (hoverPinButton) {
            hoverPinButton.addEventListener('click', togglePin);
        }
        
        const hoverCopyButton = rightHoverActions.querySelector('.popup-copy-button');
        if (hoverCopyButton) {
            hoverCopyButton.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const textToCopy = isHTML ? content.querySelector('.translation-text').textContent : text;
                navigator.clipboard.writeText(textToCopy).then(() => {
                    hoverCopyButton.title = 'Скопировано!';
                    setTimeout(() => {
                        hoverCopyButton.title = 'Копировать';
                    }, 2000);
                });
            });
        }
        
        const hoverCloseButton = rightHoverActions.querySelector('.popup-close-button');
        if (hoverCloseButton) {
            hoverCloseButton.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (popup.parentNode) {
                    popup.style.opacity = '0';
                    popup.style.transform = 'scale(0.8) translateY(10px)';
                    setTimeout(() => {
                        if (popup.parentNode) {
                            document.body.removeChild(popup);
                            document.removeEventListener('click', handleOutsideClick);
                            checkForUnpinnedWindows();
                        }
                    }, 200);
                }
            });
        }
        
        popup.appendChild(hoverZone);
    }
    
    function removeHoverZone() {
        const hoverZone = popup.querySelector('.hover-zone');
        if (hoverZone) {
            popup.removeChild(hoverZone);
        }
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
    
    // Функция закрепления/открепления с debounce
    let pinClickTimeout = null;
    function togglePin(e) {
        // Предотвращаем всплытие события
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        
        // Debounce для предотвращения множественных кликов
        if (pinClickTimeout) {
            return;
        }
        
        pinClickTimeout = setTimeout(() => {
            pinClickTimeout = null;
        }, 300);
        
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
        // Проверяем наличие незакрепленных окон после изменения состояния
        setTimeout(() => checkForUnpinnedWindows(), 100);
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
        popup.style.transition = 'none'; // Убираем переходы при перемещении
        popup.classList.add('dragging'); // Добавляем класс для отключения transition
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
        popup.style.transition = ''; // Восстанавливаем переходы после перемещения
        popup.classList.remove('dragging'); // Убираем класс для восстановления transition
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        // Добавляем небольшую задержку чтобы предотвратить срабатывание handleTextSelection
        setTimeout(() => {
            isDraggingPopup = false;
        }, 100);
    }
    
    // Обработчик клика вне окна для закрытия (только если не закреплено)
    function handleOutsideClick(e) {
        // Не закрываем окно если идет resize, окно закреплено, или недавно был клик по pin кнопке
        if (isResizingPopup || isPinned || popup.contains(e.target) || pinClickTimeout) {
            return;
        }
        
        if (popup.parentNode) {
            popup.style.opacity = '0';
            popup.style.transform = 'scale(0.8) translateY(10px)';
            setTimeout(() => {
                if (popup.parentNode) {
                    document.body.removeChild(popup);
                    document.removeEventListener('click', handleOutsideClick);
                    // Проверяем, есть ли еще незакрепленные окна
                    checkForUnpinnedWindows();
                }
            }, 200);
        }
    }
    
    // Функция для проверки наличия незакрепленных окон
    function checkForUnpinnedWindows() {
        const allPopups = document.querySelectorAll('.smart-translate-popup, #smart-translate-popup');
        let hasUnpinned = false;
        
        for (let popup of allPopups) {
            const pinButton = popup.querySelector('.popup-pin-button');
            if (pinButton && !pinButton.classList.contains('pinned')) {
                hasUnpinned = true;
                break;
            }
        }
        
        hasUnpinnedTranslationWindow = hasUnpinned;
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
    copyButton.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        // Копируем в буфер простой текст для совместимости
        const textToCopy = isHTML ? textContent.textContent : text;
        navigator.clipboard.writeText(textToCopy).then(() => {
            copyButton.title = 'Скопировано!';
            setTimeout(() => {
                copyButton.title = 'Копировать';
            }, 2000);
        });
    });
    
    closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (popup.parentNode) {
            popup.style.opacity = '0';
            popup.style.transform = 'scale(0.8) translateY(10px)';
            setTimeout(() => {
        if (popup.parentNode) {
            document.body.removeChild(popup);
                    document.removeEventListener('click', handleOutsideClick);
                    // Проверяем, есть ли еще незакрепленные окна
                    checkForUnpinnedWindows();
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