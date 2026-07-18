import { describe, it, expect, vi } from 'vitest';
import { createLoading } from './loading.js';

const spyAdapter = () => ({ show: vi.fn(), hide: vi.fn() });

describe('createLoading', () => {
  it('引用计数：多次 show 只触发一次 adapter.show，计数归零才 hide', () => {
    const adapter = spyAdapter();
    const l = createLoading({ adapter });
    l.show();
    l.show();
    expect(adapter.show).toHaveBeenCalledTimes(1);
    expect(l.isActive()).toBe(true);
    l.hide();
    expect(adapter.hide).not.toHaveBeenCalled();
    l.hide();
    expect(adapter.hide).toHaveBeenCalledTimes(1);
    expect(l.isActive()).toBe(false);
  });

  it('show 返回一次性 hide 函数', () => {
    const adapter = spyAdapter();
    const l = createLoading({ adapter });
    const hide = l.show();
    hide();
    expect(adapter.hide).toHaveBeenCalledTimes(1);
  });

  it('hide(true) 强制清零', () => {
    const adapter = spyAdapter();
    const l = createLoading({ adapter });
    l.show();
    l.show();
    l.show();
    l.hide(true);
    expect(adapter.hide).toHaveBeenCalledTimes(1);
    expect(l.isActive()).toBe(false);
  });

  it('withLoading 包裹 Promise：前置 show、后置 hide、透传返回值', async () => {
    const adapter = spyAdapter();
    const l = createLoading({ adapter });
    const out = await l.withLoading(async () => 42);
    expect(out).toBe(42);
    expect(adapter.show).toHaveBeenCalledTimes(1);
    expect(adapter.hide).toHaveBeenCalledTimes(1);
  });

  it('withLoading 出错也会 hide', async () => {
    const adapter = spyAdapter();
    const l = createLoading({ adapter });
    await expect(l.withLoading(() => Promise.reject(new Error('x')))).rejects.toThrow('x');
    expect(adapter.hide).toHaveBeenCalledTimes(1);
  });
});
