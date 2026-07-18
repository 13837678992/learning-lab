/**
 * @fmac/router —— 统一路由门面。
 *
 * 隔离底层路由实现：默认使用 History API 适配器，core 可注入 vue-router /
 * react-router 适配器，业务始终只调用 push / replace / back / reload。
 */
import { createEmitter, createLogger, isFunction } from '@fmac/shared';
import { createHistoryAdapter } from './history-adapter.js';

const logger = createLogger('router');

export function createRouter(options = {}) {
  let adapter = options.adapter || createHistoryAdapter();
  const emitter = createEmitter();

  function notify(type, location) {
    emitter.emit('change', { type, location });
  }

  /** 统一异常：有订阅者（core 桥接 errorHandler.route）则上报，否则本地兜底日志。 */
  function reportError(op, error) {
    if (emitter.has('error')) emitter.emit('error', { op, error });
    else logger.error(`router.${op} 抛错：`, error);
  }

  const api = {
    push(location) {
      logger.debug('push', location);
      try {
        const result = adapter.push(location);
        notify('push', location);
        return result;
      } catch (error) {
        reportError('push', error);
      }
    },
    replace(location) {
      logger.debug('replace', location);
      try {
        const result = adapter.replace(location);
        notify('replace', location);
        return result;
      } catch (error) {
        reportError('replace', error);
      }
    },
    back() {
      try {
        adapter.back();
      } catch (error) {
        reportError('back', error);
      }
    },
    forward() {
      try {
        if (isFunction(adapter.forward)) adapter.forward();
      } catch (error) {
        reportError('forward', error);
      }
    },
    go(delta) {
      try {
        if (isFunction(adapter.go)) adapter.go(delta);
      } catch (error) {
        reportError('go', error);
      }
    },
    reload() {
      try {
        if (isFunction(adapter.reload)) adapter.reload();
      } catch (error) {
        reportError('reload', error);
      }
    },
    current() {
      return isFunction(adapter.current) ? adapter.current() : '';
    },
    /** 订阅路由变更；返回取消订阅函数。 */
    onChange(handler) {
      return emitter.on('change', handler);
    },
    /** 订阅路由异常；返回取消订阅函数（core 据此桥接 errorHandler.route）。 */
    onError(handler) {
      return emitter.on('error', handler);
    },
    /** 注入底层适配器（依赖倒置：vue-router / react-router 等）。 */
    setAdapter(next) {
      if (next) adapter = next;
      return api;
    },
  };

  return api;
}
