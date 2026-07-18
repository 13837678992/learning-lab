/**
 * @fmac/plugin
 * 插件扩展机制：register / install / get（只提供机制，不实现具体插件）。
 *
 * 预留用于：日志 / 埋点 / 监控 / 国际化 / 主题。由 @fmac/core 在装配时安装，
 * install(context) 的 context 暴露平台能力 + hooks + errorHandler。
 *
 * 用法：
 *   import platform from '@fmac/core';
 *   platform.use({ name: 'logger', install(ctx) { ctx.hooks.register('afterRoute', ...) } });
 */
import { createPluginManager } from './plugin.js';

export { createPluginManager };

/** 平台默认插件管理器（单例）。 */
const plugin = createPluginManager();
export default plugin;
