<template>
  <div class="app-demo">
    <header class="ad-header">
      <strong class="ad-brand">app-demo</strong>
      <nav class="ad-nav">
        <router-link to="/home">首页</router-link>
        <router-link to="/about">关于</router-link>
      </nav>
      <span class="ad-mode">{{ powered ? 'qiankun 接入' : '独立运行' }}</span>
    </header>
    <main class="ad-main">
      <router-view />
    </main>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return { powered: typeof window !== 'undefined' && !!window.__POWERED_BY_QIANKUN__ };
  },
};
</script>

<style>
/* 子应用样式：qiankun experimentalStyleIsolation 会在运行期作用域化，避免污染主应用。 */
.app-demo {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei',
    sans-serif;
  color: #1f2329;
}
.ad-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: #0e7a6b;
  color: #fff;
  border-radius: 8px;
}
.ad-brand {
  font-size: 16px;
  letter-spacing: 1px;
}
.ad-nav a {
  color: #d7fff6;
  margin-right: 12px;
  text-decoration: none;
}
.ad-nav a.router-link-active {
  color: #fff;
  text-decoration: underline;
}
.ad-mode {
  margin-left: auto;
  font-size: 12px;
  opacity: 0.9;
}
.ad-main {
  padding: 16px 4px;
}
</style>
