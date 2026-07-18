import Vue from 'vue';
import { renderWithQiankun, qiankunWindow } from 'vite-plugin-qiankun/dist/helper';
import App from './App.vue';
import { createAppRouter } from './router/index.js';
import { setupPlatform, bindSharedPlatform } from './platform.js';
import { MICRO_APPS, SUBAPPS } from '@fmac/constants';

Vue.config.productionTip = false;

const ROOT_ID = 'app-user';
const POWERED = qiankunWindow.__POWERED_BY_QIANKUN__;

let instance = null;
let router = null;

function render(props = {}) {
  const { container } = props;
  if (!router) {
    router = createAppRouter(POWERED);
    setupPlatform(router, {
      baseURL: import.meta.env.VITE_API_BASE || SUBAPPS[MICRO_APPS.USER].apiBase,
    });
  }
  instance = new Vue({ router, render: (h) => h(App) });
  const mountPoint = container ? container.querySelector(`#${ROOT_ID}`) : `#${ROOT_ID}`;
  instance.$mount(mountPoint);
}

// —— qiankun 标准生命周期（经 vite-plugin-qiankun 暴露；子应用不直接引用 qiankun）——
renderWithQiankun({
  bootstrap() {
    // 子应用初始化（仅执行一次）。
  },
  async mount(props) {
    // 采用主应用注入的共享平台（store / event 跨应用一致）。
    bindSharedPlatform(props && props.platform);
    render(props);
  },
  async unmount() {
    // §16：卸载时销毁实例、清理 DOM，避免内存泄漏。
    if (instance) {
      instance.$destroy();
      if (instance.$el && instance.$el.parentNode) instance.$el.innerHTML = '';
      instance = null;
    }
  },
  update() {},
});

// —— standalone 运行 ——
if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  render();
}
