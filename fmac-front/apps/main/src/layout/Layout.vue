<template>
  <div class="layout">
    <AppHeader />
    <div class="layout-body">
      <AppSidebar />
      <section class="layout-main">
        <AppTabs />
        <div class="layout-content">
          <!-- 基座自身页面 -->
          <router-view />
          <!-- 子应用挂载区：由 qiankun 接管（见 CLAUDE.md 第十七节，强制样式隔离） -->
          <div id="subapp-viewport" class="subapp-viewport"></div>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import AppHeader from './AppHeader.vue';
import AppSidebar from './AppSidebar.vue';
import AppTabs from './AppTabs.vue';

export default {
  name: 'LayoutShell',
  components: { AppHeader, AppSidebar, AppTabs },
};
</script>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.layout-body {
  flex: 1;
  display: flex;
  min-height: 0;
}
.layout-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.layout-content {
  flex: 1;
  padding: 16px;
  overflow: auto;
}
.subapp-viewport {
  min-height: 0;
}
</style>
