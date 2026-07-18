'use strict';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { getAliasRules, clearCache } = require('../../src/resolver/AliasResolver');

const ROOT = path.join(__dirname, '..', 'fixtures', 'sample-project');

/** @param {string} prefix @param {import('../../src/types').AliasRule[]} rules */
function ruleFor(prefix, rules) {
  return rules.find((r) => r.prefix === prefix);
}

beforeEach(() => clearCache());

test('AliasResolver: 从 vite.config 提取 @ 与 ~ -> src', () => {
  const rules = getAliasRules(ROOT);
  assert.equal(ruleFor('@', rules).targetDir, path.join(ROOT, 'src'));
  assert.equal(ruleFor('~', rules).targetDir, path.join(ROOT, 'src'));
});

test('AliasResolver: 从 tsconfig paths 提取 @comp -> src/components', () => {
  const rules = getAliasRules(ROOT);
  assert.equal(ruleFor('@comp', rules).targetDir, path.join(ROOT, 'src', 'components'));
});

test('AliasResolver: 规则按前缀长度降序（长前缀优先匹配）', () => {
  const rules = getAliasRules(ROOT);
  const lengths = rules.map((r) => r.prefix.length);
  const sorted = [...lengths].sort((a, b) => b - a);
  assert.deepEqual(lengths, sorted);
});

test('AliasResolver: 结果被缓存（同一引用）', () => {
  const a = getAliasRules(ROOT);
  const b = getAliasRules(ROOT);
  assert.equal(a, b);
});
