// 数据库初始化
async function getDB(env) {
  // 如果数据库未初始化，则创建表
  await env.DB.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      message TEXT NOT NULL,
      is_admin_reply BOOLEAN DEFAULT 0,
      parent_id INTEGER DEFAULT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      ip TEXT,
      status TEXT DEFAULT 'pending' -- pending/approved/rejected
    );
  `);
  return env.DB;
}

// 处理所有API请求
export async function onRequest(context) {
  const { request, env } = context;
  const { pathname, searchParams } = new URL(request.url);
  const db = await getDB(env);
  
  // CORS 头
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  // 处理预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // 获取留言列表
  if (request.method === 'GET' && pathname === '/api/messages') {
    try {
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');
      const offset = (page - 1) * limit;
      
      // 获取留言总数
      const { results: countResults } = await db.prepare(
        'SELECT COUNT(*) as total FROM messages WHERE parent_id IS NULL AND status = ?'
      ).bind('approved').first();
      
      // 获取分页留言
      const { results: messages } = await db.prepare(
        `SELECT m.*, 
                (SELECT COUNT(*) FROM messages r WHERE r.parent_id = m.id AND r.status = 'approved') as reply_count
         FROM messages m 
         WHERE m.parent_id IS NULL AND m.status = ? 
         ORDER BY m.created_at DESC 
         LIMIT ? OFFSET ?`
      ).bind('approved', limit, offset).all();

      // 获取每条留言的回复
      const messagesWithReplies = await Promise.all(
        messages.map(async (message) => {
          const { results: replies } = await db.prepare(
            'SELECT * FROM messages WHERE parent_id = ? AND status = ? ORDER BY created_at ASC'
          ).bind(message.id, 'approved').all();
          return { ...message, replies };
        })
      );

      return new Response(JSON.stringify({
        data: messagesWithReplies,
        pagination: {
          total: countResults?.total || 0,
          page,
          limit,
          totalPages: Math.ceil((countResults?.total || 0) / limit)
        }
      }), { headers: corsHeaders });
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: '获取留言失败',
        details: error.message 
      }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }

  // 提交新留言
  if (request.method === 'POST' && pathname === '/api/messages') {
    try {
      const data = await request.json();
      const ip = request.headers.get('cf-connecting-ip');
      
      // 验证输入
      if (!data.message || !data.name) {
        return new Response(JSON.stringify({ 
          error: '昵称和留言内容不能为空' 
        }), { 
          status: 400, 
          headers: corsHeaders 
        });
      }

      // 插入新留言（默认状态为已批准）
      const { success, meta } = await db.prepare(
        'INSERT INTO messages (name, message, ip, parent_id, is_admin_reply, status) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(
        data.name,
        data.message,
        ip,
        data.parent_id || null,
        data.is_admin_reply || 0,
        'approved'  // 默认直接通过审核
      ).run();

      if (!success) throw new Error('插入留言失败');

      // 获取刚插入的留言
      const { results } = await db.prepare(
        'SELECT * FROM messages WHERE id = ?'
      ).bind(meta.last_row_id).all();

      return new Response(JSON.stringify({ 
        success: true, 
        data: results[0] 
      }), { 
        status: 201, 
        headers: corsHeaders 
      });
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: '提交留言失败',
        details: error.message 
      }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }

  // 管理员API - 需要身份验证
  if (pathname.startsWith('/api/admin/')) {
    // 这里应该添加管理员身份验证逻辑
    // 例如：检查请求头中的API密钥
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${env.ADMIN_API_KEY}`) {
      return new Response(JSON.stringify({ error: '未授权' }), { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    // 获取所有留言（管理员用）
    if (request.method === 'GET' && pathname === '/api/admin/messages') {
      try {
        const { results } = await db.prepare(
          'SELECT * FROM messages ORDER BY created_at DESC'
        ).all();
        
        return new Response(JSON.stringify({ data: results }), { 
          headers: corsHeaders 
        });
      } catch (error) {
        return new Response(JSON.stringify({ 
          error: '获取待审核留言失败',
          details: error.message 
        }), { 
          status: 500, 
          headers: corsHeaders 
        });
      }
    }

    // 删除留言
    if (request.method === 'DELETE' && pathname.startsWith('/api/admin/messages/')) {
      try {
        const messageId = pathname.split('/').pop();
        
        if (!messageId || isNaN(parseInt(messageId))) {
          return new Response(JSON.stringify({ 
            error: '无效的留言ID' 
          }), { 
            status: 400, 
            headers: corsHeaders 
          });
        }

        // 先删除该留言的所有回复
        await db.prepare(
          'DELETE FROM messages WHERE parent_id = ?'
        ).bind(messageId).run();

        // 再删除留言本身
        const { success } = await db.prepare(
          'DELETE FROM messages WHERE id = ?'
        ).bind(messageId).run();

        if (!success) throw new Error('删除留言失败');

        return new Response(JSON.stringify({ 
          success: true,
          message: '留言已删除'
        }), { 
          headers: corsHeaders 
        });
      } catch (error) {
        return new Response(JSON.stringify({ 
          error: '删除留言失败',
          details: error.message 
        }), { 
          status: 500, 
          headers: corsHeaders 
        });
      }
    }

    // 管理员回复
    if (request.method === 'POST' && pathname === '/api/admin/reply') {
      try {
        const { parent_id, message } = await request.json();
        
        if (!parent_id || !message) {
          return new Response(JSON.stringify({ 
            error: '留言ID和回复内容不能为空' 
          }), { 
            status: 400, 
            headers: corsHeaders 
          });
        }

        // 插入管理员回复
        const { success, meta } = await db.prepare(
          'INSERT INTO messages (name, message, parent_id, is_admin_reply, status) VALUES (?, ?, ?, ?, ?)'
        ).bind(
          '管理员',
          message,
          parent_id,
          1,
          'approved'  // 管理员回复默认直接通过
        ).run();

        if (!success) throw new Error('插入回复失败');

        // 获取刚插入的回复
        const { results } = await db.prepare(
          'SELECT * FROM messages WHERE id = ?'
        ).bind(meta.last_row_id).all();

        return new Response(JSON.stringify({ 
          success: true, 
          data: results[0] 
        }), { 
          status: 201, 
          headers: corsHeaders 
        });
      } catch (error) {
        return new Response(JSON.stringify({ 
          error: '提交回复失败',
          details: error.message 
        }), { 
          status: 500, 
          headers: corsHeaders 
        });
      }
    }
  }

  // 未匹配的路由
  return new Response(JSON.stringify({ 
    error: 'Not Found' 
  }), { 
    status: 404, 
    headers: corsHeaders 
  });
}
