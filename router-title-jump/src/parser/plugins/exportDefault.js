'use strict';

const { resolveToArray } = require('../nodeUtils');

/**
 * 是否为 `module.exports` 成员表达式。
 * @param {any} node
 * @returns {boolean}
 */
function isModuleExports(node) {
  return (
    node.type === 'MemberExpression' &&
    node.object.type === 'Identifier' &&
    node.object.name === 'module' &&
    node.property.type === 'Identifier' &&
    node.property.name === 'exports'
  );
}

/**
 * 导出型路由插件：识别与框架无关的三种导出方式——
 *   ① export default [...] / export default routesIdent
 *   ② module.exports = [...]（CJS）
 *   ③ export const routes = [...]
 */
module.exports = {
  name: 'exportDefault',
  /**
   * @param {any} node
   * @param {import('../../types').ParseContext} ctx
   */
  visit(node, ctx) {
    if (node.type === 'ExportDefaultDeclaration') {
      const arr = resolveToArray(node.declaration, ctx.bindings);
      if (arr) ctx.containers.push(arr);
      return;
    }
    if (node.type === 'AssignmentExpression' && isModuleExports(node.left)) {
      const arr = resolveToArray(node.right, ctx.bindings);
      if (arr) ctx.containers.push(arr);
      return;
    }
    if (
      node.type === 'ExportNamedDeclaration' &&
      node.declaration &&
      node.declaration.type === 'VariableDeclaration'
    ) {
      for (const d of node.declaration.declarations) {
        if (d.id.type === 'Identifier' && d.id.name === 'routes') {
          const arr = resolveToArray(d.init, ctx.bindings);
          if (arr) ctx.containers.push(arr);
        }
      }
    }
  },
};
