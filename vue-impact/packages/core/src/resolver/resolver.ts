import * as fs from 'node:fs';
import * as path from 'node:path';
import { DEFAULT_EXTENSIONS } from './alias';

export type SpecifierKind = 'relative' | 'alias' | 'absolute' | 'external';

export interface ResolverOptions {
  projectRoot: string;
  aliases?: Map<string, string>;
  extensions?: string[];
}

/**
 * 模块解析器：相对路径 / Webpack alias / 绝对路径 -> 磁盘绝对路径。
 * 内部全部使用 path.resolve，不手工拼接分隔符，Windows 兼容。
 */
export class ModuleResolver {
  private root: string;
  private aliases: Map<string, string>;
  private extensions: string[];
  private sortedAliasKeys: string[];
  private win: boolean;

  constructor(opts: ResolverOptions) {
    this.root = path.resolve(opts.projectRoot);
    this.aliases = opts.aliases ?? new Map();
    this.extensions = opts.extensions ?? DEFAULT_EXTENSIONS;
    this.sortedAliasKeys = [...this.aliases.keys()].sort((a, b) => b.length - a.length);
    this.win = process.platform === 'win32';
  }

  classify(specifier: string): SpecifierKind {
    if (specifier.startsWith('.')) return 'relative';
    if (path.isAbsolute(specifier) || specifier.startsWith('/') || /^[A-Za-z]:[\\/]/.test(specifier)) return 'absolute';
    if (this.matchAlias(specifier)) return 'alias';
    return 'external';
  }

  private matchAlias(specifier: string): { key: string; value: string } | null {
    for (const key of this.sortedAliasKeys) {
      if (specifier === key || specifier.startsWith(key + '/') || specifier.startsWith(key + '\\')) {
        return { key, value: this.aliases.get(key)! };
      }
    }
    return null;
  }

  /** 解析为绝对文件路径；external（node_modules 包）或无法解析返回 null */
  resolve(specifier: string, fromFile: string): string | null {
    const kind = this.classify(specifier);
    let candidate: string;
    if (kind === 'relative') {
      candidate = path.resolve(path.dirname(fromFile), specifier);
    } else if (kind === 'absolute') {
      candidate = path.resolve(this.root, specifier.replace(/^[A-Za-z]:[\\/]/, '').replace(/^[\\/]+/, ''));
    } else if (kind === 'alias') {
      const m = this.matchAlias(specifier)!;
      const rest = specifier.slice(m.key.length).replace(/^[\\/]+/, '');
      candidate = path.resolve(m.value, rest);
    } else {
      return null;
    }
    return this.resolveAsFile(candidate) ?? this.resolveAsDirectory(candidate);
  }

  private resolveAsFile(candidate: string): string | null {
    if (this.exists(candidate) && fs.statSync(candidate).isFile()) {
      return path.resolve(candidate);
    }
    if (path.extname(candidate)) return null;
    for (const ext of this.extensions) {
      const withExt = candidate + ext;
      if (this.exists(withExt) && fs.statSync(withExt).isFile()) return path.resolve(withExt);
    }
    return null;
  }

  private resolveAsDirectory(candidate: string): string | null {
    if (!this.exists(candidate) || !fs.statSync(candidate).isDirectory()) return null;
    for (const ext of this.extensions) {
      const indexFile = path.join(candidate, 'index' + ext);
      if (this.exists(indexFile) && fs.statSync(indexFile).isFile()) return path.resolve(indexFile);
    }
    const pkgFile = path.join(candidate, 'package.json');
    if (this.exists(pkgFile)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
        if (typeof pkg.main === 'string') {
          const main = this.resolveAsFile(path.resolve(candidate, pkg.main));
          if (main) return main;
        }
      } catch {
        /* ignore */
      }
    }
    return null;
  }

  /** Windows 下文件名大小写不敏感 */
  private exists(p: string): boolean {
    try {
      if (!this.win) return fs.existsSync(p);
      const dir = path.dirname(p);
      const base = path.basename(p).toLowerCase();
      const entries = fs.readdirSync(dir);
      return entries.some((e) => e.toLowerCase() === base);
    } catch {
      return false;
    }
  }

  get aliasesMap(): Map<string, string> {
    return this.aliases;
  }
}

/** 路径统一为小写（仅 Windows 生效），用于 Map 键一致性 */
export function canonicalPath(p: string): string {
  const resolved = path.resolve(p);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

export function toRelativePath(root: string, file: string): string {
  const rel = path.relative(root, file);
  return rel.split(path.sep).join('/');
}
