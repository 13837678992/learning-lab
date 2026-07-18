'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { parse } = require('../../src/parser/ast');
const { evalStaticPath } = require('../../src/resolver/staticEval');

const BASE = '/proj';

/**
 * 解析 `const x = <expr>` 并返回 init 节点，便于对表达式做静态求值。
 * @param {string} expr
 * @returns {any}
 */
function exprNode(expr) {
  const ast = parse(`const x = ${expr};`);
  return ast.program.body[0].declarations[0].init;
}

const CASES = [
  ["path.resolve(__dirname, 'src')", path.resolve(BASE, 'src')],
  ["path.join(__dirname, './a/b')", path.resolve(BASE, 'a/b')],
  ["resolve(__dirname, 'src')", path.resolve(BASE, 'src')],
  ["'src'", path.resolve(BASE, 'src')],
  ["'./nested/dir'", path.resolve(BASE, 'nested/dir')],
  ["__dirname", BASE],
  ["fileURLToPath(new URL('./src', import.meta.url))", path.resolve(BASE, 'src')],
];

for (const [expr, expected] of CASES) {
  test(`staticEval: ${expr}`, () => {
    assert.equal(evalStaticPath(exprNode(expr), BASE), expected);
  });
}

test('staticEval: 无法静态确定 -> null', () => {
  assert.equal(evalStaticPath(exprNode('someFn(a, b)'), BASE), null);
});
