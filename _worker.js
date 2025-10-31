// _worker.js - 使用 ES Modules 格式
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 处理API请求
    if (url.pathname.startsWith('/api/')) {
      // 获取请求来源
      const origin = request.headers.get('Origin') || '';
      
      // 设置CORS头
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Content-Type': 'application/json',
      };

      // 处理预检请求
      if (request.method === 'OPTIONS') {
        return new Response(null, { 
          status: 204,
          headers: {
            ...corsHeaders,
            'Access-Control-Max-Age': '86400' // 24小时
          }
        });
      }

      try {
        // 记录请求信息
        console.log(`[${new Date().toISOString()}] ${request.method} ${url.pathname}`);
        console.log('Environment keys:', Object.keys(env));
        console.log('DB binding exists:', !!env.DB);
        
        // 导入API处理函数
        const { onRequest } = await import('./functions/api/[[path]].js');
        
        // 准备环境变量
        const apiEnv = {
          ...env,
          DB: env.DB,
          ADMIN_API_KEY: env.ADMIN_API_KEY || "",
          SUPABASE_URL: env.SUPABASE_URL || "",
          SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY || "",
          SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY || ""
        };
        
        // 处理API请求
        let response;
        try {
          response = await onRequest({
            request: request.clone(),
            env: apiEnv
          });
          
          if (!(response instanceof Response)) {
            throw new Error('API handler did not return a valid Response object');
          }
        } catch (error) {
          console.error('Error in API handler:', error);
          response = new Response(JSON.stringify({
            success: false,
            error: 'Internal Server Error',
            message: error.message
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // 确保响应头包含 CORS 头
        const responseHeaders = new Headers(response.headers);
        for (const [key, value] of Object.entries(corsHeaders)) {
          if (!responseHeaders.has(key)) {
            responseHeaders.set(key, value);
          }
        }
        
        // 记录响应信息
        const responseText = await response.text();
        console.log(`[${new Date().toISOString()}] 响应状态: ${response.status} ${response.statusText}`);
        
        // 返回新的响应，确保包含原始响应体和正确的头
        return new Response(responseText, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders
        });
        
      } catch (error) {
        console.error(`[${new Date().toISOString()}] 错误:`, error);
        return new Response(JSON.stringify({
          success: false,
          error: '服务器内部错误',
          details: error.message,
          timestamp: new Date().toISOString()
        }), { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
    
    // 处理 HTML 文件请求，注入环境变量
    if (url.pathname.endsWith('.html')) {
      try {
        const response = await env.ASSETS.fetch(request);
        
        // 如果是登录页面，注入环境变量
        if (url.pathname.endsWith('/admin/login.html')) {
          let html = await response.text();
          
          // 从环境变量获取凭据
          const adminUsername = env.ADMIN_USERNAME || 'admin';
          const adminPassword = env.ADMIN_PASSWORD || 'admin123';
          const adminApiKey = env.ADMIN_API_KEY || '';
          
          const injectedConfig = {
            adminUsername,
            adminPassword,
            adminApiKey
          };
          
          // 注入环境变量到 HTML 中
          html = html.replace('</head>', `
            <script>
              window.APP_CONFIG = ${JSON.stringify(injectedConfig)};
            </script>
          </head>`);
          
          const headers = new Headers(response.headers);
          headers.set('Content-Type', 'text/html');
          headers.set('Access-Control-Allow-Origin', '*');
          
          return new Response(html, {
            status: response.status,
            statusText: response.statusText,
            headers: headers
          });
        }
        
        // 其他 HTML 文件
        const headers = new Headers(response.headers);
        headers.set('Access-Control-Allow-Origin', '*');
        
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: headers
        });
      } catch (error) {
        console.error(`[${new Date().toISOString()}] HTML 文件处理错误:`, error);
        return new Response('Internal Server Error', { status: 500 });
      }
    }
    
    // 其他静态文件请求
    try {
      const response = await env.ASSETS.fetch(request);
      // 确保静态文件请求也包含 CORS 头
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });
    } catch (error) {
      console.error(`[${new Date().toISOString()}] 静态文件请求错误:`, error);
      return new Response('Not Found', { status: 404 });
    }
  }
};
