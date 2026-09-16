/**
 * VSIX 打包脚本（Windows 兼容：纯 Node，无 shell 依赖）
 * 使用 @vscode/vsce 编程接口打包 packages/vscode。
 */
const path = require('node:path');
const fs = require('node:fs');

// vsce 2.x 依赖的 undici 在 Node 18 缺少全局 File（Node 20+ 内置），此处补最小实现
if (typeof File === 'undefined') {
  globalThis.File = class File {
    constructor(bits, name, options) {
      this.name = String(name || '');
      const first = bits && bits[0];
      this.size = typeof first === 'string' ? first.length : first && typeof first.byteLength === 'number' ? first.byteLength : 0;
      this.type = (options && options.type) || '';
      this.lastModified = (options && options.lastModified) || Date.now();
    }
  };
}

const extDir = path.join(__dirname, '..', 'packages', 'vscode');
const distFile = path.join(extDir, 'dist', 'extension.js');

if (!fs.existsSync(distFile)) {
  console.error('[package] 未找到 dist/extension.js，请先执行 npm run build:vscode');
  process.exit(1);
}

// 文件名版本号取自扩展 manifest，避免与 package.json 版本漂移
const extManifest = JSON.parse(fs.readFileSync(path.join(extDir, 'package.json'), 'utf8'));
const version = extManifest.version || '0.0.0';

async function main() {
  // vsce 内部以相对路径 stat 打包文件，需在扩展目录下运行（vsce CLI 会自动 chdir，API 不会）
  const originalCwd = process.cwd();
  process.chdir(extDir);
  try {
    const vsce = require('@vscode/vsce');
    const out = await vsce.createVSIX({
      cwd: extDir,
      packagePath: path.join(__dirname, '..', `vue-impact-${version}.vsix`),
      useYarn: false,
      allowMissingRepository: true,
      // 扩展无运行时依赖（core / babel / compiler-sfc 均已打入 dist/extension.js），
      // 跳过 vsce 依赖扫描，避免 npm workspaces 符号链接导致的收集失败
      dependencies: false,
    });
    console.log('[package] 生成完成: ' + out);
  } finally {
    process.chdir(originalCwd);
  }
}

main().catch((err) => {
  console.error('[package] 打包失败: ' + (err && err.message ? err.message : err));
  if (err && err.stack) console.error(err.stack);
  process.exit(1);
});
