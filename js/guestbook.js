// 初始化DOM元素
const messageForm = document.getElementById('messageForm');
const messagesList = document.getElementById('messagesList');
const notification = document.getElementById('notification');
const refreshButton = document.getElementById('refreshMessages');

// 主题切换按钮
const themeSwitch = document.createElement('div');
themeSwitch.className = 'theme-switch';
themeSwitch.innerHTML = '<i class="fas fa-moon"></i>';
document.body.appendChild(themeSwitch);

// 消息数据路径
const MESSAGES_JSON_PATH = '/data/messages.json';

// 全局消息数组
let messages = [];

// 获取当前语言
function getCurrentLanguage() {
  return window.i18n ? window.i18n.currentLang : 'zh';
}

// 获取本地化文本
function t(key) {
  if (window.i18n && window.i18n.translations[window.i18n.currentLang]) {
    return window.i18n.translations[window.i18n.currentLang][key] || 
           window.i18n.translations[window.i18n.defaultLang][key] || 
           key;
  }
  return key;
}

// 初始化主题
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

// 切换主题
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    
    showNotification(`已切换至${newTheme === 'dark' ? '深色' : '浅色'}主题`);
}

// 更新主题图标
function updateThemeIcon(theme) {
    const icon = themeSwitch.querySelector('i');
    if (theme === 'dark') {
        icon.className = 'fas fa-sun';
        icon.className = 'fas fa-moon';
    }
}

// 显示通知
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = typeof message === 'string' ? t(message) : '';
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    // 3秒后自动隐藏
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.style.display = 'none';
            notification.style.opacity = '1';
        }, 500);
    }, 3000);
}

// 添加表情到输入框
function addEmojiToInput(emoji) {
    const messageInput = document.getElementById('message');
    if (!messageInput) return;
    
    const startPos = messageInput.selectionStart;
    const endPos = messageInput.selectionEnd;
    const currentValue = messageInput.value;
    
    messageInput.value = 
        currentValue.substring(0, startPos) + 
        emoji + 
        currentValue.substring(endPos);
    
    const newPos = startPos + emoji.length;
    messageInput.focus();
    messageInput.setSelectionRange(newPos, newPos);
}

// 格式化日期（相对时间）
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  
  if (diffInDays === 0) {
    if (diffInHours === 0) {
      if (diffInMinutes < 1) return t('justNow');
      return `${diffInMinutes}${t('minutesAgo')}`;
    }
    return `${diffInHours}${t('hoursAgo')}`;
  } else if (diffInDays === 1) {
    return t('yesterday');
  } else if (diffInDays < 7) {
    return `${diffInDays}${t('daysAgo')}`;
  } else {
    // 超过一周显示完整日期
    return date.toLocaleDateString(getCurrentLanguage(), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

// 渲染留言列表
async function renderMessages() {
    try {
        // 显示加载中
        messagesList.innerHTML = `
            <div class="loading-messages">
                <i class="fas fa-spinner fa-spin"></i> ${t('loadingMessages')}
            </div>`;
            
        // 从静态JSON文件加载数据
        const response = await fetch(MESSAGES_JSON_PATH);
        
        if (!response.ok) {
            throw new Error(`加载失败: ${response.status} ${response.statusText}`);
        }
        
        messages = await response.json();
        
        if (!Array.isArray(messages)) {
            throw new Error('数据格式不正确');
        }
        
        console.log(`成功加载 ${messages.length} 条留言`);
        
        if (messages.length === 0) {
            messagesList.innerHTML = `
                <div class="no-messages">
                    <i class="fas fa-comment-slash"></i>
                    <p>${t('noMessages')}</p>
                </div>`;
            return;
        }
        
        // 按时间倒序排序
        messages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        messagesList.innerHTML = messages.map(msg => `
            <div class="message-card" data-id="${msg.id}">
                <div class="message-header">
                    <span class="message-name">${msg.name}</span>
                    <span class="message-time">${formatDate(msg.created_at)}</span>
                </div>
                <div class="message-content">${msg.message ? msg.message.replace(/\n/g, '<br>') : ''}</div>
                ${msg.is_admin_reply ? `<div class="admin-reply-badge"><i class="fas fa-shield-alt"></i> ${t('adminReply')}</div>` : ''}
            </div>
        `).join('');
    } catch (error) {
        console.error('加载留言失败:', error);
        messagesList.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${t('loadError')} <a href="javascript:location.reload()">${t('refreshPage')}</a></p>
                <p class="error-details" style="font-size: 12px; color: #999; margin-top: 5px;">${error.message}</p>
            </div>`;
    }
}

// 添加新留言
async function addMessage(name, email, message) {
    try {
        // 显示加载状态
        showNotification(t('sendingMessage'), 'info');
        
        // 创建新留言对象
        const newMessage = {
            id: Date.now(), // 临时ID
            name: name.trim(),
            email: email.trim() || 'guest@example.com',
            message: message.trim(),
            status: 'pending',
            created_at: new Date().toISOString(),
            is_admin_reply: false
        };
        
        // 添加到本地数组
        messages.unshift(newMessage);
        
        // 更新UI
        await renderMessages();
        
        // 显示成功消息
        showNotification(t('messageSent'));
        
        // 清空表单
        if (messageForm) {
            messageForm.reset();
        }
        
        // 注意：在实际部署时，您需要实现一个API端点来处理留言提交
        // 或者使用表单提交到表单处理服务（如Formspree、Netlify Forms等）
        console.warn('留言已添加到本地，但需要配置后端API以保存到数据库');
        
    } catch (error) {
        console.error('发送留言失败:', error);
        showNotification(t('submitError'), 'error');
    }
}

// 检查节日
function checkHoliday() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const date = now.getDate();
    
    // 多语言节日数据
    const holidays = {
        // 通用节日
        '0101': { 
            zh: { title: '元旦', message: '🎉 新年快乐！愿新的一年充满欢乐和惊喜！' },
            en: { title: 'New Year', message: '🎉 Happy New Year! Wishing you a year full of joy and surprises!' },
            ja: { title: '元日', message: '🎉 明けましておめでとうございます！素晴らしい1年になりますように！' },
            daysBefore: 3 
        },
        '0214': { 
            zh: { title: '情人节', message: '❤️ 情人节快乐！愿你的每一天都充满爱～' },
            en: { title: 'Valentine\'s Day', message: '❤️ Happy Valentine\'s Day! May your days be filled with love~' },
            ja: { title: 'バレンタインデー', message: '❤️ バレンタインデーおめでとう！愛に満ちた1日を～' },
            daysBefore: 3 
        },
        '1225': { 
            zh: { title: '圣诞节', message: '🎄 圣诞快乐！愿你的生活充满温暖和喜悦～' },
            en: { title: 'Christmas', message: '🎄 Merry Christmas! May your life be filled with warmth and joy~' },
            ja: { title: 'クリスマス', message: '🎄 メリークリスマス！素敵な1日になりますように～' },
            daysBefore: 7 
        },
        
        // 中国特有节日
        '1001': { 
            zh: { title: '国庆节', message: '🇨🇳 国庆节快乐！' },
            en: { title: 'National Day', message: '🇨🇳 Happy National Day of China!' },
            ja: { title: '中国国慶節', message: '🇨🇳 中国の国慶節、おめでとうございます！' },
            daysBefore: 5,
            regions: ['zh']
        },
        '0501': { 
            zh: { title: '劳动节', message: '👷 劳动节快乐！感谢你的辛勤付出～' },
            en: { title: 'Labor Day', message: '👷 Happy Labor Day! Thank you for your hard work~' },
            ja: { title: '労働者の日', message: '👷 労働者の日、お疲れ様です！' },
            daysBefore: 3
        },
        '0601': { 
            zh: { title: '儿童节', message: '🎈 儿童节快乐！保持童心，永远年轻～' },
            en: { title: 'Children\'s Day', message: '🎈 Happy Children\'s Day! Stay young at heart~' },
            ja: { title: '子供の日', message: '🎈 こどもの日おめでとう！' },
            daysBefore: 3
        },
        
        // 日本特有节日
        '0203': {
            zh: { title: '节分', message: '👹 节分快乐！撒豆驱鬼迎福～' },
            en: { title: 'Setsubun', message: '👹 Happy Setsubun! Drive away evil spirits and welcome good fortune~' },
            ja: { title: '節分', message: '👹 鬼は外！福は内！' },
            daysBefore: 3,
            regions: ['ja']
        },
        '0717': {
            zh: { title: '海之日', message: '🌊 海之日快乐！' },
            en: { title: 'Marine Day', message: '🌊 Happy Marine Day! Enjoy the ocean~' },
            ja: { title: '海の日', message: '🌊 海の日、海に感謝する日です' },
            daysBefore: 3,
            regions: ['ja']
        },
        
        // 西方节日
        '1104': {
            zh: { title: '感恩节', message: '🦃 感恩节快乐！感谢有你～' },
            en: { title: 'Thanksgiving', message: '🦃 Happy Thanksgiving! So much to be thankful for~' },
            ja: { title: '感謝祭', message: '🦃 感謝祭、日頃の感謝を伝えましょう' },
            daysBefore: 3,
            regions: ['en']
        },
        '1031': {
            zh: { title: '万圣节', message: '🎃 万圣节快乐！不给糖就捣蛋～' },
            en: { title: 'Halloween', message: '🎃 Happy Halloween! Trick or treat~' },
            ja: { title: 'ハロウィン', message: '🎃 ハロウィンおめでとう！トリック・オア・トリート！' },
            daysBefore: 3
        },
        
        // 其他节日
        '0401': { 
            zh: { title: '愚人节', message: '🎭 今天是愚人节，小心被整蛊哦～' },
            en: { title: 'April Fools\' Day', message: '🎭 Happy April Fools\' Day! Watch out for pranks~' },
            ja: { title: 'エイプリルフール', message: '🎭 エイプリルフール！嘘をついてもいい日です～' },
            daysBefore: 1 
        },
        '1231': { 
            zh: { title: '除夕', message: '🎆 新年快乐！愿新的一年万事如意～' },
            en: { title: 'New Year\'s Eve', message: '🎆 Happy New Year\'s Eve! Wishing you all the best in the coming year~' },
            ja: { title: '大晦日', message: '🎆 良いお年をお迎えください！' },
            daysBefore: 3 
        },
        '0814': {
            zh: { title: 'Hiyori生日快乐', message: '🎂 祝Hiyori生日快乐！愿你的每一天都充满阳光和欢笑！' },
            en: { title: 'Happy Birthday Hiyori', message: '🎂 Happy Birthday Hiyori! Wishing you a day filled with sunshine and laughter!' },
            ja: { title: 'ひよりさん、お誕生日おめでとう', message: '🎂 ひよりさん、お誕生日おめでとうございます！素晴らしい1年になりますように！' },
            daysBefore: 3,
            isBirthday: true
        }
    };
    
    // 检查今天是否是节日或节日前几天
    for (const [key, holiday] of Object.entries(holidays)) {
        const holidayMonth = parseInt(key.substring(0, 2));
        const holidayDate = parseInt(key.substring(2));
        
        // 检查是否是节日当天
        if (month === holidayMonth && date === holidayDate) {
            showHolidayPopup(holiday.title, holiday.message);
            return;
        }
        
        // 检查是否是节日前几天
        for (let i = 1; i <= holiday.daysBefore; i++) {
            const checkDate = new Date(now);
            checkDate.setDate(date + i);
            
            if (checkDate.getMonth() + 1 === holidayMonth && 
                checkDate.getDate() === holidayDate) {
                showHolidayPopup(
                    `即将到来：${holiday.title}`, 
                    `再${i}天就是${holiday.title}啦！${holiday.message}`,
                    i
                );
                return;
            }
        }
    }
}

// 显示节日弹窗
function showHolidayPopup(title, message, daysLeft = 0) {
    // 检查是否已经显示过
    const lastShown = localStorage.getItem(`holiday_${title}_${daysLeft}`);
    if (lastShown) {
        const lastShownDate = new Date(lastShown);
        const today = new Date().toDateString();
        
        if (lastShownDate.toDateString() === today) {
            return; // 今天已经显示过
        }
    }
    
    // 创建弹窗元素
    const popup = document.createElement('div');
    popup.className = 'holiday-popup';
    popup.innerHTML = `
        <div class="holiday-popup-content">
            <h3>${title}</h3>
            <p>${message}</p>
            <div class="holiday-popup-actions">
                <button id="closeHolidayPopup">${t('close')}</button>
                <label>
                    <input type="checkbox" id="dontShowAgain"> ${t('dontShowAgain')}
                </label>
            </div>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
        .holiday-popup {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            animation: fadeIn 0.3s;
        }
        
        .holiday-popup-content {
            background: white;
            padding: 25px;
            border-radius: 15px;
            max-width: 90%;
            width: 400px;
            text-align: center;
            box-shadow: 0 4px 24px rgba(0,0,0,0.18);
        }
        
        .holiday-popup h3 {
            color: #e91e63;
            margin-bottom: 15px;
            font-size: 24px;
        }
        
        .holiday-popup p {
            margin-bottom: 20px;
            font-size: 16px;
            line-height: 1.6;
        }
        
        .holiday-popup-actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 20px;
        }
        
        .holiday-popup button {
            background: #e91e63;
            color: white;
            border: none;
            padding: 8px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.3s;
        }
        
        .holiday-popup button:hover {
            background: #c2185b;
        }
        
        .holiday-popup label {
            font-size: 13px;
            color: #666;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    // 添加事件监听
    document.getElementById('closeHolidayPopup').addEventListener('click', () => {
        const dontShowAgain = document.getElementById('dontShowAgain').checked;
        if (dontShowAgain) {
            localStorage.setItem(`holiday_${title}_${daysLeft}`, new Date().toISOString());
        }
        document.body.removeChild(popup);
        document.head.removeChild(style);
    });
}

// 初始化事件监听
function initEventListeners() {
    // 表单提交
    if (messageForm) {
        messageForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value || '';
            const message = document.getElementById('message').value;
            
            if (!name || !message) {
                showNotification(t('nameRequired'));
                return;
            }
            
            const submitBtn = messageForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            try {
                // 禁用提交按钮
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 发送中...';
                
                await addMessage(name, email, message);
                
                // 清空表单
                messageForm.reset();
                showNotification(t('messageSent'));
                
                // 重新加载留言列表
                await renderMessages();
                
            } catch (error) {
                console.error('提交留言失败:', error);
                showNotification('提交留言失败，请稍后重试');
            } finally {
                // 恢复提交按钮
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }
    
    // 主题切换
    themeSwitch.addEventListener('click', toggleTheme);
    
    // 表情点击事件
    document.querySelectorAll('.emoji').forEach(emoji => {
        emoji.addEventListener('click', (e) => {
            e.preventDefault();
            const emojiChar = emoji.getAttribute('data-emoji');
            addEmojiToInput(emojiChar);
        });
    });
    
    // 检查节日
    checkHoliday();
}

// 显示节日弹窗
function showHolidayPopup(title, message, daysLeft = 0) {
    // 检查是否已经显示过
    const lastShown = localStorage.getItem(`holiday_${title}_${daysLeft}`);
    if (lastShown) {
        const lastShownDate = new Date(lastShown);
        const today = new Date().toDateString();
        
        if (lastShownDate.toDateString() === today) {
            return; // 今天已经显示过
        }
    }
    
    // 创建弹窗元素
    const popup = document.createElement('div');
    popup.className = 'holiday-popup';
    popup.innerHTML = `
        <div class="holiday-popup-content">
            <h3>${title}</h3>
            <p>${message}</p>
            <div class="holiday-popup-actions">
                <button id="closeHolidayPopup">关闭</button>
                <label>
                    <input type="checkbox" id="dontShowAgain"> 今天不再显示
                </label>
            </div>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
        .holiday-popup {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            animation: fadeIn 0.3s;
        }
        
        .holiday-popup-content {
            background: white;
            padding: 25px;
            border-radius: 15px;
            max-width: 90%;
            width: 400px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }
        
        .holiday-popup h3 {
            color: #e91e63;
            margin-bottom: 15px;
            font-size: 24px;
        }
        
        .holiday-popup p {
            margin-bottom: 20px;
            font-size: 16px;
            line-height: 1.6;
        }
        
        .holiday-popup-actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 20px;
        }
        
        .holiday-popup button {
            background: #e91e63;
            color: white;
            border: none;
            padding: 8px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.3s;
        }
        
        .holiday-popup button:hover {
            background: #c2185b;
        }
        
        .holiday-popup label {
            font-size: 13px;
            color: #666;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    // 添加事件监听
    document.getElementById('closeHolidayPopup').addEventListener('click', () => {
        const dontShowAgain = document.getElementById('dontShowAgain').checked;
        if (dontShowAgain) {
            localStorage.setItem(`holiday_${title}_${daysLeft}`, new Date().toISOString());
        }
        document.body.removeChild(popup);
        document.head.removeChild(style);
    });
}

// 初始化应用
function init() {
    initTheme();
    initEventListeners();
    renderMessages();
    
    // 检查节日（延迟执行，避免影响页面加载）
    setTimeout(checkHoliday, 1000);
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
