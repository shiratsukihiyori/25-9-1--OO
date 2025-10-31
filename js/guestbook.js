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
  // 获取所有留言，不进行语言筛选
  console.log('Loading all messages (no language filter)');
  
  try {
    const apiUrl = '/api/messages?lang=all';
    console.log('Fetching from:', apiUrl);
    
    const response = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      let errorMsg = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.error || errorData.message || JSON.stringify(errorData);
      } catch (e) {
        const text = await response.text();
        errorMsg = text || errorMsg;
      }
      throw new Error(`加载留言失败: ${errorMsg}`);
    }
    
    const result = await response.json();
    console.log('Received messages:', result);
    
    // 确保处理可能的空结果
    messages = Array.isArray(result) ? result : [];
    console.log(`Loaded ${messages.length} messages`);
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
        // 不显示语言标签
        const languageLabel = '';
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
        email: email ? email.trim() : null,
        message: message.trim(),
        language: 'global',  // 固定为 global，不区分语言
        timestamp: new Date().toISOString()
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

// 检查并显示生日祝福
function checkBirthday() {
  const now = new Date();
  const month = now.getMonth() + 1; // 0-11 → 1-12
  const date = now.getDate();
  
  // 检查是否是8月14日
  if (month === 8 && date === 14) {
    const lang = getCurrentLanguage();
    let title, message;
    
    switch(lang) {
      case 'zh':
        title = '生日快乐！';
        message = '今天是白月 日和的生日！来送上你的祝福吧~';
        break;
      case 'ja':
        title = 'お誕生日おめでとう！';
        message = '今日は白月 ひよりの誕生日です！お祝いのメッセージをどうぞ～';
        break;
      case 'en':
      default:
        title = 'Happy Birthday!';
        message = 'Today is Shiratsuki Hiyori\'s birthday! Leave your wishes here~';
    }
    
    // 显示生日提示
    showNotification(message, 5000);
    
    // 添加生日特殊样式
    const style = document.createElement('style');
    style.textContent = `
      .birthday-celebration {
        background: linear-gradient(45deg, #ff9a9e, #fad0c4, #fbc2eb, #a6c1ee);
        background-size: 300% 300%;
        animation: gradient 15s ease infinite;
        border: 2px solid #ff69b4;
        box-shadow: 0 0 15px rgba(255, 105, 180, 0.5);
      }
      @keyframes gradient {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
    `;
    document.head.appendChild(style);
    
    // 为留言表单添加生日样式
    if (messageForm) {
      messageForm.classList.add('birthday-celebration');
    }
  }
}

// 初始化应用
function init() {
    initTheme();
    initEventListeners();
    renderMessages();
    loadMessagesFromServer();
    checkBirthday();
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
