'use strict';

/** @typedef {import('../types').RouteRecord} RouteRecord */

/**
 * 解析结果缓存：按 routerFile 缓存 { mtime, records }。
 *
 * 扫描时若文件 mtime 未变即复用缓存，从而实现「增量而非全量重扫」
 * （分析问题 #10）。仅内存缓存，随会话生命周期。
 */
class CacheManager {
  constructor() {
    /** @type {Map<string, { mtime: number, records: RouteRecord[] }>} */
    this.store = new Map();
  }

  /**
   * 缓存是否命中且 mtime 一致（可复用）。
   * @param {string} routerFile
   * @param {number} mtime
   * @returns {boolean}
   */
  isFresh(routerFile, mtime) {
    const hit = this.store.get(routerFile);
    return !!hit && hit.mtime === mtime;
  }

  /**
   * @param {string} routerFile
   * @param {number} mtime
   * @param {RouteRecord[]} records
   */
  set(routerFile, mtime, records) {
    this.store.set(routerFile, { mtime, records });
  }

  /**
   * @param {string} routerFile
   * @returns {{ mtime: number, records: RouteRecord[] } | undefined}
   */
  get(routerFile) {
    return this.store.get(routerFile);
  }

  /** @param {string} routerFile */
  delete(routerFile) {
    this.store.delete(routerFile);
  }

  clear() {
    this.store.clear();
  }
}

module.exports = { CacheManager };
