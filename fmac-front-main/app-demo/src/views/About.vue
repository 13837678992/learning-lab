<template>
  <div class="about">
    <h1>关于</h1>
    <p>这是 app-demo 子应用的关于页面。</p>
    <div class="actions">
      <router-link to="/" class="btn">返回首页</router-link>
    </div>
  </div>
</template>

<script>
export default {
  name: 'About'
};
</script>

<style scoped>
.about {
  padding: 20px;
}

.about h1 {
  margin-bottom: 16px;
  color: #333;
}

.about p {
  margin-bottom: 12px;
  color: #666;
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
