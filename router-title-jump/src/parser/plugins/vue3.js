'use strict';

const { resolveToArray } = require('../nodeUtils');

/**
 * Vue3 解析插件：识别 `createRouter({ routes })`。
 * routes 可为内联数组或标识符，交给 resolveToArray 统一还原。
 */
module.exports = {
  name: 'vue3',
  /**
   * @param {any} node
   * @param {import('../../types').ParseContext} ctx
   */
  visit(node, ctx) {
    if (
      node.type === 'CallExpression' &&
      node.callee.type === 'Identifier' &&
      node.callee.name === 'createRouter'
    ) {
      const arr = resolveToArray(node.arguments[0], ctx.bindings);
      if (arr) ctx.containers.push(arr);
    }
  },
};
