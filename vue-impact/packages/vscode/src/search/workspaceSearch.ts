import * as vscode from 'vscode';

export interface SearchHit {
  file: string;
  line: number;
  text: string;
}

const SEARCH_EXTS = new Set(['.vue', '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json']);

/**
 * 工作区搜索：基于 VS Code 公共 API（findFiles + workspace.fs.readFile），
 * 不依赖任何平台命令（grep 等），Windows 兼容。
 */
export async function workspaceSearch(
  query: string,
  excludePatterns: string[],
  maxFiles: number,
  progress: vscode.Progress<{ message?: string; increment?: number }>,
): Promise<SearchHit[]> {
  const exclude = `{${['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/.git/**', ...excludePatterns.map((p) => `**/${p}/**`)].join(',')}}`;
  const uris = await vscode.workspace.findFiles('**/*', exclude, maxFiles);

  const hits: SearchHit[] = [];
  const needle = query.toLowerCase();
  let done = 0;

  for (const uri of uris) {
    done++;
    if (done % 200 === 0) {
      progress.report({ message: `搜索中 ${done}/${uris.length}`, increment: (200 / uris.length) * 100 });
    }
    const ext = uri.path.split('.').pop()?.toLowerCase() ?? '';
    if (!SEARCH_EXTS.has('.' + ext)) continue;
    if (hits.length >= 2000) break;

    try {
      const bytes = await vscode.workspace.fs.readFile(uri);
      const content = Buffer.from(bytes).toString('utf8');
      if (!content.toLowerCase().includes(needle)) continue;
      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length && hits.length < 2000; i++) {
        if (lines[i].toLowerCase().includes(needle)) {
          hits.push({ file: uri.fsPath, line: i + 1, text: lines[i].trim().slice(0, 200) });
        }
      }
    } catch {
      /* 单个文件读取失败跳过 */
    }
  }
  return hits;
}
