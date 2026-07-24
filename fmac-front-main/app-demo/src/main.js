import './public-path';
import Vue from 'vue';
import App from './App.vue';
import { createRouter } from './router';
import { setContext, bindGlobalState, unbindGlobalState } from './context';

Vue.config.productionTip = false;

/**
 * qiankun 生命周期（webpack UMD 导出式；子应用不直接引用 qiankun）。
 * - 独立运行（standalone）：直接渲染。
 * - qiankun 环境：由基座调用 bootstrap/mount/unmount。
 * - unmount 清理实例与路由，避免内存泄漏（见 CLAUDE.md 测试规范）。
 */
const POWERED = typeof window !== 'undefined' && !!window.__POWERED_BY_QIANKUN__;
const ROOT_ID = 'app-demo-root';

let instance = null;
let router = null;

function render(props = {}) {
  const { container } = props;
  router = createRouter(POWERED);
  instance = new Vue({ router, render: (h) => h(App) });
  const mountEl = container ? container.querySelector(`#${ROOT_ID}`) : `#${ROOT_ID}`;
  instance.$mount(mountEl);
}

// 独立运行时立即渲染。
if (!POWERED) render();

export async function bootstrap() {
  console.log('[app-demo] bootstrap');
}

export async function mount(props) {
  console.log('[app-demo] mount', props);
  // 主 → 子：保存挂载时下发的上下文，并订阅全局状态持续同步（Phase 4）。
  setContext(props);
  bindGlobalState(props);
  render(props);
}

export async function unmount() {
  console.log('[app-demo] unmount');
  // 清理全局状态订阅，避免内存泄漏。
  unbindGlobalState();
  if (instance) {
    instance.$destroy();
    if (instance.$el && instance.$el.parentNode) instance.$el.innerHTML = '';
    instance = null;
  }
  router = null;
}
