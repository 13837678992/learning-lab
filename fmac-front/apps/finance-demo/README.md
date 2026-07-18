# @fmac/app-finance-demo

FMAC 子应用 · **财务管理系统**（真实业务场景，Vue 2.7 + vue-router 3 + Vite，qiankun 微应用）。

> 依赖：`@fmac/core` + `vue` + `vue-router`。业务只经 `@fmac/core` 接入（唯一 import `@fmac/core` 的文件是 `src/platform.js`）。**禁止**直接调用 qiankun、直接操作主应用、`window`/`history` 跨应用通信。

## 结构

```
src/
├── main.js               入口：加载样式、standalone 渲染、导出生命周期
├── micro.js              qiankun 生命周期 bootstrap/mount/unmount（含跨应用监听/定时器清理）
├── platform.js           唯一 @fmac/core 接入点（本地 router/request/cache + 共享 store/event/tab/...）
├── router/index.js       vue-router（base=/finance）
├── api/index.js          模拟接口（经 request SDK，无后端回退 mock）
├── assets/finance.css    独立样式（模拟另一套 UI 库，验证样式隔离）
└── views/
    ├── Home.vue          首页（store 读取/修改，权限、配置）
    ├── account/AccountList.vue     账户管理（request+loading、权限、跨应用跳转）
    ├── transaction/TransactionList.vue  交易流水（搜索 + cache 状态保留、emit finance:update、tab 刷新）
    └── report/ReportCenter.vue     报表中心（request+loading、异常处理、store 配置）
```

## 平台能力接入（全部经 @fmac/core SDK）

| 能力            | 用法                                                                | 场景                              |
| --------------- | ------------------------------------------------------------------- | --------------------------------- |
| router          | `router.push('/account')` / `getSharedRouter().push('/micro/user')` | 应用内导航 / 跨应用跳转           |
| store           | `getStore().get/set/subscribe`                                      | 用户/权限读取、业务配置、主子同步 |
| event           | `getEvent().emit('finance:update')` / `on('global:refresh')`        | 双向事件                          |
| request         | `request.get(...)`（token 拦截 + 异常 + loading）                   | 模拟接口                          |
| tab             | `getTab().add / subscribe`                                          | 打开/切换/关闭/刷新标签           |
| cache           | `cache.get/set('finance:tx:search')`                                | 交易流水搜索条件保留              |
| loading/message | `getLoading().withLoading` / `getMessage()`                         | 复用主应用 UI 适配器              |

## 生命周期与清理（§12）

`mount` 创建 Vue 实例、登记 `global:refresh` 监听与心跳定时器；`unmount` 依次 `off()` 事件、`clearInterval` 定时器、`$destroy` 实例、置空 router —— 无内存泄漏。

## 运行

```bash
corepack pnpm --filter @fmac/app-finance-demo dev   # http://localhost:7104（standalone）
```

由主应用在 `/finance` 激活加载；子路由 `/finance/account`、`/finance/transaction`、`/finance/report`。接入说明见 [`docs/development/finance-demo-guide.md`](../../docs/development/finance-demo-guide.md)。
