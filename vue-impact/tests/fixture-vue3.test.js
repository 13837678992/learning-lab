'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const { analyze, clearProjectCache } = require('../packages/core/dist/index.cjs');

const FIXTURE = path.join(__dirname, 'fixtures', 'vue3-demo');

test('vue3: createRouter 自动发现 + jsconfig alias + 变量/动态 import 组件', () => {
  clearProjectCache(FIXTURE);
  const result = analyze([path.join(FIXTURE, 'src', 'views', 'About.vue')]);
  const paths = result.routes.map((r) => r.path).sort();
  assert.deepStrictEqual(paths, ['/about']);
  assert.strictEqual(result.vueVersion, 3);
});

test('vue3: children 拼接为 /settings/profile', () => {
  const result = analyze([path.join(FIXTURE, 'src', 'views', 'Profile.vue')]);
  const paths = result.routes.map((r) => r.path).sort();
  assert.deepStrictEqual(paths, ['/settings/profile']);
});

test('vue3: composables 依赖传播到页面', () => {
  const result = analyze([path.join(FIXTURE, 'src', 'composables', 'about.js')]);
  const paths = result.routes.map((r) => r.path).sort();
  assert.deepStrictEqual(paths, ['/about', '/home']);
});
