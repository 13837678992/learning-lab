'use strict';

const { parseRoutes } = require('../parser/RouterParser');
const { getAliasRules } = require('../resolver/AliasResolver');
const { resolveComponentFile } = require('../resolver/FileResolver');
const { findProjectRoot } = require('../resolver/ProjectRootResolver');
const { buildRecord } = require('./RecordBuilder');

/** @typedef {import('../types').RouteRecord} RouteRecord */

/**
 * 编排「解析 → 别名/文件解析 → 组装记录」的**纯管线**——不触碰 VSCode / workspace，
 * 因此可脱离宿主单测。VSCode 扫描器只负责发现文件、读内容，再调用它。
 *
 * kind 为 'glob' 的动态路由此版先跳过（parser 已识别，展开留待后续迭代）；
 * 没有 component 的纯 redirect 路由也跳过（无跳转目标）。
 *
 * @param {string} code 路由文件源码
 * @param {string} routerFile 路由文件绝对路径
 * @param {string} [projectRoot] 不传则自动向上查找
 * @returns {RouteRecord[]}
 */
function buildRecordsForFile(code, routerFile, projectRoot) {
  const root = projectRoot || findProjectRoot(routerFile);
  const aliasRules = getAliasRules(root);
  const raw = parseRoutes(code, routerFile);

  /** @type {RouteRecord[]} */
  const records = [];
  for (const route of raw) {
    if (route.kind !== 'route' || !route.componentRequest) continue;
    const absoluteFile = resolveComponentFile(route.componentRequest, routerFile, {
      projectRoot: root,
      aliasRules,
    });
    if (!absoluteFile) continue;
    records.push(
      buildRecord({
        title: route.title || '',
        routePath: route.routePath || '',
        component: route.componentRequest,
        absoluteFile,
        routerFile,
        projectRoot: root,
      })
    );
  }
  return records;
}

module.exports = { buildRecordsForFile };
