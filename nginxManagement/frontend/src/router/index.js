
export default [
  {
    path: '/',
    redirect: '/proxy'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/dashboard/index.vue')
  },
  {
    path: '/proxy',
    name: 'Proxy',
    component: () => import('../views/proxy/index.vue')
  },
  {
    path: '/command',
    name: 'Command',
    component: () => import('../views/command/index.vue')
  }
]