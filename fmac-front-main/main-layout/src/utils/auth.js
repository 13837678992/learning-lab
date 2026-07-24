/**
 * 本地鉴权存储（token / 用户信息）。
 * 仅封装 localStorage 读写，供 store 与请求拦截器使用。
 */
const TOKEN_KEY = 'fmac_token';
const USER_KEY = 'fmac_user';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch (e) {
    return '';
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    /* ignore */
  }
}

export function getUserInfo() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch (e) {
    return null;
  }
}

export function setUserInfo(info) {
  try {
    if (info) localStorage.setItem(USER_KEY, JSON.stringify(info));
    else localStorage.removeItem(USER_KEY);
  } catch (e) {
    /* ignore */
  }
}

export function clearAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (e) {
    /* ignore */
  }
}
