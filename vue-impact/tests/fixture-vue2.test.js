'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const {
  analyze,
  clearProjectCache,
  formatTestScope,
  formatMarkdown,
  formatJSON,
} = require('../packages/core/dist/index.cjs');

const FIXTURE = path.join(__dirname, 'fixtures', 'vue2-demo');
const commonTable = path.join(FIXTURE, 'src', 'components', 'CommonTable.vue');
const requestJs = path.join(FIXTURE, 'src', 'utils', 'request.js');
const userTable = path.join(FIXTURE, 'src', 'components', 'UserTable.vue');
const orderTable = path.join(FIXTURE, 'src', 'components', 'OrderTable.vue');
const dashboard = path.join(FIXTURE, 'src', 'views', 'Dashboard.vue');
const layout = path.join(FIXTURE, 'src', 'layout', 'AppLayout.vue');

function routePaths(result) {
  return result.routes.map((r) => r.path).sort();
}

test('fixture: 分析 CommonTable.vue 得到 /user /user/list /order /system/user（不含 /dashboard）', () => {
  clearProjectCache(FIXTURE);
  const result = analyze([commonTable]);
  const paths = routePaths(result);
  assert.deepStrictEqual(paths, ['/order', '/system/user', '/user', '/user/list']);
  assert.ok(!paths.includes('/dashboard'));
  assert.ok(!paths.includes('/system/role'));
});

test('fixture: 分析 request.js（被 CommonTable 引用）同样得到 4 个页面', () => {
  const result = analyze([requestJs]);
  assert.deepStrictEqual(routePaths(result), ['/order', '/system/user', '/user', '/user/list']);
});

test('fixture: 多目标合并去重', () => {
  const result = analyze([commonTable, orderTable]);
  assert.deepStrictEqual(routePaths(result), ['/order', '/system/user', '/user', '/user/list']);
});

test('fixture: 分析 Dashboard.vue 只得到 /dashboard', () => {
  const result = analyze([dashboard]);
  assert.deepStrictEqual(routePaths(result), ['/dashboard']);
});

test('fixture: 分析 Layout 得到其下所有子路由', () => {
  const result = analyze([layout]);
  assert.deepStrictEqual(routePaths(result), ['/system/role', '/system/user']);
});

test('fixture: 路由组件带别名解析的绝对路径', () => {
  const result = analyze([commonTable]);
  const user = result.routes.find((r) => r.path === '/user');
  assert.ok(user);
  assert.ok(user.component.endsWith(path.join('src', 'views', 'User.vue')));
});

test('fixture: 影响链 路由 -> ... -> 目标', () => {
  const result = analyze([commonTable]);
  const chain = result.chains.find((c) => c.routePath === '/user');
  assert.ok(chain, '存在 /user 的影响链');
  const names = chain.chain.map((f) => path.basename(f));
  assert.deepStrictEqual(names, ['User.vue', 'UserTable.vue', 'CommonTable.vue']);
});

test('fixture: Layout 路由影响链包含布局文件与子页面组件', () => {
  const result = analyze([commonTable]);
  const chain = result.chains.find((c) => c.routePath === '/system/user');
  assert.ok(chain);
  const names = chain.chain.map((f) => path.basename(f));
  assert.deepStrictEqual(names, ['SystemUser.vue', 'UserTable.vue', 'CommonTable.vue']);
  const route = result.routes.find((r) => r.path === '/system/user');
  assert.ok(route.layoutFiles.some((f) => f.endsWith('AppLayout.vue')));
});

test('fixture: Vue 版本识别为 2', () => {
  const result = analyze([commonTable]);
  assert.strictEqual(result.vueVersion, 2);
});

test('fixture: 报告器输出', () => {
  const result = analyze([commonTable]);
  const scope = formatTestScope(result);
  assert.ok(scope.includes('/user'));
  assert.ok(scope.includes('/user/list'));
  assert.ok(scope.includes('/order'));
  const md = formatMarkdown(result);
  assert.ok(md.includes('## Vue Impact Analysis'));
  assert.ok(md.includes('`/user`'));
  const json = JSON.parse(formatJSON(result));
  assert.strictEqual(json.count, 4);
  assert.ok(Array.isArray(json.routes));
  assert.strictEqual(json.routes[0].path, '/order');
  assert.strictEqual(json.targetFiles[0], 'src/components/CommonTable.vue');
});

test('fixture: 第二次分析命中缓存', () => {
  clearProjectCache(FIXTURE);
  const first = analyze([commonTable]);
  assert.ok(first.stats.cacheHits === 0);
  const second = analyze([commonTable]);
  assert.ok(second.stats.cacheHits > 0, '第二次应命中缓存');
});

test('fixture: 修改文件后缓存失效', () => {
  clearProjectCache(FIXTURE);
  analyze([commonTable]);
  const fs = require('node:fs');
  const content = fs.readFileSync(commonTable, 'utf8');
  fs.writeFileSync(commonTable, content + '\n// touch\n');
  try {
    const third = analyze([commonTable]);
    assert.ok(third.stats.cacheHits < third.stats.filesScanned);
  } finally {
    fs.writeFileSync(commonTable, content);
  }
});
