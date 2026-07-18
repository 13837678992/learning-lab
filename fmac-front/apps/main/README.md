# @fmac/app-main

FMAC 微前端**主应用（基座）**：Vue 2.7 + vue-router 3 + Vite，经 `@fmac/core` 接入平台能力。

> 业务只依赖 `@fmac/core`，不直接依赖任何下层能力 package（见 `CLAUDE.md` 第六节）。

## 结构

```
src/
├── main.js              入口：装配平台 → 挂载 Vue → 注册并启动 qiankun
├── App.vue              根组件（<router-view/>）
├── platform.js          接入 packages 的唯一入口：core.setup() + 注入 vue-router 适配器
├── router/
│   ├── index.js         vue-router 实例（基座内部实现，仅供 platform.js 适配）
│   └── routes.js        路由表（Layout 子路由 + micro/* 子应用占位）
├── layout/              基座外壳：Header / Sidebar / Tabs / Content(#subapp-viewport)
├── views/               基座自身页面：Home / About / MicroContainer
└── micro/
    ├── apps.js          qiankun 子应用注册表
    └── index.js         经 @fmac/core 注册 + 启动 qiankun
```

## 接入方式（关键约定）

| 能力        | 用法（业务）                                            | 说明                                                                              |
| ----------- | ------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 路由        | `import { router } from '@fmac/core'` → `router.push()` | 基座在 `platform.js` 把 vue-router 适配进 `@fmac/router`；业务禁止 `this.$router` |
| 状态        | `import { store } from '@fmac/core'`                    | 跨应用共享状态                                                                    |
| 标签        | `import { tab } from '@fmac/core'`                      | `AppTabs` 订阅渲染                                                                |
| 鉴权        | `import { auth } from '@fmac/core'`                     | `AppHeader` 展示登录态                                                            |
| 消息 / 加载 | `import { message, loading } from '@fmac/core'`         | 由 core 注入 `@fmac/ui-adapter` 的 DOM 实现                                       |
| qiankun     | `platform.registerApps() / start()`                     | 唯一入口在 `@fmac/core`，基座不直接引用 qiankun                                   |

## 本地运行

```bash
corepack pnpm --filter @fmac/app-main dev      # http://localhost:7100
corepack pnpm --filter @fmac/app-main build
```

> 环境变量：`VITE_API_BASE`（请求前缀）、`VITE_SUB_ORDER`（order 子应用 entry）。
