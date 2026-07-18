# 微前端模型（qiankun）

## 角色

- **主应用（基座）** `apps/main`：Vue2 + vue-router + Vite。负责外壳（Layout）、导航、注册与启动 qiankun、向子应用注入共享平台。
- **子应用** `apps/user|order|report`：独立 Vue2 + Vite 应用，导出 qiankun 标准生命周期，可独立运行（standalone）。

## qiankun 由 core 统一托管

整个平台仅 `@fmac/core` 引用 `qiankun`。主应用通过 core 注册/启动：

```js
platform.registerApps(apps, lifecycles); // 平台 Hook 自动并入生命周期
platform.start(); // 强制 strictStyleIsolation
```

## 生命周期与 Hook

子应用导出：`bootstrap` / `mount(props)` / `unmount`。core 将平台 Hook 并入 qiankun 生命周期：

| qiankun 阶段 | 平台 Hook                                  |
| ------------ | ------------------------------------------ |
| start 前后   | `beforeBootstrap` / `afterBootstrap`       |
| 挂载前后     | `beforeMount` / `afterMount`               |
| 卸载前后     | `beforeUnmount` / `afterUnmount`           |
| 路由变化     | `afterRoute`（`beforeRoute` 可在守卫触发） |
| 请求前后     | `beforeRequest` / `afterRequest`           |

## 跨应用通信

- **共享状态** → `@fmac/store`
- **临时事件** → `@fmac/event`
- **页面跳转** → `@fmac/router`

主应用注册子应用时经 **qiankun `props` 注入平台实例**，使 `store` / `event` 跨应用共享**同一实例**——**禁止** `window` / `sessionStorage` / `localStorage` 做跨应用通信。

```js
// 主应用：注入
microApps.map((app) => ({ ...app, props: { platform } }));
// 子应用：采用注入的共享实例
export async function mount(props) {
  bindSharedPlatform(props.platform);
  render(props);
}
```

## 样式隔离

`core` 启动 qiankun 时**强制 `sandbox.strictStyleIsolation = true` 且不可关闭**（`CLAUDE.md` 第十七节）。

## 异常

微应用加载 / 运行 / 生命周期异常经 qiankun 全局错误处理桥接到 `platform.errorHandler.micro(...)`，统一收敛、不散落 `console.error`。
