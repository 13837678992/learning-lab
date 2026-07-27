import Layout from '@/layout/Layout.vue';
import Login from '@/views/Login.vue';
import Home from '@/views/Home.vue';

export const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: Layout,
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'Home',
        component: Home,
        meta: { requiresAuth: true, title: '首页' }
      }
    ]
  },
  {
    path: '/app-demo',
    component: Layout,
    children: [
      {
        path: '',
        name: 'AppDemo',
        meta: { requiresAuth: true, title: '示例应用' }
      }
    ]
  },
  {
    path: '*',
    redirect: '/home'
  }
];
