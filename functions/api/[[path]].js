const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders
  });
}

function normalizeLanguage(input) {
  if (!input) return 'global';
  const value = String(input).trim().toLowerCase();
  return value || 'global';
}

async function fetchMessages(db, language = 'all') {
  try {
    const query = language === 'all' 
      ? 'SELECT * FROM guestbook_messages ORDER BY created_at DESC LIMIT 1000'
      : 'SELECT * FROM guestbook_messages WHERE language = ? ORDER BY created_at DESC LIMIT 1000';
      
    const stmt = language === 'all'
      ? db.prepare(query)
      : db.prepare(query).bind(language);
      
    const { results } = await stmt.all();
    
    // 将回复组织成树形结构
    function organizeReplies(messages) {
      const repliesByParent = new Map();
      const parents = [];

      for (const row of messages || []) {
        if (row.parent_id) {
          if (!repliesByParent.has(row.parent_id)) {
            repliesByParent.set(row.parent_id, []);
          }
          repliesByParent.get(row.parent_id).push(row);
        } else {
          parents.push({
            ...row,
            replies: []
          });
        }
      }

      // 将回复添加到对应的父级留言
      for (const parent of parents) {
        if (repliesByParent.has(parent.id)) {
          parent.replies = repliesByParent.get(parent.id).sort(
            (a, b) => new Date(a.created_at) - new Date(b.created_at)
          );
        }
      }

      return parents;
    }
    
    return organizeReplies(results);
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw new Error('Failed to fetch messages');
  }
}

function requireAdmin(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.split(' ')[1];
  return token === env.ADMIN_API_KEY;
}

export async function onRequest({ request, env }) {
  // 处理预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    const isAdmin = requireAdmin(request, env);
    const url = new URL(request.url);
    const path = url.pathname.split('/').filter(Boolean).pop() || '';
    const language = normalizeLanguage(url.searchParams.get('lang'));

    // 获取留言列表
    if (request.method === 'GET') {
      try {
        const messages = await fetchMessages(env.DB, language === 'all' ? 'all' : language);
        return jsonResponse(messages);
      } catch (error) {
        console.error('Error fetching messages:', error);
        return jsonResponse({ error: 'Failed to fetch messages' }, 500);
      }
    }

    // 添加新留言
    if (request.method === 'POST') {
      try {
        const data = await request.json();
        const { name, email, message, parent_id, is_admin_reply } = data;

        // 验证输入
        if (!name || !message) {
          return jsonResponse({ error: 'Name and message are required' }, 400);
        }

        // 如果是管理员回复，需要验证权限
        if (is_admin_reply && !isAdmin) {
          return jsonResponse({ error: 'Unauthorized' }, 401);
        }

        const newMessage = {
          name,
          email: email || null,
          message,
          language: language === 'all' ? 'global' : language,
          parent_id: parent_id || null,
          is_admin_reply: is_admin_reply ? 1 : 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: 'approved'
        };

        // 插入新留言
        const columns = Object.keys(newMessage).join(', ');
        const placeholders = Object.keys(newMessage).map(() => '?').join(', ');
        const values = Object.values(newMessage);
        
        const stmt = env.DB.prepare(
          `INSERT INTO guestbook_messages (${columns}) VALUES (${placeholders})`
        ).bind(...values);
        
        const { lastRowId } = await stmt.run();
        
        // 获取刚插入的留言
        const { results } = await env.DB.prepare(
          'SELECT * FROM guestbook_messages WHERE id = ?'
        ).bind(lastRowId).all();

        const inserted = results[0];

        // 如果是回复，更新父级留言的回复时间
        if (parent_id) {
          await env.DB.prepare(
            'UPDATE guestbook_messages SET admin_reply_at = ?, updated_at = ? WHERE id = ?'
          ).bind(new Date().toISOString(), new Date().toISOString(), parent_id).run();
        }

        return jsonResponse(inserted, 201);
      } catch (error) {
        console.error('Error adding message:', error);
        return jsonResponse({ error: 'Failed to add message' }, 500);
      }
    }

    // 删除留言（仅限管理员）
    if (request.method === 'DELETE' && isAdmin) {
      try {
        const { id } = await request.json();
        await env.DB.prepare('DELETE FROM guestbook_messages WHERE id = ?')
          .bind(id)
          .run();
          
        return jsonResponse({ success: true });
      } catch (error) {
        console.error('Error deleting message:', error);
        return jsonResponse({ error: 'Failed to delete message' }, 500);
      }
    }

    // 更新留言状态（仅限管理员）
    if ((request.method === 'PATCH' || request.method === 'PUT') && isAdmin) {
      try {
        const { id, status } = await request.json();
        
        const { results } = await env.DB.prepare(
          'UPDATE guestbook_messages SET status = ?, updated_at = ? WHERE id = ? RETURNING *'
        ).bind(status, new Date().toISOString(), id).all();

        if (!results.length) {
          return jsonResponse({ error: 'Message not found' }, 404);
        }
        
        return jsonResponse(results[0]);
      } catch (error) {
        console.error('Error updating message status:', error);
        return jsonResponse({ error: 'Failed to update message status' }, 500);
      }
    }
  }

  return jsonResponse({ error: 'Not Found' }, 404);
}
