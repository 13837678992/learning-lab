export { analyze, clearProjectCache, findProjectRoot, detectVueVersion, isVueProject } from './analyzer/analyzer';
export { findImpact } from './analyzer/impact';
export { discoverRouter, joinRoutePaths } from './router/discovery';
export { DependencyGraph } from './graph/graph';
export { CacheStore } from './cache/cache';
export { ModuleResolver, canonicalPath, toRelativePath } from './resolver/resolver';
export { loadAliases } from './resolver/alias';
export { scanProject } from './scanner/scan';
export { parseFileContent } from './parser';
export { parseRouteObject } from './parser/script';
export { formatText, formatTestScope, formatMarkdown, formatJSON } from './reporter';
export * from './types';

export const version = '0.2.0';
