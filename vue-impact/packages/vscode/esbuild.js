const path = require('node:path');
const esbuild = require('esbuild');

// @vue/compiler-sfc 内含 consolidate（可选模板引擎加载器），
// 其 require('velocityjs') 等可选依赖在运行时被 try/catch 吞掉；
// 此插件把无法解析的裸 require 外部化，避免打包失败。
const optionalRequireExternal = {
  name: 'optional-require-external',
  setup(build) {
    build.onResolve({ filter: /.*/ }, (args) => {
      if (args.kind !== 'require-call' && args.kind !== 'require-resolve') return null;
      if (args.path.startsWith('.') || args.path.startsWith('/') || args.path.startsWith('node:')) return null;
      try {
        require.resolve(args.path, { paths: [args.resolveDir] });
        return null; // 可解析，交给 esbuild 正常打包
      } catch {
        return { path: args.path, external: true }; // 可选依赖缺失，外部化（运行时 try/catch 吞掉）
      }
    });
  },
};

async function main() {
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src', 'extension.ts')],
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    outfile: path.join(__dirname, 'dist', 'extension.js'),
    sourcemap: false,
    minify: false,
    logLevel: 'warning',
    external: ['vscode'],
    plugins: [optionalRequireExternal],
    alias: {
      'vue-impact-core': path.join(__dirname, '..', 'core', 'src', 'index.ts'),
    },
  });
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
