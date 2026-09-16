import * as fs from 'node:fs';
import * as path from 'node:path';

export interface ScannedFile {
  file: string;
  mtimeMs: number;
  size: number;
}

export interface ScanOptions {
  exclude?: string[];
  cacheDir?: string;
  maxFiles?: number;
}

export const DEFAULT_EXCLUDES = [
  'node_modules',
  'dist',
  'coverage',
  '.git',
  '.hg',
  '.svn',
  'bower_components',
  '.DS_Store',
];

const SOURCE_EXTS = new Set(['.vue', '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json']);

/** 扫描项目源码文件，排除 node_modules / dist / coverage / .git 及 .gitignore 命中的目录 */
export function scanProject(root: string, opts: ScanOptions = {}): ScannedFile[] {
  const excludes = new Set([...(opts.exclude ?? []), ...DEFAULT_EXCLUDES, opts.cacheDir ?? '.node-impact-cache']);
  const gitignorePatterns = loadGitignore(root);
  const files: ScannedFile[] = [];
  const maxFiles = opts.maxFiles ?? 20000;

  const walk = (dir: string) => {
    if (files.length >= maxFiles) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (files.length >= maxFiles) return;
      const full = path.join(dir, entry.name);
      const rel = path.relative(root, full).split(path.sep).join('/');
      if (entry.isDirectory()) {
        if (excludes.has(entry.name)) continue;
        if (isIgnored(rel + '/', gitignorePatterns)) continue;
        if (entry.isSymbolicLink()) continue;
        walk(full);
      } else if (entry.isFile()) {
        if (!SOURCE_EXTS.has(path.extname(entry.name).toLowerCase())) continue;
        if (isIgnored(rel, gitignorePatterns)) continue;
        try {
          const st = fs.statSync(full);
          files.push({ file: path.resolve(full), mtimeMs: st.mtimeMs, size: st.size });
        } catch {
          /* 文件被删除等情况，跳过 */
        }
      }
    }
  };

  walk(root);
  files.sort((a, b) => a.file.localeCompare(b.file));
  return files;
}

export function loadGitignore(root: string): RegExp[] {
  const patterns: RegExp[] = [];
  const file = path.join(root, '.gitignore');
  let content: string;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    return patterns;
  }
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    patterns.push(gitignoreToRegex(trimmed));
  }
  return patterns;
}

/** 简单 .gitignore 模式转正则：支持 name、name/、*.ext、/name、name 目录、任意层级 name */
function gitignoreToRegex(pattern: string): RegExp {
  let p = pattern;
  const anchored = p.startsWith('/');
  if (anchored) p = p.slice(1);
  let esc = p
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*\//g, '(?:.*/)?')
    .replace(/\*/g, '[^/]*')
    .replace(/\/$/, '(?:/.*)?');
  if (pattern.endsWith('/')) {
    esc = esc.replace(/\(\?:\/\.\*\)\?$/, '(?:/.*)?');
  }
  if (anchored) return new RegExp('^' + esc);
  return new RegExp('(?:^|/)' + esc);
}

function isIgnored(relPath: string, patterns: RegExp[]): boolean {
  for (const re of patterns) {
    if (re.test(relPath)) return true;
  }
  return false;
}
