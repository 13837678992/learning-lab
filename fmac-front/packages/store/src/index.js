/**
 * @fmac/store
 * 跨应用共享状态：get / set / remove / subscribe / unsubscribe。
 *
 * 跨应用共享状态统一走本包，禁止用 window / sessionStorage / localStorage 通信
 * （见 CLAUDE.md 第九、十四节）。
 *
 * 用法：
 *   import store from '@fmac/store';
 *   store.set('user', { id: 1 });
 *   const off = store.subscribe('user', (val, old) => render(val));
 *   store.get('user');
 *   off();
 */
import { createStore } from './store.js';

export { createStore };

/** 平台默认共享状态实例（单例）。 */
const store = createStore();
export default store;
