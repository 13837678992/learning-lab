import * as vscode from 'vscode';
import type { AnalysisResult } from 'vue-impact-core';
import { displayPath } from '../utils/paths';

/**
 * 结果面板（Webview）：清晰展示目标、影响页面、影响链，
 * 提供 复制测试范围 / 复制 Markdown / 导出 JSON / 重新分析 按钮。
 */
export class ResultPanel {
  private panel: vscode.WebviewPanel | undefined;
  private result: AnalysisResult | null = null;
  private targetLabel = '';
  private onReanalyze: () => void;

  constructor(onReanalyze: () => void) {
    this.onReanalyze = onReanalyze;
  }

  showOrUpdate(result: AnalysisResult, targetLabel: string): void {
    this.result = result;
    this.targetLabel = targetLabel;
    if (!this.panel) {
      this.panel = vscode.window.createWebviewPanel(
        'vueImpact.result',
        'Vue Impact',
        vscode.ViewColumn.Beside,
        { enableScripts: true, retainContextWhenHidden: true },
      );
      this.panel.onDidDispose(() => {
        this.panel = undefined;
      });
      this.panel.webview.onDidReceiveMessage(async (msg) => {
        await this.handleMessage(msg);
      });
    }
    this.panel.title = `Vue Impact: ${targetLabel}`;
    this.panel.webview.html = this.render();
    this.panel.reveal(vscode.ViewColumn.Beside, true);
  }

  private async handleMessage(msg: { cmd: string; file?: string; line?: number }): Promise<void> {
    switch (msg.cmd) {
      case 'copyTestScope':
        await vscode.commands.executeCommand('vueImpact.copyTestScope');
        break;
      case 'copyMarkdown':
        await vscode.commands.executeCommand('vueImpact.copyMarkdown');
        break;
      case 'exportJson':
        await vscode.commands.executeCommand('vueImpact.exportJson');
        break;
      case 'reanalyze':
        this.onReanalyze();
        break;
      case 'openRoute':
        if (msg.file) {
          await vscode.commands.executeCommand('vueImpact.openRoute', { file: msg.file, line: msg.line });
        }
        break;
    }
  }

  private esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  private render(): string {
    const r = this.result;
    if (!r) return '<html><body></body></html>';
    const root = r.projectRoot;
    const rel = (f: string) => this.esc(displayPath(root, f));

    const routesHtml = r.routes
      .map((route) => {
        const chain = r.chains.find((c) => c.routePath === route.path);
        const chainHtml = chain
          ? chain.chain
              .map((f, i) => {
                const prefix = i === 0 ? '' : '└ ';
                return `<div class="chain-file" data-file="${this.esc(f)}" title="点击打开">${prefix}${rel(f)}</div>`;
              })
              .join('')
          : '';
        const comp = route.component ? rel(route.component) : '';
        const clickable = route.component
          ? `<span class="route-path link" data-file="${this.esc(route.component)}" data-line="${route.line ?? 0}" title="点击打开 ${comp}">${this.esc(route.path)}</span>`
          : `<span class="route-path">${this.esc(route.path)}</span>`;
        return `<details class="route" ${r.routes.length <= 8 ? 'open' : ''}>
  <summary>${clickable}${comp ? ` <span class="muted">${comp}</span>` : ''}</summary>
  <div class="chain">${chainHtml}</div>
</details>`;
      })
      .join('');

    const warningsHtml = r.warnings.length
      ? `<div class="warnings"><h3>⚠️ 分析警告</h3>${r.warnings
          .map((w) => `<div class="warning">${this.esc(rel(w.file))}${w.line ? ':' + w.line : ''}: ${this.esc(w.message)}</div>`)
          .join('')}</div>`
      : '';

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<style>
  body { font-family: var(--vscode-font-family, sans-serif); padding: 12px 16px; color: var(--vscode-foreground); }
  h2 { margin: 4px 0 8px; font-size: 16px; }
  h3 { margin: 12px 0 4px; font-size: 13px; color: var(--vscode-descriptionForeground); }
  .target { background: var(--vscode-input-background); padding: 6px 10px; border-radius: 4px; font-family: var(--vscode-editor-font-family, monospace); font-size: 12px; }
  .route { margin: 4px 0; }
  .route summary { cursor: pointer; font-family: var(--vscode-editor-font-family, monospace); font-size: 13px; }
  .route-path { font-weight: 600; }
  .link { color: var(--vscode-textLink-foreground); cursor: pointer; }
  .muted { color: var(--vscode-descriptionForeground); font-size: 11px; }
  .chain { margin: 2px 0 6px 18px; border-left: 2px solid var(--vscode-panel-border); padding-left: 10px; }
  .chain-file { font-family: var(--vscode-editor-font-family, monospace); font-size: 12px; padding: 1px 0; cursor: pointer; }
  .chain-file:hover { color: var(--vscode-textLink-foreground); }
  .btn { margin: 10px 6px 0 0; padding: 4px 12px; cursor: pointer; }
  .warning { color: var(--vscode-warningForeground, #c90); font-size: 12px; margin: 2px 0; }
  .count { margin-top: 10px; font-weight: 600; }
</style>
</head>
<body>
  <h2>Vue Impact</h2>
  <h3>目标</h3>
  <div class="target">${this.esc(this.targetLabel)}</div>
  <h3>影响页面 ${r.routes.length}</h3>
  ${routesHtml || '<div class="muted">未发现受影响的路由页面</div>'}
  ${warningsHtml}
  <div class="count">共 ${r.routes.length} 个路由页面</div>
  <div>
    <button class="btn" id="copy-scope">复制测试范围</button>
    <button class="btn" id="copy-md">复制 Markdown</button>
    <button class="btn" id="export-json">导出 JSON</button>
    <button class="btn" id="reanalyze">重新分析</button>
  </div>
<script>
const vscode = acquireVsCodeApi();
document.getElementById('copy-scope').addEventListener('click', () => vscode.postMessage({ cmd: 'copyTestScope' }));
document.getElementById('copy-md').addEventListener('click', () => vscode.postMessage({ cmd: 'copyMarkdown' }));
document.getElementById('export-json').addEventListener('click', () => vscode.postMessage({ cmd: 'exportJson' }));
document.getElementById('reanalyze').addEventListener('click', () => vscode.postMessage({ cmd: 'reanalyze' }));
document.querySelectorAll('.link, .chain-file').forEach((el) => {
  el.addEventListener('click', () => vscode.postMessage({ cmd: 'openRoute', file: el.dataset.file, line: Number(el.dataset.line || 0) }));
});
</script>
</body>
</html>`;
  }

  dispose(): void {
    this.panel?.dispose();
    this.panel = undefined;
  }
}
