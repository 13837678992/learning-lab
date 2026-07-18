/**
 * @fmac/shared
 * 跨层通用工具与常量（框架无关基础层，不依赖任何其它 package）。
 *
 * 对外聚合导出：
 * - 常量：NAMESPACE / KEY_PREFIX
 * - 类型判断：isUndefined / isNil / isFunction / isString / isNumber / isObject / isPlainObject / isPromise
 * - 工具：noop / identity / toArray
 * - 日志：createLogger / setDebug / isDebug
 * - 断言：assert
 * - 事件原语：createEmitter
 * - 生命周期 Hook：createHooks
 * - 统一异常：createErrorHandler / ErrorTypes
 */
export * from './constants.js';
export * from './is.js';
export * from './util.js';
export * from './logger.js';
export * from './assert.js';
export * from './emitter.js';
export * from './hooks.js';
export * from './error-handler.js';
