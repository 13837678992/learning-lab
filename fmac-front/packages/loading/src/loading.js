/**
 * @fmac/loading —— 全局加载态（引用计数 + 适配器渲染）。
 *
 * 维护嵌套调用的引用计数；真正的 UI 呈现交由注入的 adapter（默认 no-op），
 * DOM / 组件实现由 @fmac/ui-adapter 提供，并在 @fmac/core 中注入。
 */
import { createLogger, isFunction, isPromise } from '@fmac/shared';

function createNoopAdapter(logger) {
  return {
    show() {
      logger.debug('show（尚未注入 UI 适配器，无实际呈现）');
    },
    hide() {
      logger.debug('hide（尚未注入 UI 适配器，无实际呈现）');
    },
  };
}

export function createLoading(options = {}) {
  const logger = createLogger('loading');
  let adapter = options.adapter || createNoopAdapter(logger);
  let count = 0;

  /** 显示 loading（引用计数 +1）；返回一次性 hide 函数。 */
  function show(config) {
    count += 1;
    if (count === 1 && isFunction(adapter.show)) adapter.show(config);
    return () => hide();
  }

  /** 隐藏 loading（引用计数 -1）；force=true 直接清零。 */
  function hide(force = false) {
    if (count === 0) return;
    count = force ? 0 : count - 1;
    if (count === 0 && isFunction(adapter.hide)) adapter.hide();
  }

  /** 包裹一个 Promise / 函数，自动 show 前置、hide 收尾。 */
  async function withLoading(task, config) {
    show(config);
    try {
      const value = isFunction(task) ? task() : task;
      return await (isPromise(value) ? value : Promise.resolve(value));
    } finally {
      hide();
    }
  }

  function isActive() {
    return count > 0;
  }

  function setAdapter(next) {
    if (next) adapter = next;
    return api;
  }

  const api = { show, hide, withLoading, isActive, setAdapter };
  return api;
}
