export const REPORT_STATUS = Object.freeze({
  PARSING: 'PARSING',
  PENDING: 'PENDING',
  PUBLISHED: 'PUBLISHED',
  INVALID: 'INVALID',
  FAILED: 'FAILED'
})

export const STATUS_META = Object.freeze({
  [REPORT_STATUS.PARSING]: { label: '草稿－解析中', shortLabel: '解析中', type: '' },
  [REPORT_STATUS.PENDING]: { label: '草稿－待确认', shortLabel: '待确认', type: 'warning' },
  [REPORT_STATUS.PUBLISHED]: { label: '已发布', shortLabel: '已发布', type: 'success' },
  [REPORT_STATUS.INVALID]: { label: '已失效', shortLabel: '已失效', type: 'info' },
  [REPORT_STATUS.FAILED]: { label: '解析失败', shortLabel: '解析失败', type: 'danger' }
})

export const ASSET_TYPES = Object.freeze([
  { type: 'A_SHARE', name: 'A股' },
  { type: 'HK_STOCK', name: '港股' },
  { type: 'US_STOCK', name: '美股' },
  { type: 'A_BOND', name: 'A债' },
  { type: 'GOLD', name: '黄金' }
])

export const MODULE_TYPES = Object.freeze([
  { key: 'marketReview', name: '市场回顾', icon: 'el-icon-data-line' },
  { key: 'outlook', name: '后市展望', icon: 'el-icon-s-opportunity' }
])

export function cloneReportData(value) {
  return JSON.parse(JSON.stringify(value))
}

export function reportTitle(month) {
  return `${month.slice(0, 4)}年${Number(month.slice(4))}月月度资产配置策略报告`
}

export function validateAssetList(assetList, requireContent = true) {
  if (!Array.isArray(assetList)) {
    return '请完整配置A股、港股、美股、A债、黄金五类资产'
  }
  for (const asset of ASSET_TYPES) {
    const matches = assetList.filter(item => item && item.assetType === asset.type)
    if (matches.length !== 1) return `${asset.name}资产缺失或重复，请刷新后重试`
    for (const section of MODULE_TYPES) {
      const module = matches[0][section.key]
      const prefix = `${asset.name} · ${section.name}`
      if (!module || typeof module.moduleTitle !== 'string' || !Array.isArray(module.pointList)) {
        return `${prefix}的板块结构不完整`
      }
      if (requireContent && !module.moduleTitle.trim()) return `${prefix}的板块标题不能为空`
      if (requireContent && module.pointList.length === 0) return `${prefix}至少需要一条非空要点`
      for (let index = 0; index < module.pointList.length; index += 1) {
        const point = module.pointList[index]
        if (!point || point.seq !== index + 1) {
          return `${prefix}的要点序号必须从1开始连续排列，不能重复`
        }
        if (typeof point.content !== 'string' || (requireContent && !point.content.trim())) {
          return `${prefix}的要点${index + 1}不能为空`
        }
      }
    }
  }
  if (assetList.length !== ASSET_TYPES.length) return '仅允许配置A股、港股、美股、A债、黄金五类资产，请移除未知资产'
  return ''
}

export function formatTime(date) {
  const pad = value => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function validMonth(month) {
  return typeof month === 'string' && /^\d{4}(0[1-9]|1[0-2])$/.test(month) && Number(month.slice(0, 4)) >= 1900 && Number(month.slice(0, 4)) <= 9999
}

// 返回错误文字，调用方分别负责表单提示或模拟服务端拒绝请求。
export function getReportFileValidationError(file, requireBlob = false) {
  if (requireBlob && (typeof Blob === 'undefined' || !(file instanceof Blob) || typeof file.name !== 'string')) {
    return '请选择一个有效的PPTX或PDF文件'
  }
  if (!file || !/\.(pptx|pdf)$/i.test(file.name || '')) return '仅支持PPTX或PDF格式的报告文件'
  if (file.size === 0) return '报告文件不能为空，请重新选择'
  if (file.size > 50 * 1024 * 1024) return '报告文件不能超过50MB'
  return ''
}
