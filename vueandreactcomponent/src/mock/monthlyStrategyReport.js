import axios from 'axios'
import { REPORT_STATUS, cloneReportData, reportTitle, validateAssetList, formatTime, validMonth, getReportFileValidationError } from '../utils/monthlyStrategyReport'
import { getReportFilePageCount } from '../utils/monthlyReportFilePages'

const STORAGE_KEY = 'monthly-strategy-report-demo:v1'
const SCHEMA_VERSION = 1
const fileCache = new Map()
const parseTimers = new Map()


function points(contents) {
  return contents.map((content, index) => ({ seq: index + 1, content }))
}

// 确定性的示例投研文字，不读取上传文件内容，也不代表真实投研结论。
function createParsedAssets(pageCount) {
  const examples = [
    {
      assetType: 'A_SHARE',
      marketReview: {
        moduleTitle: '结构性修复延续，盈利线索成为配置焦点',
        pointList: points([
          '宽基指数呈现震荡修复特征，成交活跃度改善，资金在高股息与成长板块之间轮动。',
          '产业政策与企业盈利预期共同推动先进制造、算力基础设施等方向活跃，板块内部表现分化。',
          '金融与公用事业提供一定防御性，消费板块仍需观察需求恢复的持续性。'
        ])
      },
      outlook: {
        moduleTitle: '兼顾估值与现金流，分层布局中长期机会',
        pointList: points([
          '以盈利兑现和自由现金流为筛选线索，关注具备竞争优势的制造业龙头与稳健分红资产。',
          '对短期涨幅较大的主题保持仓位纪律，结合政策落地与财报验证分批调整组合。'
        ])
      }
    },
    {
      assetType: 'HK_STOCK',
      marketReview: {
        moduleTitle: '外部流动性改善，互联网与红利资产轮动',
        pointList: points([
          '港股受到海外利率预期与南向资金共同影响，互联网龙头的回购和利润改善受到关注。',
          '能源、电信等高分红板块表现相对稳健，地产链修复仍受基本面约束。'
        ])
      },
      outlook: {
        moduleTitle: '关注盈利改善，平衡成长与股息收益',
        pointList: points([
          '关注互联网平台的费用控制、商业化效率和股东回报，避免仅依据低估值进行配置。',
          '将现金流稳定的红利资产作为组合补充，评估分红的可持续性及汇率影响。',
          '跟踪海外利率和国内需求变化，控制单一行业集中度与市场波动敞口。'
        ])
      }
    },
    {
      assetType: 'US_STOCK',
      marketReview: {
        moduleTitle: '科技盈利提供支撑，高估值放大波动',
        pointList: points([
          '大型科技企业的盈利表现支撑指数，市场继续关注人工智能投入与收入转化的匹配程度。',
          '长端利率变化影响成长股估值，宏观数据公布前后市场波动有所增加。',
          '医疗、必需消费等防御板块表现与科技方向有所不同，行业轮动更为明显。',
          '部分中小盘企业面临融资成本压力，盈利质量与资产负债表差异值得重视。'
        ])
      },
      outlook: {
        moduleTitle: '重视盈利质量，降低集中持仓风险',
        pointList: points([
          '在科技配置中关注订单兑现和投入回报，结合估值水平审慎评估预期增长。',
          '通过行业分散和仓位管理应对利率与政策不确定性，避免过度集中于少数权重股。'
        ])
      }
    },
    {
      assetType: 'A_BOND',
      marketReview: {
        moduleTitle: '利率区间震荡，票息与久期贡献分化',
        pointList: points([
          '国内债市在流动性、供给节奏和经济预期之间寻找平衡，长端利率呈现区间波动。',
          '高等级信用债以票息贡献为主，信用利差压缩后进一步下行的空间需要谨慎评估。',
          '短端资产对资金价格较为敏感，跨月和集中发行阶段的流动性扰动有所增加。'
        ])
      },
      outlook: {
        moduleTitle: '以票息为基础，动态管理久期与流动性',
        pointList: points([
          '优先关注信用资质稳健、现金流清晰的发行主体，保持必要的流动性缓冲。',
          '根据利率波动和负债期限调整久期，避免在低收益率阶段过度放大杠杆。',
          '对中低评级资产坚持独立信用判断，不以短期利差收益替代风险评估。'
        ])
      }
    },
    {
      assetType: 'GOLD',
      marketReview: {
        moduleTitle: '实际利率与避险需求交织，金价波动加大',
        pointList: points([
          '黄金价格受到实际利率、美元走势及避险情绪共同影响，短期呈现高位震荡特征。',
          '央行购金和资产分散需求提供长期观察线索，但阶段性资金流动仍可能引发回撤。'
        ])
      },
      outlook: {
        moduleTitle: '发挥分散作用，以纪律应对价格波动',
        pointList: points([
          '将黄金作为组合分散工具，结合整体风险预算确定配置比例。',
          '持续跟踪实际利率与美元变化，区分短期交易因素和长期配置逻辑。',
          '在价格快速上涨后保持分批配置节奏，避免以近期收益外推未来表现。',
          '关注投资工具的费用、流动性和跟踪误差，并评估人民币汇率对收益的影响。'
        ])
      }
    }
  ]
  return examples.map((asset, index) => ({
    ...asset,
    marketReview: { ...asset.marketReview, sourcePage: Math.min(index * 4 + 2, pageCount || Infinity) },
    outlook: { ...asset.outlook, sourcePage: Math.min(index * 4 + 4, pageCount || Infinity) }
  }))
}

function createInitialStore() {
  const months = ['202610', '202609', '202608', '202607', '202606', '202605', '202604', '202603', '202602', '202601', '202512', '202511', '202510', '202509', '202508']
  const statuses = [REPORT_STATUS.PENDING, REPORT_STATUS.PUBLISHED, REPORT_STATUS.INVALID, REPORT_STATUS.FAILED]
  const records = months.map((month, index) => {
    const status = statuses[index % statuses.length]
    const assetList = status === REPORT_STATUS.FAILED ? [] : createParsedAssets()
    const updateTime = `${month.slice(0, 4)}-${month.slice(4)}-20 10:30:00`
    const published = [REPORT_STATUS.PUBLISHED, REPORT_STATUS.INVALID].includes(status)
    return {
      reportId: 10001 + index,
      reportMonth: month,
      reportName: reportTitle(month),
      status,
      version: 1,
      publishTime: published ? updateTime : null,
      updateTime,
      updateBy: '示例管理员',
      assetList,
      contentConfirmed: status !== REPORT_STATUS.FAILED,
      publishedSnapshot: published ? { assetList: cloneReportData(assetList), publishTime: updateTime, version: 1 } : null,
      fileMeta: {
        name: `${reportTitle(month)}${status === REPORT_STATUS.FAILED ? '_解析失败' : ''}.${index % 2 ? 'pdf' : 'pptx'}`,
        size: (index % 2 ? 6 : 18) * 1024 * 1024,
        extension: index % 2 ? 'pdf' : 'pptx',
        pageCount: status === REPORT_STATUS.FAILED ? null : (index % 2 ? 28 : 42),
        pageCountSource: 'MOCK'
      },
      parseAttempt: status === REPORT_STATUS.FAILED ? 1 : 0,
      parseError: status === REPORT_STATUS.FAILED ? '模拟解析失败：示例文件触发了首次解析异常，可点击重试恢复。' : '',
      parseDueAt: null,
      parseToken: null
    }
  })
  return { schemaVersion: SCHEMA_VERSION, nextId: 10016, records }
}


// 保留原存储键和结构；每次请求读取最新JSON，跨标签页也能检查version。
function saveStore(store) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store)) }
  catch (error) { fail('本地存储不可用或空间不足，数据未保存，请检查浏览器设置', '50001') }
}

function readStore() {
  let raw
  try { raw = window.localStorage.getItem(STORAGE_KEY) }
  catch (error) { fail('无法读取本地数据，请检查浏览器存储权限', '50001') }
  if (!raw) {
    const store = createInitialStore()
    saveStore(store)
    return store
  }
  try {
    const store = JSON.parse(raw)
    if (store.schemaVersion !== SCHEMA_VERSION || !Array.isArray(store.records)) throw new Error()
    return store
  } catch (error) { fail('本地示例数据格式异常，请使用「恢复初始示例数据」重置', '50002') }
}

function fail(message, code = '40000') {
  throw Object.assign(new Error(message), { code })
}

function touch(report, updateBy = '当前操作人') {
  report.version += 1
  report.updateTime = formatTime(new Date())
  report.updateBy = updateBy
}

function checkStatus(report, allowed, message) {
  if (!allowed.includes(report.status)) fail(message)
}

function reportData(report, detail = false) {
  const { reportId, reportMonth, reportName, status, publishTime, updateTime, updateBy, version, contentConfirmed, parseError } = report
  const summary = {
    reportId, reportMonth, reportName, status, publishTime, updateTime, updateBy, version, contentConfirmed, parseError,
    hasUnpublishedChanges: Boolean(report.publishedSnapshot && JSON.stringify(report.assetList) !== JSON.stringify(report.publishedSnapshot.assetList))
  }
  // readStore返回本次请求独立的JSON对象，不再重复深拷贝详情。
  return detail ? { ...summary, assetList: report.assetList, publishedSnapshot: report.publishedSnapshot, fileMeta: report.fileMeta, fileAvailable: fileCache.has(reportId), parseDueAt: report.parseDueAt } : summary
}

function completeParse(report) {
  const failed = /解析失败|fail/i.test(report.fileMeta.name) && report.parseAttempt === 1
  report.status = failed ? REPORT_STATUS.FAILED : REPORT_STATUS.PENDING
  report.parseError = failed ? '模拟解析失败：文件名触发了首次解析异常，未读取真实文件内容。点击重试可完成模拟解析。' : ''
  if (!failed) {
    report.assetList = createParsedAssets(report.fileMeta.pageCount)
    if (report.fileMeta.pageCountSource !== 'FILE') {
      report.fileMeta.pageCount = report.fileMeta.extension === 'pdf' ? 28 : 42
      report.fileMeta.pageCountSource = 'MOCK'
    }
  }
  report.contentConfirmed = false
  report.parseDueAt = null
  report.parseToken = null
  touch(report, '模拟解析服务')
}

function scheduleParse(report) {
  const { reportId, parseDueAt } = report
  if (parseTimers.has(reportId)) return
  parseTimers.set(reportId, setTimeout(() => {
    parseTimers.delete(reportId)
    try {
      const store = readStore()
      const current = store.records.find(item => item.reportId === reportId)
      if (current && current.status === REPORT_STATUS.PARSING && current.parseDueAt === parseDueAt) {
        completeParse(current)
        saveStore(store)
      }
    } catch (error) { /* 存储错误由下一次页面轮询显示；截止时间保留以便重试。 */ }
  }, Math.max(0, parseDueAt - Date.now())))
}

function resumeParsing(store) {
  let changed = false
  for (const report of store.records) {
    if (report.status !== REPORT_STATUS.PARSING) continue
    if (report.parseDueAt <= Date.now()) {
      clearTimeout(parseTimers.get(report.reportId))
      parseTimers.delete(report.reportId)
      completeParse(report)
      changed = true
    } else scheduleParse(report)
  }
  if (changed) saveStore(store)
  return store
}

function startParse(report) {
  report.status = REPORT_STATUS.PARSING
  report.contentConfirmed = false
  report.parseError = ''
  report.parseAttempt += 1
  report.parseDueAt = Date.now() + 3000
  report.parseToken = null
}

// 只有必要的有限计时器；刷新后从parseDueAt恢复，无请求scope或任务管理器。
export function clearParseTimers() {
  for (const timer of parseTimers.values()) clearTimeout(timer)
  parseTimers.clear()
}
if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('pagehide', clearParseTimers)

async function handleRequest(config, path) {
  const method = config.method.toUpperCase()
  const body = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data || {})
  if (path === '/api/mr/dev/reset' && method === 'POST') {
    if (process.env.NODE_ENV === 'production') fail('生产构建不提供开发数据重置接口', '40300')
    saveStore(createInitialStore())
    clearParseTimers()
    fileCache.clear()
    return { reset: true }
  }
  let store = resumeParsing(readStore())
  if (path === '/api/mr/months/available' && method === 'POST') {
    if (!Array.isArray(body.months) || body.months.length > 24 || !body.months.every(validMonth)) fail('月份必须为yyyyMM格式，每次最多查询24个月')
    return { months: body.months.map(month => ({ month, disabled: store.records.some(report => report.reportMonth === month) })) }
  }
  if (path === '/api/mr/reports/page' && method === 'POST') {
    const { reportMonth = '', status = '', pageNo = 1, pageSize = 10 } = body
    if (reportMonth && !validMonth(reportMonth)) fail('报告月份格式错误')
    if (status && !Object.values(REPORT_STATUS).includes(status)) fail('报告状态无效')
    if (!Number.isInteger(pageNo) || pageNo < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) fail('分页参数无效，每页条数须为1至100')
    const records = store.records.filter(report => (!reportMonth || report.reportMonth === reportMonth) && (!status || report.status === status))
      .sort((a, b) => b.reportMonth.localeCompare(a.reportMonth) || b.reportId - a.reportId)
    return { records: records.slice((pageNo - 1) * pageSize, pageNo * pageSize).map(report => reportData(report)), total: records.length, pageNo, pageSize }
  }
  if (path === '/api/mr/reports/upload' && method === 'POST') {
    if (!(config.data instanceof FormData)) fail('上传请求必须使用FormData')
    const reportMonth = config.data.get('reportMonth')
    const files = config.data.getAll('file')
    if (!validMonth(reportMonth)) fail('请选择有效的报告月份')
    if (files.length !== 1) fail('每份报告只能上传一个文件')
    const file = files[0]
    const error = getReportFileValidationError(file, true)
    if (error) fail(error)
    if (store.records.some(report => report.reportMonth === reportMonth)) fail('该月份已有报告，请删除符合条件的原记录后再上传', '40901')
    const pageCount = await getReportFilePageCount(file)
    // 文件读取异步等待后再次读取，避免同月份并行上传或覆盖另一标签页的更新。
    store = resumeParsing(readStore())
    if (store.records.some(report => report.reportMonth === reportMonth)) fail('该月份已有报告，请删除符合条件的原记录后再上传', '40901')
    const report = {
      reportId: store.nextId++, reportMonth, reportName: reportTitle(reportMonth), status: REPORT_STATUS.PARSING,
      version: 1, publishTime: null, updateTime: formatTime(new Date()), updateBy: '当前操作人',
      assetList: [], contentConfirmed: false, publishedSnapshot: null,
      fileMeta: { name: file.name, size: file.size, extension: file.name.split('.').pop().toLowerCase(), pageCount, pageCountSource: 'FILE' },
      parseAttempt: 0, parseError: '', parseDueAt: null, parseToken: null
    }
    startParse(report)
    store.records.push(report)
    saveStore(store)
    fileCache.set(report.reportId, file)
    scheduleParse(report)
    return reportData(report)
  }
  const reparse = path === '/api/mr/reports/reparse' && method === 'POST'
  const matched = path.match(/^\/api\/mr\/reports\/(\d+)(?:\/(publish|offline|file))?$/)
  if (!reparse && !matched) fail('模拟接口不存在', '40400')
  const report = store.records.find(item => item.reportId === Number(reparse ? body.reportId : matched[1]))
  if (!report) fail('报告不存在或已被删除，请刷新列表', '40400')
  const action = matched && matched[2]
  if (!reparse && !action && method === 'GET') return reportData(report, true)
  if (action === 'file' && method === 'GET') {
    const file = fileCache.get(report.reportId)
    if (!file) fail('原始文件二进制已不可用（示例记录或页面已刷新），请重新选择对应原文件进行本地预览', '41000')
    return file
  }
  if (report.version !== body.version) fail('数据已被其他操作修改，请刷新后重试', '40900')
  if (reparse) {
    if (report.reportMonth !== body.reportMonth) fail('报告月份与报告编号不一致')
    checkStatus(report, [REPORT_STATUS.PENDING, REPORT_STATUS.FAILED, REPORT_STATUS.INVALID], '当前状态不能重新解析；已发布报告请先下架，解析中请勿重复提交')
    startParse(report)
    touch(report)
    saveStore(store)
    scheduleParse(report)
    return reportData(report)
  }
  if (!action && method === 'PUT') {
    if (body.reportId !== report.reportId) fail('请求中的报告编号不一致')
    checkStatus(report, [REPORT_STATUS.PENDING, REPORT_STATUS.PUBLISHED, REPORT_STATUS.INVALID], '当前报告不能编辑保存，请等待解析成功')
    const error = validateAssetList(body.assetList, false)
    if (error) fail(error)
    report.assetList = cloneReportData(body.assetList)
    report.contentConfirmed = !validateAssetList(report.assetList)
    touch(report)
    saveStore(store)
    return reportData(report, true)
  }
  if (action === 'publish' && method === 'POST') {
    checkStatus(report, [REPORT_STATUS.PENDING, REPORT_STATUS.INVALID, REPORT_STATUS.PUBLISHED], '当前报告不能发布，请先完成解析和内容确认')
    const error = validateAssetList(report.assetList)
    if (error) fail(error)
    if (!report.contentConfirmed) fail('报告内容尚未确认，请先进入「编辑」核对五类观点并保存完整草稿')
    if (store.records.some(item => item.reportId !== report.reportId && item.reportMonth === report.reportMonth && item.status === REPORT_STATUS.PUBLISHED)) fail('同月份已有对客生效的报告，不能重复发布', '40901')
    report.status = REPORT_STATUS.PUBLISHED
    report.publishTime = formatTime(new Date())
    touch(report)
    report.publishedSnapshot = { assetList: cloneReportData(report.assetList), publishTime: report.publishTime, version: report.version }
    saveStore(store)
    return reportData(report, true)
  }
  if (action === 'offline' && method === 'POST') {
    checkStatus(report, [REPORT_STATUS.PUBLISHED], '仅已发布报告可以下架')
    report.status = REPORT_STATUS.INVALID
    touch(report)
    saveStore(store)
    return reportData(report)
  }
  if (!action && method === 'DELETE') {
    checkStatus(report, [REPORT_STATUS.PENDING, REPORT_STATUS.INVALID, REPORT_STATUS.FAILED], '已发布报告需先下架，解析中的报告不能删除')
    store.records = store.records.filter(item => item.reportId !== report.reportId)
    saveStore(store)
    fileCache.delete(report.reportId)
    return { reportId: report.reportId, version: report.version + 1, deleted: true }
  }
  fail('模拟接口不支持此请求方法', '40500')
}

// 一个明确入口，直接注册在API使用的axios实例；其他路径原样交还原adapter。
const originalAdapter = axios.defaults.adapter
axios.defaults.adapter = async config => {
  const path = new URL(config.url, 'http://monthly-mock.local').pathname
  if (!path.startsWith('/api/mr/')) return axios.getAdapter(originalAdapter)(config)
  await new Promise(resolve => setTimeout(resolve, path.endsWith('/upload') ? 650 : (config.method === 'get' ? 300 : 450)))
  let data
  try {
    const result = await handleRequest(config, path)
    data = result instanceof Blob ? result : { code: '00000', message: '成功', data: result }
  } catch (error) {
    const invalidJSON = error instanceof SyntaxError
    data = { code: error.code || (invalidJSON ? '40000' : '50000'), message: invalidJSON ? '请求数据格式错误' : (error.code ? error.message : '模拟请求处理失败，请刷新后重试'), data: null }
  }
  return { config, status: 200, statusText: 'OK', headers: { 'content-type': data instanceof Blob ? (data.type || 'application/octet-stream') : 'application/json' }, data }
}
