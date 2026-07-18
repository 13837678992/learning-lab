/**
 * @fmac/tab —— 多标签页管理，框架无关，仅依赖 @fmac/shared。
 *
 * 维护标签列表与当前激活项，并对外提供 subscribe 订阅（供 UI 渲染标签栏）。
 */
import { createEmitter, createLogger, isNil } from '@fmac/shared';

const logger = createLogger('tab');

/** 归一标签记录：至少需要 key 或 path。 */
function normalize(tab) {
  if (isNil(tab)) return null;
  const key = !isNil(tab.key) ? tab.key : tab.path;
  if (isNil(key)) return null;
  return {
    key,
    title: tab.title || String(key),
    path: tab.path || String(key),
    closable: tab.closable !== false,
    meta: tab.meta || {},
  };
}

export function createTabManager() {
  const emitter = createEmitter();
  let tabs = [];
  let activeKey = null;

  function list() {
    return tabs.map((t) => ({ ...t }));
  }

  function find(key) {
    return tabs.find((t) => t.key === key) || null;
  }

  function notify(type, payload) {
    emitter.emit('change', { type, activeKey, tabs: list(), payload });
  }

  /** 新增（已存在则复用）并激活。 */
  function add(tab) {
    const record = normalize(tab);
    if (!record) {
      logger.warn('add() 已忽略：标签需要 key 或 path');
      return null;
    }
    if (!find(record.key)) tabs.push(record);
    activeKey = record.key;
    notify('add', record);
    return record;
  }

  /** 移除；若移除的是当前激活项，则自动激活相邻标签。 */
  function remove(key) {
    const index = tabs.findIndex((t) => t.key === key);
    if (index === -1) return;
    tabs.splice(index, 1);
    if (activeKey === key) {
      const next = tabs[index] || tabs[index - 1] || null;
      activeKey = next ? next.key : null;
    }
    notify('remove', { key });
  }

  function setActive(key) {
    if (!find(key)) return;
    activeKey = key;
    notify('active', { key });
  }

  function getActive() {
    return find(activeKey);
  }

  /** 关闭其它（保留目标与不可关闭项）。 */
  function closeOthers(key) {
    tabs = tabs.filter((t) => t.key === key || !t.closable);
    activeKey = find(key) ? key : tabs[0] ? tabs[0].key : null;
    notify('closeOthers', { key });
  }

  /** 关闭全部可关闭项。 */
  function clear() {
    tabs = tabs.filter((t) => !t.closable);
    activeKey = tabs[0] ? tabs[0].key : null;
    notify('clear');
  }

  /** 请求刷新某标签（发出 refresh 事件，具体重渲染由订阅方处理）。 */
  function refresh(key) {
    const target = key || activeKey;
    if (!target) return;
    notify('refresh', { key: target });
  }

  return {
    add,
    remove,
    setActive,
    getActive,
    list,
    find,
    closeOthers,
    clear,
    refresh,
    /** 订阅标签变更；返回取消订阅函数。 */
    subscribe: (handler) => emitter.on('change', handler),
  };
}
