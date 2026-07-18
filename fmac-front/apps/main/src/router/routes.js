import Layout from '../layout/Layout.vue';
import Home from '../views/Home.vue';
import About from '../views/About.vue';
import MicroContainer from '../views/MicroContainer.vue';

/**
 * 主应用路由表。
 * - 主应用自身页面作为 Layout 的子路由，渲染在 Layout 的 <router-view /> 中；
 * - `micro/*` 为子应用激活路径占位：命中时保持 Layout 挂载，由 qiankun 接管
 *   Layout 内的 #subapp-viewport 容器进行渲染。
 */
export const routes = [
  {
    path: '/',
    component: Layout,
    redirect: '/home',
    children: [
      { path: 'home', name: 'home', component: Home, meta: { title: '首页' } },
      { path: 'about', name: 'about', component: About, meta: { title: '关于' } },
      { path: 'micro/*', name: 'micro', component: MicroContainer, meta: { title: '子应用' } },
      { path: 'finance', name: 'finance', component: MicroContainer, meta: { title: '财务系统' } },
      {
        path: 'finance/*',
        name: 'finance-sub',
        component: MicroContainer,
        meta: { title: '财务系统' },
      },
    ],
  },
];
