# Layout 增强分析

## 当前实现分析

### 布局结构

原有 Layout 采用经典后台管理布局：

- Header：顶部导航栏（logo + 用户信息 + 退出按钮）
- Sidebar：左侧菜单栏（动态菜单 + 路由跳转）
- Content：右侧内容区（router-view 渲染页面）

### 路由结构

- `/login`：登录页（无 Layout）
- `/`：Layout 包裹，子路由 `/home`（首页）
- `/app-demo`：Layout 包裹，qiankun 子应用挂载点
- `*`：重定向到 `/home`

### 状态管理

Vuex 管理全局状态：

- token：认证令牌
- userInfo：用户信息
- menu：菜单数据
- globalState：qiankun 全局状态 actions

### 通信机制

bridge.js 实现主子应用双向通信：

- 主→子：syncUserState、syncMenuState、notifyLogout
- 子→主：route（路由跳转）、logout（退出登录）

---

## 存在问题

### 1. 缺少标签页管理

- 无 Tab 标签栏
- 无法通过标签快速切换页面
- 无法关闭不需要的页面
- 无法刷新当前页面

### 2. 缺少页面缓存

- 无 keep-alive 机制
- 页面切换后状态丢失
- 每次进入页面都重新渲染

### 3. 缺少状态同步

- 路由变化不自动维护标签列表
- 子应用无法通知主应用管理标签
- 标签与路由无双向绑定

### 4. 子应用容器位置

- subapp-container 在 Home.vue 内部
- 切换到 /app-demo 路由时 Home 组件不渲染
- 子应用容器不可见

---

## 改造方案

### 标签页管理

- 新增 `store/tabs.js` Vuex 模块
- 维护 visitedViews（标签列表）和 cachedViews（缓存列表）
- 路由 afterEach 自动创建标签
- AppTabBar 组件提供标签 UI 和右键菜单

### 页面缓存

- Layout.vue 使用 `<keep-alive :include="cachedViews">`
- 路由 meta.keepAlive 控制是否缓存（默认 true）
- 关闭标签时同步清理缓存
- 刷新页面时移除缓存 → 重建组件 → 恢复缓存

### 状态同步

- 路由变化 → 自动创建/激活标签（afterEach）
- 标签点击 → router.push 同步路由
- 子应用 → 主应用：TAB_OPEN / TAB_CLOSE / TAB_REFRESH 事件
- 主应用 → 子应用：通过 bridge 通知标签变化

### 子应用容器

- 将 subapp-container 移至 Layout.vue
- 使用 v-show 控制可见性（isSubAppRoute 判断）
- 子应用路由时隐藏 router-view，显示容器

---

## 技术风险

| 风险项 | 等级 | 说明 |
|--------|------|------|
| keep-alive 与子应用冲突 | 低 | 子应用路由标记 isSubApp，不参与 keep-alive |
| 路由守卫循环 | 低 | addTab 仅操作 Vuex，不触发路由变化 |
| 子应用容器移动 | 低 | 容器始终在 Layout DOM 中，仅切换可见性 |
| 缓存泄漏 | 低 | 关闭标签时同步清理 cachedViews |
