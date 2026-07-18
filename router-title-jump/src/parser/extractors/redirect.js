'use strict';

const { getPropValue, getStringValue } = require('../nodeUtils');

/**
 * redirect 提取器：仅捕获字符串形式（`redirect: '/home'`）。
 * 对象 `{ name: 'x' }` 与函数形式无静态目标文件，忽略。
 *
 * @param {any} objExpr 路由对象 ObjectExpression
 * @returns {string | null}
 */
function extractRedirect(objExpr) {
  return getStringValue(getPropValue(objExpr, 'redirect'));
}

module.exports = { extractRedirect };
