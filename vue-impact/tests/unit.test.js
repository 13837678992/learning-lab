'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const core = require('../packages/core/dist/index.cjs');
const { joinRoutePaths, ModuleResolver, loadAliases, DependencyGraph } = core;

const VUE2 = path.join(__dirname, 'fixtures', 'vue2-demo');

test('joinRoutePaths: children 路径拼接', () => {
  assert.strictEqual(joinRoutePaths('/system', 'user'), '/system/user');
  assert.strictEqual(joinRoutePaths('/system', '/user'), '/user');
  assert.strictEqual(joinRoutePaths('', '/user'), '/user');
  assert.strictEqual(joinRoutePaths('/a/', '/b/'), '/b'); // 子路径以 / 开头视为绝对
  assert.strictEqual(joinRoutePaths('/system', ''), '/system');
  assert.strictEqual(joinRoutePaths('/system', 'user/detail'), '/system/user/detail');
});

test('alias: 从 vue.config.js 自动读取 @ 与 @@', () => {
  const aliases = loadAliases(VUE2);
  assert.ok(aliases.has('@'), '应有 @ 别名');
  assert.ok(aliases.get('@').endsWith(path.join('src')));
  assert.ok(aliases.has('@@'), '应有 @@ 别名');
});

test('resolver: alias / 相对路径 / 扩展名补全 / index 解析', () => {
  const aliases = loadAliases(VUE2);
  const resolver = new ModuleResolver({ projectRoot: VUE2, aliases });
  const from = path.join(VUE2, 'src', 'router', 'index.js');

  const viaAlias = resolver.resolve('@/views/User.vue', from);
  assert.strictEqual(viaAlias, path.join(VUE2, 'src', 'views', 'User.vue'));

  const viaRelative = resolver.resolve('./routes', from);
  assert.strictEqual(viaRelative, path.join(VUE2, 'src', 'router', 'routes.js'));

  const noExt = resolver.resolve('@/views/Order', from);
  assert.strictEqual(noExt, path.join(VUE2, 'src', 'views', 'Order.vue'));

  const dirIndex = resolver.resolve('@/components', from);
  assert.ok(dirIndex === null, 'components 无 index 文件');
});

test('resolver: external 包返回 null', () => {
  const resolver = new ModuleResolver({ projectRoot: VUE2, aliases: new Map() });
  assert.strictEqual(resolver.classify('element-ui'), 'external');
  assert.strictEqual(resolver.resolve('element-ui', path.join(VUE2, 'a.js')), null);
});

test('graph: 反向依赖与自环保护', () => {
  const g = new DependencyGraph();
  g.addDependency('/a.js', '/b.js');
  g.addDependency('/b.js', '/c.js');
  g.addDependency('/a.js', '/a.js'); // 自环
  assert.deepStrictEqual(g.importersOf('/c.js'), ['/b.js']);
  assert.deepStrictEqual(g.importersOf('/b.js'), ['/a.js']);
  assert.deepStrictEqual(g.dependenciesOf('/a.js'), ['/b.js']);
});

test('tsconfig/jsconfig alias: vue3-demo 的 jsconfig paths', () => {
  const VUE3 = path.join(__dirname, 'fixtures', 'vue3-demo');
  const aliases = loadAliases(VUE3);
  assert.ok(aliases.has('@'));
  assert.ok(aliases.get('@').endsWith(path.join('src')));
});

test('扫描器：正常收集源码文件', () => {
  const tmp = path.join(__dirname, 'fixtures', 'vue2-demo', 'src', 'temp-scan-dir');
  fs.mkdirSync(tmp, { recursive: true });
  fs.writeFileSync(path.join(tmp, 'x.js'), 'export const x = 1');
  try {
    const files = core.scanProject(VUE2, {});
    assert.ok(files.some((f) => f.file.includes('temp-scan-dir')), '扫描应收集到新文件');
    assert.ok(!files.some((f) => f.file.includes('node_modules')), '不应包含 node_modules');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('扫描器：默认排除 dist / coverage / .git', () => {
  for (const dir of ['dist', 'coverage', '.git']) {
    const tmp = path.join(__dirname, 'fixtures', 'vue2-demo', dir);
    fs.mkdirSync(tmp, { recursive: true });
    fs.writeFileSync(path.join(tmp, 'y.js'), 'export const y = 1');
  }
  try {
    const files = core.scanProject(VUE2, {});
    for (const dir of ['dist', 'coverage', '.git']) {
      const marker = path.join('vue2-demo', dir);
      assert.ok(!files.some((f) => f.file.includes(marker)), `${dir} 应被排除`);
    }
  } finally {
    for (const dir of ['dist', 'coverage', '.git']) {
      fs.rmSync(path.join(__dirname, 'fixtures', 'vue2-demo', dir), { recursive: true, force: true });
    }
  }
});

test('parser: meta.component 格式提取', () => {
  const code = `
const routes = [{
  path: 'frontwms/report-manager',
  meta: { title: '紫配覆盖率报表', component: () => import('@/views/reportmanager/PersonalDetailReport/index.vue') }
}]
new Router({ routes })
`;
  const out = core.parseFileContent('/t/index.js', code, 1, code.length);
  const usage = out.parsed.routerUsages.find((u) => u.kind === 'create');
  assert.ok(usage);
  assert.strictEqual(usage.source.type, 'identifier');
  const route = usage.source.inlineArray[0];
  assert.strictEqual(route.path, 'frontwms/report-manager');
  assert.strictEqual(route.component.type, 'import');
  assert.strictEqual(route.component.specifier, '@/views/reportmanager/PersonalDetailReport/index.vue');
});

test('parser: spread 子配置与路由对象变量引用提取', () => {
  const code = `
import reportRoutes from './modules/report'
const extra = { path: 'extra', component: () => import('@/views/Extra.vue') }
const routes = [...reportRoutes, extra]
new Router({ routes })
`;
  const out = core.parseFileContent('/t/index.js', code, 1, code.length);
  const usage = out.parsed.routerUsages.find((u) => u.kind === 'create');
  const arr = usage.source.inlineArray;
  assert.strictEqual(arr.length, 2);
  assert.strictEqual(arr[0].spreadFrom, 'reportRoutes');
  assert.strictEqual(arr[0].spreadSpecifier, './modules/report');
  assert.strictEqual(arr[0].spreadKind, 'default');
  assert.strictEqual(arr[1].routeRef, 'extra');
  assert.ok(arr[1].routeRefInline);
  assert.strictEqual(arr[1].routeRefInline.path, 'extra');
});

test('parser: children 为标识符 → spread 引用', () => {
  const { parse } = require('@babel/parser');
  const { parseRouteObject } = core;
  const ast = parse(`({ path: '/system', children: childRoutes })`, { sourceType: 'unambiguous' });
  const obj = ast.program.body[0].expression;
  const route = parseRouteObject(obj);
  assert.strictEqual(route.children.length, 1);
  assert.strictEqual(route.children[0].spreadFrom, 'childRoutes');
});
