import { store } from '@/store';

/**
 * 强制登出：清空会话并跳转登录页（整页刷新以彻底重置 qiankun 注册状态）。
 * 401（未登录）/ 418（会话超时）与主动退出均走此入口。
 * 独立成模块以避免 request ↔ session 的循环依赖。
 */
export function forceLogout() {
  store.clear();
  const base = process.env.PUBLIC_PATH || '/';
  const loginPath = `${base.replace(/\/+$/, '')}/login` || '/login';
  if (typeof window !== 'undefined' && window.location.pathname !== loginPath) {
    window.location.replace(loginPath);
  }
}
