import { describe, it, expect, vi } from 'vitest';
import { createEmitter } from './emitter.js';

describe('createEmitter', () => {
  it('on/emit 传递参数，on 返回取消订阅函数', () => {
    const e = createEmitter();
    const fn = vi.fn();
    const off = e.on('evt', fn);
    e.emit('evt', 1, 2);
    expect(fn).toHaveBeenCalledWith(1, 2);
    off();
    e.emit('evt', 3);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('once 只触发一次，可用原始 handler 反注册', () => {
    const e = createEmitter();
    const fn = vi.fn();
    e.once('evt', fn);
    e.emit('evt');
    e.emit('evt');
    expect(fn).toHaveBeenCalledTimes(1);

    const fn2 = vi.fn();
    e.once('evt', fn2);
    e.off('evt', fn2); // 以原始 handler 反注册 once 包装
    e.emit('evt');
    expect(fn2).not.toHaveBeenCalled();
  });

  it('off(type) 清空该类型，off() 清空全部', () => {
    const e = createEmitter();
    const a = vi.fn();
    const b = vi.fn();
    e.on('a', a);
    e.on('b', b);
    e.off('a');
    e.emit('a');
    expect(a).not.toHaveBeenCalled();
    e.emit('b');
    expect(b).toHaveBeenCalledTimes(1);
    e.off();
    e.emit('b');
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('单个监听器抛错不影响其它监听器（错误隔离）', () => {
    const e = createEmitter();
    const bad = vi.fn(() => {
      throw new Error('boom');
    });
    const good = vi.fn();
    e.on('evt', bad);
    e.on('evt', good);
    expect(() => e.emit('evt')).not.toThrow();
    expect(good).toHaveBeenCalledTimes(1);
  });

  it('has/clear 反映监听器状态', () => {
    const e = createEmitter();
    e.on('evt', () => {});
    expect(e.has('evt')).toBe(true);
    e.clear();
    expect(e.has('evt')).toBe(false);
  });

  it('非函数 handler 被忽略并返回 no-op', () => {
    const e = createEmitter();
    const off = e.on('evt', null);
    expect(typeof off).toBe('function');
    expect(() => off()).not.toThrow();
    expect(e.has('evt')).toBe(false);
  });
});
