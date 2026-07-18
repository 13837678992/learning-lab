'use strict';

const path = require('path');
const fs = require('fs');
const { buildPinyin } = require('./PinyinIndexer');

/** @typedef {import('../types').RouteRecord} RouteRecord */

/**
 * 生成一个 RouteRecord 的倒排 token 集合（全小写、去空）。
 * 覆盖：中文标题、全拼、首字母、逐音节、文件名、路由 path 段、相对路径段、组件说明符。
 * @param {Omit<RouteRecord, 'id' | 'keywords' | 'mtime'> & { syllables: string[] }} r
 * @returns {string[]}
 */
function buildKeywords(r) {
  /** @type {Set<string>} */
  const set = new Set();
  const add = (/** @type {string} */ s) => {
    if (s) set.add(String(s).toLowerCase());
  };

  add(r.title);
  add(r.fullPinyin);
  add(r.initials);
  r.syllables.forEach(add);
  add(r.fileName);
  r.routePath.split('/').forEach(add);
  r.relativeFile.split(/[\\/]/).forEach(add);
  add(r.component);

  set.delete('');
  return [...set];
}

/**
 * 由「已解析的路由数据」组装完整 RouteRecord（计算相对路径、文件名、拼音、
 * keywords、id、mtime）。这是 parser/resolver/pinyin 与索引之间的装配层，
 * 独立成一处，避免旧实现里解析函数「顺手建索引」的耦合。
 *
 * @param {object} input
 * @param {string} [input.title]
 * @param {string} [input.routePath]
 * @param {string} [input.component] 原始 import 说明符
 * @param {string} input.absoluteFile
 * @param {string} input.routerFile
 * @param {string} [input.projectRoot]
 * @returns {RouteRecord}
 */
function buildRecord(input) {
  const {
    title = '',
    routePath = '',
    component = '',
    absoluteFile,
    routerFile,
    projectRoot,
  } = input;

  const relativeFile = projectRoot
    ? path.relative(projectRoot, absoluteFile)
    : absoluteFile;
  const fileName = path.basename(absoluteFile, path.extname(absoluteFile));
  const { fullPinyin, initials, syllables } = buildPinyin(title);

  let mtime = 0;
  try {
    mtime = fs.statSync(absoluteFile).mtimeMs;
  } catch {
    // 文件可能尚不存在（测试或临时态），mtime 记 0。
  }

  const base = {
    title,
    routePath,
    component,
    absoluteFile,
    relativeFile,
    routerFile,
    fileName,
    fullPinyin,
    initials,
  };
  const keywords = buildKeywords({ ...base, syllables });
  const id = `${routerFile}::${routePath}::${absoluteFile}`;

  return { id, ...base, keywords, mtime };
}

module.exports = { buildRecord, buildKeywords };
