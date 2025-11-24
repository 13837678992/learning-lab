import request from './request'

// 执行命令
export function executeCommand(command) {
  return request({
    url: '/api/command/execute',
    method: 'post',
    data: {
      command
    }
  })
}

// 获取所有命令记录
export function getRecords() {
  return request({
    url: '/api/command/records',
    method: 'get'
  })
}

// 获取单个命令记录
export function getRecord(id) {
  return request({
    url: `/api/command/records/${id}`,
    method: 'get'
  })
}

// 清空所有记录
export function clearRecords() {
  return request({
    url: '/api/command/records',
    method: 'delete'
  })
}