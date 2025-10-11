import { fetch } from './server.js';

export default {
  async fetch(request, env) {
    // 设置 D1 数据库
    process.env.DB = env.DB;
    
    // 处理请求
    return fetch(request);
  }
};
