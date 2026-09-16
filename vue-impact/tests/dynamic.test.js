'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const { analyze, clearProjectCache } = require('../packages/core/dist/index.cjs');

const FIXTURE = path.join(__dirname, 'fixtures', 'dynamic-router-demo');

test('dynamic-router: routes 来自运行时 -> warning + 静态 addRoutes 仍被提取', () => {
  clearProjectCache(FIXTURE);
  const result = analyze([path.join(FIXTURE, 'src', 'views', 'Static.vue')]);
  assert.ok(result.warnings.some((w) => w.type === 'dynamic-route'), '应有动态路由警告');
  const paths = result.routes.map((r) => r.path).sort();
  assert.deepStrictEqual(paths, ['/static']);
});
