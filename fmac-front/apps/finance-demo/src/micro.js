import Vue from 'vue';
import App from './App.vue';
import { createAppRouter } from './router/index.js';
import {
  setupPlatform,
  bindSharedPlatform,
  getEvent,
  getStore,
  getMessage,
  API_BASE,
} from './platform.js';

/**
 * qiankun 生命周期（webpack UMD 导出式；子应用不直接引用 qiankun）。
 * mount 创建实例并登记跨应用监听 / 定时器；unmount 逐一清理，验证无内存泄漏（§12）。
 */
const ROOT_ID = 'app-finance';
export const POWERED = typeof window !== 'undefined' && !!window.__POWERED_BY_QIANKUN__;

let instance = null;
let router = null;
let offGlobalRefresh = null;
let heartbeat = null;

function render(props = {}) {
  const { container } = props;
  // 每次挂载重建 router（unmount 时置空），指向当前实例。
  router = createAppRouter(POWERED);
  setupPlatform(router, { baseURL: API_BASE });
  instance = new Vue({ router, render: (h) => h(App) });
  instance.$mount(container ? container.querySelector(`#${ROOT_ID}`) : `#${ROOT_ID}`);
}

/** 独立运行（standalone）。 */
export function renderStandalone() {
  render();
}

export async function bootstrap() {}

export async function mount(props) {
  bindSharedPlatform(props && props.platform);
  render(props);

  // Event：监听主应用广播的 global:refresh，写入共享 store 供各页面响应。
  offGlobalRefresh = getEvent().on('global:refresh', () => {
    getStore().set('finance:lastRefresh', Date.now());
    getMessage().info('finance-demo 收到 global:refresh');
  });

  // 示例定时器（心跳）——unmount 必须清理。
  heartbeat = setInterval(() => {
    /* 业务心跳占位 */
  }, 30000);
}

export async function unmount() {
  // §12：清理 event 监听、timer、实例、router，避免内存泄漏。
  if (offGlobalRefresh) {
    offGlobalRefresh();
    offGlobalRefresh = null;
  }
  if (heartbeat) {
    clearInterval(heartbeat);
    heartbeat = null;
  }
  if (instance) {
    instance.$destroy();
    if (instance.$el && instance.$el.parentNode) instance.$el.innerHTML = '';
    instance = null;
  }
  router = null;
}
