// 初始化DOM元素
let messageForm, messagesList, notification, refreshButton;

// 安全地获取DOM元素
function getElementSafely(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.error(`Element with id '${id}' not found`);
    }
    return element;
}

// 初始化DOM元素引用
function initElements() {
    messageForm = getElementSafely('messageForm');
    messagesList = getElementSafely('messagesList');
    notification = getElementSafely('notification');
    refreshButton = getElementSafely('refreshMessages');
    
    // 检查必要的元素是否存在
    if (!messageForm || !messagesList) {
        console.error('Required elements not found. Make sure the page has the correct structure.');
        return false;
    }
    return true;
}

// 主题切换按钮
const themeSwitch = document.createElement('div');
themeSwitch.className = 'theme-switch';
themeSwitch.innerHTML = '<i class="fas fa-moon"></i>';
document.body.appendChild(themeSwitch);

// 消息数据路径 - 指向项目根目录下的 data 文件夹
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
    if (!notification) {
        console.error('通知元素未找到');
        return;
    }
    
    // 直接显示消息，不使用 t() 函数
    notification.textContent = typeof message === 'string' ? message : '';
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    notification.style.opacity = '1';
    
    // 3秒后开始淡出
    setTimeout(() => {
        notification.style.opacity = '0';
        // 淡出动画完成后隐藏
        setTimeout(() => {
            notification.style.display = 'none';
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
    // 确保 messagesList 已初始化
    const messagesList = document.getElementById('messagesList');
    if (!messagesList) {
        console.error('无法找到留言列表容器');
        return;
    }
    
    try {
        // 显示加载中
        messagesList.innerHTML = `
            <div class="loading-messages">
                <i class="fas fa-spinner fa-spin"></i> 正在加载留言...
            </div>`;
            
        // 尝试从服务器加载留言
        try {
            console.log('正在从服务器加载留言数据，路径:', MESSAGES_JSON_PATH);
            const response = await fetch(MESSAGES_JSON_PATH, {
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                cache: 'no-cache'
            });
            
            if (response.ok) {
                const responseText = await response.text();
                console.log('从服务器收到响应:', responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''));
                
                try {
                    messages = JSON.parse(responseText);
                    console.log('成功从服务器加载留言数据，数量:', messages.length);
                    
                    // 保存到本地存储作为备份
                    try {
                        localStorage.setItem('guestbook_messages', JSON.stringify(messages));
                    } catch (localError) {
                        console.warn('无法保存留言到本地存储:', localError);
                    }
                    
                } catch (parseError) {
                    console.error('解析服务器返回的JSON时出错:', parseError);
                    throw new Error(`解析留言数据失败: ${parseError.message}`);
                }
            } else {
                // 如果服务器请求失败，尝试从本地存储加载
                console.warn('从服务器加载留言失败，尝试从本地存储加载...');
                throw new Error('无法从服务器加载留言');
            }
            
        } catch (serverError) {
            console.warn('从服务器加载留言失败:', serverError);
            
            // 尝试从本地存储加载
            try {
                const savedMessages = localStorage.getItem('guestbook_messages');
                if (savedMessages) {
                    messages = JSON.parse(savedMessages);
                    console.log('从本地存储加载留言数据，数量:', messages.length);
                    showNotification('已从本地缓存加载留言', 'info');
                } else {
                    console.log('本地存储中没有留言数据');
                    messages = [];
                }
            } catch (localError) {
                console.error('从本地存储加载留言失败:', localError);
                messages = [];
                throw new Error('无法加载留言，请检查网络连接后刷新页面重试');
            }
        }
        
        if (!Array.isArray(messages)) {
            throw new Error('数据格式不正确');
        }
        
        console.log(`成功加载 ${messages.length} 条留言`);
        
        if (messages.length === 0) {
            messagesList.innerHTML = `
                <div class="no-messages">
                    <i class="fas fa-comment-slash"></i>
                    <p>暂无留言，快来留下第一条吧！</p>
                </div>`;
            return;
        }
        
        try {
            // 按时间倒序排序
            messages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
            messagesList.innerHTML = messages.map(msg => `
                <div class="message-card" data-id="${msg.id || ''}">
                    <div class="message-header">
                        <span class="message-name">${msg.name || '匿名用户'}</span>
                        <span class="message-time">${msg.created_at ? formatDate(msg.created_at) : '未知时间'}</span>
                    </div>
                    <div class="message-content">${msg.message ? msg.message.replace(/\n/g, '<br>') : ''}</div>
                    ${msg.is_admin_reply ? `<div class="admin-reply-badge"><i class="fas fa-shield-alt"></i> 管理员回复</div>` : ''}
                </div>
            `).join('');
        } catch (renderError) {
            console.error('渲染留言时出错:', renderError);
            throw new Error('渲染留言时出错: ' + renderError.message);
        }
    } catch (error) {
        console.error('加载留言失败:', error);
        // 直接使用中文提示，不依赖 t() 函数
        const errorMessage = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>加载留言失败，请<a href="javascript:location.reload()">刷新页面</a>重试</p>
                <p class="error-details" style="font-size: 12px; color: #999; margin-top: 5px;">${error.message || '未知错误'}</p>
            </div>`;
            
        if (messagesList && messagesList.innerHTML !== undefined) {
            messagesList.innerHTML = errorMessage;
        } else {
            console.error('无法显示错误信息: messagesList 未定义');
        }
    }
}

// 添加新留言
async function addMessage(name, email, message) {
    // 确保 messagesList 存在
    const messagesList = document.getElementById('messagesList');
    if (!messagesList) {
        console.error('留言列表容器未找到');
        showNotification('无法找到留言列表容器', 'error');
        return;
    }
    
    try {
        // 显示加载状态
        showNotification('正在提交留言...', 'info');
        
        // 创建新留言对象
        const newMessage = {
            id: Date.now(), // 临时ID
            name: name.trim() || '匿名用户',
            email: email.trim() || 'guest@example.com',
            message: message.trim(),
            status: 'pending',
            created_at: new Date().toISOString(),
            is_admin_reply: false
        };
        
        console.log('添加新留言:', newMessage);
        
        // 添加到本地数组
        if (!Array.isArray(messages)) {
            messages = [];
        }
        messages.unshift(newMessage);
        
        // 立即更新UI
        try {
            // 创建新的留言元素
            const messageElement = document.createElement('div');
            messageElement.className = 'message-card';
            messageElement.dataset.id = newMessage.id;
            messageElement.innerHTML = `
                <div class="message-header">
                    <span class="message-name">${newMessage.name}</span>
                    <span class="message-time">刚刚</span>
                </div>
                <div class="message-content">${newMessage.message.replace(/\n/g, '<br>')}</div>
            `;
            
            // 添加到列表顶部
            if (messagesList.firstChild) {
                messagesList.insertBefore(messageElement, messagesList.firstChild);
            } else {
                messagesList.appendChild(messageElement);
            }
            
            // 显示成功消息
            showNotification('留言提交成功！');
            
        } catch (renderError) {
            console.error('更新UI时出错:', renderError);
            // 如果UI更新失败，尝试重新渲染整个列表
            await renderMessages();
        }
        
        // 保存到本地存储
        try {
            localStorage.setItem('guestbook_messages', JSON.stringify(messages));
        } catch (localError) {
            console.error('保存到本地存储失败:', localError);
            showNotification('留言已提交，但无法保存到本地存储', 'warning');
        }
        
        // 清空表单
        if (messageForm) {
            messageForm.reset();
        }
        
        // 尝试保存到服务器（如果有后端API）
        try {
            const response = await fetch('/api/save-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newMessage)
            });
            
            if (!response.ok) {
                throw new Error('保存留言到服务器失败');
            }
            
            console.log('留言已保存到服务器');
            
        } catch (saveError) {
            console.error('保存留言到服务器失败:', saveError);
            // 这里不显示错误信息，因为已经在本地保存成功
        }
        
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

// 显示错误信息
function showError(message) {
    console.error(message);
    // 尝试在页面上显示错误信息
    const errorContainer = document.getElementById('errorContainer');
    if (errorContainer) {
        errorContainer.style.display = 'block';
        const errorMessage = errorContainer.querySelector('p');
        if (errorMessage) {
            errorMessage.textContent = message;
        }
    }
    
    // 同时也在控制台输出
    console.error(message);
}

// 页面加载完成后初始化
console.log('Guestbook script loaded');

// 确保DOM完全加载后再初始化
function onDOMContentLoaded() {
    console.log('DOM fully loaded, initializing guestbook...');
    try {
        // 确保必要的 DOM 元素存在
        if (!document.getElementById('messagesList')) {
            throw new Error('无法找到留言列表容器');
        }
        
        // 初始化元素
        if (!initElements()) {
            throw new Error('初始化页面元素失败');
        }
        
        // 初始化应用
        init();
    } catch (error) {
        console.error('Failed to initialize guestbook:', error);
        showError(`初始化留言板失败: ${error.message || '未知错误'}`);
    }
}

// 添加 DOM 加载完成事件监听
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onDOMContentLoaded);
} else {
    // DOMContentLoaded has already fired
    onDOMContentLoaded();
}

// 添加全局错误处理
window.addEventListener('error', function(event) {
    const error = event.error || event;
    const errorMessage = error.message || '发生未知错误';
    console.error('Unhandled error:', error);
    
    // 显示错误通知
    const notification = document.getElementById('notification');
    if (notification) {
        notification.textContent = `错误: ${errorMessage}`;
        notification.className = 'notification error';
        notification.style.display = 'block';
        
        // 5秒后自动隐藏
        setTimeout(() => {
            notification.style.display = 'none';
        }, 5000);
    }
    
    // 使用 showError 显示错误
    showError(`发生错误: ${errorMessage}`);
    return false;
});

// 添加未捕获的Promise错误处理
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    showError(`操作失败: ${event.reason?.message || '未知错误'}`);
    event.preventDefault();
});
