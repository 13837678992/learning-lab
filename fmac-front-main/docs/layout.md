# Phase 2 · 主应用能力（layout.md）

> 输出文件：`docs/layout.md`
> 阶段：Phase 2 主应用能力建设
> 结果：✅ 构建通过 + dev-server 联调通过

主应用 `main-layout` 基座能力说明。端口 **7200**（避免与同机其它服务冲突）。

---

## 一、目录结构（Phase 2 新增/变更）

```
main-layout/
├── webpack.config.js         # 变更：PORT=7200；devServer.before 挂载 mock；生产构建清理 dist
├── mock/
│   └── index.js              # 开发态 Mock 后端（/api/login /logout /user/info /menu）
└── src/
    ├── main.js               # 变更：挂载后，若已登录则装配平台
    ├── store/index.js        # 全局状态（Vue.observable）：token/userInfo/menu/microApps
    ├── api/
    │   ├── user.js           # login / logout / fetchUserInfo
    │   └── menu.js           # getMenu
    ├── utils/
    │   ├── request.js        # 变更：完整拦截（token 注入 + 401/418/网络/服务异常）
    │   ├── auth.js           # token/用户信息 localStorage 读写
    │   ├── logout.js         # forceLogout（避免循环依赖）
    │   └── message.js        # 轻量全局提示（无 element-ui）
    ├── micro/
    │   ├── apps.js           # 由菜单派生 qiankun 注册表
    │   └── index.js          # registerMicroApps + start + 生命周期钩子
    ├── platform/
    │   └── session.js        # loadPlatform / afterLogin / logout
    ├── router/
    │   ├── index.js          # 变更：注册守卫
    │   ├── routes.js         # 变更：Layout 包裹 + 子应用占位路由
    │   └── guards.js         # beforeEach/afterEach
    ├── layout/
    │   ├── Layout.vue        # 侧栏 + 头部 + 内容区（#subapp-viewport 常驻）
    │   ├── AppHeader.vue     # 用户信息 + 退出登录
    │   └── AppSidebar.vue    # 菜单导航
    └── views/
        ├── Login.vue         # 变更：真实登录
        └── Home.vue          # 变更：仪表盘（展示菜单 / 子应用）
```

---

## 二、qiankun 能力

`src/micro/index.js`：

- `registerMicroApps(apps, lifecycles)`：`apps` 由菜单中带 `microApp` 字段的项派生（`micro/apps.js`），统一 `container: '#subapp-viewport'`；生命周期钩子 `beforeLoad/beforeMount/afterMount/beforeUnmount/afterUnmount` 打点。
- `start({ prefetch:false, sandbox:{ experimentalStyleIsolation:true } })`：开启样式隔离（作用域化，不用 Shadow DOM 以兼容更多组件库）。
- 仅执行一次（`started` 守卫）；`initGlobalState` 动态通信在 Phase 4 于此扩展。
- 容器 `#subapp-viewport` 常驻 `Layout.vue`（`v-show` 切换可见性），规避 qiankun 挂载时容器缺失。

**子应用注册地址**：`micro/apps.js` 中 `entry = 环境变量覆盖 || 菜单 entry`；开发默认 `//localhost:7201`，生产默认 `/app-demo/`，均可经 `SUBAPP_DEMO_ENTRY` 覆盖。

---

## 三、登录能力

- `views/Login.vue` → `api/user.login()` → `platform/session.afterLogin()`。
- `afterLogin`：写入 `token`/`userInfo`（`store` + localStorage）→ `loadPlatform()`（拉菜单 + 启 qiankun）→ 跳转 `redirect || /home`。
- **token/session 管理**：`utils/auth.js` 持久化；`store` 响应式共享。
- **单点登录 / 会话保持**：启动时（`main.js`）若本地有 token 直接 `loadPlatform()`，无需重复登录；token 失效由响应拦截器统一登出。
- **退出登录**：`AppHeader` → `session.logout()` → 通知后端 → `forceLogout()`（整页跳转登录，彻底重置 qiankun）。

---

## 四、菜单能力

- 登录后 `getMenu()` 请求 `/api/menu`，返回菜单树（含 `app名称/app地址(entry)/路由地址(path,activeRule)/权限`）。
- 菜单写入 `store.menu`，`AppSidebar` 据此渲染导航；带 `microApp` 的项经 `buildMicroApps` 注册为 qiankun 子应用（**菜单驱动子应用加载**）。

---

## 五、Axios 能力

`src/utils/request.js`（`baseURL = API_BASE || '/api'`，超时 15s）：

- **请求阶段**：注入 `Authorization: Bearer <token>`、公共参数 `X-Client`。
- **响应阶段**：约定 `{ code, data, message }`，`code∈{0,200}` 剥离 `data`；否则按码/状态处理：
  - `401` → 提示 + `forceLogout()`（未登录）。
  - `418` → 提示 + `forceLogout()`（会话超时）。
  - 无响应 → 「网络异常」。
  - `5xx` / 其它 → 「服务异常」/ 后端 message。

---

## 六、路由能力

`src/router/guards.js`：

- `beforeEach`：设置页面标题；已登录访问 `/login` 回首页；未登录仅放行 `meta.public`，其余跳 `/login` 并回传 `redirect`。
- `afterEach`：预留 loading 收尾。
- 子应用路由 `meta.micro`：`/app-demo` 及其子路径匹配稳定（嵌套 `*` 通配），容器常驻，qiankun 据 `activeRule` 自动挂载/卸载。

---

## 七、验证结果

**构建**：`npm run build` → exit 0，webpack 4.47.0，~1.5s，无 ERROR/WARNING；产物 `main` + 3 chunk（含 qiankun 分包）。

**dev-server 联调**（`npm run serve`，:7200）：

| 请求 | 结果 |
| --- | --- |
| `GET /` | HTTP 200，`<title>FMAC 主应用</title>` |
| `GET /api/menu` | `{code:0,data:[...含 app-demo 注册]}` |
| `POST /api/login` | `{code:0,data:{token,userInfo}}` |
| `GET /home` | HTTP 200（history fallback → SPA） |

> 说明：qiankun 实际挂载子应用需 `app-demo`（Phase 3）同时运行，将在 Phase 6 端到端验证。

---

## 八、下一阶段

Phase 3 建设子应用 `app-demo`（独立运行 + qiankun 接入 + `request.js` 的 401/418 处理）。
