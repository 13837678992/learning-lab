# 新业务系统接入指南（以 finance-demo 为例）

本文以**财务管理系统** `apps/finance-demo` 为参考，说明一个真实企业业务系统如何接入 FMAC Front 平台。基础契约见 [micro-app-guide.md](./micro-app-guide.md)，本文侧重业务系统的**能力使用**与**验收要点**。

## 1. 目录结构

```
apps/finance-demo/
├── package.json          @fmac/app-finance-demo（deps 仅 @fmac/core + vue + vue-router）
├── vite.config.js        端口 7104 + server.cors
├── index.html            <div id="app-finance">
└── src/
    ├── main.js           入口：加载样式、standalone 渲染、导出生命周期
    ├── micro.js          qiankun 生命周期（与 main.js 分离，含跨应用监听/定时器清理）
    ├── platform.js       唯一 @fmac/core 接入点
    ├── router/           vue-router（base=/finance）
    ├── api/              模拟接口（经 request SDK）
    ├── assets/           独立样式
    └── views/            account/ · transaction/ · report/ + Home
```

## 2. 生命周期（bootstrap / mount / unmount）

`src/micro.js` 导出三生命周期，`main.js` 负责 standalone 与再导出：

```js
// micro.js
export async function bootstrap() {}
export async function mount(props) {
  bindSharedPlatform(props && props.platform); // 采用主应用注入的共享平台
  render(props);
  offGlobalRefresh = getEvent().on('global:refresh', handleRefresh); // 登记跨应用监听
  heartbeat = setInterval(poll, 30000); // 定时器
}
export async function unmount() {
  offGlobalRefresh && offGlobalRefresh(); // 清理 event
  clearInterval(heartbeat); // 清理 timer
  instance && instance.$destroy(); // 销毁实例
  router = null; // 释放 router
}
```

```js
// main.js
import './assets/finance.css';
import { bootstrap, mount, unmount, renderStandalone, POWERED } from './micro.js';
if (!POWERED) renderStandalone();
export { bootstrap, mount, unmount };
```

## 3. 接入主应用（经 packages/core，不改 main.js）

只在主应用的**注册表**登记，由 `@fmac/core` 完成注册与启动，**不在 main.js 直接注册**：

```js
// apps/main/src/micro/apps.js
{ name: 'app-finance-demo', entry: '//localhost:7104', container: '#subapp-viewport', activeRule: '/finance' }
```

主应用 `setupMicroApps()` 经 `platform.registerApps()` / `platform.start()` 统一注册（SDK，不直接调用 qiankun）。路由 `/finance`、`/finance/account`、`/finance/transaction`、`/finance/report` 均由激活规则 `/finance` 命中加载。

## 4. 能力使用（全部经 @fmac/core SDK）

`src/platform.js` 划分**本地能力**与**跨应用能力**：

```js
// 本地：属于子应用自身
export const router = localPlatform.router; // 应用内导航
export const request = localPlatform.request; // 自有 baseURL / token
export const cache = localPlatform.cache; // 页面状态
// 跨应用：随主应用注入切换到同一实例
export const getStore = () => shared.store;
export const getEvent = () => shared.event;
export const getTab = () => shared.tab;
export const getMessage = () => shared.message;
export const getLoading = () => shared.loading;
export const getSharedRouter = () => shared.router; // 跨应用跳转
```

| 能力        | 用法                                                            | 验收点                                                      |
| ----------- | --------------------------------------------------------------- | ----------------------------------------------------------- |
| **router**  | `router.push('/account')`                                       | 应用内导航                                                  |
| 跨应用跳转  | `getSharedRouter().push('/micro/user')`                         | **禁止** `window.location` / `history` API                  |
| **store**   | `getStore().set('finance:currency','USD')`                      | 主应用与其它子应用实时同步                                  |
| **event**   | `getEvent().emit('finance:update', p)` / `on('global:refresh')` | 双向事件（主 ↔ 子）                                         |
| **request** | `request.get('/accounts')`                                      | token 拦截、异常 try/catch、`getLoading().withLoading` 包裹 |
| **tab**     | `getTab().add({key,title,path})` / `subscribe`                  | 新增 / 切换 / 关闭 / 刷新                                   |
| **cache**   | `cache.set('finance:tx:search', cond)`                          | 交易流水搜索条件切走再回来保留                              |

## 5. 样式隔离

- `src/assets/finance.css` 使用独立风格（模拟另一套 UI 库，含 `h2` / `.fbtn` / `.ftbl` 等选择器）。
- `@fmac/core` 强制 qiankun `strictStyleIsolation`，样式经 Shadow DOM 隔离，**不影响主应用**。
- 子应用根节点使用唯一 id `#app-finance`。

## 6. 资源清理（§12 · 无内存泄漏）

| 资源       | 登记                                                 | 清理                            |
| ---------- | ---------------------------------------------------- | ------------------------------- |
| Vue 实例   | `mount` render                                       | `unmount` `$destroy` + 清空 DOM |
| 跨应用事件 | `mount` `getEvent().on(...)`                         | `unmount` 保存的 `off()`        |
| 定时器     | `mount` `setInterval`                                | `unmount` `clearInterval`       |
| router     | `render` 重建                                        | `unmount` 置空                  |
| 组件订阅   | 视图 `created` (`store.subscribe` / `tab.subscribe`) | 视图 `beforeDestroy` `off()`    |

## 7. 接入清单

- [ ] `micro.js` 导出 `bootstrap`/`mount`/`unmount`，`main.js` standalone + 再导出
- [ ] 仅 `platform.js` 依赖 `@fmac/core`；deps 只有 `@fmac/core` + `vue` + `vue-router`
- [ ] 跨应用跳转用 `getSharedRouter()`；跨应用状态/事件用共享 store/event
- [ ] request 经 SDK，含 token / 异常 / loading
- [ ] tab / cache 按需接入；样式独立且唯一根 id
- [ ] `unmount` 清理事件 / 定时器 / 实例 / router
- [ ] 在 `apps/main/src/micro/apps.js` 登记 + 侧边栏菜单，**不改 main.js**
