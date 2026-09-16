'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const { analyze, clearProjectCache } = require('../packages/core/dist/index.cjs');

const FIXTURE = path.join(__dirname, 'fixtures', 'hui-style-demo');
const sharedTable = path.join(FIXTURE, 'src', 'components', 'SharedTable.vue');
const home = path.join(FIXTURE, 'src', 'views', 'Home.vue');
const about = path.join(FIXTURE, 'src', 'views', 'About.vue');
const tabEntry = path.join(FIXTURE, 'src', 'views', 'reportmanager', 'TabContainer', 'index.vue');

function routePaths(result) {
  return result.routes.map((r) => r.path).sort();
}

test('hui: 共享组件被多个二级标签页 + 入口文件使用 → 全部路由命中', () => {
  clearProjectCache(FIXTURE);
  const result = analyze([sharedTable]);
  assert.deepStrictEqual(routePaths(result), [
    '/frontwms/report-manager',
    '/frontwms/stock-report',
    '/frontwms/tab-container',
  ]);
  // 无前导斜杠的 path 自动规范化为绝对路径
  for (const r of result.routes) assert.ok(r.path.startsWith('/'));
});

test('hui: 不含共享组件的页面（home/about）不被误报', () => {
  const result = analyze([sharedTable]);
  const paths = routePaths(result);
  assert.ok(!paths.includes('/home'));
  assert.ok(!paths.includes('/about'));
});

test('hui: 分析入口文件（TabContainer）只命中其自身路由', () => {
  const result = analyze([tabEntry]);
  assert.deepStrictEqual(routePaths(result), ['/frontwms/tab-container']);
});

test('hui: home / about 路由（本地数组 spread 与子配置 spread）', () => {
  assert.deepStrictEqual(routePaths(analyze([home])), ['/home']);
  assert.deepStrictEqual(routePaths(analyze([about])), ['/about']);
});

test('hui: 影响链 入口路由 -> 入口组件 -> 共享组件', () => {
  const result = analyze([sharedTable]);
  const chain = result.chains.find((c) => c.routePath === '/frontwms/tab-container');
  assert.ok(chain, '存在入口路由影响链');
  assert.ok(chain.chain[0].endsWith(path.join('reportmanager', 'TabContainer', 'index.vue')));
  assert.strictEqual(path.basename(chain.chain[chain.chain.length - 1]), 'SharedTable.vue');
});

test('hui: meta.component 动态 import 解析为目录 index.vue', () => {
  const result = analyze([sharedTable]);
  const route = result.routes.find((r) => r.path === '/frontwms/report-manager');
  assert.ok(route);
  assert.ok(route.component.endsWith(path.join('reportmanager', 'PersonalDetailReport', 'index.vue')));
});
