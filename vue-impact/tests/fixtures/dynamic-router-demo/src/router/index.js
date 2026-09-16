import Vue from 'vue'
import Router from 'vue-router'
import { getRoutesFromServer } from '@/api/menu'

Vue.use(Router)

const router = new Router({
  routes: getRoutesFromServer()
})

router.addRoutes([
  {
    path: '/static',
    name: 'Static',
    component: () => import('@/views/Static.vue')
  }
])

export default router
