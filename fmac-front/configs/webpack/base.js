/**
 * 预留：基于 webpack / Module Federation 的构建基线配置工厂。
 *
 * 当前平台使用 Vite（见各 app 的 vite.config.js）。本目录为未来支持 webpack 或
 * Module Federation 子应用预留，返回纯配置对象、不直接依赖 webpack（避免引入不必要依赖）。
 */

/** 生成 webpack 基线配置对象（接入 webpack 时按需扩展 module / plugins / devServer）。 */
export function createBaseConfig(options = {}) {
  const { mode = 'development', publicPath = '/', libraryName = 'fmacApp' } = options;
  return {
    mode,
    output: {
      publicPath,
      // qiankun 子应用需 UMD 输出；跨域头 / chunk 命名等在实际接入时补充。
      library: `${libraryName}-[name]`,
      libraryTarget: 'umd',
      globalObject: 'window',
    },
    // module / resolve / plugins / devServer 在实际接入 webpack 时补充。
  };
}
