<template>
  <div class="layout">
    <app-header />
    <div class="layout-body">
      <app-sidebar />
      <div class="layout-content">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script>
import AppHeader from './AppHeader.vue';
import AppSidebar from './AppSidebar.vue';

export default {
  name: 'Layout',
  components: {
    AppHeader,
    AppSidebar
  }
};
</script>

<style scoped>
.layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.layout-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.layout-content {
  flex: 1;
  overflow-y: auto;
  background: #f0f2f5;
}
</style>
