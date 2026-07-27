import Vue from 'vue';
import VueRouter from 'vue-router';
import { routes } from './routes';
import { beforeEach, afterEach } from './guards';

Vue.use(VueRouter);

const router = new VueRouter({
  mode: 'history',
  routes
});

beforeEach(router);
afterEach(router);

export default router;
