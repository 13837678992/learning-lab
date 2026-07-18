import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  { path: '/', meta: { title: '首页' }, component: () => import('@/views/home/index.vue') },
  { path: '/login', title: '登录', component: () => import('../pages/login.vue') },
  { path: '/btn', title: '按钮', component: () => import('@comp/Button.vue') },
];

export default createRouter({ history: createWebHistory(), routes });
