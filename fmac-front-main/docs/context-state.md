# Claude Code Context State

> Claude Code 长任务状态文件。每次执行必须优先读取。
> 配套：`docs/phase-log.md`（阶段流水）、`docs/current-analysis.md`（Phase 0 分析）。

---

## 当前阶段

**Phase 5 已完成 → 进入 Phase 6（测试验收 + 最终文档）**

---

## 项目状态

### 已完成

- **Phase 0 项目分析**
  - 分析目标项目 `fmac-front-main`（空白）与参考实现 `../fmac-front`（qiankun monorepo）。
  - 锁定技术栈与精确依赖版本。
  - 验证 Node v24.18.0 + webpack4 可行（`--openssl-legacy-provider` + md4 通过）。
  - 网络可用窗口内完成两应用 `npm install`，依赖已落地（离线可构建）。
  - 输出 `docs/current-analysis.md`、`docs/context-state.md`、`docs/phase-log.md`。

- **Phase 1 主应用初始化**
  - 新增 `main-layout/` 全套骨架（babel/webpack CommonJS、入口、路由、Login/Home、axios 基础封装）。
  - `npm run build` **exit 0**（webpack 4.47.0，514ms，无 ERROR/WARNING），懒加载 chunk 正常。
  - 输出 `docs/layout-init.md`。

- **Phase 2 主应用能力建设**
  - qiankun（registerMicroApps/start/生命周期）、登录（token/session/单点登录/退出）、菜单（/api/menu 驱动子应用注册）、axios 完整拦截（401/418/网络/服务异常）、路由守卫、Layout 布局、dev-server Mock 后端。
  - 端口迁移 7100→**7200**（规避同机参考项目占用）；生产构建前清理 dist。
  - `npm run build` exit 0；`npm run serve`（:7200）联调通过（/、/api/menu、/api/login、/home）。
  - 输出 `docs/layout.md`、`docs/phase2-summary.md`。

- **Phase 3 子应用建设 app-demo**
  - UMD webpack（library/umd/jsonpFunction）、`public-path.js`、生命周期 bootstrap/mount/unmount + 独立运行、双模式路由 base、独立 `request.js`（401/418→`window.microApp.logout()`）、dev mock。
  - `npm run build` exit 0（UMD 产物）；`npm run serve`（:7201）联调通过（含 CORS 头、summary/expire、fallback）。
  - 输出 `docs/subapp.md`。

- **Phase 4 主子应用通信**
  - main：`micro/globalState.js`、`platform/bridge.js`（initGlobalState 下发 + 子应用 action 派发 + window.microApp 桥 + 去重）、session 接入。
  - sub：`context.js`（响应式 + onGlobalStateChange 订阅 + emitToMain 上行 + 事件 + unbind）、main.js 绑定/反注册、Home 演示按钮。
  - 两应用 `npm run build` exit 0；端到端联调留 Phase 6。
  - 输出 `docs/communication.md`。

- **Phase 5 部署能力建设**
  - 两应用 webpack 增加 `.env.{dev,test,prod}` 读取（DefinePlugin 注入 API_BASE/PUBLIC_PATH/SUBAPP_DEMO_ENTRY）；新增 6 个 env 文件。
  - nginx 配置（单域名 root 方案 + 多域名 CORS 方案）。
  - prod/test 构建注入值经产物 grep 校验通过。
  - 输出 `docs/deploy.md`、`deploy/nginx/*.conf`。

### 进行中

- Phase 6：测试验收（主/子/通信端到端）+ 补齐最终文档（architecture/develop/api/test-report）。

### 待办

- 无（Phase 6 为最后阶段）。

---

## 目标架构（独立应用模式）

```
fmac-front-main/
├── main-layout/   主应用（基座）  端口 7200
├── app-demo/      子应用示例       端口 7201
└── docs/
```

技术栈：Vue `2.7.16` · vue-router `3.6.5` · qiankun `2.10.16`（仅基座） · axios `1.7.9` · webpack `4.47.0` · JS（配置用 CommonJS）。

Node：`v24.18.0`；所有构建脚本前置 `NODE_OPTIONS=--openssl-legacy-provider`。

---

## 已安装依赖（离线可用）

- `main-layout/node_modules`：webpack 4.47.0、vue 2.7.16、vue-router 3.6.5、qiankun 2.10.16、axios 1.7.9、babel/loader 全套（906 包）。
- `app-demo/node_modules`：webpack 4.47.0、vue 2.7.16、vue-router 3.6.5、axios 1.7.9、babel/loader 全套（902 包）。

---

## 已修改 / 新增文件

- `main-layout/package.json`（新增）
- `app-demo/package.json`（新增）
- `docs/current-analysis.md`（重写为正确的分析内容）
- `docs/context-state.md`（本文件，重建）
- `docs/phase-log.md`（新增）

---

## 当前问题 / 注意

- **网络间歇不可用**：依赖已提前安装，后续构建 / 运行不依赖网络。若需新增依赖，须等网络恢复。
- **webpack4 需 openssl flag**：脚本已内置 `NODE_OPTIONS=--openssl-legacy-provider`（Windows 需改用 cross-env，见部署文档）。

---

## 下一阶段目标（Phase 6）

测试验收：主应用（独立启动/登录/菜单/session/子应用加载）、子应用（独立启动/qiankun/生命周期/request/异常）、通信（数据同步/跳转/参数/logout）端到端验证；输出 `docs/test-report.md`，并补齐最终文档 `architecture.md` / `develop.md` / `api.md`。

---

## Claude 执行规则

每完成一个 Phase 必须更新本文件与 `phase-log.md`，内容含：当前阶段、已完成、修改文件、测试结果、遇到问题、下一阶段目标。长任务优先读取 `context-state.md` / `phase-log.md`，仅分析当前阶段相关代码，避免全量重扫。
