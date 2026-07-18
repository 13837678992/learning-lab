# @fmac/request

统一请求：`get` / `post`（适配器隔离 fetch / axios）。包内 [README](../../packages/request/README.md)。

```js
import { request } from '@fmac/core';
request.setBaseURL('/gateway');
request.useResponseInterceptor((res) => res); // 统一解包 / 错误
const users = await request.get('/users', { params: { page: 1 } });
await request.post('/users', { name: 'a' });
```

## 约束

- 业务禁止直接 `axios()` / `fetch()`（第十一节）。
- 默认 fetch 适配器；未来 `setAdapter()` 可换 axios，业务无感。
- 请求前后经 `beforeRequest` / `afterRequest` Hook（由 `core` 接线）。
