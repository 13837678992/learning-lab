# @fmac/app-user

FMAC 子应用 · **用户管理**（Vue 2.7 + vue-router 3 + Vite，qiankun 微应用）。

> 依赖：`@fmac/core` + `vue` + `vue-router`。业务只经 `@fmac/core` 接入平台（本子应用中唯一 import `@fmac/core` 的文件是 `src/platform.js`）。

## 生命周期（qiankun 标准契约）

`src/main.js` 导出 `bootstrap` / `mount` / `unmount`，并支持 standalone 独立运行（`__POWERED_BY_QIANKUN__` 判定）。`unmount` 销毁 Vue 实例并清理 DOM（§16）。

## 平台接入

| 能力    | 用法                                  | 说明                                    |
| ------- | ------------------------------------- | --------------------------------------- |
| router  | `router.push('/detail/1')`            | 子应用 vue-router 适配进 `@fmac/router` |
| request | `request.get('/list')`                | baseURL `/api/user`；无后端回退模拟数据 |
| store   | `getStore().set('current:user', u)`   | qiankun 下为主应用注入的**共享**实例    |
| event   | `getEvent().emit('user:selected', u)` | 跨应用广播（report 子应用消费）         |

## 运行

```bash
corepack pnpm --filter @fmac/app-user dev   # http://localhost:7101（standalone）
```

由主应用在 `/micro/user` 激活加载。
