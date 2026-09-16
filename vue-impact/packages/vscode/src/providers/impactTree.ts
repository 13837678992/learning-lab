import * as path from 'node:path';
import * as vscode from 'vscode';
import type { AnalysisResult, ImpactChain, RouteEntry } from 'vue-impact-core';
import { displayPath } from '../utils/paths';

type Node = SectionNode | TargetNode | RouteNode | ChainFileNode | WarningNode;

class SectionNode {
  constructor(
    public readonly label: string,
    public readonly kind: 'current' | 'routes' | 'chains' | 'warnings',
    public readonly children: Node[] = [],
  ) {}
}

class TargetNode {
  constructor(public readonly file: string, public readonly root: string) {}
}

class RouteNode {
  constructor(public readonly route: RouteEntry, public readonly chain?: ImpactChain, public readonly root?: string) {}
}

class ChainFileNode {
  constructor(public readonly file: string, public readonly root: string, public readonly depth: number) {}
}

class WarningNode {
  constructor(public readonly message: string, public readonly file: string, public readonly line?: number) {}
}

export class ImpactTreeProvider implements vscode.TreeDataProvider<Node> {
  private _onDidChangeTreeData = new vscode.EventEmitter<Node | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private result: AnalysisResult | null = null;
  private targetLabel = '';

  update(result: AnalysisResult, targetLabel: string): void {
    this.result = result;
    this.targetLabel = targetLabel;
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: Node): vscode.TreeItem {
    if (element instanceof SectionNode) {
      const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Expanded);
      item.contextValue = 'section';
      const icons: Record<string, vscode.ThemeIcon> = {
        current: new vscode.ThemeIcon('edit'),
        routes: new vscode.ThemeIcon('globe'),
        chains: new vscode.ThemeIcon('git-branch'),
        warnings: new vscode.ThemeIcon('warning'),
      };
      item.iconPath = icons[element.kind];
      return item;
    }
    if (element instanceof TargetNode) {
      const item = new vscode.TreeItem(displayPath(element.root, element.file), vscode.TreeItemCollapsibleState.None);
      item.iconPath = new vscode.ThemeIcon('symbol-file');
      item.command = { command: 'vueImpact.openRoute', title: '打开文件', arguments: [{ file: element.file }] };
      item.tooltip = element.file;
      return item;
    }
    if (element instanceof RouteNode) {
      const comp = element.route.component
        ? displayPath(element.root ?? '', element.route.component)
        : '（组件未知）';
      const item = new vscode.TreeItem(
        element.route.path,
        element.chain ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None,
      );
      item.iconPath = new vscode.ThemeIcon('globe');
      item.description = comp;
      item.contextValue = 'route';
      item.tooltip = `${element.route.path}\n${comp}\n定义于 ${displayPath(element.root ?? '', element.route.file)}${element.route.line ? ':' + element.route.line : ''}`;
      if (element.route.component) {
        item.command = {
          command: 'vueImpact.openRoute',
          title: '打开路由文件',
          arguments: [{ file: element.route.component, line: element.route.line }],
        };
      }
      return item;
    }
    if (element instanceof ChainFileNode) {
      const label = '  '.repeat(Math.min(element.depth, 8)) + displayPath(element.root, element.file);
      const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
      item.iconPath = new vscode.ThemeIcon('symbol-file');
      item.command = { command: 'vueImpact.openRoute', title: '打开文件', arguments: [{ file: element.file }] };
      item.tooltip = element.file;
      return item;
    }
    if (element instanceof WarningNode) {
      const item = new vscode.TreeItem(element.message, vscode.TreeItemCollapsibleState.None);
      item.iconPath = new vscode.ThemeIcon('warning');
      item.description = displayPath('', element.file) + (element.line ? `:${element.line}` : '');
      item.tooltip = element.file;
      return item;
    }
    return new vscode.TreeItem('?');
  }

  getChildren(element?: Node): Node[] {
    if (!this.result) {
      return [new SectionNode('尚未分析。右键文件 → "Vue Impact: 分析当前文件影响范围"', 'current')];
    }
    if (!element) {
      const root = this.result.projectRoot;
      const sections: Node[] = [];

      sections.push(
        new SectionNode('当前分析', 'current', [
          new TargetNode(this.targetLabel || displayPath(root, this.result.targetFiles[0] ?? ''), root),
        ]),
      );

      const routeNodes = this.result.routes.map((r) => {
        const chain = this.result?.chains.find((c) => c.routePath === r.path);
        return new RouteNode(r, chain, root);
      });
      sections.push(new SectionNode(`影响页面 (${this.result.routes.length})`, 'routes', routeNodes));

      const chainFiles = new Set<string>();
      for (const c of this.result.chains) {
        for (const f of c.chain) chainFiles.add(f);
      }
      sections.push(
        new SectionNode('分析链', 'chains', [...chainFiles].map((f) => new ChainFileNode(f, root, 0))),
      );

      if (this.result.warnings.length > 0) {
        sections.push(
          new SectionNode(`警告 (${this.result.warnings.length})`, 'warnings', [
            ...this.result.warnings.map((w) => new WarningNode(w.message, w.file, w.line)),
          ]),
        );
      }
      return sections;
    }
    if (element instanceof SectionNode) return element.children;
    if (element instanceof RouteNode && element.chain) {
      return element.chain.chain.map((f, i) => new ChainFileNode(f, element.root ?? '', i));
    }
    return [];
  }
}
