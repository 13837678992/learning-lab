# @fmac/store

跨应用共享状态：`get` / `set` / `remove` / `subscribe` / `unsubscribe`。

> 依赖：`@fmac/shared`。跨应用共享状态统一走本包，**禁止用 `window` / `sessionStorage` / `localStorage` 通信**（见 `CLAUDE.md` 第九、十四节）。

## API

| 方法                                                    | 说明                                                       |
| ------------------------------------------------------- | ---------------------------------------------------------- |
| `store.set(key, value)`                                 | 写入；值变化时通知订阅者                                   |
| `store.get(key?)`                                       | 读取；`get()` 返回全量快照                                 |
| `store.remove(key)`                                     | 删除                                                       |
| `store.subscribe(key, handler)`                         | 订阅指定 key，`handler(value, oldValue)`；返回取消订阅函数 |
| `store.subscribe(handler)`                              | 订阅全部变更，`handler({ key, value, oldValue })`          |
| `store.unsubscribe(key, handler)`                       | 取消订阅                                                   |
| `store.has(key)` / `store.snapshot()` / `store.reset()` | 辅助方法                                                   |

```js
import store from '@fmac/store';

const off = store.subscribe('theme', (theme) => applyTheme(theme));
store.set('theme', 'dark');
off();
```
