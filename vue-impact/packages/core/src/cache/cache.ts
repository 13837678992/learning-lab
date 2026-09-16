import * as fs from 'node:fs';
import * as path from 'node:path';
import { canonicalPath } from '../resolver/resolver';
import type { ParsedFile } from '../types';

interface CacheData {
  version: number;
  files: Record<string, ParsedFile>;
  meta: Record<string, unknown>;
}

const CACHE_VERSION = 3;

/**
 * 文件解析缓存：.node-impact-cache/impact-cache.json
 * 以 mtimeMs + size 校验有效性；文件未变化不重新解析。
 */
export class CacheStore {
  private file: string;
  private data: CacheData = { version: CACHE_VERSION, files: {}, meta: {} };
  private dirty = false;

  constructor(cacheDir: string) {
    this.file = path.join(cacheDir, 'impact-cache.json');
    try {
      const raw = fs.readFileSync(this.file, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === CACHE_VERSION && parsed.files && typeof parsed.files === 'object') {
        this.data = { version: CACHE_VERSION, files: parsed.files, meta: parsed.meta ?? {} };
      }
    } catch {
      /* 首次运行或缓存损坏，重新开始 */
    }
  }

  getParsed(file: string, mtimeMs: number, size: number): ParsedFile | null {
    const key = canonicalPath(file);
    const entry = this.data.files[key];
    if (!entry) return null;
    if (entry.mtimeMs !== mtimeMs || entry.size !== size) return null;
    return entry;
  }

  setParsed(parsed: ParsedFile): void {
    this.data.files[canonicalPath(parsed.file)] = parsed;
    this.dirty = true;
  }

  getMeta<T>(key: string): T | undefined {
    return this.data.meta[key] as T | undefined;
  }

  setMeta(key: string, value: unknown): void {
    this.data.meta[key] = value;
    this.dirty = true;
  }

  save(): void {
    if (!this.dirty) return;
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const tmp = this.file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(this.data));
      fs.renameSync(tmp, this.file);
      this.dirty = false;
    } catch {
      /* 缓存写入失败不影响分析 */
    }
  }

  clear(): void {
    this.data = { version: CACHE_VERSION, files: {}, meta: {} };
    this.dirty = true;
    this.save();
  }
}

/** 删除项目缓存目录（递归，Windows 兼容，使用 Node API） */
export function clearCacheDir(projectRoot: string, cacheDirName = '.node-impact-cache'): void {
  const dir = path.join(projectRoot, cacheDirName);
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}
