/**
 * @fmac/store —— 跨应用共享状态。
 *
 * get / set / remove / subscribe / unsubscribe，基于 @fmac/shared 的 emitter 做变更通知。
 * 禁止用 window / storage 做跨应用通信 —— 统一走本包（见 CLAUDE.md 第九、十四节）。
 */
import { createEmitter, createLogger, isFunction, isUndefined } from '@fmac/shared';

const logger = createLogger('store');
/** 订阅「全部变更」的内部 key。用 Symbol 避免与业务 state key（如字符串 '*'）冲突。 */
const ALL = Symbol('fmac:store:all');

export function createStore(initialState = {}) {
  const state = new Map(Object.entries(initialState));
  const emitter = createEmitter();

  function snapshot() {
    return Object.fromEntries(state);
  }

  function get(key) {
    if (isUndefined(key)) return snapshot();
    return state.get(key);
  }

  function set(key, value) {
    const oldValue = state.get(key);
    if (oldValue === value) return;
    state.set(key, value);
    logger.debug('set', key, value);
    emitter.emit(key, value, oldValue);
    emitter.emit(ALL, { key, value, oldValue });
  }

  function remove(key) {
    if (!state.has(key)) return;
    const oldValue = state.get(key);
    state.delete(key);
    emitter.emit(key, undefined, oldValue);
    emitter.emit(ALL, { key, value: undefined, oldValue });
  }

  /** subscribe(key, handler) 订阅指定 key；subscribe(handler) 订阅全部变更。返回取消订阅函数。 */
  function subscribe(key, handler) {
    if (isFunction(key) && isUndefined(handler)) {
      return emitter.on(ALL, key);
    }
    return emitter.on(key, handler);
  }

  function unsubscribe(key, handler) {
    if (isFunction(key) && isUndefined(handler)) {
      emitter.off(ALL, key);
      return;
    }
    emitter.off(key, handler);
  }

  function has(key) {
    return state.has(key);
  }

  function reset() {
    state.clear();
    emitter.emit(ALL, { key: null, value: undefined, oldValue: undefined });
  }

  return { get, set, remove, subscribe, unsubscribe, has, snapshot, reset };
}
