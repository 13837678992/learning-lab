<template>
  <div class="home">
    <h1>示例子应用 - 首页</h1>
    <p>这是 app-demo 子应用的首页。</p>
    <div class="info" v-if="userToken">
      <p>当前 Token：{{ userToken.substring(0, 20) }}...</p>
    </div>
    <div class="actions">
      <router-link to="/about" class="btn">关于页面</router-link>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Home',
  data() {
    return {
      userToken: ''
    };
  },
  created() {
    this.$root.$on('global-state-change', function(state) {
      if (state.user && state.user.token) {
        this.userToken = state.user.token;
      }
    }.bind(this));
  },
  mounted() {
    this.$root.$once('global-state-change', function(state) {
      if (state.user && state.user.token) {
        this.userToken = state.user.token;
      }
    }.bind(this));
  }
};
</script>

<style scoped>
.home {
  padding: 20px;
}

.home h1 {
  margin-bottom: 16px;
  color: #333;
}

.home p {
  margin-bottom: 12px;
  color: #666;
}

.info {
  background: #f5f7fa;
  padding: 12px 16px;
  border-radius: 4px;
  margin: 16px 0;
  font-size: 13px;
  word-break: break-all;
}

.actions {
  margin-top: 16px;
}

.btn {
  display: inline-block;
  padding: 8px 20px;
  background: #409eff;
  color: #fff;
  text-decoration: none;
  border-radius: 4px;
  font-size: 14px;
}

.btn:hover {
  background: #66b1ff;
}
</style>
