/**
 * @fmac/cache —— 统一缓存能力（隔离底层 storage，支持 TTL）。
 *
 * 仅用于数据缓存；跨应用通信请用 @fmac/store / @fmac/event（见 CLAUDE.md 第九节）。
 * 记录统一以 JSON 字符串存储，从而兼容内存 / localStorage 等多种后端。
 */
import { createLogger, isFunction, isNil, KEY_PREFIX } from '@fmac/shared';
import { createMemoryStorage } from './memory-storage.js';

const logger = createLogger('cache');
/** 缓存未命中哨兵（区别于「值本身是 null / undefined」）。 */
const MISS = Symbol('cache-miss');

export function createCache(options = {}) {
  const storage = options.storage || createMemoryStorage();
  const namespace = options.namespace ? `${options.namespace}:` : '';
  const prefix = `${KEY_PREFIX}cache:${namespace}`;
  const defaultTtl = options.ttl || 0; // 毫秒，0 表示永不过期

  function fullKey(key) {
    return `${prefix}${key}`;
  }

  /** 写入；config.ttl 覆盖默认过期时间（毫秒）。 */
  function set(key, value, config = {}) {
    const ttl = isNil(config.ttl) ? defaultTtl : config.ttl;
    const record = { v: value, e: ttl > 0 ? Date.now() + ttl : 0 };
    storage.setItem(fullKey(key), JSON.stringify(record));
  }

  /** 读取；未命中或已过期返回 fallback。 */
  function get(key, fallback) {
    const raw = storage.getItem(fullKey(key));
    if (isNil(raw)) return fallback;
    let record;
    try {
      record = JSON.parse(raw);
    } catch (err) {
      logger.warn('缓存记录损坏，已丢弃', key, err);
      storage.removeItem(fullKey(key));
      return fallback;
    }
    if (record.e && record.e < Date.now()) {
      storage.removeItem(fullKey(key));
      return fallback;
    }
    return record.v;
  }

  function has(key) {
    return get(key, MISS) !== MISS;
  }

  function remove(key) {
    storage.removeItem(fullKey(key));
  }

  /** 仅清理本命名空间下的 key（不误伤宿主环境其它数据）。 */
  function clear() {
    if (isFunction(storage.keys)) {
      storage
        .keys()
        .filter((k) => k.indexOf(prefix) === 0)
        .forEach((k) => storage.removeItem(k));
    } else {
      // 缺少 keys() 时无法按命名空间安全清理；不调用 storage.clear()，以免误删共享 storage 的其它数据。
      logger.warn('注入的 storage 未实现 keys()，clear() 无法按命名空间清理，已跳过');
    }
  }

  return { get, set, has, remove, clear };
}
