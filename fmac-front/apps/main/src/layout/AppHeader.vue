<template>
  <header class="header">
    <div class="brand">FMAC 微前端平台</div>
    <div class="actions">
      <span class="user">{{ userName }}</span>
      <button class="btn" @click="ping">测试消息</button>
      <button class="btn" @click="globalRefresh">全局刷新</button>
      <button class="btn btn-ghost" @click="logout">退出</button>
    </div>
  </header>
</template>

<script>
// 业务仅从 @fmac/core 接入平台能力。
import { auth, message, event } from '@fmac/core';

export default {
  name: 'AppHeader',
  data() {
    return {
      userName: '未登录',
      off: null,
    };
  },
  created() {
    this.off = auth.onChange((state) => {
      this.userName = state.user ? state.user.name : '未登录';
    });
    // 演示：初始化登录态（真实场景应在登录流程中设置）。
    auth.setToken('demo-token');
    auth.setUser({ name: '管理员' });
  },
  beforeDestroy() {
    // §16：卸载时清理订阅，避免内存泄漏。
    if (this.off) this.off();
  },
  methods: {
    ping() {
      message.success('平台运行正常');
    },
    globalRefresh() {
      // Event：主应用向所有子应用广播 global:refresh。
      event.emit('global:refresh');
      message.info('已广播 global:refresh');
    },
    async logout() {
      const ok = await message.confirm('确认退出登录？');
      if (ok) auth.logout();
    },
  },
};
</script>

<style scoped>
.header {
  height: 56px;
  flex: 0 0 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: #1e293b;
  color: #fff;
}
.brand {
  font-size: 16px;
  font-weight: 600;
}
.actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.user {
  font-size: 14px;
  color: #cbd5e1;
}
.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: #3b82f6;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
}
.btn-ghost {
  background: transparent;
  border: 1px solid #475569;
}
</style>
