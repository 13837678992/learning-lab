# @fmac/cache

数据缓存：`get` / `set` / `remove` / `clear` / `has`（TTL + storage 适配）。包内 [README](../../packages/cache/README.md)。

```js
import { cache } from '@fmac/core';
cache.set('profile', data, { ttl: 60000 }); // 60s 过期
cache.get('profile', fallback);
cache.has('profile');
cache.clear(); // 仅清理本命名空间
```

## 约束

- **仅用于数据缓存**，不得用作跨应用通信（跨应用共享用 `@fmac/store`）。
- 默认内存后端；注入自定义 storage 需实现 `getItem/setItem/removeItem/keys`。
