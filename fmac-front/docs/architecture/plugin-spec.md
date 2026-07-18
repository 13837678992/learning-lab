# Plugin 架构规范

> 规范平台插件的**契约、上下文、生命周期与约束**。机制实现见 [`@fmac/plugin`](../packages/plugin.md)；本文是编写插件时必须遵守的规范。
> 原则：插件只**扩展**平台，不**改写**已有稳定架构；不为未来提前设计未使用能力（KISS）。

## 1. 定位

插件是平台的**唯一横切扩展入口**。日志 / 埋点 / 监控 / 国际化 / 主题等能力以插件形式接入，**不侵入** `apps` 与能力包。整个平台仅 `@fmac/core` 装配时安装插件。

## 2. 插件契约

一个插件是一个普通对象：

```js
const myPlugin = {
  name: 'tracking', // 必填，全局唯一（用于去重）
  install(context) {
    // 在此接入平台扩展点；只依赖 context 暴露的能力，禁止直接 import 能力包。
  },
};
```

| 字段           | 必填 | 说明                                                        |
| -------------- | ---- | ----------------------------------------------------------- |
| `name`         | 是   | 全局唯一标识；重复注册被忽略（后者丢弃）                    |
| `install(ctx)` | 是   | 安装回调；`ctx` 为平台上下文（见第 3 节）。非函数则跳过安装 |

**强约束**（由 `@fmac/plugin` 保证，且 `plugin.test.js` 已覆盖）：

- 无 `name` 的插件被拒绝注册；
- 同名插件只安装一次（**去重**）；
- `install` **幂等**：多次 `install()` 只对未安装插件生效；
- 单个插件 `install` 抛错被**隔离**，不影响其它插件与平台启动。

## 3. 安装上下文（install 的 context）

`context` = 平台能力 + 扩展总线（来自 `core` 的 `pluginContext()`）：

```
{ event, request, router, store, loading, message, cache, auth, tab,  // 能力单例
  hooks,          // 生命周期 Hook 总线：register(name, handler)
  errorHandler }  // 统一异常处理器：register(fn) / micro|route|request|lifecycle|auth
```

插件**只能**通过 `context` 使用平台能力，**禁止** `import '@fmac/router'` 等直连下层包（与 apps 同一约束，架构守卫对 apps 生效；插件作者需自觉遵守）。

## 4. 生命周期与扩展点

- **安装时机**：`platform.setup()` 末尾统一安装；`setup()` 之后再 `platform.use(plugin)` 会立即安装该新插件。
- **扩展点**：经 `context.hooks.register(hookName, handler)` 挂接平台 Hook：

  `beforeBootstrap` / `afterBootstrap` / `beforeMount` / `afterMount` / `beforeUnmount` / `afterUnmount` / `afterRoute` / `beforeRequest` / `afterRequest`

- **异常接入**：经 `context.errorHandler.register(fn)` 统一接收 `micro|route|request|lifecycle|auth` 异常（用于监控上报）。

## 5. 示例（说明用途，平台不内置实现）

```js
// 路由埋点插件
const routeTracker = {
  name: 'route-tracker',
  install({ hooks }) {
    hooks.register('afterRoute', ({ type, location }) => {
      // report('route', { type, location })
    });
  },
};

// 监控上报插件
const monitor = {
  name: 'monitor',
  install({ errorHandler }) {
    errorHandler.register((payload) => {
      // report('error', payload)  // payload: { type, message, error, meta, time }
    });
  },
};

platform.use(routeTracker).use(monitor);
```

## 6. 约束清单（Do / Don't）

**Do**

- 一个插件一件事（单一职责），`name` 语义化且唯一。
- 只经 `context` 访问能力；副作用在 `install` 内完成。
- 订阅类扩展保存取消函数，便于插件自身可控（如未来支持卸载）。

**Don't**

- ❌ 直接 `import` 能力包 / `qiankun` / 框架。
- ❌ 在 `install` 里做与插件职责无关的平台改写。
- ❌ 依赖其它插件的安装顺序（当前不提供插件间依赖解析——**不提前设计**；若确有需要再于 Phase N 引入）。

## 7. 现状与边界

当前 `@fmac/plugin` **只提供机制**（register/install/get/has/list），不含：插件间依赖排序、优先级、启停、卸载。这些均属「未使用能力」，按 KISS **暂不实现**，待真实需求出现再演进。
