# @fmac/app-order

FMAC 子应用 · **订单管理**（Vue 2.7 + vue-router 3 + Vite，qiankun 微应用）。

> 依赖：`@fmac/core` + `vue` + `vue-router`。业务只经 `@fmac/core` 接入平台（唯一 import `@fmac/core` 的文件是 `src/platform.js`）。

## 生命周期（qiankun 标准契约）

`src/main.js` 导出 `bootstrap` / `mount` / `unmount`，支持 standalone 独立运行；`unmount` 销毁实例并清理 DOM（§16）。

## 平台接入

| 能力    | 用法                                 | 说明                                                   |
| ------- | ------------------------------------ | ------------------------------------------------------ |
| router  | `router.push('/detail/1001')`        | 子应用 vue-router 适配进 `@fmac/router`（列表 ↔ 详情） |
| request | `request.get('/list')`               | baseURL `/api/order`；无后端回退模拟数据               |
| store   | `getStore().set('current:order', o)` | qiankun 下为主应用注入的**共享**实例                   |
| event   | `getEvent().emit('order:opened', o)` | 跨应用广播（report 子应用消费）                        |

## 运行

```bash
corepack pnpm --filter @fmac/app-order dev   # http://localhost:7102（standalone）
```

由主应用在 `/micro/order` 激活加载。
