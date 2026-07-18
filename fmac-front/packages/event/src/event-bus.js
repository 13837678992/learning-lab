/**
 * @fmac/event —— 跨应用事件总线实现（基于 @fmac/shared 的 emitter 原语）。
 */
import { createEmitter, createLogger } from '@fmac/shared';

export function createEventBus() {
  const emitter = createEmitter();
  const logger = createLogger('event');

  return {
    /** 订阅事件；返回取消订阅函数。 */
    on(type, handler) {
      return emitter.on(type, handler);
    },
    /** 取消订阅；off(type) 清空该类型，off() 清空全部。 */
    off(type, handler) {
      emitter.off(type, handler);
    },
    /** 订阅一次；返回取消订阅函数。 */
    once(type, handler) {
      return emitter.once(type, handler);
    },
    /** 触发事件。 */
    emit(type, ...args) {
      logger.debug(`emit "${type}"`, ...args);
      emitter.emit(type, ...args);
    },
    /** 是否存在某类型的监听器。 */
    has(type) {
      return emitter.has(type);
    },
    /** 清空所有监听器。 */
    clear() {
      emitter.clear();
    },
  };
}
