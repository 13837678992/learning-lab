<template>
  <div class="home-container">
    <h1>欢迎使用微前端系统</h1>
    <div class="info-card">
      <p>当前用户：{{ userInfo ? userInfo.username : '未登录' }}</p>
      <p>当前角色：{{ userInfo ? userInfo.role : '-' }}</p>
    </div>
    <div class="actions">
      <button @click="goDemo" class="action-btn">访问示例应用</button>
    </div>
    <div id="subapp-container"></div>
  </div>
</template>

<script>
import { getUserInfo } from '@/api/user';

export default {
  name: 'Home',
  computed: {
    userInfo() {
      return this.$store.state.userInfo;
    }
  },
  created() {
    if (this.$store.state.token && !this.$store.state.userInfo) {
      this.fetchUserInfo();
    }
  },
  methods: {
    async fetchUserInfo() {
      try {
        const res = await getUserInfo();
        this.$store.commit('SET_USER_INFO', res.data);
      } catch (e) {
        console.error('获取用户信息失败', e);
      }
    },
    goDemo() {
      this.$router.push('/app-demo');
    }
  }
};
</script>

<style scoped>
.home-container {
  padding: 24px;
}

.home-container h1 {
  margin-bottom: 20px;
  color: #333;
}

.info-card {
  background: #f5f7fa;
  padding: 16px 20px;
  border-radius: 6px;
  margin-bottom: 20px;
}

.info-card p {
  margin: 6px 0;
  color: #606266;
  font-size: 14px;
}

.actions {
  margin-bottom: 20px;
}

.action-btn {
  padding: 8px 20px;
  background: #409eff;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.action-btn:hover {
  background: #66b1ff;
}
</style>
