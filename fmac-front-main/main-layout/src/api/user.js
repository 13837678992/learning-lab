import request from '@/utils/request';

/** 登录：返回 { token, userInfo }。 */
export function login(data) {
  return request.post('/login', data);
}

/** 退出登录（通知后端使 token 失效）。 */
export function logout() {
  return request.post('/logout');
}

/** 获取当前用户信息。 */
export function fetchUserInfo() {
  return request.get('/user/info');
}
