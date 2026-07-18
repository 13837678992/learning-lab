'use strict';

const vscode = require('vscode');

/**
 * 跳转服务：在编辑器中打开目标文件。
 * @param {string} absoluteFile
 * @returns {Promise<void>}
 */
async function openFile(absoluteFile) {
  const document = await vscode.workspace.openTextDocument(
    vscode.Uri.file(absoluteFile)
  );
  await vscode.window.showTextDocument(document, {
    viewColumn: vscode.ViewColumn.Active,
    preview: false,
  });
}

module.exports = { openFile };
