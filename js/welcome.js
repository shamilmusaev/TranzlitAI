// Для совместимости с Firefox и Chrome
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

document.addEventListener('DOMContentLoaded', function() {
    const startButton = document.getElementById('startButton');
    
    // Проверяем, нужно ли показывать окно приветствия
    browserAPI.storage.local.get(['welcomeCompleted'], function(result) {
        if (result.welcomeCompleted) {
            // Если приветствие уже было показано, переходим к popup
            window.location.href = 'popup.html';
            return;
        }
    });
    
    // Обработчик для кнопки "Начать работу"
    startButton.addEventListener('click', function() {
        // Добавляем эффект нажатия
        startButton.style.transform = 'scale(0.98)';
        
        setTimeout(() => {
            // Сохраняем флаг, что пользователь прошел приветствие
            browserAPI.storage.local.set({ 'welcomeCompleted': true }, function() {
                // Переходим к основному popup
                window.location.href = 'popup.html';
            });
        }, 150);
    });
    
    // Добавляем обработчики для hover эффектов на карточки
    const featureCards = document.querySelectorAll('.feature-card');
    
    featureCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-4px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
    
    // Добавляем анимацию появления элементов
    function animateElements() {
        const elements = [
            '.app-title',
            '.welcome-heading', 
            '.welcome-description',
            '.feature-card',
            '.start-button',
            '.welcome-footer'
        ];
        
        elements.forEach((selector, index) => {
            const items = document.querySelectorAll(selector);
            items.forEach((item, itemIndex) => {
                item.style.opacity = '0';
                item.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    item.style.transition = 'all 0.6s ease-out';
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                }, (index * 100) + (itemIndex * 50));
            });
        });
    }
    
    // Запускаем анимацию после загрузки
    setTimeout(animateElements, 100);
}); 