'use strict';

/** @typedef {import('../types').RouteRecord} RouteRecord */

/**
 * 评分权重表。分档保证排序优先级：
 * title 完全 > title 前缀 > title 包含 > 全拼 > 首字母 > Router Path > 文件名 > 组件 > 其它。
 * 集中在此便于调参。
 */
const WEIGHTS = {
  titleExact: 1000,
  titlePrefix: 950,
  titleIncludes: 900,
  fullPinyinExact: 860,
  fullPinyinPrefix: 850,
  fullPinyinIncludes: 840,
  initialsExact: 820,
  initialsPrefix: 810,
  initialsIncludes: 800,
  routePathExact: 700,
  routePathPrefix: 690,
  routePathIncludes: 680,
  fileNameExact: 640,
  fileNamePrefix: 630,
  fileNameIncludes: 620,
  componentIncludes: 600,
  relativeIncludes: 580,
  keywordExact: 500,
};

/**
 * 对单个字段按 完全 / 前缀 / 包含 三档给分，取传入的分值。
 * @param {string} field 已小写字段
 * @param {string} term 已小写查询
 * @param {number} exact
 * @param {number} prefix
 * @param {number} includes
 * @returns {number}
 */
function tier(field, term, exact, prefix, includes) {
  if (!field) return 0;
  if (field === term) return exact;
  if (field.startsWith(term)) return prefix;
  if (field.includes(term)) return includes;
  return 0;
}

/**
 * 给一条记录对某查询词打分（取各字段最高档）。分档命中即用 Math.max 合并，
 * 天然「短路」到最优档位，避免退化成朴素 includes（分析问题 #9）。
 *
 * @param {RouteRecord} rec
 * @param {string} term 已 trim+小写
 * @returns {number}
 */
function scoreRecord(rec, term) {
  let score = 0;
  const title = rec.title.toLowerCase();

  score = Math.max(score, tier(title, term, WEIGHTS.titleExact, WEIGHTS.titlePrefix, WEIGHTS.titleIncludes));
  if (score >= WEIGHTS.titleIncludes) return score; // 已是最高档，提前返回

  score = Math.max(score, tier(rec.fullPinyin, term, WEIGHTS.fullPinyinExact, WEIGHTS.fullPinyinPrefix, WEIGHTS.fullPinyinIncludes));
  score = Math.max(score, tier(rec.initials, term, WEIGHTS.initialsExact, WEIGHTS.initialsPrefix, WEIGHTS.initialsIncludes));
  score = Math.max(score, tier(rec.routePath.toLowerCase(), term, WEIGHTS.routePathExact, WEIGHTS.routePathPrefix, WEIGHTS.routePathIncludes));
  score = Math.max(score, tier(rec.fileName.toLowerCase(), term, WEIGHTS.fileNameExact, WEIGHTS.fileNamePrefix, WEIGHTS.fileNameIncludes));

  if (rec.component.toLowerCase().includes(term)) score = Math.max(score, WEIGHTS.componentIncludes);
  if (rec.relativeFile.toLowerCase().includes(term)) score = Math.max(score, WEIGHTS.relativeIncludes);
  if (rec.keywords.includes(term)) score = Math.max(score, WEIGHTS.keywordExact);

  return score;
}

module.exports = { scoreRecord, WEIGHTS };
