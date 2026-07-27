import axios from 'axios';

var service = axios.create({
  baseURL: process.env.VUE_APP_BASE_API,
  timeout: 15000
});

service.interceptors.request.use(
  function(config) {
    var token = localStorage.getItem('fmac_token');
    if (token) {
      config.headers['Authorization'] = 'Bearer ' + token;
    }
    return config;
  },
  function(error) {
    return Promise.reject(error);
  }
);

service.interceptors.response.use(
  function(response) {
    var res = response.data;
    if (res.code && res.code !== 200) {
      return Promise.reject(new Error(res.message || '请求失败'));
    }
    return res;
  },
  function(error) {
    if (error.response) {
      var status = error.response.status;
      if (status === 401) {
        alert('登录已过期，请重新登录');
        if (window.microApp && window.microApp.logout) {
          window.microApp.logout();
        }
      } else if (status === 418) {
        alert('账号异常，已被强制退出');
        if (window.microApp && window.microApp.logout) {
          window.microApp.logout();
        }
      }
    }
    return Promise.reject(error);
  }
);

export default service;
