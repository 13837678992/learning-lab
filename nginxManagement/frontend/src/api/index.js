import request from '../api/request'

// 定义接口
export const getNginxInfo = async () => {
  try {
    const response = await request.get('/api/nginx/info')
    return response
  } catch (error) {
    throw error
  }
}
