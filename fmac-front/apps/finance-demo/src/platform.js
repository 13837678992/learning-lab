import localPlatform, { createVueRouterAdapter } from '@fmac/core';
import { MICRO_APPS, SUBAPPS } from '@fmac/constants';

/**
 * 财务子应用接入平台的唯一入口（本子应用中唯一 import @fmac/core 的位置）。
 *
 * 能力划分：
 * - 本地能力（子应用自身）：router（应用内导航）、request（自有 baseURL/token）、cache（页面状态）。
 * - 跨应用能力（随主应用注入切换到同一实例）：store / event / tab / auth / message / loading，
 *   以及 sharedRouter（跨应用跳转）。
 *
 * 禁止直接调用 qiankun、禁止直接操作主应用、禁止 window/history 通信（CLAUDE.md 第八~十节）。
 */
let shared = localPlatform;
let wired = false;

export function setupPlatform(vueRouter, options = {}) {
  const inQiankun = !!(typeof window !== 'undefined' && window.__POWERED_BY_QIANKUN__);
  // 路由适配器每次挂载都指向当前 vue-router。
  localPlatform.router.setAdapter(createVueRouterAdapter(vueRouter));
  if (wired) return;
  wired = true;
  // Request：请求拦截注入共享 auth 的 token（Request 测试 · token）。
  localPlatform.request.useRequestInterceptor((config) => {
    const token = shared.auth ? shared.auth.getToken() : null;
    if (token) config.headers = { ...(config.headers || {}), Authorization: `Bearer ${token}` };
    return config;
  });
  localPlatform.setup({
    debug: process.env.NODE_ENV !== 'production',
    request: { baseURL: options.baseURL || '/api' },
    adapters: inQiankun ? {} : undefined, // qiankun 下复用主应用 UI 适配器
  });
}

/** 采用主应用注入的共享平台。 */
export function bindSharedPlatform(injected) {
  shared = injected || localPlatform;
}

// 本地能力
export const router = localPlatform.router;
export const request = localPlatform.request;
export const cache = localPlatform.cache;

// 跨应用能力（随注入切换）
export const getStore = () => shared.store;
export const getEvent = () => shared.event;
export const getTab = () => shared.tab;
export const getAuth = () => shared.auth;
export const getMessage = () => shared.message;
export const getLoading = () => shared.loading;
/** 跨应用跳转专用：主应用的 router（base '/'），可切换到其它子应用激活路径。 */
export const getSharedRouter = () => shared.router;

/** 子应用激活前缀（来自配置中心，单一事实源）。 */
export const ACTIVE_RULE = SUBAPPS[MICRO_APPS.FINANCE].activeRule;
/** 子应用默认请求 baseURL（来自配置中心）。 */
export const API_BASE = SUBAPPS[MICRO_APPS.FINANCE].apiBase;

/** 打开一个标签（写入共享 tab，展示在主应用标签栏）。 */
export function openTab(path, title) {
  const full = path === '/' ? ACTIVE_RULE : `${ACTIVE_RULE}${path}`;
  getTab().add({ key: full, title, path: full });
}
