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

async function requireAdmin(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || authHeader !== `Bearer ${env.ADMIN_API_KEY}`) {
    return false;
  }
  return true;
}

export async function onRequest({ request, env }) {
  const { pathname, searchParams } = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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
      let query = supabase
        .from('guestbook_messages')
        .select('id,name,email,message,language,created_at')
        .order('created_at', { ascending: false })
        .limit(500);

      if (lang !== 'all') {
        query = query.eq('language', lang);
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }

      return jsonResponse({ data: data ?? [] });
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
        const { data, error } = await supabase
          .from('guestbook_messages')
          .select('id,name,email,message,language,created_at')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        return jsonResponse({ data: data ?? [] });
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
          .eq('id', messageId);

        if (error) {
          throw error;
        }

        return jsonResponse({ success: true });
      } catch (error) {
        return jsonResponse({ error: '删除留言失败', details: error.message }, 500);
      }
    }
  }

  return jsonResponse({ error: 'Not Found' }, 404);
}
