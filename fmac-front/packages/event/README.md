# @fmac/event

跨应用事件总线：`on` / `off` / `once` / `emit`（框架无关，基于 `@fmac/shared` 的 emitter 原语）。

> 依赖：`@fmac/shared`。临时的跨应用事件统一走本包；共享状态用 `@fmac/store`，页面跳转用 `@fmac/router`。

## API

| 方法                         | 说明                                               |
| ---------------------------- | -------------------------------------------------- |
| `event.on(type, handler)`    | 订阅，返回取消订阅函数                             |
| `event.once(type, handler)`  | 订阅一次，返回取消订阅函数                         |
| `event.off(type?, handler?)` | 取消订阅；`off(type)` 清空该类型，`off()` 清空全部 |
| `event.emit(type, ...args)`  | 触发事件（监听器错误隔离）                         |
| `event.has(type)`            | 是否存在监听器                                     |
| `event.clear()`              | 清空全部监听器                                     |

`createEventBus()` 可创建独立实例（用于隔离场景 / 测试）；默认导出为全局单例。

```js
import event from '@fmac/event';

const off = event.on('order:paid', (order) => render(order));
event.emit('order:paid', { id: 1 });
off();
```
