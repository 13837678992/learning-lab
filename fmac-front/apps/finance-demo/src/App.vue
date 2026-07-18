<template>
  <div class="finance-app">
    <nav class="finance-nav">
      <span class="brand">💰 财务管理系统</span>
      <a
        v-for="m in menu"
        :key="m.path"
        :class="['nav-item', { active: isActive(m.path) }]"
        @click="go(m)"
        >{{ m.title }}</a
      >
      <button class="fbtn ghost cross" @click="toUser">跳转用户中心 →</button>
    </nav>
    <div class="finance-body">
      <router-view />
    </div>
  </div>
</template>

<script>
// 应用内导航用本地 router；跨应用跳转用 sharedRouter（均为 @fmac/core 的 router SDK）。
import { router, getSharedRouter, openTab } from './platform.js';

export default {
  name: 'FinanceApp',
  data() {
    return {
      menu: [
        { path: '/', title: '首页' },
        { path: '/account', title: '账户管理' },
        { path: '/transaction', title: '交易流水' },
        { path: '/report', title: '报表中心' },
      ],
    };
  },
  methods: {
    isActive(path) {
      return this.$route.path === path;
    },
    go(item) {
      router.push(item.path); // 应用内导航
      if (item.path !== '/') openTab(item.path, item.title);
    },
    toUser() {
      // 跨应用跳转：必须走 router SDK，禁止 window.location / history API。
      getSharedRouter().push('/micro/user');
    },
  },
};
</script>

<style scoped>
.finance-nav {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 16px;
  background: #f5f3ff;
  border-bottom: 2px solid #7c3aed;
}
.brand {
  font-weight: 700;
  margin-right: 16px;
  color: #4c1d95;
}
.nav-item {
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #5b21b6;
}
.nav-item.active {
  background: #7c3aed;
  color: #fff;
}
.cross {
  margin-left: auto;
}
.finance-body {
  padding: 16px;
}
</style>
