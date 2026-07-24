import Vue from 'vue';
import {
  getToken,
  setToken as persistToken,
  getUserInfo,
  setUserInfo as persistUser,
  clearAuth,
} from '@/utils/auth';

/**
 * 全局状态（基座内共享）。
 * 使用 Vue.observable 实现响应式；持久化交给 utils/auth。
 * 主子应用之间的动态状态同步在 Phase 4 由 qiankun initGlobalState 承担。
 */
const state = Vue.observable({
  token: getToken(),
  userInfo: getUserInfo(),
  menu: [],
  microApps: [],
  platformLoaded: false,
});

export const store = {
  state,

  setToken(token) {
    state.token = token || '';
    persistToken(state.token);
  },

  setUserInfo(info) {
    state.userInfo = info || null;
    persistUser(state.userInfo);
  },

  setMenu(menu) {
    state.menu = Array.isArray(menu) ? menu : [];
  },

  setMicroApps(apps) {
    state.microApps = Array.isArray(apps) ? apps : [];
  },

  setPlatformLoaded(value) {
    state.platformLoaded = !!value;
  },

  clear() {
    state.token = '';
    state.userInfo = null;
    state.menu = [];
    state.microApps = [];
    state.platformLoaded = false;
    clearAuth();
  },
};

export default store;
