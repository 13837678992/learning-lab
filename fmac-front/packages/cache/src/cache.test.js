import { describe, it, expect, vi, afterEach } from 'vitest';
import { createCache } from './cache.js';
import { createMemoryStorage } from './memory-storage.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('createCache', () => {
  it('set/get 命中；未命中返回 fallback', () => {
    const c = createCache();
    c.set('k', { a: 1 });
    expect(c.get('k')).toEqual({ a: 1 });
    expect(c.get('missing', 'def')).toBe('def');
  });

  it('TTL 到期后失效', () => {
    vi.useFakeTimers();
    const c = createCache();
    c.set('k', 1, { ttl: 1000 });
    expect(c.get('k')).toBe(1);
    vi.advanceTimersByTime(1500);
    expect(c.get('k', 'gone')).toBe('gone');
  });

  it('has 区分「值为 null」与「未命中」', () => {
    const c = createCache();
    c.set('n', null);
    expect(c.has('n')).toBe(true);
    expect(c.has('x')).toBe(false);
  });

  it('remove 删除单键', () => {
    const c = createCache();
    c.set('k', 1);
    c.remove('k');
    expect(c.has('k')).toBe(false);
  });

  it('clear 仅清理本命名空间，不误伤共享 storage 其它数据', () => {
    const storage = createMemoryStorage();
    const c1 = createCache({ storage, namespace: 'a' });
    const c2 = createCache({ storage, namespace: 'b' });
    c1.set('k', 1);
    c2.set('k', 2);
    c1.clear();
    expect(c1.has('k')).toBe(false);
    expect(c2.get('k')).toBe(2);
  });

  it('损坏记录被丢弃并返回 fallback', () => {
    const storage = createMemoryStorage();
    const c = createCache({ storage, namespace: 'x' });
    c.set('k', 1);
    const fullKey = storage.keys().find((k) => k.includes('k'));
    storage.setItem(fullKey, '{bad-json');
    expect(c.get('k', 'fb')).toBe('fb');
  });
});
