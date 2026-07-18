/**
 * @fmac/plugin —— 插件扩展机制（框架无关；只提供机制，不实现具体插件）。
 *
 * 未来的日志 / 埋点 / 监控 / 国际化 / 主题等能力以「插件」形式接入：
 * 每个插件形如 { name, install(context) }，通过 register 注册、install 统一安装。
 */
import { createLogger, isFunction } from '@fmac/shared';

export function createPluginManager() {
  const logger = createLogger('plugin');
  const registry = new Map();
  const installed = new Set();

  /** 注册插件（不立即安装）。plugin: { name, install(context) }。 */
  function register(plugin) {
    if (!plugin || !plugin.name) {
      logger.warn('register 需要具名插件 { name, install }');
      return manager;
    }
    if (registry.has(plugin.name)) {
      logger.warn(`插件 "${plugin.name}" 已注册，忽略重复注册`);
      return manager;
    }
    registry.set(plugin.name, plugin);
    return manager;
  }

  /** 安装：对尚未安装的已注册插件调用 install(context)。幂等（重复调用只安装新插件）。 */
  function install(context) {
    registry.forEach((plugin, name) => {
      if (installed.has(name)) return;
      try {
        if (isFunction(plugin.install)) plugin.install(context);
        installed.add(name);
        logger.debug(`插件 "${name}" 已安装`);
      } catch (err) {
        logger.error(`插件 "${name}" 安装失败：`, err);
      }
    });
    return manager;
  }

  /** 获取已注册插件。 */
  function get(name) {
    return registry.get(name) || null;
  }

  function has(name) {
    return registry.has(name);
  }

  function list() {
    return [...registry.keys()];
  }

  const manager = { register, install, get, has, list };
  return manager;
}
