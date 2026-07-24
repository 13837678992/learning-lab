import Vue from 'vue';
import VueRouter from 'vue-router';

Vue.use(VueRouter);

/**
 * 创建子应用路由。
 * - qiankun 环境：base 与主应用 activeRule 对齐（/app-demo）。
 * - 独立运行：base 为 /。
 * 每次 mount 重建（unmount 置空），指向当前实例。
 */
export function createRouter(powered) {
  return new VueRouter({
    mode: 'history',
    base: powered ? '/app-demo' : '/',
    routes: [
      { path: '/', redirect: '/home' },
      {
        path: '/home',
        name: 'home',
        component: () => import('@/views/Home.vue'),
        meta: { title: '子应用首页' },
      },
      {
        path: '/about',
        name: 'about',
        component: () => import('@/views/About.vue'),
        meta: { title: '关于' },
      },
    ],
  });
}
