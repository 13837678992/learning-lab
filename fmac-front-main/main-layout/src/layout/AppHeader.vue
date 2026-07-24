<template>
  <header class="app-header">
    <div class="app-header__title">FMAC 微前端平台</div>
    <div class="app-header__right">
      <span class="app-header__user">{{ displayName }}</span>
      <button class="app-header__logout" type="button" @click="$emit('logout')">退出登录</button>
    </div>
  </header>
</template>

<script>
export default {
  name: 'AppHeader',
  props: {
    user: { type: Object, default: null },
  },
  computed: {
    displayName() {
      return (this.user && (this.user.name || this.user.username)) || '未登录';
    },
  },
};
</script>

<style scoped>
.app-header {
  height: 56px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: #fff;
  border-bottom: 1px solid #eef0f3;
}
.app-header__title {
  font-size: 16px;
  font-weight: 600;
}
.app-header__right {
  display: flex;
  align-items: center;
  gap: 14px;
}
.app-header__user {
  color: #4e5969;
  font-size: 14px;
}
.app-header__logout {
  height: 32px;
  padding: 0 14px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #fff;
  color: #4e5969;
  cursor: pointer;
}
.app-header__logout:hover {
  border-color: #2f6bff;
  color: #2f6bff;
}
</style>
