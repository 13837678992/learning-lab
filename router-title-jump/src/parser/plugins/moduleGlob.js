'use strict';

const { getStringValue } = require('../nodeUtils');

/**
 * 动态路由插件：识别 `import.meta.glob('...')` 与 `require.context('dir', ...)`。
 * 这类写法在运行时展开为一批组件，静态没有 title；此处先记录模式/目录，
 * 由后续 resolver 阶段结合文件系统展开为可搜索的组件条目。
 */
module.exports = {
  name: 'moduleGlob',
  /**
   * @param {any} node
   * @param {import('../../types').ParseContext} ctx
   */
  visit(node, ctx) {
    if (node.type !== 'CallExpression' || node.callee.type !== 'MemberExpression') {
      return;
    }
    const callee = node.callee;
    const prop = callee.property;
    if (!prop || prop.type !== 'Identifier') return;

    // import.meta.glob('./views/**/*.vue')
    if (callee.object.type === 'MetaProperty' && prop.name === 'glob') {
      const glob = getStringValue(node.arguments[0]);
      if (glob) {
        ctx.globs.push({ kind: 'glob', depth: 0, source: 'import.meta.glob', glob });
      }
      return;
    }

    // require.context('./modules', true, /\.js$/)
    if (
      callee.object.type === 'Identifier' &&
      callee.object.name === 'require' &&
      prop.name === 'context'
    ) {
      const glob = getStringValue(node.arguments[0]);
      if (glob) {
        ctx.globs.push({ kind: 'glob', depth: 0, source: 'require.context', glob });
      }
    }
  },
};
