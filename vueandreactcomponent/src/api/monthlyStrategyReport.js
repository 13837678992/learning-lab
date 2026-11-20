import axios from 'axios'

export function getAvailableMonths(data) {
  return axios.post('/api/mr/months/available', data)
}

export function uploadReport(data) {
  return axios.post('/api/mr/reports/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } })
}

export function reparseReport(data) {
  return axios.post('/api/mr/reports/reparse', data)
}

export function getReportList(data) {
  return axios.post('/api/mr/reports/page', data)
}

export function getReportDetail(reportId) {
  return axios.get(`/api/mr/reports/${reportId}`)
}

export function saveReport(reportId, data) {
  return axios.put(`/api/mr/reports/${reportId}`, data)
}

export function publishReport(reportId, data) {
  return axios.post(`/api/mr/reports/${reportId}/publish`, data)
}

export function offlineReport(reportId, data) {
  return axios.post(`/api/mr/reports/${reportId}/offline`, data)
}

export function deleteReport(reportId, data) {
  return axios.delete(`/api/mr/reports/${reportId}`, { data })
}

export function getReportFile(reportId) {
  return axios.get(`/api/mr/reports/${reportId}/file`, { responseType: 'blob' })
}

export function resetReportDemo() {
  return axios.post('/api/mr/dev/reset', {})
}
