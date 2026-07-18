import localPlatform, { createVueRouterAdapter } from '@fmac/core';

/**
 * 子应用接入平台的唯一入口（本文件是本子应用中唯一 import @fmac/core 的位置）。
 *
 * - router / request 属于子应用自身：把子应用的 vue-router 适配进 @fmac/router，配置 request；
 * - store / event 属于跨应用能力：qiankun 下采用主应用经 props 注入的共享平台实例，
 *   standalone 下回退到本地实例（不使用 window 通信，见 CLAUDE.md 第九节）。
 */

let sharedPlatform = localPlatform;

/** 装配本地能力：路由适配器每次挂载都指向当前 vue-router；request/UI 仅装配一次。 */
export function setupPlatform(vueRouter, options = {}) {
  const inQiankun = !!(typeof window !== 'undefined' && window.__POWERED_BY_QIANKUN__);
  localPlatform.router.setAdapter(createVueRouterAdapter(vueRouter));
  localPlatform.setup({
    debug: import.meta.env.DEV,
    request: { baseURL: options.baseURL || '/api' },
    adapters: inQiankun ? {} : undefined,
  });
}

/** 采用主应用注入的共享平台（保证 store / event 跨应用一致）。 */
export function bindSharedPlatform(injected) {
  sharedPlatform = injected || localPlatform;
}

export const router = localPlatform.router;
export const request = localPlatform.request;
export function getStore() {
  return sharedPlatform.store;
}
export function getEvent() {
  return sharedPlatform.event;
}
