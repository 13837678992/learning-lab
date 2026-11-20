<template>
  <div id="app">
    <MonthlyStrategyReport />
  </div>
</template>

<script>
import MonthlyStrategyReport from './components/MonthlyStrategyReport.vue'

export default {
  name: 'App',
  components: {
    MonthlyStrategyReport,
  },
}
</script>

<style scoped>
#app {
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}

</style>
