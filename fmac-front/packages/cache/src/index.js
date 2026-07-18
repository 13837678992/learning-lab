/**
 * @fmac/cache
 * 统一缓存能力：get / set / remove / clear（隔离底层 storage 实现，支持 TTL）。
 *
 * 仅用于数据缓存，不得用作跨应用通信（跨应用共享状态走 @fmac/store）。
 *
 * 用法：
 *   import cache from '@fmac/cache';
 *   cache.set('profile', data, { ttl: 60000 });
 *   cache.get('profile');
 *   cache.remove('profile');
 */
import { createCache } from './cache.js';
import { createMemoryStorage } from './memory-storage.js';

export { createCache, createMemoryStorage };

/** 平台默认缓存实例（单例，默认内存后端）。 */
const cache = createCache();
export default cache;
