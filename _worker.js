// _worker.js - Cloudflare Workers 入口文件

// 处理请求
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

      // 导入API处理函数
      const { onRequest } = await import('./functions/api/[[path]].js');
      
      // 创建环境变量
      const env = {
        DB: globalThis.DB, // 从全局变量获取DB绑定
        ADMIN_API_KEY: globalThis.ADMIN_API_KEY // 从全局变量获取管理密钥
      };
      
      // 处理API请求
      const response = await onRequest({
        request: event.request,
        env: env,
        // 添加其他需要的上下文
      });
      
      // 添加CORS头到响应
      for (const [key, value] of Object.entries(corsHeaders)) {
        response.headers.set(key, value);
      }
      
      return response;
    } catch (error) {
      // 错误处理
      console.error('API Error:', error);
      return new Response(JSON.stringify({
        error: '服务器内部错误',
        details: process.env.NODE_ENV === 'development' ? error.message : ''
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
