# 变更日志（CHANGELOG）

本仓库遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/) 与 [语义化版本](https://semver.org/lang/zh-CN/)。

> **版本策略**：各 `packages/*` 采用**独立版本**（相互解耦，便于未来单独发布至 npm）。
> 推荐后续引入 [`@changesets/cli`](https://github.com/changesets/changesets) 管理独立版本与发布，
> 详见 [`docs/development/deployment.md`](./docs/development/deployment.md)。当前所有包均为 `private`，尚未发布。

## [Unreleased]

### Phase 10 —— Webpack4 定型 + 主应用平台能力

- **变更** `apps/main`、`apps/finance-demo` 定型 webpack 4：`webpack.config.js`（CommonJS，移除 `type:module`）、`alias @=src`、`file-loader` 资源、babel target `node 18.19`；修复 main 配置误粘入的 `require('react')`/悬空数组。
- **新增** `.nvmrc`=`18.19.0`，`engines.node`=`>=18.19.0`。
- **新增** 鉴权/导航事件协议 `AUTH_EXPIRED`/`GO_LOGIN`/`GO_HOME`（`@fmac/constants`）：子应用 emit、主应用统一处理（`apps/main/src/platform/session.js`）；子应用禁止自行弹窗/跳转。
- **新增** 菜单解析器 `@fmac/auth`（`parseMenu`/`flattenMenu`/`menuToRoutes`/`menuToTab`，经 `@fmac/core` 暴露）+ 5 用例单测。
- **新增** 主应用平台能力：`/login` + 模拟登录 → `loadMenu`（拉取→解析→共享 store）→ 侧边栏 `MenuTree` + tab；Element UI 消息适配器注入平台 `message`。
- **新增** finance-demo 首页平台协议测试按钮（AUTH_EXPIRED/GO_LOGIN/GO_HOME）。
- **更新** `architecture-final.md`（主应用职责）、`optimization-log.md`（Phase 8）。

### 构建工具混用验证 —— main / finance-demo 迁移 webpack 4

- **变更** `apps/main`（基座）与 `apps/finance-demo`（子应用）从 Vite 迁移到 **webpack 4**，与 Vite 子应用（`user`/`order`/`report`）并存；`packages/*`（能力包）**零改动**，验证平台构建工具无关。
- finance-demo 还原为 UMD 生命周期导出（`library=app-finance-demo` → `window['app-finance-demo']`）+ `src/public-path.js`（qiankun 运行期 publicPath）；main 为 webpack SPA 基座。
- `import.meta.env` → `process.env` + webpack `DefinePlugin`；`@fmac/env` / `@fmac/constants` 两构建工具通用。
- webpack 配置用 `.cjs`（webpack 4 不支持 ESM 配置），业务源码仍 ESM（babel 转译）；`build` / `dev` 脚本内置 `--openssl-legacy-provider`（Node ≥17 兼容）。

### Phase 9 —— 集成测试 + CI/门禁 + 独立打包 + 部署

- **新增** 集成测试（`happy-dom`）：`core.setup` 装配接线与 qiankun 生命周期托管（mock qiankun 验证 Hook 合并 / strictStyleIsolation / 异常桥接），11 用例。
- **新增** 能力包测试：`message`/`event`/`tab`/`auth`/`plugin`；全库 15 文件 76 用例，`pnpm test:coverage`（v8）覆盖率约 Lines 74%。
- **新增** CI：仓库根 `.github/workflows/fmac-front-ci.yml`（按 `fmac-front/**` 过滤）install→check:arch→lint→format→test→build；`lint-staged` + `pnpm precommit` 提交门禁。
- **新增** `docs/architecture/plugin-spec.md` 插件架构规范；`docs/development/ci-and-gates.md`。
- **变更** 子应用接入 `vite-plugin-qiankun` 独立打包（qiankun + standalone 双用，生命周期逻辑完整保留）；主应用 SPA 基座；多环境 `pnpm build` / `build:test`（驱动 `@fmac/env`）+ `VITE_BASE`。
- **新增** Nginx 部署配置 `configs/nginx/{main,subapp}.conf`（子应用 qiankun 跨域 CORS）；扩充 `docs/development/deployment.md`。
- **修复** pnpm 11 工具链：`pnpm-workspace.yaml` 迁移 `verifyDepsBeforeRun` 并以 `allowBuilds` 静默 esbuild `ERR_PNPM_IGNORED_BUILDS`，解除 install/build/CI 阻断。
- **增强** 架构守卫忽略 `coverage/` 等 gitignore 产物目录。
- **更新** `architecture-final.md`、`optimization-log.md`（Phase 9 节）。

### Phase 8 —— 架构守卫 + 配置中心 + 测试基线

- **新增** `configs/arch-check`（`@fmac/arch-check`，零依赖）架构守卫：`pnpm check:arch` 自动校验顶级目录 / qiankun 边界 / 依赖方向 / 框架隔离 / apps 边界 / 循环依赖；根 `pnpm check` = `check:arch + lint + test`。
- **新增** 配置中心：`configs/constants`→`@fmac/constants`、`configs/env`→`@fmac/env` 提升为工作区包。`@fmac/constants` 增 `SUBAPPS`（activeRule + apiBase）单一事实源。
- **重构** 主应用注册表 `apps/main/src/micro/apps.js` 与各子应用 router base / request baseURL 从配置中心派生，消除 activeRule/entry/baseURL 重复与漂移。
- **新增** 单元测试：引入 `vitest`（`pnpm test`），覆盖 `shared`（emitter/hooks/error-handler）/`store`/`request`/`cache`/`loading`/`router`，8 文件 44 用例。
- **完善** 统一异常闭环：`createHooks({ onError })` 桥接 `errorHandler.lifecycle`；`router.onError` 桥接 `errorHandler.route`；`micro/route/request/lifecycle` 四类均有真实产出方，收敛到统一 `errorHandler`。
- **更新** `architecture-final.md`、`optimization-log.md`（Phase 8 节）、`dependency.md`、`overview.md`。

### Phase 7 —— 架构优化（Architecture Refinement）

- **重构** 收敛跨 app 重复的 `createVueRouterAdapter`：新增 `packages/ui-adapter/src/vue-router-adapter.js`，经 `@fmac/core` 统一出口，`apps/{main,user,order,report,finance-demo}` 改为导入（删除 5 份重复定义，净减约 70 行）。框架特定胶水归位到唯一可依赖框架的 `ui-adapter`，降低 Vue3 迁移成本。
- **修复** `configs/constants`：`MICRO_APPS` / `ROUTE_PREFIX` 增补 finance-demo（`app-finance-demo` / `/finance`），与实际注册一致。
- **修正** `docs/architecture/dependency.md` 校验方式：改为真实可用的 import 扫描 + lint，移除对不存在「架构检查脚本」的引用。
- **新增** `docs/architecture/architecture-final.md`（Phase 7 定稿架构）、`docs/architecture/optimization-log.md`（滚动优化日志）。
- **完成** 全量架构复核（目录/依赖方向/qiankun 隔离/框架隔离/跨应用通信/生命周期/样式隔离/API 一致性）—— 全部通过。

### Phase 6 —— 架构验收 + 真实业务子应用

- **新增** `apps/finance-demo`：财务管理系统（首页/账户/交易/报表），真实业务场景，验证 store/event/request/tab/cache/样式隔离/生命周期全链路。
- **接入** 主应用注册 finance-demo（activeRule `/finance`），新增 `finance:update` 监听与 `global:refresh` 广播、`/finance` 路由与侧边栏入口。
- **修复** 将 `apps/main` 的 `registerMicroApps` 重命名为 `setupMicroApps`，消除与 qiankun API 的标识符歧义（qiankun API 仅存在于 `packages/core`）。
- **新增** 文档 `docs/development/finance-demo-guide.md`（新业务系统接入指南）。
- **完成** 完整架构审查（目录/依赖/qiankun 隔离/框架隔离/API 一致性）—— 全部通过。

### Phase 5 —— 工程能力完善（企业级基础框架）

- **新增** `packages/plugin`：插件扩展机制（`register` / `install` / `get`），预留日志/埋点/监控/国际化/主题。
- **新增** `@fmac/shared` 统一 Hook 机制 `createHooks`（`beforeMount`/`afterRoute`/`beforeRequest` 等）。
- **新增** `@fmac/shared` 统一异常处理 `createErrorHandler` + `ErrorTypes`（micro/route/request/auth/lifecycle）。
- **接线** `@fmac/core`：Hook 并入 qiankun 生命周期与 request/router；微应用异常经统一 errorHandler 收敛；插件在 `setup` 时安装。
- **新增** 根脚本 `dev` / `build` / `clean` / `clean:deps` / `commitlint`（批量执行 apps）。
- **新增** 提交规范 `commitlint.config.js`（Conventional Commits）。
- **新增** 环境配置 `configs/env/*`、常量 `configs/constants/*`、`configs/webpack/*`（预留）。
- **新增** 开发文档体系 `docs/{architecture,development,packages,migration}/*`。

### Phase 4 —— 标准子应用

- **新增** `apps/user`、`apps/order`、`apps/report`：qiankun 标准子应用（bootstrap/mount/unmount + router/request/store/event）。
- **修改** `apps/main`：注册三子应用并经 props 注入共享平台实例。

### Phase 3 —— 主应用（基座）

- **新增** `apps/main`：Vue2 + vue-router + Vite 基座，经 `@fmac/core` 接入平台并托管 qiankun。

### Phase 2 —— packages 能力实现

- **实现** 12 个平台能力包：shared / event / request / router / store / loading / message / cache / auth / tab / ui-adapter / core。

### Phase 1 —— 工程初始化

- **新增** pnpm workspace、分层 packages 骨架、统一 eslint / prettier 配置。
