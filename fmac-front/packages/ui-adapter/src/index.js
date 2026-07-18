/**
 * @fmac/ui-adapter
 * 框架适配层：把具体框架实现（DOM / ElementUI / Element Plus / vue-router 等）
 * 适配为平台统一契约，让 @fmac/loading、@fmac/message、@fmac/router 等保持框架无关。
 *
 * 本包是除自身外唯一允许依赖具体 UI / 框架的 package（见 CLAUDE.md 第七节）。
 * Phase 2 提供零依赖 DOM 实现（loading / message）；Phase 7 收敛 vue-router 适配器。
 * 接入 ElementUI / Element Plus / Vue3 时新增对应适配器即可，不影响其它 package 与业务。
 */
import { createDomLoadingAdapter } from './dom-loading-adapter.js';
import { createDomMessageAdapter } from './dom-message-adapter.js';
import { createVueRouterAdapter } from './vue-router-adapter.js';

export { createDomLoadingAdapter, createDomMessageAdapter, createVueRouterAdapter };

/** 默认 UI 适配器集合，供 @fmac/core 一次性注入 loading / message。 */
export function createDomAdapters() {
  return {
    loading: createDomLoadingAdapter(),
    message: createDomMessageAdapter(),
  };
}
