# 当前项目分析（Phase 0）

> 输出文件：`docs/current-analysis.md`
> 阶段：Phase 0 项目分析
> 更新时间：2026-07-24

---

## 一、分析对象

本次升级的目标项目为 **`fmac-front-main`**（独立应用模式微前端脚手架）。

分析时该目录初始状态为「近乎空白」：仅包含

- `CLAUDE.md`（项目执行规范）
- `TASK.md`（升级任务定义）
- `docs/`（文档目录）

因此本文档的「现状分析」同时参考了同级目录 **`../fmac-front`**（一个已存在的、功能完整的 qiankun 微前端实现），作为「现有实现 / 迁移来源」的事实依据；`fmac-front-main` 则是要建设的「目标形态」。

> 注意：`fmac-front` 仅作为**模式参考**。按 CLAUDE.md 第五节，禁止跨应用引用其源码；本项目不依赖、不链接、不复制其 workspace 结构。

---

## 二、参考实现（`../fmac-front`）现状

### 2.1 架构

- **pnpm workspace Monorepo**：`pnpm-workspace.yaml` 纳管 `apps/*`、`packages/*`、`configs/*`。
- **应用（apps/）**：`main`（基座）、`finance-demo`（webpack4 子应用）、`user` / `order` / `report`（Vite 子应用）。
- **共享包（packages/，14 个）**：`core`、`request`、`router`、`store`、`event`、`auth`、`cache`、`message`、`loading`、`tab`、`plugin`、`ui-adapter`、`shared`。qiankun 能力被封装进 `@fmac/core`，各应用通过 `@fmac/*` workspace 依赖接入。
- **共享配置（configs/）**：`env`、`constants`、`webpack`、`eslint-config`、`prettier-config`、`nginx`、`arch-check`。

### 2.2 技术栈

| 维度 | 版本 / 选型 |
| --- | --- |
| 视图框架 | Vue `2.7.16` |
| 路由 | vue-router `3.6.5` |
| 微前端 | qiankun（经 `@fmac/core` 封装） |
| 基座构建 | webpack `4.47.0` + webpack-cli `3.3.12` + webpack-dev-server `3.11.3` |
| 子应用构建 | webpack4（finance-demo）与 Vite（user/order/report）并存 |
| 转译 | @babel/core `7.24.0` + @babel/preset-env `7.24.0` + babel-loader `8.3.0` |
| Vue 加载 | vue-loader `15.11.1` + vue-style-loader `4.1.3` + vue-template-compiler `2.7.16` |
| UI | element-ui `2.15.14`（仅主应用） |
| 请求 | 自研 `@fmac/request`（fetch 适配器，非 axios） |
| 包管理 | pnpm `8.15.5` |
| Node | `>=18.19.0`（`.nvmrc` 锁 `18.19.0`） |

### 2.3 关键实现要点（可复用的模式）

- **基座 webpack4**：`entry=src/main.js`，普通 SPA（非 UMD）；`DefinePlugin` 注入 `process.env.*`（替代 Vite 的 `import.meta.env`）；`NODE_OPTIONS=--openssl-legacy-provider` 兼容 OpenSSL3。
- **子应用 webpack4（UMD）**：`output.library=<appName>`、`libraryTarget:'umd'`、`globalObject:'window'`、`jsonpFunction:'webpackJsonp_<appName>'`；devServer `headers: { 'Access-Control-Allow-Origin': '*' }`。
- **`public-path.js`**：`if (window.__POWERED_BY_QIANKUN__) __webpack_public_path__ = window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__;`，必须最先执行。
- **子应用生命周期**：`main.js` 判断 `window.__POWERED_BY_QIANKUN__` 决定独立渲染或导出 `bootstrap/mount/unmount`；`unmount` 清理实例 / 路由 / 事件监听 / 定时器（防内存泄漏）。
- **qiankun 注册**：`registerMicroApps(apps, lifecycles)` + `start()`；`initGlobalState` 做主子通信。
- **请求**：请求 / 响应 / 错误三类拦截器，统一日志、可取消（AbortController）。

---

## 三、`fmac-front-main` 目标形态（本次要建设）

按 TASK.md：**独立应用模式**，与参考实现的 Monorepo 形成对比。

```
fmac-front-main/
├── main-layout/     # 主应用（基座）：独立 package.json / webpack / node_modules / src
├── app-demo/        # 子应用示例：独立 package.json / webpack / node_modules / src
├── docs/            # 文档
├── CLAUDE.md
└── TASK.md
```

技术栈严格锁定：**Vue2 + Webpack4 + qiankun + axios + JavaScript(CommonJS 配置)**。

---

## 四、现存问题（相对目标形态）

1. **目标项目为空**：`main-layout` / `app-demo` 尚未建立，无入口、无构建、无 qiankun 接入。
2. **参考实现不满足「独立应用模式」**：`fmac-front` 是 Monorepo + 14 个共享包 + pnpm workspace，与 TASK.md「禁止 workspace / 禁止公共 packages / 禁止跨应用引用」冲突，不能直接复用其目录结构。
3. **请求库不一致**：参考实现用自研 fetch 客户端；本项目技术栈要求 **axios**，需各应用各自封装 `request.js`。
4. **UI 依赖偏重**：参考主应用引入 element-ui；本项目按「最小依赖」原则，基座用手写布局 + CSS，避免重框架。
5. **构建工具链风险**：webpack4 属旧版本，需在较新 Node 上验证（见风险分析）。

---

## 五、风险分析

| 风险 | 说明 | 缓解措施 |
| --- | --- | --- |
| **webpack4 + 新版 Node** | 环境 Node 为 `v24.18.0`；webpack4 依赖 md4 等旧 crypto，OpenSSL3 下默认不可用 | 全部 npm 脚本加 `NODE_OPTIONS=--openssl-legacy-provider`；已验证该 Node 接受此 flag 且可生成 md4 |
| **网络不稳定** | 依赖需从 registry 安装；网络间歇可用 | 在网络可用时优先完成 `npm install`，锁定依赖；失败后 `--prefer-offline` 补齐 |
| **样式冲突** | 多应用同页，全局 CSS 可能互相污染 | qiankun `sandbox:{ strictStyleIsolation \| experimentalStyleIsolation }`；子应用样式作用域化 |
| **子应用资源路径** | qiankun 挂载时子应用静态资源 404 | 子应用 `public-path.js` 运行期修正 `__webpack_public_path__` |
| **主子通信内存泄漏** | 全局状态 / 事件监听未清理 | 子应用 `unmount` 中注销监听、清定时器、销毁实例 |
| **跨域** | 基座 fetch 子应用 entry HTML/JS 需 CORS | 子应用 devServer 设 `Access-Control-Allow-Origin: *`；生产由 nginx 配置 |
| **Vue3 / Webpack5 误升级** | 生态默认最新版 | 全部依赖锁定精确版本；CLAUDE.md 明确禁止升级 |

---

## 六、改造建议（本次执行方案）

1. **两应用完全独立**：`main-layout`、`app-demo` 各自 `package.json` / `webpack.config.js` / `node_modules` / `src` / 构建 / 部署，互不引用源码。
2. **基座直接使用 qiankun**：`registerMicroApps` / `start` / `initGlobalState` 直接 import，不再封装平台 SDK，降低复杂度。
3. **各自 axios `request.js`**：请求注入 token / 公共参数；响应处理 401（未登录）、418（`window.microApp.logout()` 退出）、网络与服务异常。
4. **配置文件用 CommonJS**：`webpack.config.js` / `babel.config.js` 一律 `module.exports`（CLAUDE.md 第六节）。
5. **最小依赖**：基座不引入 element-ui，手写 Layout（Header + Sidebar + 子应用容器）。
6. **多环境**：`.env.dev` / `.env.test` / `.env.prod`（Phase 5），子应用注册地址可经环境变量覆盖，支持独立部署。
7. **分阶段验证**：每阶段 `npm run build`（及 `serve`）验证后再进入下一阶段，禁止跳步。

---

## 七、结论

参考实现证明了 Vue2 + webpack4 + qiankun 技术栈的可行性与关键配置细节；本项目在此基础上**去 Monorepo 化**，以「独立应用模式」重建一套更轻、可独立开发 / 运行 / 部署的企业级脚手架。Phase 0 完成，进入 Phase 1（主应用初始化）。
