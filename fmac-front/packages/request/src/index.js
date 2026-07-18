/**
 * @fmac/request
 * 统一请求能力：get / post（隔离 axios / fetch 实现）。
 *
 * 业务禁止直接调用 axios() / fetch()，统一走本包（见 CLAUDE.md 第十一节）。
 *
 * 用法：
 *   import request from '@fmac/request';
 *   const list = await request.get('/api/users', { params: { page: 1 } });
 *   const created = await request.post('/api/users', { name: 'a' });
 */
import { createRequest } from './request.js';
import { createFetchAdapter } from './fetch-adapter.js';

export { createRequest, createFetchAdapter };

/** 平台默认请求实例（单例，默认 fetch 适配器）。 */
const request = createRequest();
export default request;
