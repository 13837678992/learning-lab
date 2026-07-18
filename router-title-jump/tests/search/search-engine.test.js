'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { RouterIndex } = require('../../src/index/RouterIndex');
const { buildRecord } = require('../../src/index/RecordBuilder');
const { search } = require('../../src/search/SearchEngine');

function rec(title, routePath, absoluteFile, component) {
  return buildRecord({
    title,
    routePath,
    component: component || absoluteFile,
    absoluteFile,
    routerFile: '/proj/src/router/index.js',
    projectRoot: '/proj',
  });
}

// 一个覆盖各搜索维度的小索引。
function makeIndex() {
  const index = new RouterIndex();
  index.replaceRouterFile('/proj/src/router/index.js', [
    rec('保险产品', '/insurance/product', '/proj/src/views/insurance/product.vue', '@/views/insurance/product.vue'),
    rec('用户管理', '/system/user', '/proj/src/views/system/user.vue', '@/views/system/user.vue'),
    rec('登录', '/login', '/proj/src/views/login.vue', '@/views/login.vue'),
    rec('首页', '/home', '/proj/src/views/home/index.vue', '@/views/home/index.vue'),
  ]);
  return index;
}

const INDEX = makeIndex();

/** 断言某查询的第一名 title。 */
function assertTop(query, expectedTitle) {
  const results = search(INDEX, query);
  assert.ok(results.length > 0, `查询「${query}」应有结果`);
  assert.equal(results[0].title, expectedTitle, `查询「${query}」首位应为「${expectedTitle}」，实际「${results[0]?.title}」`);
}

test('搜索: 中文 title 包含', () => assertTop('产品', '保险产品'));
test('搜索: 首字母包含 cp', () => assertTop('cp', '保险产品'));
test('搜索: 首字母完整 bxcp', () => assertTop('bxcp', '保险产品'));
test('搜索: 全拼子串 chanpin', () => assertTop('chanpin', '保险产品'));
test('搜索: 全拼子串 xian', () => assertTop('xian', '保险产品'));
test('搜索: 文件名/路径 user', () => assertTop('user', '用户管理'));
test('搜索: 文件名 login', () => assertTop('login', '登录'));
test('搜索: Router Path /home', () => assertTop('/home', '首页'));
test('搜索: component/文件名 product', () => assertTop('product', '保险产品'));

test('搜索: title 完全匹配优先于包含', () => {
  const results = search(INDEX, '登录');
  assert.equal(results[0].title, '登录');
});

test('搜索: 空查询返回全部（按 title 排序）', () => {
  const results = search(INDEX, '');
  assert.equal(results.length, 4);
});

test('搜索: 无匹配返回空', () => {
  assert.deepEqual(search(INDEX, 'zzzznotfound'), []);
});

test('搜索: 多词 AND（用户 + 管理）', () => {
  const results = search(INDEX, 'yonghu guanli');
  assert.ok(results.some((r) => r.title === '用户管理'));
});
