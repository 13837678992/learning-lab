# 月度策略报告 Demo 交付与验收

## 文件与项目现状

检查时项目已经安装 Vue **2.7.16**（package.json 声明 ^2.6.14）、Element UI **2.15.14**、Axios **1.21.1**。`src/main.js` 已通过 `Vue.use(ElementUI)` 全局注册组件与中文主题；API现在直接使用原有Axios。功能采用 Vue2 Options API、JavaScript，没有新增路由。此前按页数需求新增 PDF.js **3.11.174**，将已有间接依赖 JSZip **3.10.1** 补为直接依赖，用于真实文件总页数统计。

当前已将上一轮分层简化为API、Utils、单文件Mock和页面，详见 [简化说明](./monthly-strategy-report-refactor.md)。页面模板与样式保持不变。

工作区原先已有本功能的未提交文件与 App 入口；本次沿用实现并完成检查、修复和验收，没有覆盖其他未提交改动。

| 文件 | 作用与本次处理 |
| --- | --- |
| `src/components/MonthlyStrategyReport.vue` | 四个业务视图、实时编辑、统一 Header、发布确认、版本冲突、文件预览；修复年份面板入口禁选和上传并发提交防护 |
| `src/components/MonthlyStrategyReportPreview.vue` | 确认页与对客预览共用的只读展示组件和 scoped 样式，沿用现有实现 |
| `src/api/monthlyStrategyReport.js` | 11个纯请求封装函数，覆盖I-01～I-10及开发恢复接口 |
| `src/mock/monthlyStrategyReport.js` | 单文件保存初始数据、模拟接口、解析、状态、快照和JSON持久化，只拦截/api/mr/ |
| `src/utils/monthlyStrategyReport.js` | 业务枚举、必要纯函数校验和格式处理；不含请求、存储或任务 |
| `src/utils/monthlyReportFilePages.js` | 异步统计真实PDF/PPTX页数，缓存成功结果，中文错误与取消处理 |
| `src/utils/monthlyReportPdfPages.js` | PDF.js本地Worker配置与文档、Worker资源释放，按需加载 |
| `babel.config.js` | 仅为pdfjs-dist启用私有方法转换，匹配现有Babel配置，未改变其他文件的编译规则 |
| `package.json`、`package-lock.json` | 添加PDF.js和JSZip直接依赖，复用并声明@babel/plugin-transform-private-methods 7.24.7开发依赖，核心依赖未升级 |
| `src/App.vue` | 已直接引入并渲染 MonthlyStrategyReport，沿用此入口 |
| `tests/monthlyStrategyReport.mock.js` | Axios 接口与业务一致性回归测试；原 `.cjs` 文件改为 `.js`，使 Vue CLI 默认 lint 能识别 tests 目录 |
| `tests/monthlyStrategyReport.browser.js` | 新增浏览器交互与布局验收脚本，使用独立浏览器上下文 |
| `tests/monthlyStrategyReport.fixtures.js` | 有效PDF页树、PPTX幻灯片压缩包测试样例，避免用伪文件验证真实页数 |
| `docs/monthly-strategy-report-demo.md` | 新增运行、接口、状态与逐项验收说明 |

未修改其他业务组件、public/index.html、Vue Router或Vue CLI配置。本次简化仅将 `src/main.js` 的Mock启动导入改为唯一单文件入口，未修改依赖或Babel配置；上述依赖和Babel变更是此前页数功能的已有修改。工作区已有手动修改予以保留。未执行 Git commit 或 push。

## 运行与复测

```sh
npm run serve -- --host 127.0.0.1 --port 8088
# 浏览器访问 http://127.0.0.1:8088

npm run build
node --test tests/monthlyStrategyReport.mock.js

# 本功能独立检查
npx --no-install eslint src/main.js src/api/monthlyStrategyReport.js src/mock/monthlyStrategyReport.js src/utils src/components/MonthlyStrategyReport.vue src/components/MonthlyStrategyReportPreview.vue tests/monthlyStrategyReport.mock.js tests/monthlyStrategyReport.browser.js tests/monthlyStrategyReport.fixtures.js
```

浏览器验收工具未加入项目依赖。可复用本机现有 Playwright，或独立安装到临时目录（当前 Node 18 环境已使用 1.56.1）：

```sh
npm install --prefix /tmp/monthly-report-browser --no-save --package-lock=false playwright-core@1.56.1
MR_PLAYWRIGHT_MODULE=/tmp/monthly-report-browser/node_modules/playwright-core node tests/monthlyStrategyReport.browser.js
```

默认使用本机 Chrome，Demo 地址为 8088。可设置 `MR_BROWSER_EXECUTABLE` 指定 Chrome/Chromium 可执行文件，设置 `MR_DEMO_URL` 指定已启动的 Demo 地址。脚本输出截图目录，使用隔离的浏览器上下文，不清空日常浏览器中的数据。

开发恢复能力通过API层的 `resetReportDemo()` 保留，调用 `POST /api/mr/dev/reset` 后恢复确定性的15条记录；页面原有 `resetMockData` 方法仍保留二次确认，但不恢复用户已移除的按钮。生产Mock拒绝开发重置接口。文件名含“解析失败”或“fail”时首次模拟解析失败，重试后成功。

## 已完成的业务功能

- 默认列表支持月份、状态筛选与真实分页，每页条数由 Mock 切片返回；返回列表保留当前查询和分页。
- 上传采用 Element UI 表单与拖拽上传，校验扩展名、空文件、50MB 上限、单文件数量，通过 Axios 提交 FormData。月份查询包含对应年份的 12 个月，未取得接口结果时禁选月份，支持年份箭头与年份面板切换。
- 选择文件后异步读取真实总页数：PDF使用PDF.js的numPages；PPTX统计`ppt/slides/slide整数.xml`，排除关系文件、备注、母版和目录。读取中禁用提交；损坏、无有效页面或加密PDF显示中文错误，可删除重选或重试。取消选文件、返回列表或销毁组件时取消读取，避免旧结果覆盖新文件。
- Mock上传仍只接收FormData的reportMonth和file；接口自行读取文件页数，并在异步等待后重新检查月份唯一性，防止并行写入丢失。真实总页数以`fileMeta.pageCount`与`pageCountSource: 'FILE'`持久化，刷新和重解析不会覆盖。初始示例记录仍使用`MOCK`来源并明确标注模拟元数据。
- 解析任务使用非阻塞 setTimeout，约 3 秒生成确定性示例观点；轮询进入确认页。失败展示具体原因，支持重试或删除重传；返回列表、刷新后仍可恢复任务。
- 五类资产各含市场回顾、后市展望，初始要点数量为 2 至 4 条。左右区域共用 activeAssetType，标题、正文、增删即时同步。要点具有独立编辑 key，删除后重排 seq。
- 跨页面统一 Header 将标题、状态、保存和发布保持同一行。桌面左右宽度 2:1，1200px 以下纵向布局。
- 保存覆盖整棵 assetList 并返回新版本。提交发布先校验全部资产，再保存未保存内容，最后弹出确认发布对话框。取消不会发布，可能已保存完整草稿。
- 已发布内容存在独立 publishedSnapshot，编辑或保存只更新草稿；确认重新发布才替换快照。预览只读，清楚区分已发布、已下架快照和草稿。
- 版本冲突显示“数据已被其他操作修改，请刷新后重试”，编辑页提供刷新入口并提醒放弃未保存修改。
- 原文通过 Axios Blob 请求获取；PDF 使用浏览器 iframe，PPTX 提供下载并明确不支持在线渲染。刷新后文件二进制缺失时提示重新选择同名、同类型原文件，不伪造文件流。对象 URL 在关闭或销毁时释放。

## Mock 接口

I-02 至 I-10 的路径与方法为Demo约定，直接写在对应API函数中。API返回Axios Promise，页面读取response.data；唯一Mock入口仅接管/api/mr/，其他请求使用原adapter。

| 编号 | 方法 | 路径 | 用途 |
| --- | --- | --- | --- |
| I-01 | POST | `/api/mr/months/available` | yyyyMM 格式校验、最多 24 个月、保留入参顺序，返回 disabled |
| I-02 | POST | `/api/mr/reports/upload` | FormData 的 reportMonth、file，创建 PARSING 记录 |
| I-03 | POST | `/api/mr/reports/reparse` | reportMonth、reportId、version，重启模拟解析 |
| I-04 | POST | `/api/mr/reports/page` | 月份、状态、pageNo、pageSize，真实过滤分页 |
| I-05 | GET | `/api/mr/reports/{reportId}` | 详情、版本、资产、文件元数据与独立发布快照 |
| I-06 | PUT | `/api/mr/reports/{reportId}` | reportId、version、assetList，整树保存草稿 |
| I-07 | POST | `/api/mr/reports/{reportId}/publish` | version，状态及完整内容复核后发布快照 |
| I-08 | POST | `/api/mr/reports/{reportId}/offline` | version，下架 |
| I-09 | DELETE | `/api/mr/reports/{reportId}` | version，通过 Axios config.data 传参 |
| I-10 | GET | `/api/mr/reports/{reportId}/file` | responseType: blob，读取内存中的真实上传文件 |
| 开发 | POST | `/api/mr/dev/reset` | 恢复初始示例数据，仅开发模式 |

业务响应统一为 `{ code, message, data }`，成功码为 `00000`；文件成功响应按 I-10 约定返回二进制，文件业务错误仍返回统一结构。模拟延迟固定为 300、450 或 650ms，无随机失败；上传另需等待实际文件页数读取。localStorage 保存 JSON 记录、真实页数和解析截止时间，File/Blob 存在内存 Map 中，ObjectURL 仅在预览期间创建。

## 状态与安全规则

| 动作 | 允许状态 | 结果 |
| --- | --- | --- |
| 新上传 | 月份不存在记录 | PARSING |
| 解析结束 | PARSING | 成功 PENDING；异常 FAILED |
| 保存普通草稿 | PENDING | PENDING |
| 保存已发布/已失效编辑 | PUBLISHED / INVALID | 保持原可见性状态，只更新草稿 |
| 首次上架 | PENDING | 内容已确认且完整 → PUBLISHED |
| 下架 | PUBLISHED | INVALID |
| 重新上架 | INVALID | 内容已确认且完整 → PUBLISHED |
| 确认重新发布 | PUBLISHED | PUBLISHED，替换已发布快照 |
| 重新解析 | PENDING / FAILED / INVALID | PARSING，解析成功回到 PENDING，须重新确认 |
| 删除 | PENDING / FAILED / INVALID | 删除并释放月份 |

全部写操作校验 version，成功后加 1；异步解析完成也更新版本、时间与修改人。保存、发布、下架、重解析、删除均不能连续使用旧版本。

对需求中未完全统一的规则采取以下实现：

1. 已发布、已失效报告保存编辑内容时保持原状态，避免一次保存就改变对客可见性；已发布报告允许确认重新发布，仅该动作替换快照。
2. 完整内容在编辑页保存成功即视为人工确认；不完整草稿允许保存，但发布校验阻止生效。重新解析清除确认标记。
3. 任何未删除记录均占用月份，含 FAILED 与 INVALID，避免保留多个版本的同月报告。删除原记录后才释放月份，上传接口会再次检查唯一性。
4. 已发布必须先下架才能重新解析或删除；PARSING 禁止编辑、发布、删除和重复解析。
5. INVALID 的预览可展示最后发布快照，但明确标注“已下架快照预览”，并说明未对客生效；PENDING 展示已保存草稿并标注“草稿预览”。

## 运行与验收结果（2026-11-20重构后复验）

- 开发服务器启动成功，页面可访问。
- `npm run build` 成功；保留原 `src/main.js` 的 Vue mergeProps 导出警告、依赖包体积警告与 Browserslist 数据过旧提示，未升级核心依赖或修改 JSX 兼容配置。
- 功能范围 ESLint 通过。
- `node --test tests/monthlyStrategyReport.mock.js`：简化后20项测试通过，0失败（包含顶层测试与19个子测试），保留业务验证并检查单入口、原Axios响应、参数不可变、旧JSON兼容及删除Mock后的HTTP请求；不再测试已删除的请求scope和订阅系统。
- Chrome 浏览器脚本：15 组交互检查通过，0 页面运行错误，0 真实 `/api/mr/` 网络请求；包括真实3页PDF、4页PPTX和损坏PDF阻止提交，覆盖 1366×768、1920×1080 以及 1000px 纵向布局。
- 生产dist文件另行通过静态服务器实测：真实8页PDF读取成功；Worker来自同源打包的`/js/429.0b351088.js`，读取完成后活动Worker数量为0，无页面错误。哈希文件名会随构建变化，无需人工配置。
- 全项目 `npm run lint -- --no-fix` 未通过：`src/components/HelloWorld.vue:48` 原有 `$` 未定义；`src/components/export.js:127,290` 原有 3 个变量未使用。没有修改这些其他业务文件。

以下“通过”依据 Mock 回归、实际浏览器操作及代码检查综合确认；不表示已验证真实后端或真实投研解析。

| 验收项 | 结果 | 验证依据 |
| --- | --- | --- |
| 1 默认报告列表 | 通过 | 浏览器初始列表 |
| 2 列表分页 | 通过 | 页码与每页条数实际切换，Mock 返回不同切片 |
| 3 月份和状态查询 | 通过 | 浏览器查询与重置、Mock 参数过滤 |
| 4 进入上传页 | 通过 | 点击上传月度报告 |
| 5 已有月份禁选 | 通过 | 接口未返回时全禁选、已有月份不可选、年份切换 |
| 6 选择 PPTX/PDF | 通过 | 浏览器文件卡片、接口 FormData |
| 7 拒绝非法文件 | 通过 | 浏览器与接口均拒绝 DOCX |
| 8 拒绝超过 50MB | 通过 | 浏览器和接口边界校验 |
| 9 上传进入解析中 | 通过 | 浏览器加载反馈、重复提交按钮禁用 |
| 10 自动进入确认观点 | 通过 | 浏览器轮询解析状态 |
| 11 解析失败原因 | 通过 | fail 文件首次失败展示原因 |
| 12 失败重新解析 | 通过 | 浏览器失败记录重试、接口失败任务重试 |
| 13 完整五类资产 | 通过 | 接口结构校验、浏览器五个 Tab |
| 14 每类两个板块 | 通过 | 五类资产各两个板块 |
| 15 标题实时同步 | 通过 | 输入即更新左侧标题 |
| 16 要点实时同步 | 通过 | 输入即更新左侧正文 |
| 17 新增要点 | 通过 | 连续添加两条并编辑 |
| 18 删除要点 | 通过 | 删除中间要点 |
| 19 序号重排 | 通过 | 删除后连续 seq 与显示序号核对 |
| 20 左右 Tab 同步 | 通过 | 分别点击左右 Tab |
| 21 保存草稿 | 通过 | 浏览器反馈与最新 version |
| 22 刷新数据保留 | 通过 | 保存、刷新、重新编辑内容一致 |
| 23 未完整不能发布 | 通过 | 黄金后市展望空标题、缺失资产与重复 seq 校验 |
| 24 发布确认弹窗 | 通过 | 标题月份与取消/确认行为 |
| 25 发布变更状态 | 通过 | 发布后返回列表显示已发布 |
| 26 已发布预览 | 通过 | 独立快照只读展示 |
| 27 已发布不可删除 | 通过 | 列表无删除、接口拒绝 |
| 28 下架变失效 | 通过 | 下架二次确认与状态更新 |
| 29 失效重新上架 | 通过 | 内容校验与再次发布 |
| 30 重解析确认 | 通过 | 浏览器确认对话框 |
| 31 version 冲突 | 通过 | 两页面同版本编辑，后保存提示冲突；五类写操作旧版本均拒绝 |
| 32 同月不重复上传 | 通过 | 上传接口再次检查已有记录 |
| 33 预览来源标注 | 通过 | 发布快照、下架快照、草稿预览明确区分 |
| 34 已发布编辑隔离 | 通过 | 保存新草稿，预览仍保留旧快照；重新发布才应用修改 |
| 35 桌面适配 | 通过 | 1366/1920 截图与 DOM 布局测量，无横向溢出 |
| 36 无需路由 | 通过 | currentView 切换、App 直接渲染 |

36 项功能验收均通过；未通过的检查为上文的全项目 lint。

## 对接真实后端与限制

真实对接需移除或条件关闭自定义 adapter，替换集中 API 常量并确认 I-02 至 I-10 的真实路径、方法；接入鉴权、业务错误与真实 version 协议；由服务端保证月份唯一性和原子乐观锁。请保留草稿与已发布快照的独立字段及状态规则。

异步观点解析需改为后端任务状态轮询或推送，采用真实资产结构、解析错误与观点页码映射。浏览器已能统计真实总页数，生产环境仍应由服务端校验文件。文件接口需提供实际二进制或下载地址；浏览器 multipart 上传应让 Axios/浏览器生成 boundary。发布后的首页与智能问答同步必须由真实后端执行。

当前已统计真实文件总页数，但不做真实 PPTX/PDF 投研观点提炼，不执行实际系统同步，不提供 PPTX 在线渲染。观点对应页码仍为模拟定位，并限制在文件总页数之内；总页数不能推断观点所在页面。初始记录没有真实二进制，其示例页数仍标注模拟。原文件二进制只驻留内存，刷新后需重新选择文件进行原文预览，但真实总页数仍会保留。localStorage 数据仅在同源本机浏览器持久化，没有服务端存储、多用户鉴权或服务端跨设备事务保障。已完成单个浏览器内多个页面的版本冲突验证，localStorage 不代替真实数据库的并发事务。
