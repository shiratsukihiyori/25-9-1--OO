import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { useLanguage } from './contexts/LanguageContext';
import UserList from './components/UserList';
import { Empty } from './components/Empty';
import { toast, Toaster } from 'sonner';

// 翻译文本映射 - 添加中文和英文
const translations = {
  zh: {
    selectLanguage: '选择语言',
    welcomeMessage: '欢迎使用NodeCrypt系统',
    systemDescription: '安全的加密型临时现实通讯平台。同时，是一次性传输，如果中途退出，数据将被清理，再次进入时，将是全新的聊天页面，用户名和频道只是你进入时的名称，频道也就是中文显示的节点，不同的字代表着不同的聊天频道，有无密码也会影响进入频道密码的有无',
    navButtonJapanese: 'Houtsuki@SafeMoon'
  },
  en: {
    selectLanguage: 'Select Language',
    welcomeMessage: 'Welcome to NodeCrypt System',
    systemDescription: 'Secure encrypted temporary real-time communication platform. Additionally, it uses one-time transmission: if you exit midway, data will be cleared, and you\'ll enter a new chat page when re-entering. Usernames and channels are only the names used when entering; channels, also displayed as \'节点\' in Chinese, with different characters representing different chat channels. The presence of a password affects whether a channel requires one.',
    navButtonJapanese: 'Houtsuki@SafeMoon'
  },
  ja: {
    selectLanguage: '言語を選択',
    welcomeMessage: 'NodeCryptシステムへようこそ',
    systemDescription: '安全な暗号化型一時的リアルタイム通信プラットフォーム。また、一度限りの送信を採用しています。途中で退出した場合、データはクリアされ、再入室時には新しいチャットページが表示されます。ユーザー名とチャンネルは入室時の名前に過ぎず、チャンネルは中国語で「节点」と表示され、異なる文字が異なるチャットチャンネルを表します。パスワードの有無により、チャンネルへのアクセスにパスワードが必要かどうかが決まります。',
    navButtonJapanese: 'Houtsuki@SafeMoon'
  }
};

const App: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();

  // 处理导航按钮点击
  const handleNavClick = (path: string) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
      <div className="max-w-md mx-auto w-full">
    {/* 语言选择器 - 添加中文和英文选项 */}
    <div className="text-center mb-8">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">{translations[language].selectLanguage}</h2>
        <div className="flex justify-center gap-3">
          <button 
            className={`px-4 py-2 rounded-full shadow-md ${language === 'zh' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}
            onClick={() => setLanguage('zh')}
          >
            中文
          </button>
          <button 
            className={`px-4 py-2 rounded-full shadow-md ${language === 'en' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}
            onClick={() => setLanguage('en')}
          >
            English
          </button>
          <button 
            className={`px-4 py-2 rounded-full shadow-md ${language === 'ja' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}
            onClick={() => setLanguage('ja')}
          >
            日本語
          </button>
        </div>
    </div>
        
        {/* 介绍文字 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{translations[language].welcomeMessage}</h1>
          <p className="text-gray-600">{translations[language].systemDescription}</p>
        </div>
        
        {/* 主内容区域 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <Routes>
            <Route path="/" element={<Empty />} />
            <Route path="/messages" element={<UserList />} />
            <Route path="/settings" element={<Empty />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
        
    {/* 导航按钮 */}
     <div className="grid grid-cols-1 gap-4">
       <button 
         className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow hover:shadow-md transition-shadow"
         onClick={() => window.open('https://chat.xyby.dpdns.org/?r=8sli8%5C9i8rt%7B8s%7CL77RR77R%3B77RM', '_blank')}
       >
         <i className="fa-solid fa-home text-blue-500 text-2xl mb-2"></i>
         <span className="text-sm font-medium text-gray-800">{translations[language].navButtonJapanese}</span>
       </button>
     </div>
      </div>
      
      {/* Toast通知 */}
      <Toaster position="top-right" />
    </div>
  );
};

export default App;