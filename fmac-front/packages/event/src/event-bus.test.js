import { describe, it, expect, vi } from 'vitest';
import { createEventBus } from './event-bus.js';

describe('createEventBus', () => {
  it('on/emit/has，on 返回取消订阅函数', () => {
    const bus = createEventBus();
    const fn = vi.fn();
    const off = bus.on('e', fn);
    bus.emit('e', 1, 2);
    expect(fn).toHaveBeenCalledWith(1, 2);
    expect(bus.has('e')).toBe(true);
    off();
    bus.emit('e');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(bus.has('e')).toBe(false);
  });

  it('once 只触发一次', () => {
    const bus = createEventBus();
    const fn = vi.fn();
    bus.once('o', fn);
    bus.emit('o');
    bus.emit('o');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('off(type) 清空该类型；clear 清空全部', () => {
    const bus = createEventBus();
    bus.on('a', vi.fn());
    bus.on('b', vi.fn());
    bus.off('a');
    expect(bus.has('a')).toBe(false);
    expect(bus.has('b')).toBe(true);
    bus.clear();
    expect(bus.has('b')).toBe(false);
  });
});
