/**
 * @fmac/tab
 * 统一多标签页（Tab）管理：跨应用的标签页增删、切换与刷新。
 *
 * 多标签页状态统一走本包，避免各应用各自维护标签栏。
 *
 * 用法：
 *   import tab from '@fmac/tab';
 *   const off = tab.subscribe(({ tabs, activeKey }) => renderTabBar(tabs, activeKey));
 *   tab.add({ key: '/order', title: '订单', path: '/order' });
 *   tab.setActive('/order');
 */
import { createTabManager } from './tab.js';

export { createTabManager };

/** 平台默认标签管理实例（单例）。 */
const tab = createTabManager();
export default tab;
