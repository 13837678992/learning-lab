import Vue from 'vue';
import VueRouter from 'vue-router';
import OrderList from '../views/OrderList.vue';
import OrderDetail from '../views/OrderDetail.vue';
import { MICRO_APPS, SUBAPPS } from '@fmac/constants';

Vue.use(VueRouter);

const routes = [
  { path: '/', name: 'order-list', component: OrderList, meta: { title: '订单列表' } },
  {
    path: '/detail/:id',
    name: 'order-detail',
    component: OrderDetail,
    meta: { title: '订单详情' },
  },
];

/**
 * 创建子应用 vue-router。
 * qiankun 下 base 取激活路径 /micro/order；standalone 下为 /。
 */
export function createAppRouter(powered) {
  return new VueRouter({
    mode: 'history',
    base: powered ? SUBAPPS[MICRO_APPS.ORDER].activeRule : '/',
    routes,
  });
}
