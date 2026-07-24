<template>
  <div class="layout">
    <AppSidebar :menu="menu" />
    <div class="layout-main">
      <AppHeader :user="userInfo" @logout="onLogout" />
      <main class="layout-content">
        <!-- 子应用容器：常驻 DOM（v-show 切换可见性），避免 qiankun 挂载时容器缺失。 -->
        <div v-show="isMicro" id="subapp-viewport" class="subapp-viewport"></div>
        <!-- 基座自有页面：仅非子应用路由时渲染。 -->
        <router-view v-if="!isMicro" />
      </main>
    </div>
  </div>
</template>

<script>
import AppSidebar from './AppSidebar.vue';
import AppHeader from './AppHeader.vue';
import { store } from '@/store';
import { logout } from '@/platform/session';

export default {
  name: 'Layout',
  components: { AppSidebar, AppHeader },
  computed: {
    menu() {
      return store.state.menu;
    },
    userInfo() {
      return store.state.userInfo;
    },
    isMicro() {
      return this.$route.matched.some((r) => r.meta && r.meta.micro);
    },
  },
  methods: {
    onLogout() {
      logout();
    },
  },
};
</script>

<style scoped>
.layout {
  display: flex;
  height: 100%;
}
.layout-main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}
.layout-content {
  flex: 1;
  padding: 20px;
  overflow: auto;
}
.subapp-viewport {
  min-height: 100%;
}
</style>
