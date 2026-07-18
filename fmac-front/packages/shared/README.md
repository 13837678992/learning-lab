# @fmac/shared

跨层通用工具与常量（框架无关基础层）。平台分层最底层，**不依赖任何其它 package**，可被所有上层复用。

## API

| 分类          | 导出                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| 常量          | `NAMESPACE`、`KEY_PREFIX`                                                                                     |
| 类型判断      | `isUndefined` / `isNil` / `isFunction` / `isString` / `isNumber` / `isObject` / `isPlainObject` / `isPromise` |
| 工具          | `noop` / `identity` / `toArray`                                                                               |
| 日志          | `createLogger(scope)` / `setDebug(enabled)` / `isDebug()`                                                     |
| 断言          | `assert(condition, message)`                                                                                  |
| 事件原语      | `createEmitter()`                                                                                             |
| 生命周期 Hook | `createHooks()`                                                                                               |
| 统一异常      | `createErrorHandler()` / `ErrorTypes`                                                                         |

## createEmitter

平台复用基石。`@fmac/event`、`@fmac/store`、`@fmac/auth`、`@fmac/tab`、`@fmac/router` 均基于它构建订阅能力。`on` 返回取消订阅函数；`once` 支持用原始 handler 反注册；`emit` 对监听器做错误隔离。

## createHooks

生命周期钩子的底层机制（框架无关）。`@fmac/core` 据此暴露 `beforeMount` / `afterMount` / `beforeRoute` / `afterRoute` / `beforeRequest` / `afterRequest` 等平台钩子。

```js
import { createHooks } from '@fmac/shared';
const hooks = createHooks();
const off = hooks.register('afterRoute', (e) => track(e));
await hooks.callHook('afterRoute', { path: '/home' });
off();
```

## createErrorHandler

统一异常入口，收敛 `micro` / `route` / `request` / `auth` / `lifecycle` 各类异常，默认经统一 logger 输出（避免业务散落 `console.error`），可注册自定义处理器上报。

```js
import { createErrorHandler } from '@fmac/shared';
const eh = createErrorHandler();
eh.register((payload) => report(payload));
eh.request(new Error('timeout'), { url: '/api' });
```
