import axios from 'axios';
import { getContext } from '@/context';

/**
 * 子应用独立请求客户端（axios）。与主应用请求逻辑相互独立（见 CLAUDE.md 第九节）。
 *
 * 请求阶段：注入 token（来自主应用下发的上下文）、客户端标识。
 * 响应阶段：
 *   - 401：未登录 —— 独立运行时自处理；qiankun 下桥接主应用。
 *   - 418：会话超时 —— 调用 window.microApp.logout() 通知主应用退出（TASK Phase 3）。
 */
const service = axios.create({
  baseURL: process.env.API_BASE || '/api',
  timeout: 15000,
});

service.interceptors.request.use(
  (config) => {
    const token = getContext().token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    config.headers['X-Client'] = 'app-demo';
    return config;
  },
  (error) => Promise.reject(error),
);

service.interceptors.response.use(
  (response) => {
    const res = response.data;
    if (!res || typeof res.code === 'undefined') return res;
    if (res.code === 0 || res.code === 200) return res.data;
    return Promise.reject(new Error(res.message || `Error ${res.code}`));
  },
  (error) => {
    const status = error.response && error.response.status;
    if (status === 401) {
      handleUnauthorized();
    } else if (status === 418) {
      notifyLogout();
    }
    return Promise.reject(error);
  },
);

/** 401：未登录处理。 */
function handleUnauthorized() {
  if (bridgeAvailable()) {
    // qiankun 下交由主应用统一处理未登录（跳登录）。
    window.microApp.logout();
  } else {
    // 独立运行：此处可跳转子应用自身登录页，示例仅打印。
    console.warn('[app-demo] 401 未登录（独立运行）');
  }
}

/** 418：会话超时 → 通知主应用退出登录。 */
function notifyLogout() {
  if (bridgeAvailable()) {
    window.microApp.logout();
  } else {
    console.warn('[app-demo] 418 会话超时（独立运行，无主应用桥接）');
  }
}

function bridgeAvailable() {
  return (
    typeof window !== 'undefined' &&
    window.microApp &&
    typeof window.microApp.logout === 'function'
  );
}

export default service;
