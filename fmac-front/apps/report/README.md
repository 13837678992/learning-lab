# @fmac/app-report

FMAC 子应用 · **报表中心**（Vue 2.7 + vue-router 3 + Vite，qiankun 微应用）。

> 依赖：`@fmac/core` + `vue` + `vue-router`。业务只经 `@fmac/core` 接入平台（唯一 import `@fmac/core` 的文件是 `src/platform.js`）。

## 生命周期（qiankun 标准契约）

`src/main.js` 导出 `bootstrap` / `mount` / `unmount`，支持 standalone 独立运行；`unmount` 销毁实例并清理 DOM（§16）。

## 平台接入（重点：跨应用消费）

| 能力    | 用法                                                  | 说明                                                           |
| ------- | ----------------------------------------------------- | -------------------------------------------------------------- |
| event   | `getEvent().on('user:selected' / 'order:opened', fn)` | **跨应用订阅** user/order 子应用广播；`beforeDestroy` 取消订阅 |
| store   | `getStore().get('current:user')`                      | 读取共享状态                                                   |
| request | `request.get('/summary')`                             | baseURL `/api/report`；无后端回退模拟数据                      |
| router  | `router.push('/detail/summary')`                      | 总览 ↔ 详情                                                    |

## 运行

```bash
corepack pnpm --filter @fmac/app-report dev   # http://localhost:7103（standalone）
```

由主应用在 `/micro/report` 激活加载。在“用户/订单”子应用中操作后，切到本子应用可见实时动态。
