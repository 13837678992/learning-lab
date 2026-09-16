import * as path from 'node:path';
import * as vscode from 'vscode';
import { workspaceSearch } from '../search/workspaceSearch';
import { runAnalysis, RunContext } from './analyzeFile';

/**
 * 分析工作区搜索匹配：
 * 输入关键字 -> 扩展自行执行工作区搜索（findFiles + readFile，不依赖系统 grep）
 * -> 命中文件去重 -> 反向影响分析 -> 聚合去重输出影响路由。
 */
export function registerSearchCommands(ctx: RunContext): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];

  disposables.push(
    vscode.commands.registerCommand('vueImpact.analyzeWorkspaceSearch', async () => {
      const editor = vscode.window.activeTextEditor;
      const defaultQuery = editor
        ? editor.document.getText(editor.document.getWordRangeAtPosition(editor.selection.active) ?? editor.selection)
        : '';

      const query = await vscode.window.showInputBox({
        prompt: 'Vue Impact: 输入要搜索的符号 / 文本（分析所有命中文件的影响路由）',
        value: defaultQuery,
        placeHolder: '例如 someGlobalMethod',
      });
      if (!query) return;

      const config = vscode.workspace.getConfiguration('vueImpact');
      const exclude = config.get<string[]>('excludePatterns', []);
      const maxFiles = config.get<number>('searchMaxFiles', 3000);

      const hits = await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: `Vue Impact: 搜索 "${query}"` },
        (progress) => workspaceSearch(query, exclude, maxFiles, progress),
      );

      const files = [...new Set(hits.map((h) => h.file))];
      if (files.length === 0) {
        vscode.window.showInformationMessage(`Vue Impact: 未搜索到 "${query}" 的匹配。`);
        return;
      }

      vscode.window.showInformationMessage(
        `Vue Impact: 搜索命中 ${hits.length} 处，涉及文件 ${files.length} 个，开始依赖分析…`,
      );

      const label = `${files.length} 个文件（搜索 "${query}"，命中 ${hits.length}）`;
      const result = await runAnalysis(ctx, files, label);
      if (result && result.routes.length > 0) {
        vscode.window.showInformationMessage(
          `Vue Impact: 搜索 "${query}" 影响 ${result.routes.length} 个路由页面。`,
        );
      }
    }),
  );

  return disposables;
}

export function fileBaseName(f: string): string {
  return path.basename(f);
}
