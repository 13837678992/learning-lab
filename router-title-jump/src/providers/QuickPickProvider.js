'use strict';

const vscode = require('vscode');
const { search } = require('../search/SearchEngine');
const { openFile } = require('../services/JumpService');
const logger = require('../utils/logger');

/** @typedef {import('../types').RouteRecord} RouteRecord */
/** @typedef {InstanceType<typeof import('../index/RouterIndex').RouterIndex>} RouterIndex */
/** @typedef {vscode.QuickPickItem & { record: RouteRecord }} RouteItem */

/**
 * 把记录转成 QuickPick 项。
 *
 * 关键：设 `alwaysShow: true` 关闭 VSCode 对 label 的内置过滤——否则输入拼音
 * 「cp」时，VSCode 会用「cp」去过滤 label「保险产品」而全部隐藏。改由我们自己的
 * SearchEngine 完全掌控候选与排序。
 *
 * @param {RouteRecord[]} records
 * @returns {RouteItem[]}
 */
function toItems(records) {
  return records.map((r) => ({
    label: r.title || r.fileName,
    description: r.routePath,
    detail: r.relativeFile,
    alwaysShow: true,
    record: r,
  }));
}

/**
 * 打开路由跳转 QuickPick。只读索引，绝不重新解析。
 * @param {RouterIndex} index
 */
function showRouteQuickPick(index) {
  if (index.size() === 0) {
    vscode.window.showWarningMessage(
      '未找到可跳转的路由页面。请确认 router 中有 title 与 component。'
    );
    return;
  }

  const quickPick = /** @type {vscode.QuickPick<RouteItem>} */ (
    vscode.window.createQuickPick()
  );
  quickPick.placeholder = '输入 中文 / 拼音 / 首字母 / 路径 / 文件名 搜索页面';
  quickPick.matchOnDescription = false;
  quickPick.matchOnDetail = false;
  quickPick.items = toItems(search(index, ''));

  quickPick.onDidChangeValue((value) => {
    const stop = logger.startTimer('search');
    quickPick.items = toItems(search(index, value));
    stop();
  });

  quickPick.onDidAccept(async () => {
    const selected = quickPick.selectedItems[0];
    quickPick.hide();
    if (selected) {
      try {
        await openFile(selected.record.absoluteFile);
      } catch (err) {
        logger.error(`打开失败 ${selected.record.absoluteFile}`, err);
        vscode.window.showErrorMessage('无法打开目标文件。');
      }
    }
  });

  quickPick.onDidHide(() => quickPick.dispose());
  quickPick.show();
}

module.exports = { showRouteQuickPick, toItems };
