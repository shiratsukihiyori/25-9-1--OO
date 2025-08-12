import React, { createContext, useContext, useState, ReactNode } from 'react';

// 定义支持的语言类型 - 中文和英文
type Language = 'zh' | 'en' | 'ja';

// 定义翻译资源类型
interface TranslationResources {
  [key: string]: {
    [key: string]: string;
  };
}

// 翻译资源 - 中文和英文
  const translations: TranslationResources = {
    zh: {
      userList: '用户列表',
      privateChatInstruction: '点击用户开始私聊',
      selectLanguage: '选择语言',
      welcomeMessage: '欢迎使用NodeCrypt系统',
       systemDescription: '安全的加密型临时现实通讯平台。同时，是一次性传输，如果中途退出，数据将被清理，再次进入时，将是全新的聊天页面，用户名和频道只是你进入时的名称，频道也就是中文显示的节点，不同的字代表着不同的聊天频道，有无密码也会影响进入频道密码的有无',
     navButtonJapanese: 'Houtsuki@SafeMoon',
    creditText: '软件为<a href="https://github.com/shuaiplus/NodeCrypt" class="text-blue-500 hover:underline mx-1">shuaiplus</a>创作，感谢他的创作'
  },
    en: {
      userList: 'User List',
      privateChatInstruction: 'Click a user to start private chat',
      selectLanguage: 'Select Language',
      welcomeMessage: 'Welcome to NodeCrypt System',
       systemDescription: 'Secure encrypted temporary real-time communication platform. Additionally, it uses one-time transmission: if you exit midway, data will be cleared, and you\'ll enter a new chat page when re-entering. Usernames and channels are only the names used when entering; channels, also displayed as \'节点\' in Chinese, with different characters representing different chat channels. The presence of a password affects whether a channel requires one.',
     navButtonJapanese: 'Houtsuki@SafeMoon',
    creditText: 'Software created by <a href="https://github.com/shuaiplus/NodeCrypt" class="text-blue-500 hover:underline mx-1">shuaiplus</a>, thanks for his contribution'
  },
    ja: {
      userList: 'ユーザーリスト',
      privateChatInstruction: 'ユーザーをクリックしてプライベートチャットを開始',
      selectLanguage: '言語を選択',
      welcomeMessage: 'NodeCryptシステムへようこそ',
       systemDescription: '安全な暗号化型一時的リアルタイム通信プラットフォーム。また、一度限りの送信を採用しています。途中で退出した場合、データはクリアされ、再入室時には新しいチャットページが表示されます。ユーザー名とチャンネルは入室時の名前に過ぎず、チャンネルは中国語で「节点」と表示され、異なる文字が異なるチャットチャンネルを表します。パスワードの有無により、チャンネルへのアクセスにパスワードが必要かどうかが決まります。',
     navButtonJapanese: 'Houtsuki@SafeMoon',
    creditText: '<a href="https://github.com/shuaiplus/NodeCrypt" class="text-blue-500 hover:underline mx-1">shuaiplus</a>によって作成されたソフトウェアです。彼の貢献に感謝します'
  }
  };

// 定义上下文类型
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

// 创建上下文
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// 提供者组件
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('zh');

  // 翻译函数
  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// 自定义Hook便于使用上下文
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}