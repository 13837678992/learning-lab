import Vue from 'vue'
import Router from 'vue-router'
import homeRoutes from './modules/home'
import reportRoutes from './modules/report'

Vue.use(Router)

const extraRoutes = [
  {
    path: 'about',
    meta: {
      title: '关于',
      component: () => import('@/views/About.vue')
    }
  }
]

const routes = [
  ...homeRoutes,
  ...reportRoutes,
  ...extraRoutes
]

const router = new Router({
  routes
})

export default router
