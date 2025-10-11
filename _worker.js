// _worker.js - Cloudflare Workers 入口文件

// 导入API处理函数
import { onRequest } from './functions/api/[[path]].js';

// 导出处理函数
export default {
  async fetch(request, env, ctx) {
    // 解析请求URL
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

        // 处理API请求
        return await onRequest({ 
          request, 
          env, 
          ctx 
        });
      } catch (error) {
        // 错误处理
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
    return env.ASSETS.fetch(request);
  }
};
