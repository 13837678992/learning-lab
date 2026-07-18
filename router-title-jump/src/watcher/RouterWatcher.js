'use strict';

const vscode = require('vscode');
const { clearCache: clearAliasCache } = require('../resolver/AliasResolver');
const { clearCache: clearRootCache } = require('../resolver/ProjectRootResolver');
const logger = require('../utils/logger');

/** @typedef {InstanceType<typeof import('../services/WorkspaceScanner').WorkspaceScanner>} WorkspaceScanner */
/** @typedef {InstanceType<typeof import('../config/ConfigService').ConfigService>} ConfigService */

// 别名相关配置文件：变更时清别名/项目根缓存。
const CONFIG_GLOB =
  '**/{vite.config.js,vite.config.ts,vite.config.mjs,webpack.config.js,webpack.common.js,vue.config.js,tsconfig.json,jsconfig.json,package.json}';
// 组件文件：仅关心 create/delete（影响可解析性），change（编辑）忽略以免编辑期抖动。
const COMPONENT_GLOB = '**/*.{vue,js,jsx,ts,tsx}';

/**
 * 文件监听器：路由文件增量更新、配置文件缓存失效、组件增删触发重扫。
 * 用 FileSystemWatcher，重命名由「删除 + 新建」事件覆盖。
 */
class RouterWatcher {
  /**
   * @param {WorkspaceScanner} scanner
   * @param {ConfigService} config
   */
  constructor(scanner, config) {
    this.scanner = scanner;
    this.config = config;
    /** @type {ReturnType<typeof setTimeout> | null} */
    this.dirtyTimer = null;
  }

  /**
   * @param {vscode.ExtensionContext} context
   */
  start(context) {
    // ① 路由文件：增量再解析
    for (const glob of this.config.routerGlobs) {
      const watcher = vscode.workspace.createFileSystemWatcher(glob);
      watcher.onDidCreate((uri) => this.scanner.scanFile(uri.fsPath));
      watcher.onDidChange((uri) => this.scanner.scanFile(uri.fsPath));
      watcher.onDidDelete((uri) => this.scanner.removeFile(uri.fsPath));
      context.subscriptions.push(watcher);
    }

    // ② 别名配置文件：清缓存（下次解析重新读取）
    const configWatcher = vscode.workspace.createFileSystemWatcher(CONFIG_GLOB);
    const invalidateConfig = () => {
      clearAliasCache();
      clearRootCache();
      this.scanner.markDirty();
      logger.debug('配置变更 → 清别名/根缓存并标记重扫');
    };
    configWatcher.onDidCreate(invalidateConfig);
    configWatcher.onDidChange(invalidateConfig);
    configWatcher.onDidDelete(invalidateConfig);
    context.subscriptions.push(configWatcher);

    // ③ 组件文件：仅 create/delete，防抖后标记重扫（懒生效于下次打开）
    const componentWatcher = vscode.workspace.createFileSystemWatcher(
      COMPONENT_GLOB,
      false, // 关心 create
      true, // 忽略 change（编辑不影响可解析性）
      false // 关心 delete
    );
    componentWatcher.onDidCreate(() => this.scheduleDirty());
    componentWatcher.onDidDelete(() => this.scheduleDirty());
    context.subscriptions.push(componentWatcher);
  }

  /** 防抖标记重扫，避免批量增删文件时反复触发。 */
  scheduleDirty() {
    if (this.dirtyTimer) clearTimeout(this.dirtyTimer);
    this.dirtyTimer = setTimeout(() => {
      this.scanner.markDirty();
      logger.debug('组件文件增删 → 标记重扫');
    }, 500);
  }
}

module.exports = { RouterWatcher };
