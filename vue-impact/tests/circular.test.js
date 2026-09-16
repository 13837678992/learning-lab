'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const { analyze, clearProjectCache } = require('../packages/core/dist/index.cjs');

const FIXTURE = path.join(__dirname, 'fixtures', 'circular');

test('circular: A->B->C->A 循环依赖分析不死循环', async () => {
  clearProjectCache(FIXTURE);
  const result = await Promise.race([
    Promise.resolve().then(() => analyze([path.join(FIXTURE, 'a.js')])),
    new Promise((_, reject) => setTimeout(() => reject(new Error('分析超时（疑似死循环）')), 15000)),
  ]);
  assert.ok(result);
  assert.deepStrictEqual(result.routes, []);
  // 依赖图仍完整建立
  assert.ok(result.stats.filesScanned >= 3);
});

test('circular: 非 Vue 项目给出 warning 但不报错', () => {
  clearProjectCache(FIXTURE);
  const result = analyze([path.join(FIXTURE, 'b.js')]);
  assert.ok(result.warnings.some((w) => w.type === 'no-vue-project'));
});
