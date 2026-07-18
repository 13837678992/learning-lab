import platform, { createVueRouterAdapter } from '@fmac/core';
import router from './router/index.js';

/**
 * 平台装配：通过 @fmac/core 一次性接入各能力。
 * 这是基座接入 packages 的唯一入口 —— 注入 vue-router 适配器（由 core 统一提供，
 * 依赖倒置）、UI 适配器（core 默认 DOM 实现）、request 运行时配置等。
 * 业务始终调用 @fmac/core 的 router，不直接触碰 vue-router。
 */
export function setupPlatform() {
  platform.setup({
    debug: import.meta.env.DEV,
    request: {
      baseURL: import.meta.env.VITE_API_BASE || '/api',
    },
    router: {
      adapter: createVueRouterAdapter(router),
    },
  });
  return platform;
}
