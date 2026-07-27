import Vue from 'vue';
import Vuex from 'vuex';
import { getToken, setToken, removeToken } from '@/utils/auth';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    token: getToken() || '',
    userInfo: null,
    menu: [],
    globalState: null
  },
  mutations: {
    SET_TOKEN(state, token) {
      state.token = token;
      setToken(token);
    },
    SET_USER_INFO(state, info) {
      state.userInfo = info;
    },
    SET_MENU(state, menu) {
      state.menu = menu;
    },
    CLEAR_USER(state) {
      state.token = '';
      state.userInfo = null;
      state.menu = [];
      removeToken();
    },
    SET_GLOBAL_STATE(state, gs) {
      state.globalState = gs;
    }
  },
  actions: {
    logout({ commit }) {
      commit('CLEAR_USER');
    }
  }
});
