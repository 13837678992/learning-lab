# 月度策略报告 Demo 简化结果

当前结构是 Vue → API → Axios → 单文件 Mock。移除 `src/main.js` 的 `import './mock/monthlyStrategyReport'` 和该 Mock 文件后，API直接请求真实URL，无需改写Vue调用或删除其他分发层。

## 目录与删除项

```text
src/
  api/monthlyStrategyReport.js
  utils/monthlyStrategyReport.js
  mock/monthlyStrategyReport.js
  components/MonthlyStrategyReport.vue
  components/MonthlyStrategyReportPreview.vue   # 原有共用只读预览，保留
  utils/monthlyReportFilePages.js               # 原有真实页数统计，保留
  utils/monthlyReportPdfPages.js                # 原有本地PDF Worker，保留
  App.vue
  main.js
```

已删除仅供本模块使用的7个文件，以及空的Mock分层目录：

- `src/utils/request.js`
- `src/utils/errors.js`
- `src/mock/index.js`
- `src/mock/monthlyStrategyReport/index.js`
- `src/mock/monthlyStrategyReport/data.js`
- `src/mock/monthlyStrategyReport/handlers.js`
- `src/mock/monthlyStrategyReport/store.js`

没有新增Service、Repository、组件层级或依赖。App、依赖文件、Babel及Vue CLI配置保留现有内容，未覆盖其他业务修改，未执行commit或push。

## API与Utils

API直接导入axios，只有11个请求函数：`getAvailableMonths`、`uploadReport`、`reparseReport`、`getReportList`、`getReportDetail`、`saveReport`、`publishReport`、`offlineReport`、`deleteReport`、`getReportFile`、`resetReportDemo`。返回原始Axios Promise，不判断Mock、不校验业务状态、不解包响应。

URL、HTTP Method及请求体保持原约定。上传使用FormData；删除的version通过config.data传递；文件请求使用responseType: blob。真实服务可通过原有代理或axios.defaults.baseURL配置。

Utils仅保留REPORT_STATUS、STATUS_META、ASSET_TYPES、MODULE_TYPES和6个纯函数：`cloneReportData`、`reportTitle`、`validateAssetList`、`formatTime`、`validMonth`、`getReportFileValidationError`。移除了接口常量抽象；文件大小、月份显示及要点重排仍留在其实际使用的Vue方法中。

## Mock与页面

Mock为396行单文件，其中初始数据与五类示例观点直接合并自原data.js。接口处理、JSON读取保存、状态规则、version、已发布快照和文件缓存都在本文件中。列表使用filter、sort、slice；详情使用find；保存和状态变更直接更新记录；删除使用filter。

移除了注册管理器、scope管理、请求订阅、刷新通知桥接、独立错误模块、内存仓库后备、副本重复深拷贝和多次解析完成时的重复读写。只保留一个Axios adapter，它检查/api/mr/前缀，其他请求交还原adapter；没有创建额外Axios实例或响应拦截器。

存储键仍为`monthly-strategy-report-demo:v1`，schema仍为1，原JSON可直接读取。每次接口读取当前JSON以维持基本跨标签页version检查，上传等待文件页数后再次检查月份。File只在Map中缓存，JSON只保存元数据。模拟解析约3秒，有限计时器完成后删除；pagehide清理计时器，刷新后用既有parseDueAt恢复，不再使用请求scope或任务token管理。

Vue只导入API及实际工具。原API已经解包的数据改由本地readResponse方法读取，失败直接抛出普通Error并保留code。移除专用请求取消与订阅，跨标签页使用原生storage事件触发API刷新；保留文件读取的必要取消、轮询停止、事件移除和ObjectURL释放。

两个Vue文件的template与scoped style与修改前快照逐字节一致，Header同行、2:1布局、所有表单和按钮位置不变。

## 实测统计

| 统计口径 | 修改前 | 修改后 | 变化 |
| --- | ---: | ---: | ---: |
| src全部文件（含资源） | 42 | 36 | 减少6个 |
| 月度模块运行时文件（上述目录及此前专用文件） | 15 | 9 | 减少6个 |
| 上述运行时文件物理行数 | 3366 | 3143 | 减少223行 |
| 接口回归测试脚本行数 | 391 | 409 | 增加18行 |

运行时行数包含Vue模板、样式、注释与空行；不含测试、文档、依赖和构建产物。计入接口测试后净减少205行。测试增量用于保护旧JSON及解析任务兼容和错误协议，原请求订阅相关测试已删除。数字来自修改前快照和当前文件读取，并非磁盘中node_modules、dist等全部文件的统计。

## 验证

- `npm run build`通过，涉及文件ESLint及git diff --check通过。
- Node接口回归20项通过（顶层1项、子测试19项）：完整流程、快照隔离、version、同月唯一性、FormData、50MB、Blob、真实页数、旧JSON、刷新恢复、错误协议及删除Mock后访问真实HTTP服务。
- 浏览器15组检查通过，0页面运行错误，0真实/api/mr/网络请求，覆盖1366×768、1920×1080和1000px布局。
- 全项目lint仍有其他原有文件的4个错误：HelloWorld.vue的$未定义、export.js的3个未使用变量。未修改这些无关文件。
- 原main.js的mergeProps导出警告和包体积/Browserslist提示保留，不影响构建通过。

这仍是模拟观点Demo；真实总页数工具保留，观点所在页码仍是原有模拟数据。刷新保留报告与元数据，原二进制需重新选择。真实后端、PPTX在线渲染和服务端跨用户事务不属于此次简化范围。
