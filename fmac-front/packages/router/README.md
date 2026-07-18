# @fmac/router

统一路由能力：`push` / `replace` / `back` / `reload`（隔离底层路由实现）。

> 依赖：`@fmac/shared`。所有页面跳转统一走本包，**禁止直接 `this.$router.push()` / `history.pushState()`**（见 `CLAUDE.md` 第十节）。

## 设计

通过可替换的 **adapter** 隔离底层：默认基于 History API（框架无关），`core` 可 `setAdapter()` 注入 vue-router / react-router 实现，业务始终只调用统一方法。

## API

| 方法                                                      | 说明                                            |
| --------------------------------------------------------- | ----------------------------------------------- |
| `router.push(location)`                                   | 跳转；`location` 支持字符串或 `{ path, query }` |
| `router.replace(location)`                                | 替换当前历史记录                                |
| `router.back()` / `router.forward()` / `router.go(delta)` | 历史前进后退                                    |
| `router.reload()`                                         | 重新加载当前路由                                |
| `router.current()`                                        | 当前路径                                        |
| `router.onChange(handler)`                                | 订阅路由变更，返回取消订阅函数                  |
| `router.setAdapter(adapter)`                              | 注入底层路由适配器                              |

```js
import router from '@fmac/router';

router.push({ path: '/order', query: { id: 42 } });
const off = router.onChange(({ type, location }) => track(type, location));
```
