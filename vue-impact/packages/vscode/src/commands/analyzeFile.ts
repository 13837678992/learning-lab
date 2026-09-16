import * as path from 'node:path';
import * as vscode from 'vscode';
import { analyze, AnalysisResult } from 'vue-impact-core';
import { ImpactTreeProvider } from '../providers/impactTree';
import { getPanel, setLastResult, workspaceRoot } from '../state';

export interface RunContext {
  tree: ImpactTreeProvider;
}

/** 执行分析并刷新 TreeView + Webview */
export async function runAnalysis(
  ctx: RunContext,
  targets: string[],
  label: string,
): Promise<AnalysisResult | null> {
  const root = workspaceRoot();
  if (!root) {
    vscode.window.showWarningMessage('Vue Impact: 请先打开一个工作区。');
    return null;
  }
  if (targets.length === 0) {
    vscode.window.showWarningMessage('Vue Impact: 没有可分析的目标文件。');
    return null;
  }

  const config = vscode.workspace.getConfiguration('vueImpact');
  const exclude = config.get<string[]>('excludePatterns', []);
  const cacheDir = config.get<string>('cacheDir', '.node-impact-cache');
  const maxFiles = config.get<number>('maxFiles', 20000);

  let result: AnalysisResult;
  try {
    result = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Vue Impact 分析中…', cancellable: true },
      async (progress, token) => {
        token.onCancellationRequested(() => {
          /* analyze 为同步 CPU 密集操作，无法中途取消；在下一版本支持 */
        });
        progress.report({ message: '扫描项目文件' });
        return analyze(targets, { projectRoot: root, exclude, cacheDir, maxFiles });
      },
    );
  } catch (err) {
    vscode.window.showErrorMessage('Vue Impact 分析失败: ' + (err instanceof Error ? err.message : String(err)));
    return null;
  }

  setLastResult(result, targets, label);
  ctx.tree.update(result, label);

  const noVue = result.warnings.find((w) => w.type === 'no-vue-project');
  if (noVue) {
    vscode.window.showInformationMessage('Vue Impact: 当前 Workspace 未检测到 Vue 项目。');
  }

  const panel = getPanel();
  panel?.showOrUpdate(result, label);

  const elapsed = (result.stats.elapsedMs / 1000).toFixed(1);
  vscode.window.setStatusBarMessage(
    `Vue Impact: ${result.routes.length} 个影响页面（${elapsed}s，缓存命中 ${result.stats.cacheHits}）`,
    5000,
  );
  return result;
}

/** 从当前活动编辑器取文件 */
export function activeEditorFile(): string | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return undefined;
  const uri = editor.document.uri;
  if (uri.scheme !== 'file') return undefined;
  return uri.fsPath;
}

/** 从 URI 取文件（右键菜单传入） */
export function fileFromUri(uri: vscode.Uri | undefined): string | undefined {
  if (uri && uri.scheme === 'file') return uri.fsPath;
  return activeEditorFile();
}

/** 从选区/光标取符号名 */
export function symbolAtCursor(): string | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return undefined;
  const range = editor.document.getWordRangeAtPosition(editor.selection.active);
  if (!range) return undefined;
  return editor.document.getText(range);
}

export function basenameLabel(file: string): string {
  return path.basename(file);
}
