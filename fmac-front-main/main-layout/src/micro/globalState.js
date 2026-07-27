import { initGlobalState as initGlobalStateFn } from 'qiankun';

let actions = null;

export function initGlobalState(state) {
  actions = initGlobalStateFn(state);
  return actions;
}

export function getActions() {
  return actions;
}
