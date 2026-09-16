import Vue from 'vue'
import Router from 'vue-router'
import routes from './routes'

Vue.use(Router)

export function createAppRouter() {
  const router = new Router({
    mode: 'history',
    routes
  })
  return router
}

const router = createAppRouter()

export default router
