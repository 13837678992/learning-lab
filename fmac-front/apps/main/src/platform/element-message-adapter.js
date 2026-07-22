import { Message, MessageBox } from 'element-ui';

/**
 * Element UI 消息适配器 —— 主应用注入到平台 `message` 能力。
 *
 * 使平台消息统一走 Element UI；子应用经 qiankun 注入的**共享 message 实例**复用同一适配器，
 * 无需各自引入 UI 框架，也满足「禁止子应用自行弹窗」。实现平台 message 契约：{ show, confirm }。
 */
const TYPES = ['success', 'warning', 'info', 'error'];

export function createElementMessageAdapter() {
  return {
    show(type, content, config = {}) {
      Message({
        type: TYPES.includes(type) ? type : 'info',
        message: content === null || content === undefined ? '' : String(content),
        duration: config.duration,
      });
    },
    confirm(options = {}) {
      return MessageBox.confirm(options.content || '确认执行该操作？', options.title || '提示', {
        confirmButtonText: options.confirmText || '确定',
        cancelButtonText: options.cancelText || '取消',
        type: options.type || 'warning',
        closeOnClickModal: false,
      })
        .then(() => true)
        .catch(() => false);
    },
  };
}
