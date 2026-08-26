# Phase Log


> 阶段执行流水记录。
> 每完成一个 Phase 追加记录。


---


# Phase 0 项目分析


执行时间：

2026-07-24


执行目标：

分析当前项目状态。


执行内容：


1. 检查项目目录结构。
2. 确认 main-layout 和 app-demo 均不存在。
3. 分析技术栈目标和约束。
4. 识别当前问题（架构、依赖、构建、微前端）。
5. 评估风险（技术、迁移、兼容）。
6. 制定后续执行方案。


输出文件：


docs/current-analysis.md


结论：


项目处于空白状态，需从零构建。
按 TASK.md 定义的 Phase 顺序逐步推进。


---


# Phase 1 主应用初始化


执行时间：

2026-07-24


执行目标：

创建 main-layout 基础工程。


执行内容：

1. 创建完整工程结构（package.json、webpack、babel、环境配置）。
2. 实现 Vue2 入口、Router、Vuex。
3. 接入 qiankun 基础（registerMicroApps、start、生命周期）。
4. 封装 axios（token 注入、401/418 处理）。
5. 实现 Layout 布局（Header + Sidebar + Content）。
6. 实现 Login 和 Home 页面。
7. 配置 mock 数据。


输出文件：

docs/layout-init.md


结果：构建通过。


---


# Phase 2 主应用能力建设


执行时间：

2026-07-24


执行目标：

完善微前端基座能力。


执行内容：

1. 实现 session 超时检测（platform/session.js）。
2. 实现平台通信桥梁（platform/bridge.js）。
3. 登录后动态获取菜单和用户信息。
4. 菜单驱动侧边栏和子应用注册。
5. 完善路由守卫和 axios 拦截。
6. 集成 logout 流程（停止 session、通知子应用）。


输出文件：

docs/layout.md
docs/phase2-summary.md


结果：构建通过。


---


# Phase 3 子应用建设


执行时间：

2026-07-24


执行目标：

创建 app-demo 子应用。


执行内容：

1. 创建完整工程结构（端口 9001，CORS 开启）。
2. 实现 qiankun 生命周期（bootstrap/mount/unmount）。
3. 实现 public-path 动态配置。
4. 封装独立 request（401/418 通知主应用）。
5. 实现 context.js 通信模块。
6. 实现 Home 和 About 页面。


输出文件：

docs/subapp.md


结果：构建通过（零警告零错误）。


---


# Phase 4 主子应用通信


执行时间：

2026-07-24


执行目标：

建立完整通信机制。


执行内容：

1. 主应用登录后同步 userState 和 menuState。
2. 子应用 mount 时存储 actions。
3. 暴露 window.microApp.logout 供子应用调用。
4. 完善 bridge 监听（路由跳转、退出通知）。


输出文件：

docs/communication.md


结果：构建通过。


---


# Phase 5 部署能力建设


执行时间：

2026-07-24


执行目标：

实现独立部署。


执行内容：

1. 创建 Nginx 多域名配置。
2. 创建 Nginx 单域名配置。
3. 编写部署文档（构建、Nginx、环境变量、部署流程）。


输出文件：

docs/deploy.md
deploy/nginx/fmac-multi-domain.conf
deploy/nginx/fmac-single-domain.conf


结果：配置完成。


---


# Phase 6 测试验收


执行时间：

2026-07-24


执行目标：

全面测试验收。


执行内容：

1. 主应用构建测试通过。
2. 子应用构建测试通过。
3. 验证登录、菜单、session、子应用加载流程。
4. 验证通信机制（状态同步、路由跳转、logout 通知）。
5. 编写测试报告。
6. 补充架构文档、开发指南、API 文档。


输出文件：

docs/test-report.md
docs/architecture.md
docs/develop.md
docs/api.md


结果：全部通过。


---


# 总结


所有 Phase（0~6）已完成。
企业级 qiankun 微前端脚手架搭建完毕。


---


# Layout 能力增强 Phase 1 架构分析


执行时间：

2026-07-27


执行目标：

分析当前 main-layout 实现，识别缺失能力。


执行内容：

1. 分析 Layout 结构（Header + Sidebar + Content）。
2. 分析路由结构（history 模式，Layout 包裹子路由）。
3. 分析 Vuex 状态（token、userInfo、menu、globalState）。
4. 分析通信机制（bridge.js 双向通信）。
5. 识别缺失：标签管理、页面缓存、状态同步。
6. 识别问题：subapp-container 在 Home.vue 内部导致子应用路由不可见。


输出文件：

docs/layout-enhancement-analysis.md


结果：分析完成，制定改造方案。


---


# Layout 能力增强 Phase 2 标签页管理


执行时间：

2026-07-27


执行目标：

实现企业后台系统 Tab 标签管理。


执行内容：

1. 创建 store/tabs.js 标签状态管理模块。
2. 设计标签数据结构（id、title、path、name、params、query、closable、keepAlive、isSubApp）。
3. 实现标签创建（路由 afterEach 自动触发）。
4. 实现标签切换（点击标签 router.push）。
5. 实现标签关闭（关闭当前/其他/左侧/右侧/全部）。
6. 实现标签刷新（移除缓存 → 销毁重建 → 恢复缓存）。
7. 创建 AppTabBar.vue 标签栏组件（含右键菜单）。
8. 首页标签设为不可关闭（closable: false）。


输出文件：

src/store/tabs.js（新建）
src/layout/AppTabBar.vue（新建）


结果：构建通过。


---


# Layout 能力增强 Phase 3 状态同步


执行时间：

2026-07-27


执行目标：

建立路由 → 标签 → 页面三者同步机制。


执行内容：

1. 路由同步标签：afterEach 钩子自动 dispatch addTab。
2. 标签同步路由：点击标签执行 router.push。
3. 扩展 bridge.js 支持标签通信事件：
   - TAB_OPEN：子应用通知主应用打开页面
   - TAB_CLOSE：子应用通知主应用关闭页面
   - TAB_REFRESH：子应用通知主应用刷新页面
4. 主应用处理子应用标签事件并同步状态。


输出文件：

src/router/guards.js（更新）
src/platform/bridge.js（更新）


结果：构建通过。


---


# Layout 能力增强 Phase 4 页面缓存


执行时间：

2026-07-27


执行目标：

实现 Vue2 keep-alive 页面缓存。


执行内容：

1. Layout.vue 集成 keep-alive（:include="cachedViews"）。
2. 路由 meta.keepAlive 控制缓存（默认 true）。
3. 子应用页面（isSubApp: true）不参与缓存。
4. 关闭标签时同步清理 cachedViews。
5. 刷新机制：移除缓存 → routerViewState=false → nextTick → routerViewState=true → 恢复缓存。
6. 将 subapp-container 从 Home.vue 移至 Layout.vue。
7. 使用 v-show 控制子应用容器可见性。


输出文件：

src/layout/Layout.vue（更新）
src/router/routes.js（更新 isSubApp 标记）
src/views/Home.vue（移除 subapp-container）


结果：构建通过。


---


# Layout 能力增强 Phase 5 文档输出


执行时间：

2026-07-27


执行目标：

输出增强设计文档。


执行内容：

1. 编写 docs/layout-enhancement-analysis.md（架构分析）。
2. 编写 docs/layout-tab.md（标签页与缓存设计文档）。
3. 更新 docs/context-state.md（当前状态）。
4. 更新 docs/phase-log.md（阶段记录）。


输出文件：

docs/layout-enhancement-analysis.md（新建）
docs/layout-tab.md（新建）
docs/context-state.md（更新）
docs/phase-log.md（更新）


结果：文档完成。


---


# Layout 能力增强 Phase 6 测试验收


执行时间：

2026-07-27


执行目标：

构建测试验证。


执行内容：

1. 主应用 Webpack 4.47.0 构建通过。
2. 零错误零警告。
3. 所有新增模块正确编译。
4. 标签管理、缓存、通信代码无语法错误。


结果：全部通过。


---


# Layout 增强总结


Layout 能力增强任务全部完成。

main-layout 现具备：

- 标签页管理（创建、切换、关闭、刷新）
- 标签状态同步（路由↔标签、主子应用通信）
- 页面缓存（keep-alive、cachedViews、刷新机制）
- 子应用容器优化（Layout 级别管理，v-show 控制可见性）


---


# Layout V2 Phase 5 Tab 持久化与恢复


执行时间：

2026-07-27


执行目标：

实现浏览器刷新后恢复工作状态。


执行内容：

1. 新增 persistTabs action，序列化 visitedViews 存入 localStorage。
2. 新增 restoreTabs action，启动时从 localStorage 恢复标签列表。
3. afterEach 自动触发 persistTabs。
4. main.js 启动时自动 restoreTabs（token 存在时）。
5. 登出时清除持久化数据。


修改文件：

src/store/tabs.js（新增 persistTabs、restoreTabs、serializeViews）
src/main.js（启动时 restoreTabs）
src/router/guards.js（afterEach persistTabs）


结果：构建通过。


---


# Layout V2 Phase 6 登录恢复与深链接恢复


执行时间：

2026-07-27


执行目标：

解决未登录访问深链接的恢复问题。


执行内容：

1. beforeEach 守卫保存目标地址到 localStorage（fmac_redirect）。
2. Login.vue 登录成功后读取 redirect（query 优先，其次 localStorage）。
3. 使用 router.replace() 恢复原地址。
4. afterEach 自动清除残留 redirect。
5. 恢复后 addTab 自动创建对应标签。


修改文件：

src/store/tabs.js（新增 saveRedirect、getRedirect、clearRedirect）
src/router/guards.js（beforeEach saveRedirect）
src/views/Login.vue（登录恢复 redirect）


结果：构建通过。


---


# Layout V2 Phase 7 子应用 Tab 通信


执行时间：

2026-07-27


执行目标：

验证已有主子应用 Tab 通信机制。


执行内容：

1. 验证 bridge.js TAB_OPEN/TAB_CLOSE/TAB_REFRESH 事件处理。
2. 确认子应用可通过 globalState 通知主应用管理标签。
3. V1 已实现，无需修改。


结果：验证通过。


---


# Layout V2 Phase 8 Tab 高级交互


执行时间：

2026-07-27


执行目标：

实现标签拖拽排序和双击关闭。


执行内容：

1. AppTabBar.vue 添加 draggable="true" 属性。
2. 实现 dragstart/dragover/drop/dragend 事件处理。
3. 新增 reorderTabs action 和 REORDER_VISITED_VIEWS mutation。
4. 拖拽后自动持久化到 localStorage。
5. 添加 @dblclick 双击关闭（仅 closable 标签生效）。
6. 拖拽视觉反馈（opacity: 0.5）。


修改文件：

src/store/tabs.js（新增 reorderTabs、REORDER_VISITED_VIEWS）
src/layout/AppTabBar.vue（拖拽排序、双击关闭）


结果：构建通过。


---


# Layout V2 Phase 9 端到端测试


执行时间：

2026-07-27


执行目标：

编写测试文档。


执行内容：

1. 编写 Tab 打开/关闭/刷新测试用例。
2. 编写页面恢复测试用例（浏览器刷新、登录恢复）。
3. 编写拖拽排序和双击关闭测试用例。
4. 构建测试通过（Webpack 4.47.0，零错误零警告）。


输出文件：

docs/layout-tab-test.md（新建）


结果：文档完成。


---


# Layout V2 Phase 10 文档输出


执行时间：

2026-07-27


执行目标：

输出完整设计文档。


执行内容：

1. 更新 docs/layout-tab.md（标签页与缓存设计 V2）。
2. 新增 docs/layout-tab-advanced.md（高级能力设计）。
3. 更新 docs/context-state.md。
4. 更新 docs/phase-log.md。


输出文件：

docs/layout-tab.md（更新）
docs/layout-tab-advanced.md（新建）
docs/layout-tab-test.md（新建）
docs/context-state.md（更新）
docs/phase-log.md（更新）


结果：文档完成。


---


# Layout V2 增强总结


Layout 能力增强 V2 全部完成。

main-layout 新增能力：

- Tab 持久化（localStorage 保存/恢复）
- 登录恢复与深链接恢复
- Tab 拖拽排序（HTML5 Drag & Drop）
- Tab 双击关闭
- 完整测试文档
