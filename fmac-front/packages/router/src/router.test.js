import { describe, it, expect, vi } from 'vitest';
import { createRouter } from './router.js';

const okAdapter = () => ({
  push: vi.fn((l) => `to:${l}`),
  replace: vi.fn(),
  back: vi.fn(),
  current: vi.fn(() => '/cur'),
});

describe('createRouter', () => {
  it('push 调用适配器并通知 onChange', () => {
    const r = createRouter({ adapter: okAdapter() });
    const onChange = vi.fn();
    r.onChange(onChange);
    expect(r.push('/x')).toBe('to:/x');
    expect(onChange).toHaveBeenCalledWith({ type: 'push', location: '/x' });
  });

  it('setAdapter 注入底层实现（依赖倒置）', () => {
    const r = createRouter();
    const a = okAdapter();
    r.setAdapter(a);
    r.push('/y');
    expect(a.push).toHaveBeenCalledWith('/y');
  });

  it('适配器抛错时经 onError 上报，不外抛', () => {
    const bad = {
      push: () => {
        throw new Error('nav');
      },
    };
    const r = createRouter({ adapter: bad });
    const onError = vi.fn();
    const off = r.onError(onError);
    expect(() => r.push('/z')).not.toThrow();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].op).toBe('push');
    expect(onError.mock.calls[0][0].error).toBeInstanceOf(Error);
    off();
  });

  it('current 委托适配器', () => {
    const r = createRouter({ adapter: okAdapter() });
    expect(r.current()).toBe('/cur');
  });
});
