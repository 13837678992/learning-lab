'use strict';

const vscode = require('vscode');
const logger = require('./utils/logger');
const { ConfigService } = require('./config/ConfigService');
const { RouterIndex } = require('./index/RouterIndex');
const { CacheManager } = require('./cache/CacheManager');
const { WorkspaceScanner } = require('./services/WorkspaceScanner');
const { RouterWatcher } = require('./watcher/RouterWatcher');
const { showRouteQuickPick } = require('./providers/QuickPickProvider');
const { clearCache: clearAliasCache } = require('./resolver/AliasResolver');
const { clearCache: clearRootCache } = require('./resolver/ProjectRootResolver');

/**
 * 扩展入口——只做装配与接线：构造各服务、注册命令、启动监听。
 * 全部业务逻辑在 src/ 各模块中，本文件保持精简（远小于 300 行的约束）。
 *
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const output = vscode.window.createOutputChannel('Router Jump');
  logger.setSink(output);
  context.subscriptions.push(output);

  const config = new ConfigService();
  const index = new RouterIndex();
  const cache = new CacheManager();
  const scanner = new WorkspaceScanner(index, cache, config);

  const watcher = new RouterWatcher(scanner, config);
  watcher.start(context);

  context.subscriptions.push(
    // 命令 id / 快捷键与旧版一致，向下兼容。
    vscode.commands.registerCommand('router-jump.jumpByTitle', async () => {
      try {
        await scanner.ensureScanned();
      } catch (err) {
        logger.error('扫描失败', err);
      }
      showRouteQuickPick(index);
    }),
    // 插件配置变更：清缓存并重置，下次打开重扫。
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('routerJump')) {
        clearAliasCache();
        clearRootCache();
        scanner.reset();
        logger.debug('routerJump 配置变更 → 重置');
      }
    })
  );

  logger.info('Router Jump 已激活');
}

function deactivate() {
  // 资源已通过 context.subscriptions 释放。
}

module.exports = { activate, deactivate };
