/**
 * @fmac/event
 * 跨应用事件总线：on / off / once / emit（框架无关）。
 *
 * 临时的跨应用事件统一走本包；共享状态请用 @fmac/store，页面跳转请用 @fmac/router。
 *
 * 用法：
 *   import event from '@fmac/event';
 *   const off = event.on('user:login', (user) => {  ...  });
 *   event.emit('user:login', user);
 *   off();                       // 或 event.off('user:login', handler)
 */
import { createEventBus } from './event-bus.js';

export { createEventBus };

/** 平台默认全局事件总线（单例）。 */
const event = createEventBus();
export default event;
