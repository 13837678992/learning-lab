import * as vscode from 'vscode';
import { ImpactTreeProvider } from './providers/impactTree';
import { ResultPanel } from './views/resultPanel';
import { getLastTargets, getLastTargetLabel, setPanel } from './state';
import { registerAnalyzeCommands } from './commands/analyzeCommands';
import { registerSearchCommands } from './commands/searchCommands';
import { registerResultCommands } from './commands/resultCommands';

export function activate(context: vscode.ExtensionContext): void {
  const tree = new ImpactTreeProvider();
  vscode.window.registerTreeDataProvider('vueImpact.impactTree', tree);

  const panel = new ResultPanel(() => {
    const targets = getLastTargets();
    if (targets.length > 0) {
      vscode.commands.executeCommand('vueImpact.reanalyze');
    }
  });
  setPanel(panel);

  const ctx = { tree };
  const disposables = [
    ...registerAnalyzeCommands(ctx),
    ...registerSearchCommands(ctx),
    ...registerResultCommands(ctx),
  ];
  for (const d of disposables) context.subscriptions.push(d);
}

export function deactivate(): void {
  /* nothing */
}
