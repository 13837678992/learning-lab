import Vue from 'vue';

/**
 * 子应用运行时上下文（响应式）。
 * - setContext：保存 mount 时下发的 token/userInfo/menu（一次性）。
 * - bindGlobalState：订阅 qiankun 全局状态（主 → 子持续同步），保存 setGlobalState 句柄。
 * - emitToMain：子 → 主，经 setGlobalState 上行 action（route/refresh/logout）。
 * 使用 Vue.observable 使视图能响应主应用推送的状态变更。
 */
const state = Vue.observable({ token: '', userInfo: null, menu: [], lastRefresh: 0 });

let _setGlobalState = null;
let _offGlobalStateChange = null;

function apply(patch) {
  if (!patch) return;
  if (patch.token !== undefined) state.token = patch.token || '';
  if (patch.userInfo !== undefined) state.userInfo = patch.userInfo || null;
  if (patch.menu !== undefined) state.menu = patch.menu || [];
  // 主应用广播的全局事件（如 global:refresh）。
  if (patch.event && patch.event.type === 'global:refresh') {
    state.lastRefresh = patch.event.ts || Date.now();
  }
}

export function setContext(props = {}) {
  apply(props);
}

export function bindGlobalState(props = {}) {
  _setGlobalState = typeof props.setGlobalState === 'function' ? props.setGlobalState : null;
  if (typeof props.onGlobalStateChange === 'function') {
    props.onGlobalStateChange((next) => apply(next), true);
    // 记录反注册句柄（若 qiankun 提供），unmount 时清理，避免内存泄漏。
    _offGlobalStateChange =
      typeof props.offGlobalStateChange === 'function' ? props.offGlobalStateChange : null;
  }
}

export function unbindGlobalState() {
  if (_offGlobalStateChange) {
    try {
      _offGlobalStateChange();
    } catch (e) {
      /* ignore */
    }
  }
  _offGlobalStateChange = null;
  _setGlobalState = null;
}

export function getContext() {
  return state;
}

/** 子 → 主：上行 action（route / refresh / logout）。 */
export function emitToMain(action) {
  if (!_setGlobalState || !action) return;
  _setGlobalState({
    from: 'app-demo',
    action: { ...action, id: `${Date.now()}-${Math.random().toString(16).slice(2)}` },
  });
}
