/**
 * 财务/平台菜单模拟接口。
 * 真实项目统一走 platform.request.get('/api/menu')（禁止 axios/fetch）；此处模拟登录后菜单返回。
 * 数据结构与后端一致：嵌套 + snake_case + Children 大写；由 @fmac/core 的 parseMenu 归一。
 */
const MOCK_MENU = [
  {
    app_code: 'front-pic',
    id: 'frontPic',
    title: '产品中台',
    url: '/frontPic/',
    Children: [
      {
        app_code: 'front-pic',
        icon: 'jiashicang',
        id: 'KypCabinView',
        kind_code: 'fornt-pic',
        parent_id: 'frontPic',
        title: '驾驶舱',
        url: '/frontKyp/KypCabinView/',
        Children: [
          {
            app_code: 'front-pic',
            id: 'cabinHoldBord',
            parent_id: 'KypCabinView',
            title: '保有量看板',
            url: '',
            Children: [
              {
                app_code: 'front-pic',
                Children: [],
                id: 'holdBordHome',
                parent_id: 'cabinHoldBord',
                title: '保有量看板主页',
                url: '/frontKyp/KypCabinView/cabinHoldBord/holdBordHome/',
              },
              {
                app_code: 'front-pic',
                Children: [],
                id: 'holdBordDetail',
                parent_id: 'cabinHoldBord',
                title: '保有量明细',
                url: '/frontKyp/KypCabinView/cabinHoldBord/holdBordDetail/',
              },
            ],
          },
        ],
      },
    ],
  },
];

/** 模拟异步拉取菜单。 */
export function fetchMenu() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_MENU), 200);
  });
}
