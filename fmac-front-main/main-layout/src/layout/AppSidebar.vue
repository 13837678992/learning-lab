<template>
  <div class="app-sidebar">
    <ul class="menu-list">
      <li
        v-for="item in menuItems"
        :key="item.path"
        :class="{ active: isActive(item.path) }"
        @click="navigate(item.path)"
      >
        {{ item.title }}
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'AppSidebar',
  computed: {
    menuItems() {
      var menu = this.$store.state.menu;
      if (menu && menu.length > 0) {
        return menu.map(function(item) {
          return { title: item.app_name, path: item.route };
        });
      }
      return [
        { title: '首页', path: '/home' },
        { title: '示例应用', path: '/app-demo' }
      ];
    }
  },
  methods: {
    navigate(path) {
      if (this.$route.path !== path) {
        this.$router.push(path);
      }
    },
    isActive(path) {
      return this.$route.path === path || this.$route.path.startsWith(path + '/');
    }
  }
};
</script>

<style scoped>
.app-sidebar {
  width: 200px;
  background: #001529;
  height: 100%;
  overflow-y: auto;
}

.menu-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.menu-list li {
  padding: 14px 20px;
  color: rgba(255, 255, 255, 0.65);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.menu-list li:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.menu-list li.active {
  color: #fff;
  background: #1890ff;
}
</style>
