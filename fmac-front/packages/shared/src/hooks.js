/**
 * @fmac/shared —— 统一生命周期 Hook 机制（框架无关基础原语）。
 *
 * 按名称注册回调并顺序（可 await）执行；@fmac/core 据此暴露平台钩子：
 * beforeBootstrap / afterBootstrap / beforeMount / afterMount / beforeUnmount /
 * afterUnmount / beforeRoute / afterRoute / beforeRequest / afterRequest。
 *
 * 本机制不绑定任何框架。
 */
import { isFunction } from './is.js';
import { createLogger } from './logger.js';

const logger = createLogger('hooks');

export function createHooks(options = {}) {
  /** @type {Map<string, Set<Function>>} */
  const store = new Map();
  /** 可选：hook 执行异常上报（core 注入 errorHandler.lifecycle，统一收敛）。 */
  const onError = isFunction(options.onError) ? options.onError : null;

  /** 注册钩子；返回取消注册函数。 */
  function register(name, handler) {
    if (!isFunction(handler)) {
      logger.warn(`hook "${name}" 需要一个函数 handler`);
      return () => {};
    }
    let list = store.get(name);
    if (!list) {
      list = new Set();
      store.set(name, list);
    }
    list.add(handler);
    return () => remove(name, handler);
  }

  function remove(name, handler) {
    const list = store.get(name);
    if (!list) return;
    if (!handler) {
      store.delete(name);
      return;
    }
    list.delete(handler);
    if (list.size === 0) store.delete(name);
  }

  /** 顺序执行（支持 async）；单个 handler 抛错不阻断后续，返回各 handler 结果数组。 */
  async function callHook(name, ...args) {
    const list = store.get(name);
    if (!list || list.size === 0) return [];
    const results = [];
    for (const handler of [...list]) {
      try {
        results.push(await handler(...args));
      } catch (err) {
        // 统一异常：注入 onError 时收敛到 errorHandler.lifecycle，否则本地兜底日志。
        if (onError) onError(err, { hook: name });
        else logger.error(`hook "${name}" 执行抛错：`, err);
      }
    }
    return results;
  }

  function has(name) {
    const list = store.get(name);
    return !!list && list.size > 0;
  }

  function clear() {
    store.clear();
  }

  return { register, remove, callHook, has, clear };
}
