const path = require('node:path');
const esbuild = require('esbuild');

esbuild.buildSync({
  entryPoints: [path.join(__dirname, '..', 'src', 'index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: path.join(__dirname, '..', 'dist', 'index.cjs'),
  sourcemap: false,
  minify: false,
  logLevel: 'warning',
  // compiler-sfc 的 CJS 产物内含大量可选模板引擎的动态 require，保持为运行时依赖
  external: ['@vue/compiler-sfc'],
});
