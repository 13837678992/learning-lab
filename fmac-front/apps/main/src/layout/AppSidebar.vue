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

    <!-- 权限菜单：登录后由 parseMenu 解析并写入共享 store，点击叶子生成 tab 并跳转。 -->
    <div v-if="permMenu.length" class="perm-menu">
      <div class="perm-title">权限菜单</div>
      <MenuTree :nodes="permMenu" @select="onSelectMenu" />
    </div>
  </aside>
</template>

<script>
// 导航统一走 @fmac/core 的 router（禁止 this.$router）；菜单来自共享 store（解析见 @fmac/auth）。
import { router, tab, store, menuToTab } from '@fmac/core';
import { STORE_KEYS } from '@fmac/constants';
import MenuTree from './MenuTree.vue';

export default {
  name: 'AppSidebar',
  components: { MenuTree },
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
      permMenu: [],
      off: null,
    };
  },
  created() {
    this.permMenu = store.get(STORE_KEYS.MENU) || [];
    // 订阅菜单变化（登录后刷新）。
    this.off = store.subscribe(STORE_KEYS.MENU, (val) => {
      this.permMenu = val || [];
    });
  },
  beforeDestroy() {
    if (this.off) this.off();
  },
  methods: {
    isActive(path) {
      return this.$route && this.$route.path === path;
    },
    go(item) {
      router.push(item.path);
      tab.add({ key: item.path, title: item.title, path: item.path });
    },
    onSelectMenu(node) {
      const t = menuToTab(node);
      if (t) tab.add(t);
      router.push(node.url);
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
  overflow-y: auto;
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
.perm-menu {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
}
.perm-title {
  padding: 4px 20px;
  font-size: 12px;
  color: #94a3b8;
}
</style>
