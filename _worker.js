// _worker.js - 使用 ES Modules 格式
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
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
        if (request.method === 'OPTIONS') {
          return new Response(null, { 
            headers: corsHeaders 
          });
        }

        // 导入API处理函数
        const { onRequest } = await import('./functions/api/[[path]].js');
        
        // 处理API请求
        const response = await onRequest({
          request,
          env: {
            DB: env.DB,
            ADMIN_API_KEY: env.ADMIN_API_KEY
          }
        });
        
        // 添加CORS头到响应
        const responseHeaders = new Headers(response.headers);
        for (const [key, value] of Object.entries(corsHeaders)) {
          responseHeaders.set(key, value);
        }
        
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders
        });
        
      } catch (error) {
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
    
    // 其他静态文件请求
    return env.ASSETS.fetch(request);
  }
};
