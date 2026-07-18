/**
 * @fmac/router
 * 统一路由能力：push / replace / back / reload（隔离底层路由实现）。
 *
 * 业务禁止直接 this.$router.push() / history.pushState()，统一走本包（见 CLAUDE.md 第十节）。
 *
 * 用法：
 *   import router from '@fmac/router';
 *   router.push('/home');
 *   router.push({ path: '/detail', query: { id: 1 } });
 *   router.back();
 */
import { createRouter } from './router.js';
import { createHistoryAdapter } from './history-adapter.js';

export { createRouter, createHistoryAdapter };

/** 平台默认路由实例（单例，默认 History API 适配器）。 */
const router = createRouter();
export default router;
