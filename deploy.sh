#!/bin/bash
# 部署脚本 - 用于 Cloudflare Pages

# 设置错误处理
set -e

echo "🚀 开始部署留言板应用到 Cloudflare Pages..."

# 1. 创建必要的配置文件
echo "📝 创建配置文件..."

# 创建 _worker.js
cat > _worker.js << 'EOL'
// 导入API处理函数
import { onRequest } from './functions/api/[[path]].js';

// 导出处理函数
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 处理API请求
    if (url.pathname.startsWith('/api/')) {
      return onRequest({ request, env, ctx });
    }
    
    // 其他静态文件请求由Pages处理
    return env.ASSETS.fetch(request);
  }
};
EOL

# 创建 wrangler.toml
cat > wrangler.toml << 'EOL'
name = "guestbook"
main = "functions/api/[[path]].js"
compatibility_date = "2023-10-11"

[build]
command = ""
publish = "."

[[d1_databases]]
binding = "DB"
database_name = "guestbook-db"

[site]
bucket = "."
EOL

# 2. 创建 package.json 如果不存在
if [ ! -f "package.json" ]; then
  echo "📦 创建 package.json..."
  cat > package.json << 'EOL'
{
  "name": "guestbook",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "deploy": "wrangler pages deploy . --project-name=guestbook"
  },
  "devDependencies": {
    "wrangler": "^3.0.0"
  }
}
EOL
fi

# 3. 创建数据库初始化脚本
mkdir -p scripts
cat > scripts/init-db.sql << 'EOL'
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  is_admin_reply BOOLEAN DEFAULT 0,
  parent_id INTEGER DEFAULT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  ip TEXT,
  status TEXT DEFAULT 'approved'
);
EOL

echo "✅ 配置文件创建完成！"

# 4. 安装依赖
echo "🔧 安装依赖..."
npm install

# 5. 部署到 Cloudflare Pages
echo "🚀 正在部署到 Cloudflare Pages..."
npm run deploy

echo "🎉 部署完成！请按照以下步骤完成设置："
echo "1. 访问 Cloudflare Dashboard"
echo "2. 进入您的 Pages 项目"
echo "3. 在设置中添加环境变量:"
echo "   - ADMIN_API_KEY: 设置一个安全的密钥"
echo "4. 在设置 > 函数中，确保 'Compatibility Flags' 启用了 'nodejs_compat'"
echo "5. 在 D1 数据库中执行 scripts/init-db.sql 初始化数据库表"

exit 0
