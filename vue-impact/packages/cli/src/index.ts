/**
 * Vue Impact CLI
 * 用法：
 *   vue-impact src\components\CommonTable.vue
 *   vue-impact src\utils\request.js src\utils\auth.js
 *   vue-impact src\utils\request.js --json
 *   vue-impact src\utils\request.js --verbose
 *   vue-impact --project <dir> <files...>
 *   vue-impact --clear-cache [--project <dir>]
 */
import * as path from 'node:path';
import {
  analyze,
  clearProjectCache,
  findProjectRoot,
  formatJSON,
  formatMarkdown,
  formatTestScope,
  formatText,
  version,
} from 'vue-impact-core';

const HELP = `Vue Impact Analyzer v${version}

用法:
  vue-impact <文件...> [选项]

示例:
  vue-impact src\\components\\CommonTable.vue
  vue-impact src\\utils\\request.js src\\utils\\auth.js
  vue-impact src\\utils\\request.js --json
  vue-impact src\\utils\\request.js --verbose

选项:
  --json              以 JSON 格式输出
  --markdown          以 Markdown 格式输出
  --verbose           详细输出（含影响链与警告）
  --project <dir>     指定项目根目录（默认自动发现）
  --clear-cache       清除分析缓存
  -h, --help          显示帮助

安装:
  在 packages\\cli 目录执行  npm install -g .  即可全局使用 vue-impact 命令；
  仓库内也可用  npm run cli -- <文件>  或  npx vue-impact <文件> 直接运行。
`;

function normalizeArg(a: string): string {
  // 兼容 Windows 反斜杠路径（在任意平台传入均能解析）
  return a.replace(/\\/g, path.sep);
}

function main(argv: string[]): number {
  const args = [...argv];
  let json = false;
  let markdown = false;
  let verbose = false;
  let clearCache = false;
  let projectRoot: string | undefined;
  const files: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--json') json = true;
    else if (a === '--markdown') markdown = true;
    else if (a === '--verbose') verbose = true;
    else if (a === '--clear-cache') clearCache = true;
    else if (a === '--project') {
      i++;
      if (i < args.length) projectRoot = normalizeArg(args[i]);
    } else if (a === '-h' || a === '--help') {
      console.log(HELP);
      return 0;
    } else if (a.startsWith('-')) {
      console.error(`未知选项: ${a}`);
      console.error(HELP);
      return 1;
    } else {
      files.push(normalizeArg(a));
    }
  }

  const root = projectRoot
    ? path.resolve(projectRoot)
    : files.length > 0
      ? findProjectRoot(path.resolve(files[0]))
      : process.cwd();

  if (clearCache) {
    const dir = clearProjectCache(root);
    console.log(`已清除缓存: ${dir}`);
    if (files.length === 0) return 0;
  }

  if (files.length === 0) {
    console.error('错误: 未指定要分析的文件。');
    console.error(HELP);
    return 1;
  }

  try {
    const result = analyze(files, { projectRoot: root });

    if (json) {
      console.log(formatJSON(result));
    } else if (markdown) {
      console.log(formatMarkdown(result));
    } else if (verbose) {
      console.log(formatText(result));
    } else {
      console.log(formatText(result));
    }

    if (!json && !markdown && result.routes.length > 0 && !verbose) {
      console.log('');
      console.log('测试范围:');
      console.log(formatTestScope(result));
    }
    return 0;
  } catch (err) {
    console.error('分析失败: ' + (err instanceof Error ? err.message : String(err)));
    return 1;
  }
}

process.exitCode = main(process.argv.slice(2));
