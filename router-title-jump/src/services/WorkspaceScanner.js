'use strict';

const vscode = require('vscode');
const fs = require('fs');
const { buildRecordsForFile } = require('../index/IndexBuilder');
const { findProjectRoot } = require('../resolver/ProjectRootResolver');
const logger = require('../utils/logger');

/** @typedef {InstanceType<typeof import('../index/RouterIndex').RouterIndex>} RouterIndex */
/** @typedef {InstanceType<typeof import('../cache/CacheManager').CacheManager>} CacheManager */
/** @typedef {InstanceType<typeof import('../config/ConfigService').ConfigService>} ConfigService */

/**
 * 工作区扫描器：发现路由文件、读取内容、驱动 IndexBuilder 填充索引。
 *
 * - 首次懒扫描（命令触发时才扫），激活即时开销为零。
 * - 单文件走 mtime 缓存：未变则复用记录（增量，非全量重扫，分析问题 #10）。
 * - findFiles 不再限制 200 条（分析问题 #11）。
 */
class WorkspaceScanner {
  /**
   * @param {RouterIndex} index
   * @param {CacheManager} cache
   * @param {ConfigService} config
   */
  constructor(index, cache, config) {
    this.index = index;
    this.cache = cache;
    this.config = config;
    this.scanned = false;
  }

  /** 懒触发首次全量扫描。 */
  async ensureScanned() {
    if (!this.scanned) {
      await this.scanAll();
      this.scanned = true;
    }
  }

  /** 标记为「需重扫」（组件文件增删后由 watcher 调用）。 */
  markDirty() {
    this.scanned = false;
    this.cache.clear();
  }

  /** 完全重置（配置变更时调用）。 */
  reset() {
    this.scanned = false;
    this.index.clear();
    this.cache.clear();
  }

  async scanAll() {
    const stop = logger.startTimer('scanAll');
    const files = await this.findRouterFiles();
    for (const uri of files) this.scanFile(uri.fsPath);
    const ms = stop();
    logger.info(
      `扫描完成：${this.index.size()} 条路由 / ${files.length} 个路由文件（${ms.toFixed(0)}ms）`
    );
  }

  /** @returns {Promise<vscode.Uri[]>} */
  async findRouterFiles() {
    const { routerGlobs, exclude } = this.config;
    /** @type {Map<string, vscode.Uri>} */
    const map = new Map();
    for (const glob of routerGlobs) {
      const files = await vscode.workspace.findFiles(glob, exclude);
      for (const file of files) map.set(file.toString(), file);
    }
    return [...map.values()];
  }

  /**
   * 扫描单个路由文件并增量并入索引。
   * @param {string} routerFile 绝对路径
   */
  scanFile(routerFile) {
    let stat;
    try {
      stat = fs.statSync(routerFile);
    } catch {
      return;
    }
    const mtime = stat.mtimeMs;

    const cached = this.cache.get(routerFile);
    if (cached && cached.mtime === mtime) {
      this.index.replaceRouterFile(routerFile, cached.records);
      return;
    }

    let code;
    try {
      code = fs.readFileSync(routerFile, 'utf8');
    } catch {
      return;
    }
    const projectRoot = findProjectRoot(routerFile);
    const records = buildRecordsForFile(code, routerFile, projectRoot);
    this.cache.set(routerFile, mtime, records);
    this.index.replaceRouterFile(routerFile, records);
    logger.debug(`索引 ${routerFile}: ${records.length} 条`);
  }

  /**
   * 从索引与缓存中移除某路由文件。
   * @param {string} routerFile
   */
  removeFile(routerFile) {
    this.index.removeByRouterFile(routerFile);
    this.cache.delete(routerFile);
    logger.debug(`移除 ${routerFile}`);
  }
}

module.exports = { WorkspaceScanner };
