# 新子应用接入指南

本文说明一个新的 qiankun 子应用如何接入 FMAC Front 平台。参考实现：`apps/user`、`apps/order`、`apps/report`。

## 0. 目录与依赖

```
apps/<name>/
├── package.json      @fmac/app-<name>（deps 仅 @fmac/core + vue + vue-router）
├── vite.config.js    @vitejs/plugin-vue2 + server.cors:true + 独立端口
├── index.html        <div id="app-<name>"></div>
└── src/
    ├── main.js       ★ qiankun 生命周期 + standalone
    ├── App.vue
    ├── platform.js   ★ 唯一 @fmac/core 接入点
    ├── router/index.js
    └── views/*.vue
```

> **依赖规则**：子应用只依赖 `@fmac/core`，不直接依赖任何下层能力包；框架（`vue`/`vue-router`）自持。

## 1. qiankun 生命周期：bootstrap / mount / unmount

`src/main.js` 必须导出三个生命周期，并支持独立运行：

```js
import Vue from 'vue';
import App from './App.vue';
import { createAppRouter } from './router/index.js';
import { setupPlatform, bindSharedPlatform } from './platform.js';

const ROOT_ID = 'app-foo';
const POWERED = typeof window !== 'undefined' && !!window.__POWERED_BY_QIANKUN__;
let instance = null;
let router = null;

function render(props = {}) {
  const { container } = props;
  if (!router) {
    router = createAppRouter(POWERED);
    setupPlatform(router, { baseURL: '/api/foo' });
  }
  instance = new Vue({ router, render: (h) => h(App) });
  instance.$mount(container ? container.querySelector(`#${ROOT_ID}`) : `#${ROOT_ID}`);
}

if (!POWERED) render(); // standalone

export async function bootstrap() {}
export async function mount(props) {
  bindSharedPlatform(props && props.platform); // 采用主应用注入的共享平台
  render(props);
}
export async function unmount() {
  if (instance) {
    instance.$destroy();
    if (instance.$el) instance.$el.innerHTML = '';
    instance = null;
  }
}
```

主应用注册（`apps/main/src/micro/apps.js`）：

```js
{ name: 'app-foo', entry: '//localhost:7104', container: '#subapp-viewport', activeRule: '/micro/foo' }
```

## 2. 路由注册方式

子应用自带 `vue-router`，qiankun 下 `base` 取激活路径，standalone 下为 `/`：

```js
export function createAppRouter(powered) {
  return new VueRouter({
    mode: 'history',
    base: powered ? '/micro/foo' : '/',
    routes: [
      { path: '/', component: FooList },
      { path: '/detail/:id', component: FooDetail },
    ],
  });
}
```

`platform.js` 把该 vue-router 适配进 `@fmac/router`，业务统一用 `router.push`（**禁止 `this.$router`**）。

## 3. 使用 router / store / request / event

子应用的 `src/platform.js` 是**唯一** `@fmac/core` 接入点，向视图暴露门面：

```js
import localPlatform from '@fmac/core';
let shared = localPlatform;

export function setupPlatform(vueRouter, options = {}) {
  const inQiankun = !!(typeof window !== 'undefined' && window.__POWERED_BY_QIANKUN__);
  localPlatform.router.setAdapter(createVueRouterAdapter(vueRouter)); // 每次挂载指向当前 router
  localPlatform.setup({
    request: { baseURL: options.baseURL || '/api' },
    adapters: inQiankun ? {} : undefined, // qiankun 下复用主应用 UI 适配器
  });
}
export function bindSharedPlatform(injected) {
  shared = injected || localPlatform;
}

export const router = localPlatform.router; // 本地路由
export const request = localPlatform.request; // 本地请求
export const getStore = () => shared.store; // 跨应用共享
export const getEvent = () => shared.event; // 跨应用共享
```

视图中：

```js
import { router, request, getStore, getEvent } from '../platform.js';

router.push('/detail/1'); // 路由
const list = await request.get('/list'); // 请求
getStore().set('current:foo', item); // 共享状态
getEvent().emit('foo:selected', item); // 跨应用事件
const off = getEvent().on('bar:changed', fn); // 订阅（记得清理，见 §5）
```

> **跨应用通信只走 store / event / router**，禁止 `window` / `sessionStorage` / `localStorage`（`CLAUDE.md` 第九节）。`store` / `event` 由主应用经 qiankun `props.platform` 注入，跨应用为**同一实例**。

## 4. 样式隔离

- 由 `@fmac/core` 启动 qiankun 时**强制 `strictStyleIsolation: true`（不可关闭）**，子应用样式被 Shadow DOM 隔离，无需额外配置。
- 子应用根节点使用**唯一 id**（如 `#app-foo`），避免与主应用 `#app` 冲突。
- 建议子应用样式作用在自身根容器下，避免全局选择器污染。

## 5. 清理定时器 / 事件 / 资源

`unmount` 必须清理，避免内存泄漏（`CLAUDE.md` 第十六节）：

| 资源           | 清理方式                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| Vue 实例       | `instance.$destroy()` + 清空挂载点 innerHTML                                                           |
| 事件订阅       | 组件 `beforeDestroy` 中调用 `off()`（`getEvent().on` / `store.subscribe` / `hooks.register` 的返回值） |
| 定时器         | `clearTimeout` / `clearInterval`，将 id 存于组件实例，`beforeDestroy` 清理                             |
| DOM / Observer | `MutationObserver` / `ResizeObserver` 等在 `beforeDestroy` `disconnect()`                              |
| 全局副作用     | `unmount` 中还原（如挂载的全局监听 `window.removeEventListener`）                                      |

组件级示例：

```js
export default {
  created() {
    this.off = getEvent().on('foo:changed', this.onChange);
    this.timer = setInterval(this.poll, 5000);
  },
  beforeDestroy() {
    if (this.off) this.off();
    if (this.timer) clearInterval(this.timer);
  },
};
```

## 接入清单（checklist）

- [ ] `main.js` 导出 `bootstrap` / `mount` / `unmount`，支持 standalone
- [ ] `unmount` 销毁实例 + 清理 DOM / 定时器 / 订阅
- [ ] `router` 使用 qiankun `base`；导航走 `@fmac/core` 的 `router`
- [ ] 仅 `platform.js` 依赖 `@fmac/core`；`package.json` deps 只有 `@fmac/core` + `vue` + `vue-router`
- [ ] 跨应用通信走 store / event；`bindSharedPlatform(props.platform)`
- [ ] `vite.config.js` 开启 `server.cors`，独立端口
- [ ] 在主应用 `micro/apps.js` 注册 + 侧边栏菜单
