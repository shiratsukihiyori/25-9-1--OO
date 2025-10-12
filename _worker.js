// _worker.js - 使用 ES Modules 格式

// 设置环境变量
const NODE_ENV = 'production';

// 日志函数
function log(...args) {
  if (NODE_ENV !== 'production') {
    console.log('[Worker]', ...args);
  }
}

// 错误处理函数
function createErrorResponse(error, status = 500) {
  console.error('Error:', error);
  const isDev = NODE_ENV !== 'production';
  
  return new Response(
    JSON.stringify({
      error: status === 500 ? 'Internal Server Error' : error.message || 'Error',
      ...(isDev ? { 
        message: error.message,
        stack: error.stack,
      } : {})
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    }
  );
}

// 基础响应头
const BASE_HEADERS = {
  'Content-Security-Policy': "default-src 'self'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// API 处理函数
async function handleApiRequest(request, env) {
  const url = new URL(request.url);
  
  // 处理 /api/messages 路由
  if (url.pathname === '/api/messages') {
    try {
      if (request.method === 'GET') {
        const { results } = await env.DB.prepare(
          'SELECT * FROM messages ORDER BY created_at DESC'
        ).all();
        
        return new Response(JSON.stringify(results), {
          headers: { ...BASE_HEADERS, 'Content-Type': 'application/json' }
        });
      }
      
      if (request.method === 'POST') {
        const data = await request.json();
        const { name, email = '', message } = data;
        
        if (!name || !message) {
          return createErrorResponse(
            new Error('Name and message are required'), 
            400
          );
        }
        
        const result = await env.DB.prepare(
          'INSERT INTO messages (name, email, message, created_at) VALUES (?, ?, ?, ?)'
        ).bind(name, email, message, Date.now()).run();
        
        return new Response(
          JSON.stringify({ success: true, id: result.meta.last_row_id }),
          { 
            status: 201, 
            headers: { 
              ...BASE_HEADERS, 
              'Content-Type': 'application/json' 
            } 
          }
        );
      }
      
      // 不支持的 HTTP 方法
      return createErrorResponse(
        new Error(`Method ${request.method} not allowed`), 
        405
      );
      
    } catch (error) {
      return createErrorResponse(error);
    }
  }
  
  // 未知的 API 路由
  return createErrorResponse(new Error('Not Found'), 404);
}

// 静态文件处理
async function handleStaticRequest(request, env) {
  const url = new URL(request.url);
  
  try {
    // 尝试直接获取请求的文件
    let response = await env.ASSETS.fetch(request);
    if (response.status !== 404) {
      return response;
    }
    
    // 处理根路径
    if (url.pathname === '/' || url.pathname === '') {
      const indexRequest = new Request(new URL('/index.html', request.url));
      response = await env.ASSETS.fetch(indexRequest);
      if (response.status !== 404) {
        return response;
      }
    }
    
    // 处理目录请求
    if (!url.pathname.includes('.')) {
      const indexRequest = new Request(
        new URL(`${url.pathname.replace(/\.html$/, '')}/index.html`, request.url)
      );
      response = await env.ASSETS.fetch(indexRequest);
      if (response.status !== 404) {
        return response;
      }
    }
    
    // 处理 .html 扩展名
    if (!url.pathname.endsWith('.html') && !url.pathname.includes('.')) {
      const htmlRequest = new Request(
        new URL(`${url.pathname}.html`, request.url)
      );
      response = await env.ASSETS.fetch(htmlRequest);
      if (response.status !== 404) {
        return response;
      }
    }
    
    // 未找到文件
    return new Response('Not Found', { 
      status: 404,
      headers: { 
        'Content-Type': 'text/plain',
        ...BASE_HEADERS
      }
    });
    
  } catch (error) {
    return createErrorResponse(error);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    log(`[${request.method}] ${url.pathname}`);
    
    try {
      // 处理预检请求
      if (request.method === 'OPTIONS') {
        return new Response(null, { 
          headers: BASE_HEADERS 
        });
      }
      
      // 处理 API 请求
      if (url.pathname.startsWith('/api/')) {
        return handleApiRequest(request, env);
      }
      
      // 处理静态文件请求
      return handleStaticRequest(request, env);
      
    } catch (error) {
      return createErrorResponse(error);
    }
  },
};
