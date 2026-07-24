<template>
  <aside class="app-sidebar">
    <div class="app-sidebar__brand">FMAC</div>
    <nav class="app-sidebar__nav">
      <router-link
        v-for="item in menu"
        :key="item.path"
        :to="item.path"
        class="app-sidebar__item"
        active-class="is-active"
      >
        <span class="app-sidebar__icon">{{ item.icon || '•' }}</span>
        <span class="app-sidebar__text">{{ item.title }}</span>
      </router-link>
    </nav>
  </aside>
</template>

<script>
export default {
  name: 'AppSidebar',
  props: {
    menu: { type: Array, default: () => [] },
  },
};
</script>

<style scoped>
.app-sidebar {
  width: 220px;
  flex: none;
  background: #1f2733;
  color: #c9d1d9;
  display: flex;
  flex-direction: column;
}
.app-sidebar__brand {
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #fff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.app-sidebar__nav {
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.app-sidebar__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  color: #c9d1d9;
  font-size: 14px;
}
.app-sidebar__item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}
.app-sidebar__item.is-active {
  background: #2f6bff;
  color: #fff;
}
.app-sidebar__icon {
  width: 20px;
  text-align: center;
}
</style>
