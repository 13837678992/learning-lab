# @fmac/core

平台内核（组合根）：聚合各能力 package、托管 qiankun 生命周期，并统一 **Hook / 异常 / 插件** 机制。

> 依赖：全部中间层能力 package + `shared` + `plugin` + `qiankun`。
> **整个平台仅本包允许引用 `qiankun`**（见 `CLAUDE.md` 第八节）。业务（apps）只依赖 `@fmac/core`。

## 职责

1. **组合根**：`setup()` 完成跨能力接线（注入 `@fmac/ui-adapter` 到 `loading`/`message`，配置 `request`/`router`），并把统一 Hook 接入 `request`/`router`、安装插件。
2. **qiankun 托管**：注册/启动子应用；**强制 `strictStyleIsolation`**（第十七节）；微应用异常经统一 `errorHandler` 收敛。
3. **统一 Hook / 异常 / 插件**：见下。

## API

| 分类   | 导出                                                                        | 说明                                               |
| ------ | --------------------------------------------------------------------------- | -------------------------------------------------- |
| 装配   | `platform.setup(options)`                                                   | 注入适配器 + 配置 + 接线，返回能力集合             |
| 能力   | `router / store / request / event / loading / message / cache / auth / tab` | 各能力单例（可具名 import）                        |
| 微应用 | `registerApps / start / setDefaultApp / initState / onError`                | qiankun                                            |
| Hook   | `platform.hooks`                                                            | `register(name, fn)` / `callHook(name, ...)`；见下 |
| 异常   | `platform.errorHandler` / `platform.handleError(type, err, meta)`           | 统一入口                                           |
| 插件   | `platform.use(plugin)` / `platform.plugins`                                 | 注册并安装                                         |

### 生命周期 Hook

`platform.hooks` 暴露以下钩子（框架无关，`@fmac/shared` 的 `createHooks` 实现）：

`beforeBootstrap` · `afterBootstrap` · `beforeMount` · `afterMount` · `beforeUnmount` · `afterUnmount` · `beforeRoute` · `afterRoute` · `beforeRequest` · `afterRequest`

core 自动接线：`before/afterMount`、`before/afterUnmount` 并入 qiankun 生命周期；`beforeBootstrap`/`afterBootstrap` 环绕 `start()`；`beforeRequest`/`afterRequest` 经 request 拦截器；`afterRoute` 经 `router.onChange`。`beforeRoute` 可在路由守卫中 `hooks.callHook('beforeRoute', ...)` 触发。

```js
platform.hooks.register('afterRoute', ({ location }) => track(location));
platform.hooks.register('beforeRequest', (config) => (config.headers.trace = uuid()));
```

### 统一异常

`platform.errorHandler` 收敛 `micro` / `route` / `request` / `auth` / `lifecycle` 异常，默认经统一 logger 输出，可注册上报：

```js
platform.errorHandler.register((payload) => monitor.report(payload));
platform.errorHandler.request(err, { url }); // 业务侧上报请求异常
```

### 插件

```js
platform.use({ name: 'i18n', install(ctx) { ctx.hooks.register('beforeMount', ...) } });
```

```js
import platform from '@fmac/core';
platform.setup({ debug: true, request: { baseURL: '/gateway' } });
platform.registerApps([...]); platform.start();
```
