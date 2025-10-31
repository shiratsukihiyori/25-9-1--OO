// _worker.js - 使用 ES Modules 格式
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 处理API请求
    if (url.pathname.startsWith('/api/')) {
      try {
        // 获取请求来源
        const origin = request.headers.get('Origin') || '';
        const allowedOrigins = [
          'https://hiyori.webn.cc',
          'https://home.hiyori.xx.kg',
          'https://*.pages.dev'
        ];
        
        // 检查请求来源是否在允许的域名列表中
        const isAllowedOrigin = allowedOrigins.some(allowed => 
          origin === allowed || 
          (allowed.startsWith('*') && origin.endsWith(allowed.slice(1))) ||
          (allowed.endsWith('*') && origin.startsWith(allowed.slice(0, -1)))
        );

        // 设置CORS头
        const corsHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Allow-Credentials': 'true',
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

        // 记录请求信息
        console.log(`[${new Date().toISOString()}] ${request.method} ${url.pathname}`);
        
        // 导入API处理函数
        const { onRequest } = await import('./functions/api/[[path]].js');
        
        // 处理API请求
        const response = await onRequest({
          request: request.clone(), // 克隆请求以便后续使用
          env: {
            DB: env.DB,
            ADMIN_API_KEY: env.ADMIN_API_KEY,
            SUPABASE_URL: env.SUPABASE_URL,
            SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY,
            SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY
          }
        });

        // 确保响应是 Response 对象
        if (!(response instanceof Response)) {
          throw new Error('API 处理函数未返回有效的 Response 对象');
        }

        // 获取响应体文本（用于日志记录）
        const responseText = await response.text();
        console.log(`[${new Date().toISOString()}] 响应状态: ${response.status} ${response.statusText}`);
        console.log(`[${new Date().toISOString()}] 响应体:`, responseText);
        
        // 添加CORS头到响应
        const responseHeaders = new Headers(response.headers);
        for (const [key, value] of Object.entries(corsHeaders)) {
          if (!responseHeaders.has(key)) {
            responseHeaders.set(key, value);
          }
        }
        
        // 返回新的响应，确保包含原始响应体
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
