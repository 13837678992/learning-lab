# 架构优化日志（Optimization Log）

> 逐阶段记录架构审查发现的问题、已解决项、剩余风险与下一阶段建议。定稿架构见 [architecture-final.md](./architecture-final.md)。
> 追加规范：每阶段新增一节，最新在上；不改写历史阶段结论。

---

## Phase 9 · 集成测试 + CI/门禁 + 独立打包 + 部署（2026-07-18）

目标：从「可运行」升级为「**可测试、可持续交付、可独立部署、可企业级维护**」。基于既有稳定架构演进，**未新增业务功能**，未预置未使用的 Vue3/React/Wujie 适配。

### 本阶段已解决

- **R-6 集成测试（已解决）**：引入 `happy-dom`；`packages/core/src/qiankun.test.js`（mock qiankun）验证 `registerApps` 合并平台 Hook 到子应用 `beforeMount/afterMount/...`、`start` 强制 `strictStyleIsolation` 且幂等、全局异常桥接 `errorHandler.micro`、手动加载句柄管理；`setup.test.js`（happy-dom）验证 request/router Hook 接线、`request`→`errorHandler.request` 桥接、默认 DOM 适配器注入。共 **11 项集成用例**。
- **能力包测试补齐**：新增 `message/event/tab/auth/plugin` 单测；全库 **15 文件 76 用例全通过**，覆盖率约 **Statements 71% / Lines 74% / Functions 71%**（`pnpm test:coverage`，v8）。
- **CI + 提交门禁**：仓库根 `.github/workflows/fmac-front-ci.yml`（按 `fmac-front/**` 过滤，`working-directory: fmac-front`）跑 install→check:arch→lint→format:check→test→build；`lint-staged` + `pnpm precommit` 提交门禁；根 `pnpm check` 一键全量。
- **Plugin 架构规范**：新增 [`plugin-spec.md`](./plugin-spec.md)，规范契约 / 上下文 / 扩展点 / Do-Don't；契约由 `@fmac/plugin` 强制且 `plugin.test.js` 覆盖（**不新增未用能力**）。
- **构建体系（主/子应用独立打包 + 多环境）**：子应用接入 `vite-plugin-qiankun`（生命周期经 `renderWithQiankun` 暴露，**完整保留** render/清理/监听/定时器逻辑），产物同时支持 qiankun 挂载与 standalone；主应用 SPA 基座；多环境经 `vite --mode`（`pnpm build` / `build:test`，驱动 `@fmac/env`）+ `VITE_BASE`。`pnpm build` / `build:test` 五应用全部构建通过。
- **Nginx 独立部署 + 文档**：[`configs/nginx`](../../configs/nginx/README.md)（基座 SPA 回退 + `/api` 反代；子应用静态 + **qiankun 跨域 CORS**）；扩充 [`deployment.md`](../development/deployment.md)（多环境构建、配置中心映射、独立部署步骤、发布校验清单）+ 新增 [`ci-and-gates.md`](../development/ci-and-gates.md)。

### 本阶段新增发现的问题（及处理）

| #    | 问题                                                                   | 处理                                                                                                                                                       |
| ---- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P9-1 | git 根是 `learning-lab`（含 cloud2024 等同级项目），非 fmac-front      | CI 置仓库根并按 `fmac-front/**` 过滤；**husky 不全局安装**（会波及同级项目），文档给出可选接入                                                             |
| P9-2 | pnpm 11 的 workspace 设置须在 `pnpm-workspace.yaml`（`.npmrc` 不生效） | 迁移为 `verifyDepsBeforeRun: false`；esbuild 二进制随平台包分发，用 `allowBuilds: {esbuild:false}` 静默 `ERR_PNPM_IGNORED_BUILDS`，解除 install/build 阻断 |
| P9-3 | 架构守卫把 `coverage/` 误判为顶级目录                                  | 守卫忽略 `node_modules/coverage/dist/build` 等 gitignore 产物                                                                                              |

### 剩余风险

| #    | 风险                                                                | 说明                                                                                                       |
| ---- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| R-3  | `CLAUDE.md` 第五节能力包清单未含 `plugin`                           | 权威文档由用户维护，建议对齐。                                                                             |
| R-8  | 侧边栏 / 跨应用跳转 activeRule 字面量与 `@fmac/constants` 软耦合    | 展示层调用点，是否派生取决于收益（避免过度设计）。                                                         |
| R-9  | qiankun **跨域运行期**未做端到端验证                                | 构建通过、子应用 bundle 已暴露 qiankun 生命周期，但真实跨域挂载需浏览器 e2e（Playwright），留待 Phase 10。 |
| R-10 | 覆盖率分支 ~54%：`fetch-adapter` / `history-adapter` / DOM 适配器低 | 属浏览器 IO 边界，需 jsdom/happy-dom 下补测。                                                              |

### 下一阶段建议（Phase 10 候选）

1. **端到端测试**（对应 R-9）：Playwright 驱动真实浏览器，验证基座注册→子应用跨域挂载→切换→卸载（无内存泄漏、样式隔离生效）。
2. **提升覆盖率**（对应 R-10）：mock fetch 覆盖 `fetch-adapter`；happy-dom 覆盖 `history-adapter` 与 `ui-adapter` DOM 适配器；接 `vitest --coverage` 阈值门禁。
3. **容器化部署**：为主/子应用各出 `Dockerfile`（多阶段构建 + Nginx）+ `docker-compose` 一键起本地全链路。
4. **版本与发布**：接入 `@changesets/cli`，将 `packages/*` 独立版本与 changelog 自动化。
5. **推动 `CLAUDE.md` 第五节补入 `plugin`**（对应 R-3）。

---

## Phase 8 · 架构守卫 + 配置中心 + 测试基线（2026-07-18）

按 Phase 1~7 的优化建议，优先解决历史遗留的 **R-2（架构守卫）**、**R-1（配置中心接线）**、**R-4（测试基线）**，并顺带完成统一异常闭环。本阶段**未新增任何业务功能**，未预置未使用的 Vue3/React/Wujie 适配。

### 本阶段已解决（历史遗留项）

- **R-2 架构守卫（已解决）**：新增零依赖工作区包 `configs/arch-check`（`@fmac/arch-check`），`pnpm check:arch` 自动校验 6 项：顶级目录 / qiankun 边界 / 依赖方向 / 框架隔离 / apps 边界 / 包级循环依赖。已做**反向验证**（临时制造 `apps` 直连 `@fmac/store` → 退出码 1，清理后 → 0），确认非空转。根 `pnpm check` = `check:arch + lint + test`，可接 CI。
- **R-1 配置中心（已解决）**：`configs/constants`→`@fmac/constants`、`configs/env`→`@fmac/env` 提升为工作区包。
  - `@fmac/constants` 新增 `SUBAPPS` 单一事实源（`activeRule` + `apiBase`）与 `SUBAPP_CONTAINER`；
  - `apps/main/src/micro/apps.js` 注册表、各子应用 `router` base、`request` baseURL **全部从配置中心派生**，消除「主应用 activeRule 与子应用 base 各写一遍」的重复与漂移；entry 由 `@fmac/env` 按 mode 解析、`import.meta.env.VITE_SUB_*` 可覆盖。
  - 守卫放行 apps 依赖 `@fmac/constants` / `@fmac/env`（非运行时能力）。
- **R-4 测试基线（已解决）**：引入 `vitest`（`pnpm test`）。覆盖 `shared`（emitter/hooks/error-handler）、`store`、`request`（拦截器/取消/合并）、`cache`（TTL/命名空间/损坏记录）、`loading`（引用计数/withLoading）、`router`（onChange/onError），**8 文件 44 用例全通过**。`vitest.setup.js` 静默统一 logger 噪声。
- **统一异常闭环（T3/T4，已解决）**：`ErrorTypes` 原有 `route`/`lifecycle` 无产出方（死类型）。本阶段：
  - `createHooks({ onError })`：hook 执行异常桥接 `errorHandler.lifecycle`；
  - `router.onError` + 内部 try/catch：路由异常桥接 `errorHandler.route`；
  - `core/runtime.js`、`core/setup.js` 完成接线。`micro/route/request/lifecycle` 四类均有真实产出方，收敛到统一 `errorHandler`（未注册处理器时经 logger 兜底）。

### 本阶段新增发现的问题

| #    | 问题                                                           | 位置                                                    | 处理                                                 |
| ---- | -------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------- |
| P8-1 | 侧边栏菜单 / 跨应用跳转仍以字面量引用 activeRule（`/micro/*`） | `apps/main/src/layout/AppSidebar.vue`、finance 视图跳转 | 保留（展示层调用点，非注册契约；避免改无关业务代码） |
| P8-2 | `configs/webpack` 为空占位、无 `package.json`                  | `configs/webpack`                                       | 保留（明确「预留」，未使用不提前设计）               |

### 剩余风险

| #   | 风险                                                     | 说明                                                                       |
| --- | -------------------------------------------------------- | -------------------------------------------------------------------------- |
| R-3 | `CLAUDE.md` 第五节能力包清单未含 `plugin`                | 权威文档由用户维护，未代改；建议对齐。                                     |
| R-6 | `core` 装配接线、apps 生命周期、qiankun 集成无自动化测试 | 测试聚焦能力包纯逻辑；集成层需 jsdom/happy-dom 环境，留待 Phase 9。        |
| R-7 | 架构守卫为静态 import/依赖扫描                           | 不覆盖运行期动态拼接 import 等边角；作为静态门禁已足够，动态需运行期校验。 |
| R-8 | 侧边栏/跳转字面量（P8-1）与 `@fmac/constants` 存在软耦合 | activeRule 变更需手改导航串；是否派生取决于收益，避免过度设计。            |

### 下一阶段建议（Phase 9 候选）

1. **集成测试**（对应 R-6）：引入 `happy-dom`/`jsdom`，覆盖 `core.setup` 接线（Hook 并入 qiankun 生命周期、异常桥接）、子应用 `mount/unmount` 的资源清理（无内存泄漏）。
2. **CI / 提交前门禁**：将 `pnpm check` 接入 CI 与 `husky + lint-staged` pre-commit，使守卫与测试常态化。
3. **补齐能力包测试**：`message`/`event`/`tab`/`auth`/`plugin` 补单测，逐步提覆盖率并接入 `vitest --coverage`。
4. **推动 `CLAUDE.md` 第五节补入 `plugin`**（对应 R-3）。
5. **（可选）导航串收敛**（对应 R-8）：评估把侧边栏 / 跨应用跳转的 activeRule 也从 `@fmac/constants` 派生，权衡收益与复杂度。

---

## Phase 7 · 架构优化（2026-07-18）

本阶段首次建立本日志。对 `apps` / `packages` / `configs` / `docs` 做了全量架构复核，整体健康度**高**：依赖方向、框架隔离、qiankun 单点、样式隔离、生命周期清理、跨应用通信规范均合规（复核矩阵见 architecture-final.md 第 8 节）。

### 本阶段新增发现的问题

| #    | 问题                                                    | 位置                                                         | 类型           | 严重度 |
| ---- | ------------------------------------------------------- | ------------------------------------------------------------ | -------------- | ------ |
| P7-1 | `createVueRouterAdapter` 逐字节重复 5 份                | `apps/{main,user,order,report,finance-demo}/src/platform.js` | DRY / 框架隔离 | 中     |
| P7-2 | `configs/constants` 缺 `finance-demo`，与实际注册不一致 | `configs/constants/index.js`                                 | 一致性         | 低     |
| P7-3 | `dependency.md` 宣称存在「架构检查脚本」，实际不存在    | `docs/architecture/dependency.md`                            | 文档失真       | 低     |
| P7-4 | `plugin` 已落地但未纳入 `CLAUDE.md` 第五节能力包清单    | `CLAUDE.md` / 文档                                           | 文档对齐       | 低     |

### 本阶段已解决

- **P7-1（已解决）**：新增 `packages/ui-adapter/src/vue-router-adapter.js`，把 vue-router → `@fmac/router` 的适配收敛为单一实现；经 `@fmac/core` 统一出口（`export { createVueRouterAdapter } from '@fmac/ui-adapter'`）。5 个 app 改为从 `@fmac/core` 导入，删除各自重复定义（净减约 70 行重复代码）。
  - **价值**：框架特定胶水归位到「唯一允许依赖具体框架」的 `ui-adapter`（CLAUDE.md 第七节）；Vue3 / react-router 迁移时只需在 `ui-adapter` 新增一处适配器，业务无感（直接降低目标「Vue3 升级成本最低」的实现成本）。
  - **验证**：`grep function createVueRouterAdapter apps/` → 0 处；ESLint 通过。
- **P7-2（已解决）**：`MICRO_APPS` 增补 `FINANCE: 'app-finance-demo'`，`ROUTE_PREFIX` 增补 `FINANCE: '/finance'`，README 同步；使文档化「单一事实源」与 `apps/main/src/micro/apps.js` 实际注册一致。
- **P7-3（已解决）**：`dependency.md` 校验方式改写为**真实可用**的 import 扫描 + lint 命令，并将「自动化依赖方向校验脚本」列为下一阶段项。

### 剩余风险（未在本阶段处理，附原因）

| #   | 风险                                                                             | 原因 / 说明                                                                                                                                                                  |
| --- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-1 | `configs/env` / `configs/constants` 未被 apps 实际读取                           | apps 直接用 `import.meta.env` + 硬编码 `microApps`。将「单一事实源」接线进 apps 会改动各 `vite.config.js` / 注册表，属结构性改动，留待下一阶段专项处理，避免本阶段过度设计。 |
| R-2 | 缺自动化依赖方向 / 架构校验脚本                                                  | 目前靠人工 grep + lint。落地脚本需考虑「禁止新增顶级目录」（CLAUDE.md 第三节），放置位置需设计（见下）。                                                                     |
| R-3 | `CLAUDE.md` 第五节能力包清单未含 `plugin`                                        | `CLAUDE.md` 为用户维护的权威约束文档，本阶段不代改；已在 `architecture-final.md` / `overview.md` 记录 `plugin` 为合规扩展，建议用户对齐清单。                                |
| R-4 | 无自动化测试基线                                                                 | 能力包（shared/router/store/request/…）均为纯函数 / 框架无关，**极易单测**，但当前 0 覆盖。                                                                                  |
| R-5 | finance-demo 的 `activeRule='/finance'` 与其它子应用 `'/micro/*'` 前缀风格不一致 | finance-demo 定位为完整演示应用，路由自成一体；强改会波及其 tab/router 硬编码逻辑。保留并在 constants 中显式登记（已做）。                                                   |

### 下一阶段建议（Phase 8 候选）

1. **落地零依赖架构校验脚本**（对应 R-2）：实现依赖方向 / qiankun 泄漏 / apps 直连下层包的自动检测，纳入 `pnpm lint` 前置或 CI。放置建议：作为 `configs/eslint-config` 同级的既有 `configs/*` 工作区包（如 `configs/arch-check`，含 `package.json`），避免新增顶级目录。
2. **接线单一事实源**（对应 R-1）：让 `apps/main/src/micro/apps.js` 与各 app 的 baseURL 从 `configs/constants` + `configs/env` 派生，消除硬编码与漂移。
3. **能力包单元测试基线**（对应 R-4）：优先覆盖 `shared`（emitter/hooks/error-handler）、`store`、`request`（拦截器/取消）、`cache`（TTL/命名空间清理）、`loading`（引用计数）。
4. **推动 `CLAUDE.md` 第五节补入 `plugin`**（对应 R-3），使权威约束与实现一致。
5. **Vue3 迁移预研**：在 `ui-adapter` 预留 `createVue3RouterAdapter` 骨架，验证「仅改 core + ui-adapter」的迁移假设。

---

<!-- 后续阶段在此上方追加新节。 -->
