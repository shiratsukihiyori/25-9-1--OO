// 最小化 worker 配置
export default {
  async fetch(request, env, ctx) {
    // 对于所有请求，直接返回一个简单的响应
    return new Response('Hello from Cloudflare Worker!', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  }
};
