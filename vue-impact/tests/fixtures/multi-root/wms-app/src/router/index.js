import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

const routes = [
  {
    path: '/wms/home',
    meta: {
      title: 'WMS 首页',
      component: () => import('@/views/Home.vue')
    }
  }
]

const router = new Router({ routes })

export default router
