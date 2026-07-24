import { initGlobalState } from 'qiankun';

/**
 * qiankun 全局状态通道（主 ↔ 子）。
 * - setupGlobalState：initGlobalState + 订阅变更（仅执行一次）。
 * - setGlobalState：主应用主动下发/广播。
 * qiankun 会自动把 onGlobalStateChange / setGlobalState 注入子应用 props。
 */
let actions = null;
let started = false;

export function setupGlobalState(initialState, onChange) {
  if (started) return actions;
  actions = initGlobalState(initialState || {});
  if (typeof onChange === 'function') {
    // 第二参数 true：注册即以当前状态回调一次。
    actions.onGlobalStateChange((state, prev) => onChange(state, prev), true);
  }
  started = true;
  return actions;
}

export function setGlobalState(patch) {
  if (actions && patch) actions.setGlobalState(patch);
}

export function getActions() {
  return actions;
}
