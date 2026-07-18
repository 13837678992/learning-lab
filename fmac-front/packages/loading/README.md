# @fmac/loading

统一全局 Loading：`show` / `hide` / `withLoading`。

> 依赖：`@fmac/shared`。全局加载态统一走本包。UI 呈现经适配器隔离（默认 no-op），真实 DOM / 组件实现由 `@fmac/ui-adapter` 提供、`@fmac/core` 注入。

## API

| 方法                                 | 说明                                          |
| ------------------------------------ | --------------------------------------------- |
| `loading.show(config?)`              | 显示（引用计数 +1），返回一次性 `hide` 函数   |
| `loading.hide(force?)`               | 隐藏（引用计数 -1）；`force=true` 直接清零    |
| `loading.withLoading(task, config?)` | 包裹 Promise / 函数，自动前置 show、收尾 hide |
| `loading.isActive()`                 | 当前是否显示中                                |
| `loading.setAdapter(adapter)`        | 注入 UI 适配器 `{ show, hide }`               |

> 采用**引用计数**：多次 `show` 需对应多次 `hide` 才真正隐藏，天然支持并发请求场景。

```js
import loading from '@fmac/loading';

const data = await loading.withLoading(() => request.get('/api/list'));
```
