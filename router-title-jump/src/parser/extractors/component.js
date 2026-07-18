'use strict';

const { unwrapExpr, unwrapReturn, getStringValue } = require('../nodeUtils');

/** @typedef {any} Node */

/**
 * 组件解析策略集（ImportParser / RequireParser / StringParser）。
 * 每个策略：给定「已展开箭头/函数体后的表达式」，尝试解出原始 import 说明符。
 * 新增写法只需往 STRATEGIES 追加一个策略函数，不改既有代码——符合开闭原则。
 */

/**
 * ① 懒加载 import()。babel 8 中动态 import 是 ImportExpression 节点，
 *    说明符在 .source（不是 CallExpression，这点与 babel 7 不同）。
 * @param {Node} node
 * @returns {string | null}
 */
function importStrategy(node) {
  if (node && node.type === 'ImportExpression') {
    return getStringValue(node.source);
  }
  return null;
}

/**
 * ② require：Vue2 异步组件 `resolve => require(['x'], resolve)` 或 `require('x')`。
 * @param {Node} node
 * @returns {string | null}
 */
function requireStrategy(node) {
  if (!node || node.type !== 'CallExpression') return null;
  const callee = node.callee;
  if (!callee || callee.type !== 'Identifier' || callee.name !== 'require') {
    return null;
  }
  const arg0 = node.arguments[0];
  if (!arg0) return null;
  if (arg0.type === 'ArrayExpression') {
    const first = arg0.elements.find(
      (/** @type {any} */ el) => el && el.type === 'StringLiteral'
    );
    return first ? first.value : null;
  }
  return getStringValue(arg0);
}

/**
 * ③ 直接字符串：`component: 'Foo'`。
 * @param {Node} node
 * @returns {string | null}
 */
function stringStrategy(node) {
  return getStringValue(node);
}

/** @type {((node: Node) => string | null)[]} */
const STRATEGIES = [importStrategy, requireStrategy, stringStrategy];

/**
 * 从 component 属性值解出原始 import 说明符。
 * @param {Node} value component 属性的值
 * @param {import('../../types').ParseContext} ctx
 * @returns {string | null}
 */
function extractComponent(value, ctx) {
  const node = unwrapExpr(value);
  if (!node) return null;

  // 箭头/函数 → 返回表达式，再逐个策略尝试。
  const target = unwrapReturn(node);
  for (const strategy of STRATEGIES) {
    const hit = strategy(target);
    if (hit) return hit;
  }

  // 标识符：静态 import 的组件，或本地 require 绑定。
  if (node.type === 'Identifier') {
    const fromImport = ctx.importMap.get(node.name);
    if (fromImport) return fromImport;
    const init = ctx.bindings.get(node.name);
    if (init) return extractComponent(init, ctx);
  }
  return null;
}

module.exports = { extractComponent, STRATEGIES };
