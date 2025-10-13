import { createClient } from '@supabase/supabase-js';

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

async function readJson(request) {
  try {
    return await request.json();
  } catch (error) {
    throw new Error('请求体不是有效的 JSON');
  }
}

function createSupabaseClient(env, useServiceRole = false) {
  const url = env.SUPABASE_URL;
  const key = useServiceRole && env.SUPABASE_SERVICE_ROLE_KEY
    ? env.SUPABASE_SERVICE_ROLE_KEY
    : env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase 配置缺失。请在环境变量中设置 SUPABASE_URL 和对应的 API Key');
  }

  return createClient(url, key, {
    auth: { persistSession: false },
    global: { headers: { 'X-Client-Info': 'hiyori-guestbook-worker' } }
  });
}

function normalizeLanguage(input) {
  if (!input) return 'global';
  const value = String(input).trim();
  if (!value) return 'global';
  return value.toLowerCase();
}

async function fetchAggregatedMessages(supabase, languageFilter = 'all') {
  const { data, error } = await supabase
    .from('guestbook_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    throw error;
  }

  const repliesByParent = new Map();
  const parents = [];

  for (const row of data || []) {
    if (row.parent_id) {
      if (!repliesByParent.has(row.parent_id)) {
        repliesByParent.set(row.parent_id, []);
      }
      repliesByParent.get(row.parent_id).push(row);
    } else {
      parents.push(row);
    }
  }

  const normalizedFilter = normalizeLanguage(languageFilter);

  return parents
    .filter((message) => normalizedFilter === 'all' || normalizeLanguage(message.language) === normalizedFilter)
    .filter((message) => {
      const value = typeof message.status === 'string' ? message.status.toLowerCase() : 'approved';
      return value !== 'rejected';
    })
    .map((message) => ({
      ...message,
      replies: (repliesByParent.get(message.id) || [])
        .filter((reply) => {
          const value = typeof reply.status === 'string' ? reply.status.toLowerCase() : 'approved';
          return value !== 'rejected';
        })
        .sort((a, b) => {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        })
    }));
}

async function requireAdmin(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader === `Bearer ${env.ADMIN_API_KEY}`) {
    return true;
  }
  const token = request.headers.get('X-Admin-Token');
  if (token && token === env.ADMIN_API_KEY) {
    return true;
  }
  return false;
}

export async function onRequest({ request, env }) {
  const { pathname, searchParams } = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (pathname === '/api/admin/login' && request.method === 'POST') {
    try {
      const body = await readJson(request);
      const username = typeof body?.username === 'string' ? body.username.trim() : '';
      const password = typeof body?.password === 'string' ? body.password : '';

      if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD || !env.ADMIN_API_KEY) {
        return jsonResponse({ error: '管理员凭据未配置' }, 500);
      }

      if (!username || !password) {
        return jsonResponse({ error: '用户名和密码不能为空' }, 400);
      }

      if (username !== env.ADMIN_USERNAME || password !== env.ADMIN_PASSWORD) {
        return jsonResponse({ error: '用户名或密码错误' }, 401);
      }

      return jsonResponse({
        token: env.ADMIN_API_KEY,
        username: env.ADMIN_USERNAME
      });
    } catch (error) {
      return jsonResponse({ error: error.message }, 400);
    }
  }

  let supabase;
  try {
    supabase = createSupabaseClient(env, true);
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  if (request.method === 'GET' && pathname === '/api/messages') {
    try {
      const lang = normalizeLanguage(searchParams.get('lang') || 'all');
      const messages = await fetchAggregatedMessages(supabase, lang);

      return jsonResponse({ data: messages });
    } catch (error) {
      return jsonResponse({ error: '获取留言失败', details: error.message }, 500);
    }
  }

  if (request.method === 'POST' && pathname === '/api/messages') {
    try {
      const body = await request.json();
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const message = typeof body.message === 'string' ? body.message.trim() : '';
      const email = typeof body.email === 'string' ? body.email.trim() : '';
      const language = normalizeLanguage(body.language || body.lang);

      if (!name || !message) {
        return jsonResponse({ error: '昵称和留言内容不能为空' }, 400);
      }

      if (message.length > 2000) {
        return jsonResponse({ error: '留言内容过长，请控制在2000字符以内' }, 400);
      }

      const { data, error } = await supabase
        .from('guestbook_messages')
        .insert([
          {
            name,
            email: email || null,
            message,
            language,
            created_at: new Date().toISOString(),
            parent_id: null,
            is_admin_reply: false,
            status: 'approved'
          }
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return jsonResponse({ success: true, data }, 201);
    } catch (error) {
      return jsonResponse({ error: '提交留言失败', details: error.message }, 500);
    }
  }

  if (pathname.startsWith('/api/admin/')) {
    const authorized = await requireAdmin(request, env);
    if (!authorized) {
      return jsonResponse({ error: '未授权' }, 401);
    }

    if (request.method === 'GET' && pathname === '/api/admin/messages') {
      try {
        const messages = await fetchAggregatedMessages(supabase, 'all');
        return jsonResponse({ data: messages });
      } catch (error) {
        return jsonResponse({ error: '获取留言失败', details: error.message }, 500);
      }
    }

    if (request.method === 'DELETE' && pathname.startsWith('/api/admin/messages/')) {
      try {
        const messageId = Number(pathname.split('/').pop());
        if (!Number.isInteger(messageId)) {
          return jsonResponse({ error: '无效的留言ID' }, 400);
        }

        const { error } = await supabase
          .from('guestbook_messages')
          .delete()
          .or(`id.eq.${messageId},parent_id.eq.${messageId}`);

        if (error) {
          throw error;
        }

        return jsonResponse({ success: true });
      } catch (error) {
        return jsonResponse({ error: '删除留言失败', details: error.message }, 500);
      }
    }

    if (request.method === 'POST' && pathname === '/api/admin/review') {
      try {
        const payload = await readJson(request);
        const messageId = Number(payload?.id);
        const action = typeof payload?.action === 'string' ? payload.action.toLowerCase() : '';

        if (!Number.isInteger(messageId) || messageId <= 0) {
          return jsonResponse({ error: '无效的留言ID' }, 400);
        }

        if (!['approve', 'reject'].includes(action)) {
          return jsonResponse({ error: '无效的操作类型' }, 400);
        }

        const targetStatus = action === 'approve' ? 'approved' : 'rejected';

        const { error } = await supabase
          .from('guestbook_messages')
          .update({
            status: targetStatus
          })
          .eq('id', messageId);

        if (error) {
          throw error;
        }

        return jsonResponse({ success: true, status: targetStatus });
      } catch (error) {
        return jsonResponse({ error: '更新留言状态失败', details: error.message }, 500);
      }
    }

    if (request.method === 'POST' && pathname === '/api/admin/reply') {
      try {
        const payload = await request.json();
        const parentId = Number(payload?.parent_id);
        const replyContent = typeof payload?.message === 'string' ? payload.message.trim() : '';

        if (!Number.isInteger(parentId) || parentId <= 0) {
          return jsonResponse({ error: '无效的留言ID' }, 400);
        }

        if (!replyContent) {
          return jsonResponse({ error: '回复内容不能为空' }, 400);
        }

        const { data: parent, error: parentError } = await supabase
          .from('guestbook_messages')
          .select('id, language')
          .eq('id', parentId)
          .maybeSingle();

        if (parentError) {
          throw parentError;
        }

        if (!parent) {
          return jsonResponse({ error: '原始留言不存在' }, 404);
        }

        const { data, error } = await supabase
          .from('guestbook_messages')
          .insert([
            {
              name: '管理员',
              email: null,
              message: replyContent,
              language: parent.language || 'global',
              parent_id: parentId,
              is_admin_reply: true,
              created_at: new Date().toISOString()
            }
          ])
          .select()
          .single();

        if (error) {
          throw error;
        }

        return jsonResponse({ success: true, data }, 201);
      } catch (error) {
        return jsonResponse({ error: '提交回复失败', details: error.message }, 500);
      }
    }
  }

  return jsonResponse({ error: 'Not Found' }, 404);
}
