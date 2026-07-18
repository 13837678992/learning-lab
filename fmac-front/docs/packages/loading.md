# @fmac/loading

全局加载态：`show` / `hide` / `withLoading`（引用计数 + 适配器）。包内 [README](../../packages/loading/README.md)。

```js
import { loading } from '@fmac/core';
loading.show();
loading.hide();
const data = await loading.withLoading(() => request.get('/api/list'));
```

## 说明

- **引用计数**：多次 `show` 需对应多次 `hide` 才真正隐藏，天然支持并发。
- UI 呈现由 `@fmac/ui-adapter` 提供、`core` 注入（默认零依赖 DOM 实现）。
