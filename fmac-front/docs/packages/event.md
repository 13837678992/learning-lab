# @fmac/event

跨应用事件总线：`on` / `off` / `once` / `emit`。包内 [README](../../packages/event/README.md)。

```js
import { event } from '@fmac/core';
const off = event.on('order:paid', (order) => render(order));
event.emit('order:paid', { id: 1 });
off();
```

## 约束

- 临时跨应用事件**统一走本包**；共享状态用 `@fmac/store`，跳转用 `@fmac/router`。
- 监听器错误隔离；qiankun 下由主应用注入同一实例，实现跨应用广播。
