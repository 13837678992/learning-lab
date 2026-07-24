import Vue from 'vue';
import App from './App.vue';
import router from './router';
import { store } from './store';
import { loadPlatform } from './platform/session';

Vue.config.productionTip = false;

// 1) 创建并挂载基座应用（Layout 内含子应用容器 #subapp-viewport）。
new Vue({
  router,
  render: (h) => h(App),
}).$mount('#app');

// 2) 若本地已有 token（已登录），启动即装配平台：拉菜单 + 注册并启动 qiankun。
//    token 失效时，后续请求 401 会触发强制登出。
if (store.state.token) {
  loadPlatform().catch((e) => {
    console.warn('[platform] 装配失败：', e && e.message);
  });
}
