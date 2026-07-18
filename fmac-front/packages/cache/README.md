# @fmac/cache

统一缓存能力：`get` / `set` / `remove` / `clear`（隔离底层 storage 实现，支持 TTL）。

> 依赖：`@fmac/shared`。仅用于数据缓存，**不得**用作跨应用通信（跨应用共享状态走 `@fmac/store`）。

## 设计

通过可替换的 **storage 后端**隔离存储实现：默认内存后端（记录统一以 JSON 字符串存储，便于切换后端）。key 自动加平台命名空间前缀，`clear()` 只清理本命名空间数据。

> 注入自定义 storage 时需实现与 `createMemoryStorage()` 相同的接口（`getItem` / `setItem` / `removeItem` / `keys`）。缺少 `keys()` 时 `clear()` 会跳过（避免误删共享 storage 的其它数据），此时请自行包一层适配。

## API

| 方法                                       | 说明                                 |
| ------------------------------------------ | ------------------------------------ |
| `cache.set(key, value, { ttl }?)`          | 写入；`ttl` 毫秒，缺省永不过期       |
| `cache.get(key, fallback?)`                | 读取；未命中 / 已过期返回 `fallback` |
| `cache.has(key)`                           | 是否存在且未过期                     |
| `cache.remove(key)`                        | 删除                                 |
| `cache.clear()`                            | 清空本命名空间缓存                   |
| `createCache({ storage, namespace, ttl })` | 创建独立实例                         |

```js
import { createCache } from '@fmac/cache';

const cache = createCache({ namespace: 'user', ttl: 5 * 60 * 1000 });
cache.set('profile', profile);
const profile = cache.get('profile');
```
