'use strict';

const path = require('path');
const fs = require('fs');
const { parse, traverse } = require('../../parser/ast');
const { unwrapExpr, getStringValue, getPropValue } = require('../../parser/nodeUtils');
const { evalStaticPath } = require('../staticEval');
const logger = require('../../utils/logger');

/** @typedef {import('../../types').AliasRule} AliasRule */

/**
 * 归一化别名前缀：去掉尾部 `/*`、`/`。
 * @param {string} alias
 * @returns {string}
 */
function normalizePrefix(alias) {
  return alias.replace(/[\\/]\*$/, '').replace(/[\\/]$/, '');
}

/**
 * 收集一个 alias 值（对象或数组两种形态）里的规则。
 * @param {any} value 已 unwrap 的 alias 值节点
 * @param {string} baseDir
 * @param {string} source
 * @param {AliasRule[]} out
 */
function collectAlias(value, baseDir, source, out) {
  if (!value) return;

  // 形态一：{ '@': path.resolve(__dirname, 'src') }
  if (value.type === 'ObjectExpression') {
    for (const prop of value.properties) {
      if ((prop.type !== 'ObjectProperty' && prop.type !== 'Property') || prop.computed) {
        continue;
      }
      const key = prop.key;
      const alias =
        key.type === 'StringLiteral' ? key.value : key.type === 'Identifier' ? key.name : null;
      if (!alias) continue;
      const targetDir = evalStaticPath(prop.value, baseDir);
      if (targetDir) {
        out.push({ prefix: normalizePrefix(alias), targetDir, source });
      }
    }
    return;
  }

  // 形态二（vite 数组）：[{ find: '@', replacement: path.resolve(...) }]
  if (value.type === 'ArrayExpression') {
    for (const el of value.elements) {
      const obj = unwrapExpr(el);
      if (!obj || obj.type !== 'ObjectExpression') continue;
      const find = getStringValue(getPropValue(obj, 'find'));
      const replacement = evalStaticPath(getPropValue(obj, 'replacement'), baseDir);
      if (find && replacement) {
        out.push({ prefix: normalizePrefix(find), targetDir: replacement, source });
      }
    }
  }
}

/**
 * 从任意 JS 配置（vite / webpack / vue.config）**静态**提取别名。
 *
 * 单一策略即覆盖三种工具：遍历 AST，找到所有 key 为 `alias` 的属性——
 * 无论它位于 vite 的 resolve.alias、webpack 的 resolve.alias，还是 vue.config
 * 的 configureWebpack.resolve.alias 都能命中。新增使用 `alias` 键的构建工具自动支持。
 *
 * @param {string} filePath
 * @returns {AliasRule[]}
 */
function loadJsConfigAliases(filePath) {
  let code;
  try {
    code = fs.readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }

  let ast;
  try {
    ast = parse(code);
  } catch (err) {
    logger.error(`别名配置解析失败 ${filePath}`, err);
    return [];
  }

  const baseDir = path.dirname(filePath);
  /** @type {AliasRule[]} */
  const rules = [];

  traverse(ast, {
    enter(/** @type {any} */ p) {
      const node = p.node;
      if (
        (node.type === 'ObjectProperty' || node.type === 'Property') &&
        !node.computed
      ) {
        const key = node.key;
        const keyName =
          key.type === 'Identifier'
            ? key.name
            : key.type === 'StringLiteral'
              ? key.value
              : null;
        if (keyName === 'alias') {
          collectAlias(unwrapExpr(node.value), baseDir, filePath, rules);
        }
      }
    },
  });

  return rules;
}

module.exports = { loadJsConfigAliases };
