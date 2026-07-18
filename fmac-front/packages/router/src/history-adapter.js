/**
 * @fmac/router —— 默认路由适配器（基于浏览器 History API，框架无关）。
 *
 * 这是平台内唯一允许直接操作 history / location 的位置；业务必须通过
 * router.push / replace / back / reload 调用（见 CLAUDE.md 第十节）。
 */
import { isString } from '@fmac/shared';

function toUrl(location) {
  if (isString(location)) return location;
  const { path = '/', query } = location || {};
  if (!query) return path;
  const usp = new URLSearchParams();
  Object.keys(query).forEach((key) => {
    if (query[key] !== null && query[key] !== undefined) usp.append(key, query[key]);
  });
  const qs = usp.toString();
  return qs ? `${path}?${qs}` : path;
}

export function createHistoryAdapter() {
  const canUseDom = typeof window !== 'undefined' && !!window.history;

  return {
    push(location) {
      const url = toUrl(location);
      if (canUseDom) window.history.pushState({}, '', url);
      return url;
    },
    replace(location) {
      const url = toUrl(location);
      if (canUseDom) window.history.replaceState({}, '', url);
      return url;
    },
    back() {
      if (canUseDom) window.history.back();
    },
    forward() {
      if (canUseDom) window.history.forward();
    },
    go(delta) {
      if (canUseDom) window.history.go(delta);
    },
    current() {
      if (!canUseDom) return '/';
      return window.location.pathname + window.location.search;
    },
    reload() {
      if (canUseDom) window.location.reload();
    },
  };
}
