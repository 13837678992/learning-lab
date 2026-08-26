# Layout 标签页与缓存设计

## 一、标签设计

### 数据结构

```javascript
{
  id: "",          // 标签唯一标识（path + query 组合）
  title: "",       // 标签显示名称（来自 route.meta.title）
  path: "",        // 路由路径
  fullPath: "",    // 完整路由路径（含 query）
  name: "",        // 路由名称（组件 name，用于 keep-alive）
  params: {},      // 路由参数
  query: {},       // 查询参数
  closable: true,  // 是否允许关闭（首页不可关闭）
  keepAlive: true, // 是否缓存（子应用页面不缓存）
  isSubApp: false  // 是否为子应用页面
}
```

### 创建规则

1. 路由 afterEach 钩子自动触发标签创建
2. 如果标签已存在（path 相同），不重复创建
3. `/login` 页面不创建标签
4. 首页（`/home`）标签不可关闭（closable: false）
5. 子应用页面（isSubApp: true）不参与 keep-alive 缓存

### 生命周期

```
路由变化 → afterEach → addTab action
  → 检查是否已存在
    → 存在：不操作
    → 不存在：创建标签，加入 visitedViews
  → 检查 keepAlive
    → true：将组件 name 加入 cachedViews
    → false：不缓存
  → persistTabs：保存到 localStorage
```

---

## 二、状态同步

### 路由同步标签

```
用户导航 → vue-router 路由变化
  → beforeEach：设置默认 keepAlive、closable
  → afterEach：dispatch addTab
    → 创建/激活标签
    → 更新 visitedViews
    → 更新 cachedViews
    → 持久化到 localStorage
```

### 标签同步路由

```
用户点击标签 → navigateTo(tab)
  → router.push({ path, query, params })
  → 路由变化 → 页面切换
  → 浏览器地址栏同步
```

### 主子应用标签通信

#### 子应用 → 主应用

通过 qiankun globalState 发送事件：

| 事件类型 | 数据 | 说明 |
|----------|------|------|
| TAB_OPEN | `{ action, title, path, params }` | 打开页面并创建标签 |
| TAB_CLOSE | `{ action, path }` | 关闭指定标签 |
| TAB_REFRESH | `{ action, path }` | 刷新指定页面 |

#### 主应用处理

bridge.js 的 `initBridge` 监听全局状态变化：

- `TAB_OPEN`：dispatch addTab + router.push
- `TAB_CLOSE`：dispatch closeTab + 自动跳转
- `TAB_REFRESH`：dispatch refreshTab

---

## 三、缓存设计

### keep-alive 方案

Layout.vue 中使用 Vue2 keep-alive 组件：

```html
<keep-alive v-if="!isSubAppRoute" :include="cachedViews">
  <router-view :key="viewKey" />
</keep-alive>
```

- `:include` 绑定 Vuex 中的 cachedViews 数组
- 只有 name 在 cachedViews 中的组件会被缓存
- `v-if="!isSubAppRoute"` 子应用路由时不渲染 keep-alive
- `viewKey` 用于刷新时强制重建组件

### 缓存策略

| 路由类型 | keepAlive | 说明 |
|----------|-----------|------|
| 主应用页面 | true（默认） | route.meta.keepAlive 控制 |
| 子应用页面 | false | isSubApp: true，不参与 Vue 缓存 |
| 登录页 | - | 不在 Layout 内，无缓存 |

### 缓存清理

1. **关闭标签**：从 cachedViews 移除组件 name → keep-alive 自动驱逐缓存
2. **关闭其他**：保留当前标签和固定标签的缓存，清理其余
3. **关闭全部**：清空 cachedViews
4. **刷新页面**：移除缓存 → viewKey++ 重建 → 恢复缓存

### 页面刷新机制

```
dispatch refreshTab(view)
  → REMOVE_CACHED_VIEW(name)    // keep-alive 驱逐缓存
  → Vue.nextTick()
  → SET_ROUTER_VIEW_STATE(true) // 触发 viewKey++
  → Vue.nextTick()
  → ADD_CACHED_VIEW(name)       // 恢复缓存配置
```

---

## 四、持久化设计

### 存储键名

- `fmac_tabs`：标签列表
- `fmac_redirect`：深链接恢复地址

### 保存时机

- afterEach：每次导航后自动保存
- 标签关闭/排序后：手动触发保存
- 登出时：清除持久化数据

### 恢复时机

- 应用启动（main.js）：token 存在时恢复标签列表
- 注意：keep-alive 缓存不持久化，恢复后页面重新渲染

### 序列化内容

仅保存路由信息：path、title、name、params、query、closable、keepAlive、isSubApp

---

## 五、登录恢复与深链接

### 流程

```
未登录访问 /finance/detail?id=100
  → beforeEach 保存 redirect 到 localStorage
  → 跳转 /login?redirect=/finance/detail?id=100
  → 登录成功
  → 读取 redirect（query 优先，其次 localStorage）
  → router.replace() 恢复原地址
  → afterEach 自动创建标签
```

### 双重保障

- `query.redirect`：单次跳转
- `localStorage fmac_redirect`：刷新场景

---

## 六、高级交互

### 拖拽排序

- HTML5 Drag and Drop API
- draggable="true" + dragstart/dragover/drop 事件
- 排序后持久化到 localStorage

### 双击关闭

- @dblclick 事件
- 仅可关闭标签（closable: true）生效
- 固定标签（首页）双击无反应

---

## 七、标签操作说明

| 操作 | 触发方式 | 说明 |
|------|----------|------|
| 切换标签 | 点击标签 | 路由跳转到对应页面 |
| 关闭标签 | 点击 × 或双击 | 关闭标签并跳转到相邻标签 |
| 刷新 | 右键菜单 | 重新渲染当前页面 |
| 关闭当前 | 右键菜单 | 关闭当前标签 |
| 关闭其他 | 右键菜单 | 只保留当前标签和固定标签 |
| 关闭左侧 | 右键菜单 | 关闭当前标签左侧的所有标签 |
| 关闭右侧 | 右键菜单 | 关闭当前标签右侧的所有标签 |
| 关闭全部 | 右键菜单 | 关闭所有可关闭标签，跳转到首页 |
| 拖拽排序 | 鼠标拖拽 | 调整标签顺序 |

---

## 八、文件清单

| 文件 | 说明 |
|------|------|
| `src/store/tabs.js` | 标签状态管理模块（含持久化） |
| `src/store/index.js` | 集成标签模块 |
| `src/layout/AppTabBar.vue` | 标签栏组件（含拖拽、双击） |
| `src/layout/Layout.vue` | 集成标签栏、keep-alive、子应用容器 |
| `src/router/guards.js` | 路由守卫（自动创建标签、持久化、深链接保存） |
| `src/router/routes.js` | 子应用路由标记 isSubApp |
| `src/platform/bridge.js` | 扩展标签通信事件 |
| `src/views/Login.vue` | 登录恢复（redirect 读取） |
| `src/main.js` | 启动时恢复标签 |
| `src/views/Home.vue` | 移除 subapp-container |
