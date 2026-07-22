import Vue from 'vue';
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import App from './App.vue';
import router from './router/index.js';
import { setupPlatform } from './platform.js';
import { setupMicroApps } from './micro/index.js';
import { setupSession } from './platform/session.js';

Vue.use(ElementUI);
Vue.config.productionTip = false;

// 1) 装配平台能力（vue-router 适配器 / Element UI 消息适配器 / request 配置）。
setupPlatform();

// 2) 注册平台鉴权 / 导航事件监听（AUTH_EXPIRED / GO_LOGIN / GO_HOME）。
setupSession();

// 3) 创建并挂载基座应用。
const app = new Vue({
  router,
  render: (h) => h(App),
});
app.$mount('#app');

// 4) 挂载完成后再注册并启动 qiankun（此时 Layout 内的 #subapp-viewport 容器已就绪）。
setupMicroApps();
