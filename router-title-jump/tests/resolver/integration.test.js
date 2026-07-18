'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const { parseRoutes } = require('../../src/parser/RouterParser');
const { resolveComponentFile } = require('../../src/resolver/FileResolver');

const ROOT = path.join(__dirname, '..', 'fixtures', 'sample-project');
const ROUTER_FILE = path.join(ROOT, 'src', 'router', 'index.js');

/**
 * 端到端：解析真实 fixture 路由文件，逐条把 componentRequest 解析成真实文件。
 * 覆盖 @ 别名、相对路径、@comp 别名三种组合。
 */
test('integration: 解析 + 解析文件（fixture 路由）', () => {
  const code = fs.readFileSync(ROUTER_FILE, 'utf8');
  const routes = parseRoutes(code, ROUTER_FILE).filter((r) => r.kind === 'route');

  const byTitle = new Map(routes.map((r) => [r.title, r]));

  const home = byTitle.get('首页');
  assert.ok(home, '应解析出「首页」');
  assert.equal(
    resolveComponentFile(home.componentRequest, ROUTER_FILE),
    path.join(ROOT, 'src', 'views', 'home', 'index.vue')
  );

  const login = byTitle.get('登录');
  assert.equal(
    resolveComponentFile(login.componentRequest, ROUTER_FILE),
    path.join(ROOT, 'src', 'pages', 'login.vue')
  );

  const btn = byTitle.get('按钮');
  assert.equal(
    resolveComponentFile(btn.componentRequest, ROUTER_FILE),
    path.join(ROOT, 'src', 'components', 'Button.vue')
  );
});
