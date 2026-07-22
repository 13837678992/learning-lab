<template>
  <div class="login">
    <div class="login-card">
      <h2 class="login-title">FMAC 微前端平台</h2>
      <p class="login-sub">登录以加载菜单与子应用</p>
      <el-form @submit.native.prevent>
        <el-form-item>
          <el-input v-model="username" placeholder="用户名" clearable />
        </el-form-item>
        <el-form-item>
          <el-input v-model="password" type="password" placeholder="密码" show-password />
        </el-form-item>
        <el-button type="primary" :loading="loading" class="login-btn" @click="onLogin">
          登录
        </el-button>
      </el-form>
    </div>
  </div>
</template>

<script>
// 主应用登录页：模拟登录 → 加载菜单 → 回跳。经 @fmac/core 使用平台能力。
import platform from '@fmac/core';
import { STORE_KEYS } from '@fmac/constants';
import { loadMenu } from '../platform/menu.js';

export default {
  name: 'LoginView',
  data() {
    return { username: 'admin', password: '123456', loading: false };
  },
  methods: {
    async onLogin() {
      if (!this.username) {
        platform.message.warning('请输入用户名');
        return;
      }
      this.loading = true;
      try {
        // 模拟登录（真实项目走 platform.request）。
        platform.auth.setToken(`mock-token-${this.username}`);
        platform.auth.setUser({ name: this.username });
        // 登录后加载菜单（解析 → 主应用菜单 / 子应用路由 / tab 数据）。
        await loadMenu();
        platform.message.success('登录成功');
        const redirect = platform.store.get(STORE_KEYS.REDIRECT);
        platform.store.remove(STORE_KEYS.REDIRECT);
        platform.router.push(redirect || '/');
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.login {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f2f5;
}
.login-card {
  width: 340px;
  padding: 32px 28px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
}
.login-title {
  margin: 0 0 4px;
  font-size: 20px;
  color: #1f2937;
}
.login-sub {
  margin: 0 0 20px;
  font-size: 13px;
  color: #94a3b8;
}
.login-btn {
  width: 100%;
}
</style>
