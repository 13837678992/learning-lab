'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { RouterIndex } = require('../../src/index/RouterIndex');
const { buildRecord } = require('../../src/index/RecordBuilder');

/** 造一条记录，absoluteFile 可以是虚构路径（buildRecord 对 stat 失败容错）。 */
function rec(routerFile, title, routePath, absoluteFile) {
  return buildRecord({
    title,
    routePath,
    component: absoluteFile,
    absoluteFile,
    routerFile,
    projectRoot: '/proj',
  });
}

test('RouterIndex: 增删改与倒排联动', () => {
  const index = new RouterIndex();
  const rA = rec('/proj/src/router/index.js', '首页', '/home', '/proj/src/views/home/index.vue');
  const rB = rec('/proj/src/router/index.js', '登录', '/login', '/proj/src/views/login.vue');
  const rC = rec('/proj/src/router/user.js', '用户', '/user', '/proj/src/views/user.vue');

  index.replaceRouterFile('/proj/src/router/index.js', [rA, rB]);
  index.replaceRouterFile('/proj/src/router/user.js', [rC]);
  assert.equal(index.size(), 3);

  // 倒排能命中拼音全拼 token
  assert.ok(index.inverted.exactIds('shouye').has(rA.id));
  assert.ok(index.inverted.prefixIds('deng').has(rB.id));

  // 增量替换某个 router 文件：旧记录及其倒排应被清掉
  const rA2 = rec('/proj/src/router/index.js', '仪表盘', '/dash', '/proj/src/views/dash.vue');
  index.replaceRouterFile('/proj/src/router/index.js', [rA2]);
  assert.equal(index.size(), 2); // rA、rB 移除，rA2 加入，rC 保留
  assert.equal(index.get(rA.id), undefined);
  assert.equal(index.inverted.exactIds('shouye').size, 0); // 旧 token 已清除
  assert.ok(index.inverted.exactIds('yibiaopan').has(rA2.id));

  // 删除整个 router 文件
  index.removeByRouterFile('/proj/src/router/user.js');
  assert.equal(index.size(), 1);
  assert.equal(index.inverted.exactIds('yonghu').size, 0);
});

test('RecordBuilder: 派生字段正确', () => {
  const r = rec('/proj/src/router/index.js', '保险产品', '/ins/product', '/proj/src/views/insurance/product.vue');
  assert.equal(r.fullPinyin, 'baoxianchanpin');
  assert.equal(r.initials, 'bxcp');
  assert.equal(r.fileName, 'product');
  assert.equal(r.relativeFile, 'src/views/insurance/product.vue');
  assert.ok(r.keywords.includes('baoxianchanpin'));
  assert.ok(r.keywords.includes('product'));
});
