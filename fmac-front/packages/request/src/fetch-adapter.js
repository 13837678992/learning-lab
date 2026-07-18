/**
 * @fmac/request —— 默认 HTTP 适配器（基于浏览器原生 fetch，框架无关）。
 *
 * 这是平台内唯一允许直接使用 fetch 的位置；业务必须通过 request.get / post 调用，
 * 禁止直接使用 axios() / fetch()（见 CLAUDE.md 第十一节）。
 */
import { isNil } from '@fmac/shared';

function buildQuery(params) {
  const usp = new URLSearchParams();
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (isNil(value)) return;
    if (Array.isArray(value)) {
      value.forEach((item) => usp.append(key, item));
    } else {
      usp.append(key, value);
    }
  });
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

function joinUrl(baseURL, url) {
  if (!baseURL || /^https?:\/\//i.test(url)) return url;
  return `${baseURL.replace(/\/+$/, '')}/${String(url).replace(/^\/+/, '')}`;
}

function hasHeader(headers, name) {
  return Object.keys(headers).some((key) => key.toLowerCase() === name.toLowerCase());
}

async function parseBody(response) {
  const type = response.headers.get('content-type') || '';
  if (type.includes('application/json')) {
    return response.json().catch(() => null);
  }
  return response.text();
}

function normalizeError(response, payload) {
  const error = new Error(`请求失败，HTTP ${response.status}`);
  error.name = 'RequestError';
  error.status = response.status;
  error.data = payload;
  return error;
}

export function createFetchAdapter() {
  return async function fetchAdapter(config) {
    const {
      method = 'GET',
      baseURL = '',
      url = '',
      params,
      data,
      headers = {},
      timeout = 0,
      signal,
    } = config;

    let fullUrl = joinUrl(baseURL, url);
    if (params) fullUrl += buildQuery(params);

    const init = { method, headers: { ...headers } };

    if (!isNil(data)) {
      const isForm = typeof FormData !== 'undefined' && data instanceof FormData;
      if (typeof data === 'object' && !isForm) {
        init.body = JSON.stringify(data);
        if (!hasHeader(init.headers, 'content-type')) {
          init.headers['Content-Type'] = 'application/json';
        }
      } else {
        init.body = data;
      }
    }

    // 取消 / 超时：显式 signal 优先；否则用 timeout 触发 AbortController。
    let timer = null;
    if (signal) {
      init.signal = signal;
    } else if (timeout > 0 && typeof AbortController !== 'undefined') {
      const controller = new AbortController();
      init.signal = controller.signal;
      timer = setTimeout(() => controller.abort(), timeout);
    }

    try {
      const response = await fetch(fullUrl, init);
      const payload = await parseBody(response);
      if (!response.ok) throw normalizeError(response, payload);
      return { data: payload, status: response.status, headers: response.headers, raw: response };
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
}
