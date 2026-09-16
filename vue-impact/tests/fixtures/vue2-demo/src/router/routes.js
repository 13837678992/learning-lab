import AppLayout from '@/layout/AppLayout.vue'
import Order from '@/views/Order.vue'

const routes = [
  {
    path: '/user',
    name: 'User',
    component: () => import('@/views/User.vue')
  },
  {
    path: '/user/list',
    name: 'UserList',
    component: () => import('@/views/UserList.vue')
  },
  {
    path: '/order',
    name: 'Order',
    component: Order
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue')
  },
  {
    path: '/system',
    component: AppLayout,
    children: [
      {
        path: 'user',
        name: 'SystemUser',
        component: () => import('@/views/SystemUser.vue')
      },
      {
        path: 'role',
        name: 'SystemRole',
        component: () => import('@/views/SystemRole.vue')
      }
    ]
  }
]

export default routes
