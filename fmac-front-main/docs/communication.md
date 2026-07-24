# Phase 4 · 主子应用通信（communication.md）

> 输出文件：`docs/communication.md`
> 阶段：Phase 4 主子应用通信
> 结果：✅ 两应用构建通过（端到端联调见 Phase 6）

主应用 `main-layout` 与子应用 `app-demo` 的通信机制。仅通过 **qiankun 全局状态** 与 **window.microApp 桥** 交互（不共享源码）。

---

## 一、通道总览

| 方向 | 机制 | 载荷 |
| --- | --- | --- |
| 主 → 子 | `initGlobalState` + `onGlobalStateChange` | `token` / `userInfo` / `menu` / `permissions`；广播 `event`（如 `global:refresh`） |
| 子 → 主 | 子应用 `setGlobalState({ from, action })` | `action.type`：`route` / `refresh` / `logout`（含去重 `id`） |
| 子 → 主（直连） | `window.microApp.*` | `logout()` / `navigate(path)` / `refresh()` / `getGlobalState()` |

---

## 二、主应用侧

### 2.1 initGlobalState（下发）

`src/micro/globalState.js` + `src/platform/bridge.js`：

```js
setupGlobalState(
  { token, userInfo, menu, permissions },      // 初始下发
  (state) => { if (state.action) handleSubAction(state.action); }  // 订阅子应用上行
);
```

- 在 `loadPlatform()` 中于 `setupMicroApps()`（start）**之前**调用 `setupBridge()`，确保子应用挂载即可从 props 拿到全局状态。
- qiankun 自动把 `onGlobalStateChange` / `setGlobalState` 注入子应用 props。

### 2.2 子应用上行处理

`handleSubAction(action)`（按 `action.id` 去重，避免 setGlobalState 回显重复处理）：

| action.type | 主应用行为 |
| --- | --- |
| `route` | `router.push(action.payload)`（页面跳转） |
| `refresh` | 广播 `setGlobalState({ event:{ type:'global:refresh', ts } })` |
| `logout` | 通知后端 → `forceLogout()`（整页回登录） |

### 2.3 window.microApp 桥

`setupBridge()` 注入：

```js
window.microApp = {
  logout(),                 // 子应用 request.js 418 调用
  navigate(path),           // 主应用跳转
  refresh(),                // 广播全局刷新
  getGlobalState(),         // 读取当前 token/userInfo/menu
};
```

---

## 三、子应用侧

### 3.1 订阅与保存（`src/context.js`）

- `bindGlobalState(props)`：`props.onGlobalStateChange((next)=>apply(next), true)` 持续同步 `token/userInfo/menu`，并响应 `event: global:refresh`。
- 上下文用 `Vue.observable` 承载，视图（Home）响应式更新。
- `unbindGlobalState()`（unmount 调用）：反注册订阅，避免内存泄漏。

### 3.2 上行（`emitToMain`）

```js
emitToMain({ type: 'route', payload: '/home' });  // 通知主应用跳转
emitToMain({ type: 'refresh' });                  // 触发全局刷新
emitToMain({ type: 'logout' });                   // 退出登录
// 内部：setGlobalState({ from:'app-demo', action:{ ...action, id } })
```

### 3.3 请求侧桥接（`src/utils/request.js`）

- `418` → `window.microApp.logout()`（会话超时通知主应用退出）。
- `401` → qiankun 下 `window.microApp.logout()`；独立运行自处理。

---

## 四、数据流图

```
登录成功
  main: store(token,userInfo) → loadPlatform
        → getMenu → store.menu
        → setupBridge: initGlobalState({token,userInfo,menu,permissions}) + window.microApp
        → registerMicroApps + start
  用户进入 /app-demo
  qiankun: mount(app-demo, props{token,userInfo,menu,onGlobalStateChange,setGlobalState})
  sub: setContext(props) + bindGlobalState(props)  ← 主→子 初始 + 持续同步

子应用交互
  sub: emitToMain({type}) ──setGlobalState──▶ main.onGlobalStateChange ─▶ handleSubAction
                                                     route/refresh/logout
  sub.request 418 ── window.microApp.logout() ──▶ main.doLogout ─▶ forceLogout
```

---

## 五、涉及文件

**main-layout**：`src/micro/globalState.js`（新增）、`src/platform/bridge.js`（新增）、`src/platform/session.js`（loadPlatform 接入 setupBridge）。

**app-demo**：`src/context.js`（响应式 + bindGlobalState + emitToMain + 事件）、`src/main.js`（mount 绑定 / unmount 反注册）、`src/views/Home.vue`（通信演示按钮）。

---

## 六、验证

- `main-layout` 与 `app-demo` `npm run build` 均 exit 0，无 ERROR。
- 端到端（两应用同时运行，浏览器内挂载 + 状态同步 + action 上行 + logout 桥）在 **Phase 6** 验收。

---

## 七、下一阶段

Phase 5 部署能力：`.env.dev/.env.test/.env.prod`、独立构建/部署、nginx、子应用注册地址配置。输出 `docs/deploy.md`。
