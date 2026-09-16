import type { AnalysisResult } from '../types';
import { relativeTo } from '../router/discovery';

const SEP = '────────────────────────';

/** 纯文本报告（CLI 默认输出 / 测试范围） */
export function formatText(result: AnalysisResult): string {
  const rel = (f: string) => relativeTo(result.projectRoot, f);
  const lines: string[] = [];

  lines.push('Vue Impact');
  lines.push('');
  lines.push('目标文件');
  lines.push(SEP);
  for (const t of result.targetFiles) lines.push(rel(t));

  lines.push('');
  lines.push('依赖分析');
  lines.push(SEP);
  lines.push(`直接引用：${result.stats.directRefs}`);
  lines.push(`间接引用：${result.stats.indirectRefs}`);
  lines.push(`影响组件：${result.stats.impactedComponents}`);

  lines.push('');
  lines.push('影响路由');
  lines.push(SEP);
  if (result.routes.length === 0) {
    lines.push('（未发现受影响的路由页面）');
  }
  for (const r of result.routes) {
    lines.push('');
    lines.push(r.path);
    if (r.component) lines.push(rel(r.component));
    if (r.name) lines.push(`name: ${r.name}`);
    const chain = result.chains.find((c) => c.routePath === r.path);
    if (chain) {
      lines.push('');
      lines.push('影响链：');
      lines.push(chain.chain.map(rel).join('\n ↓ '));
    }
  }

  if (result.warnings.length > 0) {
    lines.push('');
    lines.push('⚠️ 分析警告');
    lines.push(SEP);
    for (const w of result.warnings) {
      lines.push(`${w.file}${w.line ? ':' + w.line : ''}: ${w.message}`);
    }
  }

  lines.push('');
  lines.push(SEP);
  lines.push(`共 ${result.routes.length} 个路由页面`);

  return lines.join('\n');
}

/** 测试范围纯文本（复制用） */
export function formatTestScope(result: AnalysisResult): string {
  return result.routes.map((r) => r.path).join('\n');
}

/** Markdown 报告 */
export function formatMarkdown(result: AnalysisResult): string {
  const rel = (f: string) => relativeTo(result.projectRoot, f);
  const lines: string[] = [];
  lines.push('## Vue Impact Analysis');
  lines.push('');
  lines.push('目标文件：');
  lines.push('');
  for (const t of result.targetFiles) lines.push(`- \`${rel(t)}\``);
  lines.push('');
  lines.push('影响页面：');
  lines.push('');
  if (result.routes.length === 0) {
    lines.push('- （无）');
  }
  for (const r of result.routes) {
    const comp = r.component ? `（\`${rel(r.component)}\`）` : '';
    lines.push(`- \`${r.path}\` ${comp}`);
  }
  lines.push('');
  lines.push(`共 ${result.routes.length} 个页面。`);
  if (result.warnings.length > 0) {
    lines.push('');
    lines.push('### 警告');
    lines.push('');
    for (const w of result.warnings) {
      lines.push(`- \`${rel(w.file)}${w.line ? ':' + w.line : ''}\` ${w.message}`);
    }
  }
  return lines.join('\n');
}

export interface JsonRoute {
  path: string;
  component: string;
  name?: string;
  dynamic?: boolean;
}

/** JSON 报告 */
export function formatJSON(result: AnalysisResult): string {
  const rel = (f: string) => relativeTo(result.projectRoot, f);
  const routes: JsonRoute[] = result.routes.map((r) => {
    const entry: JsonRoute = { path: r.path, component: rel(r.component) };
    if (r.name) entry.name = r.name;
    if (r.dynamic) entry.dynamic = true;
    return entry;
  });
  const payload: Record<string, unknown> = {
    targetFiles: result.targetFiles.map(rel),
    routes,
    count: routes.length,
  };
  if (result.warnings.length > 0) {
    payload.warnings = result.warnings.map((w) => ({
      file: rel(w.file),
      line: w.line,
      type: w.type,
      message: w.message,
    }));
  }
  payload.stats = result.stats;
  return JSON.stringify(payload, null, 2);
}
