import axios from 'axios';
import { getToken, removeToken } from './auth';
import { showMessage } from './message';

const service = axios.create({
  baseURL: process.env.VUE_APP_BASE_API,
  timeout: 15000
});

service.interceptors.request.use(
  config => {
    const token = getToken();
    if (token) {
      config.headers['Authorization'] = 'Bearer ' + token;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

service.interceptors.response.use(
  response => {
    const res = response.data;
    if (res.code && res.code !== 200) {
      showMessage(res.message || '请求失败', 'error');
      return Promise.reject(new Error(res.message || '请求失败'));
    }
    return res;
  },
  error => {
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        removeToken();
        showMessage('登录已过期，请重新登录', 'error');
        window.location.href = '/login';
      } else if (status === 418) {
        removeToken();
        showMessage('账号异常，已被强制退出', 'error');
        window.location.href = '/login';
      } else {
        showMessage(error.response.data && error.response.data.message || '服务异常', 'error');
      }
    } else {
      showMessage('网络异常，请检查网络连接', 'error');
    }
    return Promise.reject(error);
  }
);

export default service;
