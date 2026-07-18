'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const { buildRecordsForFile } = require('../../src/index/IndexBuilder');

const ROOT = path.join(__dirname, '..', 'fixtures', 'sample-project');
const ROUTER_FILE = path.join(ROOT, 'src', 'router', 'index.js');

test('IndexBuilder: 解析 fixture 路由并组装出可跳转记录', () => {
  const code = fs.readFileSync(ROUTER_FILE, 'utf8');
  const records = buildRecordsForFile(code, ROUTER_FILE, ROOT);

  assert.equal(records.length, 3);
  const byTitle = new Map(records.map((r) => [r.title, r]));

  assert.equal(
    byTitle.get('首页').absoluteFile,
    path.join(ROOT, 'src', 'views', 'home', 'index.vue')
  );
  assert.equal(
    byTitle.get('登录').absoluteFile,
    path.join(ROOT, 'src', 'pages', 'login.vue')
  );
  assert.equal(
    byTitle.get('按钮').absoluteFile,
    path.join(ROOT, 'src', 'components', 'Button.vue')
  );

  // 记录已带检索字段
  assert.equal(byTitle.get('首页').fullPinyin, 'shouye');
  assert.ok(byTitle.get('首页').keywords.length > 0);
});

test('IndexBuilder: 无法解析文件的路由被跳过（不产生死记录）', () => {
  const code = `export default [{ path: '/x', title: '缺失', component: () => import('@/nope/missing.vue') }];`;
  const records = buildRecordsForFile(code, ROUTER_FILE, ROOT);
  assert.equal(records.length, 0);
});
