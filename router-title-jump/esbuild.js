'use strict';

/**
 * esbuild 打包脚本。
 *
 * 为什么打包：@babel/traverse 依赖树很大，直接随源码发布会让扩展体积和冷启动
 * 变差。用 esbuild 把 src/extension.js 及其依赖打成单个 dist/extension.js，
 * 体积小、加载快。`vscode` 由宿主在运行时注入，必须 external。
 *
 * 用法：
 *   node esbuild.js              开发构建（含 sourcemap）
 *   node esbuild.js --production 生产构建（压缩、无 sourcemap）
 *   node esbuild.js --watch      监听构建（配合 F5 调试）
 */

const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * 监听模式下在每次重建的起止打点，供 .vscode/tasks.json 的 background
 * problemMatcher 识别「构建开始 / 构建结束」，避免 preLaunchTask 卡住。
 * @type {import('esbuild').Plugin}
 */
const watchLoggerPlugin = {
  name: 'watch-logger',
  setup(build) {
    build.onStart(() => console.log('[watch] build started'));
    build.onEnd((result) => {
      for (const { text, location } of result.errors) {
        console.error(`✘ [ERROR] ${text}`);
        if (location) {
          console.error(`    ${location.file}:${location.line}:${location.column}`);
        }
      }
      console.log('[watch] build finished');
    });
  },
};

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
  entryPoints: ['src/extension.js'],
  bundle: true,
  outfile: 'dist/extension.js',
  platform: 'node',
  format: 'cjs',
  // VSCode 1.70 的 Electron 内置 Node 16，target 取 node16 最安全。
  target: 'node16',
  // vscode 模块由扩展宿主注入，不能打进产物。
  external: ['vscode'],
  sourcemap: !production,
  minify: production,
  logLevel: 'info',
  plugins: watch ? [watchLoggerPlugin] : [],
};

async function main() {
  if (watch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('[esbuild] watching…');
  } else {
    await esbuild.build(buildOptions);
    console.log('[esbuild] build complete');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
