import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 文件路径
const dbPath = join(__dirname, '../data/messages.db');
const outputPath = join(__dirname, '../public/data/messages.json');

// 确保输出目录存在
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateMessages() {
  try {
    // 读取数据库文件
    const fileBuffer = fs.readFileSync(dbPath);
    
    // 初始化 SQL.js
    const SQL = await initSqlJs();
    
    // 加载数据库
    const db = new SQL.Database(fileBuffer);
    
    // 查询数据
    const result = db.exec(`
      SELECT id, name, email, message, status, created_at, is_admin_reply 
      FROM messages 
      WHERE status = 'approved'
      ORDER BY created_at DESC
    `);
    
    if (result.length > 0) {
      const rows = result[0].values.map(row => ({
        id: row[0],
        name: row[1],
        email: row[2],
        message: row[3],
        status: row[4],
        created_at: row[5],
        is_admin_reply: row[6] === 1
      }));
      
      // 保存为JSON文件
      fs.writeFileSync(outputPath, JSON.stringify(rows, null, 2));
      console.log(`成功导出 ${rows.length} 条留言到 ${outputPath}`);
    } else {
      console.log('没有找到留言数据');
      fs.writeFileSync(outputPath, JSON.stringify([], null, 2));
    }
    
    // 关闭数据库连接
    db.close();
  } catch (err) {
    console.error('处理数据库时出错:', err.message);
    // 如果数据库文件不存在，创建一个空的JSON文件
    if (err.code === 'ENOENT') {
      console.log('数据库文件不存在，创建空的数据文件');
      fs.writeFileSync(outputPath, JSON.stringify([], null, 2));
    } else {
      process.exit(1);
    }
  }
}

generateMessages().catch(console.error);
