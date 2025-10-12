// _worker.js - 使用 ES Modules 格式

// 设置环境变量
const NODE_ENV = process.env.NODE_ENV || 'development';

// 日志函数
function log(...args) {
  if (NODE_ENV !== 'production') {
    console.log('[Worker]', ...args);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    log(`Request: ${request.method} ${url.pathname}`);
    
    // 设置基本响应头
    const headers = {
      'Content-Security-Policy': "default-src 'self'",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };
    
    // 处理预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }
    
    // 处理API请求
    if (url.pathname.startsWith('/api/')) {
      try {
        // 处理 /api/messages 路由
        if (url.pathname === '/api/messages' && request.method === 'GET') {
          // 从数据库获取留言
          const { results } = await env.DB.prepare(
            'SELECT * FROM messages ORDER BY created_at DESC'
          ).all();
          
          return new Response(JSON.stringify(results), {
            headers: { ...headers, 'Content-Type': 'application/json' }
          });
        }
        
        // 处理 POST 请求
        if (url.pathname === '/api/messages' && request.method === 'POST') {
          const data = await request.json();
          const { name, email = '', message } = data;
          
          if (!name || !message) {
            return new Response(
              JSON.stringify({ error: 'Name and message are required' }),
              { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
            );
          }
          
          // 插入新留言
          const result = await env.DB.prepare(
            'INSERT INTO messages (name, email, message, created_at) VALUES (?, ?, ?, ?)'
          ).bind(
            name,
            email,
            message,
            Date.now()
          ).run();
          
          return new Response(
            JSON.stringify({ success: true, id: result.meta.last_row_id }),
            { status: 201, headers: { ...headers, 'Content-Type': 'application/json' } }
          );
        }
        
        // 返回 404 对于不存在的 API 路由
        return new Response(
          JSON.stringify({ error: 'Not Found' }),
          { status: 404, headers: { ...headers, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('API Error:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Internal Server Error',
            message: NODE_ENV === 'development' ? error.message : undefined
          }),
          { 
            status: 500, 
            headers: { 
              ...headers, 
              'Content-Type': 'application/json' 
            } 
          }
        );
      }
    }

    // 处理静态文件请求
    try {
      // 使用环境变量中的 ASSETS 获取静态文件
      let response = await env.ASSETS.fetch(request);
      
      // 如果找到了文件，直接返回
      if (response.status !== 404) {
        return response;
      }
      
      // 如果请求的是根路径，尝试返回 index.html
      if (url.pathname === '/' || url.pathname === '') {
        const indexRequest = new Request(new URL('/index.html', request.url));
        response = await env.ASSETS.fetch(indexRequest);
        if (response.status !== 404) {
          return response;
        }
      }
      
      // 如果请求的是目录，尝试返回该目录下的 index.html
      if (!url.pathname.includes('.')) {
        const indexRequest = new Request(new URL(`${url.pathname}/index.html`, request.url));
        response = await env.ASSETS.fetch(indexRequest);
        if (response.status !== 404) {
          return response;
        }
      }
      
      // 如果都没找到，返回404
      return new Response('Not Found', { 
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
      
    } catch (error) {
      console.error('Static File Error:', error);
      return new Response('Internal Server Error', { 
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  },
};
