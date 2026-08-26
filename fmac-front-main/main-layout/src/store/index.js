import Vue from 'vue';
import Vuex from 'vuex';
import { getToken, setToken, removeToken } from '@/utils/auth';
import tabsModule from './tabs';

Vue.use(Vuex);

export default new Vuex.Store({
  state: Object.assign({
    token: getToken() || '',
    userInfo: null,
    menu: [],
    globalState: null
  }, tabsModule.state),
  mutations: Object.assign({
    SET_TOKEN: function(state, token) {
      state.token = token;
      setToken(token);
    },
    SET_USER_INFO: function(state, info) {
      state.userInfo = info;
    },
    SET_MENU: function(state, menu) {
      state.menu = menu;
    },
    CLEAR_USER: function(state) {
      state.token = '';
      state.userInfo = null;
      state.menu = [];
      removeToken();
    },
    SET_GLOBAL_STATE: function(state, gs) {
      state.globalState = gs;
    }
  }, tabsModule.mutations),
  actions: Object.assign({
    logout: function(_ref) {
      var commit = _ref.commit, dispatch = _ref.dispatch;
      dispatch('resetTabs');
      commit('CLEAR_USER');
    }
  }, tabsModule.actions)
});
