<template>
  <div class="login">
    <div class="login-card">
      <h2>FMAC 平台登录</h2>
      <form @submit.prevent="onSubmit">
        <label>
          <span>用户名</span>
          <input v-model.trim="form.username" type="text" autocomplete="username" />
        </label>
        <label>
          <span>密码</span>
          <input v-model.trim="form.password" type="password" autocomplete="current-password" />
        </label>
        <button type="submit" :disabled="loading">{{ loading ? '登录中…' : '登录' }}</button>
      </form>
      <p class="tip">开发态默认账号：admin / 任意密码（由 dev-server mock 提供）。</p>
    </div>
  </div>
</template>

<script>
import { login } from '@/api/user';
import { afterLogin } from '@/platform/session';
import message from '@/utils/message';

export default {
  name: 'Login',
  data() {
    return {
      form: { username: 'admin', password: '123456' },
      loading: false,
    };
  },
  methods: {
    async onSubmit() {
      if (!this.form.username || !this.form.password) {
        message.warning('请输入用户名和密码');
        return;
      }
      this.loading = true;
      try {
        const resp = await login({ username: this.form.username, password: this.form.password });
        await afterLogin(resp);
        message.success('登录成功');
      } catch (e) {
        // 错误提示已由 request 响应拦截器统一处理。
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.login {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.login-card {
  width: 360px;
  padding: 32px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
}
.login-card h2 {
  margin: 0 0 20px;
  text-align: center;
}
label {
  display: block;
  margin-bottom: 16px;
}
label span {
  display: block;
  margin-bottom: 6px;
  color: #4e5969;
  font-size: 13px;
}
input {
  width: 100%;
  height: 38px;
  padding: 0 12px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  outline: none;
}
input:focus {
  border-color: #2f6bff;
}
button {
  width: 100%;
  height: 40px;
  border: 0;
  border-radius: 8px;
  background: #2f6bff;
  color: #fff;
  font-size: 15px;
  cursor: pointer;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
button:hover:not(:disabled) {
  background: #2559d6;
}
.tip {
  margin-top: 16px;
  color: #86909c;
  font-size: 12px;
  text-align: center;
}
</style>
