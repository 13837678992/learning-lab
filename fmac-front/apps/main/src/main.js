import Vue from 'vue';
import App from './App.vue';
import router from './router/index.js';
import { setupPlatform } from './platform.js';
import { setupMicroApps } from './micro/index.js';

Vue.config.productionTip = false;

// 1) 装配平台能力（注入 vue-router 适配器 / UI 适配器 / request 配置）。
setupPlatform();

// 2) 创建并挂载基座应用。
const app = new Vue({
  router,
  render: (h) => h(App),
});
app.$mount('#app');

// 3) 挂载完成后再注册并启动 qiankun（此时 Layout 内的 #subapp-viewport 容器已就绪）。
setupMicroApps();
