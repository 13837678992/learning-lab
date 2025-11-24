<template>
  <div class="dashboard-container">
    <el-row :gutter="20">
      <!-- 状态卡片 -->
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="card-header">
            <el-icon class="card-icon"><monitor /></el-icon>
            <span>服务器状态</span>
          </div>
          <div class="stat-value">运行中</div>
          <div class="stat-desc">Nginx 1.23.3</div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="stat-card">
          <div class="card-header">
            <el-icon class="card-icon"><connection /></el-icon>
            <span>活跃连接</span>
          </div>
          <div class="stat-value">{{ activeConnections }}</div>
          <div class="stat-desc">较昨日 +12%</div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="stat-card">
          <div class="card-header">
            <el-icon class="card-icon"><refresh-left /></el-icon>
            <span>请求/秒</span>
          </div>
          <div class="stat-value">{{ requestsPerSecond }}</div>
          <div class="stat-desc">较昨日 +5%</div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="stat-card">
          <div class="card-header">
            <el-icon class="card-icon"><success /></el-icon>
            <span>成功率</span>
          </div>
          <div class="stat-value">{{ successRate }}%</div>
          <div class="stat-desc">较昨日 -1%</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="16">
        <el-card>
          <div slot="header" class="card-header">
            <span>请求趋势</span>
            <el-select v-model="timeRange" size="small" style="margin-left: 10px;">
              <el-option label="今日" value="today"></el-option>
              <el-option label="本周" value="week"></el-option>
              <el-option label="本月" value="month"></el-option>
            </el-select>
          </div>
          <div class="chart-container">
            <el-progress :percentage="65" status="success" />
            <div class="chart-placeholder">请求趋势图表将显示在这里</div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card>
          <div slot="header" class="card-header">
            <span>Top 访问域名</span>
          </div>
          <el-table :data="topDomains">
            <el-table-column prop="domain" label="域名"></el-table-column>
            <el-table-column prop="requests" label="请求数"></el-table-column>
            <el-table-column prop="percentage" label="占比"></el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// 模拟数据
const activeConnections = ref(128)
const requestsPerSecond = ref(35.6)
const successRate = ref(99.8)
const timeRange = ref('today')
const topDomains = ref([
  { domain: 'api.example.com', requests: 12543, percentage: '45.2%' },
  { domain: 'www.example.com', requests: 8762, percentage: '31.4%' },
  { domain: 'static.example.com', requests: 6321, percentage: '22.8%' },
  { domain: 'admin.example.com', requests: 1532, percentage: '5.5%' }
])
</script>

<style scoped>
.dashboard-container {
  padding: 10px;
}

.stat-card {
  height: 100%;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  color: #606266;
}

.card-icon {
  margin-right: 8px;
  color: #409eff;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 5px;
}

.stat-desc {
  color: #909399;
  font-size: 14px;
}

.chart-container {
  height: 300px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.chart-placeholder {
  margin-top: 20px;
  color: #909399;
}
</style>