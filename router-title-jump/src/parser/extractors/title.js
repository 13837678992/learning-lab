'use strict';

const { getPropValue, getStringValue } = require('../nodeUtils');

/**
 * 标题提取器（含 MetaParser 语义）。
 * 优先取路由对象上的 `title`，其次取 `meta.title`；当 meta 为标识符时解析其绑定。
 *
 * @param {any} objExpr 路由对象 ObjectExpression
 * @param {import('../../types').ParseContext} ctx
 * @returns {string | null}
 */
function extractTitle(objExpr, ctx) {
  const direct = getStringValue(getPropValue(objExpr, 'title'));
  if (direct) return direct;

  let meta = getPropValue(objExpr, 'meta');
  if (meta && meta.type === 'Identifier') {
    meta = ctx.bindings.get(meta.name) || null;
  }
  if (meta && meta.type === 'ObjectExpression') {
    const t = getStringValue(getPropValue(meta, 'title'));
    if (t) return t;
  }
  return null;
}

module.exports = { extractTitle };
