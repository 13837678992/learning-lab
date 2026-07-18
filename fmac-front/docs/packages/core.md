# @fmac/core

平台内核（组合根）：聚合能力 + 托管 qiankun + 统一 Hook / 异常 / 插件。业务只依赖本包。

- 完整说明见包内 [`packages/core/README.md`](../../packages/core/README.md)。
- qiankun 模型见 [../architecture/micro-frontend.md](../architecture/micro-frontend.md)。

## 关键 API

```js
import platform, { router, store, request, event, hooks, errorHandler } from '@fmac/core';

platform.use(plugin); // 注册插件
platform.hooks.register('afterRoute', fn); // 生命周期 Hook
platform.errorHandler.register(report); // 统一异常上报
platform.setup({ debug, request: { baseURL }, router: { adapter } });
platform.registerApps(apps, lifecycles);
platform.start(); // 强制 strictStyleIsolation
```

## 约束

- **唯一**可引用 `qiankun`。
- 业务（apps）只依赖 `@fmac/core`，不直接依赖下层能力包。
