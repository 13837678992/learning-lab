import Vue from 'vue';
import VueRouter from 'vue-router';
import ReportOverview from '../views/ReportOverview.vue';
import ReportDetail from '../views/ReportDetail.vue';
import { MICRO_APPS, SUBAPPS } from '@fmac/constants';

Vue.use(VueRouter);

const routes = [
  { path: '/', name: 'report-overview', component: ReportOverview, meta: { title: '报表总览' } },
  {
    path: '/detail/:id',
    name: 'report-detail',
    component: ReportDetail,
    meta: { title: '报表详情' },
  },
];

/**
 * 创建子应用 vue-router。
 * qiankun 下 base 取激活路径 /micro/report；standalone 下为 /。
 */
export function createAppRouter(powered) {
  return new VueRouter({
    mode: 'history',
    base: powered ? SUBAPPS[MICRO_APPS.REPORT].activeRule : '/',
    routes,
  });
}
