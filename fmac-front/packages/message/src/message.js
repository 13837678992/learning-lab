/**
 * @fmac/message —— 统一消息提示（适配器渲染）。
 *
 * success / error / warning / info / confirm。UI 呈现交由注入的 adapter
 * （默认 console + 原生 confirm 兜底），真实实现由 @fmac/ui-adapter 提供、@fmac/core 注入。
 * 业务禁止直接 this.$message（见 CLAUDE.md 第十二节）。
 */
import { createLogger, isFunction } from '@fmac/shared';

function createFallbackAdapter(logger) {
  return {
    show(type, content) {
      const line = `[${type}] ${content}`;
      if (type === 'error') logger.error(line);
      else if (type === 'warning') logger.warn(line);
      else logger.info(line);
    },
    confirm(options) {
      const text = (options && options.content) || '确认执行该操作？';
      if (typeof window !== 'undefined' && isFunction(window.confirm)) {
        return Promise.resolve(window.confirm(text));
      }
      return Promise.resolve(true);
    },
  };
}

export function createMessage(options = {}) {
  const logger = createLogger('message');
  let adapter = options.adapter || createFallbackAdapter(logger);

  function show(type, content, config) {
    if (isFunction(adapter.show)) adapter.show(type, content, config);
  }

  const api = {
    success(content, config) {
      show('success', content, config);
    },
    error(content, config) {
      show('error', content, config);
    },
    warning(content, config) {
      show('warning', content, config);
    },
    info(content, config) {
      show('info', content, config);
    },
    /** 确认框；接受字符串或 { content, title, ... }，返回 Promise<boolean>。 */
    confirm(input) {
      const opts = typeof input === 'string' ? { content: input } : input || {};
      if (isFunction(adapter.confirm)) return adapter.confirm(opts);
      return Promise.resolve(true);
    },
    setAdapter(next) {
      if (next) adapter = next;
      return api;
    },
  };

  return api;
}
