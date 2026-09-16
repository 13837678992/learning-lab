import { canonicalPath } from '../resolver/resolver';

/**
 * 模块依赖图：正向（file -> deps）与反向（dep -> importers），Map/Set 实现，防自环。
 */
export class DependencyGraph {
  private forward = new Map<string, Set<string>>();
  private reverse = new Map<string, Set<string>>();

  addDependency(fromFile: string, toFile: string): void {
    const from = canonicalPath(fromFile);
    const to = canonicalPath(toFile);
    if (from === to) return;
    if (!this.forward.has(from)) this.forward.set(from, new Set());
    this.forward.get(from)!.add(to);
    if (!this.reverse.has(to)) this.reverse.set(to, new Set());
    this.reverse.get(to)!.add(from);
  }

  /** 该文件直接依赖的文件 */
  dependenciesOf(file: string): string[] {
    return [...(this.forward.get(canonicalPath(file)) ?? [])];
  }

  /** 直接引用了该文件的文件（importer） */
  importersOf(file: string): string[] {
    return [...(this.reverse.get(canonicalPath(file)) ?? [])];
  }

  has(file: string): boolean {
    return this.forward.has(canonicalPath(file)) || this.reverse.has(canonicalPath(file));
  }

  files(): string[] {
    const set = new Set<string>();
    for (const f of this.forward.keys()) set.add(f);
    for (const f of this.reverse.keys()) set.add(f);
    return [...set];
  }

  edgeCount(): number {
    let n = 0;
    for (const s of this.forward.values()) n += s.size;
    return n;
  }
}
