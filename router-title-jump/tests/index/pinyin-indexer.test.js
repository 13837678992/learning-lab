'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { buildPinyin } = require('../../src/index/PinyinIndexer');

test('PinyinIndexer: 保险产品 -> 全拼/首字母/音节', () => {
  const p = buildPinyin('保险产品');
  assert.equal(p.fullPinyin, 'baoxianchanpin');
  assert.equal(p.initials, 'bxcp');
  assert.deepEqual(p.syllables, ['bao', 'xian', 'chan', 'pin']);
});

test('PinyinIndexer: 银行 使用上下文读音 yinhang', () => {
  const p = buildPinyin('银行');
  assert.equal(p.fullPinyin, 'yinhang');
  assert.equal(p.initials, 'yh');
});

test('PinyinIndexer: 用户中心', () => {
  const p = buildPinyin('用户中心');
  assert.equal(p.fullPinyin, 'yonghuzhongxin');
  assert.equal(p.initials, 'yhzx');
});

test('PinyinIndexer: 空字符串', () => {
  assert.deepEqual(buildPinyin(''), { fullPinyin: '', initials: '', syllables: [] });
});
