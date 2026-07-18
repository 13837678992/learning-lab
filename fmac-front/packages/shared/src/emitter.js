/**
 * @fmac/shared —— 最小事件发射器（框架无关基础原语）。
 *
 * 这是平台的复用基石：@fmac/event（跨应用事件总线）、@fmac/store（状态变更通知）、
 * @fmac/auth / @fmac/tab / @fmac/router 等均基于它构建，避免各自重复实现订阅逻辑（DRY）。
 *
 * 特性：
 * - on 返回一次性取消订阅函数；
 * - once 支持用原始 handler 反注册；
 * - emit 对监听器做错误隔离（单个抛错不影响其它监听器）。
 */
import { isFunction, isUndefined } from './is.js';
import { createLogger } from './logger.js';

const logger = createLogger('emitter');

export function createEmitter() {
  /** @type {Map<string, Set<Function>>} */
  const registry = new Map();

  function on(type, handler) {
    if (!isFunction(handler)) {
      logger.warn(`on("${type}") 需要一个函数 handler`);
      return () => {};
    }
    let handlers = registry.get(type);
    if (!handlers) {
      handlers = new Set();
      registry.set(type, handlers);
    }
    handlers.add(handler);
    return () => off(type, handler);
  }

  function off(type, handler) {
    if (isUndefined(type)) {
      registry.clear();
      return;
    }
    const handlers = registry.get(type);
    if (!handlers) return;
    if (isUndefined(handler)) {
      registry.delete(type);
      return;
    }
    handlers.delete(handler);
    // 兼容 once 包装：允许用原始 handler 反注册。
    for (const wrapped of handlers) {
      if (wrapped.__original === handler) handlers.delete(wrapped);
    }
    if (handlers.size === 0) registry.delete(type);
  }

  function once(type, handler) {
    const wrapped = (...args) => {
      off(type, wrapped);
      handler(...args);
    };
    wrapped.__original = handler;
    return on(type, wrapped);
  }

  function emit(type, ...args) {
    const handlers = registry.get(type);
    if (!handlers || handlers.size === 0) return;
    // 复制一份，避免监听器在回调中增删导致迭代异常。
    for (const handler of [...handlers]) {
      try {
        handler(...args);
      } catch (err) {
        logger.error(`监听器 "${type}" 执行抛错：`, err);
      }
    }
  }

  function has(type) {
    const handlers = registry.get(type);
    return !!handlers && handlers.size > 0;
  }

  function clear() {
    registry.clear();
  }

  return { on, off, once, emit, has, clear };
}
