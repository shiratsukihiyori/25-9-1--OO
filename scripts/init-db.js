import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import initSqlJs from 'sql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 确保数据目录存在
const dbDir = join(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 数据库路径
const dbPath = join(dbDir, 'messages.db');

// 如果数据库已存在，先删除
if (fs.existsSync(dbPath)) {
  console.log('数据库已存在，删除旧数据库...');
  fs.unlinkSync(dbPath);
}

// 创建新数据库
console.log('正在创建新数据库...');

async function initDatabase() {
  try {
    // 使用 SQL.js 的默认配置
    const SQL = await initSqlJs();
    
    // 创建新数据库
    const db = new SQL.Database();
    
    // 创建表
    db.run(`
      CREATE TABLE messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        is_admin_reply BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX idx_status ON messages(status);
      CREATE INDEX idx_created_at ON messages(created_at);
    `);
    
    console.log('数据库表创建完成');
    
    // 添加测试数据
    const testData = [
      ['管理员', 'admin@example.com', '欢迎来到留言板！', 'approved', 1, '2025-10-01 10:00:00'],
      ['测试用户', 'test@example.com', '这是一个测试留言', 'approved', 0, '2025-10-02 15:30:00']
    ];
    
    const stmt = db.prepare('INSERT INTO messages (name, email, message, status, is_admin_reply, created_at) VALUES (?, ?, ?, ?, ?, ?)');
    
    // 开始事务
    db.exec('BEGIN TRANSACTION');
    try {
      for (const item of testData) {
        stmt.run(item);
      }
      db.exec('COMMIT');
      console.log('测试数据添加完成');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
    
    // 保存数据库到文件
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
    
    console.log('数据库初始化完成');
    
  } catch (err) {
    console.error('数据库初始化失败:', err.message);
    process.exit(1);
  }
}

// 执行初始化
initDatabase().catch(console.error);
