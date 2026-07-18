# @fmac/tab

多标签页管理：`add` / `remove` / `setActive` / `closeOthers` / `clear` / `refresh` / `subscribe`。包内 [README](../../packages/tab/README.md)。

```js
import { tab } from '@fmac/core';
const off = tab.subscribe(({ tabs, activeKey }) => renderTabBar(tabs, activeKey));
tab.add({ key: '/order', title: '订单', path: '/order' });
tab.setActive('/order');
tab.closeOthers('/order');
off();
```

标签记录：`{ key, title, path, closable, meta }`（至少提供 `key` 或 `path`）。
