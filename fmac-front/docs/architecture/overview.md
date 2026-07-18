# 架构总览

FMAC Front 是长期维护、可扩展、可升级的企业级微前端平台。硬性约束以根目录 [`CLAUDE.md`](../../CLAUDE.md) 为准；本文与其冲突时以 `CLAUDE.md` 为准。

## 顶级目录

| 目录        | 职责                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------- |
| `apps/`     | 业务子应用（主应用 + 各微应用），**仅写业务**                                               |
| `packages/` | 平台公共能力，框架无关（`ui-adapter` 除外）                                                 |
| `configs/`  | 工程配置（eslint / prettier / env·constants 配置中心 / arch-check 架构守卫 / webpack 预留） |
| `docs/`     | 架构与开发文档                                                                              |

顶级目录固定为以上四个，**禁止新增**。

## 分层

```
apps                                              业务层，只依赖 core
  ↓
core                                              组合根，唯一可引用 qiankun；统一 Hook / 异常 / 插件
  ↓
router store request event loading message        中间能力层，
cache auth tab ui-adapter plugin                  彼此不互相引用
  ↓
shared                                            最底层通用工具/原语，不依赖任何 package
```

依赖方向**自上而下**，禁止反向、循环、apps 互相依赖、中间层交叉引用。详见 [dependency.md](./dependency.md)。

## 能力包职责

| package      | 职责                                                                                |
| ------------ | ----------------------------------------------------------------------------------- |
| `shared`     | 通用工具、日志、断言、事件原语、Hook、统一异常                                      |
| `router`     | 统一路由 push/replace/back/reload（适配器隔离底层）                                 |
| `store`      | 跨应用共享状态 get/set/subscribe                                                    |
| `request`    | 统一请求 get/post（适配器隔离 fetch/axios）                                         |
| `event`      | 跨应用事件总线 on/off/once/emit                                                     |
| `loading`    | 全局加载态（引用计数 + 适配器）                                                     |
| `message`    | 消息提示 success/error/warning/confirm（适配器）                                    |
| `cache`      | 数据缓存（TTL + storage 适配）                                                      |
| `auth`       | 登录态与权限                                                                        |
| `tab`        | 多标签页管理                                                                        |
| `ui-adapter` | 框架适配层：UI 呈现（loading/message）+ vue-router 适配器（**唯一**可依赖具体框架） |
| `plugin`     | 插件扩展机制（register/install/get）                                                |
| `core`       | 组合各能力 + qiankun + 统一 Hook/异常/插件                                          |

## 平台级机制（core）

- **Hook**：`beforeBootstrap`/`afterBootstrap`/`before|afterMount`/`before|afterUnmount`/`before|afterRoute`/`before|afterRequest`，框架无关，见 [micro-frontend.md](./micro-frontend.md)。
- **统一异常**：`micro`/`route`/`request`/`auth`/`lifecycle` 收敛到 `platform.errorHandler`，默认经统一 logger 输出。
- **插件**：`platform.use(plugin)`，预留日志/埋点/监控/国际化/主题。

## 框架隔离

除 `ui-adapter` 外，所有 package 保持框架无关，禁止依赖 Vue/Vuex/Pinia/ElementUI/Element Plus/React/Redux。`qiankun` 仅出现在 `core`。

## 演进策略

底层技术（Vue3 / React / Vite / Element Plus / Wujie / Module Federation）替换收敛在 `core` 与 `ui-adapter`；中间能力层对外 API 稳定，业务升级时尽量无需改动。迁移见 [../migration/vue2-to-vue3.md](../migration/vue2-to-vue3.md)。

## 工程守卫与测试

- **配置中心**：`@fmac/constants`（微应用名 / 激活规则 / API 前缀等，环境无关，单一事实源）+ `@fmac/env`（按 mode 解析网关与子应用 entry）。主应用注册表、子应用 router base / request baseURL 均从此派生，杜绝重复与漂移。
- **架构守卫**：`pnpm check:arch`（`configs/arch-check`，零依赖）自动校验顶级目录 / qiankun 边界 / 依赖方向 / 框架隔离 / apps 边界 / 循环依赖。
- **测试**：`pnpm test`（`vitest`）覆盖能力包（shared/store/request/cache/loading/router）。
- **全量门禁**：`pnpm check` = `check:arch + lint + test`。
