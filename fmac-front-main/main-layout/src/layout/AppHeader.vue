<template>
  <div class="app-header">
    <div class="header-left">
      <h1 class="logo">微前端系统</h1>
    </div>
    <div class="header-right">
      <span class="username">{{ userInfo ? userInfo.username : '' }}</span>
      <button class="logout-btn" @click="handleLogout">退出</button>
    </div>
  </div>
</template>

<script>
import { logout } from '@/utils/logout';

export default {
  name: 'AppHeader',
  computed: {
    userInfo() {
      return this.$store.state.userInfo;
    }
  },
  methods: {
    handleLogout() {
      logout();
    }
  }
};
</script>

<style scoped>
.app-header {
  height: 56px;
  background: #001529;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  color: #fff;
}

.logo {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.username {
  font-size: 14px;
}

.logout-btn {
  padding: 4px 12px;
  background: transparent;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.logout-btn:hover {
  border-color: #fff;
}
</style>
