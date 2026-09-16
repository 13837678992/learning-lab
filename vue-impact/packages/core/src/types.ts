export type VueVersion = 2 | 3;

/** 一条 import / require / 动态 import / re-export 记录 */
export interface ImportInfo {
  kind: 'import' | 'require' | 'dynamic-import' | 'export-from';
  /** 原始说明符，如 '@/views/User.vue' */
  specifier: string;
  /** 绑定到本文件的局部名字（default import 记局部名；无绑定记空） */
  names: string[];
  isDynamic: boolean;
  line: number;
}

/** 路由配置中的 component 引用（原始形态） */
export type RouteComponentRef =
  | { type: 'identifier'; name: string }
  | { type: 'import'; specifier: string }
  | { type: 'inline'; text: string }
  | { type: 'missing' };

/** 原始路由配置（AST 提取后的纯数据形态，可缓存） */
export interface RawRoute {
  path?: string;
  name?: string;
  line?: number;
  component?: RouteComponentRef;
  children?: RawRoute[];
  /** 数组展开（...importedRoutes / children: routesVar）来源名 */
  spreadFrom?: string;
  spreadInline?: RawRoute[];
  spreadSpecifier?: string;
  spreadKind?: ImportKind;
  /** 展开的是无法静态解析的表达式 */
  spreadDynamic?: boolean;
  /** 路由对象变量引用（const x = {...}; routes: [x]） */
  routeRef?: string;
  routeRefInline?: RawRoute;
  routeRefSpecifier?: string;
  routeRefKind?: ImportKind;
  routeRefDynamic?: boolean;
}

/** routes 来源 */
export type RouteSource =
  | { type: 'array'; routes: RawRoute[] }
  | {
      type: 'identifier';
      name: string;
      inlineArray?: RawRoute[];
      importSpecifier?: string;
      importKind?: ImportKind;
    }
  | { type: 'call'; name: string }
  | { type: 'object'; route: RawRoute }
  | { type: 'unknown'; text?: string };

export type ImportKind = 'default' | 'named' | 'namespace';

/** 文件中发现的 Router 用法 */
export interface RouterUsage {
  kind: 'create' | 'addRoutes' | 'addRoute';
  /** 被调用的名字，如 Router / VueRouter / createRouter / initRouter */
  callee: string;
  line: number;
  /** create/addRoutes 的 routes 来源 */
  source?: RouteSource;
  /** addRoute 的单条路由 */
  route?: RawRoute;
}

/** 单个文件的解析结果（可缓存） */
export interface ParsedFile {
  file: string;
  imports: ImportInfo[];
  routerUsages: RouterUsage[];
  /** 局部名字 -> import 说明符（用于解析 component 变量 / 路由标识符） */
  bindings: Record<string, string>;
  /** 局部名字 -> 导入类型（default / named / namespace） */
  bindingKinds: Record<string, ImportKind>;
  exports: ExportInfo[];
  mtimeMs: number;
  size: number;
}

export interface ExportInfo {
  kind: 'default' | 'named' | 're-export' | 'module-exports';
  name?: string;
  localName?: string;
  specifier?: string;
  routeSource?: RouteSource;
}

/** 最终展开的路由条目（叶子页面） */
export interface RouteEntry {
  path: string;
  name?: string;
  /** 组件绝对路径（未知为空串） */
  component: string;
  componentSpecifier?: string;
  /** 祖先 Layout 组件文件 */
  layoutFiles: string[];
  /** 路由定义所在文件 */
  file: string;
  line?: number;
  /** 组件无法静态解析（动态 import 等） */
  dynamic?: boolean;
}

export interface AnalysisWarning {
  type:
    | 'dynamic-route'
    | 'dynamic-import'
    | 'parse-error'
    | 'unresolved-import'
    | 'framework-router'
    | 'no-vue-project';
  message: string;
  file: string;
  line?: number;
}

export interface RouterInfo {
  routerFiles: string[];
  routes: RouteEntry[];
  /** 组件文件 -> 命中该文件的叶子路由 path 集合 */
  componentRoutes: Map<string, Set<string>>;
  /** Layout 文件 -> 其下所有叶子路由 path 集合 */
  layoutRoutes: Map<string, Set<string>>;
  /** path -> RouteEntry */
  routeByPath: Map<string, RouteEntry>;
  warnings: AnalysisWarning[];
  frameworkRouter: boolean;
}

export interface ImpactChain {
  routePath: string;
  /** 从路由组件文件到目标文件的依赖链（含两端） */
  chain: string[];
  target: string;
}

export interface AnalysisStats {
  filesScanned: number;
  filesParsed: number;
  cacheHits: number;
  routesTotal: number;
  directRefs: number;
  indirectRefs: number;
  impactedComponents: number;
  elapsedMs: number;
}

export interface AnalysisResult {
  projectRoot: string;
  vueVersion: VueVersion | null;
  targetFiles: string[];
  routes: RouteEntry[];
  chains: ImpactChain[];
  warnings: AnalysisWarning[];
  stats: AnalysisStats;
}

export interface AnalyzeOptions {
  projectRoot?: string;
  useCache?: boolean;
  exclude?: string[];
  cacheDir?: string;
  maxFiles?: number;
}
