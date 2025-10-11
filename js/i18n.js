// 多语言支持
const i18n = {
    // 默认语言
    defaultLang: 'zh',
    
    // 支持的语言
    supportedLangs: ['zh', 'en', 'ja'],
    
    // 语言包
    translations: {
        zh: {
            nameLabel: '昵称：',
            namePlaceholder: '你的名字',
            emailLabel: '邮箱（可选）：',
            emailPlaceholder: '你的邮箱（不会公开）',
            messageLabel: '留言内容：',
            messagePlaceholder: '想对日和说些什么呢？',
            addEmoji: '添加表情：',
            submitButton: '发送留言',
            messagesTitle: '大家的留言',
            refreshButton: '刷新留言',
            loadingMessages: '加载留言中...',
            loadError: '加载留言失败，请',
            refreshPage: '刷新页面',
            tryAgain: '重试',
            noMessages: '还没有留言，快来成为第一个留言的人吧~',
            messageSent: '留言已发送！',
            nameRequired: '请填写昵称和留言内容',
            today: '今天',
            yesterday: '昨天',
            daysAgo: '天前',
            justNow: '刚刚',
            minutesAgo: '分钟前',
            hoursAgo: '小时前'
        },
        en: {
            nameLabel: 'Name:',
            namePlaceholder: 'Your name',
            emailLabel: 'Email (optional):',
            emailPlaceholder: 'Your email (will not be published)',
            messageLabel: 'Message:',
            messagePlaceholder: 'What would you like to say to Hiyori?',
            addEmoji: 'Add emoji:',
            submitButton: 'Send Message',
            messagesTitle: 'Messages',
            refreshButton: 'Refresh',
            loadingMessages: 'Loading messages...',
            loadError: 'Failed to load messages. Please',
            refreshPage: 'refresh the page',
            tryAgain: 'and try again',
            noMessages: 'No messages yet. Be the first to leave a message!',
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
            nameLabel: 'お名前：',
            namePlaceholder: 'あなたのお名前',
            emailLabel: 'メールアドレス（任意）：',
            emailPlaceholder: 'メールアドレス（公開されません）',
            messageLabel: 'メッセージ：',
            messagePlaceholder: 'ひよりさんにメッセージをどうぞ',
            addEmoji: '絵文字を追加：',
            submitButton: '送信',
            messagesTitle: 'メッセージ一覧',
            refreshButton: '更新',
            loadingMessages: 'メッセージを読み込み中...',
            loadError: 'メッセージの読み込みに失敗しました。',
            refreshPage: 'ページを更新',
            tryAgain: 'して、もう一度お試しください',
            noMessages: 'まだメッセージがありません。最初のメッセージを送ってみましょう！',
            messageSent: 'メッセージを送信しました！',
            nameRequired: 'お名前とメッセージを入力してください',
            today: '今日',
            yesterday: '昨日',
            daysAgo: '日前',
            justNow: 'たった今',
            minutesAgo: '分前',
            hoursAgo: '時間前'
        }
    },
    
    // 初始化
    init() {
        // 设置当前语言
        this.currentLang = this.getCurrentLanguage();
        // 应用翻译
        this.applyTranslations();
    },
    
    // 获取当前语言
    getCurrentLanguage() {
        // 从URL参数获取语言
        const urlParams = new URLSearchParams(window.location.search);
        const langParam = urlParams.get('lang');
        if (langParam && this.supportedLangs.includes(langParam)) {
            return langParam;
        }
        
        // 从本地存储获取语言
        const savedLang = localStorage.getItem('preferredLanguage');
        if (savedLang && this.supportedLangs.includes(savedLang)) {
            return savedLang;
        }
        
        // 从浏览器语言设置获取
        const browserLang = navigator.language.split('-')[0];
        if (this.supportedLangs.includes(browserLang)) {
            return browserLang;
        }
        
        // 默认语言
        return this.defaultLang;
    },
    
    // 切换语言
    setLanguage(lang) {
        if (this.supportedLangs.includes(lang)) {
            this.currentLang = lang;
            localStorage.setItem('preferredLanguage', lang);
            this.applyTranslations();
            return true;
        }
        return false;
    },
    
    // 应用翻译
    applyTranslations() {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (this.translations[this.currentLang] && this.translations[this.currentLang][key]) {
                element.textContent = this.translations[this.currentLang][key];
            }
        });
        
        // 处理占位符
        const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
        placeholders.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            if (this.translations[this.currentLang] && this.translations[this.currentLang][key]) {
                element.placeholder = this.translations[this.currentLang][key];
            }
        });
        
        // 处理标题属性
        const titles = document.querySelectorAll('[data-i18n-title]');
        titles.forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            if (this.translations[this.currentLang] && this.translations[this.currentLang][key]) {
                element.title = this.translations[this.currentLang][key];
            }
        });
        
        // 更新HTML lang属性
        document.documentElement.lang = this.currentLang;
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    i18n.init();
});

// 暴露到全局
window.i18n = i18n;
