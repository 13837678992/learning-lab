import platform, { parseMenu, menuToRoutes } from '@fmac/core';
import { STORE_KEYS } from '@fmac/constants';
import { fetchMenu } from '../api/menu.js';

/**
 * 主应用菜单编排：登录后拉取 → 解析 → 写入共享 store（供 Layout 渲染、子应用读取）。
 * 解析纯逻辑在 @fmac/auth（经 @fmac/core 暴露）；本文件只做「拉取 + 存储」编排。
 */

/** 登录后加载菜单：返回解析后的统一菜单树。 */
export async function loadMenu() {
  const raw = await fetchMenu();
  const menu = parseMenu(raw);
  platform.store.set(STORE_KEYS.MENU, menu);
  platform.store.set(STORE_KEYS.MENU_ROUTES, menuToRoutes(menu));
  return menu;
}

/** 读取已解析菜单树（主应用菜单）。 */
export function getMenu() {
  return platform.store.get(STORE_KEYS.MENU) || [];
}

/** 读取派生的子应用路由清单。 */
export function getMenuRoutes() {
  return platform.store.get(STORE_KEYS.MENU_ROUTES) || [];
}
