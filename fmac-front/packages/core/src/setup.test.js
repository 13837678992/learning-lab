// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeAll } from 'vitest';

/**
 * core 集成测试 —— 平台装配接线（happy-dom 模拟浏览器）。
 * 验证 setup() 把 Hook 接入 request/router、异常桥接 errorHandler、注入默认 DOM 适配器。
 * mock qiankun：本用例只测装配，不驱动真实 qiankun。
 */
vi.mock('qiankun', () => ({
  registerMicroApps: vi.fn(),
  start: vi.fn(),
  setDefaultMountApp: vi.fn(),
  addGlobalUncaughtErrorHandler: vi.fn(),
  initGlobalState: vi.fn(() => ({ onGlobalStateChange: vi.fn(), setGlobalState: vi.fn() })),
  loadMicroApp: vi.fn(() => ({ unmount: vi.fn(() => Promise.resolve()) })),
}));

import platform from './index.js';

const okAdapter = vi.fn(async (config) => ({ data: config, status: 200 }));

beforeAll(() => {
  // 注入 mock request 适配器避免真实 fetch；默认 UI 适配器（DOM）随 setup 注入。
  platform.setup({ force: true, request: { adapter: okAdapter } });
});

describe('core.setup 装配接线', () => {
  it('beforeRequest/afterRequest Hook 接入 request 拦截器', async () => {
    const before = vi.fn();
    const after = vi.fn();
    platform.hooks.register('beforeRequest', before);
    platform.hooks.register('afterRequest', after);
    await platform.request.get('/x');
    expect(before).toHaveBeenCalled();
    expect(after).toHaveBeenCalled();
  });

  it('router.onChange 驱动 afterRoute Hook', () => {
    const afterRoute = vi.fn();
    platform.hooks.register('afterRoute', afterRoute);
    platform.router.push('/home');
    expect(afterRoute).toHaveBeenCalled();
  });

  it('request 异常桥接 errorHandler.request', async () => {
    platform.request.setAdapter(async () => {
      throw new Error('net');
    });
    const onErr = vi.fn();
    const off = platform.errorHandler.register(onErr);
    await expect(platform.request.get('/x')).rejects.toThrow('net');
    expect(onErr.mock.calls.some(([p]) => p.type === 'request')).toBe(true);
    off();
    platform.request.setAdapter(okAdapter); // 复原
  });

  it('默认注入 DOM 适配器：loading.show 渲染遮罩到 document', () => {
    platform.loading.show();
    expect(document.querySelector('.fmac-loading-mask')).toBeTruthy();
    platform.loading.hide();
    expect(document.querySelector('.fmac-loading-mask')).toBeFalsy();
  });

  it('platform 门面暴露统一扩展入口（hooks / errorHandler / use）', () => {
    expect(typeof platform.hooks.register).toBe('function');
    expect(typeof platform.errorHandler.register).toBe('function');
    expect(typeof platform.use).toBe('function');
  });
});
