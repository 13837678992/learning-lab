import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * core 集成测试 —— qiankun 生命周期托管。
 * mock qiankun，验证 core.setup → qiankun 生命周期（register/start/load）的接线：
 * 平台 Hook 合入子应用生命周期、强制 strictStyleIsolation、异常桥接、手动加载句柄管理。
 */
vi.mock('qiankun', () => ({
  registerMicroApps: vi.fn(),
  start: vi.fn(),
  setDefaultMountApp: vi.fn(),
  addGlobalUncaughtErrorHandler: vi.fn(),
  initGlobalState: vi.fn(() => ({ onGlobalStateChange: vi.fn(), setGlobalState: vi.fn() })),
  loadMicroApp: vi.fn(() => ({ unmount: vi.fn(() => Promise.resolve()) })),
}));

import * as qiankun from 'qiankun';
import { createMicroManager } from './qiankun.js';
import { hooks, errorHandler } from './runtime.js';

describe('createMicroManager（qiankun 生命周期托管）', () => {
  beforeEach(() => {
    hooks.clear();
  });

  it('registerApps 归一化 props 并把平台 Hook 合入子应用生命周期', async () => {
    const mgr = createMicroManager();
    mgr.registerApps([{ name: 'app-user', entry: '//x', container: '#c', activeRule: '/u' }]);

    expect(qiankun.registerMicroApps).toHaveBeenCalledTimes(1);
    const [apps, lifecycles] = qiankun.registerMicroApps.mock.calls[0];
    expect(apps[0].name).toBe('app-user');
    expect(apps[0].props).toBeDefined();

    // 平台 beforeMount/afterMount Hook 应被合入 qiankun 生命周期数组。
    const beforeMount = vi.fn();
    const afterMount = vi.fn();
    hooks.register('beforeMount', beforeMount);
    hooks.register('afterMount', afterMount);
    await Promise.all(lifecycles.beforeMount.map((fn) => fn()));
    await Promise.all(lifecycles.afterMount.map((fn) => fn()));
    expect(beforeMount).toHaveBeenCalled();
    expect(afterMount).toHaveBeenCalled();
  });

  it('start 强制 strictStyleIsolation、注册全局异常桥接，并触发 beforeBootstrap/afterBootstrap', async () => {
    const mgr = createMicroManager();
    const boot = vi.fn();
    const booted = vi.fn();
    hooks.register('beforeBootstrap', boot);
    hooks.register('afterBootstrap', booted);

    await mgr.start();
    expect(qiankun.start).toHaveBeenCalledTimes(1);
    expect(qiankun.start.mock.calls[0][0].sandbox.strictStyleIsolation).toBe(true);
    expect(qiankun.addGlobalUncaughtErrorHandler).toHaveBeenCalled();
    expect(boot).toHaveBeenCalled();
    expect(booted).toHaveBeenCalled();

    // 幂等：重复 start 不再调用 qiankun.start。
    await mgr.start();
    expect(qiankun.start).toHaveBeenCalledTimes(1);
  });

  it('strictStyleIsolation 不可被调用方关闭', async () => {
    const mgr = createMicroManager();
    await mgr.start({ sandbox: { strictStyleIsolation: false } });
    expect(qiankun.start.mock.calls[0][0].sandbox.strictStyleIsolation).toBe(true);
  });

  it('全局未捕获异常桥接到 errorHandler.micro', async () => {
    const mgr = createMicroManager();
    const onError = vi.fn();
    const off = errorHandler.register(onError);
    await mgr.start();
    // 取 start 中注册的桥接回调并触发。
    const bridge = qiankun.addGlobalUncaughtErrorHandler.mock.calls[0][0];
    bridge({ error: new Error('sub-app boom') });
    expect(onError.mock.calls.some(([p]) => p.type === 'micro')).toBe(true);
    off();
  });

  it('loadApp/unloadApp 管理手动加载句柄', async () => {
    const mgr = createMicroManager();
    const handle = mgr.loadApp({ name: 'manual', entry: '//m' });
    expect(qiankun.loadMicroApp).toHaveBeenCalled();
    expect(await mgr.unloadApp('manual')).toBe(true);
    expect(handle.unmount).toHaveBeenCalled();
    expect(await mgr.unloadApp('missing')).toBe(false);
  });

  it('getApps 汇总注册与手动加载清单；initState/setDefaultApp 委托 qiankun', () => {
    const mgr = createMicroManager();
    mgr.registerApps([{ name: 'app-user', entry: '//x', container: '#c', activeRule: '/u' }]);
    mgr.loadApp({ name: 'manual', entry: '//m' });
    const apps = mgr.getApps();
    expect(apps.registered.map((a) => a.name)).toContain('app-user');
    expect(apps.loaded).toContain('manual');

    mgr.initState({ a: 1 });
    expect(qiankun.initGlobalState).toHaveBeenCalledWith({ a: 1 });
    mgr.setDefaultApp('/u');
    expect(qiankun.setDefaultMountApp).toHaveBeenCalledWith('/u');
  });
});
