'use strict';

const path = require('path');
const fs = require('fs');
const { getAliasRules } = require('./AliasResolver');
const { findProjectRoot } = require('./ProjectRootResolver');

/** @typedef {import('../types').AliasRule} AliasRule */

// 支持的组件文件扩展名（跳转目标）。
const EXTENSIONS = ['.vue', '.js', '.ts', '.jsx', '.tsx'];

/**
 * 把 import 说明符解析为「解析后的路径」（可能不含扩展名，尚未验证存在）。
 * 全程走 path.resolve/join，跨平台安全。
 *
 * @param {string} request
 * @param {string} routerFile
 * @param {string} projectRoot
 * @param {AliasRule[]} aliasRules
 * @returns {string | null}
 */
function resolveRequestPath(request, routerFile, projectRoot, aliasRules) {
  // ① 相对路径：. / ..
  if (request.startsWith('.')) {
    return path.resolve(path.dirname(routerFile), request);
  }

  // ② 别名（规则已按长度降序，天然长前缀优先）
  for (const rule of aliasRules) {
    if (request === rule.prefix || request.startsWith(`${rule.prefix}/`)) {
      const rest = request.slice(rule.prefix.length);
      return path.join(rule.targetDir, rest);
    }
  }

  // ③ 绝对路径
  if (path.isAbsolute(request)) return request;

  // ④ @/ 兜底（别名没配到时）
  if (request.startsWith('@/')) {
    return path.join(projectRoot, 'src', request.slice(2));
  }

  // ⑤ 兜底：视为项目根相对
  return path.join(projectRoot, request);
}

/**
 * 在候选路径上补扩展名 / index 文件，返回第一个真实存在的文件。
 * @param {string} resolvedPath
 * @returns {string | undefined}
 */
function findExistingFile(resolvedPath) {
  /** @type {string[]} */
  const candidates = [];
  if (path.extname(resolvedPath)) candidates.push(resolvedPath);
  for (const ext of EXTENSIONS) candidates.push(resolvedPath + ext);
  for (const ext of EXTENSIONS) candidates.push(path.join(resolvedPath, `index${ext}`));

  for (const candidate of candidates) {
    try {
      if (fs.statSync(candidate).isFile()) return candidate;
    } catch {
      // 不存在，试下一个
    }
  }
  return undefined;
}

/**
 * 组件说明符 -> 真实存在的文件绝对路径。
 *
 * @param {string} request 组件说明符，如 '@/views/a.vue'、'../x'、'@comp/B'
 * @param {string} routerFile 该路由所在文件的绝对路径
 * @param {{ projectRoot?: string, aliasRules?: AliasRule[] }} [opts]
 *   可传入预解析好的 projectRoot / aliasRules 复用，避免重复读盘。
 * @returns {string | undefined}
 */
function resolveComponentFile(request, routerFile, opts = {}) {
  if (!request) return undefined;
  const projectRoot = opts.projectRoot || findProjectRoot(routerFile);
  const aliasRules = opts.aliasRules || getAliasRules(projectRoot);
  const resolved = resolveRequestPath(request, routerFile, projectRoot, aliasRules);
  if (!resolved) return undefined;
  return findExistingFile(resolved);
}

module.exports = { resolveComponentFile, findExistingFile, EXTENSIONS };
