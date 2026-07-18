'use strict';

const { parse, traverse } = require('./ast');
const {
  unwrapExpr,
  getPropValue,
  getStringValue,
  resolveToArray,
  buildBindings,
  buildImportMap,
} = require('./nodeUtils');
const { extractTitle } = require('./extractors/title');
const { extractComponent } = require('./extractors/component');
const { extractRedirect } = require('./extractors/redirect');
const logger = require('../utils/logger');

/** @typedef {import('../types').RawRoute} RawRoute */
/** @typedef {import('../types').ParseContext} ParseContext */

/**
 * 已注册的路由来源插件。
 * 扩展新框架（Nuxt / Umi / React Router）时，只需在此登记一个新插件，
 * 既有插件与提取器零改动——开闭原则的落点。
 */
const PLUGINS = [
  require('./plugins/vue3'),
  require('./plugins/vue2'),
  require('./plugins/exportDefault'),
  require('./plugins/moduleGlob'),
];

/**
 * 递归遍历一个路由数组，扁平化为 RawRoute（含 children，标注 depth）。
 * @param {any} arrayNode ArrayExpression
 * @param {number} depth
 * @param {RawRoute[]} out
 * @param {ParseContext} ctx
 */
function walkRoutes(arrayNode, depth, out, ctx) {
  for (const el of arrayNode.elements) {
    const obj = unwrapExpr(el);
    if (!obj || obj.type !== 'ObjectExpression') continue;

    /** @type {RawRoute} */
    const record = { kind: 'route', depth };

    const title = extractTitle(obj, ctx);
    if (title) record.title = title;

    const routePath = getStringValue(getPropValue(obj, 'path'));
    if (routePath != null) record.routePath = routePath;

    const component = extractComponent(getPropValue(obj, 'component'), ctx);
    if (component) record.componentRequest = component;

    const redirect = extractRedirect(obj);
    if (redirect) record.redirect = redirect;

    out.push(record);

    // 递归 children。
    const children = resolveToArray(getPropValue(obj, 'children'), ctx.bindings);
    if (children) walkRoutes(children, depth + 1, out, ctx);
  }
}

/**
 * 解析一个路由文件源码，返回扁平的原始路由记录。
 *
 * 纯函数：不读文件系统、不做别名解析、不建拼音索引——这些是后续独立阶段，
 * 从而彻底解开旧实现里「解析 + 解析路径 + 建索引 + 组装」四合一的耦合。
 *
 * @param {string} code 源码
 * @param {string} [filename] 仅用于日志
 * @returns {RawRoute[]}
 */
function parseRoutes(code, filename = '') {
  let ast;
  try {
    ast = parse(code);
  } catch (err) {
    logger.error(`解析失败 ${filename}`, err);
    return [];
  }

  /** @type {ParseContext} */
  const ctx = {
    filename,
    bindings: buildBindings(ast.program),
    importMap: buildImportMap(ast.program),
    containers: [],
    globs: [],
  };

  // 单次遍历，分派给各插件收集「路由数组容器」与「glob 记录」。
  try {
    traverse(ast, {
      enter(/** @type {any} */ path) {
        const node = path.node;
        for (const plugin of PLUGINS) {
          plugin.visit(node, ctx);
        }
      },
    });
  } catch (err) {
    logger.error(`遍历失败 ${filename}`, err);
  }

  /** @type {RawRoute[]} */
  const out = [];
  // 多个插件可能命中同一数组节点，按节点标识去重。
  const seen = new Set();
  for (const arrayNode of ctx.containers) {
    if (seen.has(arrayNode)) continue;
    seen.add(arrayNode);
    walkRoutes(arrayNode, 0, out, ctx);
  }
  out.push(...ctx.globs);
  return out;
}

module.exports = { parseRoutes, PLUGINS };
