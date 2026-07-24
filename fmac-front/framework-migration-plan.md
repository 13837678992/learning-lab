# 前端框架迁移技术方案

> **版本**: v1.0  
> **日期**: 2026-07-23  
> **面向**: 技术负责人 / 前端开发人员 / 项目经理  
> **状态**: 初稿，部分信息标注「待确认」

---

## 目录

1. [项目背景与新框架架构](#一项目背景与新框架架构)
2. [老项目现状分析](#二老项目现状分析)
3. [Layout 微前端基座迁移方案](#三layout-微前端基座迁移方案)
4. [WMS 子应用迁移方案](#四wms-子应用迁移方案)
5. [普通业务子应用迁移方案](#五普通业务子应用迁移方案)
6. [整体迁移架构设计](#六整体迁移架构设计)
7. [打包流程设计](#七打包流程设计)
8. [部署流程设计](#八部署流程设计)
9. [测试范围设计](#九测试范围设计)
10. [工作量评估](#十工作量评估)
11. [开发计划](#十一开发计划)
12. [风险分析](#十二风险分析)
13. [最终迁移建议](#十三最终迁移建议)

---

## 一、项目背景与新框架架构

### 1.1 新框架技术栈总览

| 层级 | 技术选型 |
|------|---------|
| 语言 | JavaScript（ES Module），无 TypeScript |
| UI 框架 | Vue 2.7（所有应用统一） |
| 路由 | vue-router 3.x |
| UI 组件库 | Element UI 2.15.14（主应用） |
| 微前端 | qiankun（隔离在 `packages/core` 内，全平台唯一引用点） |
| 构建（主应用 + finance） | webpack 4.47 + babel-loader |
| 构建（user / order / report） | Vite 5.4 + `@vitejs/plugin-vue2` + `vite-plugin-qiankun` |
| 包管理 | pnpm 8.15.5（workspace 模式） |
| Node 版本 | >= 18.19.0 |
| 测试 | Vitest 4.1 + happy-dom + @vitest/coverage-v8 |
| 代码规范 | ESLint 9（flat config）+ Prettier 3.4 |
| 提交规范 | commitlint（Conventional Commits）+ lint-staged |

### 1.2 Monorepo 结构

```
fmac-front/
├── apps/                        # 业务应用（5 个）
│   ├── main/                    #   主应用 / 基座（webpack 4，端口 7100）
│   ├── user/                    #   用户管理子应用（Vite 5，端口 7101）
│   ├── order/                   #   订单管理子应用（Vite 5，端口 7102）
│   ├── report/                  #   报表中心子应用（Vite 5，端口 7103）
│   └── finance-demo/            #   财务管理示例子应用（webpack 4，端口 7104）
├── packages/                    # 13 个框架无关的能力包
│   ├── shared/                  #   基础层：工具函数、类型判断、日志、断言、发布订阅、生命周期钩子、错误处理
│   ├── core/                    #   组合根：聚合所有能力，唯一可引用 qiankun 的包
│   ├── auth/                    #   认证鉴权：Token 管理、用户信息、权限校验、菜单解析
│   ├── store/                   #   跨应用共享状态：get/set/subscribe
│   ├── event/                   #   跨应用事件总线：on/off/once/emit
│   ├── router/                  #   统一路由：push/replace/back/forward/go/reload
│   ├── request/                 #   统一 HTTP：get/post/put/delete + 拦截器 + 取消
│   ├── cache/                   #   数据缓存：TTL + 存储适配器
│   ├── tab/                     #   多标签页管理
│   ├── loading/                 #   全局加载指示器（引用计数）
│   ├── message/                 #   统一消息提示（success/error/warning/info/confirm）
│   ├── ui-adapter/              #   UI 框架适配层（DOM 级适配器，不依赖具体框架）
│   └── plugin/                  #   插件扩展机制
├── configs/                     # 工作区配置包
│   ├── constants/               #   单一配置源：应用名、路由、事件、Store Key
│   ├── env/                     #   环境配置中心（dev / test / prod）
│   ├── arch-check/              #   架构守卫（自动检查依赖方向、qiankun 边界、框架隔离）
│   ├── eslint-config/           #   共享 ESLint 配置
│   ├── prettier-config/         #   共享 Prettier 配置
│   ├── nginx/                   #   部署 Nginx 配置模板
│   └── webpack/                 #   预留 webpack 基础配置工厂
└── docs/                        # 架构文档、开发指南、变更日志
```

### 1.3 核心架构设计

#### 依赖分层（严格单向）

```
apps（仅依赖 @fmac/core + @fmac/constants + @fmac/env）
  │
  ▼
@fmac/core（组合根；依赖所有中间层 + shared + qiankun）
  │
  ▼
router / store / request / event / loading / message
cache / auth / tab / ui-adapter / plugin
（中间层，每个包仅依赖 @fmac/shared，彼此不互相依赖）
  │
  ▼
@fmac/shared（零 @fmac 依赖的基础层）
```

#### 关键设计模式

| 模式 | 说明 |
|------|------|
| **单例 + 工厂** | 每个能力包导出 `create*` 工厂函数和默认单例 |
| **适配器模式** | router / request / loading / message 均使用可替换适配器，框架迁移只需改 `ui-adapter` |
| **发布订阅** | `createEmitter` 是所有响应式通信的基础原语，store / auth / tab / router / event 均构建于此 |
| **钩子驱动生命周期** | `createHooks` 提供命名异步钩子，与 qiankun 生命周期桥接 |
| **统一错误漏斗** | 5 类错误（micro / route / request / auth / lifecycle）统一汇入 `errorHandler` |
| **插件扩展** | `{ name, install(context) }` 合约，context 包含全部平台能力 |

#### 架构硬约束（由 `configs/arch-check` 自动检查）

1. 仅 `packages/core` 可引用 `qiankun`
2. 应用间禁止互相依赖
3. 中间层包仅可依赖 `@fmac/shared`，不可互相依赖
4. 包内禁止引入 Vue / React / Vuex / Element 等框架（`ui-adapter` 提供 DOM 级适配，通过注入接收框架实例，自身不直接依赖框架）
5. 禁止循环依赖

### 1.4 公共能力建设情况

| 能力 | 包名 | 状态 | 说明 |
|------|------|------|------|
| 基础工具 | `@fmac/shared` | ✅ 已完成 | 类型判断、日志、断言、发布订阅、钩子、错误处理 |
| 认证鉴权 | `@fmac/auth` | ✅ 已完成 | Token / 用户 / 权限 / 角色 / 菜单解析 |
| 跨应用状态 | `@fmac/store` | ✅ 已完成 | get / set / subscribe / snapshot |
| 跨应用事件 | `@fmac/event` | ✅ 已完成 | on / off / once / emit |
| 统一路由 | `@fmac/router` | ✅ 已完成 | push / replace / back / onChange / 适配器注入 |
| 统一请求 | `@fmac/request` | ✅ 已完成 | 拦截器链 / 取消 / Fetch 适配器 |
| 数据缓存 | `@fmac/cache` | ✅ 已完成 | TTL / 命名空间隔离 / 存储适配器 |
| 多标签页 | `@fmac/tab` | ✅ 已完成 | 增删查改 / 激活切换 / 订阅刷新 |
| 全局加载 | `@fmac/loading` | ✅ 已完成 | 引用计数 / withLoading / DOM 适配器 |
| 消息提示 | `@fmac/message` | ✅ 已完成 | success / error / warning / info / confirm |
| UI 适配 | `@fmac/ui-adapter` | ✅ 已完成 | DOM loading / DOM message / Vue Router 适配器 |
| 插件系统 | `@fmac/plugin` | ✅ 已完成 | 注册 / 安装 / 错误隔离 / 幂等安装 |
| 组合根 | `@fmac/core` | ✅ 已完成 | setup / use / registerApps / start / 错误桥接 |
| 配置中心 | `@fmac/constants` + `@fmac/env` | ✅ 已完成 | 应用名 / 路由 / 事件 / 环境地址 |
| 架构守卫 | `@fmac/arch-check` | ✅ 已完成 | 6 项自动化检查 |

### 1.5 新框架相比旧系统优势

| 维度 | 旧系统 | 新框架 |
|------|--------|--------|
| 架构 | 单体 layout + 紧耦合子目录 | Monorepo + 微前端，应用独立开发/构建/部署 |
| 公共能力 | 散落在各目录，无统一抽象 | 13 个能力包，适配器模式，框架无关 |
| 通信机制 | 全局变量 / EventBus 散落 | 统一 store + event + router，禁止直接操作 window/storage |
| 构建工具 | 单一构建 | 支持 Vite + webpack 混合构建，构建工具无关 |
| 架构守护 | 人工 review | 代码化自动检查（arch-check），CI 集成 |
| 错误处理 | 各自处理 | 统一错误漏斗，5 类错误分类 |
| 可扩展性 | 无 | 插件系统，钩子生命周期 |
| 样式隔离 | 无 | qiankun strictStyleIsolation |
| 配置管理 | 分散 | `@fmac/constants` + `@fmac/env` 单一配置源 |

### 1.6 迁移后预期收益

1. **独立部署**：各子应用可独立构建、独立部署、独立回滚，发布互不影响
2. **技术栈渐进升级**：qiankun 支持异构子应用，可逐个将 Vue 2 子应用迁移至 Vue 3，仅改 `ui-adapter` + `core`
3. **开发效率提升**：子应用独立开发，启动速度快（Vite），联调通过本地 proxy
4. **代码质量保障**：架构守卫自动检查，禁止循环依赖和越界引用
5. **统一运维**：公共能力统一升级，所有子应用自动获得新能力

---

## 二、老项目现状分析

### 2.1 老项目目录结构

```
layout/                    # 微前端基座（主应用）
├── wms/                   # 仓储管理系统（复杂业务应用）
├── frs/                   # 财务报表系统
├── ocr/                   # OCR 识别系统
├── pic/                   # 图片管理系统
├── platmng/               # 平台管理系统
├── fndrsch/               # 资金调度系统
└── workflow/              # 工作流系统
```

### 2.2 老项目特征分析（待确认）

| 特征 | 现状（待确认） |
|------|---------------|
| 技术栈 | Vue 2 + 单体架构（待确认具体版本） |
| 构建工具 | 待确认（可能为 webpack 3/4 或 Vue CLI） |
| 状态管理 | 待确认（可能为 Vuex 或全局变量） |
| 路由方案 | 待确认（可能为 vue-router，主应用统一管理） |
| 通信方式 | 待确认（可能为 EventBus / 全局变量 / URL 参数） |
| UI 组件库 | 待确认（可能为 Element UI 或自研组件） |
| 部署方式 | 待确认（可能为整体部署或按目录部署） |

> **注意**：以上标注「待确认」的信息需在实际迁移前通过代码审查确认。

### 2.3 老项目主要问题（推测）

1. **强耦合**：所有业务模块在 layout 内以目录形式存在，共享同一个构建产物
2. **发布风险高**：任何模块的修改都需要整体构建和部署
3. **启动缓慢**：单体应用随业务增长启动越来越慢
4. **技术债累积**：公共逻辑散落，难以统一升级
5. **团队协作冲突**：多团队在同一仓库同一分支开发，冲突频繁

---

## 三、Layout 微前端基座迁移方案

Layout 是整个系统入口，负责微前端运行。以下逐项分析其职责的迁移方案。

### 3.1 单点登录

#### 旧系统实现方式（待分析）

老系统 layout 可能通过以下方式实现：
- SSO 跳转 + 回调获取 Token
- Cookie / localStorage 存储 Token
- 全局 Axios 拦截器注入 Token
- 用户信息挂载到 Vue 原型或 Vuex

#### 新框架迁移方案

新框架通过 `@fmac/auth` + `@fmac/core` 实现统一认证：

```
登录流程：

用户访问 → 主应用路由守卫检测（待实现：当前未配置 beforeEach 守卫）
           → 未登录 → 跳转 /login
                         ↓
                    Login.vue 调用登录 API（当前为 Mock，真实项目走 platform.request）
                         ↓
                    platform.auth.setToken(token)
                    platform.auth.setUser(userInfo)
                         ↓
                    loadMenu()：请求菜单 API → parseMenu() 解析
                         ↓
                    platform.store.set('platform:menu', menu)
                    platform.store.set('platform:menu-routes', routes)
                         ↓
                    跳转：platform.router.push(redirect || '/')
                    （redirect 来自 store 的 auth:redirect，登录后回跳）
```

**Token 保存方式**：
- `@fmac/auth` 当前为纯内存态存储 Token / 用户信息 / 权限（无持久化）
- 「待实现」：需在 `setup()` 时配置持久化策略（如 localStorage / sessionStorage），确保刷新页面后登录态不丢失
- Token 通过 `platform.auth.getToken()` 统一获取

**用户信息共享**：
- 主应用登录后将用户信息写入 `platform.store`（`current:user`）
- 子应用通过 qiankun props 获取同一个 `platform` 实例
- 子应用通过 `platform.auth.getUser()` 直接读取

**子应用获取登录状态**：
- 子应用通过 `platform.auth.isLogged()` 检查
- 请求自动携带 Token（`@fmac/request` 拦截器注入）
- Token 过期由子应用发出 `AUTH_EXPIRED` 事件，主应用统一处理

**关键代码位置**：
- 主应用认证入口：`apps/main/src/views/Login.vue`
- 会话处理：`apps/main/src/platform/session.js`
- 认证能力：`packages/auth/src/auth.js`
- 菜单解析：`packages/auth/src/menu.js`

### 3.2 超时处理

#### 迁移后流程

```
用户操作
  │
  ▼
子应用 @fmac/request 响应拦截器检测到 401/403
  │
  ▼
子应用发出 event.emit('auth:expired')
  │
  ▼
主应用 session.js 监听 AUTH_EXPIRED 事件
  │
  ▼
platform.message.confirm({ title: '提示', content: '登录状态已失效，请重新登录' })
  │
  ├─ 点击「重新登录」→ clearSession()
  │                     ├── platform.auth.logout()
  │                     ├── platform.tab.clear()
  │                     ├── platform.cache.clear()
  │                     └── platform.store.remove('platform:menu')
  │                   goLogin(redirect)
  │                     └── platform.router.push('/login')
  │
  └─ 关闭弹窗 → 不做处理（用户可继续使用，但请求仍会失败）
                （待确认：是否需要强制退出？）
```

**关键代码位置**：`apps/main/src/platform/session.js`

**超时检测位置**：
- `@fmac/request` 的响应错误拦截器（统一检测 HTTP 状态码）
- 主应用 `session.js` 注册 `AUTH_EXPIRED` 事件监听

**弹窗位置**：
- 主应用通过 `platform.message.confirm()` 弹出（Element UI 适配器）
- 子应用禁止自行弹出登录对话框

**子应用通知机制**：
- 子应用通过 `event.emit('auth:expired')` 通知主应用
- 主应用统一处理登出流程
- 子应用在 `unmount` 时清理所有状态

**异常处理**：
- 网络断开：`@fmac/request` 错误拦截器分类处理
- Token 刷新：「待确认」是否支持无感刷新，若支持则在拦截器内实现
- 多标签冲突：主应用登出后所有标签清空，无需处理并发

### 3.3 路由拦截处理

#### 迁移后路由结构

```
┌─────────────────────────────────────────────────┐
│  layout 主应用路由（vue-router 3.x）              │
│                                                   │
│  /login          → Login.vue（无 Layout 壳）      │
│  /               → Layout.vue                     │
│    ├── /home     → Home.vue                       │
│    ├── /about    → About.vue                      │
│    ├── /micro/*  → MicroContainer.vue             │
│    │   ├── /micro/user/*    → qiankun 加载 user   │
│    │   ├── /micro/order/*   → qiankun 加载 order  │
│    │   └── /micro/report/*  → qiankun 加载 report │
│    └── /finance/* → MicroContainer.vue            │
│                      → qiankun 加载 finance-demo  │
└─────────────────────────────────────────────────┘
```

**主应用职责**：
- 维护顶层路由表（`/login`、`/`、`/home`、`/about`、`/micro/*`、`/finance/*`）
- 路由守卫（待实现）：登录态检查、权限校验
- 菜单路由注册：根据后端菜单动态生成子应用路由映射
- 子应用容器管理：`#subapp-viewport`

**子应用职责**：
- 维护自身业务路由（如 user 的 `/`、`/detail/:id`）
- 路由 base 从 `@fmac/constants` 获取（如 `/micro/user`）
- 独立运行时 base 为 `/`，qiankun 内运行时 base 为 activeRule

**权限控制位置**：
- 菜单级权限：主应用从后端获取菜单 → `parseMenu()` 解析 → 渲染侧边栏
- 路由级权限（待实现）：主应用路由守卫检查 `platform.auth.hasPermission()`
- 页面级权限：子应用内通过 `platform.auth.hasRole()` / `hasPermission()` 检查

**路由生命周期**：
1. 用户访问 URL
2. 主应用路由守卫检查登录态（待实现：需添加 `router.beforeEach`）
3. 匹配到 `/micro/*` → qiankun 根据 activeRule 加载对应子应用
4. 子应用内部路由接管渲染
5. `platform.router.onChange` 触发 `afterRoute` 钩子
6. 主应用更新标签页（`platform.tab.add()`）

### 3.4 标签页处理

#### 迁移后方案

**标签数据存储位置**：
- `@fmac/tab` 单例管理所有标签状态
- 数据结构：`{ key, title, path, closable, meta }`
- 主应用 `AppTabs.vue` 订阅 `platform.tab.subscribe()` 渲染标签栏

**标签与路由关系**：
- 菜单点击 → `menuToTab(node)` 生成标签数据 → `platform.tab.add(tab)`
- 标签激活 → `platform.tab.setActive(key)` → `platform.router.push(path)`
- 路由变化 → `onChange` 钩子 → 自动同步标签激活状态

**KeepAlive 方案**：
- 「待实现」主应用 Layout 内使用 `<keep-alive>` 包裹 `<router-view>`，缓存主应用页面组件（如 Home、About）
- 当前 `Layout.vue` 使用裸 `<router-view />`，无缓存
- 子应用由 qiankun 管理生命周期：导航离开时 `unmount`，再次进入时重新 `mount`
- qiankun 的 `sandbox` 机制会在内存中保留子应用的全局状态，但 DOM 会被清理
- 「待确认」：是否需要子应用级别的 KeepAlive（如缓存子应用 Vue 实例），需评估内存占用和用户体验

**跨应用标签同步方案**：
- 子应用通过共享 `platform.tab` 实例添加标签（如 finance-demo 的 `openTab()`）
- 主应用 `AppTabs.vue` 自动响应标签变化
- 关闭标签时自动激活相邻标签（`@fmac/tab` 内置逻辑）
- 刷新标签通过 `platform.tab.refresh(key)` 触发事件，子应用监听并重新加载数据

---

## 四、WMS 子应用迁移方案

WMS（仓储管理系统）是复杂业务应用，迁移工作量最大。

### 4.1 单应用内部通信

#### 当前可能存在的通信方式（待确认）

| 方式 | 场景 | 迁移策略 |
|------|------|---------|
| Vuex | 全局状态管理 | 保留应用内 Vuex 或迁移至 `@fmac/store` |
| EventBus | 模块间事件通信 | 保留应用内 EventBus 或迁移至 `@fmac/event` |
| 父子组件 props/$emit | 组件树内通信 | 保持不变，Vue 原生机制 |
| URL 参数 | 页面间传参 | 迁移至 `@fmac/router` 的 query 参数 |
| 全局变量（window） | 跨模块共享 | 禁止，迁移至 `@fmac/store` |

#### 推荐迁移方案

**应用内状态管理**：
- 简单场景：使用 Vue 2.7 内置的 `reactive` / `ref`（Composition API）
- 复杂场景：保留 Vuex（应用内状态管理仍可使用 Vuex）
- 跨应用状态：必须使用 `@fmac/store`，禁止 window / sessionStorage

**模块间通信**：
- 应用内模块：使用 `@fmac/event`（应用内实例）或保留 EventBus
- 跨应用模块：必须使用共享 `@fmac/event`（通过 qiankun props 注入）

**页面间通信**：
- 统一使用 `@fmac/router` 的 `push({ path, query })` 传参
- 复杂数据通过 `@fmac/store` 中转

### 4.2 跨应用通信

#### 通信架构

```
┌──────────────────────────────────────────────┐
│                layout 主应用                   │
│  ┌──────────────────────────────────────────┐ │
│  │  @fmac/core（platform 实例）              │ │
│  │  ├── store    → 跨应用共享状态            │ │
│  │  ├── event    → 跨应用事件总线            │ │
│  │  ├── router   → 统一路由                  │ │
│  │  ├── auth     → 认证状态                  │ │
│  │  └── tab      → 标签管理                  │ │
│  └──────────────────────────────────────────┘ │
│           │ qiankun props 注入                 │
├───────────┼──────────────────────────────────┤
│           ▼                                   │
│  ┌────────┐  ┌────────┐  ┌────────┐         │
│  │  wms   │  │  frs   │  │  ocr   │  ...    │
│  │bindShar│  │bindShar│  │bindShar│         │
│  │ePlatfo │  │ePlatfo │  │ePlatfo │         │
│  │rm()    │  │rm()    │  │rm()    │         │
│  └────────┘  └────────┘  └────────┘         │
└──────────────────────────────────────────────┘
```

#### 通信内容

| 通信内容 | 方式 | 说明 |
|---------|------|------|
| 登录状态 | `platform.auth` | 共享 auth 实例，子应用直接读取 |
| 用户信息 | `platform.store` | `current:user` key |
| 权限信息 | `platform.auth` | `hasPermission()` / `hasRole()` |
| 页面跳转 | `platform.router` | 跨应用导航使用共享 router |
| 参数传递 | `platform.store` | 临时数据存入共享 store |
| 标签同步 | `platform.tab` | 子应用可添加/关闭标签 |

#### 通信方式选择

| 方式 | 推荐度 | 原因 |
|------|--------|------|
| qiankun props | ★★★★★ | 主应用注入 platform 实例，子应用通过 `bindSharedPlatform()` 接入 |
| `@fmac/store` | ★★★★★ | 跨应用状态管理，支持 subscribe 响应式更新 |
| `@fmac/event` | ★★★★☆ | 跨应用事件通信，适合临时/异步通知 |
| `@fmac/router` | ★★★★★ | 跨应用导航唯一入口 |
| window 事件 | ☆☆☆☆☆ | 禁止使用，无法隔离，无法测试 |
| URL 参数 | ★★☆☆☆ | 仅限简单参数，复杂数据不适合 |

**推荐方案**：通过 qiankun props 注入 `platform` 实例，子应用调用 `bindSharedPlatform(props.platform)` 接入共享能力。所有跨应用通信统一经由 `@fmac/store`（状态）、`@fmac/event`（事件）、`@fmac/router`（导航）。

### 4.3 WMS 迁移工作量评估（待确认）

WMS 作为复杂业务应用，迁移工作量取决于以下因素（待确认）：
- 页面数量（待确认）
- 模块数量（待确认）
- 是否存在全局状态（待确认）
- 是否有自定义组件库（待确认）
- API 接口数量（待确认）

---

## 五、普通业务子应用迁移方案

以下 6 个普通业务子应用按照统一模式迁移。每个子应用的迁移模板参考已有的 `apps/user`（Vite 方案）或 `apps/finance-demo`（webpack 方案）。

### 5.1 FRS（财务报表系统）

#### 当前情况（待确认）

| 项目 | 说明 |
|------|------|
| 技术栈 | 待确认（推测 Vue 2） |
| 独立部署 | 待确认 |
| 依赖 layout | 是，作为 layout 子目录 |

#### 改造内容

1. **微前端接入**：
   - 新建 `apps/frs/` 目录
   - 添加 `package.json`、`vite.config.js`（推荐 Vite）
   - 实现 qiankun 生命周期（`bootstrap` / `mount` / `unmount`）
   - 配置 `vite-plugin-qiankun`，设置 app 名称 `app-frs`

2. **登录接入**：
   - 创建 `platform.js`，引入 `@fmac/core`
   - 调用 `bindSharedPlatform(props.platform)` 接入共享认证
   - 请求拦截器注入 Token

3. **路由调整**：
   - 路由 base 从 `@fmac/constants` 的 `SUBAPPS` 获取
   - 独立运行时 base 为 `/`，qiankun 内为 activeRule

4. **公共能力接入**：
   - HTTP 请求：`@fmac/request` 替换原有 axios / fetch
   - 状态管理：跨应用状态使用 `@fmac/store`
   - 消息提示：`@fmac/message` 替换 `this.$message`
   - 加载状态：`@fmac/loading` 替换原有 loading

#### 工作量评估

| 内容 | 工作量 |
|------|--------|
| 改造 | 3-5 人天（待确认页面数量） |
| 测试 | 2-3 人天 |
| 联调 | 1-2 人天 |

### 5.2 OCR（OCR 识别系统）

#### 当前情况（待确认）

| 项目 | 说明 |
|------|------|
| 技术栈 | 待确认 |
| 独立部署 | 待确认 |
| 依赖 layout | 是 |

#### 改造内容

与 FRS 相同，按统一模板迁移。OCR 可能涉及文件上传、图片预览等功能，需额外关注：
- 文件上传通过 `@fmac/request` 的 FormData 支持
- 图片预览组件迁移（待确认是否使用第三方库）

#### 工作量评估

| 内容 | 工作量 |
|------|--------|
| 改造 | 2-4 人天（待确认） |
| 测试 | 1-2 人天 |
| 联调 | 1 人天 |

### 5.3 PIC（图片管理系统）

#### 当前情况（待确认）

| 项目 | 说明 |
|------|------|
| 技术栈 | 待确认 |
| 独立部署 | 待确认 |
| 依赖 layout | 是 |

#### 改造内容

与 FRS 相同。PIC 可能涉及大量图片处理，需关注：
- 图片懒加载组件迁移
- 大图预览 / 缩放功能
- 文件上传 / 裁剪功能

#### 工作量评估

| 内容 | 工作量 |
|------|--------|
| 改造 | 2-4 人天（待确认） |
| 测试 | 1-2 人天 |
| 联调 | 1 人天 |

### 5.4 PlatMng（平台管理系统）

#### 当前情况（待确认）

| 项目 | 说明 |
|------|------|
| 技术栈 | 待确认 |
| 独立部署 | 待确认 |
| 依赖 layout | 是 |

#### 改造内容

与 FRS 相同。PlatMng 作为管理平台，可能涉及：
- 权限配置页面（需与 `@fmac/auth` 的权限模型对齐）
- 系统配置页面
- 用户管理页面（可能与 user 子应用有交叉，待确认）

#### 工作量评估

| 内容 | 工作量 |
|------|--------|
| 改造 | 3-5 人天（待确认） |
| 测试 | 2-3 人天 |
| 联调 | 1-2 人天 |

### 5.5 FnDrSch（资金调度系统）

#### 当前情况（待确认）

| 项目 | 说明 |
|------|------|
| 技术栈 | 待确认 |
| 独立部署 | 待确认 |
| 依赖 layout | 是 |

#### 改造内容

与 FRS 相同。资金调度系统可能涉及：
- 复杂表单（需确认表单组件迁移方案）
- 数据校验逻辑
- 审批流程集成（可能与 workflow 有交互）

#### 工作量评估

| 内容 | 工作量 |
|------|--------|
| 改造 | 3-5 人天（待确认） |
| 测试 | 2-3 人天 |
| 联调 | 1-2 人天 |

### 5.6 Workflow（工作流系统）

#### 当前情况（待确认）

| 项目 | 说明 |
|------|------|
| 技术栈 | 待确认 |
| 独立部署 | 待确认 |
| 依赖 layout | 是 |

#### 改造内容

与 FRS 相同。工作流系统可能涉及：
- 流程设计器（可能使用第三方库如 bpmn.js，待确认）
- 流程状态展示
- 跨应用审批通知（通过 `@fmac/event` 实现）

#### 工作量评估

| 内容 | 工作量 |
|------|--------|
| 改造 | 3-5 人天（待确认） |
| 测试 | 2-3 人天 |
| 联调 | 1-2 人天 |

---

## 六、整体迁移架构设计

### 6.1 迁移后系统架构

```mermaid
graph TD
    User[用户浏览器]

    subgraph 部署层
        NginxMain[Nginx 主应用]
        NginxSub[Nginx 子应用 x7]
    end

    subgraph 主应用
        Layout[layout 主应用<br/>webpack 4 / 端口 7100]
        Core[平台核心<br/>@fmac/core]
        Session[会话管理<br/>session.js]
    end

    subgraph 公共能力层 - 经 Core 聚合
        Auth[认证鉴权<br/>@fmac/auth]
        Store[跨应用状态<br/>@fmac/store]
        Event[跨应用事件<br/>@fmac/event]
        Router[统一路由<br/>@fmac/router]
        Request[统一请求<br/>@fmac/request]
        Cache[数据缓存<br/>@fmac/cache]
        Tab[标签管理<br/>@fmac/tab]
        Loading[全局加载<br/>@fmac/loading]
        Message[消息提示<br/>@fmac/message]
    end

    subgraph 业务子应用
        WMS[wms<br/>仓储管理]
        FRS[frs<br/>财务报表]
        OCR[ocr<br/>OCR识别]
        PIC[pic<br/>图片管理]
        PlatMng[platmng<br/>平台管理]
        FnDrSch[fndrsch<br/>资金调度]
        Workflow[workflow<br/>工作流]
    end

    subgraph 配置中心
        Constants[@fmac/constants]
        Env[@fmac/env]
    end

    User -->|首次访问| NginxMain
    NginxMain --> Layout
    User -->|qiankun 直连| NginxSub

    Layout --> Core
    Core --> Auth
    Core --> Store
    Core --> Event
    Core --> Router
    Core --> Request
    Core --> Cache
    Core --> Tab
    Core --> Loading
    Core --> Message

    Core -->|qiankun props 注入| WMS
    Core -->|qiankun props 注入| FRS
    Core -->|qiankun props 注入| OCR
    Core -->|qiankun props 注入| PIC
    Core -->|qiankun props 注入| PlatMng
    Core -->|qiankun props 注入| FnDrSch
    Core -->|qiankun props 注入| Workflow

    Layout --> Constants
    Layout --> Env
```

### 6.2 职责划分

| 层级 | 职责 |
|------|------|
| **主应用（layout）** | 登录认证、菜单管理、路由守卫（待实现）、标签管理、子应用注册与生命周期管理、会话超时处理、全局 Layout 渲染（Header / Sidebar / Tabs） |
| **子应用（wms/frs/ocr/...）** | 自身业务逻辑、应用内路由、应用内状态管理、API 调用、页面渲染 |
| **公共能力（@fmac/*）** | 跨应用通信（store/event）、统一请求（request）、统一路由（router）、认证鉴权（auth）、缓存（cache）、标签（tab）、加载（loading）、消息（message）、插件（plugin）、UI 适配（ui-adapter） |
| **配置中心（@fmac/constants + @fmac/env）** | 应用注册表、路由前缀、事件名称、Store Key、环境地址 |

### 6.3 通信方式

| 通信场景 | 方式 | 数据流向 |
|---------|------|---------|
| 登录状态同步 | `@fmac/auth` 共享实例 | 主应用 → 子应用 |
| 跨应用数据共享 | `@fmac/store` | 双向 |
| 跨应用事件通知 | `@fmac/event` | 单向广播 |
| 跨应用页面跳转 | `@fmac/router`（共享 router） | 发起方 → 主应用路由 |
| 子应用 → 主应用（协议事件） | `@fmac/event`（AUTH_EXPIRED / GO_LOGIN / GO_HOME） | 子应用 → 主应用 |
| 标签操作 | `@fmac/tab` 共享实例 | 子应用 → 主应用标签栏 |

---

## 七、打包流程设计

### 7.1 开发环境流程

```
1. 安装依赖
   $ pnpm install
   （自动安装所有应用和包的依赖）

2. 启动主应用
   $ pnpm --filter @fmac/app-main dev
   （webpack-dev-server，端口 7100）

3. 启动子应用（按需启动）
   $ pnpm --filter @fmac/app-wms dev      # 待创建
   $ pnpm --filter @fmac/app-frs dev      # 待创建
   $ pnpm --filter @fmac/app-ocr dev      # 待创建
   ...

4. 一键启动所有应用
   $ pnpm dev
   （并行启动所有 apps/* 下的应用）

5. 联调方式
   - 主应用通过 @fmac/env 的 SUBAPPS 配置指向各子应用 localhost 地址
   - 子应用 devServer 开启 CORS（Vite: server.cors: true，webpack: headers）
   - qiankun 从 localhost 加载子应用
```

### 7.2 构建流程

```
源码
  │
  ▼
pnpm install（安装依赖）
  │
  ▼
pnpm check:arch（架构守卫检查，失败则中止）
  │
  ▼
pnpm lint（ESLint 检查）
  │
  ▼
pnpm test（Vitest 单元测试）
  │
  ▼
pnpm build（构建所有应用）
  │
  ├── apps/main        → dist/（webpack 4 产物）
  ├── apps/wms         → dist/（Vite 或 webpack，待确认）
  ├── apps/frs         → dist/
  ├── apps/ocr         → dist/
  ├── apps/pic         → dist/
  ├── apps/platmng     → dist/
  ├── apps/fndrsch     → dist/
  └── apps/workflow    → dist/
```

**环境变量**：
- `APP_MODE`：`development` / `test` / `production`，驱动 `@fmac/env` 解析
- `VITE_API_BASE`：API 网关地址覆盖
- `VITE_SUB_USER` / `VITE_SUB_ORDER` / ...：子应用入口地址覆盖
- `NODE_OPTIONS=--openssl-legacy-provider`：webpack 4 应用（main / finance-demo）在 Node >= 17 下构建必需，已内置于 `package.json` scripts 中

**构建顺序**：
1. `packages/*` 和 `configs/*` 为纯 ESM 源码，无需预构建
2. 各 `apps/*` 独立构建，互不依赖构建产物
3. 构建可并行执行

**产物结构**（以主应用为例）：
```
dist/
├── index.html
└── assets/
    ├── main.[contenthash:8].js
    ├── main.[contenthash:8].css
    ├── element-icons.[hash].woff
    └── element-icons.[hash].ttf
```

---

## 八、部署流程设计

### 8.1 部署架构

```
用户浏览器
  │
  ├── 首次访问 ──→ Nginx-main ──→ layout 主应用 dist/
  │
  ├── qiankun 加载子应用（浏览器直连）
  │     ├── → Nginx-user     → user 子应用 dist/     （/micro/user/*）
  │     ├── → Nginx-order    → order 子应用 dist/    （/micro/order/*）
  │     ├── → Nginx-report   → report 子应用 dist/   （/micro/report/*）
  │     ├── → Nginx-finance  → finance 子应用 dist/  （/finance/*）
  │     ├── → Nginx-wms      → wms 子应用 dist/      （/wms/*，待规划）
  │     ├── → Nginx-frs      → frs 子应用 dist/      （/frs/*，待规划）
  │     └── → ...            → 其他子应用
  │
  └── API 请求 ──→ Nginx-main /api/* ──→ 后端 API 网关（proxy_pass）
```

> **说明**：qiankun 在浏览器端根据 `@fmac/env` 中配置的子应用 entry 地址（如 `//fmac-wms.example.com`）直接加载子应用资源，不经过主应用 Nginx 转发。每个子应用拥有独立的 Nginx 实例和域名。

### 8.2 Nginx 部署

**主应用配置**（参考 `configs/nginx/main.conf`）：

```nginx
server {
    listen 80;
    server_name fmac.example.com;
    root /usr/share/nginx/html/fmac-main;

    # 主应用 SPA history 模式（/login、/、/home 等）
    location / {
        try_files $uri $uri /index.html;
    }

    # 静态资源长缓存
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API 反向代理
    location /api/ {
        proxy_pass https://gateway.example.com/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 安全头
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options SAMEORIGIN;
}
```

> **说明**：子应用（`/micro/user/*`、`/finance/*` 等）由各自独立的 Nginx 实例服务，主应用 Nginx 无需代理这些路由。qiankun 在浏览器端根据 `@fmac/env` 中配置的子应用 entry 地址直接加载对应子应用。

**子应用配置**（参考 `configs/nginx/subapp.conf`）：

```nginx
server {
    listen 80;
    server_name fmac-wms.example.com;  # 每个子应用独立域名
    root /usr/share/nginx/html/fmac-wms;

    # CORS 头（qiankun 跨域加载必需）
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
    add_header Access-Control-Allow-Headers "Content-Type";

    # SPA history 模式
    location / {
        try_files $uri $uri /index.html;
    }

    # 静态资源长缓存
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 8.3 子应用部署

| 项目 | 方案 |
|------|------|
| 是否独立部署 | 是，每个子应用独立部署到自己的域名/路径 |
| 发布流程 | 子应用独立 CI/CD：代码推送 → 构建 → 上传 dist → Nginx 更新 |
| 版本管理 | 通过构建产物 contenthash 管理版本；`@fmac/env` 中 SUBAPPS 地址指向对应版本 |
| 回滚方案 | 保留上一版本 dist 目录，回滚时 Nginx root 指回上一版本 |

### 8.4 灰度发布方案（待确认）

- 可通过 Nginx upstream 权重实现灰度
- 可通过 CDN 版本切换实现灰度
- 具体方案待根据实际运维基础设施确认

---

## 九、测试范围设计

### 9.1 基础功能测试

| 测试项 | 测试内容 | 优先级 |
|--------|---------|--------|
| 登录 | SSO 登录、Token 存储、用户信息获取 | P0 |
| 登出 | 主动登出、状态清理、跳转登录页 | P0 |
| 权限 | 菜单权限、路由权限、页面元素权限 | P0 |
| 菜单 | 菜单渲染、菜单解析、动态菜单 | P0 |
| 路由 | 主应用路由、子应用路由、路由守卫 | P0 |
| 超时 | Token 过期检测、弹窗提示、重新登录 | P0 |

### 9.2 微前端测试

| 测试项 | 测试内容 | 优先级 |
|--------|---------|--------|
| 子应用加载 | 各子应用正常加载并渲染 | P0 |
| 子应用切换 | 切换子应用时状态正确清理 | P0 |
| 子应用卸载 | unmount 后 DOM / 事件 / 定时器全部清理 | P0 |
| 生命周期 | bootstrap / mount / unmount 正确执行 | P1 |
| 样式隔离 | 子应用样式不污染主应用和其他子应用 | P1 |
| JS 沙箱 | 子应用全局变量不互相污染 | P1 |
| 独立运行 | 各子应用可独立启动和运行 | P1 |

### 9.3 通信测试

| 测试项 | 测试内容 | 优先级 |
|--------|---------|--------|
| Store 数据传递 | 主应用写入 → 子应用读取 → 数据一致 | P0 |
| Store 响应式 | 主应用更新 → 子应用 subscribe 回调触发 | P0 |
| Event 事件 | 子应用 emit → 其他子应用 on 接收 | P0 |
| 协议事件 | AUTH_EXPIRED / GO_LOGIN / GO_HOME 正确处理 | P0 |
| 跨应用导航 | 子应用 A → 子应用 B 页面跳转 | P1 |
| 标签同步 | 子应用打开标签 → 主应用标签栏更新 | P1 |
| Tab 刷新 | 标签刷新事件 → 子应用重新加载数据 | P1 |

### 9.4 业务回归测试

| 应用 | 测试范围 | 优先级 |
|------|---------|--------|
| **wms** | 全部业务功能回归（核心应用，工作量最大） | P0 |
| **frs** | 报表查询、数据展示、导出功能 | P1 |
| **ocr** | OCR 识别、结果展示、文件上传 | P1 |
| **pic** | 图片上传、预览、管理 | P1 |
| **platmng** | 平台配置、权限管理、系统设置 | P1 |
| **fndrsch** | 资金调度、审批流程、数据校验 | P1 |
| **workflow** | 流程设计、流程审批、状态流转 | P1 |

### 9.5 单元测试现状

当前新框架已有 76 个单元测试用例，覆盖：

| 包 | 测试文件数 | 测试用例数 |
|----|-----------|-----------|
| shared | 3 | 多 |
| store | 1 | 多 |
| request | 1 | 多 |
| cache | 1 | 多 |
| loading | 1 | 多 |
| router | 1 | 多 |
| message | 1 | 多 |
| event | 1 | 多 |
| tab | 1 | 多 |
| auth | 1 | 多 |
| plugin | 1 | 多 |
| core | 1 | 多 |

覆盖率约 71% Statements / 74% Lines / 71% Functions。

---

## 十、工作量评估

### 10.1 详细评估

| 模块 | 工作内容 | 人天 | 风险 |
|------|---------|------|------|
| **layout 主应用** | 登录认证迁移、菜单管理、路由守卫、标签管理、会话超时处理、Layout UI | 8-10 | 中：需与旧 SSO 系统对接 |
| **wms** | 页面迁移、内部通信改造、跨应用通信、API 对接、组件迁移 | 15-25 | 高：最复杂业务应用，页面数量待确认 |
| **frs** | 微前端接入、登录接入、路由调整、公共能力接入 | 5-8 | 低：标准迁移模板 |
| **ocr** | 微前端接入、登录接入、路由调整、公共能力接入 | 3-5 | 低 |
| **pic** | 微前端接入、登录接入、路由调整、公共能力接入 | 3-5 | 低 |
| **platmng** | 微前端接入、登录接入、路由调整、公共能力接入、权限对接 | 5-8 | 中：涉及权限体系对接 |
| **fndrsch** | 微前端接入、登录接入、路由调整、公共能力接入 | 5-8 | 中：可能涉及审批流程 |
| **workflow** | 微前端接入、登录接入、路由调整、公共能力接入、流程设计器迁移 | 5-8 | 中：流程设计器可能依赖第三方库 |
| **配置中心** | @fmac/constants 应用注册表、@fmac/env 环境配置 | 2-3 | 低 |
| **Nginx 部署** | 主应用 + 7 个子应用 Nginx 配置 | 2-3 | 低 |
| **联调测试** | 全链路联调、微前端通信测试 | 5-8 | 中 |
| **业务回归测试** | 7 个子应用全量功能回归 | 10-15 | 中 |
| **性能测试** | 首屏加载、子应用切换、内存泄漏 | 3-5 | 中 |

### 10.2 汇总

| 类别 | 人天 |
|------|------|
| 开发 | 51-80 |
| 测试 | 15-28 |
| 部署 | 2-3 |
| **合计** | **68-111** |

### 10.3 人员配置建议

| 角色 | 人数 | 职责 |
|------|------|------|
| 技术负责人 | 1 | 架构把控、技术方案决策、代码审查 |
| 高级前端 | 2 | 主应用 + WMS 迁移（核心难点） |
| 中级前端 | 2-3 | 普通子应用迁移（frs / ocr / pic / platmng / fndrsch / workflow） |
| 测试工程师 | 1-2 | 功能测试 + 回归测试 |

### 10.4 预计周期

- **乐观**：8-10 周（5 人团队）
- **正常**：10-14 周（5 人团队）
- **保守**：14-18 周（4 人团队，含业务熟悉时间）

---

## 十一、开发计划

### Phase 1：基础能力建设（已完成 ✅）

**内容**：
- [x] Monorepo 初始化（pnpm workspace）
- [x] 13 个 @fmac/* 能力包开发
- [x] 配置中心（@fmac/constants + @fmac/env）
- [x] 架构守卫（@fmac/arch-check）
- [x] 示例子应用验证（user / order / report / finance-demo）
- [x] 构建工具双轨验证（Vite + webpack 4）
- [x] 单元测试（76 用例，71% 覆盖率）
- [x] Nginx 部署配置模板

### Phase 2：Layout 主应用迁移（预估 2-3 周）

**内容**：
- [ ] 旧 SSO 登录系统对接分析（待确认）
- [ ] 主应用 Login 页面适配旧 SSO（当前为 Mock 登录）
- [ ] 路由守卫实现（当前 `router/index.js` 无 `beforeEach`，需添加登录态检查）
- [ ] Token 持久化实现（当前 `@fmac/auth` 为纯内存态，刷新页面丢失登录态）
- [ ] 菜单 API 对接（当前为 Mock 数据）
- [ ] 真实权限数据接入 `@fmac/auth`
- [ ] Layout `<keep-alive>` 实现（当前 `Layout.vue` 无页面缓存）
- [ ] Layout UI 适配旧系统设计风格（待确认是否需要 1:1 还原）
- [ ] 会话超时处理对接旧系统 Token 刷新机制（待确认）
- [ ] 标签页功能完善

**里程碑**：主应用可登录、可渲染菜单、可加载子应用

### Phase 3：WMS 迁移（预估 3-5 周）

**内容**：
- [ ] WMS 代码审查，梳理页面清单和依赖（待确认）
- [ ] 创建 `apps/wms/` 项目脚手架
- [ ] 页面逐个迁移（路由、组件、API）
- [ ] 内部通信改造（Vuex → @fmac/store 或保留应用内 Vuex）
- [ ] 跨应用通信接入
- [ ] 联调测试

**里程碑**：WMS 核心功能可用

### Phase 4：其他业务应用迁移（预估 4-6 周）

**迁移顺序**：

```
frs（财务报表）     → 1 周
ocr（OCR 识别）     → 0.5-1 周
pic（图片管理）     → 0.5-1 周
platmng（平台管理） → 1 周
fndrsch（资金调度） → 1 周
workflow（工作流）  → 1 周
```

每个应用按统一模板迁移：
1. 创建项目脚手架（参考 `apps/user` 或 `apps/finance-demo`）
2. 迁移页面和路由
3. 接入公共能力（request / store / event / message / loading）
4. 接入认证（bindSharedPlatform）
5. 联调测试

**里程碑**：所有子应用迁移完成

### Phase 5：测试上线（预估 2-3 周）

**内容**：
- [ ] 集成测试：全链路功能测试
- [ ] 微前端专项测试：加载、切换、卸载、样式隔离、JS 沙箱
- [ ] 通信测试：store / event / router 跨应用验证
- [ ] 性能测试：首屏加载时间、子应用切换耗时、内存占用
- [ ] 业务回归测试：7 个子应用全量功能回归
- [ ] 灰度发布：选择 1-2 个子应用先上线验证
- [ ] 正式上线：全量子应用切换

**里程碑**：全量上线，旧系统下线

---

## 十二、风险分析

| 风险 | 影响 | 概率 | 解决方案 |
|------|------|------|---------|
| **微前端兼容问题** | 子应用样式冲突、JS 沙箱逃逸、CSS 隔离失效 | 中 | 使用 qiankun strictStyleIsolation（已启用）；逐个应用验证；预留 Shadow DOM 降级方案 |
| **登录体系变化** | 旧 SSO 对接方式不明确，Token 格式/刷新机制可能不兼容 | 高 | 提前调研旧 SSO 接口；在 `@fmac/request` 拦截器中适配；必要时在 `@fmac/auth` 增加 Token 刷新逻辑 |
| **路由冲突** | 主应用与子应用路由规则冲突，activeRule 匹配异常 | 中 | 统一使用 `@fmac/constants` 管理 activeRule；子应用路由 base 严格从配置获取；架构守卫自动检查 |
| **通信机制变化** | 旧系统通信方式多样，迁移后部分场景覆盖不到 | 中 | 制定通信规范文档；禁止 window / localStorage 跨应用通信；arch-check 自动扫描违规引用 |
| **老代码耦合** | WMS 等复杂应用内部耦合严重，拆解困难 | 高 | 先完整迁移再逐步解耦；允许应用内保留 Vuex / EventBus；跨应用通信必须走 @fmac/* |
| **部署方式变化** | 从整体部署变为独立部署，运维流程变化大 | 中 | 提前与运维团队对齐 Nginx 配置；提供部署文档；灰度发布验证 |
| **webpack 4 EOL** | webpack 4 已停止维护，Node >= 17 需要 `--openssl-legacy-provider` | 低 | 当前可用；中期规划迁移至 webpack 5 或统一至 Vite |
| **第三方库兼容** | 工作流设计器、OCR 组件等第三方库可能不兼容 qiankun 沙箱 | 中 | 提前验证关键第三方库在 qiankun 内的运行情况；必要时使用 `externals` 或 iframe 降级 |
| **性能退化** | 7 个子应用注册后首屏加载变慢 | 中 | 子应用按需加载（qiankun 预加载策略）；静态资源 CDN + 长缓存；首屏性能监控 |
| **团队学习成本** | 团队需要学习新框架和微前端概念 | 中 | 编写迁移指南文档；组织培训；渐进式迁移，先简单应用后复杂应用 |

---

## 十三、最终迁移建议

### 1. 推荐迁移顺序

```
Phase 1 基础能力建设（✅ 已完成）
    │
    ▼
Phase 2 Layout 主应用迁移
    │  ├── 先对接 SSO 登录
    │  ├── 再对接菜单/权限 API
    │  └── 最后完善 Layout UI
    │
    ▼
Phase 3 WMS 迁移（核心，最复杂）
    │  ├── 先迁移核心页面
    │  └── 再迁移辅助页面
    │
    ▼
Phase 4 其他应用迁移（按复杂度排序）
    │  ├── platmng（平台管理，与主应用交互最多，先迁移）
    │  ├── workflow（工作流，可能涉及跨应用审批）
    │  ├── fndrsch（资金调度）
    │  ├── frs（财务报表）
    │  ├── ocr（OCR 识别）
    │  └── pic（图片管理，最简单，最后迁移）
    │
    ▼
Phase 5 测试上线
```

### 2. 是否建议灰度发布

**建议灰度发布**。理由：
- 微前端架构天然支持灰度：可以逐个切换子应用指向新系统
- 降低风险：先上线 1-2 个子应用验证，确认无问题后再全量切换
- 回滚方便：Nginx 层面切换新旧子应用地址即可回滚

### 3. 是否需要双系统并行

**建议短期双系统并行**。理由：
- 迁移期间旧系统继续提供服务，不影响业务
- 新系统逐步接管，按子应用粒度切换
- 并行期可通过 URL 区分（旧系统保持原 URL，新系统使用新域名或路径前缀）

### 4. 是否需要保留旧系统

**建议保留旧系统至少 3 个月**。理由：
- 作为回退方案，新系统出现严重问题时快速切回
- 迁移期间对比验证功能一致性
- 部分边缘功能可能在新系统首版中未覆盖，旧系统作为参考

### 5. 推荐实施策略

1. **渐进式迁移**：不要一次性全部切换，按子应用粒度逐步迁移
2. **先简后难**：先迁移简单子应用（platmng / frs）验证流程，再迁移复杂应用（wms / workflow）
3. **模板化迁移**：所有普通子应用使用统一迁移模板（参考 `apps/user` / `apps/finance-demo`），减少重复工作
4. **自动化守护**：利用 `@fmac/arch-check` 在 CI 中自动检查架构合规性
5. **充分测试**：每个子应用迁移后必须通过微前端专项测试 + 业务回归测试
6. **文档先行**：迁移前先完成旧系统接口文档、业务逻辑文档的梳理
7. **旧系统 SSO 优先对接**：登录认证是所有功能的前提，Phase 2 最优先解决

---

> **文档结束**  
> 标注「待确认」的内容需在实际迁移启动前通过代码审查和业务调研确认。  
> 如有疑问请联系技术负责人。
