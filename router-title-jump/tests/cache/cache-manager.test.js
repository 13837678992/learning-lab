'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { CacheManager } = require('../../src/cache/CacheManager');

test('CacheManager: mtime 未变判定为新鲜、复用记录', () => {
  const cache = new CacheManager();
  const records = [/** @type {any} */ ({ id: 'a' })];
  cache.set('/proj/router.js', 100, records);

  assert.equal(cache.isFresh('/proj/router.js', 100), true);
  assert.equal(cache.isFresh('/proj/router.js', 200), false); // mtime 变了
  assert.equal(cache.isFresh('/proj/other.js', 100), false); // 未缓存
  assert.equal(cache.get('/proj/router.js').records, records);
});

test('CacheManager: 删除与清空', () => {
  const cache = new CacheManager();
  cache.set('/a', 1, []);
  cache.set('/b', 1, []);
  cache.delete('/a');
  assert.equal(cache.isFresh('/a', 1), false);
  assert.equal(cache.isFresh('/b', 1), true);
  cache.clear();
  assert.equal(cache.isFresh('/b', 1), false);
});
