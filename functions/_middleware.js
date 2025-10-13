// 这个中间件会处理所有请求
export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  
  // 对于 API 请求，直接传递给 API 处理函数
  if (url.pathname.startsWith('/api/')) {
    // 克隆请求以便后续使用
    const apiRequest = new Request(request);
    // 添加 CORS 头
    const response = await next(apiRequest);
    
    // 添加 CORS 头
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  }
  
  // 对于非 API 请求，继续正常处理
  let response = await next();
  
  // 如果是登录页面，注入配置
  if (url.pathname.endsWith('admin/login.html')) {
    response = new Response(response.body, response);
    const html = await response.text();
    
    const injectedHTML = html.replace('</head>', `
      <script>
        window.APP_CONFIG = {
          adminUsername: 'admin',
          adminPassword: 'admin123',
          adminApiKey: '6caa82d8c83cd38d66fb92944c75367b7bddece4f5a2a6d1f7794b0ad9ce1f92'
        };
      </script>
    </head>`);
    
    return new Response(injectedHTML, {
      headers: {
        'content-type': 'text/html;charset=UTF-8',
      },
    });
  }
  
  return response;
}
