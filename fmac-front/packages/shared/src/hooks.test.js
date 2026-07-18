import { describe, it, expect, vi } from 'vitest';
import { createHooks } from './hooks.js';

describe('createHooks', () => {
  it('注册并顺序执行，返回各 handler 结果数组', async () => {
    const h = createHooks();
    h.register('m', () => 1);
    h.register('m', async () => 2);
    expect(await h.callHook('m')).toEqual([1, 2]);
  });

  it('register 返回取消注册函数', async () => {
    const h = createHooks();
    const off = h.register('m', () => 1);
    off();
    expect(h.has('m')).toBe(false);
    expect(await h.callHook('m')).toEqual([]);
  });

  it('callHook 透传参数', async () => {
    const h = createHooks();
    const fn = vi.fn();
    h.register('m', fn);
    await h.callHook('m', 'a', 2);
    expect(fn).toHaveBeenCalledWith('a', 2);
  });

  it('handler 抛错不阻断后续，且不外抛', async () => {
    const h = createHooks();
    h.register('m', () => {
      throw new Error('x');
    });
    const ok = vi.fn(() => 'ok');
    h.register('m', ok);
    const res = await h.callHook('m');
    expect(ok).toHaveBeenCalled();
    expect(res).toEqual(['ok']); // 抛错 handler 不产出结果
  });

  it('注入 onError 时 hook 异常桥接到 onError(err, { hook })', async () => {
    const onError = vi.fn();
    const h = createHooks({ onError });
    h.register('boot', () => {
      throw new Error('boom');
    });
    await h.callHook('boot');
    expect(onError).toHaveBeenCalledTimes(1);
    const [err, meta] = onError.mock.calls[0];
    expect(err).toBeInstanceOf(Error);
    expect(meta).toEqual({ hook: 'boot' });
  });

  it('remove/clear 生效', async () => {
    const h = createHooks();
    const fn = () => 1;
    h.register('m', fn);
    h.remove('m', fn);
    expect(h.has('m')).toBe(false);
    h.register('a', () => 1);
    h.clear();
    expect(h.has('a')).toBe(false);
  });
});
