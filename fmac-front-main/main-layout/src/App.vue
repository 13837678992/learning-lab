<template>
  <div id="app-root">
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App',
};
</script>

<style>
* {
  box-sizing: border-box;
}
html,
body,
#app,
#app-root {
  height: 100%;
  margin: 0;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei',
    sans-serif;
  color: #1f2329;
  background: #f5f6f8;
}
a {
  color: #2f6bff;
  text-decoration: none;
}
</style>
