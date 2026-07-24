<template>
  <div class="about">
    <h2>关于 app-demo</h2>
    <p>本子应用演示 qiankun 接入与独立运行双模式：</p>
    <ul>
      <li>独立运行：<code>npm run serve</code>（:7201），走自身路由与 mock。</li>
      <li>qiankun 接入：由主应用 <code>main-layout</code> 按菜单动态加载，base 对齐 <code>/app-demo</code>。</li>
      <li>生命周期：<code>bootstrap / mount / unmount</code>，UMD 导出。</li>
      <li>请求：独立 <code>request.js</code>，401 未登录、418 → <code>window.microApp.logout()</code>。</li>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'About',
};
</script>

<style scoped>
.about {
  max-width: 760px;
}
.about h2 {
  margin-top: 0;
}
.about ul {
  line-height: 2;
}
</style>
