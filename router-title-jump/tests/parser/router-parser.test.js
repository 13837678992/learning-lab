'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { parseRoutes } = require('../../src/parser/RouterParser');

/**
 * 断言 expected 中每个字段都能在某条实际记录里找到（子集匹配）。
 * @param {any[]} actual
 * @param {Record<string, unknown>} expected
 */
function assertContains(actual, expected) {
  const hit = actual.find((rec) =>
    Object.entries(expected).every(([k, v]) => rec[k] === v)
  );
  assert.ok(
    hit,
    `未找到匹配记录 ${JSON.stringify(expected)}\n实际: ${JSON.stringify(actual, null, 2)}`
  );
}

/**
 * 路由写法矩阵：每条给一段源码 + 期望能解析出的记录（子集）。
 * @type {{ name: string, code: string, expect: Record<string, unknown>[] }[]}
 */
const ROUTE_CASES = [
  {
    name: 'Vue3 createRouter + meta.title + 懒加载 import()',
    code: `
      import { createRouter, createWebHistory } from 'vue-router';
      const routes = [
        { path: '/', meta: { title: '首页' }, component: () => import('@/views/home/index.vue') },
      ];
      export default createRouter({ history: createWebHistory(), routes });
    `,
    expect: [
      { title: '首页', routePath: '/', componentRequest: '@/views/home/index.vue', depth: 0 },
    ],
  },
  {
    name: 'Vue2 new Router + title + resolve=>require([])',
    code: `
      import Router from 'vue-router';
      export default new Router({
        routes: [
          { path: '/product/list', title: '产品列表', component: resolve => require(['./product/list.vue'], resolve) },
        ],
      });
    `,
    expect: [
      { title: '产品列表', routePath: '/product/list', componentRequest: './product/list.vue', depth: 0 },
    ],
  },
  {
    name: 'Vue2 new VueRouter + 变量 routes',
    code: `
      const routes = [{ path: '/a', title: '甲', component: () => import('@/a.vue') }];
      const router = new VueRouter({ routes });
    `,
    expect: [{ title: '甲', routePath: '/a', componentRequest: '@/a.vue', depth: 0 }],
  },
  {
    name: 'children 嵌套递归 + layout 父级',
    code: `
      export default [
        { path: '/sys', component: () => import('@/layout/index.vue'), children: [
          { path: 'user', meta: { title: '用户管理' }, component: () => import('@/views/sys/user.vue') },
          { path: 'role', meta: { title: '角色管理' }, component: () => import('@/views/sys/role.vue') },
        ] },
      ];
    `,
    expect: [
      { routePath: '/sys', componentRequest: '@/layout/index.vue', depth: 0 },
      { title: '用户管理', routePath: 'user', componentRequest: '@/views/sys/user.vue', depth: 1 },
      { title: '角色管理', routePath: 'role', componentRequest: '@/views/sys/role.vue', depth: 1 },
    ],
  },
  {
    name: 'export default 标识符 + 普通 import()',
    code: `
      const routes = [{ path: '/login', title: '登录', component: () => import('@/views/login.vue') }];
      export default routes;
    `,
    expect: [{ title: '登录', routePath: '/login', componentRequest: '@/views/login.vue', depth: 0 }],
  },
  {
    name: 'redirect 路由',
    code: `export default [{ path: '/', redirect: '/home' }];`,
    expect: [{ routePath: '/', redirect: '/home', depth: 0 }],
  },
  {
    name: '静态 import 的 component 标识符',
    code: `
      import Home from '@/views/home.vue';
      export default [{ path: '/', title: '主页', component: Home }];
    `,
    expect: [{ title: '主页', routePath: '/', componentRequest: '@/views/home.vue', depth: 0 }],
  },
  {
    name: 'CJS module.exports 数组',
    code: `module.exports = [{ path: '/x', title: '页', component: () => import('./x.vue') }];`,
    expect: [{ title: '页', routePath: '/x', componentRequest: './x.vue', depth: 0 }],
  },
  {
    name: 'component 内 require 普通字符串',
    code: `export default [{ path: '/y', title: '依', component: () => require('./y.vue') }];`,
    expect: [{ title: '依', routePath: '/y', componentRequest: './y.vue', depth: 0 }],
  },
  {
    name: 'TypeScript 语法（类型注解 + as 断言）',
    code: `
      const routes: RouteRecordRaw[] = [
        { path: '/ts', meta: { title: '类型' } as any, component: () => import('@/ts.vue') },
      ];
      export default routes;
    `,
    expect: [{ title: '类型', routePath: '/ts', componentRequest: '@/ts.vue', depth: 0 }],
  },
  {
    name: 'export const routes',
    code: `export const routes = [{ path: '/e', title: '导出', component: () => import('@/e.vue') }];`,
    expect: [{ title: '导出', routePath: '/e', componentRequest: '@/e.vue', depth: 0 }],
  },
  {
    name: 'title 直接写在路由对象上（非 meta）',
    code: `export default [{ path: '/d', title: '直接', component: () => import('@/d.vue') }];`,
    expect: [{ title: '直接', routePath: '/d', componentRequest: '@/d.vue', depth: 0 }],
  },
];

for (const { name, code, expect } of ROUTE_CASES) {
  test(`RouterParser: ${name}`, () => {
    const routes = parseRoutes(code, 'router.js');
    for (const e of expect) {
      assertContains(routes, e);
    }
  });
}

test('RouterParser: import.meta.glob 被识别为 glob 记录', () => {
  const routes = parseRoutes(`const mods = import.meta.glob('./views/**/*.vue');`, 'router.js');
  assertContains(routes, { kind: 'glob', source: 'import.meta.glob', glob: './views/**/*.vue' });
});

test('RouterParser: require.context 被识别为 glob 记录', () => {
  const routes = parseRoutes(
    `const ctx = require.context('./modules', true, /\\.js$/);`,
    'router.js'
  );
  assertContains(routes, { kind: 'glob', source: 'require.context', glob: './modules' });
});

test('RouterParser: 语法错误不抛异常，返回数组', () => {
  const routes = parseRoutes(`export default [{ path: '/', title: '半`, 'broken.js');
  assert.ok(Array.isArray(routes));
});

test('RouterParser: 无路由文件返回空数组', () => {
  const routes = parseRoutes(`export const foo = 1;`, 'nope.js');
  assert.deepEqual(routes, []);
});
