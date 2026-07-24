/**
 * Babel 配置（CommonJS，见 CLAUDE.md 第六节：Node 配置文件一律 module.exports）。
 * 业务源码为 ESM，由 babel + preset-env 转译为目标浏览器可运行的语法。
 * import() 动态导入交给 webpack 处理，preset-env 不转译其语义。
 */
module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        // 面向现代浏览器；qiankun 场景下主子应用运行于同一浏览器环境。
        targets: { browsers: ['> 1%', 'last 2 versions', 'not dead', 'not ie <= 11'] },
      },
    ],
  ],
};
