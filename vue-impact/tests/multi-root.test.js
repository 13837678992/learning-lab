'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const { analyze, clearProjectCache } = require('../packages/core/dist/index.cjs');

const WORKSPACE = path.join(__dirname, 'fixtures', 'multi-root');
const WMS_APP = path.join(WORKSPACE, 'wms-app');
const wmsTable = path.join(WMS_APP, 'src', 'components', 'WmsTable.vue');

test('multi-root: 工作区根非 Vue 项目时自动收敛到子项目根', () => {
  clearProjectCache(WMS_APP);
  clearProjectCache(WORKSPACE);
  // 模拟 VS Code 传入工作区根（multi-root，无 vue 依赖）
  const result = analyze([wmsTable], { projectRoot: WORKSPACE });
  assert.strictEqual(result.projectRoot, WMS_APP, '应自动收敛到 wms-app 子项目');
  const paths = result.routes.map((r) => r.path).sort();
  assert.deepStrictEqual(paths, ['/wms/home']);
});

test('multi-root: 工作区根非 Vue 项目且无子项目时仍可分析（诊断警告）', () => {
  clearProjectCache(WORKSPACE);
  const result = analyze([path.join(WORKSPACE, 'package.json')], { projectRoot: WORKSPACE });
  assert.strictEqual(result.routes.length, 0);
  assert.ok(result.warnings.some((w) => w.type === 'no-vue-project'));
});
