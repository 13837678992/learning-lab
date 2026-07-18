# @fmac/ui-adapter

UI 框架适配层：把具体 UI 呈现（DOM / ElementUI / Element Plus 等）适配为平台统一契约。

> 依赖：`@fmac/shared`。**唯一**允许依赖具体 UI 框架的 package（见 `CLAUDE.md` 第七节）；其它 package 必须保持框架无关。

## 设计

`@fmac/loading` / `@fmac/message` 只定义契约与状态，真实呈现由本包提供的适配器实现，并在 `@fmac/core` 装配时注入。Phase 2 提供**零依赖 DOM 实现**；未来接入 ElementUI / Element Plus 时，新增对应适配器即可，业务与其它 package 无感。

## API

| 导出                               | 说明                                            |
| ---------------------------------- | ----------------------------------------------- |
| `createDomLoadingAdapter(target?)` | DOM 版 Loading 适配器 `{ show, hide }`          |
| `createDomMessageAdapter()`        | DOM 版消息适配器 `{ show, confirm }`            |
| `createDomAdapters()`              | 返回 `{ loading, message }`，供 core 一次性注入 |

```js
import { createDomAdapters } from '@fmac/ui-adapter';
import loading from '@fmac/loading';
import message from '@fmac/message';

const { loading: l, message: m } = createDomAdapters();
loading.setAdapter(l);
message.setAdapter(m);
// 实际由 @fmac/core 的 setup() 统一完成注入
```
