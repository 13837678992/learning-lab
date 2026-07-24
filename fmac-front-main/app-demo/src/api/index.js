import request from '@/utils/request';

/** 示例数据。 */
export function getSummary() {
  return request.get('/demo/summary');
}

/** 触发 418（会话超时 → 通知主应用退出，仅用于演示）。 */
export function triggerExpire() {
  return request.get('/demo/expire');
}

/** 触发 401（未登录，仅用于演示）。 */
export function triggerUnauth() {
  return request.get('/demo/unauth');
}
