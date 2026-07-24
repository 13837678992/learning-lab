import axios from 'axios';
import { getToken } from '@/utils/auth';
import { forceLogout } from '@/utils/logout';
import message from '@/utils/message';

/**
 * 主应用统一请求客户端（axios 封装，见 CLAUDE.md 第九节 / TASK Phase 2）。
 *
 * 请求阶段：注入 token、公共参数（客户端标识）。
 * 响应阶段：统一处理业务码与 HTTP 状态：
 *   - 401：未登录 / token 失效 → 强制登出。
 *   - 418：会话超时 → 强制登出。
 *   - 网络异常 / 5xx / 其它服务异常 → 统一提示。
 * 约定后端返回 { code, data, message }；code 为 0/200 视为成功并剥离 data。
 */
const service = axios.create({
  baseURL: process.env.API_BASE || '/api',
  timeout: 15000,
});

service.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    // 公共参数示例：客户端标识。
    config.headers['X-Client'] = 'main-layout';
    return config;
  },
  (error) => Promise.reject(error),
);

service.interceptors.response.use(
  (response) => {
    const res = response.data;
    // 非「约定结构」直接透传（如二进制、第三方接口）。
    if (!res || typeof res.code === 'undefined') return res;

    if (res.code === 0 || res.code === 200) return res.data;

    if (res.code === 401) {
      message.error('登录状态已失效，请重新登录');
      forceLogout();
    } else if (res.code === 418) {
      message.warning('会话已超时，请重新登录');
      forceLogout();
    } else {
      message.error(res.message || `请求失败(${res.code})`);
    }
    return Promise.reject(new Error(res.message || `Error ${res.code}`));
  },
  (error) => {
    const resp = error.response;
    if (!resp) {
      message.error('网络异常，请检查网络连接');
    } else if (resp.status === 401) {
      message.error('登录状态已失效，请重新登录');
      forceLogout();
    } else if (resp.status === 418) {
      message.warning('会话已超时，请重新登录');
      forceLogout();
    } else if (resp.status >= 500) {
      message.error(`服务异常(${resp.status})`);
    } else {
      message.error((resp.data && resp.data.message) || `请求错误(${resp.status})`);
    }
    return Promise.reject(error);
  },
);

export default service;
