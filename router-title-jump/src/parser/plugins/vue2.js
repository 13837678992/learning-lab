'use strict';

const { resolveToArray } = require('../nodeUtils');

// 常见的 Vue2 路由构造器名。
const ROUTER_CTORS = new Set(['Router', 'VueRouter']);

/**
 * Vue2 解析插件：识别 `new Router({ routes })` / `new VueRouter({ routes })`。
 */
module.exports = {
  name: 'vue2',
  /**
   * @param {any} node
   * @param {import('../../types').ParseContext} ctx
   */
  visit(node, ctx) {
    if (
      node.type === 'NewExpression' &&
      node.callee.type === 'Identifier' &&
      ROUTER_CTORS.has(node.callee.name)
    ) {
      const arr = resolveToArray(node.arguments[0], ctx.bindings);
      if (arr) ctx.containers.push(arr);
    }
  },
};
