# FMAC Front 架构定稿（Architecture Final）

> 架构优化后的**定稿快照**。硬性约束以根目录 [`CLAUDE.md`](../../CLAUDE.md) 为准；与其冲突时以 `CLAUDE.md` 为准。
> 最近更新：2026-07-22（Phase 10：webpack4 定型 + 主应用平台能力）。演进记录见 [optimization-log.md](./optimization-log.md)。

## 1. 目标与原则

长期维护、可扩展、可升级的企业级微前端平台。当前：主应用 Vue2 + qiankun + pnpm workspace + JavaScript（不使用 TypeScript）。未来：Vue3 / React / Vite / Element Plus / Wujie / Module Federation，**升级底层时业务代码尽量无需修改**。

遵循 SOLID / KISS / DRY / 单一职责 / 依赖倒置 / 组合优于继承，**禁止过度设计**。

## 2. 顶级目录（固定四个，禁止新增）

| 目录        | 职责                                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| `apps/`     | 业务子应用（基座 `main` + 微应用 `user/order/report/finance-demo`），**仅写业务**                         |
| `packages/` | 平台公共能力，框架无关（`ui-adapter` 除外）                                                               |
| `configs/`  | 工程配置：eslint / prettier / **env / constants（配置中心）** / **arch-check（架构守卫）** / webpack 预留 |
| `docs/`     | 架构与开发文档                                                                                            |

## 3. 分层与依赖方向

```
apps                                              业务层，经 @fmac/core 用能力（+ 配置包 @fmac/constants /@fmac/env）
  ↓
core                                              组合根，唯一可引用 qiankun；统一 Hook / 异常 / 插件；对外统一出口
  ↓
router store request event loading message        中间能力层，
cache auth tab ui-adapter plugin                  彼此不互相引用，均仅依赖 shared
  ↓
shared                                            最底层通用工具 / 原语，零依赖
```

依赖方向**自上而下**，禁止反向、循环、apps 互相依赖、中间层交叉引用。**由架构守卫自动校验**（见第 8 节）。

## 4. 能力包职责（packages/ 共 13 个）

| package      | 职责                                                                                 | 依赖                          |
| ------------ | ------------------------------------------------------------------------------------ | ----------------------------- |
| `shared`     | 常量 / 类型判断 / 工具 / 日志 / 断言 / 事件原语 / Hook / 统一异常                    | 无                            |
| `router`     | 统一路由 push/replace/back/forward/go/reload + onChange/onError（适配器隔离底层）    | shared                        |
| `store`      | 跨应用共享状态 get/set/remove/subscribe/unsubscribe                                  | shared                        |
| `request`    | 统一请求 get/post/put/delete + 拦截器 + 取消（适配器隔离 fetch/axios）               | shared                        |
| `event`      | 跨应用事件总线 on/off/once/emit                                                      | shared                        |
| `loading`    | 全局加载态（引用计数 + 适配器 + withLoading）                                        | shared                        |
| `message`    | 消息提示 success/error/warning/info/confirm（适配器）                                | shared                        |
| `cache`      | 数据缓存 get/set/remove/clear（TTL + storage 适配）                                  | shared                        |
| `auth`       | 登录态与权限 token/user/permissions/roles + onChange                                 | shared                        |
| `tab`        | 多标签页 add/remove/setActive/closeOthers/refresh + subscribe                        | shared                        |
| `ui-adapter` | **框架适配层**：DOM loading/message 适配器 + vue-router 适配器（唯一可依赖具体框架） | shared                        |
| `plugin`     | 插件机制 register/install/get（预留日志/埋点/监控/国际化/主题）                      | shared                        |
| `core`       | 组合各能力 + qiankun 托管 + 统一 Hook/异常/插件 + 框架适配器出口                     | 全部中间层 + shared + qiankun |

### 配置中心与守卫（configs/，非运行时能力，apps 可依赖）

| 包                 | 职责                                                                            |
| ------------------ | ------------------------------------------------------------------------------- |
| `@fmac/constants`  | **单一事实源**：微应用名 / 激活规则 / API 前缀 / 事件名 / store key（环境无关） |
| `@fmac/env`        | 环境配置中心：按 mode 解析 API 网关与子应用 entry（环境相关）                   |
| `@fmac/arch-check` | 架构守卫脚本（零依赖），见第 8 节                                               |

## 5. 微前端模型（qiankun 由 core 统一托管）

- 全平台**仅** `@fmac/core`（`packages/core/src/qiankun.js`）引用 `qiankun`。
- 基座经 `platform.registerApps(apps)` / `platform.start()` 注册启动；注册表由 `@fmac/constants` + `@fmac/env` 派生（单一事实源，杜绝 activeRule/entry 漂移）。
- 子应用导出标准 `bootstrap` / `mount(props)` / `unmount`，可 standalone 独立运行；router base / request baseURL 同样取自 `@fmac/constants`。
- **样式隔离**：`core` 启动时强制 `sandbox.strictStyleIsolation = true`（合并调用方 sandbox 后覆盖，**不可关闭**）。

### 主应用职责（Main Application Responsibilities）

主应用（`apps/main`，webpack 4 基座）是平台的**编排与治理中心**，子应用只发信号、不越权。职责：

| 职责           | 实现                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------ |
| qiankun 编排   | 经 `@fmac/core` 注册/启动子应用、注入共享平台（`apps/main/src/micro/`）                    |
| 登录 / 权限    | `/login` 页 + `@fmac/auth` 登录态；模拟登录后加载菜单（`apps/main/src/views/Login.vue`）   |
| 菜单           | `@fmac/auth` 的 `parseMenu` 递归解析 → 主应用菜单 / 子应用路由 / tab（`platform/menu.js`） |
| tab            | `@fmac/tab` + 侧边栏 `MenuTree` 点击叶子生成 tab                                           |
| session / 导航 | 统一处理子应用事件 `AUTH_EXPIRED` / `GO_LOGIN` / `GO_HOME`（`platform/session.js`）        |
| UI 消息        | 注入 Element UI 消息适配器到平台 `message`（子应用经共享实例复用，禁止自行弹窗）           |

**鉴权 / 导航事件协议**（子应用 `event.emit`，主应用 `event.on`，见 `@fmac/constants` 的 `EVENTS`）：

| 事件           | 语义               | 主应用处理                                                                                            |
| -------------- | ------------------ | ----------------------------------------------------------------------------------------------------- |
| `AUTH_EXPIRED` | 登录失效/超时      | Element MessageBox 确认 → `auth.logout`+`tab.clear`+`cache.clear`+清菜单 → 跳 `/login`（存 redirect） |
| `GO_LOGIN`     | 跳登录（redirect） | 存 redirect → `router.push('/login')`，登录后回跳                                                     |
| `GO_HOME`      | 跳首页             | `router.push('/')`                                                                                    |

## 6. 跨应用通信规范

| 场景     | 能力            | 禁止                                   |
| -------- | --------------- | -------------------------------------- |
| 共享状态 | `@fmac/store`   | window / sessionStorage / localStorage |
| 临时事件 | `@fmac/event`   | 同上                                   |
| 页面跳转 | `@fmac/router`  | `this.$router` / `history.pushState`   |
| 请求     | `@fmac/request` | `axios()` / `fetch()`                  |
| 消息     | `@fmac/message` | `this.$message`                        |

基座注册子应用时经 qiankun `props` 注入平台实例，使 `store` / `event` / `tab` / `auth` 跨应用共享**同一实例**；子应用 `bindSharedPlatform(props.platform)` 采用注入实例，standalone 下回退本地实例。

## 7. 统一扩展入口：Hook + 异常

平台以 **Hook 总线**与**统一异常处理器**作为唯一扩展入口（插件、业务均经此接入）：

- **Hook**：`beforeBootstrap`/`afterBootstrap`/`before|afterMount`/`before|afterUnmount`/`afterRoute`/`before|afterRequest`，框架无关，顺序（可 await）执行、单个抛错不阻断后续。
- **统一异常收敛**（`platform.errorHandler`，全部类型均有真实产出方）：

  | 类型        | 产出方                                              |
  | ----------- | --------------------------------------------------- |
  | `micro`     | qiankun 全局错误 → `errorHandler.micro`             |
  | `route`     | `router.onError` → `errorHandler.route`（Phase 8）  |
  | `request`   | request 错误拦截器 → `errorHandler.request`         |
  | `lifecycle` | Hook 执行异常 → `errorHandler.lifecycle`（Phase 8） |
  | `auth`      | 业务鉴权失败可主动上报 `errorHandler.auth`          |

  未注册自定义处理器时，默认经统一 logger 兜底输出；可 `errorHandler.register(fn)` 接监控上报。

- **插件**：日志 / 埋点 / 监控 / 国际化 / 主题等横切能力经 `platform.use(plugin)` 接入，契约与约束见 [plugin-spec.md](./plugin-spec.md)。

## 8. 工程化：守卫 / 测试 / CI / 构建 / 部署

**架构守卫**（`configs/arch-check`，零依赖 Node 脚本，`pnpm check:arch`）自动校验 6 项，取代人工 grep：

| #   | 检查         | 约束（CLAUDE.md） |
| --- | ------------ | ----------------- |
| 1   | 顶级目录     | 第三节            |
| 2   | qiankun 边界 | 第八节            |
| 3   | 依赖方向     | 第六节            |
| 4   | 框架隔离     | 第七节            |
| 5   | apps 边界    | 第六节            |
| 6   | 循环依赖     | 第六节            |

**测试与集成**（`vitest` + `happy-dom`，`pnpm test` / `pnpm test:coverage`）：

- 单元：`shared`（emitter/hooks/error-handler）/ `store` / `request` / `cache` / `loading` / `router` / `message` / `event` / `tab` / `auth` / `plugin`；
- 集成：`core.setup` 装配接线、qiankun 生命周期托管（mock qiankun 验证 Hook 合并 / `strictStyleIsolation` / 异常桥接）；
- 共 **15 文件 76 用例**，覆盖率约 Statements 71% / Lines 74%。

**CI 与提交门禁**：仓库根 `.github/workflows/fmac-front-ci.yml`（按 `fmac-front/**` 过滤）跑 `install→check:arch→lint→format:check→test→build`；`lint-staged` + `pnpm precommit` 提交门禁。本地全量门禁 `pnpm check` = `check:arch` + `lint` + `test`。当前状态：全部通过。

**构建与部署**：

- 子应用经 `vite-plugin-qiankun` **独立打包**（qiankun 挂载 + standalone 双用），主应用为 SPA 基座；
- 多环境经 `vite --mode`（`pnpm build` / `pnpm build:test`，驱动 `@fmac/env`）+ 部署期 `VITE_BASE`；
- 主应用与各子应用**独立源独立部署**，Nginx 参考 [`configs/nginx`](../../configs/nginx/README.md)（子应用须放行 qiankun 跨域 CORS）；发布流程见 [deployment.md](../development/deployment.md)、[ci-and-gates.md](../development/ci-and-gates.md)。

## 9. 框架隔离与 Vue3 迁移策略

除 `ui-adapter` 外所有 package 保持框架无关（守卫强制）。底层技术替换收敛在 **`core` + `ui-adapter`** 两处：

- **Vue3 迁移**：在 `ui-adapter` 新增 `createVue3RouterAdapter`、切换 apps 的 Vue 实例创建方式；中间能力层与业务调用 API 稳定不变。
- **Element Plus / React**：在 `ui-adapter` 新增对应适配器即可，其它 package 与业务无感。

> 本阶段不预置任何未使用的 Vue3/React/Wujie 适配代码（KISS）。迁移细节见 [../migration/vue2-to-vue3.md](../migration/vue2-to-vue3.md)。

## 10. 已知剩余风险

见 [optimization-log.md](./optimization-log.md) 第 Phase 9 节。要点：

1. qiankun **跨域运行期**未做端到端验证（构建通过、子应用 bundle 已暴露 qiankun 生命周期；真实跨域挂载待 Playwright e2e）。
2. 覆盖率分支 ~54%：`fetch-adapter` / `history-adapter` / DOM 适配器等浏览器 IO 边界偏低。
3. 侧边栏 / 跨应用跳转 activeRule 字面量与 `@fmac/constants` 软耦合（展示层调用点）。
4. 架构守卫为静态 import / 依赖扫描，不覆盖运行期动态 import 拼接。
5. `CLAUDE.md` 第五节能力包清单仍未列入 `plugin`（属合规扩展，建议对齐）。
