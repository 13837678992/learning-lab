import { describe, it, expect, vi } from 'vitest';
import { createStore } from './store.js';

describe('createStore', () => {
  it('set/get 基本读写；get() 返回全量快照', () => {
    const s = createStore({ a: 1 });
    expect(s.get('a')).toBe(1);
    s.set('b', 2);
    expect(s.get('b')).toBe(2);
    expect(s.get()).toEqual({ a: 1, b: 2 });
  });

  it('subscribe(key) 收到 (value, old)，返回取消函数', () => {
    const s = createStore();
    const fn = vi.fn();
    const off = s.subscribe('k', fn);
    s.set('k', 1);
    expect(fn).toHaveBeenCalledWith(1, undefined);
    s.set('k', 2);
    expect(fn).toHaveBeenLastCalledWith(2, 1);
    off();
    s.set('k', 3);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('同值 set 不触发通知', () => {
    const s = createStore();
    const fn = vi.fn();
    s.subscribe('k', fn);
    s.set('k', 1);
    s.set('k', 1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('subscribe(handler) 订阅全部变更', () => {
    const s = createStore();
    const fn = vi.fn();
    s.subscribe(fn);
    s.set('k', 1);
    expect(fn).toHaveBeenCalledWith({ key: 'k', value: 1, oldValue: undefined });
  });

  it('remove 删除并通知 undefined', () => {
    const s = createStore({ k: 1 });
    const fn = vi.fn();
    s.subscribe('k', fn);
    s.remove('k');
    expect(s.has('k')).toBe(false);
    expect(fn).toHaveBeenCalledWith(undefined, 1);
  });

  it('unsubscribe(handler) 取消全部订阅', () => {
    const s = createStore();
    const fn = vi.fn();
    s.subscribe(fn);
    s.unsubscribe(fn);
    s.set('k', 1);
    expect(fn).not.toHaveBeenCalled();
  });

  it('reset 清空所有状态', () => {
    const s = createStore({ a: 1, b: 2 });
    s.reset();
    expect(s.get()).toEqual({});
  });
});
