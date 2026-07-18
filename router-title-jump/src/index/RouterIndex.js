'use strict';

const { InvertedIndex } = require('./InvertedIndex');

/** @typedef {import('../types').RouteRecord} RouteRecord */

/**
 * 内存路由索引。
 *
 * 设计要点：
 * - 记录按 `routerFile` 分组，支持**按文件增量替换/删除**，而不是旧实现的全量失效
 *   （分析问题 #10）。
 * - 同步维护倒排索引，供 SearchEngine 快速取候选。
 * - QuickPick 只读本索引，绝不重新解析（分析目标：Router Index）。
 */
class RouterIndex {
  constructor() {
    /** @type {Map<string, RouteRecord>} id -> record */
    this.records = new Map();
    /** @type {Map<string, Set<string>>} routerFile -> id 集合 */
    this.byRouterFile = new Map();
    this.inverted = new InvertedIndex();
  }

  /**
   * @param {RouteRecord} record
   */
  add(record) {
    this.records.set(record.id, record);
    let ids = this.byRouterFile.get(record.routerFile);
    if (!ids) {
      ids = new Set();
      this.byRouterFile.set(record.routerFile, ids);
    }
    ids.add(record.id);
    this.inverted.add(record.id, record.keywords);
  }

  /**
   * 移除某 router 文件贡献的全部记录（含倒排）。
   * @param {string} routerFile
   */
  removeByRouterFile(routerFile) {
    const ids = this.byRouterFile.get(routerFile);
    if (!ids) return;
    for (const id of ids) {
      this.records.delete(id);
      this.inverted.remove(id);
    }
    this.byRouterFile.delete(routerFile);
  }

  /**
   * 用新记录替换某 router 文件的旧记录（增量更新的核心）。
   * @param {string} routerFile
   * @param {RouteRecord[]} records
   */
  replaceRouterFile(routerFile, records) {
    this.removeByRouterFile(routerFile);
    for (const record of records) this.add(record);
  }

  /** @param {string} id @returns {RouteRecord | undefined} */
  get(id) {
    return this.records.get(id);
  }

  /** @returns {RouteRecord[]} */
  all() {
    return [...this.records.values()];
  }

  /** @returns {number} */
  size() {
    return this.records.size;
  }

  clear() {
    this.records.clear();
    this.byRouterFile.clear();
    this.inverted.clear();
  }
}

module.exports = { RouterIndex };
