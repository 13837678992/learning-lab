import Vue from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';
import { registerMicroApps, start } from 'qiankun';
import { getApps } from './micro/apps';
import { initGlobalState } from './micro/globalState';
import { getToken } from './utils/auth';
import { start as startSession } from './platform/session';
import { initBridge } from './platform/bridge';

Vue.config.productionTip = false;

let instance = null;

function render(props = {}) {
  var container = props.container;
  instance = new Vue({
    router: router,
    store: store,
    render: function(h) { return h(App); }
  }).$mount(container ? container.querySelector('#app') : '#app');
}

if (!window.__POWERED_BY_QIANKUN__) {
  var token = getToken();
  if (token) {
    store.commit('SET_TOKEN', token);
    store.dispatch('restoreTabs');
    startSession();
  }
  render();
  initBridge();
}

function storeProps(props) {
  var onGlobalStateChange = props.onGlobalStateChange;
  var setGlobalState = props.setGlobalState;
  var offGlobalStateChange = props.offGlobalStateChange;
  if (onGlobalStateChange) {
    store.commit('SET_GLOBAL_STATE', { onGlobalStateChange: onGlobalStateChange, setGlobalState: setGlobalState, offGlobalStateChange: offGlobalStateChange });
  }
}

export async function bootstrap() {
  console.log('[main-layout] bootstrap');
}

export async function mount(props) {
  console.log('[main-layout] mount');
  storeProps(props);
  render(props);
  initBridge();
}

export async function unmount() {
  console.log('[main-layout] unmount');
  if (instance && instance.$el && instance.$el.parentNode) {
    instance.$el.parentNode.removeChild(instance.$el);
  }
  instance.$destroy();
  instance = null;
}

registerMicroApps(getApps());
start({
  sandbox: { experimentalStyleIsolation: true }
});
initGlobalState({
  user: { token: getToken(), userInfo: null },
  menu: [],
  permission: []
});
