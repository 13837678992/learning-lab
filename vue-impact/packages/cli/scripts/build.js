const path = require('node:path');
const esbuild = require('esbuild');

esbuild.buildSync({
  entryPoints: [path.join(__dirname, '..', 'src', 'index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: path.join(__dirname, '..', 'dist', 'cli.cjs'),
  banner: { js: '#!/usr/bin/env node' },
  sourcemap: false,
  minify: false,
  logLevel: 'warning',
  external: ['@vue/compiler-sfc'],
  alias: {
    'vue-impact-core': path.join(__dirname, '..', '..', 'core', 'src', 'index.ts'),
  },
});
