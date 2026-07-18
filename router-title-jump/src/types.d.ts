/**
 * 全局共享类型定义（供各模块用 JSDoc 引用）：
 *   /** @typedef {import('../types').RawRoute} RawRoute *\/
 *
 * 只放「领域模型」类型；第三方 AST 节点一律用 any（babel 节点联合类型庞大，
 * 强行 narrow 收益低、噪音大）。领域模型保持严格类型。
 */

/** 解析阶段产出的原始路由记录（未做别名解析、未建索引） */
export interface RawRoute {
  /** route：普通路由；glob：import.meta.glob / require.context 动态路由 */
  kind: 'route' | 'glob';
  /** 在路由树中的层级，0 为顶层 */
  depth: number;
  title?: string;
  /** 路由 path */
  routePath?: string;
  /** 组件的原始 import 说明符，如 '@/views/a.vue' */
  componentRequest?: string;
  redirect?: string;
  /** glob 记录来源 */
  source?: 'import.meta.glob' | 'require.context';
  /** glob 记录的模式或目录 */
  glob?: string;
}

/** 单文件解析过程中的上下文 */
export interface ParseContext {
  filename: string;
  /** 模块顶层变量绑定：name -> init 节点 */
  bindings: Map<string, any>;
  /** import 绑定：localName -> 模块说明符 */
  importMap: Map<string, string>;
  /** 收集到的路由数组容器节点（ArrayExpression） */
  containers: any[];
  /** 收集到的 glob 记录 */
  globs: RawRoute[];
}

/** 别名解析规则：前缀 -> 绝对目标目录 */
export interface AliasRule {
  /** 别名前缀（已去除尾部 `/*` 或 `/`），如 '@'、'@components'、'~' */
  prefix: string;
  /** 目标绝对目录 */
  targetDir: string;
  /** 规则来源（配置文件路径或 'fallback'），用于调试与优先级 */
  source: string;
}

/** 拼音检索数据（建索引时生成一次） */
export interface PinyinData {
  /** 全拼连写，如 baoxianchanpin */
  fullPinyin: string;
  /** 每音节首字母，如 bxcp */
  initials: string;
  /** 逐音节数组，如 ['bao','xian','chan','pin'] */
  syllables: string[];
}

/** 索引里的一条完整路由记录（供 QuickPick 只读消费） */
export interface RouteRecord {
  /** 稳定唯一 id */
  id: string;
  title: string;
  routePath: string;
  /** 组件原始 import 说明符 */
  component: string;
  absoluteFile: string;
  relativeFile: string;
  /** 定义该路由的文件（用于增量更新与去重） */
  routerFile: string;
  /** 组件文件名（去扩展名） */
  fileName: string;
  fullPinyin: string;
  initials: string;
  /** 倒排索引 token 集合（全小写） */
  keywords: string[];
  /** 组件文件 mtime（增量缓存校验） */
  mtime: number;
}
