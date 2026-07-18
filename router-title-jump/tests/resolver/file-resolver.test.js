'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { resolveComponentFile } = require('../../src/resolver/FileResolver');

const ROOT = path.join(__dirname, '..', 'fixtures', 'sample-project');
const ROUTER_FILE = path.join(ROOT, 'src', 'router', 'index.js');

const HOME = path.join(ROOT, 'src', 'views', 'home', 'index.vue');
const BUTTON = path.join(ROOT, 'src', 'components', 'Button.vue');
const LOGIN = path.join(ROOT, 'src', 'pages', 'login.vue');

test('FileResolver: 别名 @ + 完整 .vue 路径', () => {
  assert.equal(resolveComponentFile('@/views/home/index.vue', ROUTER_FILE), HOME);
});

test('FileResolver: 别名 @ + 省略扩展名 -> index.vue', () => {
  assert.equal(resolveComponentFile('@/views/home', ROUTER_FILE), HOME);
});

test('FileResolver: 别名 @comp + 省略扩展名', () => {
  assert.equal(resolveComponentFile('@comp/Button', ROUTER_FILE), BUTTON);
});

test('FileResolver: 别名 @comp + 带扩展名', () => {
  assert.equal(resolveComponentFile('@comp/Button.vue', ROUTER_FILE), BUTTON);
});

test('FileResolver: 相对路径 ../pages/login.vue', () => {
  assert.equal(resolveComponentFile('../pages/login.vue', ROUTER_FILE), LOGIN);
});

test('FileResolver: 相对路径省略扩展名', () => {
  assert.equal(resolveComponentFile('../pages/login', ROUTER_FILE), LOGIN);
});

test('FileResolver: 不存在的文件 -> undefined', () => {
  assert.equal(resolveComponentFile('@/views/nope', ROUTER_FILE), undefined);
});

test('FileResolver: 空说明符 -> undefined', () => {
  assert.equal(resolveComponentFile('', ROUTER_FILE), undefined);
});
