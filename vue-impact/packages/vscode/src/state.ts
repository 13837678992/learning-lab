import * as vscode from 'vscode';
import { AnalysisResult } from 'vue-impact-core';

/** 扩展全局状态：最近一次分析结果与目标 */
let lastResult: AnalysisResult | null = null;
let lastTargets: string[] = [];
let lastTargetLabel = '';
let panel: import('./views/resultPanel').ResultPanel | undefined;

export function setLastResult(result: AnalysisResult, targets: string[], label: string): void {
  lastResult = result;
  lastTargets = targets;
  lastTargetLabel = label;
}

export function getLastResult(): AnalysisResult | null {
  return lastResult;
}

export function getLastTargets(): string[] {
  return lastTargets;
}

export function getLastTargetLabel(): string {
  return lastTargetLabel;
}

export function setPanel(p: import('./views/resultPanel').ResultPanel | undefined): void {
  panel = p;
}

export function getPanel(): import('./views/resultPanel').ResultPanel | undefined {
  return panel;
}

export function workspaceRoot(): string | undefined {
  const folder = vscode.workspace.workspaceFolders?.[0];
  return folder?.uri.fsPath;
}
