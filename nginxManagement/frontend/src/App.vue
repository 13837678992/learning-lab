<script setup>
</script>

<template>
  <el-container style="height: 100vh;">
    <el-aside width="200px" style="background-color: #0f172a;">
      <el-menu
        :default-active="$route.path"
        class="el-menu-vertical-demo"
        background-color="#0f172a"
        text-color="#fff"
        active-text-color="#409eff"
        router
      >
        <el-menu-item index="/proxy">
          <el-icon><connection /></el-icon>
          <span>代理配置</span>
        </el-menu-item>
        <el-menu-item index="/command">
          <el-icon><terminal /></el-icon>
          <span>命令执行</span>
        </el-menu-item>
        <el-menu-item index="/dashboard">
          <el-icon><dashboard /></el-icon>
          <span>仪表盘</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header style="background-color: #fff; border-bottom: 1px solid #e5e7eb; padding: 0 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; height: 100%;">
          <h1 style="margin: 0; font-size: 20px;">Nginx 可视化管理系统</h1>
          <el-dropdown>
            <span class="el-dropdown-link">
              <el-avatar icon="User" />
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main style="padding: 20px;">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.el-header {
  position: fixed;
  top: 0;
  right: 0;
  left: 200px;
  z-index: 10;
}

.el-main {
  margin-top: 60px;
  min-height: calc(100vh - 60px);
  width: 100%;
}
</style>
