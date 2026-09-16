import * as vscode from 'vscode';
import { getLastTargets, getLastTargetLabel } from '../state';
import { activeEditorFile, basenameLabel, fileFromUri, runAnalysis, RunContext } from './analyzeFile';

export function registerAnalyzeCommands(ctx: RunContext): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];

  disposables.push(
    vscode.commands.registerCommand('vueImpact.analyzeFile', async (uri?: vscode.Uri) => {
      const file = fileFromUri(uri);
      if (!file) {
        vscode.window.showWarningMessage('Vue Impact: 请先打开一个文件。');
        return;
      }
      await runAnalysis(ctx, [file], basenameLabel(file));
    }),
  );

  disposables.push(
    vscode.commands.registerCommand('vueImpact.analyzeSymbol', async (uri?: vscode.Uri) => {
      const file = fileFromUri(uri);
      if (!file) {
        vscode.window.showWarningMessage('Vue Impact: 请先打开一个文件。');
        return;
      }
      const editor = vscode.window.activeTextEditor;
      const symbol = editor
        ? editor.document.getText(editor.document.getWordRangeAtPosition(editor.selection.active) ?? editor.selection)
        : '';
      const label = symbol ? `${basenameLabel(file)} :: ${symbol}` : basenameLabel(file);
      // 第一阶段：符号 -> 所属文件 -> 文件级影响分析（后续版本升级为函数调用图）
      await runAnalysis(ctx, [file], label);
    }),
  );

  disposables.push(
    vscode.commands.registerCommand('vueImpact.reanalyze', async () => {
      const targets = getLastTargets();
      if (targets.length === 0) {
        vscode.window.showWarningMessage('Vue Impact: 尚无分析记录，请先执行一次分析。');
        return;
      }
      await runAnalysis(ctx, targets, getLastTargetLabel());
    }),
  );

  return disposables;
}

export function currentFileLabel(): string {
  const file = activeEditorFile();
  return file ? basenameLabel(file) : '';
}
