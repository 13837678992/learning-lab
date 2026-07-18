/**
 * @fmac/core —— 平台装配（依赖注入 + 统一接线）。
 *
 * 这是各能力被「组合」起来的唯一位置：注入 UI 适配器、请求 / 路由配置，
 * 把统一 Hook 接入 request / router，请求异常桥接到统一 errorHandler，最后安装已注册插件。
 */
import { setDebug, createLogger, isFunction } from '@fmac/shared';
import { createDomAdapters } from '@fmac/ui-adapter';
import { capabilities } from './facade.js';
import { hooks, errorHandler, plugins } from './runtime.js';

const logger = createLogger('core');

let installed = false;

/** 插件安装上下文：平台能力 + hooks + errorHandler。 */
export function pluginContext() {
  return { ...capabilities, hooks, errorHandler };
}

/**
 * 装配平台能力。
 * @param {object} [options]
 * @param {boolean} [options.debug]
 * @param {object}  [options.adapters]  覆盖默认 UI 适配器 { loading, message }
 * @param {object}  [options.request]   { baseURL, headers, adapter }
 * @param {object}  [options.router]    { adapter }
 * @param {boolean} [options.force]
 */
export function setup(options = {}) {
  if (installed && !options.force) {
    logger.warn('setup() 已执行过，忽略重复调用');
    return capabilities;
  }
  installed = true;

  if (options.debug) setDebug(true);

  // 注入 UI 适配器（默认零依赖 DOM 实现）。
  const adapters = options.adapters || createDomAdapters();
  if (adapters.loading) capabilities.loading.setAdapter(adapters.loading);
  if (adapters.message) capabilities.message.setAdapter(adapters.message);

  // 请求运行时配置。
  if (options.request) {
    const { baseURL, headers, adapter } = options.request;
    if (baseURL) capabilities.request.setBaseURL(baseURL);
    if (headers) {
      Object.keys(headers).forEach((name) => capabilities.request.setHeader(name, headers[name]));
    }
    if (adapter) capabilities.request.setAdapter(adapter);
  }

  // 路由适配器（如注入 vue-router 实现）。
  if (options.router && options.router.adapter) {
    capabilities.router.setAdapter(options.router.adapter);
  }

  // —— 统一 Hook 接线 ——
  capabilities.request.useRequestInterceptor(async (config) => {
    await hooks.callHook('beforeRequest', config);
    return config;
  });
  capabilities.request.useResponseInterceptor(async (result, config) => {
    await hooks.callHook('afterRequest', result, config);
    return result;
  });
  capabilities.router.onChange((payload) => hooks.callHook('afterRoute', payload));

  // —— 路由异常统一桥接到 errorHandler ——
  if (isFunction(capabilities.router.onError)) {
    capabilities.router.onError(({ op, error }) => errorHandler.route(error, { op }));
  }

  // —— 请求异常统一桥接到 errorHandler ——
  if (isFunction(capabilities.request.useErrorInterceptor)) {
    capabilities.request.useErrorInterceptor((error, config) =>
      errorHandler.request(error, {
        url: config && config.url,
        method: config && config.method,
      }),
    );
  }

  // —— 安装已注册插件 ——
  plugins.install(pluginContext());

  logger.info('平台装配完成');
  return capabilities;
}

export function isInstalled() {
  return installed;
}
