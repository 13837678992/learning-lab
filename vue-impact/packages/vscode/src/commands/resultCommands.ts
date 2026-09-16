import * as vscode from 'vscode';
import {
  clearProjectCache,
  formatJSON,
  formatMarkdown,
  formatTestScope,
} from 'vue-impact-core';
import { getLastResult, getLastTargets, workspaceRoot } from '../state';
import { runAnalysis, RunContext } from './analyzeFile';
import { registerAnalyzeCommands } from './analyzeCommands';
import { registerSearchCommands } from './searchCommands';

export function registerResultCommands(ctx: RunContext): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];

  const requireResult = (): ReturnType<typeof getLastResult> => {
    const result = getLastResult();
    if (!result) {
      vscode.window.showWarningMessage('Vue Impact: 尚无分析结果，请先执行一次分析。');
    }
    return result;
  };

  disposables.push(
    vscode.commands.registerCommand('vueImpact.copyTestScope', async () => {
      const result = requireResult();
      if (!result) return;
      const scope = formatTestScope(result);
      await vscode.env.clipboard.writeText(scope);
      vscode.window.showInformationMessage(`Vue Impact: 已复制 ${result.routes.length} 个测试范围路由到剪贴板。`);
    }),
  );

  disposables.push(
    vscode.commands.registerCommand('vueImpact.copyMarkdown', async () => {
      const result = requireResult();
      if (!result) return;
      await vscode.env.clipboard.writeText(formatMarkdown(result));
      vscode.window.showInformationMessage('Vue Impact: 已复制 Markdown 报告到剪贴板。');
    }),
  );

  disposables.push(
    vscode.commands.registerCommand('vueImpact.exportJson', async () => {
      const result = requireResult();
      if (!result) return;
      await saveReport('JSON', 'vue-impact-result.json', formatJSON(result));
    }),
  );

  disposables.push(
    vscode.commands.registerCommand('vueImpact.exportMarkdown', async () => {
      const result = requireResult();
      if (!result) return;
      await saveReport('Markdown', 'vue-impact-result.md', formatMarkdown(result));
    }),
  );

  disposables.push(
    vscode.commands.registerCommand('vueImpact.clearCache', async () => {
      const root = workspaceRoot();
      if (!root) return;
      const config = vscode.workspace.getConfiguration('vueImpact');
      const dir = clearProjectCache(root, config.get<string>('cacheDir', '.node-impact-cache'));
      vscode.window.showInformationMessage(`Vue Impact: 已清除缓存 ${dir}`);
      const targets = getLastTargets();
      if (targets.length > 0) {
        await runAnalysis(ctx, targets, '重新分析');
      }
    }),
  );

  disposables.push(
    vscode.commands.registerCommand(
      'vueImpact.openRoute',
      async (args?: { file?: string; line?: number }) => {
        if (!args?.file) return;
        const uri = vscode.Uri.file(args.file);
        try {
          const doc = await vscode.workspace.openTextDocument(uri);
          const editor = await vscode.window.showTextDocument(doc, { preview: true });
          if (args.line && args.line > 0) {
            const pos = new vscode.Position(args.line - 1, 0);
            editor.selection = new vscode.Selection(pos, pos);
            editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
          }
        } catch {
          vscode.window.showWarningMessage(`Vue Impact: 无法打开 ${args.file}`);
        }
      },
    ),
  );

  return disposables;
}

async function saveReport(kind: string, defaultName: string, content: string): Promise<void> {
  const root = workspaceRoot();
  const defaultUri = root ? vscode.Uri.file(`${root}/${defaultName}`) : undefined;
  const uri = await vscode.window.showSaveDialog({
    defaultUri,
    filters: kind === 'JSON' ? { JSON: ['json'] } : { Markdown: ['md'] },
  });
  if (!uri) return;
  try {
    await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
    vscode.window.showInformationMessage(`Vue Impact: 已导出 ${kind} 报告到 ${uri.fsPath}`);
  } catch (err) {
    vscode.window.showErrorMessage('Vue Impact: 导出失败 ' + (err instanceof Error ? err.message : String(err)));
  }
}

export { registerAnalyzeCommands, registerSearchCommands };
