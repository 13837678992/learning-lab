'use strict';

const path = require('path');
const { unwrapExpr, getStringValue } = require('../parser/nodeUtils');

/**
 * 静态求值「路径表达式」→ 绝对路径；无法静态确定时返回 null。
 *
 * 为什么不执行配置文件：执行任意 vite/webpack/vue.config 有副作用与安全风险，
 * 因此改为对 AST 做**静态**求值，覆盖别名目标里最常见的写法。
 *
 * @typedef {any} Node
 */

/**
 * 取调用/成员表达式的可读名字，如 'path.resolve' / 'resolve' / 'fileURLToPath'。
 * @param {Node} callee
 * @returns {string | null}
 */
function calleeName(callee) {
  if (!callee) return null;
  if (callee.type === 'Identifier') return callee.name;
  if (
    callee.type === 'MemberExpression' &&
    callee.object.type === 'Identifier' &&
    callee.property.type === 'Identifier'
  ) {
    return `${callee.object.name}.${callee.property.name}`;
  }
  return null;
}

/**
 * 把节点求值成「一个路径片段字符串」（可能是相对片段，如 'src'、'./a'）。
 * @param {Node} node
 * @param {string} baseDir
 * @returns {string | null}
 */
function evalPiece(node, baseDir) {
  const n = unwrapExpr(node);
  if (!n) return null;
  if (n.type === 'Identifier' && n.name === '__dirname') return baseDir;
  const str = getStringValue(n);
  if (str != null) return str;
  if (n.type === 'CallExpression') return evalCall(n, baseDir);
  return null;
}

/**
 * 求值 `new URL('./x', import.meta.url)` -> 绝对路径。
 * @param {Node} node
 * @param {string} baseDir
 * @returns {string | null}
 */
function evalNewUrl(node, baseDir) {
  const n = unwrapExpr(node);
  if (
    n &&
    n.type === 'NewExpression' &&
    n.callee.type === 'Identifier' &&
    n.callee.name === 'URL'
  ) {
    const rel = getStringValue(n.arguments[0]);
    if (rel != null) return path.resolve(baseDir, rel);
  }
  return null;
}

/**
 * 求值调用表达式：path.resolve/join、resolve/join、path.dirname、fileURLToPath。
 * @param {Node} node CallExpression
 * @param {string} baseDir
 * @returns {string | null}
 */
function evalCall(node, baseDir) {
  const name = calleeName(node.callee);
  const args = node.arguments;

  if (name === 'path.resolve' || name === 'resolve' || name === 'path.join' || name === 'join') {
    const pieces = [];
    for (const arg of args) {
      const piece = evalPiece(arg, baseDir);
      if (piece == null) return null;
      pieces.push(piece);
    }
    // 以 baseDir 兜底，保证即便全是相对片段也落在项目内。
    return path.resolve(baseDir, ...pieces);
  }

  if (name === 'path.dirname' || name === 'dirname') {
    const piece = evalPiece(args[0], baseDir);
    return piece == null ? null : path.dirname(path.resolve(baseDir, piece));
  }

  if (name === 'fileURLToPath') {
    return evalNewUrl(args[0], baseDir);
  }

  return null;
}

/**
 * 顶层入口：把别名目标表达式求值成绝对路径。
 * @param {Node} node
 * @param {string} baseDir 配置文件所在目录（绝对）
 * @returns {string | null}
 */
function evalStaticPath(node, baseDir) {
  const n = unwrapExpr(node);
  if (!n) return null;

  const str = getStringValue(n);
  if (str != null) return path.resolve(baseDir, str);

  if (n.type === 'Identifier' && n.name === '__dirname') return baseDir;
  if (n.type === 'CallExpression') return evalCall(n, baseDir);
  if (n.type === 'NewExpression') return evalNewUrl(n, baseDir);

  return null;
}

module.exports = { evalStaticPath };
