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
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei',
    sans-serif;
  color: #1f2937;
  background: #f1f5f9;
}
</style>
