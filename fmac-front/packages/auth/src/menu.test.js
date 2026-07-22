import { describe, it, expect } from 'vitest';
import { parseMenu, flattenMenu, menuToRoutes, menuToTab } from './menu.js';

const RAW = [
  {
    app_code: 'front-pic',
    id: 'frontPic',
    title: '产品中台',
    url: '/frontPic/',
    Children: [
      {
        app_code: 'front-pic',
        id: 'KypCabinView',
        title: '驾驶舱',
        url: '/frontKyp/KypCabinView/',
        Children: [
          {
            app_code: 'front-pic',
            id: 'holdBordHome',
            title: '保有量看板主页',
            url: '/frontKyp/KypCabinView/holdBordHome/',
            Children: [],
          },
        ],
      },
    ],
  },
];

describe('menu 解析', () => {
  it('parseMenu 归一 snake_case / Children，保留层级', () => {
    const tree = parseMenu(RAW);
    expect(tree).toHaveLength(1);
    expect(tree[0]).toMatchObject({ id: 'frontPic', title: '产品中台', appCode: 'front-pic' });
    expect(tree[0].children[0].id).toBe('KypCabinView');
    expect(tree[0].children[0].children[0].id).toBe('holdBordHome');
  });

  it('flattenMenu 深度展开全部节点', () => {
    expect(flattenMenu(parseMenu(RAW))).toHaveLength(3);
  });

  it('menuToRoutes 仅取有 url 的叶子并带 appCode', () => {
    const routes = menuToRoutes(parseMenu(RAW));
    expect(routes).toEqual([
      {
        appCode: 'front-pic',
        path: '/frontKyp/KypCabinView/holdBordHome/',
        id: 'holdBordHome',
        title: '保有量看板主页',
      },
    ]);
  });

  it('menuToTab 由节点生成 tab 数据', () => {
    const leaf = flattenMenu(parseMenu(RAW)).find((n) => n.id === 'holdBordHome');
    expect(menuToTab(leaf)).toEqual({
      key: '/frontKyp/KypCabinView/holdBordHome/',
      title: '保有量看板主页',
      path: '/frontKyp/KypCabinView/holdBordHome/',
    });
  });

  it('空/非法输入安全返回', () => {
    expect(parseMenu(null)).toEqual([]);
    expect(menuToTab(null)).toBeNull();
  });
});
