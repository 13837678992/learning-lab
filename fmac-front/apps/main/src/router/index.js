import Vue from 'vue';
import VueRouter from 'vue-router';
import { routes } from './routes.js';

Vue.use(VueRouter);

/**
 * 主应用 vue-router 实例。
 *
 * 注意：这是基座内部的路由实现细节，仅在 platform.js 中被适配进 @fmac/router。
 * 业务代码禁止直接使用 this.$router / 本实例，统一通过 @fmac/core 的 router 跳转（见 CLAUDE.md 第十节）。
 */
const router = new VueRouter({
  mode: 'history',
  routes,
});

export default router;
