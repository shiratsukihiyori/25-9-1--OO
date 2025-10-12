// _worker.js - 使用 ES Modules 格式

// 设置环境变量
const NODE_ENV = 'production';
const PAGES_URL = 'https://guestbook-static.pages.dev'; // 更新为您的 Pages URL

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
    // 处理 API 请求
    if (url.pathname.startsWith('/api/')) {
      return handleApiRequest(request, env);
    }

    // 构建 Pages URL
    let filePath = url.pathname;
    if (filePath === '/') {
      filePath = '/index.html';
    } else if (!filePath.includes('.')) {
      filePath = filePath.endsWith('/') 
        ? `${filePath}index.html` 
        : `${filePath}.html`;
    }

    // 从 Cloudflare Pages 获取文件
    const pagesUrl = new URL(filePath, PAGES_URL);
    const response = await fetch(pagesUrl.toString(), {
      headers: request.headers
    });

    if (response.ok) {
      // 设置正确的 Content-Type 头
      const contentType = getContentType(filePath);
      const headers = new Headers(response.headers);
      headers.set('Content-Type', contentType);
      headers.set('Cache-Control', 'public, max-age=3600');
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers
      });
    }

    // 如果文件不存在，返回 404
    return new Response('Not Found: ' + filePath, { 
      status: 404,
      headers: { 
        'Content-Type': 'text/plain; charset=utf-8',
        ...BASE_HEADERS
      }
    });
    
  } catch (error) {
    console.error('Error in handleStaticRequest:', error);
    return createErrorResponse(error);
  }
}

// 根据文件扩展名获取 Content-Type
function getContentType(filePath) {
  const extension = filePath.split('.').pop().toLowerCase();
  const types = {
    'html': 'text/html; charset=utf-8',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'eot': 'application/vnd.ms-fontobject',
    'otf': 'font/otf',
    'txt': 'text/plain',
    'xml': 'application/xml',
    'webmanifest': 'application/manifest+json'
  };
  
  return types[extension] || 'application/octet-stream';
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