import { describe, it, expect, vi } from 'vitest';
import { createPluginManager } from './plugin.js';

describe('createPluginManager', () => {
  it('register + install 调用 plugin.install(context)', () => {
    const mgr = createPluginManager();
    const install = vi.fn();
    mgr.register({ name: 'p1', install });
    const ctx = { any: 1 };
    mgr.install(ctx);
    expect(install).toHaveBeenCalledWith(ctx);
    expect(mgr.has('p1')).toBe(true);
    expect(mgr.get('p1')).toBeTruthy();
    expect(mgr.list()).toContain('p1');
  });

  it('重复注册同名被忽略', () => {
    const mgr = createPluginManager();
    mgr.register({ name: 'p', install: vi.fn() });
    mgr.register({ name: 'p', install: vi.fn() });
    expect(mgr.list().filter((n) => n === 'p')).toHaveLength(1);
  });

  it('install 幂等：已安装的插件不重复安装', () => {
    const mgr = createPluginManager();
    const install = vi.fn();
    mgr.register({ name: 'p', install });
    mgr.install({});
    mgr.install({});
    expect(install).toHaveBeenCalledTimes(1);
  });

  it('无名插件被拒绝', () => {
    const mgr = createPluginManager();
    mgr.register({ install: vi.fn() });
    expect(mgr.list()).toHaveLength(0);
  });

  it('install 中单个插件抛错被隔离，不影响其它插件', () => {
    const mgr = createPluginManager();
    const good = vi.fn();
    mgr.register({
      name: 'bad',
      install: () => {
        throw new Error('x');
      },
    });
    mgr.register({ name: 'good', install: good });
    expect(() => mgr.install({})).not.toThrow();
    expect(good).toHaveBeenCalled();
  });
});
