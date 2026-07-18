/**
 * @fmac/core —— 平台运行时单例。
 *
 * 统一 Hook 总线、异常处理器、插件管理器在此实例化，供 setup / qiankun / 门面共享同一实例。
 */
import { createHooks, createErrorHandler } from '@fmac/shared';
import plugin from '@fmac/plugin';

/** 统一异常处理器（micro / route / request / auth / lifecycle）。 */
export const errorHandler = createErrorHandler();

/**
 * 生命周期 Hook 总线（beforeMount / afterRoute / beforeRequest ...）。
 * hook 执行异常统一桥接到 errorHandler.lifecycle，形成统一扩展入口。
 */
export const hooks = createHooks({
  onError: (error, meta) => errorHandler.lifecycle(error, meta),
});

/** 插件管理器（register / install / get）。 */
export const plugins = plugin;
