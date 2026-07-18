'use strict';

/**
 * 倒排索引：token -> 记录 id 集合。
 *
 * 用途：为搜索提供 O(1) 精确命中与前缀候选，支撑多词 AND 检索，避免对全部
 * 记录做无谓遍历（分析问题 #9）。维护双向映射以支持增量删除。
 */
class InvertedIndex {
  constructor() {
    /** @type {Map<string, Set<string>>} token -> ids */
    this.map = new Map();
    /** @type {Map<string, Set<string>>} id -> tokens（用于删除） */
    this.byId = new Map();
  }

  /**
   * @param {string} id
   * @param {string[]} tokens
   */
  add(id, tokens) {
    const set = new Set(tokens.filter(Boolean));
    this.byId.set(id, set);
    for (const token of set) {
      let ids = this.map.get(token);
      if (!ids) {
        ids = new Set();
        this.map.set(token, ids);
      }
      ids.add(id);
    }
  }

  /**
   * @param {string} id
   */
  remove(id) {
    const tokens = this.byId.get(id);
    if (!tokens) return;
    for (const token of tokens) {
      const ids = this.map.get(token);
      if (ids) {
        ids.delete(id);
        if (ids.size === 0) this.map.delete(token);
      }
    }
    this.byId.delete(id);
  }

  /**
   * 精确命中某 token 的 id 集合。
   * @param {string} term
   * @returns {Set<string>}
   */
  exactIds(term) {
    return this.map.get(term) || new Set();
  }

  /**
   * 命中「以 term 为前缀的 token」的所有 id。
   * @param {string} term
   * @returns {Set<string>}
   */
  prefixIds(term) {
    /** @type {Set<string>} */
    const out = new Set();
    for (const [token, ids] of this.map) {
      if (token.startsWith(term)) {
        for (const id of ids) out.add(id);
      }
    }
    return out;
  }

  clear() {
    this.map.clear();
    this.byId.clear();
  }
}

module.exports = { InvertedIndex };
