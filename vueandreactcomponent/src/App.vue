<template>
  <div id="app" class="app-container">
    <el-card class="app-card" shadow="always">
      <div slot="header" class="clearfix">
        <span>产品核对系统</span>
      </div>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="自动核对" name="auto">
          <AutoVerification />
        </el-tab-pane>
        <el-tab-pane label="手动核对" name="manual">
          <ManualVerification />
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script>
import AutoVerification from './autoHeDui/autoverification.vue'
import ManualVerification from './autoHeDui/manualVerification.vue'

export default {
  name: 'App',
  components: {
    AutoVerification,
    ManualVerification,
  },
  data() {
    return {
      activeTab: 'auto',
    }
  },
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}

.app-container {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 24px;
  box-sizing: border-box;
}

.app-card {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
