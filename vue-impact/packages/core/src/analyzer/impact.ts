import type { ImpactChain, RouteEntry, RouterInfo } from '../types';
import { DependencyGraph } from '../graph/graph';
import { canonicalPath } from '../resolver/resolver';

export interface ImpactOutcome {
  routes: RouteEntry[];
  chains: ImpactChain[];
  directRefs: number;
  indirectRefs: number;
  impactedComponents: number;
  /** BFS 访问过的组件文件（.vue） */
  visitedComponents: string[];
}

/**
 * 反向影响分析：
 * 从目标文件出发，沿 importers 反向 BFS，命中路由组件 / Layout 时记录路由。
 * visited 集合防循环依赖死循环；多目标自动合并去重。
 */
export function findImpact(
  graph: DependencyGraph,
  router: RouterInfo,
  targets: string[],
): ImpactOutcome {
  const routeSet = new Set<string>();
  const chains: ImpactChain[] = [];
  const visited = new Set<string>();
  const visitedComponents: string[] = [];

  for (const target of targets) {
    const t = canonicalPath(target);
    if (!graph.has(t) && !router.componentRoutes.has(t) && !router.layoutRoutes.has(t)) {
      // 目标文件没有依赖图记录且不是路由组件：仍然尝试（可能本身是路由组件但无 import 关系）
    }
    const queue: string[] = [t];
    const parents = new Map<string, string | null>();
    parents.set(t, null);
    visited.add(t);

    while (queue.length > 0) {
      const f = queue.shift()!;
      if (f.endsWith('.vue')) visitedComponents.push(f);

      const matched = new Set<string>();
      const cr = router.componentRoutes.get(f);
      if (cr) for (const p of cr) matched.add(p);
      const lr = router.layoutRoutes.get(f);
      if (lr) for (const p of lr) matched.add(p);

      for (const routePath of matched) {
        if (routeSet.has(routePath)) continue;
        routeSet.add(routePath);
        chains.push({
          routePath,
          chain: reconstructChain(parents, f, t),
          target,
        });
      }

      for (const importer of graph.importersOf(f)) {
        if (visited.has(importer)) continue;
        visited.add(importer);
        parents.set(importer, f);
        queue.push(importer);
      }
    }
  }

  const routes = [...routeSet]
    .map((p) => router.routeByPath.get(p))
    .filter((r): r is RouteEntry => !!r)
    .sort((a, b) => a.path.localeCompare(b.path));

  const directRefs = new Set<string>();
  for (const t of targets) {
    for (const imp of graph.importersOf(t)) directRefs.add(imp);
  }

  return {
    routes,
    chains,
    directRefs: directRefs.size,
    indirectRefs: Math.max(0, visited.size - directRefs.size - targets.length),
    impactedComponents: visitedComponents.length,
    visitedComponents,
  };
}

/** 从命中的路由组件文件回溯到目标文件，得到 路由 -> 组件 -> ... -> 目标 的链 */
function reconstructChain(
  parents: Map<string, string | null>,
  hitFile: string,
  target: string,
): string[] {
  const chain: string[] = [];
  let cur: string | null = hitFile;
  let guard = 0;
  while (cur && cur !== target && guard < 1000) {
    chain.push(cur);
    cur = parents.get(cur) ?? null;
    guard++;
  }
  chain.push(target);
  return chain;
}
