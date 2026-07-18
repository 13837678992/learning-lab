/**
 * @fmac/core —— qiankun 生命周期托管（全平台唯一允许引用 qiankun 的位置）。
 *
 * 统一对外 qiankun 能力：registerApp / registerApps / start / loadApp / unloadApp / getApps。
 * 默认强制开启 strictStyleIsolation 且不可关闭（见 CLAUDE.md 第八、十七节）。
 * 平台 Hook 自动并入 qiankun 生命周期；微应用异常经统一 errorHandler 收敛。
 */
import {
  registerMicroApps,
  start as qiankunStart,
  setDefaultMountApp,
  addGlobalUncaughtErrorHandler,
  initGlobalState,
  loadMicroApp,
} from 'qiankun';
import { createLogger, toArray, isFunction } from '@fmac/shared';
import { hooks, errorHandler } from './runtime.js';

const logger = createLogger('qiankun');

const DEFAULT_START_OPTIONS = { prefetch: true };

/** 合并 qiankun 生命周期钩子（每个 key 归一为数组后拼接）。 */
function mergeLifecycles(base = {}, extra = {}) {
  const keys = new Set([...Object.keys(base), ...Object.keys(extra)]);
  const out = {};
  keys.forEach((key) => {
    out[key] = [...toArray(base[key]), ...toArray(extra[key])];
  });
  return out;
}

/** 平台 Hook 对应的 qiankun 生命周期。 */
function platformLifecycles() {
  return {
    beforeMount: [() => hooks.callHook('beforeMount')],
    afterMount: [() => hooks.callHook('afterMount')],
    beforeUnmount: [() => hooks.callHook('beforeUnmount')],
    afterUnmount: [() => hooks.callHook('afterUnmount')],
  };
}

export function createMicroManager() {
  let started = false;
  let globalStateApi = null;
  /** 路由驱动注册的子应用元信息。 */
  const registered = [];
  /** 手动加载（loadApp）的子应用句柄：name -> microAppHandle。 */
  const loaded = new Map();

  function normalize(app) {
    return { ...app, props: { ...(app.props || {}) } };
  }

  /** 批量注册路由驱动子应用。 */
  function registerApps(apps, lifecycles = {}) {
    const list = (apps || []).map(normalize);
    registerMicroApps(list, mergeLifecycles(lifecycles, platformLifecycles()));
    list.forEach((app) => registered.push(app));
    logger.info(`已注册 ${list.length} 个子应用（累计 ${registered.length}）`);
    return list;
  }

  /** 注册单个路由驱动子应用。 */
  function registerApp(app, lifecycles = {}) {
    return registerApps([app], lifecycles)[0];
  }

  /** 手动加载子应用（非路由驱动），返回句柄；unloadApp 可卸载。 */
  function loadApp(app, config) {
    const normalized = normalize(app);
    const handle = loadMicroApp(normalized, config);
    if (normalized.name) loaded.set(normalized.name, handle);
    logger.info(`已手动加载子应用 ${normalized.name}`);
    return handle;
  }

  /** 卸载手动加载的子应用并释放资源。 */
  async function unloadApp(name) {
    const handle = loaded.get(name);
    if (!handle) return false;
    try {
      await handle.unmount();
    } catch (error) {
      errorHandler.micro(error, { source: 'unloadApp', name });
    }
    loaded.delete(name);
    logger.info(`已卸载子应用 ${name}`);
    return true;
  }

  /** 获取子应用清单（注册的 + 手动加载的）。 */
  function getApps() {
    return {
      registered: registered.map((app) => ({
        name: app.name,
        activeRule: app.activeRule,
        entry: app.entry,
      })),
      loaded: [...loaded.keys()],
    };
  }

  async function start(options = {}) {
    if (started) {
      logger.warn('qiankun 已启动，忽略重复调用');
      return;
    }
    started = true;

    // 统一异常：微应用加载 / 运行 / 生命周期错误经此收敛（不散落 console.error）。
    addGlobalUncaughtErrorHandler((event) => {
      const err = event && event.error ? event.error : event;
      errorHandler.micro(err, { source: 'qiankun' });
    });

    await hooks.callHook('beforeBootstrap');
    qiankunStart({
      ...DEFAULT_START_OPTIONS,
      ...options,
      // 样式隔离强制开启：合并调用方 sandbox 后再覆盖，禁止关闭。
      sandbox: { ...(options.sandbox || {}), strictStyleIsolation: true },
    });
    await hooks.callHook('afterBootstrap');
    logger.info('qiankun 已启动（strictStyleIsolation 强制开启）');
  }

  function setDefaultApp(appLink) {
    setDefaultMountApp(appLink);
  }

  /** 追加业务自定义的全局错误处理（平台 errorHandler 桥接已在 start 中注册）。 */
  function onError(handler) {
    if (isFunction(handler)) addGlobalUncaughtErrorHandler((event) => handler(event));
  }

  function initState(state) {
    globalStateApi = initGlobalState(state || {});
    return globalStateApi;
  }

  return {
    registerApp,
    registerApps,
    loadApp,
    unloadApp,
    getApps,
    start,
    setDefaultApp,
    onError,
    initState,
    isStarted: () => started,
  };
}
