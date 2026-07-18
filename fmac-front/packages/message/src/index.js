/**
 * @fmac/message
 * 统一消息提示：success / error / warning / confirm（另含 info）。
 *
 * UI 呈现经适配器隔离，真实实现由 @fmac/ui-adapter 提供、@fmac/core 注入。
 * 业务禁止直接 this.$message（见 CLAUDE.md 第十二节）。
 *
 * 用法：
 *   import message from '@fmac/message';
 *   message.success('保存成功');
 *   const ok = await message.confirm('确认删除？');
 */
import { createMessage } from './message.js';

export { createMessage };

/** 平台默认消息实例（单例）。 */
const message = createMessage();
export default message;
