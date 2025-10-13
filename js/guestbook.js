// 初始化DOM元素
const messageForm = document.getElementById('messageForm');
const messagesList = document.getElementById('messagesList');
const notification = document.getElementById('notification');

// 主题切换按钮
const themeSwitch = document.createElement('div');
themeSwitch.className = 'theme-switch';
themeSwitch.innerHTML = '<i class="fas fa-moon"></i>';
document.body.appendChild(themeSwitch);

// 初始化留言数据（使用网站范围的存储）
let messages = [];

// 获取当前语言
function getCurrentLanguage() {
  const path = window.location.pathname;
  if (path.includes('/en/')) return 'en';
  if (path.includes('/ja/')) return 'ja';
  return 'zh'; // 默认为中文
}

// 本地化文本
const i18n = {
  zh: {
    noMessages: '还没有留言，快来成为第一个留言的人吧~',
    messageSent: '留言已发布！',
    nameRequired: '请填写昵称和留言内容',
    today: '今天',
    yesterday: '昨天',
    daysAgo: '天前',
    justNow: '刚刚',
    minutesAgo: '分钟前',
    hoursAgo: '小时前'
  },
  en: {
    noMessages: 'No messages yet. Be the first to leave a message~',
    messageSent: 'Message sent!',
    nameRequired: 'Please enter your name and message',
    today: 'Today',
    yesterday: 'Yesterday',
    daysAgo: ' days ago',
    justNow: 'Just now',
    minutesAgo: ' minutes ago',
    hoursAgo: ' hours ago'
  },
  ja: {
    noMessages: 'まだメッセージがありません。最初のメッセージを送ってみましょう～',
    messageSent: 'メッセージを送信しました！',
    nameRequired: 'お名前とメッセージを入力してください',
    today: '今日',
    yesterday: '昨日',
    daysAgo: '日前',
    justNow: 'たった今',
    minutesAgo: '分前',
    hoursAgo: '時間前'
  }
};

// 获取本地化文本
function t(key) {
  const lang = getCurrentLanguage();
  return i18n[lang]?.[key] || i18n.zh[key] || key;
}

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return value
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMessageContent(text) {
  if (!text) return '';
  return escapeHtml(text).replace(/\n/g, '<br>');
}

async function loadMessagesFromServer() {
  const queryLang = 'all';
  try {
    const response = await fetch(`/api/messages?lang=${queryLang}`);
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || '加载留言失败');
    }
    messages = Array.isArray(result.data) ? result.data : [];
    renderMessages();
  } catch (error) {
    console.error('加载留言失败:', error);
    messages = [];
    renderMessages();
    showNotification(error.message || '加载留言失败');
  }
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
    } else {
        icon.className = 'fas fa-moon';
    }
}

// 显示通知
function showNotification(message, duration = 3000) {
    notification.textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, duration);
}

// 添加表情到输入框
function addEmojiToInput(emoji) {
    const messageInput = document.getElementById('message');
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
function renderMessages() {
    if (!messages || messages.length === 0) {
        messagesList.innerHTML = `
            <div class="no-messages">
                <i class="fas fa-comment-slash"></i>
                <p>${t('noMessages')}</p>
            </div>`;
        return;
    }
    
    messagesList.innerHTML = messages.map((msg, index) => {
        const timestamp = msg.created_at || msg.timestamp || new Date().toISOString();
        const currentLang = getCurrentLanguage();
        const languageCode = (msg.language || '').toString().trim() || 'global';
        const languageLabel = languageCode.toUpperCase();
        const rawName = msg.name && msg.name.trim() ? msg.name.trim() : (currentLang === 'ja' ? '匿名' : currentLang === 'en' ? 'Guest' : '匿名');
        const safeName = escapeHtml(rawName);
        const content = formatMessageContent(msg.message || '');
        const idValue = msg.id ?? index;
        return `
        <div class="message-card" data-id="${idValue}">
            <div class="message-header">
                <span class="message-name">${safeName}${languageLabel ? `<span class="message-language">${languageLabel}</span>` : ''}</span>
                <span class="message-time">${formatDate(timestamp)}</span>
            </div>
            <div class="message-content">${content}</div>
            ${msg.admin_reply ? `
                <div class="admin-reply">
                    <div class="admin-reply-header">
                        <img src="/1.png" class="admin-reply-icon" alt="白月 日和（しらつき ひより）" />
                        <span>白月 日和（しらつき ひより）</span>
                        <small>${formatDate(msg.admin_reply_at || timestamp)}</small>
                    </div>
                    <div class="admin-reply-content">${formatMessageContent(msg.admin_reply)}</div>
                </div>
            ` : ''}
        </div>`;
    }).join('');
}

// 添加新留言
async function addMessage(name, email, message) {
    const newMessage = {
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        timestamp: new Date().toISOString(),
        language: getCurrentLanguage()
    };
    
    try {
        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: newMessage.name,
                email: newMessage.email || null,
                message: newMessage.message,
                language: newMessage.language
            })
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || '提交留言失败');
        }
        messages.unshift(result.data || { ...newMessage, id: result.data?.id });
        
        // 重新渲染留言列表
        renderMessages();
        
        // 显示成功消息
      showNotification(t('messageSent'));
        await loadMessagesFromServer();
        return true;
    } catch (error) {
        console.error('提交留言失败:', error);
        showNotification(error.message || '提交留言失败');
        return false;
    }
}

function checkHoliday() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const currentLang = getCurrentLanguage();
    
    // 通用节日（所有语言版本都显示）
    const universalHolidays = {
        '0101': { // 元旦（联合国申遗成功）
            zh: { title: '元旦', message: '🎉 新年快乐！愿新的一年充满欢乐和惊喜！' },
            en: { title: 'New Year', message: '🎉 Happy New Year! Wishing you a year full of joy and surprises!' },
            ja: { title: '元日', message: '🎉 明けましておめでとうございます！素晴らしい1年になりますように！' },
            daysBefore: 3 
        }
    };
    
    // 中国节日（仅中文版显示）
    const chineseHolidays = {
        '0110': { // 中国人民警察节
            zh: { title: '中国人民警察节', message: '👮 中国人民警察节快乐！感谢您们的守护与付出！' },
            daysBefore: 1
        },
        '0501': { // 劳动节
            zh: { title: '劳动节', message: '👷 劳动节快乐！感谢你的辛勤付出～' },
            daysBefore: 3
        },
        '0601': { // 儿童节
            zh: { title: '儿童节', message: '🎈 儿童节快乐！保持童心，永远年轻～' },
            daysBefore: 3
        },
        '1001': { // 国庆节
            zh: { title: '国庆节', message: '🇨🇳 国庆节快乐！' },
            daysBefore: 5
        }
    };
    
    // 日本节日（仅日文版显示）
    const japaneseHolidays = {
        '0203': { // 节分
            ja: { title: '節分', message: '👹 鬼は外！福は内！' },
            daysBefore: 3
        },
        '0717': { // 海之日
            ja: { title: '海の日', message: '🌊 海の日、海に感謝する日です' },
            daysBefore: 3
        }
    };
    
    // 国际节日（英文版显示）
    const internationalHolidays = {
        '0214': { // 情人节
            en: { title: 'Valentine\'s Day', message: '❤️ Happy Valentine\'s Day! May your days be filled with love~' },
            daysBefore: 3 
        },
        '0401': { // 愚人节
            en: { title: 'April Fools\' Day', message: '🎭 Happy April Fools\' Day! Watch out for pranks~' },
            daysBefore: 1 
        },
        '1225': { // 圣诞节
            en: { title: 'Christmas', message: '🎄 Merry Christmas! May your life be filled with warmth and joy~' },
            daysBefore: 7 
        }
    };
    
    // 合并当前语言对应的节日
    let holidays = { ...universalHolidays };
    
    if (currentLang === 'zh') {
        Object.assign(holidays, chineseHolidays);
    } else if (currentLang === 'ja') {
        Object.assign(holidays, japaneseHolidays);
    } else { // en
        Object.assign(holidays, internationalHolidays);
    }
    
    // 检查今天是否是节日或节日前几天
    for (const [key, holiday] of Object.entries(holidays)) {
        const holidayMonth = parseInt(key.substring(0, 2));
        const holidayDate = parseInt(key.substring(2));
        const holidayData = holiday[currentLang] || holiday.zh || holiday.en || holiday.ja;
        
        if (!holidayData || !holidayData.title) continue;
        
        // 检查是否是节日当天
        if (month === holidayMonth && date === holidayDate) {
            showHolidayPopup(holidayData.title, holidayData.message);
            return;
        }
        
        // 检查是否是节日前几天
        for (let i = 1; i <= (holiday.daysBefore || 0); i++) {
            const checkDate = new Date(now);
            checkDate.setDate(date + i);
            
            if (checkDate.getMonth() + 1 === holidayMonth && 
                checkDate.getDate() === holidayDate) {
                const daysLeft = i;
                const daysText = currentLang === 'zh' ? `再${daysLeft}天` : 
                               (currentLang === 'ja' ? `あと${daysLeft}日` : 
                               `${daysLeft} day${daysLeft > 1 ? 's' : ''}`);
                const comingSoon = currentLang === 'zh' ? '即将到来：' : 
                                 (currentLang === 'ja' ? '間もなく：' : 'Coming soon: ');
                
                showHolidayPopup(
                    `${comingSoon}${holidayData.title}`, 
                    currentLang === 'zh' ? `${daysText}就是${holidayData.title}啦！${holidayData.message}` :
                     (currentLang === 'ja' ? `${daysText}で${holidayData.title}！${holidayData.message}` :
                     `${daysText} until ${holidayData.title}! ${holidayData.message}`),
                    daysLeft
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
    if (!messageForm) return;
    
    // 表单提交
    messageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nameInput = document.getElementById('name');
        const emailInput = document.getElementById('email');
        const messageInput = document.getElementById('message');
        
        // 验证输入
        if (!nameInput.value.trim() || !messageInput.value.trim()) {
          showNotification(t('nameRequired'));
          return;
        }
        
        // 添加留言
        const success = await addMessage(nameInput.value, emailInput.value, messageInput.value);
        
        if (success) {
            // 清空表单
            nameInput.value = '';
            messageInput.value = '';
            emailInput.value = '';
        }
    });
    
    // 表情点击
    document.querySelectorAll('.emoji').forEach(emoji => {
        emoji.addEventListener('click', () => {
            addEmojiToInput(emoji.getAttribute('data-emoji'));
        });
    });
    
    // 主题切换
    themeSwitch.addEventListener('click', toggleTheme);
}

// 检查节日
function checkHoliday() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const date = now.getDate();
    
    // 多语言节日数据
    const holidays = {
        // 通用节日（所有语言均显示）
        '0101': {
            zh: { title: '元旦', message: '🎉 新年快乐！愿新的一年充满欢乐和惊喜！' },
            en: { title: 'New Year', message: '🎉 Happy New Year! Wishing you a year full of joy and surprises!' },
            ja: { title: '元日', message: '🎉 明けましておめでとうございます！素晴らしい1年になりますように！' },
            daysBefore: 3
        },

        // 中国节日（仅中文显示）
        '0110': { // 中国人民警察节
            zh: { title: '中国人民警察节', message: '👮 向守护我们的人民警察致敬！节日快乐！' },
            en: { title: '', message: '' },
            ja: { title: '', message: '' },
            regions: ['zh'],
            daysBefore: 1
        },
        '0312': { // 植树节
            zh: { title: '植树节', message: '🌳 植树节，让我们一起种下希望！' },
            en: { title: '', message: '' },
            ja: { title: '', message: '' },
            regions: ['zh'],
            daysBefore: 3
        },
        '0501': { // 劳动节 + 站点周年
            zh: { title: '劳动节', message: '👷 劳动节快乐！感谢你的辛勤付出～ 同时也是本站周年纪念日，感谢一路相伴！' },
            en: { title: '', message: '' },
            ja: { title: '', message: '' },
            regions: ['zh'],
            daysBefore: 3
        },
        '0601': { // 儿童节
            zh: { title: '儿童节', message: '🎈 儿童节快乐！保持童心，永远年轻～' },
            en: { title: '', message: '' },
            ja: { title: '', message: '' },
            regions: ['zh'],
            daysBefore: 3
        },
        '0910': { // 教师节
            zh: { title: '教师节', message: '🍎 教师节快乐！感谢每一位辛勤的园丁～' },
            en: { title: '', message: '' },
            ja: { title: '', message: '' },
            regions: ['zh'],
            daysBefore: 3
        },
        '1024': { // 程序员节
            zh: { title: '程序员节', message: '👨‍💻 程序员节快乐！bug 退散，效率加成！' },
            en: { title: '', message: '' },
            ja: { title: '', message: '' },
            regions: ['zh'],
            daysBefore: 3
        },
        '1001': { // 国庆节（仅中文显示）
            zh: { title: '国庆节', message: '🇨🇳 国庆节快乐！' },
            en: { title: '', message: '' },
            ja: { title: '', message: '' },
            regions: ['zh'],
            daysBefore: 5
        },

        // 日本节日（仅日文版显示，非敏感）
        '0101': { // 元日
            zh: { title: '', message: '' },
            en: { title: '', message: '' },
            ja: { title: '元日', message: '🎍 明けましておめでとうございます！今年もよろしくお願いします！' },
            regions: ['ja'],
            daysBefore: 3
        },
        '0110': { // 成人の日（1月第2月曜日）
            zh: { title: '', message: '' },
            en: { title: '', message: '' },
            ja: { title: '成人の日', message: '👔 新成人の皆さん、おめでとうございます！' },
            regions: ['ja'],
            daysBefore: 3
        },
        '0203': { // 節分
            zh: { title: '', message: '' },
            en: { title: '', message: '' },
            ja: { title: '節分', message: '👹 鬼は外！福は内！' },
            regions: ['ja'],
            daysBefore: 3
        },
        '0303': { // ひな祭り
            zh: { title: '', message: '' },
            en: { title: '', message: '' },
            ja: { title: 'ひな祭り', message: '🎎 女の子の健やかな成長を願う日です' },
            regions: ['ja'],
            daysBefore: 3
        },
        '0401': { // エイプリルフール（与通用0401并存，日文消息更口语化）
            zh: { title: '', message: '' },
            en: { title: '', message: '' },
            ja: { title: 'エイプリルフール', message: '🎭 今日だけは嘘をついても許される日です' },
            regions: ['ja'],
            daysBefore: 1
        },
        '0408': { // 花祭り（お釈迦様の誕生日）
            zh: { title: '', message: '' },
            en: { title: '', message: '' },
            ja: { title: '花祭り', message: '🌸 お釈迦様の誕生日です' },
            regions: ['ja'],
            daysBefore: 3
        },
        '0429': { // 昭和の日（文化に親しむ日）
            zh: { title: '', message: '' },
            en: { title: '', message: '' },
            ja: { title: '昭和の日', message: '📜 文化に親しむ日' },
            regions: ['ja'],
            daysBefore: 3
        },
        '0504': { // みどりの日
            zh: { title: '', message: '' },
            en: { title: '', message: '' },
            ja: { title: 'みどりの日', message: '🌳 自然に親しみ、その恩恵に感謝する日' },
            regions: ['ja'],
            daysBefore: 3
        },
        '0505': { // こどもの日
            zh: { title: '', message: '' },
            en: { title: '', message: '' },
            ja: { title: 'こどもの日', message: '🎏 子供の健やかな成長を願う日です' },
            regions: ['ja'],
            daysBefore: 3
        },
        '0717': { // 海の日
            zh: { title: '', message: '' },
            en: { title: '', message: '' },
            ja: { title: '海の日', message: '🌊 海の恩恵に感謝する日です' },
            regions: ['ja'],
            daysBefore: 3
        },
        '0811': { // 山の日
            zh: { title: '', message: '' },
            en: { title: '', message: '' },
            ja: { title: '山の日', message: '⛰️ 山の恵みに感謝する日です' },
            regions: ['ja'],
            daysBefore: 3
        },
        '0916': { // 敬老の日（9月第3月曜日・固定化表記）
            zh: { title: '', message: '' },
            en: { title: '', message: '' },
            ja: { title: '敬老の日', message: '👵 おじいちゃん、おばあちゃん、いつもありがとう' },
            regions: ['ja'],
            daysBefore: 3
        },
        '1009': { // スポーツの日（10月第2月曜日・固定化表記）
            zh: { title: '', message: '' },
            en: { title: '', message: '' },
            ja: { title: 'スポーツの日', message: '⚽ スポーツを楽しみ、健康な心身を育む日' },
            regions: ['ja'],
            daysBefore: 3
        },
        '1103': { // 文化の日
            zh: { title: '', message: '' },
            en: { title: '', message: '' },
            ja: { title: '文化の日', message: '🎨 文化を大切にする日' },
            regions: ['ja'],
            daysBefore: 3
        },
        '1115': { // 七五三
            zh: { title: '', message: '' },
            en: { title: '', message: '' },
            ja: { title: '七五三', message: '👘 子供の成長を祝い、これからの幸せを願う日' },
            regions: ['ja'],
            daysBefore: 3
        },
        '1224': { // クリスマスイブ
            zh: { title: '', message: '' },
            en: { title: '', message: '' },
            ja: { title: 'クリスマスイブ', message: '🎄 メリークリスマス！素敵な夜になりますように' },
            regions: ['ja'],
            daysBefore: 1
        },
        '1225': { // クリスマス
            zh: { title: '', message: '' },
            en: { title: '', message: '' },
            ja: { title: 'クリスマス', message: '🎅 メリークリスマス！' },
            regions: ['ja'],
            daysBefore: 3
        },
        '1231': { // 大晦日
            zh: { title: '', message: '' },
            en: { title: '', message: '' },
            ja: { title: '大晦日', message: '🎍 今年もお世話になりました。良いお年を！' },
            regions: ['ja'],
            daysBefore: 3
        },

        // 国际节日（仅英文显示，非政治敏感）
        '0308': { // 国际妇女节
            zh: { title: '', message: '' },
            en: { title: 'International Women\'s Day', message: '🌷 Celebrating strength and achievements.' },
            ja: { title: '', message: '' },
            regions: ['en'],
            daysBefore: 3
        },
        '0317': { // 圣帕特里克节
            zh: { title: '', message: '' },
            en: { title: 'St. Patrick\'s Day', message: '🍀 May luck be with you.' },
            ja: { title: '', message: '' },
            regions: ['en'],
            daysBefore: 3
        },
        '0401': { // 愚人节（国际普遍）
            zh: { title: '愚人节', message: '🎭 今天是愚人节，小心被整蛊哦～' },
            en: { title: 'April Fools\' Day', message: '🎭 Watch out for pranks~' },
            ja: { title: 'エイプリルフール', message: '🎭 嘘をついてもいい日です～' },
            daysBefore: 1
        },
        '0422': { // 地球日
            zh: { title: '', message: '' },
            en: { title: 'Earth Day', message: '🌍 Love our planet. Act for the Earth.' },
            ja: { title: '', message: '' },
            regions: ['en'],
            daysBefore: 3
        },
        '0423': { // 世界读书日
            zh: { title: '', message: '' },
            en: { title: 'World Book Day', message: '📚 Keep reading. Keep growing.' },
            ja: { title: '', message: '' },
            regions: ['en'],
            daysBefore: 3
        },
        '0605': { // 世界环境日
            zh: { title: '', message: '' },
            en: { title: 'World Environment Day', message: '🌱 Small actions, big impact.' },
            ja: { title: '', message: '' },
            regions: ['en'],
            daysBefore: 3
        },
        '0608': { // 世界海洋日
            zh: { title: '', message: '' },
            en: { title: 'World Oceans Day', message: '🌊 Protect our blue planet.' },
            ja: { title: '', message: '' },
            regions: ['en'],
            daysBefore: 3
        },
        '0621': { // 世界音乐日
            zh: { title: '', message: '' },
            en: { title: 'World Music Day', message: '🎶 Let the music play!' },
            ja: { title: '', message: '' },
            regions: ['en'],
            daysBefore: 3
        },
        '0707': { // 世界巧克力日
            zh: { title: '', message: '' },
            en: { title: 'World Chocolate Day', message: '🍫 Sweet day! Enjoy some chocolate!' },
            ja: { title: '', message: '' },
            regions: ['en'],
            daysBefore: 3
        },
        '0730': { // 国际友谊日
            zh: { title: '', message: '' },
            en: { title: 'International Day of Friendship', message: '🤝 Celebrate friendship and kindness.' },
            ja: { title: '', message: '' },
            regions: ['en'],
            daysBefore: 3
        },
        '1004': { // 世界动物日
            zh: { title: '', message: '' },
            en: { title: 'World Animal Day', message: '🐾 Be kind to animals.' },
            ja: { title: '', message: '' },
            regions: ['en'],
            daysBefore: 3
        },
        '1031': { // 万圣节
            zh: { title: '万圣节', message: '🎃 不给糖就捣蛋～' },
            en: { title: 'Halloween', message: '🎃 Trick or treat~' },
            ja: { title: 'ハロウィン', message: '🎃 トリック・オア・トリート！' },
            daysBefore: 3
        },
        '1225': { // 圣诞节
            zh: { title: '圣诞节', message: '🎄 圣诞快乐！愿你的生活充满温暖和喜悦～' },
            en: { title: 'Christmas', message: '🎄 Merry Christmas! May your life be filled with warmth and joy~' },
            ja: { title: 'クリスマス', message: '🎄 メリークリスマス！' },
            daysBefore: 7
        },

        // 个性化纪念日（显示在所有语言）
        '0814': { // 站长生日
            zh: { title: '生日快乐', message: '🎂 祝站长生日快乐！天天开心！' },
            en: { title: 'Happy Birthday', message: '🎂 Happy Birthday to the site owner! Have a wonderful day!' },
            ja: { title: 'お誕生日おめでとう', message: '🎂 サイト管理者さん、お誕生日おめでとうございます！' },
            daysBefore: 3,
            isBirthday: true
        },
        '1231': { // 除夕/跨年
            zh: { title: '除夕', message: '🎆 新年快乐！愿新的一年万事如意～' },
            en: { title: 'New Year\'s Eve', message: '🎆 Happy New Year\'s Eve! All the best in the coming year~' },
            ja: { title: '大晦日', message: '🎆 良いお年を！' },
            daysBefore: 3
        }
    };
    
    const lang = getCurrentLanguage();
    // 检查今天是否是节日或节日前几天（支持多语言/区域）
    for (const [key, holiday] of Object.entries(holidays)) {
        // 区域限制
        if (holiday.regions && !holiday.regions.includes(lang === 'zh' ? 'zh' : lang)) {
            continue;
        }

        const holidayMonth = parseInt(key.substring(0, 2));
        const holidayDate = parseInt(key.substring(2));

        const data = holiday[lang] || holiday.zh || holiday.en || holiday.ja;
        if (!data || !data.title) continue;

        // 当天
        if (month === holidayMonth && date === holidayDate) {
            let finalTitle = data.title;
            let finalMessage = data.message;
            if (key === '0501' && lang === 'zh') {
                const LAUNCH = new Date('2025-05-01T00:00:00+09:00');
                const nowLocal = new Date();
                const diffDays = Math.floor((nowLocal - LAUNCH) / (24*3600*1000));
                const inclusiveDays = !isNaN(diffDays) && diffDays >= 0 ? diffDays + 1 : NaN;
                if (!isNaN(inclusiveDays)) {
                    finalMessage = `${finalMessage} ｜ 白月 日和（しらつき ひより）网站建立${inclusiveDays}天`;
                } else {
                    finalMessage = `${finalMessage} ｜ 白月 日和（しらつき ひより）网站建立纪念日`;
                }
            }
            showHolidayPopup(finalTitle, finalMessage);
            return;
        }

        // 提前提醒
        for (let i = 1; i <= (holiday.daysBefore || 0); i++) {
            const checkDate = new Date(now);
            checkDate.setDate(date + i);

            if ((checkDate.getMonth() + 1) === holidayMonth && checkDate.getDate() === holidayDate) {
                const prefix = lang === 'zh' ? '即将到来：' : (lang === 'ja' ? '間もなく：' : 'Coming soon: ');
                const daysText = lang === 'zh' ? `再${i}天` : (lang === 'ja' ? `あと${i}日` : `${i} day${i > 1 ? 's' : ''}`);
                let baseMsg = data.message;
                if (key === '0501' && lang === 'zh') {
                    const LAUNCH = new Date('2025-05-01T00:00:00+09:00');
                    const nowLocal = new Date();
                    const diffDays = Math.floor((nowLocal - LAUNCH) / (24*3600*1000));
                    const inclusiveDays = !isNaN(diffDays) && diffDays >= 0 ? diffDays + 1 : NaN;
                    if (!isNaN(inclusiveDays)) {
                        baseMsg = `${baseMsg} ｜ 白月 日和（しらつき ひより）网站建立${inclusiveDays}天`;
                    } else {
                        baseMsg = `${baseMsg} ｜ 白月 日和（しらつき ひより）网站建立纪念日`;
                    }
                }
                const msg = lang === 'zh'
                    ? `${daysText}就是${data.title}啦！${baseMsg}`
                    : (lang === 'ja' ? `${daysText}で${data.title}！${data.message}` : `${daysText} until ${data.title}! ${data.message}`);
                showHolidayPopup(`${prefix}${data.title}`, msg, i);
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
    loadMessagesFromServer();
    
    // 检查节日（延迟执行，避免影响页面加载）
    setTimeout(checkHoliday, 1000);
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
