'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

// 冒烟测试：验证 node:test 运行器已就绪。真实用例在各模块目录下。
test('toolchain smoke: node:test runs', () => {
  assert.equal(1 + 1, 2);
});
