# Layout Tab 高级能力设计

## 一、Tab 持久化

### 存储方案

使用 localStorage 持久化标签列表。

存储键名：`fmac_tabs`

存储内容：
```javascript
{
  visitedViews: [
    {
      id: "/home",
      title: "首页",
      path: "/home",
      fullPath: "/home",
      name: "Home",
      params: {},
      query: {},
      closable: false,
      keepAlive: true,
      isSubApp: false
    }
  ]
}
```

### 持久化时机

- 路由 afterEach：每次导航后自动保存
- 标签关闭后：保存更新后的列表
- 标签排序后：保存新的顺序
- 登出时：清除持久化数据

### 恢复时机

- 应用启动时（main.js）：如果 token 存在，自动恢复标签列表
- 恢复后缓存状态丢失（keep-alive 缓存不持久化），页面重新渲染

### 序列化规则

仅保存路由相关信息，不保存组件实例状态：
- path、fullPath、name、title
- params、query
- closable、keepAlive、isSubApp

不保存：
- 组件内部状态
- DOM 引用
- 事件监听器

---

## 二、登录恢复与深链接

### 深链接访问流程

```
用户访问 /finance/detail?id=100（未登录）
  ↓
beforeEach 守卫检测无 token
  ↓
保存 redirect URL 到 localStorage（fmac_redirect）
  ↓
跳转 /login?redirect=/finance/detail?id=100
  ↓
用户登录成功
  ↓
读取 redirect（优先 query，其次 localStorage）
  ↓
router.replace() 恢复原地址
  ↓
afterEach 自动创建标签
```

### 双重保障

1. **query.redirect**：用于单次跳转，优先级高
2. **localStorage fmac_redirect**：用于浏览器刷新场景

### 清理时机

- 登录成功后立即清除 localStorage 中的 redirect
- 每次正常导航（afterEach）也会清除残留的 redirect

---

## 三、标签拖拽排序

### 技术方案

使用 HTML5 原生 Drag and Drop API，无需引入第三方库。

### 实现细节

```
draggable="true"  ← 标签可拖拽
  ↓
@dragstart → 记录起始位置（fromIndex）
  ↓
@dragover → 标记当前悬停位置（overIndex）
  ↓
@drop → 计算目标位置（toIndex）
  ↓
dispatch reorderTabs({ from, to })
  ↓
mutation REORDER_VISITED_VIEWS
  ↓
persistTabs → localStorage 保存
```

### 视觉反馈

- 拖拽中标签：opacity 0.5（半透明）
- 鼠标样式：grab / grabbing

### 约束

- 首页标签可被拖拽移动位置
- 拖拽只改变顺序，不改变路由

---

## 四、双击关闭

### 实现

```html
@dblclick="dblClickClose(tab)"
```

```javascript
dblClickClose: function(tab) {
  if (tab.closable) {
    this.closeTab(tab);
  }
}
```

### 规则

- 可关闭标签（closable: true）：双击关闭
- 固定标签（closable: false，如首页）：双击无反应

---

## 五、文件清单

| 文件 | 修改内容 |
|------|----------|
| src/store/tabs.js | 新增 persistTabs、restoreTabs、reorderTabs、saveRedirect、getRedirect 等 |
| src/layout/AppTabBar.vue | 新增拖拽排序（dragstart/dragover/drop）、双击关闭（dblclick） |
| src/router/guards.js | 新增 saveRedirect（深链接保存）、persistTabs（自动持久化） |
| src/views/Login.vue | 登录成功后读取 redirect 恢复页面 |
| src/main.js | 启动时 restoreTabs 恢复标签 |
