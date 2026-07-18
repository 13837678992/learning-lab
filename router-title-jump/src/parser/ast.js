'use strict';

const parser = require('@babel/parser');

// @babel/traverse v8 是 ESM 默认导出，CJS 下取 .default；按 any 调用避免类型摩擦。
const traverseModule = require('@babel/traverse');
/** @type {any} */
const traverse = traverseModule.default || traverseModule;

/**
 * @babel/parser 封装。
 *
 * 关键点：
 * - sourceType 'module'：ESM 与 CJS 路由文件都能解析（module.exports 只是普通成员
 *   赋值，语法上合法），且允许 import.meta / 动态 import。
 * - errorRecovery：单处语法错误不至于让整份文件解析失败，尽量多拿到路由。
 * - plugins jsx + typescript：兼容 .js/.ts/.jsx/.tsx。
 *
 * 返回 any：babel 的 File/Node 联合类型极其庞大，业务侧按 any 遍历更清爽；
 * 我们自己的领域模型（RawRoute 等）保持严格类型。
 *
 * @param {string} code 源码
 * @returns {any} babel File AST
 */
function parse(code) {
  return parser.parse(code, {
    sourceType: 'module',
    allowReturnOutsideFunction: true,
    allowImportExportEverywhere: true,
    allowUndeclaredExports: true,
    errorRecovery: true,
    plugins: ['jsx', 'typescript'],
  });
}

module.exports = { parse, traverse };
