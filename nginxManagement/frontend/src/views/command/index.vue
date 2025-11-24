<template>
  <div class="command-page">
    <el-card class="command-card">
      <template #header>
        <div class="card-header">
          <span>命令执行</span>
        </div>
      </template>
      
      <el-form :model="commandForm" label-width="80px">
        <el-form-item label="命令">
          <el-input
            v-model="commandForm.command"
            placeholder="请输入要执行的命令"
            @keyup.enter="executeCommand"
          >
            <template #append>
              <el-button @click="executeCommand" :loading="executing">
                执行
              </el-button>
            </template>
          </el-input>
        </el-form-item>
      </el-form>

      <!-- 常用命令快捷按钮 -->
      <div class="quick-commands">
        <h4>常用命令：</h4>
        <el-button-group>
          <el-button @click="quickCommand('dir')" size="small">dir</el-button>
          <el-button @click="quickCommand('ipconfig')" size="small">ipconfig</el-button>
          <el-button @click="quickCommand('netstat -an')" size="small">netstat -an</el-button>
          <el-button @click="quickCommand('tasklist')" size="small">tasklist</el-button>
          <el-button @click="quickCommand('ping 127.0.0.1')" size="small">ping 127.0.0.1</el-button>
        </el-button-group>
      </div>
    </el-card>

    <el-card class="records-card">
      <template #header>
        <div class="card-header">
          <span>执行记录</span>
          <el-button @click="clearRecords" type="danger" size="small">
            清空记录
          </el-button>
        </div>
      </template>

      <el-table :data="records" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="command" label="命令" min-width="200" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="startTime" label="开始时间" width="180">
          <template #default="scope">
            {{ formatTime(scope.row.startTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="duration" label="耗时" width="100">
          <template #default="scope">
            {{ scope.row.duration }}ms
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="scope">
            <el-button @click="viewDetail(scope.row)" size="small" type="primary">
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailVisible"
      title="命令执行详情"
      width="80%"
      :before-close="handleClose"
    >
      <div v-if="selectedRecord">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="命令ID">{{ selectedRecord.id }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(selectedRecord.status)">
              {{ getStatusText(selectedRecord.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="开始时间">{{ formatTime(selectedRecord.startTime) }}</el-descriptions-item>
          <el-descriptions-item label="结束时间">{{ formatTime(selectedRecord.endTime) }}</el-descriptions-item>
          <el-descriptions-item label="执行时长">{{ selectedRecord.duration }}ms</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatTime(selectedRecord.createdAt) }}</el-descriptions-item>
        </el-descriptions>

        <el-divider />

        <h4>执行的命令：</h4>
        <el-input
          v-model="selectedRecord.command"
          type="textarea"
          :rows="2"
          readonly
          style="margin-bottom: 20px;"
        />

        <h4>命令输出：</h4>
        <el-input
          v-model="selectedRecord.output"
          type="textarea"
          :rows="10"
          readonly
          style="margin-bottom: 20px;"
        />

        <h4 v-if="selectedRecord.errorMsg">错误信息：</h4>
        <el-input
          v-if="selectedRecord.errorMsg"
          v-model="selectedRecord.errorMsg"
          type="textarea"
          :rows="5"
          readonly
          style="color: #f56c6c;"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { executeCommand as executeCommandApi, getRecords, clearRecords as clearRecordsApi } from '@/api/command'

const commandForm = ref({
  command: ''
})

const records = ref([])
const loading = ref(false)
const executing = ref(false)
const detailVisible = ref(false)
const selectedRecord = ref(null)

// 获取记录列表
const fetchRecords = async () => {
  loading.value = true
  try {
    const response = await getRecords()
    if (response.success) {
      records.value = response.data.reverse() || []
    } else {
      ElMessage.error(response.message || '获取记录失败')
    }
  } catch (error) {
    ElMessage.error('获取记录失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

// 执行命令
const executeCommandHandler = async () => {
  if (!commandForm.value.command.trim()) {
    ElMessage.warning('请输入要执行的命令')
    return
  }

  executing.value = true
  try {
    const response = await executeCommandApi(commandForm.value.command)
    if (response.success) {
      ElMessage.success('命令执行完成')
      commandForm.value.command = ''
      // 刷新记录列表
      await fetchRecords()
    } else {
      ElMessage.error(response.message || '命令执行失败')
    }
  } catch (error) {
    ElMessage.error('命令执行失败: ' + error.message)
  } finally {
    executing.value = false
  }
}

// 快捷命令
const quickCommand = (cmd) => {
  commandForm.value.command = cmd
  executeCommandHandler()
}

// 清空记录
const clearRecordsHandler = async () => {
  try {
    await ElMessageBox.confirm('确定要清空所有记录吗？', '确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const response = await clearRecordsApi()
    if (response.success) {
      ElMessage.success('记录已清空')
      await fetchRecords()
    } else {
      ElMessage.error(response.message || '清空记录失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('清空记录失败: ' + error.message)
    }
  }
}

// 查看详情
const viewDetail = (record) => {
  selectedRecord.value = record
  detailVisible.value = true
}

// 关闭详情对话框
const handleClose = () => {
  detailVisible.value = false
  selectedRecord.value = null
}

// 获取状态类型
const getStatusType = (status) => {
  switch (status) {
    case 'success':
      return 'success'
    case 'error':
      return 'danger'
    case 'running':
      return 'warning'
    default:
      return 'info'
  }
}

// 获取状态文本
const getStatusText = (status) => {
  switch (status) {
    case 'success':
      return '成功'
    case 'error':
      return '失败'
    case 'running':
      return '执行中'
    default:
      return '未知'
  }
}

// 格式化时间
const formatTime = (timeStr) => {
  if (!timeStr) return '-'
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN')
}

// 暴露方法给模板
const executeCommand = executeCommandHandler
const clearRecords = clearRecordsHandler

onMounted(() => {
  fetchRecords()
})
</script>

<style scoped>
.command-page {
  max-width: 1200px;
  margin: 0 auto;
}

.command-card {
  margin-bottom: 20px;
}

.records-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.quick-commands {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.quick-commands h4 {
  margin: 0 0 10px 0;
  color: #606266;
  font-size: 14px;
}

:deep(.el-textarea__inner) {
  font-family: 'Courier New', monospace;
  font-size: 12px;
}
</style>