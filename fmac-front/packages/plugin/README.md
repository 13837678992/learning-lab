# @fmac/plugin

插件扩展机制：`register` / `install` / `get`（**只提供机制，不实现具体插件**）。

> 依赖：`@fmac/shared`。预留用于未来的日志 / 埋点 / 监控 / 国际化 / 主题等能力。

## 插件形态

```js
const themePlugin = {
  name: 'theme',
  install(context) {
    // context = { ...平台能力, hooks, errorHandler }
    context.hooks.register('afterMount', () => applyTheme());
  },
};
```

## API

| 方法                                                      | 说明                       |
| --------------------------------------------------------- | -------------------------- |
| `plugin.register(plugin)`                                 | 注册插件（不立即安装）     |
| `plugin.install(context)`                                 | 安装尚未安装的插件（幂等） |
| `plugin.get(name)` / `plugin.has(name)` / `plugin.list()` | 查询                       |

由 `@fmac/core` 统一安装：`platform.use(plugin)` 注册并（若已装配）安装；`context` 暴露平台能力、`hooks`、`errorHandler`。

```js
import platform from '@fmac/core';
platform.use(themePlugin);
```
