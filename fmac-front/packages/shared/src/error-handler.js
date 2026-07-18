/**
 * @fmac/shared —— 统一异常处理机制（框架无关）。
 *
 * 收敛各类异常（微应用加载 / 路由 / 请求 / 权限 / 生命周期）到统一入口；
 * 默认经统一 logger 输出（禁止业务散落 console.error），可注册自定义处理器 / 上报。
 */
import { isFunction } from './is.js';
import { createLogger } from './logger.js';

/** 异常类型常量。 */
export const ErrorTypes = {
  MICRO: 'micro', // 微应用加载 / 运行
  ROUTE: 'route', // 路由
  REQUEST: 'request', // 请求
  AUTH: 'auth', // 权限 / 鉴权
  LIFECYCLE: 'lifecycle', // 生命周期
  UNKNOWN: 'unknown',
};

export function createErrorHandler() {
  const logger = createLogger('error');
  const handlers = new Set();

  function normalize(type, error, meta) {
    const err = error instanceof Error ? error : new Error(String(error));
    return {
      type: type || ErrorTypes.UNKNOWN,
      message: err.message,
      error: err,
      meta: meta || {},
      time: Date.now(),
    };
  }

  /** 统一入口：处理一个异常。无自定义处理器时经统一 logger 兜底输出。 */
  function handle(type, error, meta) {
    const payload = normalize(type, error, meta);
    if (handlers.size === 0) {
      logger.error(`[${payload.type}] ${payload.message}`, payload.meta);
      return payload;
    }
    for (const fn of [...handlers]) {
      try {
        fn(payload);
      } catch (e) {
        logger.error('error handler 自身抛错：', e);
      }
    }
    return payload;
  }

  /** 注册自定义处理器（如监控上报）；返回取消函数。 */
  function register(fn) {
    if (!isFunction(fn)) return () => {};
    handlers.add(fn);
    return () => handlers.delete(fn);
  }

  const api = {
    handle,
    register,
    // 分类便捷入口
    micro: (error, meta) => handle(ErrorTypes.MICRO, error, meta),
    route: (error, meta) => handle(ErrorTypes.ROUTE, error, meta),
    request: (error, meta) => handle(ErrorTypes.REQUEST, error, meta),
    auth: (error, meta) => handle(ErrorTypes.AUTH, error, meta),
    lifecycle: (error, meta) => handle(ErrorTypes.LIFECYCLE, error, meta),
    types: ErrorTypes,
  };
  return api;
}
