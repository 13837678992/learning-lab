#!/usr/bin/env node
/**
 * @fmac/arch-check —— 架构守卫（Architecture Guard），零依赖。
 *
 * 把散落的人工 grep 校验固化为可执行、可纳入 CI 的自动检查，覆盖 CLAUDE.md 硬性约束：
 *   1. 顶级目录仅 apps/packages/configs/docs（第三节）
 *   2. qiankun 仅 packages/core 可引用（第八节）
 *   3. 依赖方向：shared 零 @fmac 依赖；中间层仅依赖 @fmac/shared；禁止反向依赖 core（第六节）
 *   4. 框架隔离：除 ui-adapter 外 packages 不得引入 Vue/Vuex/Pinia/Element/React/Redux（第七节）
 *   5. apps 只能经 @fmac/core 使用能力，禁止直连下层能力包；禁止 apps 相互依赖（第六节）
 *   6. 包级循环依赖检测（第六节）
 *
 * 用法：node configs/arch-check/index.js  （根 package.json 已提供 pnpm check:arch）
 * 违规时打印分组报告并以退出码 1 结束。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const ALLOWED_TOP_DIRS = new Set(['apps', 'packages', 'configs', 'docs']);
/** 顶级目录检查忽略的构建/依赖产物（均已 gitignore，非源码结构）。 */
const IGNORED_TOP_DIRS = new Set(['node_modules', 'coverage', 'dist', 'build']);
const CAPABILITY_PKGS = new Set([
  'router',
  'store',
  'request',
  'event',
  'loading',
  'message',
  'cache',
  'auth',
  'tab',
  'ui-adapter',
  'plugin',
]);
/** @fmac 包中 apps 可直接 import 的白名单（非运行时能力）。 */
const APP_ALLOWED_FMAC = new Set(['@fmac/core', '@fmac/constants', '@fmac/env']);
/** 框架 specifier（除 ui-adapter 外禁止出现在 packages）。 */
const FRAMEWORK_SPECIFIERS = new Set([
  'vue',
  'vuex',
  'pinia',
  'element-ui',
  'element-plus',
  'react',
  'react-dom',
  'redux',
  '@vue/composition-api',
  'vue-router',
]);

const violations = [];
const fail = (rule, detail) => violations.push({ rule, detail });
const rel = (f) => path.relative(ROOT, f);

// ———————————————————————————— 文件/依赖读取工具 ————————————————————————————
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.'))
      continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(js|mjs|cjs|vue)$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** 抽取源码中的 import/export-from/动态 import/require 的 specifier。 */
function importsOf(file) {
  const src = fs.readFileSync(file, 'utf8');
  const specs = new Set();
  const patterns = [
    /\bfrom\s+['"]([^'"]+)['"]/g,
    /\bimport\s+['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(src))) specs.add(m[1]);
  }
  return [...specs];
}

const readJSON = (p) => {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
};

const listDirs = (base) =>
  fs.existsSync(base)
    ? fs
        .readdirSync(base, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
    : [];

// ———————————————————————————— 1) 顶级目录 ————————————————————————————
for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
  if (!entry.isDirectory() || IGNORED_TOP_DIRS.has(entry.name) || entry.name.startsWith('.'))
    continue;
  if (!ALLOWED_TOP_DIRS.has(entry.name)) {
    fail('top-level-dir', `禁止的顶级目录 ${entry.name}/（仅允许 apps/packages/configs/docs）`);
  }
}

// ———————————————————————————— 2) qiankun 边界 ————————————————————————————
const CORE_DIR = path.join(ROOT, 'packages', 'core') + path.sep;
for (const f of [...walk(path.join(ROOT, 'packages')), ...walk(path.join(ROOT, 'apps'))]) {
  if (importsOf(f).includes('qiankun') && !f.startsWith(CORE_DIR)) {
    fail('qiankun-boundary', `qiankun 仅允许在 packages/core 引用：${rel(f)}`);
  }
}

// ———————————————————————————— 3) 包依赖方向 + 4) 框架隔离（package.json）——————————————
const pkgNames = listDirs(path.join(ROOT, 'packages'));
for (const name of pkgNames) {
  const pj = readJSON(path.join(ROOT, 'packages', name, 'package.json'));
  if (!pj) continue;
  const deps = Object.keys(pj.dependencies || {});
  const fmacDeps = deps.filter((d) => d.startsWith('@fmac/'));

  if (name === 'shared') {
    if (fmacDeps.length)
      fail('dep-direction', `shared 不应依赖任何 @fmac 包：${fmacDeps.join(', ')}`);
  } else if (CAPABILITY_PKGS.has(name)) {
    const illegal = fmacDeps.filter((d) => d !== '@fmac/shared');
    if (illegal.length) {
      fail(
        'dep-direction',
        `中间层包 ${name} 只能依赖 @fmac/shared，越权依赖：${illegal.join(', ')}`,
      );
    }
  }
  if (name !== 'core' && fmacDeps.includes('@fmac/core')) {
    fail('dep-direction', `${name} 反向依赖 @fmac/core`);
  }
  // 框架隔离（除 ui-adapter）：package.json 依赖层面
  if (name !== 'ui-adapter') {
    const fw = deps.filter((d) => FRAMEWORK_SPECIFIERS.has(d));
    if (fw.length)
      fail(
        'framework-isolation',
        `packages/${name} 依赖框架 ${fw.join(', ')}（仅 ui-adapter 可依赖具体框架）`,
      );
  }
}

// 4b) 框架隔离：源码 import 层面
for (const name of pkgNames) {
  if (name === 'ui-adapter') continue;
  for (const f of walk(path.join(ROOT, 'packages', name, 'src'))) {
    const bad = importsOf(f).filter((s) => FRAMEWORK_SPECIFIERS.has(s));
    if (bad.length)
      fail(
        'framework-isolation',
        `${rel(f)} 引入框架 ${bad.join(', ')}（仅 ui-adapter 可依赖具体框架）`,
      );
  }
}

// ———————————————————————————— 5) apps 边界 ————————————————————————————
const appNames = listDirs(path.join(ROOT, 'apps'));
const appDirs = appNames.map((a) => path.join(ROOT, 'apps', a));
for (const app of appNames) {
  const appDir = path.join(ROOT, 'apps', app);
  // 5a) 源码不得直连下层能力包
  for (const f of walk(path.join(appDir, 'src'))) {
    for (const spec of importsOf(f)) {
      if (spec.startsWith('@fmac/') && !APP_ALLOWED_FMAC.has(spec)) {
        fail('app-boundary', `${rel(f)} 直连下层能力包 ${spec}（apps 只能经 @fmac/core 使用能力）`);
      }
      // 5b) 禁止跨 app 相对引用
      if (spec.startsWith('.')) {
        const resolved = path.resolve(path.dirname(f), spec);
        const other = appDirs.find(
          (d) => d !== appDir && (resolved === d || resolved.startsWith(d + path.sep)),
        );
        if (other) fail('app-boundary', `${rel(f)} 跨应用引用 ${spec}（apps 禁止相互依赖）`);
      }
    }
  }
  // 5c) package.json 不得依赖能力包或其它 app
  const pj = readJSON(path.join(appDir, 'package.json')) || {};
  const allDeps = Object.keys({ ...(pj.dependencies || {}), ...(pj.devDependencies || {}) });
  for (const d of allDeps) {
    if (d.startsWith('@fmac/') && !APP_ALLOWED_FMAC.has(d)) {
      fail('app-boundary', `apps/${app} package.json 依赖下层能力包 ${d}`);
    }
  }
}

// ———————————————————————————— 6) 包级循环依赖 ————————————————————————————
const graph = new Map(); // @fmac/name -> [@fmac deps]
for (const scope of ['packages', 'configs']) {
  for (const name of listDirs(path.join(ROOT, scope))) {
    const pj = readJSON(path.join(ROOT, scope, name, 'package.json'));
    if (!pj || !pj.name) continue;
    graph.set(
      pj.name,
      Object.keys(pj.dependencies || {}).filter((d) => d.startsWith('@fmac/')),
    );
  }
}
const WHITE = 0,
  GRAY = 1,
  BLACK = 2;
const color = new Map([...graph.keys()].map((k) => [k, WHITE]));
const stack = [];
function dfs(node) {
  color.set(node, GRAY);
  stack.push(node);
  for (const dep of graph.get(node) || []) {
    if (!graph.has(dep)) continue;
    if (color.get(dep) === GRAY) {
      const cycle = stack.slice(stack.indexOf(dep)).concat(dep).join(' → ');
      fail('cycle', `检测到循环依赖：${cycle}`);
    } else if (color.get(dep) === WHITE) {
      dfs(dep);
    }
  }
  stack.pop();
  color.set(node, BLACK);
}
for (const node of graph.keys()) if (color.get(node) === WHITE) dfs(node);

// ———————————————————————————— 报告 ————————————————————————————
const CHECKS = ['顶级目录', 'qiankun 边界', '依赖方向', '框架隔离', 'apps 边界', '循环依赖'];
if (violations.length === 0) {
  console.log(`✅ 架构守卫通过（${CHECKS.length} 项检查：${CHECKS.join(' / ')}）`);
  process.exit(0);
}
console.error(`❌ 架构守卫发现 ${violations.length} 处违规：\n`);
const byRule = violations.reduce((acc, v) => ((acc[v.rule] ||= []).push(v.detail), acc), {});
for (const [rule, list] of Object.entries(byRule)) {
  console.error(`  [${rule}]`);
  for (const d of list) console.error(`    - ${d}`);
}
console.error('\n依赖规则见 docs/architecture/dependency.md；请修复后重试。');
process.exit(1);
