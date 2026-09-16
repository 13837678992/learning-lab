import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/home',
      name: 'Home',
      component: Home
    },
    {
      path: '/about',
      name: 'About',
      component: () => import('@/views/About.vue')
    },
    {
      path: '/settings',
      component: () => import('@/views/Settings.vue'),
      children: [
        {
          path: 'profile',
          component: () => import('@/views/Profile.vue')
        }
      ]
    }
  ]
})

export default router
