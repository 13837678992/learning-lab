# @fmac/store

跨应用共享状态：`get` / `set` / `remove` / `subscribe` / `unsubscribe`。包内 [README](../../packages/store/README.md)。

```js
import { store } from '@fmac/core';
store.set('user', { id: 1 });
const off = store.subscribe('user', (val, old) => render(val));
store.subscribe((change) => log(change)); // 订阅全部变更
store.get('user');
off();
```

## 约束

- 跨应用共享状态**统一走本包**，禁止 `window` / `sessionStorage` / `localStorage` 通信（第九、十四节）。
- qiankun 下由主应用经 `props.platform` 注入同一实例，实现跨应用一致。
