// _worker.js - Cloudflare Workers 入口文件

// 使用 CommonJS 语法
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event));
});

async function handleRequest(event) {
  const url = new URL(event.request.url);
  
  // 处理API请求
  if (url.pathname.startsWith('/api/')) {
    try {
      // 添加CORS头
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json',
      };

      // 处理预检请求
      if (event.request.method === 'OPTIONS') {
        return new Response(null, { 
          headers: corsHeaders 
        });
      }

      // 动态导入API处理函数
      const { onRequest } = await import('./functions/api/[[path]].js');
      
      // 处理API请求
      return await onRequest({
        request: event.request,
        env: {
          DB: env.DB
          // 添加其他需要的环境变量
        },
        // 添加其他需要的上下文
      });
    } catch (error) {
      // 错误处理
      console.error('Error:', error);
      return new Response(JSON.stringify({
        error: '服务器内部错误',
        details: error.message
      }), { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
  
  // 其他静态文件请求由Pages处理
  return fetch(event.request);
}
