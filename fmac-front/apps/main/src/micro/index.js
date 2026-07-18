import platform from '@fmac/core';
import { microApps } from './apps.js';

/**
 * 注册并启动 qiankun 子应用 —— 全部经由 @fmac/core（平台唯一 qiankun 入口，见 CLAUDE.md 第八节）。
 * 生命周期钩子里复用平台的 loading / message 能力，保持一致体验。
 *
 * 注：本函数使用平台 SDK（platform.registerApps / start），不直接调用 qiankun。
 */
export function setupMicroApps() {
  // 经 qiankun props 把主应用的平台实例注入子应用，使 store / event 跨应用共享同一实例
  // （不使用 window 通信，见 CLAUDE.md 第九节）。
  const apps = microApps.map((app) => ({ ...app, props: { ...app.props, platform } }));

  platform.registerApps(apps, {
    beforeLoad: [(app) => platform.loading.show({ text: `加载 ${app.name} ...` })],
    afterMount: [() => platform.loading.hide()],
    afterUnmount: [() => platform.loading.hide()],
  });

  platform.onError((error) => {
    platform.loading.hide(true);
    platform.message.error(`子应用加载异常：${error && error.message ? error.message : error}`);
  });

  // Event：主应用监听 finance-demo 广播的 finance:update。
  platform.event.on('finance:update', (payload) => {
    platform.message.info(
      `收到 finance:update（${payload && payload.module ? payload.module : ''}）`,
    );
  });

  // 样式隔离由 core 强制 strictStyleIsolation（见 CLAUDE.md 第十七节）。
  platform.start();
}
