/**
 * qiankun 运行期 publicPath 修正（webpack 专用）。
 * 必须在任何其它 import 之前执行：qiankun 挂载时资源从子应用真实源加载。
 */
if (window.__POWERED_BY_QIANKUN__) {
  // eslint-disable-next-line no-undef
  __webpack_public_path__ = window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__;
}
