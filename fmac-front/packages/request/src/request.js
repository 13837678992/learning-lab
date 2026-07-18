/**
 * @fmac/request —— 统一请求客户端（企业级请求中心）。
 *
 * 通过可替换的 adapter 隔离底层实现（默认 fetch，未来可换 axios 而业务无感），
 * 提供请求 / 响应 / 错误拦截器、请求取消、统一日志。对外主 API 为 get / post。
 * 请求异常由 @fmac/core 统一桥接到 errorHandler（见 CLAUDE.md 第十一节）。
 */
import { createLogger, isFunction } from '@fmac/shared';
import { createFetchAdapter } from './fetch-adapter.js';

const logger = createLogger('request');

export function createRequest(options = {}) {
  let adapter = options.adapter || createFetchAdapter();
  const defaults = {
    baseURL: options.baseURL || '',
    headers: { ...(options.headers || {}) },
    timeout: options.timeout || 0,
  };
  const interceptors = { request: [], response: [], error: [] };

  async function run(config) {
    let merged = {
      ...defaults,
      ...config,
      headers: { ...defaults.headers, ...(config.headers || {}) },
    };

    for (const fn of interceptors.request) {
      merged = (await fn(merged)) || merged;
    }

    logger.debug(`${merged.method} ${merged.url}`); // 统一请求日志入口
    let result;
    try {
      result = await adapter(merged);
    } catch (error) {
      // 统一错误拦截（core 据此桥接 errorHandler）。
      for (const fn of interceptors.error) {
        try {
          await fn(error, merged);
        } catch (inner) {
          logger.error('error interceptor 自身抛错：', inner);
        }
      }
      throw error;
    }

    for (const fn of interceptors.response) {
      result = (await fn(result, merged)) || result;
    }
    return result.data;
  }

  const api = {
    /** 底层通用请求，返回响应体 data。 */
    request: run,
    get(url, config = {}) {
      return run({ ...config, method: 'GET', url });
    },
    post(url, data, config = {}) {
      return run({ ...config, method: 'POST', url, data });
    },
    put(url, data, config = {}) {
      return run({ ...config, method: 'PUT', url, data });
    },
    delete(url, config = {}) {
      return run({ ...config, method: 'DELETE', url });
    },
    /** 追加请求拦截器：(config) => config | Promise<config>。 */
    useRequestInterceptor(fn) {
      if (isFunction(fn)) interceptors.request.push(fn);
      return api;
    },
    /** 追加响应拦截器：(result, config) => result | Promise<result>。 */
    useResponseInterceptor(fn) {
      if (isFunction(fn)) interceptors.response.push(fn);
      return api;
    },
    /** 追加错误拦截器：(error, config) => void（用于统一上报 / 桥接 errorHandler）。 */
    useErrorInterceptor(fn) {
      if (isFunction(fn)) interceptors.error.push(fn);
      return api;
    },
    /** 创建取消令牌：{ signal, cancel }。将 signal 传入请求 config 即可取消。 */
    createCancelToken() {
      if (typeof AbortController === 'undefined') {
        return { signal: undefined, cancel: () => {} };
      }
      const controller = new AbortController();
      return { signal: controller.signal, cancel: (reason) => controller.abort(reason) };
    },
    /** 替换底层适配器（依赖倒置：未来可注入 axios 适配器）。 */
    setAdapter(fn) {
      if (isFunction(fn)) adapter = fn;
      return api;
    },
    setBaseURL(baseURL) {
      defaults.baseURL = baseURL || '';
      return api;
    },
    setHeader(name, value) {
      defaults.headers[name] = value;
      return api;
    },
    /** 基于当前配置派生一个新实例。 */
    create: createRequest,
  };

  return api;
}
