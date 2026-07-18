# @fmac/plugin

插件扩展机制：`register` / `install` / `get`（**只提供机制，不实现具体插件**）。包内 [README](../../packages/plugin/README.md)。

```js
import platform from '@fmac/core';

platform.use({
  name: 'tracker',
  install(ctx) {
    // ctx = { ...平台能力, hooks, errorHandler }
    ctx.hooks.register('afterRoute', (e) => ctx /* track */);
    ctx.errorHandler.register((payload) => report(payload));
  },
});
```

## 用途（预留）

日志 / 埋点 / 监控 / 国际化 / 主题。由 `core` 在 `setup()` 时安装；`install(context)` 的 context 暴露平台能力、`hooks`、`errorHandler`。
