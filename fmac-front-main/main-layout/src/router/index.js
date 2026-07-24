import Vue from 'vue';
import VueRouter from 'vue-router';
import routes from './routes';
import { registerGuards } from './guards';

Vue.use(VueRouter);

const router = new VueRouter({
  mode: 'history',
  base: process.env.PUBLIC_PATH || '/',
  routes,
});

registerGuards(router);

export default router;
