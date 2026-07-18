# @fmac/router

统一路由：`push` / `replace` / `back` / `reload`（适配器隔离底层）。包内 [README](../../packages/router/README.md)。

```js
import { router } from '@fmac/core';
router.push('/home');
router.push({ path: '/detail', query: { id: 1 } });
router.back();
const off = router.onChange(({ type, location }) => track(type, location));
router.setAdapter(vueRouterAdapter); // 注入 vue-router / react-router
```

## 约束

- 业务禁止 `this.$router.push()` / `history.pushState()`（`CLAUDE.md` 第十节）。
- 默认 History API 适配器；框架路由由 `core`/app 注入适配器。
