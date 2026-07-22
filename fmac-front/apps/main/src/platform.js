import platform, { createVueRouterAdapter } from '@fmac/core';
import router from './router/index.js';
import { createElementMessageAdapter } from './platform/element-message-adapter.js';

/**
 * 平台装配：通过 @fmac/core 一次性接入各能力。
 * 这是基座接入 packages 的唯一入口 —— 注入 vue-router 适配器（由 core 统一提供，
 * 依赖倒置）、Element UI 消息适配器、request 运行时配置等。
 * 业务始终调用 @fmac/core 的 router，不直接触碰 vue-router。
 */
export function setupPlatform() {
  platform.setup({
    debug: process.env.NODE_ENV !== 'production',
    request: {
      baseURL: process.env.VITE_API_BASE || '/api',
    },
    router: {
      adapter: createVueRouterAdapter(router),
    },
  });
  // 注入 Element UI 消息适配器：平台 message 统一走 Element UI（子应用经共享实例复用）。
  platform.message.setAdapter(createElementMessageAdapter());
  return platform;
}
