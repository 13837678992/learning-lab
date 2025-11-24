import request from './request'

// 获取代理配置
export const getProxyConfig = async () => {
  try {
    const response = await request.get('/api/proxy/config')
    return response
  } catch (error) {
    throw error
  }
}

// 保存代理配置
export const saveProxyConfig = async (data) => {
  try {
    const response = await request.post('/api/proxy/config', data)
    return response
  } catch (error) {
    throw error
  }
}

// 读取nginx配置文件
export const readNginxConfig = async (configPath) => {
  try {
    const response = await request.get('/api/proxy/read-config', {
      params: { configPath }
    })
    return response
  } catch (error) {
    throw error
  }
}

// 写入nginx配置文件
export const writeNginxConfig = async (configPath, content) => {
  try {
    const response = await request.post('/api/proxy/write-config', {
      configPath,
      content
    })
    return response
  } catch (error) {
    throw error
  }
}

// 测试nginx配置
export const testNginxConfig = async () => {
  try {
    const response = await request.post('/api/proxy/test-config')
    return response
  } catch (error) {
    throw error
  }
}

// 重载nginx配置
export const reloadNginxConfig = async () => {
  try {
    const response = await request.post('/api/proxy/reload-config')
    return response
  } catch (error) {
    throw error
  }
}

// 启动nginx
export const startNginx = async () => {
  try {
    const response = await request.post('/api/proxy/start-nginx')
    return response
  } catch (error) {
    throw error
  }
}

// 停止nginx
export const stopNginx = async () => {
  try {
    const response = await request.post('/api/proxy/stop-nginx')
    return response
  } catch (error) {
    throw error
  }
}

// 获取指定端口的日志内容
export const getProxyLog = async (port, type = 'access') => {
  try {
    const response = await request.get('/api/proxy/log', {
      params: { port, type }
    })
    return response
  } catch (error) {
    throw error
  }
}

export function clearProxyLog(port, type) {
  return request({
    url: '/api/proxy/clearLog',
    method: 'post',
    data: { port, type }
  })
} 