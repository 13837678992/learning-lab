/**
 * @fmac/loading
 * 统一全局 Loading：show / hide / withLoading。
 *
 * UI 呈现经适配器隔离（默认 no-op），真实实现由 @fmac/ui-adapter 提供、@fmac/core 注入。
 *
 * 用法：
 *   import loading from '@fmac/loading';
 *   loading.show();
 *   loading.hide();
 *   const data = await loading.withLoading(() => request.get('/api'));
 */
import { createLoading } from './loading.js';

export { createLoading };

/** 平台默认全局 Loading 实例（单例）。 */
const loading = createLoading();
export default loading;
