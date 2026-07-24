/**
 * Babel 配置（CommonJS，见 CLAUDE.md 第六节）。
 */
module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: { browsers: ['> 1%', 'last 2 versions', 'not dead', 'not ie <= 11'] },
      },
    ],
  ],
};
