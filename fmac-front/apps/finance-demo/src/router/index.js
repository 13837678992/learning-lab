import Vue from 'vue';
import VueRouter from 'vue-router';
import Home from '../views/Home.vue';
import AccountList from '../views/account/AccountList.vue';
import TransactionList from '../views/transaction/TransactionList.vue';
import ReportCenter from '../views/report/ReportCenter.vue';
import { MICRO_APPS, SUBAPPS } from '@fmac/constants';

Vue.use(VueRouter);

const routes = [
  { path: '/', name: 'finance-home', component: Home, meta: { title: '首页' } },
  {
    path: '/account',
    name: 'finance-account',
    component: AccountList,
    meta: { title: '账户管理' },
  },
  {
    path: '/transaction',
    name: 'finance-transaction',
    component: TransactionList,
    meta: { title: '交易流水' },
  },
  { path: '/report', name: 'finance-report', component: ReportCenter, meta: { title: '报表中心' } },
];

/**
 * 创建子应用 vue-router。
 * qiankun 下 base 取激活路径 /finance；standalone 下为 /。
 */
export function createAppRouter(powered) {
  return new VueRouter({
    mode: 'history',
    base: powered ? SUBAPPS[MICRO_APPS.FINANCE].activeRule : '/',
    routes,
  });
}
