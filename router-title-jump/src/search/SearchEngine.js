'use strict';

const { scoreRecord } = require('./scoring');

/** @typedef {import('../types').RouteRecord} RouteRecord */

/**
 * 搜索所需的索引能力（结构化类型，与 RouterIndex 具体实现解耦、便于测试）。
 * @typedef {object} SearchableIndex
 * @property {() => RouteRecord[]} all
 * @property {(id: string) => (RouteRecord | undefined)} get
 * @property {{ prefixIds: (term: string) => Set<string> }} inverted
 */

/**
 * 按 title 的中文本地化顺序比较（稳定次序）。
 * @param {RouteRecord} a
 * @param {RouteRecord} b
 */
function byTitle(a, b) {
  return a.title.localeCompare(b.title, 'zh-CN');
}

/**
 * 单词查询：全量记录分档打分（正确覆盖子串，如「chanpin」跨音节命中）。
 * 每条记录内部短路到最优档，1w 级规模仍在毫秒级。
 * @param {RouteRecord[]} records
 * @param {string} term
 * @returns {RouteRecord[]}
 */
function searchSingle(records, term) {
  /** @type {{ rec: RouteRecord, score: number }[]} */
  const scored = [];
  for (const rec of records) {
    const score = scoreRecord(rec, term);
    if (score > 0) scored.push({ rec, score });
  }
  scored.sort((a, b) => b.score - a.score || byTitle(a.rec, b.rec));
  return scored.map((s) => s.rec);
}

/**
 * 多词查询（AND）：
 * 快路——用倒排「前缀候选」的并集缩小池子；池为空则回退全量，保证子串正确性。
 * 判定——要求每个词在记录上都能打到分（>0），分值取各词之和。
 * @param {SearchableIndex} index
 * @param {string[]} terms
 * @returns {RouteRecord[]}
 */
function searchMulti(index, terms) {
  /** @type {Set<string>} */
  const candidateIds = new Set();
  for (const term of terms) {
    for (const id of index.inverted.prefixIds(term)) candidateIds.add(id);
  }
  const pool = candidateIds.size
    ? [...candidateIds].map((id) => index.get(id))
    : index.all();

  /** @type {{ rec: RouteRecord, score: number }[]} */
  const scored = [];
  for (const rec of pool) {
    if (!rec) continue;
    let total = 0;
    let matchedAll = true;
    for (const term of terms) {
      const s = scoreRecord(rec, term);
      if (s === 0) {
        matchedAll = false;
        break;
      }
      total += s;
    }
    if (matchedAll) scored.push({ rec, score: total });
  }
  scored.sort((a, b) => b.score - a.score || byTitle(a.rec, b.rec));
  return scored.map((s) => s.rec);
}

/**
 * 搜索入口。
 * @param {SearchableIndex} index
 * @param {string} query
 * @returns {RouteRecord[]}
 */
function search(index, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return index.all().sort(byTitle);

  const terms = normalized.split(/\s+/).filter(Boolean);
  if (terms.length > 1) return searchMulti(index, terms);
  return searchSingle(index.all(), terms[0]);
}

module.exports = { search };
