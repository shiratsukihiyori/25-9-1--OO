import { useLanguage } from '../contexts/LanguageContext';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

// 模拟用户数据
const users = [
  { id: 1, name: '张三', nameEn: 'Zhang San', nameJa: '張三', avatar: 'https://space.coze.cn/api/coze_space/gen_image?image_size=square&prompt=user%20avatar%20male&sign=ebabea4c1f7e5ee731c308221c34a2fe' },
  { id: 2, name: '李四', nameEn: 'Li Si', nameJa: '李四', avatar: 'https://space.coze.cn/api/coze_space/gen_image?image_size=square&prompt=user%20avatar%20female&sign=644db40336e7a1746ce802805c416182' },
  { id: 3, name: '王五', nameEn: 'Wang Wu', nameJa: '王五', avatar: 'https://space.coze.cn/api/coze_space/gen_image?image_size=square&prompt=user%20avatar%20male&sign=ebabea4c1f7e5ee731c308221c34a2fe' },
  { id: 4, name: '赵六', nameEn: 'Zhao Liu', nameJa: '趙六', avatar: 'https://space.coze.cn/api/coze_space/gen_image?image_size=square&prompt=user%20avatar%20female&sign=644db40336e7a1746ce802805c416182' },
];

interface UserItemProps {
  id: number;
  name: string;
  nameJa: string;
  nameEn: string;
  avatar: string;
  onClick: (id: number, name: string) => void;
}

const UserItem = ({ id, name, nameJa, nameEn, avatar, onClick }: UserItemProps) => {
  const { language } = useLanguage();
  
  const getDisplayName = () => {
    switch(language) {
      case 'zh': return name;
      case 'en': return nameEn;
      case 'ja': return nameJa;
      default: return name;
    }
  };
  
  return (
    <div 
      onClick={() => onClick(id, getDisplayName())}
      className={cn(
        'flex items-center p-3 rounded-xl transition-all duration-200 cursor-pointer group',
        'hover:bg-blue-50'
      )}
    >
      <img 
        src={avatar} 
        alt={getDisplayName()} 
        className="w-12 h-12 rounded-full object-cover border-2 border-blue-100"
      />
      <span className="ml-3 font-medium text-gray-800">{getDisplayName()}</span>
      <i className="fa-solid fa-arrow-right ml-auto text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></i>
    </div>
  );
};

export default function UserList() {
  const { t, language } = useLanguage();
  
  const handleUserClick = (userId: number, userName: string) => {
    toast(`开始与 ${userName} 私聊`);
    // 在实际应用中，这里会打开聊天窗口或导航到聊天页面
  };
  
  return (
    <div className="w-full max-w-md mx-auto mt-12">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-gray-200">
        {t('userList')}
      </h2>
      
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border-b border-blue-100 dark:border-blue-800">
          <p className="text-sm text-blue-600 dark:text-blue-300 text-center">
            {t('privateChatInstruction')}
          </p>
        </div>
        
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {users.map(user => (
            <UserItem 
              key={user.id}
              {...user}
              onClick={handleUserClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}