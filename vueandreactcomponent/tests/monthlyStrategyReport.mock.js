// 运行：node --test tests/monthlyStrategyReport.mock.js
// 使用项目已有Babel和Node内置测试工具，不增加测试依赖。
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const { File } = require('node:buffer')
const http = require('node:http')
const babel = require('@babel/core')
const axios = require('axios')
const { parse } = require('@babel/parser')
const { createPdf, createPptx } = require('./monthlyStrategyReport.fixtures')

const entries = new Map()
const browserEvents = new EventTarget()
global.window = {
  addEventListener: browserEvents.addEventListener.bind(browserEvents),
  removeEventListener: browserEvents.removeEventListener.bind(browserEvents),
  dispatchEvent: browserEvents.dispatchEvent.bind(browserEvents),
  localStorage: {
    getItem: key => entries.has(key) ? entries.get(key) : null,
    setItem: (key, value) => entries.set(key, value),
    removeItem: key => entries.delete(key)
  }
}

function loadMock() {
  // 独立源码缓存模拟刷新；API和Mock直接共用axios，临时恢复adapter仅供测试。
  const modules = new Map()
  function load(filename) {
    if (modules.has(filename)) return modules.get(filename).exports
    const loaded = new Module(filename, module)
    loaded.paths = Module._nodeModulePaths(path.dirname(filename))
    modules.set(filename, loaded)
    const originalRequire = loaded.require.bind(loaded)
    loaded.require = name => {
      if (!name.startsWith('.')) return originalRequire(name)
      let target = path.resolve(path.dirname(filename), name)
      if (!path.extname(target)) target = fs.existsSync(target + '.js') ? target + '.js' : path.join(target, 'index.js')
      return load(target)
    }
    const code = babel.transformSync(fs.readFileSync(filename, 'utf8'), { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code
    loaded._compile(code, filename)
    return loaded.exports
  }
  const src = name => load(path.resolve(__dirname, '../src', name))
  const originalAdapter = axios.defaults.adapter
  const mock = src('mock/monthlyStrategyReport.js')
  return {
    ...src('utils/monthlyStrategyReport.js'),
    api: src('api/monthlyStrategyReport.js'),
    monthlyReportHttp: axios,
    MONTHLY_MOCK_STORAGE_KEY: 'monthly-strategy-report-demo:v1',
    dispose() {
      mock.clearParseTimers()
      window.removeEventListener('pagehide', mock.clearParseTimers)
      axios.defaults.adapter = originalAdapter
    }
  }
}

function uploadData(month, file = new File([createPdf()], '月度报告.pdf', { type: 'application/pdf' })) {
  const data = new FormData()
  data.append('reportMonth', month)
  data.append('file', file)
  return data
}


function readResponse(response) {
  const result = response.data
  if (result instanceof Blob) return result
  if (result.code !== '00000') throw Object.assign(new Error(result.message), { code: result.code })
  return result.data
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

test('月度策略报告：通过Axios验证接口、状态流转、持久化及乐观锁', async t => {
  let mock = loadMock()
  let api = mock.api
  const states = mock.REPORT_STATUS
  t.after(() => mock.dispose())
  await api.resetReportDemo().then(readResponse)
  let created

  await t.test('既有JSON数据直接兼容，旧解析截止时间恢复且保留已发布快照', async () => {
    const raw = entries.get(mock.MONTHLY_MOCK_STORAGE_KEY)
    const legacy = JSON.parse(raw)
    const record = legacy.records.find(report => report.status === states.INVALID)
    const snapshot = mock.cloneReportData(record.publishedSnapshot)
    record.status = states.PARSING
    record.version = 7
    record.parseAttempt = 2
    record.parseDueAt = Date.now() - 1000
    record.parseToken = '上一版保存的任务标识'
    entries.set(mock.MONTHLY_MOCK_STORAGE_KEY, JSON.stringify(legacy))
    try {
      const restored = await api.getReportDetail(record.reportId).then(readResponse)
      assert.equal(restored.status, states.PENDING)
      assert.equal(restored.version, 8)
      assert.equal(restored.contentConfirmed, false)
      assert.deepEqual(restored.publishedSnapshot, snapshot)
    } finally { entries.set(mock.MONTHLY_MOCK_STORAGE_KEY, raw) }
  })

  await t.test('保留JSON格式错误的统一中文响应', async () => {
    const response = await axios.post('/api/mr/reports/page', '{无效JSON')
    assert.equal(response.data.code, '40000')
    assert.equal(response.data.message, '请求数据格式错误')
  })

  await t.test('结构简化：API直接调用axios，只有一个Mock入口且无专用请求工具', () => {
    const apiFile = path.resolve(__dirname, '../src/api/monthlyStrategyReport.js')
    const ast = parse(fs.readFileSync(apiFile, 'utf8'), { sourceType: 'module' })
    const functions = ast.program.body.filter(node => node.type === 'ExportNamedDeclaration')
    assert.equal(functions.length, 11)
    for (const { declaration } of functions) {
      assert.equal(declaration.type, 'FunctionDeclaration')
      assert.equal(declaration.body.body.length, 1)
      assert.equal(declaration.body.body[0].type, 'ReturnStatement')
      assert.equal(declaration.body.body[0].argument.callee.object.name, 'axios')
    }
    for (const file of ['MonthlyStrategyReport.vue', 'MonthlyStrategyReportPreview.vue']) {
      const source = fs.readFileSync(path.resolve(__dirname, '../src/components', file), 'utf8')
      assert.doesNotMatch(source, /from\s+['"][^'"]*\/mock/)
      assert.doesNotMatch(source, /localStorage|MONTHLY_MOCK_STORAGE_KEY/)
    }
    for (const name of ['mock/index.js', 'mock/monthlyStrategyReport', 'utils/request.js', 'utils/errors.js']) assert.equal(fs.existsSync(path.resolve(__dirname, '../src', name)), false)
    assert.equal(fs.existsSync(path.resolve(__dirname, '../src/mock/monthlyStrategyReport.js')), true)
  })

  await t.test('API返回原Axios Promise，保留全部协议和参数，Blob通过response.data读取', async () => {
    const client = mock.monthlyReportHttp
    const adapter = client.defaults.adapter
    const data = Object.freeze({ reportId: 10001, version: -1, assetList: Object.freeze([]) })
    const months = Object.freeze({ months: Object.freeze(['202612']) })
    const form = uploadData('202612')
    const inputs = [
      ['getAvailableMonths', [months], 'post', '/api/mr/months/available', months],
      ['uploadReport', [form], 'post', '/api/mr/reports/upload', form],
      ['reparseReport', [data], 'post', '/api/mr/reports/reparse', data],
      ['getReportList', [data], 'post', '/api/mr/reports/page', data],
      ['getReportDetail', [10001], 'get', '/api/mr/reports/10001'],
      ['saveReport', [10001, data], 'put', '/api/mr/reports/10001', data],
      ['publishReport', [10001, data], 'post', '/api/mr/reports/10001/publish', data],
      ['offlineReport', [10001, data], 'post', '/api/mr/reports/10001/offline', data],
      ['deleteReport', [10001, data], 'delete', '/api/mr/reports/10001', data],
      ['getReportFile', [10001], 'get', '/api/mr/reports/10001/file'],
      ['resetReportDemo', [], 'post', '/api/mr/dev/reset', {}]
    ]
    try {
      for (const [name, args, method, url, expectedData] of inputs) {
        let captured
        const blob = new Blob(['文件流'])
        client.defaults.adapter = async config => {
          captured = config
          return { config, status: 200, statusText: 'OK', headers: {}, data: name === 'getReportFile' ? blob : { code: '00000', message: '成功', data: { success: true } } }
        }
        const promise = api[name](...args)
        assert.equal(typeof promise.then, 'function')
        const result = await promise
        assert.equal(captured.method, method)
        assert.equal(captured.url, url)
        if (expectedData instanceof FormData) {
          assert.equal(captured.data, form)
          assert.match(captured.headers.get('Content-Type'), /multipart\/form-data/)
        } else if (expectedData) assert.deepEqual(JSON.parse(captured.data), expectedData)
        else assert.equal(captured.data, undefined)
        if (name === 'getReportFile') {
          assert.equal(captured.responseType, 'blob')
          assert.equal(result.data, blob)
        }
      }
      assert.equal(data.version, -1)
      assert.deepEqual(months.months, ['202612'])
    } finally { client.defaults.adapter = adapter }
  })

  await t.test('月份接口保留入参顺序，并使用全部记录判断占用', async () => {
    const response = await mock.monthlyReportHttp.post('/api/mr/months/available', { months: ['202612', '202608', '202610', '202608'] })
    assert.equal(response.data.code, '00000')
    assert.deepEqual(response.data.data.months, [
      { month: '202612', disabled: false }, { month: '202608', disabled: true },
      { month: '202610', disabled: true }, { month: '202608', disabled: true }
    ])
    await assert.rejects(api.getAvailableMonths({ months: ['202613'] }).then(readResponse), /月份必须/)
    await assert.rejects(api.getAvailableMonths({ months: Array(25).fill('202601') }).then(readResponse), /最多查询24/)
  })

  await t.test('列表月份和状态筛选、真实分页与页大小', async () => {
    const first = await api.getReportList({ pageNo: 1, pageSize: 10 }).then(readResponse)
    const second = await api.getReportList({ pageNo: 2, pageSize: 10 }).then(readResponse)
    assert.equal(first.total, 15)
    assert.equal(first.records.length, 10)
    assert.equal(second.records.length, 5)
    assert.equal(new Set([...first.records, ...second.records].map(record => record.reportId)).size, 15)
    assert.equal((await api.getReportList({ pageSize: 5 }).then(readResponse)).records.length, 5)
    const byMonth = await api.getReportList({ reportMonth: '202610' }).then(readResponse)
    assert.equal(byMonth.total, 1)
    assert.equal(byMonth.records[0].reportMonth, '202610')
    const published = await api.getReportList({ status: states.PUBLISHED }).then(readResponse)
    assert.ok(published.total > 0)
    assert.ok(published.records.every(record => record.status === states.PUBLISHED))
  })

  await t.test('上传使用FormData，拒绝非法扩展名、空文件、超50MB、多文件及重复月份', async () => {
    await assert.rejects(api.uploadReport({ reportMonth: '202612', file: '错误数据' }).then(readResponse), /FormData/)
    await assert.rejects(api.uploadReport(uploadData('202612', new File(['内容'], '报告.docx'))).then(readResponse), /仅支持/)
    await assert.rejects(api.uploadReport(uploadData('202612', new File([], '空报告.pdf'))).then(readResponse), /不能为空/)
    await assert.rejects(api.uploadReport(uploadData('202612', new File(['伪造PDF'], '损坏报告.pdf'))).then(readResponse), /文件可能已损坏/)
    await assert.rejects(api.uploadReport(uploadData('202612', new File(['不是ZIP'], '损坏报告.pptx'))).then(readResponse), /文件可能已损坏/)
    await assert.rejects(api.uploadReport(uploadData('202612', new File([new Uint8Array(50 * 1024 * 1024 + 1)], '超大报告.pdf'))).then(readResponse), /不能超过50MB/)
    const multiple = uploadData('202612')
    multiple.append('file', new File(['内容'], '第二个.pptx'))
    await assert.rejects(api.uploadReport(multiple).then(readResponse), /只能上传一个/)
    await assert.rejects(api.uploadReport(uploadData('202610')).then(readResponse), /该月份已有报告/)
    created = await api.uploadReport(uploadData('202612')).then(readResponse)
    assert.equal(created.status, states.PARSING)
    assert.equal(created.version, 1)
    await assert.rejects(api.uploadReport(uploadData('202612')).then(readResponse), /该月份已有报告/)
  })

  await t.test('解析中禁止重复解析、删除、编辑保存和发布', async () => {
    await assert.rejects(api.reparseReport({ reportId: created.reportId, reportMonth: '202612', version: created.version }).then(readResponse), /当前状态不能重新解析/)
    await assert.rejects(api.deleteReport(created.reportId, { version: created.version }).then(readResponse), /解析中的报告不能删除/)
    await assert.rejects(api.saveReport(created.reportId, { reportId: created.reportId, version: created.version, assetList: [] }).then(readResponse), /当前报告不能编辑保存/)
    await assert.rejects(api.publishReport(created.reportId, { version: created.version }).then(readResponse), /当前报告不能发布/)
  })

  await t.test('异步解析生成完整五类资产与不同数量要点，自动更新版本', async () => {
    await wait(3300)
    created = await api.getReportDetail(created.reportId).then(readResponse)
    assert.equal(created.status, states.PENDING)
    assert.equal(created.version, 2)
    assert.equal(mock.validateAssetList(created.assetList), '')
    const counts = created.assetList.flatMap(asset => mock.MODULE_TYPES.map(section => asset[section.key].pointList.length))
    assert.ok(counts.every(count => count >= 2 && count <= 4))
    assert.ok(new Set(counts).size > 1)
    assert.equal(created.fileMeta.pageCountSource, 'FILE')
    assert.equal(created.fileMeta.pageCount, 3)
    assert.ok(created.assetList.every(asset => mock.MODULE_TYPES.every(section => asset[section.key].sourcePage <= 3)))
    assert.ok(created.fileAvailable)
    assert.ok((await api.getReportFile(created.reportId).then(readResponse)) instanceof Blob)
    await assert.rejects(api.publishReport(created.reportId, { version: created.version }).then(readResponse), /尚未确认/)
  })

  await t.test('不完整草稿可保存，但前后端均阻止发布并给出具体资产板块', async () => {
    const assets = mock.cloneReportData(created.assetList)
    assets[1].outlook.moduleTitle = '   '
    assert.match(mock.validateAssetList(assets), /港股 · 后市展望的板块标题不能为空/)
    created = await api.saveReport(created.reportId, { reportId: created.reportId, version: created.version, assetList: assets }).then(readResponse)
    assert.equal(created.contentConfirmed, false)
    await assert.rejects(api.publishReport(created.reportId, { version: created.version }).then(readResponse), /港股 · 后市展望/)
    const missing = assets.slice(1)
    assert.match(mock.validateAssetList(missing), /A股资产缺失/)
    const duplicate = mock.cloneReportData(assets)
    duplicate[0].marketReview.pointList[1].seq = 1
    await assert.rejects(api.saveReport(created.reportId, { reportId: created.reportId, version: created.version, assetList: duplicate }).then(readResponse), /序号/)
    assets[1].outlook.moduleTitle = '港股后市展望验收标题'
    assets[0].marketReview.moduleTitle = '保存与快照隔离验收标题'
    created = await api.saveReport(created.reportId, { reportId: created.reportId, version: created.version, assetList: assets }).then(readResponse)
    assert.equal(created.contentConfirmed, true)
    assert.equal(created.status, states.PENDING)
    assert.equal(created.publishedSnapshot, null)
  })

  await t.test('连续写操作更新版本，旧版本保存、发布、下架、删除、重解析全部报冲突', async () => {
    const old = created.version - 1
    const conflict = error => error.code === '40900' && error.message === '数据已被其他操作修改，请刷新后重试'
    await assert.rejects(api.saveReport(created.reportId, { reportId: created.reportId, version: old, assetList: created.assetList }).then(readResponse), conflict)
    await assert.rejects(api.publishReport(created.reportId, { version: old }).then(readResponse), conflict)
    await assert.rejects(api.offlineReport(created.reportId, { version: old }).then(readResponse), conflict)
    await assert.rejects(api.deleteReport(created.reportId, { version: old }).then(readResponse), conflict)
    await assert.rejects(api.reparseReport({ reportId: created.reportId, reportMonth: created.reportMonth, version: old }).then(readResponse), conflict)
    const results = await Promise.allSettled([
      api.saveReport(created.reportId, { reportId: created.reportId, version: created.version, assetList: created.assetList }).then(readResponse),
      api.saveReport(created.reportId, { reportId: created.reportId, version: created.version, assetList: created.assetList }).then(readResponse)
    ])
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1)
    assert.equal(results.find(result => result.status === 'rejected').reason.code, '40900')
    created = await api.getReportDetail(created.reportId).then(readResponse)
  })

  await t.test('发布生成独立快照，已发布不能删除，后续草稿保存不影响快照', async () => {
    created = await api.publishReport(created.reportId, { version: created.version }).then(readResponse)
    assert.equal(created.status, states.PUBLISHED)
    const snapshot = mock.cloneReportData(created.publishedSnapshot)
    await assert.rejects(api.deleteReport(created.reportId, { version: created.version }).then(readResponse), /已发布报告需先下架/)
    const assets = mock.cloneReportData(created.assetList)
    assets[0].marketReview.moduleTitle = '只存在于未发布草稿的修改'
    created = await api.saveReport(created.reportId, { reportId: created.reportId, version: created.version, assetList: assets }).then(readResponse)
    assert.equal(created.status, states.PUBLISHED)
    assert.equal(created.hasUnpublishedChanges, true)
    assert.deepEqual(created.publishedSnapshot, snapshot)
    await assert.rejects(api.reparseReport({ reportId: created.reportId, reportMonth: created.reportMonth, version: created.version }).then(readResponse), /已发布报告请先下架/)
  })

  await t.test('下架、重新上架更新状态；重新发布后才应用编辑内容', async () => {
    const offline = await api.offlineReport(created.reportId, { version: created.version }).then(readResponse)
    assert.equal(offline.status, states.INVALID)
    created = await api.publishReport(created.reportId, { version: offline.version }).then(readResponse)
    assert.equal(created.status, states.PUBLISHED)
    assert.equal(created.publishedSnapshot.assetList[0].marketReview.moduleTitle, '只存在于未发布草稿的修改')
    assert.equal(created.hasUnpublishedChanges, false)
  })

  await t.test('刷新保留草稿及快照，原始二进制缺失时返回明确错误', async () => {
    mock.dispose()
    mock = loadMock()
    api = mock.api
    created = await api.getReportDetail(created.reportId).then(readResponse)
    assert.equal(created.assetList[0].marketReview.moduleTitle, '只存在于未发布草稿的修改')
    assert.equal(created.status, states.PUBLISHED)
    assert.equal(created.fileAvailable, false)
    assert.equal(created.fileMeta.pageCount, 3)
    assert.equal(created.fileMeta.pageCountSource, 'FILE')
    await assert.rejects(api.getReportFile(created.reportId).then(readResponse), error => error.code === '41000' && /重新选择/.test(error.message))
    const stored = JSON.parse(entries.get(mock.MONTHLY_MOCK_STORAGE_KEY))
    assert.equal(typeof stored.records.find(record => record.reportId === created.reportId).fileMeta.name, 'string')
    assert.equal(entries.get(mock.MONTHLY_MOCK_STORAGE_KEY).includes('blob:'), false)
  })

  await t.test('失效报告重新解析保留旧快照，新观点必须重新确认', async () => {
    const offline = await api.offlineReport(created.reportId, { version: created.version }).then(readResponse)
    const snapshot = (await api.getReportDetail(created.reportId).then(readResponse)).publishedSnapshot
    const parsing = await api.reparseReport({ reportId: created.reportId, reportMonth: created.reportMonth, version: offline.version }).then(readResponse)
    assert.equal(parsing.status, states.PARSING)
    await wait(3300)
    created = await api.getReportDetail(created.reportId).then(readResponse)
    assert.equal(created.status, states.PENDING)
    assert.equal(created.contentConfirmed, false)
    assert.equal(created.fileMeta.pageCount, 3)
    assert.equal(created.fileMeta.pageCountSource, 'FILE')
    assert.deepEqual(created.publishedSnapshot, snapshot)
    await assert.rejects(api.publishReport(created.reportId, { version: created.version }).then(readResponse), /尚未确认/)
    const removed = await api.deleteReport(created.reportId, { version: created.version }).then(readResponse)
    assert.equal(removed.deleted, true)
    assert.equal(removed.version, created.version + 1)
    assert.equal((await api.getAvailableMonths({ months: ['202612'] }).then(readResponse)).months[0].disabled, false)
  })

  await t.test('确定性解析失败、失败重试成功；停止计时器并重新加载后恢复解析', async () => {
    let failed = await api.uploadReport(uploadData('202611', new File([await createPptx()], '解析失败测试.pptx'))).then(readResponse)
    await wait(3300)
    failed = await api.getReportDetail(failed.reportId).then(readResponse)
    assert.equal(failed.status, states.FAILED)
    assert.match(failed.parseError, /首次解析异常/)
    const parsing = await api.reparseReport({ reportId: failed.reportId, reportMonth: failed.reportMonth, version: failed.version }).then(readResponse)
    assert.equal(parsing.status, states.PARSING)
    mock.dispose()
    await wait(3300)
    mock = loadMock()
    api = mock.api
    failed = await api.getReportDetail(failed.reportId).then(readResponse)
    assert.equal(failed.status, states.PENDING)
    assert.equal(failed.fileMeta.pageCount, 4)
    assert.equal(failed.fileMeta.pageCountSource, 'FILE')
    assert.equal(mock.validateAssetList(failed.assetList), '')
  })

  await t.test('异步读取页数后重新检查月份唯一性，并保留不同月份的并行上传', async () => {
    const sameMonth = await Promise.allSettled([
      api.uploadReport(uploadData('202703', new File([createPdf(5)], '五页.pdf'))).then(readResponse),
      api.uploadReport(uploadData('202703', new File([createPdf(7)], '七页.pdf'))).then(readResponse)
    ])
    assert.equal(sameMonth.filter(result => result.status === 'fulfilled').length, 1)
    assert.equal(sameMonth.find(result => result.status === 'rejected').reason.code, '40901')
    const results = await Promise.all([
      api.uploadReport(uploadData('202701', new File([createPdf(6)], '六页.pdf'))).then(readResponse),
      api.uploadReport(uploadData('202702', new File([await createPptx(12)], '十二页.pptx'))).then(readResponse)
    ])
    const details = await Promise.all(results.map(report => api.getReportDetail(report.reportId).then(readResponse)))
    assert.deepEqual(details.map(report => report.fileMeta.pageCount), [6, 12])
    assert.equal(new Set(details.map(report => report.reportId)).size, 2)
    assert.ok(details.every(report => report.fileMeta.pageCountSource === 'FILE'))
  })

  await t.test('仅拦截/api/mr/，其他Axios请求使用正常适配器', async () => {
    const server = http.createServer((req, res) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ existing: true, path: req.url })) })
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    try {
      const response = await mock.monthlyReportHttp.get(`http://127.0.0.1:${server.address().port}/existing-api`)
      assert.deepEqual(response.data, { existing: true, path: '/existing-api' })
    } finally { await new Promise(resolve => server.close(resolve)) }
  })

  await t.test('移除Mock后同一API直接请求实际URL，不修改Vue或接口方法', async () => {
    mock.dispose()
    const server = http.createServer((req, res) => {
      let body = ''
      req.on('data', chunk => { body += chunk })
      req.on('end', () => {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ code: '00000', message: '成功', data: { method: req.method, url: req.url, body: JSON.parse(body) } }))
      })
    })
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    const originalBaseURL = axios.defaults.baseURL
    axios.defaults.baseURL = `http://127.0.0.1:${server.address().port}`
    try {
      const data = Object.freeze({ pageNo: 2, pageSize: 5 })
      const result = await api.getReportList(data).then(readResponse)
      assert.deepEqual(result, { method: 'POST', url: '/api/mr/reports/page', body: data })
      assert.deepEqual(data, { pageNo: 2, pageSize: 5 })
    } finally { axios.defaults.baseURL = originalBaseURL; await new Promise(resolve => server.close(resolve)) }
  })
})
