import Vue from 'vue';
import VueRouter from 'vue-router';
import UserList from '../views/UserList.vue';
import UserDetail from '../views/UserDetail.vue';
import { MICRO_APPS, SUBAPPS } from '@fmac/constants';

Vue.use(VueRouter);

const routes = [
  { path: '/', name: 'user-list', component: UserList, meta: { title: '用户列表' } },
  { path: '/detail/:id', name: 'user-detail', component: UserDetail, meta: { title: '用户详情' } },
];

/**
 * 创建子应用 vue-router。
 * qiankun 下 base 取激活路径 /micro/user，使子应用路由与主应用路径对齐；standalone 下为 /。
 */
export function createAppRouter(powered) {
  return new VueRouter({
    mode: 'history',
    base: powered ? SUBAPPS[MICRO_APPS.USER].activeRule : '/',
    routes,
  });
}
