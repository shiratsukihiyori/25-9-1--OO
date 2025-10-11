const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../../')));

// 数据库连接
let db;
if (process.env.DB) {
  // 生产环境使用 D1
  db = process.env.DB;
} else {
  // 本地开发使用 SQLite
  const sqlite3 = require('better-sqlite3');
  db = new sqlite3('./messages.db');
  
  // 应用迁移（仅开发）
  const migration = require('fs').readFileSync(
    path.join(__dirname, '../migrations/0001_create_messages_table.sql'), 
    'utf8'
  );
  db.exec(migration);
}

// 辅助函数：执行 SQL 查询
async function query(sql, params = []) {
  if (typeof db.prepare === 'function') {
    // SQLite
    const stmt = db.prepare(sql);
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      return stmt.all(...params);
    } else {
      const result = stmt.run(...params);
      return { id: result.lastInsertRowid, changes: result.changes };
    }
  } else {
    // D1
    return db.prepare(sql).bind(...params).all()
      .then(result => {
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
          return result.results;
        }
        return { id: result.meta.last_row_id, changes: result.meta.changes };
      });
  }
}

// 获取所有留言
app.get('/api/messages', async (req, res) => {
  try {
    const rows = await query(
      'SELECT * FROM messages ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('获取留言失败:', err);
    res.status(500).json({ error: '获取留言失败' });
  }
});

// 添加新留言
app.post('/api/messages', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !message) {
      return res.status(400).json({ error: '昵称和留言内容不能为空' });
    }

    const result = await query(
      'INSERT INTO messages (name, email, message, ip) VALUES (?, ?, ?, ?)',
      [name, email, message, req.ip]
    );

    const newMessage = {
      id: result.id,
      name,
      email,
      message,
      status: 'pending',
      created_at: new Date().toISOString(),
      ip: req.ip,
      is_admin_reply: false
    };

    res.status(201).json(newMessage);
  } catch (err) {
    console.error('添加留言失败:', err);
    res.status(500).json({ error: '添加留言失败' });
  }
});

// 更新留言状态
app.put('/api/messages/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    await query(
      'UPDATE messages SET status = ? WHERE id = ?',
      [status, id]
    );

    res.json({ id, status });
  } catch (err) {
    console.error('更新留言状态失败:', err);
    res.status(500).json({ error: '更新留言状态失败' });
  }
});

// 删除留言
app.delete('/api/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM messages WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('删除留言失败:', err);
    res.status(500).json({ error: '删除留言失败' });
  }
});

// 启动服务器（仅用于本地开发）
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

// 导出用于 Cloudflare Workers 的处理函数
module.exports = {
  async fetch(request, env) {
    // 设置 D1 数据库
    process.env.DB = env.DB;
    
    // 处理请求
    return app(request);
  }
};
