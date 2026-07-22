/**
 * @fmac/core
 * 平台内核（组合根）：聚合全部能力 + 托管 qiankun 生命周期 + 统一 Hook / 异常 / 插件机制。
 *
 * 业务（apps）只依赖本包；整个平台仅本包允许引用 qiankun（见 CLAUDE.md 第六、八节）。
 *
 * 用法（主应用）：
 *   import platform from '@fmac/core';
 *   platform.use(somePlugin);
 *   platform.setup({ debug: true, request: { baseURL: '/gateway' } });
 *   platform.registerApps([...]); platform.start();
 *
 * 用法（业务内）：
 *   import { router, store, request, message, hooks, errorHandler } from '@fmac/core';
 */
import { capabilities } from './facade.js';
import { setup, isInstalled, pluginContext } from './setup.js';
import { createMicroManager } from './qiankun.js';
import { hooks, errorHandler, plugins } from './runtime.js';

export { setup, isInstalled, createMicroManager, hooks, errorHandler, plugins };

// 框架适配器工厂经 core 统一出口（apps 只依赖 @fmac/core，不直连 ui-adapter）：
// 把 app 自持的 vue-router 适配进 @fmac/router，各 app 不再重复实现（见 CLAUDE.md 第七节）。
export { createVueRouterAdapter } from '@fmac/ui-adapter';

// 菜单解析（鉴权域，纯函数）经 core 统一出口，供主应用生成菜单 / 子应用路由 / tab。
export { parseMenu, flattenMenu, menuToRoutes, menuToTab } from '@fmac/auth';

// 具名导出各能力，业务可按需解构使用。
export const { event, request, router, store, loading, message, cache, auth, tab } = capabilities;

const micro = createMicroManager();
export { micro };

/** 平台统一门面（默认导出）。 */
const platform = {
  ...capabilities,
  micro,
  hooks,
  errorHandler,
  plugins,
  setup,
  isInstalled,
  // qiankun 统一入口（唯一）：注册 / 加载 / 卸载 / 查询 / 启动
  registerApp: micro.registerApp,
  registerApps: micro.registerApps,
  loadApp: micro.loadApp,
  unloadApp: micro.unloadApp,
  getApps: micro.getApps,
  start: micro.start,
  setDefaultApp: micro.setDefaultApp,
  initState: micro.initState,
  onError: micro.onError,
  // 统一异常入口
  handleError: errorHandler.handle,
  // 插件：注册并（若已装配）安装
  use(plugin) {
    plugins.register(plugin);
    if (isInstalled()) plugins.install(pluginContext());
    return platform;
  },
};

export default platform;
