import request from '@/utils/request';

/**
 * 获取菜单（含子应用注册信息）。
 * 返回结构约定见 docs/api.md；带 microApp 字段的菜单项即为 qiankun 子应用。
 */
export function getMenu() {
  return request.get('/menu');
}
