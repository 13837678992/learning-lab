<template>
  <aside class="sidebar">
    <ul class="menu">
      <li
        v-for="item in menu"
        :key="item.path"
        :class="['menu-item', { active: isActive(item.path) }]"
        @click="go(item)"
      >
        {{ item.title }}
      </li>
    </ul>
  </aside>
</template>

<script>
// 导航统一走 @fmac/core 的 router（禁止 this.$router，见 CLAUDE.md 第十节）。
import { router, tab } from '@fmac/core';

export default {
  name: 'AppSidebar',
  data() {
    return {
      menu: [
        { path: '/home', title: '首页' },
        { path: '/about', title: '关于' },
        { path: '/micro/user', title: '用户（子应用）' },
        { path: '/micro/order', title: '订单（子应用）' },
        { path: '/micro/report', title: '报表（子应用）' },
        { path: '/finance', title: '财务系统（子应用）' },
      ],
    };
  },
  methods: {
    isActive(path) {
      return this.$route && this.$route.path === path;
    },
    go(item) {
      router.push(item.path);
      tab.add({ key: item.path, title: item.title, path: item.path });
    },
  },
};
</script>

<style scoped>
.sidebar {
  width: 200px;
  flex: 0 0 200px;
  background: #fff;
  border-right: 1px solid #e2e8f0;
  padding: 12px 0;
}
.menu {
  list-style: none;
  margin: 0;
  padding: 0;
}
.menu-item {
  padding: 10px 20px;
  cursor: pointer;
  font-size: 14px;
  color: #334155;
}
.menu-item:hover {
  background: #f1f5f9;
}
.menu-item.active {
  background: #eff6ff;
  color: #2563eb;
  border-right: 2px solid #2563eb;
}
</style>
