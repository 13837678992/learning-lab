# @fmac/ui-adapter

UI 框架适配层：把具体 UI 呈现适配为平台统一契约。**唯一**允许依赖具体 UI 框架的 package。包内 [README](../../packages/ui-adapter/README.md)。

```js
import { createDomAdapters } from '@fmac/ui-adapter';
const { loading, message } = createDomAdapters(); // 零依赖 DOM 实现
// 由 core.setup() 注入到 @fmac/loading / @fmac/message
```

## 说明

- `@fmac/loading` / `@fmac/message` 只定义契约与状态，真实呈现由本包适配器实现。
- Phase 5 提供零依赖 DOM 实现；接入 ElementUI / Element Plus 时新增对应适配器，业务与其它包无感。
