/**
 * @fmac/auth —— 菜单解析（纯函数，框架无关）。
 *
 * 登录后权限菜单属鉴权域：把后端「嵌套、snake_case、Children 大写」的原始菜单，
 * 递归归一为统一结构，并派生「主应用菜单 / 子应用路由 / tab 数据」。
 *
 * 统一节点结构：{ id, title, url, appCode, icon, children }
 */
import { toArray, isNil } from '@fmac/shared';

/** 归一单个菜单节点（递归）。至少需要 id 或 url。 */
function normalizeNode(node) {
  if (isNil(node) || (isNil(node.id) && isNil(node.url))) return null;
  const rawChildren = node.Children || node.children || [];
  return {
    id: !isNil(node.id) ? String(node.id) : node.url,
    title: node.title || '',
    url: node.url || '',
    appCode: node.app_code || node.appCode || '',
    icon: node.icon || '',
    children: toArray(rawChildren).map(normalizeNode).filter(Boolean),
  };
}

/** 解析原始菜单为统一树（用作主应用菜单，供 Layout 渲染）。 */
export function parseMenu(rawList) {
  return toArray(rawList).map(normalizeNode).filter(Boolean);
}

/** 深度遍历，返回所有节点的扁平数组。 */
export function flattenMenu(tree) {
  const out = [];
  const walk = (nodes) =>
    toArray(nodes).forEach((n) => {
      out.push(n);
      if (n.children && n.children.length) walk(n.children);
    });
  walk(tree);
  return out;
}

/**
 * 派生子应用路由：取有 url 的叶子节点（无子节点或末级），
 * 生成 { appCode, path, id, title } —— 供主应用按 appCode 关联子应用。
 */
export function menuToRoutes(tree) {
  return flattenMenu(tree)
    .filter((n) => n.url && (!n.children || n.children.length === 0))
    .map((n) => ({ appCode: n.appCode, path: n.url, id: n.id, title: n.title }));
}

/** 由菜单节点生成一条 tab 数据（进入页面时写入 @fmac/tab）。 */
export function menuToTab(node) {
  if (isNil(node)) return null;
  const key = node.url || node.id;
  if (isNil(key)) return null;
  return { key, title: node.title || String(key), path: node.url || String(key) };
}
