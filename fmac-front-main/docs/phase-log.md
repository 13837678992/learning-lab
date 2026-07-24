# 阶段执行流水（phase-log.md）

> 每完成一个 Phase 追加一条记录。最新在最上。

---

## Phase 5 · 部署能力建设 — ✅ 完成（2026-07-24）

**目标**：多环境配置、独立构建/部署、nginx、子应用注册地址配置。

**执行内容**：
- 两应用 webpack 增加依赖无关的 `.env` 读取（按 APP_MODE 选 `.env.dev/.env.test/.env.prod`，`process.env` 优先覆盖），经 DefinePlugin 注入 `API_BASE/PUBLIC_PATH/SUBAPP_DEMO_ENTRY`。
- 新增 6 个环境文件（main-layout 与 app-demo 各 3）。
- 新增 nginx 配置：`deploy/nginx/fmac-single-domain.conf`（root 方案，规避 alias 回退陷阱）、`deploy/nginx/fmac-multi-domain.conf`（分域 + CORS）。
- 输出 `docs/deploy.md`（多环境、构建、目录布局、nginx 要点、独立部署）。

**测试结果**：
- main-layout：`npm run build`（prod）注入 `api.fmac.example.com` 与子应用 entry ✓；`npm run build:test` 注入 `test-api...` ✓。
- app-demo：`npm run build`（prod）注入 `api.fmac.example.com` 与 `PUBLIC_PATH=/app-demo/` ✓。
- 均 exit 0，无 ERROR。

**遇到问题**：无（nginx 子路径 history 回退采用 root 方案规避 alias 陷阱）。

**下一阶段**：Phase 6 测试验收 + 最终文档。

---

## Phase 4 · 主子应用通信 — ✅ 完成（2026-07-24）

**目标**：建立主子通信（initGlobalState 下发 + 子应用回传 route/refresh/logout + window.microApp 桥）。

**执行内容**：
- main-layout：`micro/globalState.js`（initGlobalState 封装）、`platform/bridge.js`（下发 token/userInfo/menu/permissions、订阅子应用 action、window.microApp 桥、action 去重）、`platform/session.js`（loadPlatform 于 start 前接入 setupBridge）。
- app-demo：`context.js`（Vue.observable 响应式 + bindGlobalState 订阅 + emitToMain 上行 + global:refresh 事件 + unbind 反注册）、`main.js`（mount 绑定 / unmount 反注册防泄漏）、`views/Home.vue`（通信演示：数据请求 / 418 / 401 / route / refresh / logout）。

**测试结果**：
- main-layout 与 app-demo `npm run build` 均 exit 0，无 ERROR（qiankun initGlobalState 正常打包）。
- 端到端（浏览器内挂载 + 状态同步 + action 上行 + logout 桥）留待 Phase 6。

**遇到问题**：
- 潜在循环依赖（request ↔ session ↔ bridge）→ 通过 `utils/logout.js` 与 bridge 只依赖 api/user（不依赖 session）规避。
- 全局状态回显重复处理 action → 以 `action.id` 去重解决。

**下一阶段**：Phase 5 部署能力建设。

---

## Phase 3 · 子应用建设 app-demo — ✅ 完成（2026-07-24）

**目标**：创建 `app-demo`，支持独立运行 + qiankun 接入，含独立 `request.js`（401/418）。

**执行内容**：
- UMD webpack 配置（library=app-demo / umd / jsonpFunction）、`public-path.js`（运行期 publicPath）、babel（CommonJS）。
- `main.js` 生命周期 `bootstrap/mount/unmount` + 独立运行渲染；`unmount` 清理实例/DOM/router。
- `router/index.js`（base 随 powered 切换 /app-demo 或 /）、`App.vue`、`views/{Home,About}.vue`、`context.js`。
- 独立 `utils/request.js`：401 未登录、418 → `window.microApp.logout()`；`api/index.js`；dev-server mock（summary/expire/unauth）。
- 端口 7201；devServer CORS。

**测试结果**：
- `npm run build` → exit 0，webpack 4.47.0，~1.1s，UMD 产物含 `app-demo` 库名与 `webpackJsonp_app-demo`。
- `npm run serve`（:7201）：`GET /` 200 且含 `Access-Control-Allow-Origin: *`、`/api/demo/summary` JSON、`/api/demo/expire` 418、`/home` fallback 200。

**遇到问题**：无。

**下一阶段**：Phase 4 主子应用通信。

---

## Phase 2 · 主应用能力建设 — ✅ 完成（2026-07-24）

**目标**：完善 `main-layout` 基座能力（qiankun / 登录 / 菜单 / axios / 路由守卫）。

**执行内容**：
- qiankun：`micro/index.js`（registerMicroApps + start + 5 个生命周期钩子 + experimentalStyleIsolation）、`micro/apps.js`（菜单派生注册表）。
- 登录/会话：`platform/session.js`（loadPlatform/afterLogin/logout）、`store/index.js`（Vue.observable 全局态）、`utils/auth.js`（持久化）。
- 菜单：`api/menu.js` + 侧栏渲染 + 菜单驱动子应用注册。
- axios：`utils/request.js` 完整拦截（token 注入、401/418、网络/服务异常）、`utils/logout.js`、`utils/message.js`。
- 路由：`router/guards.js`（beforeEach/afterEach）、`routes.js`（Layout 包裹 + 子应用占位路由）。
- 布局：`layout/{Layout,AppHeader,AppSidebar}.vue`。
- 开发态 Mock 后端：`mock/index.js` + `webpack devServer.before`。
- 端口调整 7100→**7200**（规避同机参考项目占用的 7100–7104）；生产构建前 `fs.rmSync` 清理 dist。

**测试结果**：
- `npm run build` → exit 0，webpack 4.47.0，~1.5s，无 ERROR/WARNING，qiankun 正常打包（main + 3 chunk）。
- `npm run serve`（:7200）：`GET /` 200 且 title 正确、`GET /api/menu` 与 `POST /api/login` 返回约定 JSON、`GET /home` history fallback 200。

**遇到问题**：
- 端口 7100 被同机运行的参考项目占用（EADDRINUSE），首次探测命中了参考服务器 → 迁移到 7200/7201 后正常。

**下一阶段**：Phase 3 子应用建设 app-demo。

---

## Phase 1 · 主应用初始化 — ✅ 完成（2026-07-24）

**目标**：建设 `main-layout` 可构建骨架（Vue2 结构 / webpack4 / qiankun 依赖 / Vue 入口 / 路由 / axios 基础封装）。

**执行内容**：
- 新增 `main-layout/` 全套骨架：`babel.config.js`（CommonJS）、`webpack.config.js`（CommonJS，SPA 基座）、`public/index.html`、`src/main.js`、`src/App.vue`、`src/router/{index,routes}.js`、`src/views/{Home,Login}.vue`、`src/utils/request.js`、`.gitignore`。
- 路由 history 模式，Login/Home 懒加载。
- axios 基础实例 + 请求/响应拦截骨架（完整拦截留 Phase 2）。

**修改文件**：见上（均为新增）；`docs/layout-init.md` 新增。

**测试结果**：
- `npm run build` → **exit 0**，webpack 4.47.0，514ms，无 ERROR / 无 WARNING。
- 产物 `dist/`：`index.html` + `main.[hash].js` + 2 个懒加载 chunk（Home/Login）。
- 验证 webpack4 工具链在 Node v24.18.0 + `--openssl-legacy-provider` 下可用。

**遇到问题**：无。

**下一阶段**：Phase 2 主应用能力建设。

---

## Phase 0 · 项目分析 — ✅ 完成（2026-07-24）

**目标**：分析当前项目结构，输出改造建议。

**执行内容**：
- 读取 `CLAUDE.md` / `TASK.md` / 现有 `docs/`。
- 分析目标项目 `fmac-front-main`（初始为空）与同级参考实现 `../fmac-front`（Vue2 + webpack4 + qiankun 的 pnpm monorepo）。
- 提取可复用模式：基座 webpack4 SPA 配置、子应用 UMD 配置、`public-path.js`、qiankun 生命周期、请求拦截器结构、主子通信。
- 确认技术选型与精确依赖版本（对齐参考实现，去 element-ui，请求改 axios）。
- 环境校验：Node `v24.18.0` 接受 `--openssl-legacy-provider` 且可生成 md4（webpack4 关键依赖）。
- **网络可用窗口内完成 `main-layout` 与 `app-demo` 的 `npm install`**（各约 900 包，exit 0），依赖落地，后续离线可构建。

**修改文件**：
- 新增 `main-layout/package.json`、`app-demo/package.json`
- 重写 `docs/current-analysis.md`（原文件被误写为 context-state 模板）
- 新增 `docs/context-state.md`、`docs/phase-log.md`

**测试结果**：
- 依赖安装 exit 0；`webpack 4.47.0`、`vue 2.7.16`、`qiankun 2.10.16`、`axios 1.7.9` 均就位，`.bin/webpack`、`.bin/webpack-dev-server` 可用。

**遇到问题**：
- 网络间歇断开 → 对策：抢先安装锁定依赖；构建不再依赖网络。

**下一阶段**：Phase 1 主应用初始化。

---
