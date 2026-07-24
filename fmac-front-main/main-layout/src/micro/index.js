import { registerMicroApps, start } from 'qiankun';
import { store } from '@/store';
import { buildMicroApps } from './apps';
import message from '@/utils/message';

/**
 * 注册并启动 qiankun 子应用（见 TASK Phase 2）。
 * - registerMicroApps：由菜单派生的子应用列表 + 生命周期钩子。
 * - start：启用样式隔离（experimentalStyleIsolation），关闭预取。
 * - 仅执行一次；主子动态通信（initGlobalState）在 Phase 4 于此扩展。
 */
let started = false;

export function setupMicroApps(menu) {
  if (started) return;

  const apps = buildMicroApps(menu).map((app) => ({
    name: app.name,
    entry: app.entry,
    activeRule: app.activeRule,
    container: '#subapp-viewport',
    props: {
      // 主 → 子：挂载时下发一次基础上下文（Phase 4 用 initGlobalState 做持续同步）。
      token: store.state.token,
      userInfo: store.state.userInfo,
      menu: store.state.menu,
    },
  }));

  store.setMicroApps(apps);
  if (!apps.length) return;

  registerMicroApps(apps, {
    beforeLoad: [(app) => console.log(`[qiankun] beforeLoad: ${app.name}`)],
    beforeMount: [(app) => console.log(`[qiankun] beforeMount: ${app.name}`)],
    afterMount: [(app) => console.log(`[qiankun] afterMount: ${app.name}`)],
    beforeUnmount: [(app) => console.log(`[qiankun] beforeUnmount: ${app.name}`)],
    afterUnmount: [(app) => console.log(`[qiankun] afterUnmount: ${app.name}`)],
  });

  // 全局加载异常兜底提示。
  window.addEventListener('unhandledrejection', (e) => {
    if (e && e.reason && /application.*died|died in status/i.test(String(e.reason.message || e.reason))) {
      message.error(`子应用加载异常：${e.reason.message || e.reason}`);
    }
  });

  start({
    prefetch: false,
    sandbox: { strictStyleIsolation: false, experimentalStyleIsolation: true },
  });
  started = true;
}
