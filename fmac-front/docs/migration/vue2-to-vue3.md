# Vue2 → Vue3 迁移指引

平台设计目标之一：**升级底层技术时业务代码尽量无需修改**。迁移应收敛在 `core` 与 `ui-adapter`，中间能力层对外 API 保持稳定。

## 为什么改动小

- 业务只依赖 `@fmac/core`，通过统一 API（`router`/`store`/`request`/`event`/`message`/`loading`）访问能力，**不直接**依赖 Vue / vue-router / ElementUI。
- 底层框架细节被**适配器**隔离（router 适配器、UI 适配器）。

## 迁移步骤（增量、可并存）

1. **能力层不动**：`packages/*`（除 `ui-adapter`）框架无关，无需改。
2. **ui-adapter**：新增 Element Plus / Vue3 版 UI 适配器，实现 `message`/`loading` 契约；`core.setup({ adapters })` 注入即可切换。
3. **router 适配器**：主/子应用把 `vue-router@4` 实例适配为 `@fmac/router` 适配器（`push/replace/back/...`），业务调用不变。
4. **逐个子应用迁移**：qiankun 支持异构子应用，可让部分子应用先升级到 Vue3 + Vite，主应用与其余子应用维持 Vue2，**并存过渡**。
5. **主应用最后迁移**：外壳（Layout）改用 Vue3；`main.js` 由 `new Vue()` 改为 `createApp()`。

## 注意点

| 项       | Vue2                     | Vue3                                                      |
| -------- | ------------------------ | --------------------------------------------------------- |
| 入口     | `new Vue({ render })`    | `createApp(App)`                                          |
| 路由     | vue-router@3（`base`）   | vue-router@4（`createRouter` + `createWebHistory(base)`） |
| 卸载     | `instance.$destroy()`    | `app.unmount()`                                           |
| 全局 API | `Vue.use` / `Vue.config` | `app.use` / `app.config`                                  |

生命周期契约（`bootstrap`/`mount`/`unmount`）与平台 Hook、跨应用通信（store/event/router）在迁移前后保持不变。

## 未来其它底层

同样思路适用于引入 React 子应用（新增 router/UI 适配 + qiankun 异构接入）、Vite（已用）、Wujie / Module Federation（`core` 层替换微前端内核，业务无感）。
