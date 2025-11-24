<template>
  <div class="proxy-container">
    <el-card>
      <template #header>
        <div class="card-header">
        <span>接口代理配置</span>
                  <div class="header-actions">
            <el-button type="primary" @click="loadConfig" :loading="loading">
              <el-icon><refresh /></el-icon>
              刷新配置
            </el-button>
            <el-button type="warning" @click="testConfig" :loading="testing">
              <el-icon><warning /></el-icon>
              测试配置
            </el-button>
            <el-button type="success" @click="saveConfig" :loading="saving">
              <el-icon><check /></el-icon>
              保存配置
            </el-button>
            <el-button type="info" @click="reloadConfig" :loading="reloading">
              <el-icon><reload /></el-icon>
              重载配置
            </el-button>
            <el-button type="success" @click="startNginx" :loading="starting">
              <el-icon><video-play /></el-icon>
              启动Nginx
            </el-button>
            <el-button type="danger" @click="stopNginx" :loading="stopping">
              <el-icon><video-pause /></el-icon>
              停止Nginx
            </el-button>
          </div>
        </div>
      </template>

      <el-alert
        v-if="error"
        :title="error"
        type="error"
        show-icon
        closable
        style="margin-bottom: 20px;"
      />

      <el-alert
        v-if="success"
        :title="formatDate(new Date()) + ' ' + success"
        type="success"
        show-icon
        closable
        style="margin-bottom: 20px;"
      />

      <div class="config-content">
        <el-form :model="configForm" label-width="120px" label-position="top">
          <el-form-item label="配置文件路径">
            <el-input v-model="configForm.configPath" placeholder="nginx配置文件路径" />
          </el-form-item>
          
          <el-form-item label="代理配置">
            <el-table :data="configForm.proxyRules" border style="width: 100%">
              <el-table-column prop="title" label="标题" width="180">
                <template #default="{ row }">
                  <el-input v-model="row.title" placeholder="如：端口80的API代理" />
                </template>
              </el-table-column>
              <el-table-column prop="port" label="端口号" width="140">
                <template #default="{ row }">
                  <el-input v-model="row.port" placeholder="140" />
                </template>
              </el-table-column>
              <el-table-column prop="location" label="路径" width="140">
                <template #default="{ row }">
                  <el-input v-model="row.location" placeholder="/api/" />
                </template>
              </el-table-column>
              
              <el-table-column prop="proxyAddresses" label="代理地址" >
                <template #default="{ row }">
                  <div class="proxy-addresses">
                    <div v-for="(address, index) in row.proxyAddresses" :key="index" class="proxy-address-item">
                      <el-input 
                        v-model="address.url" 
                        :placeholder="`代理地址 ${index + 1}`"
                        size="small"
                        style="width: 160px;"
                      />
                      <el-input 
                        v-model="address.comment" 
                        placeholder="备注"
                        size="small"
                        style="width: 100px;"
                      />
                      <el-button 
                        size="small" 
                        :type="row.activeIndex === index ? 'primary' : 'default'"
                        @click="setActiveProxy(row, index)"
                      >
                        {{ row.activeIndex === index ? '当前' : '切换' }}
                      </el-button>
                      <el-button 
                        size="small" 
                        type="danger" 
                        @click="removeProxyAddress(row, index)"
                        :disabled="row.proxyAddresses.length <= 1"
                      >
                        删除
                      </el-button>
                    </div>
                    <el-button 
                      type="primary" 
                      size="small" 
                      @click="addProxyAddress(row)"
                      style="margin-top: 5px;"
                    >
                      添加地址
                    </el-button>
                  </div>
                </template>
              </el-table-column>
              
              <el-table-column prop="description" label="描述" width="140">
                <template #default="{ row }">
                  <el-input v-model="row.description" placeholder="API接口代理" />
                </template>
              </el-table-column>
              
              <el-table-column prop="enabled" label="状态" width="100">
                <template #default="{ row }">
                  <el-switch v-model="row.enabled" />
                </template>
              </el-table-column>
              
              <el-table-column label="操作" width="160">
                <template #default="{ row, $index }">
                  <el-button
                    size="small"
                    type="primary"
                    @click="showLogDialog(row, 'access')"
                  >查看日志</el-button>
                  <el-button
                    size="small"
                    type="danger"
                    @click="removeProxyRule($index)"
                  >删除</el-button>
                 
                </template>
              </el-table-column>
            </el-table>
            
            <div style="margin-top: 10px;">
              <el-button type="primary" @click="addProxyRule">
                <el-icon><plus /></el-icon>
                添加代理规则
              </el-button>
            </div>
          </el-form-item>
        </el-form>
      </div>
      <el-collapse v-model="activeNames" @change="handleChange">
      <el-collapse-item title="配置预览">
        <div class="config-preview">
        
        <el-input
          type="textarea"
          :rows="15"
          v-model="configPreview"
          readonly
          placeholder="配置预览将在这里显示"
        />
      </div>
      </el-collapse-item></el-collapse>
     
    </el-card>

    <el-dialog v-model="logDialogVisible" title="查看日志" width="60%" :before-close="handleLogDialogClose">
      <div style="margin-bottom: 10px;display: flex;align-items: center;">
        <el-radio-group v-model="logType">
          <el-radio-button label="access">访问日志</el-radio-button>
          <el-radio-button label="error">错误日志</el-radio-button>
        </el-radio-group>
        <el-radio-group v-model="logViewMode" style="margin-left: 20px;">
          <el-radio-button label="raw">原始日志</el-radio-button>
          <el-radio-button label="table">表格模式</el-radio-button>
        </el-radio-group>
        <el-button style="margin-left: 20px;"
                    size="small"
                    type="warning"
                    @click="clearLog(currentRow)"
                  >清除日志</el-button>
        <span style="margin-left: 20px; color: #888;">端口: {{ logPort }}</span>
      </div>
      <template v-if="logViewMode === 'raw'">
        <el-input
          type="textarea"
          :rows="20"
          v-model="logContent"
          readonly
          style="font-family: monospace;"
        />
      </template>
      <template v-else>
        <el-table :data="parsedLog" style="width: 100%">
          <el-table-column prop="ip" label="IP" width="120" show-overflow-tooltip />
          <el-table-column prop="time" label="时间" width="200" show-overflow-tooltip  />
          <el-table-column prop="method" label="方法" width="80" show-overflow-tooltip />
          <el-table-column prop="path" label="路径" show-overflow-tooltip />
          <el-table-column prop="status" label="状态码" width="80" show-overflow-tooltip>
            <template #default="{ row }">
              <el-tag
                :type="row.status >= 500 ? 'danger' : row.status >= 400 ? 'warning' : row.status >= 300 ? 'info' : row.status >= 200 ? 'success' : ''"
                disable-transitions
              >{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="size" label="大小" width="80" show-overflow-tooltip />
          <el-table-column prop="referer" label="Referer" show-overflow-tooltip />
          <el-table-column prop="browser" label="浏览器" width="100" show-overflow-tooltip />
          <el-table-column prop="os" label="操作系统" width="100" show-overflow-tooltip />
          <el-table-column prop="engine" label="引擎" width="100" show-overflow-tooltip />
          <el-table-column prop="ua" label="UA" show-overflow-tooltip />
        </el-table>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { getProxyConfig, saveProxyConfig, testNginxConfig, reloadNginxConfig, startNginx as startNginxApi, stopNginx as stopNginxApi, getProxyLog, clearProxyLog } from '@/api/proxy'

const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const reloading = ref(false)
const starting = ref(false)
const stopping = ref(false)
const error = ref('')
const success = ref('')

const configForm = reactive({
  configPath: '/etc/nginx/conf.d/api.conf',
  proxyRules: [
    {
      title: '端口801的API代理',
      port: '801',
      location: '/api/',
      proxyAddresses: [
        { url: 'http://localhost:8082', comment: '新地址', isActive: true },
        { url: 'http://localhost:8081', comment: '新地址', isActive: false },
        { url: 'http://localhost:8080', comment: '新地址', isActive: false }
      ],
      activeIndex: 0,
      description: 'API接口代理',
      enabled: true
    }
  ]
})
function formatDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}:${s}`
}
// 计算配置预览
const configPreview = computed(() => {
  let preview = `# API代理配置文件\n`
  preview += `# 自动生成于 ${new Date().toLocaleString()}\n\n`
  
  configForm.proxyRules.forEach(rule => {
    if (rule.enabled && rule.proxyAddresses.length > 0) {
      if (rule.title) preview += `# ${rule.title}\n`
      preview += `server {\n    listen       ${rule.port || '80'};\n    server_name  localhost;\n\n    location ${rule.location} {\n`
      
      // 显示所有代理地址，激活的在前，注释的在后
      rule.proxyAddresses.forEach((address, index) => {
        if (index === rule.activeIndex) {
          // 激活的地址
          if (address.comment) {
            preview += `        proxy_pass ${address.url}; # ${address.comment}\n`
          } else {
            preview += `        proxy_pass ${address.url};\n`
          }
        } else {
          // 注释的地址
          if (address.comment) {
            preview += `        # proxy_pass ${address.url}; # ${address.comment}\n`
          } else {
            preview += `        # proxy_pass ${address.url};\n`
          }
        }
      })
      
      preview += `        proxy_set_header Host $host;\n`
      preview += `        proxy_set_header X-Real-IP $remote_addr;\n`
      preview += `        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n`
      preview += `        proxy_set_header X-Forwarded-Proto $scheme;\n`
      preview += `    }\n}\n\n`
    }
  })
  
  return preview
})

// 加载配置
const loadConfig = async () => {
  loading.value = true
  error.value = ''
  success.value = ''
  
  try {
    const response = await getProxyConfig()
    if (response.success) {
      configForm.configPath = response.data.configPath || configForm.configPath
      configForm.proxyRules = response.data.proxyRules || configForm.proxyRules
      success.value = '配置加载成功'
    } else {
      error.value = response.message || '加载配置失败'
    }
  } catch (err) {
    error.value = '加载配置时发生错误: ' + err.message
  } finally {
    loading.value = false
  }
}

// 保存配置
const saveConfig = async () => {
  saving.value = true
  error.value = ''
  success.value = ''

  // 保存前清洗所有备注，去除#和分号
  configForm.proxyRules.forEach(rule => {
    if (rule.proxyAddresses && Array.isArray(rule.proxyAddresses)) {
      rule.proxyAddresses.forEach(addr => {
        if (addr.comment) {
          addr.comment = addr.comment.replace(/[\#;]/g, '').trim()
        }
      })
    }
  })

  try {
    const response = await saveProxyConfig({
      configPath: configForm.configPath,
      proxyRules: configForm.proxyRules
    })
    
    if (response.success) {
      success.value = '配置保存成功'
    } else {
      error.value = response.message || '保存配置失败'
    }
  } catch (err) {
    error.value = '保存配置时发生错误: ' + err.message
  } finally {
    saving.value = false
  }
}

// 添加代理规则
const addProxyRule = () => {
  configForm.proxyRules.push({
    title: '新端口代理',
    port: '800',
    location: '/api/',
    proxyAddresses: [
      { url: 'http://localhost:8080', comment: '新地址', isActive: true }
    ],
    activeIndex: 0,
    description: '新代理规则',
    enabled: true
  })
}

// 删除代理规则
const removeProxyRule = (index) => {
  configForm.proxyRules.splice(index, 1)
}

// 设置激活的代理地址
const setActiveProxy = (rule, index) => {
  rule.activeIndex = index
 saveConfig()
 reloadConfig()
}

// 添加代理地址
const addProxyAddress = (rule) => {
  rule.proxyAddresses.push({
    url: 'http://localhost:8080',
    comment: '新地址',
    isActive: false
  })
}

// 删除代理地址
const removeProxyAddress = (rule, index) => {
  if (rule.proxyAddresses.length > 1) {
    rule.proxyAddresses.splice(index, 1)
    // 如果删除的是当前激活的地址，重置激活索引
    if (rule.activeIndex >= rule.proxyAddresses.length) {
      rule.activeIndex = 0
    }
  }
}

// 测试配置
const testConfig = async () => {
  testing.value = true
  error.value = ''
  success.value = ''
  
  try {
    const response = await testNginxConfig()
    if (response.success) {
      success.value = '配置测试成功: ' + response.message
    } else {
      error.value = response.message || '配置测试失败'
    }
  } catch (err) {
    error.value = '测试配置时发生错误: ' + err.message
  } finally {
    testing.value = false
  }
}

// 重载配置
const reloadConfig = async () => {
  reloading.value = true
  error.value = ''
  success.value = ''
  
  try {
    const response = await reloadNginxConfig()
    if (response.success) {
      success.value = '配置重载成功'
    } else {
      error.value = response.message || '重载配置失败'
    }
  } catch (err) {
    error.value = '重载配置时发生错误: ' + err.message
  } finally {
    reloading.value = false
  }
}

// 启动nginx
const startNginx = async () => {
  starting.value = true
  error.value = ''
  success.value = ''
  
  try {
    const response = await startNginxApi()
    if (response.success) {
      success.value = response.message || 'nginx启动成功'
    } else {
      error.value = response.message || '启动nginx失败'
    }
  } catch (err) {
    error.value = '启动nginx时发生错误: ' + err.message
  } finally {
    starting.value = false
  }
}

// 停止nginx
const stopNginx = async () => {
  stopping.value = true
  error.value = ''
  success.value = ''
  
  try {
    const response = await stopNginxApi()
    if (response.success) {
      success.value = response.message || 'nginx停止成功'
    } else {
      error.value = response.message || '停止nginx失败'
    }
  } catch (err) {
    error.value = '停止nginx时发生错误: ' + err.message
  } finally {
    stopping.value = false
  }
}

// 组件挂载时加载配置
onMounted(() => {
  loadConfig()
})

const logDialogVisible = ref(false)
const logContent = ref('')
const logPort = ref('')
const logType = ref('access')
const currentRow = ref()
const logViewMode = ref('table')
const parsedLog = ref([])

function formatNginxTime(str) {
  // 04/Jul/2025:15:59:41 +0800
  const m = str.match(/^(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})/)
  if (!m) return str
  const monthMap = {Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'}
  return `${m[3]}-${monthMap[m[2]]}-${m[1]} ${m[4]}:${m[5]}:${m[6]}`
}

function parseUA(ua) {
  let browser = '', os = '', engine = ''
  if (/Chrome\/.+Safari\/.+Edg\//.test(ua)) {
    browser = 'Edge'
  } else if (/Chrome\//.test(ua)) {
    browser = 'Chrome'
  } else if (/Firefox\//.test(ua)) {
    browser = 'Firefox'
  } else if (/Safari\//.test(ua)) {
    browser = 'Safari'
  }
  if (/Windows NT/.test(ua)) os = 'Windows'
  else if (/Mac OS X/.test(ua)) os = 'MacOS'
  else if (/Linux/.test(ua)) os = 'Linux'
  if (/AppleWebKit\//.test(ua)) engine = 'WebKit'
  else if (/Gecko\//.test(ua)) engine = 'Gecko'
  else if (/Trident\//.test(ua)) engine = 'Trident'
  return { browser, os, engine }
}

function parseNginxAccessLog(log) {
  const regex = /^(\S+) \S+ \S+ \[([^\]]+)] "(\S+) ([^\"]+) HTTP\/[\d.]+" (\d+) (\d+) "([^\"]*)" "([^\"]*)"/
  return log.split('\n').map(line => {
    const m = line.match(regex)
    if (!m) return null
    const uaInfo = parseUA(m[8])
    return {
      ip: m[1],
      time: formatNginxTime(m[2]),
      method: m[3],
      path: m[4],
      status: Number(m[5]),
      size: m[6],
      referer: m[7],
      ua: m[8],
      browser: uaInfo.browser,
      os: uaInfo.os,
      engine: uaInfo.engine
    }
  }).filter(Boolean).reverse()
}

const showLogDialog = async (row, type = 'access') => {
  logDialogVisible.value = true
  logPort.value = row.port
  logType.value = type
  currentRow.value = row
  logViewMode.value = 'raw'
  await fetchLog()
}

const fetchLog = async () => {
  logContent.value = '加载中...'
  try {
    const res = await getProxyLog(logPort.value, logType.value)
    if (res.success) {
      logContent.value = res.data || '(无内容)'
      if (logType.value === 'access') {
        parsedLog.value = parseNginxAccessLog(logContent.value)
      } else {
        parsedLog.value = []
      }
    } else {
      logContent.value = res.message || '日志读取失败'
      parsedLog.value = []
    }
  } catch (e) {
    logContent.value = '日志读取失败: ' + e.message
    parsedLog.value = []
  }
}

const handleLogDialogClose = () => {
  logDialogVisible.value = false
  logContent.value = ''
}

watch(logType, async () => {
  if (logDialogVisible.value) {
    await fetchLog()
  }
})

const clearLog = async (row) => {
  const port = row.port
  const res = await clearProxyLog(port, logType.value)
  if (res.success) {
    success.value = `端口${port}的${logType.value === 'access' ? '访问' : '错误'}日志已清除`
    if (logDialogVisible.value && logPort.value === port) {
      await fetchLog()
    }
  } else {
    error.value = res.message || '清除日志失败'
  }
}
</script>

<style scoped>
.proxy-container {
  height: 100%;
  overflow: auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.config-content {
  margin-bottom: 30px;
}

.config-preview {
  margin-top: 30px;
}

.config-preview h3 {
  margin-bottom: 15px;
  color: #303133;
}

.el-table {
  margin-bottom: 10px;
}

.el-form-item {
  margin-bottom: 20px;
}

.proxy-addresses {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.proxy-address-item {
  display: flex;
  gap: 5px;
  align-items: center;
}

.proxy-address-item .el-input {
  flex: 1;
}
</style> 