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

        // 处理实际的API请求
        // ... 这里保留您现有的API处理逻辑 ...
        
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 处理静态文件请求
    try {
      // 使用环境变量中的 ASSETS 获取静态文件
      const response = await env.ASSETS.fetch(request);
      
      // 如果找到了文件，直接返回
      if (response.status !== 404) {
        return response;
      }
      
      // 如果请求的是根路径，尝试返回 index.html
      if (url.pathname === '/' || url.pathname === '') {
        const indexRequest = new Request(new URL('/index.html', request.url));
        return env.ASSETS.fetch(indexRequest);
      }
      
      // 如果请求的是目录，尝试返回该目录下的 index.html
      if (!url.pathname.includes('.')) {
        const indexRequest = new Request(new URL(url.pathname + '/index.html', request.url));
        const indexResponse = await env.ASSETS.fetch(indexRequest);
        if (indexResponse.status !== 404) {
          return indexResponse;
        }
      }
      
      // 如果都没找到，返回404
      return new Response('Not Found', { status: 404 });
      
    } catch (error) {
      return new Response(error.message, { status: 500 });
    }
  },
};
