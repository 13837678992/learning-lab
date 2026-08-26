<template>
  <div class="login-container">
    <div class="login-box">
      <h2>系统登录</h2>
      <form @submit.prevent="handleLogin">
        <div class="form-item">
          <label>用户名</label>
          <input v-model="username" type="text" placeholder="请输入用户名" />
        </div>
        <div class="form-item">
          <label>密码</label>
          <input v-model="password" type="password" placeholder="请输入密码" />
        </div>
        <button type="submit" class="login-btn" :disabled="loading">
          {{ loading ? '登录中...' : '登 录' }}
        </button>
        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
      </form>
    </div>
  </div>
</template>

<script>
import { login, getUserInfo } from '@/api/user';
import { getMenu } from '@/api/menu';
import { start as startSession } from '@/platform/session';
import { syncUserState, syncMenuState } from '@/platform/bridge';

export default {
  name: 'Login',
  data() {
    return {
      username: '',
      password: '',
      loading: false,
      errorMsg: ''
    };
  },
  methods: {
    async handleLogin() {
      this.errorMsg = '';
      if (!this.username || !this.password) {
        this.errorMsg = '请输入用户名和密码';
        return;
      }
      this.loading = true;
      try {
        var res = await login({
          username: this.username,
          password: this.password
        });
        this.$store.commit('SET_TOKEN', res.data.token);
        try {
          var infoRes = await getUserInfo();
          this.$store.commit('SET_USER_INFO', infoRes.data);
        } catch (e) {
          console.error('获取用户信息失败', e);
        }
        try {
          var menuRes = await getMenu();
          this.$store.commit('SET_MENU', menuRes.data);
        } catch (e) {
          console.error('获取菜单失败', e);
        }
        startSession();
        syncUserState();
        syncMenuState();

        var redirect = this.$route.query.redirect
          || this.$store.dispatch('getRedirect')
          || '/';
        this.$store.dispatch('clearRedirect');
        this.$router.replace(redirect);
      } catch (e) {
        this.errorMsg = e.message || '登录失败';
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: #f0f2f5;
}

.login-box {
  width: 360px;
  padding: 32px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.login-box h2 {
  text-align: center;
  margin-bottom: 24px;
  color: #333;
}

.form-item {
  margin-bottom: 16px;
}

.form-item label {
  display: block;
  margin-bottom: 6px;
  color: #666;
  font-size: 14px;
}

.form-item input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}

.form-item input:focus {
  border-color: #409eff;
}

.login-btn {
  width: 100%;
  padding: 10px;
  background: #409eff;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  margin-top: 8px;
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-btn:hover:not(:disabled) {
  background: #66b1ff;
}

.error-msg {
  color: #f56c6c;
  font-size: 13px;
  margin-top: 12px;
  text-align: center;
}
</style>
