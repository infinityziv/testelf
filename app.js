document.addEventListener('DOMContentLoaded', () => {
    const telegram = window.Telegram.WebApp;

    if (!telegram || !telegram.initDataUnsafe || !telegram.initDataUnsafe.user || !telegram.initDataUnsafe.user.id) {
        console.error('Некоторые данные Telegram недоступны или отсутствуют');
        return;
    }

    telegram.ready();
    telegram.expand();

    const chests = document.querySelectorAll('.chest');
    const balanceEl = document.getElementById('balance');
    const levelEl = document.getElementById('level');
    const timerEl = document.getElementById('timer');
    const timeRemainingEl = document.getElementById('time-remaining');
    const modal = document.getElementById('upgrade-modal');
    const modalReward = document.getElementById('upgrade-modal-reward');
    const upgradeTimerBtn = document.getElementById('upgrade-timer');
    const closeButton = document.querySelector('.close-button');
    const upgradeRewardBtn = document.getElementById('upgrade-reward');
    const closeRewardButton = document.querySelector('.close-reward-button');
    const upgradeRewardButtons = document.querySelectorAll('#upgrade-modal-reward button');

    let balance = 0;
    let nextOpenTime = 0;
    let timerInterval;
    let level = 1;
    let cooldown = 4 * 60 * 60 * 1000;
    let minReward = 100;
    let maxReward = 1000;

    const getReward = () => {
        return Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;
    };

    const updateBalance = (amount) => {
        balance += amount;
        balanceEl.textContent = `Balance: ${balance} LOX`;
    };

    const startTimer = () => {
        clearInterval(timerInterval);
        const updateTimer = () => {
            const now = new Date().getTime();
            const distance = nextOpenTime - now;
            if (distance < 0) {
                clearInterval(timerInterval);
                timerEl.classList.add('hidden');
                chests.forEach(chest => chest.classList.remove('open'));
                return;
            }
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            timeRemainingEl.textContent = `${hours}h ${minutes}m ${seconds}s`;
        };
        timerInterval = setInterval(updateTimer, 1000);
        timerEl.classList.remove('hidden');
    };

    const fetchUserProgress = () => {
        fetch('/get-progress', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ telegram_id: telegram.initDataUnsafe.user.id })
        })
        .then(response => response.json())
        .then(data => {
            if (data) {
                balance = data.balance;
                nextOpenTime = data.next_open_time;
                level = data.level;
                cooldown = data.cooldown;
                minReward = data.min_reward;
                maxReward = data.max_reward;
                balanceEl.textContent = `Balance: ${balance} LOX`;
                levelEl.textContent = `Level: ${level} / Max Level: 4`;
                if (nextOpenTime > Date.now()) {
                    startTimer();
                }
            }
        })
        .catch(error => console.error('Ошибка при загрузке прогресса:', error));
    };

    const saveUserProgress = () => {
        fetch('/save-progress', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                telegram_id: telegram.initDataUnsafe.user.id,
                balance: balance,
                next_open_time: nextOpenTime,
                level: level,
                cooldown: cooldown,
                min_reward: minReward,
                max_reward: maxReward
            })
        })
        .catch(error => console.error('Ошибка при сохранении прогресса:', error));
    };

    window.addEventListener('beforeunload', saveUserProgress);
    telegram.onEvent('mainButtonClicked', saveUserProgress);

    fetchUserProgress();

    chests.forEach(chest => {
        chest.addEventListener('click', () => {
            const now = new Date().getTime();
            if (now < nextOpenTime) return;

            const reward = getReward();
            updateBalance(reward);
            chest.classList.add('open');

            nextOpenTime = now + cooldown;
            startTimer();
        });
    });

    upgradeTimerBtn.addEventListener('click', () => {
        modal.style.display = 'block';
    });

    closeButton.addEventListener('click', () => {
        modal.style.display ='none';
    });

    upgradeRewardBtn.addEventListener('click', () => {
        modalReward.style.display = 'block';
    });

    closeRewardButton.addEventListener('click', () => {
        modalReward.style.display = 'none';
    });

    upgradeRewardButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const upgradeLevel = parseInt(event.target.id.split('-').pop());
            const prices = [10000, 20000, 50000, 100000];
            const minRewards = [100, 200, 300, 500];
            const maxRewards = [1000, 2000, 3000, 5000];

            if (balance >= prices[upgradeLevel - 1]) {
                balance -= prices[upgradeLevel - 1];
                minReward = minRewards[upgradeLevel - 1];
                maxReward = maxRewards[upgradeLevel - 1];
                balanceEl.textContent = `Balance: ${balance} LOX`;
                modalReward.style.display = 'none';
            } else {
                showNotification('Недостаточно средств для покупки');
            }
        });
    });

    const showNotification = (message) => {
        const notification = document.getElementById('notification');
        const notificationMessage = document.getElementById('notification-message');

        notificationMessage.textContent = message;
        notification.classList.remove('hidden');

        const closeNotification = () => {
            notification.classList.add('hidden');
        };

        document.querySelector('.close-notification').addEventListener('click', closeNotification);

        setTimeout(closeNotification, 2000);
    };
});
