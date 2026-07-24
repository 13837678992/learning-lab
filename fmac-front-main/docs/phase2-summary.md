# Phase 2 总结（phase2-summary.md）

> 阶段：Phase 2 主应用能力建设 · 结果 ✅

## 目标达成

| 能力 | 状态 | 关键文件 |
| --- | --- | --- |
| qiankun 注册/启动/生命周期 | ✅ | `src/micro/index.js`、`src/micro/apps.js` |
| 登录（token/session/单点登录/跳转） | ✅ | `src/platform/session.js`、`src/views/Login.vue`、`src/utils/auth.js` |
| 菜单（/api/menu 动态加载子应用） | ✅ | `src/api/menu.js`、`src/micro/apps.js`、`src/layout/AppSidebar.vue` |
| Axios（token 注入 / 401 / 418 / 异常） | ✅ | `src/utils/request.js`、`src/utils/logout.js` |
| 路由守卫（beforeEach/afterEach） | ✅ | `src/router/guards.js` |
| 布局（侧栏/头部/子应用容器） | ✅ | `src/layout/*.vue` |
| 开发态 Mock 后端 | ✅ | `mock/index.js` + `webpack devServer.before` |

## 测试

- `npm run build`：exit 0，无 ERROR/WARNING，qiankun 正常打包。
- `npm run serve`（:7200）：`/` 200、`/api/menu` 与 `/api/login` 返回约定 JSON、`/home` history fallback 200。

## 关键决策

1. **端口 7200/7201**：规避同机运行的参考项目（占用 7100–7104）。
2. **不引入 element-ui**：手写 Layout + 轻量 message，遵循「最小依赖」。
3. **直接使用 qiankun API**（不封装平台 SDK），降低复杂度、符合独立应用模式。
4. **循环依赖治理**：`forceLogout` 独立成 `utils/logout.js`，打断 `request ↔ session` 环。
5. **容器常驻**：`#subapp-viewport` 置于 Layout 并以 `v-show` 切换，规避 qiankun 挂载竞态。
6. **dist 清理**：webpack4 无 `output.clean`，改用 `fs.rmSync` 于生产构建前清理。

## 遗留 / 后续

- initGlobalState 动态通信 → Phase 4。
- 环境文件 `.env.*` 与部署 → Phase 5。
- 子应用实际挂载的端到端验证 → Phase 6（需 app-demo 同时运行）。
