/**
 * 基座路由。
 * - /login 独立页（公开）。
 * - / 由 Layout 承载，children 为基座自有页面与子应用占位路由。
 * - 子应用路由（meta.micro）：容器 #subapp-viewport 常驻于 Layout；
 *   此处仅需匹配 /app-demo 及其子路径，避免命中通配 * 而回跳。
 *   子路径通过嵌套 * 通配吸收，保持父级匹配稳定。
 */
const EmptyMicroView = { name: 'MicroView', render: (h) => h() };

export default [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/',
    component: () => import('@/layout/Layout.vue'),
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'home',
        component: () => import('@/views/Home.vue'),
        meta: { title: '首页' },
      },
      {
        path: 'app-demo',
        name: 'app-demo',
        component: EmptyMicroView,
        meta: { title: '示例子应用', micro: true },
        children: [{ path: '*', component: EmptyMicroView }],
      },
    ],
  },
  { path: '*', redirect: '/home' },
];
