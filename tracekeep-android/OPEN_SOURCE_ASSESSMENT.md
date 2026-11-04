# TraceKeep 开源取证能力复用评估报告

> 阶段一（调研）＋阶段二（复用方案）＋阶段三（决策报告）合并输出
> 评估日期：2026-10-29 ｜ 评估方法：实际克隆仓库源码核对（浅克隆补全历史），逐项检查 README、LICENSE、依赖清单、源码结构、维护记录
> 本报告不构成法律意见，不宣称任何方案能够保证法院采信或具有完整法律效力。

---

## 1. 结论摘要

**四个候选项目全部是"桌面端 + ADB"工具，不是"手机端 App"工具。**

AndroidQF、MVT、ALEAPP、DroidCustos 的运行环境、设计目标与 TraceKeep（手机端个人取证 App）存在根本差异：

| 维度 | 四个候选项目 | TraceKeep 需求 |
|---|---|---|
| 运行位置 | 桌面电脑（Windows/Linux/macOS） | Android 手机端 |
| 数据来源 | 通过 USB + ADB 从设备拉取系统级数据 | 应用自身录制（麦克风/摄像头/屏幕）与采集（GPS） |
| 目标场景 | 间谍软件排查（MVT/AndroidQF）与取整机事件日志解析（ALEAPP）、案件编排（DroidCustos） | 个人音视频记录的证据保全与完整性校验 |
| 时间证明 | 无任何可信时间戳能力 | 需要可信时间戳/第三方存证适配（另见阶段 0 服务调研） |
| 中国司法合规 | 均未涉及；DroidCustos 明确声明"不保证法庭可采性" | 需要按中国证据规则的辅助材料设计 |

**结论：没有一个项目可以"直接复用"为 TraceKeep 的端上功能。** 它们无法在 Android 手机上运行，无法录音/录像/录屏，也不提供可信时间戳、公证或任何中国司法证据能力。任何"复用即满足取证要求"的想法都是错误的。

**真正的复用价值集中在三点：**

1. **导出格式兼容（零代码集成，推荐）**：TraceKeep 的证据包可增加一个"桌面分析兼容"导出格式，对齐 AndroidQF 归档的公开结构（ZIP + `acquisition.json` + `hashes.csv`）。这样用户可自愿在桌面上用 MVT 做间谍软件 IOC 扫描、用 ALEAPP 解析日志、用 DroidCustos 做案件管理——全部通过标准输入输出/文件格式适配，无代码耦合、无许可证传染、无网络依赖。
2. **架构参考（参考实现，干净重写）**：DroidCustos 的案件目录结构（原始证据/工作副本/分析结果/报告/哈希分目录）、`custody.jsonl` 保管链记录、主机与设备时钟偏移测量、清单生成/封存/验证流程；AndroidQF 的模块状态模型（completed/partial/failed 显式记录）与流式哈希清单生成时机。这些设计思路可借鉴，但其代码受许可证限制（见第 4 节），不应直接复制。
3. **可选桌面伴侣工具（独立进程，不集成进 App）**：四个工具都提供 CLI，可在文档中指导用户自行安装使用，但**不打包进 APK、不作为 App 运行前提、不宣称其分析结果具有任何法律效力**。

**必须自研、无法复用的核心能力**：录音、摄像头录像、MediaProjection 录屏、GPS 采样、SHA-256 流式哈希与哈希链、Android Keystore 签名、可信时间戳集成、证据包与 PDF 报告、独立离线验证工具（验证程序按 PROJECT_REQUIREMENTS.md 第 6 节要求不得依赖原 App 数据库或私钥；DroidCustos 的 verify 为 GPL 代码，只能参考设计、干净重写）。

---

## 2. 评估方法与核实说明

- 四个仓库于 2026-10-29 实际克隆至 `/tmp/tracekeep-oss-assessment/`（浅克隆后补全历史用于统计活跃度），逐文件核对；**未安装任何依赖、未执行任何采集、未连接任何真实设备、未修改本项目任何文件**。
- 检查了期间 `adb devices`（无设备连接），短暂启动的 adb server 已在核对结束后关闭（`adb kill-server`）。
- 本报告中所有许可证条款、能力描述均以仓库源码中的 LICENSE、README、pyproject/go.mod 原文为准；无法从源码确认的内容一律标注"待核实"。
- 源码快照 commit 哈希（核实日期 2026-10-29）：

| 项目 | HEAD commit | 快照日期（最后提交） |
|---|---|---|
| mvt-project/androidqf | `961fc179d0f9b5280136cd95583c0423605fd69a` | 2026-10-20 |
| abrignoni/ALEAPP | `1822b5733f528d0ecac15bb86a73ecd54a1e193e` | 2026-10-28 |
| mvt-project/mvt | `df540d7c415d4efa2c1e3bf278ca609523304efc` | 2026-10-28 |
| h3st4k3r/DroidCustos | `6028ffb52b8bf022931b81fbc62ac766dea58d22` | 2026-09-10 |

---

## 3. 四个项目逐项核对

### 3.1 AndroidQF（mvt-project/androidqf）

- **官方仓库**：https://github.com/mvt-project/androidqf （Amnesty International 安全实验室维护，原始作者 Claudio Guarnieri / botherder 的分叉）
- **版本与形态**：Go 语言（go.mod 要求 Go 1.27.3）桌面 CLI 工具；最新发布 v1.8.3（2026-05-12），发布资产含 macOS 通用签名二进制、Linux、Windows 版；360 stars。
- **维护状态**：活跃。近 6 个月 107 次提交，近 30 天 22 次（核实日 2026-10-29）。
- **许可证（重要）**：仓库主体为 **MVT License 1.1**（基于 Mozilla Public License 2.0 改写，新增第 3.0 条"Consensual Use Restriction"同意使用限制：仅允许在数据所有者明确、知情、无胁迫同意下使用）；**但内置的 `android-collector` 子组件为独立 MIT 许可证**（Copyright (c) 2022 Tek，见 `android-collector/LICENSE`，与仓库根 LICENSE 不同）。
- **工作原理**：需要目标手机开启 USB 调试并授权 ADB；androidqf 将一个单独编译的 collector 二进制推送到设备 `/data/local/tmp/` 执行（`adb.Push`），采集结果流式写入 ZIP 归档。
- **采集范围**（README 表格核实）：`getprop.txt`、系统设置（`settings_*.txt`）、进程列表、系统服务、系统日志（`logs/`、`logcat.txt`）、`dumpsys.txt`、已安装包清单（`packages.json`）、APK 副本（可选）、APEX 容器、侵入日志（可选，含导航历史等隐私数据）、Magisk 模块（需已有 root）、`/system/etc/init.d`（需 root）、文件清单 `files.json`（可选项含设备端 MD5/SHA-1/SHA-256/SHA-512）、临时目录文件、`bugreport.zip`、短信备份（可选）。文件扫描根目录涵盖 `/sdcard/`、`/system/`、`/vendor/`、`/data/data/` 等（无 root 时受限）。
- **完整性机制**（核实于 `docs/acquisition-archives.md` 与源码）：
  - 归档内 `hashes.csv`：记录**每个已写入条目的明文（未压缩）SHA-256**，不包含自身记录；
  - `acquisition.json`：采集 UUID、时间戳、版本、设备信息、逐模块状态（`completed` / `partial` / `failed`）与错误；
  - 流式失败拉取不会留下看似有效的空条目；未完成归档不打印成功消息（退出码非零）。
- **加密**：可选 age 加密（ChaCha20-Poly1305），加密采集不产生明文 ZIP；临时暂存使用 DARE 认证加密。
- **日志**：`command.log`（调试级命令与采集日志）。
- **报告导出**：无 PDF/HTML 报告，产出为 ZIP 归档，供 MVT/ALEAPP 等下游分析。
- **已知限制**：**没有对归档自身的 verify 子命令**（经源码搜索确认无验证命令）；非物理镜像、无写入阻断（acquisition 过程会改变设备少量状态）；Android 12+ 的 `adb backup` 对绝大多数应用已无效；侵入日志与备份需手机端人工确认；无 root 时 `/data/data/` 等无法访问。
- **与 TraceKeep 的关系**：桌面工具，无法在手机端运行；其归档格式与 `hashes.csv`/`acquisition.json` 结构可作为 TraceKeep 导出包的**格式对齐目标**（见第 7 节）。

### 3.2 ALEAPP（abrignoni/ALEAPP）

- **官方仓库**：https://github.com/abrignoni/ALEAPP
- **版本与形态**：Python 3.11+（README 明确"Python 3.11 or above"）；GUI + CLI 双模式；最新发布 ALEAPP v2026.4.4（2026-10-24）；1023 stars。
- **维护状态**：极度活跃。近 6 个月 3195 次提交，近 30 天 988 次；555 个 artifact 解析模块（`scripts/artifacts/*.py` 计数）。
- **许可证**：**MIT**（Copyright (c) 2020 Alexis Brignoni）——四个项目中许可最宽松。
- **能力范围**：纯解析器，不做采集。输入支持 `zip / tar / fs / gz / raw`（raw 支持 E01、AFF4、DMG、VHDX 等大量磁盘镜像容器与文件系统）；解析 Android 日志、事件、protobuf 等 500 余类 artifact。
- **与 AndroidQF 的关系**：有专门 artifact（`intrusion_logging.py`）明确读取 androidqf 归档中的 `intrusion_logs/` 目录（源码注释引用 Amnesty 官方博客）；其余 artifact 对 androidqf 目录树/压缩包的覆盖程度为**待实测**。
- **完整性/哈希机制**：对输入证据本身不做保管链哈希（发布资产提供 `SHA256SUMS.txt` 供校验下载）；分析输出为 HTML 报告、TSV/CSV、timeline、LAVA、KML。
- **日志记录**：运行日志记录跳过行数等解析细节。
- **已知限制**：CLI 输出目录必须已存在；Linux 需额外安装 tkinter；不采集数据、不做设备连接、不提供任何法律效力声明。
- **与 TraceKeep 的关系**：可作桌面伴侣解析工具（对 TraceKeep 导出包或 androidqf 归档做深加工）。MIT 许可使代码级复用门槛最低，但 TraceKeep 首版无需求，建议仅文档层面推荐。

### 3.3 MVT（mvt-project/mvt）

- **官方仓库**：https://github.com/mvt-project/mvt
- **版本与形态**：Python >= 3.10；桌面 CLI（`mvt` / `mvt-ios` / `mvt-android`）；最新发布 v2026.10.26（2026-10-26）；15616 stars，Amnesty International 安全实验室维护（Pegasus 项目背景）。
- **维护状态**：活跃。近 6 个月 204 次提交，近 30 天 25 次。近期合并 v3 分支，**存在破坏性接口变更**（README 顶部警示）。
- **许可证**：**MVT License 1.1**（与 androidqf 同款，第 3.0 条同意使用限制）。官方文档明确说明该许可证因使用限制**不符合 OSI 开源定义、也不符合 FSF 自由软件定义**——即它是有使用条件限制的"源码可用"许可证，不是标准开源许可证。
- **能力范围**：`mvt-android` 提供 `check-androidqf`、`check-backup`、`check-bugreport`、`check-intrusion-logs`、`check-iocs`、`download-iocs`。核心是**基于公开 IOC（威胁指标）扫描设备数据中的间谍软件痕迹**。
- **与 AndroidQF 的接口**（核实源码 `cmd_check_androidqf.py` / `modules/androidqf/base.py`）：直接消费 androidqf 的 ZIP 或解压目录；读取 `acquisition.json` 中的 `started` 时间与 ADB 主机公钥作为上下文；缺少 `getprop.txt` 等文件时警告并继续（不中断）。
- **完整性机制（重要事实）**：**MVT 不校验 androidqf 归档中的 `hashes.csv`**（对整个 MVT 源码库搜索 `hashes.csv` 无任何命中）；其 `--hashes` 选项含义是"为所有被分析的文件生成哈希"（写入分析结果），并非验证归档完整性。**因此"androidqf 产出 + MVT 分析"链条中，归档完整性校验是一个缺口，需要下游/我方自行验证。**
- **输出**：逐模块 JSON 结果、`timeline.csv`、IOC 匹配结果。
- **已知限制**：定位为"面向技术与调查人员的取证研究工具，非普通用户自助工具"（README 原文）；公开 IOC 不足以判定设备"干净"；无任何证据保全/时间证明/法律效力能力。
- **与 TraceKeep 的关系**：桌面伴侣（自愿使用），用于扫描导出数据中的已知威胁指标。**不集成进 App。**

### 3.4 DroidCustos（h3st4k3r/DroidCustos）

- **官方仓库**：https://github.com/h3st4k3r/DroidCustos
- **版本与形态**：Python >= 3.10（验证目标 3.12；CI 覆盖 3.10–3.13）；macOS/Linux 桌面 CLI；当前 **0.3.2，Public Alpha**（发布说明日期 2026-08-03）；0 stars、总计 14 次提交——**新项目、单一作者、未经广泛验证**。
- **维护状态**：近 6 个月 14 次提交（即全部历史），近 30 天 0 次；最后提交 2026-09-10。
- **许可证**：**GPL-3.0-or-later**（pyproject.toml 声明，LICENSE 为 GPL-3.0 全文）。
- **定位**：Android 取证分诊**编排器**——不自己采集，编排 ADB、AndroidQF、MVT、ALEAPP（通过 `doctor --fix` 从上游下载管理，**源码发布不捆绑它们的二进制或源码**）；附带 IOC 关联、APK 静态分析、时间线、覆盖率报告等。
- **证据完整性设计（最有参考价值的部分）**：
  - 案件目录结构与四分离原则：`00_metadata`（案件/设备/保管链元数据）、`01_evidence`（原始证据，采集后立即哈希）、`02_working`（一次性工作副本）、`03_analysis`（分析结果）、`04_reports`、`05_hashes`（证据清单、校验和、可选签名封存）、`06_exports`、`logs`；
  - `custody.jsonl` 追加式保管链记录（案件号、操作员、UTC 时间、命令与返回码、工具路径/版本/哈希、IOC 来源、采集覆盖、SHA-256 清单、验证结果）；
  - `droidcustos verify CASE_DIRECTORY` 验证原始证据清单；Ed25519 密钥生成/案件封存/验签（`keygen` / `seal` / `verify --public-key`）；
  - 主机与设备时钟偏移及不确定度测量（`time_sync`）；
  - 归档安全提取（路径穿越、符号链接、成员数、压缩比、总大小检查）；
  - AES-256-GCM 认证加密的案件导出/导入（`.dcx`）。
- **完整性机制缺口**：与 MVT 相同，**不校验 androidqf 的 `hashes.csv`**（源码搜索无命中）——它对自己的案件证据（采集归档本体）重新生成 SHA-256 清单。
- **已知限制（README 原文核实）**：不做物理镜像、不 root/不绕过锁屏、无写入阻断、不保证访问应用私有数据库、**明确不保证法庭可采性（"Guarantee courtroom admissibility" 列入其"不做之事"清单）**；Public Alpha，仅记录过一次真机验证（ASUS ROG Android 16）；集成 MVT/AndroidQF 时同样受 MVT License 1.1 同意限制约束。
- **与 TraceKeep 的关系**：设计参考价值最高（目录结构、保管链、验证流程），但 **GPL-3.0-or-later 意味着不能复制其任何代码进 TraceKeep**（除非整个 TraceKeep 也采用 GPL 并承担相应义务）；作为桌面伴侣工具独立进程使用不受传染。

---

## 4. 许可证与合规风险

| 项目 | 许可证 | 复制/修改其代码 | 捆绑其二进制 | 独立进程调用 | 关键风险 |
|---|---|---|---|---|---|
| androidqf（主体） | MVT License 1.1 | 需按 3.1/3.2 条以同许可证开放源码、携带声明；受 3.0 条同意限制约束 | 需满足 3.2 条（提供获取源码途径）+ 同意限制 | 不受传染 | 非 OSI 开源；"同意使用限制"可能与应用商店政策冲突；**内置 android-collector 是 MIT，是唯一宽松部分** |
| androidqf/android-collector | **MIT** | 保留版权与许可声明即可 | 保留声明即可 | 不受传染 | 最低 |
| MVT | MVT License 1.1 | 同 androidqf | 同 androidqf | 不受传染 | 官方明确其非 OSI 开源（使用限制） |
| ALEAPP | **MIT** | 保留版权与许可声明即可 | 保留声明即可 | 不受传染 | 最低 |
| DroidCustos | **GPL-3.0-or-later** | **传染：衍生作品须整体 GPL 化并提供源码** | 触发 GPL 分发义务 | 不受传染（独立程序） | Alpha 阶段、0 stars；代码成熟度低 |

**对本项目的具体合规结论：**

1. **TraceKeep App 本体（APK）不应打包任何上述项目的代码或二进制。** 理由：(a) app 场景下它们均无端上价值；(b) MVT License 1.1 的同意限制条款与 GPL 的分发义务会给 App 分发带来不必要的法律复杂度；(c) PROJECT_REQUIREMENTS.md 第 2 节要求"无广告、分析或默认上传 SDK"，引入无关第三方组件与其精神相悖。
2. **格式对齐（采用 AndroidQF 归档的公开文件结构）不构成代码复制**，不触发其许可证义务；但文档需注明"格式与 AndroidQF/MVT 社区工具兼容"，**不得使用其名称暗示官方关联或背书**。
3. **若未来需要复制 `android-collector`（MIT）或其他 MIT 部分代码**，保留版权声明与许可证全文即可；这仍是最低风险路径，但当前无此需求。
4. **不得复制 DroidCustos 代码**（GPL 传染）；其设计模式（目录结构、保管链字段、验证流程）属于思想层面，可干净重写。若未来考虑将其作为**桌面伴侣**推荐给用户使用，独立安装/独立进程不构成对本 App 的传染，但需在文档中准确描述其 GPL 属性、Alpha 状态与"不保证可采性"的自我声明。
5. **MVT/AndroidQF 作为桌面伴侣被用户使用时**，用户须自行同意 MVT License 1.1 的第 3.0 条——对"自己录制自己设备"的 TraceKeep 典型用户（数据所有者=使用者）这一条件自然满足，但若用于分析**他人**数据，许可证要求数据所有者明确同意，需在伴侣使用说明中如实提示。
6. **商标/背书**：报告中与 App 文案中不得暗示四个项目"官方认证"TraceKeep，或 TraceKeep"通过"这些工具"取得法律效力"。

---

## 5. 能力对照表

按任务要求分四类。评估基准为 PROJECT_REQUIREMENTS.md 全部章节。

### 5.1 可直接调用的独立工具（用户自行安装、桌面运行，App 不集成）

| 能力 | 工具 | 调用方式 | 对 TraceKeep 的价值 | 前置条件 |
|---|---|---|---|---|
| 设备系统级 ADB 采集（进程/日志/包/APK/文件清单等） | AndroidQF | 桌面 CLI，USB + ADB | 补充"应用之外"的设备侧证据（与 App 自身录制内容互补），供高级用户在纠纷前/后固定设备状态 | 需电脑、USB 调试、手工授权；无 root 时范围受限 |
| 间谍软件 IOC 扫描 | MVT | `mvt-android check-androidqf <zip>` | 对 androidqf 归档或兼容导出物做威胁指标扫描 | Python ≥3.10；受 MVT License 1.1 约束；不支持中文司法场景声明 |
| Android 日志/事件深加工解析 | ALEAPP | `aleapp.py -t zip -i <input> -o <output>` | 将导出包中的日志类数据解析为可读报告/时间线 | Python ≥3.11；输出目录须已存在 |
| 案件化编排（采集+分析+报告+保管链） | DroidCustos | `droidcustos scan/verify/seal/...` | 供专业用户桌面端做完整案件管理 | macOS/Linux；GPL；Alpha；需 MVT/AndroidQF 同意条款 |

### 5.2 可通过公开接口/命令行/文件格式集成的能力

| 能力 | 集成点 | 集成方式 | 说明 |
|---|---|---|---|
| AndroidQF 归档格式兼容 | ZIP 结构 + `acquisition.json` + `hashes.csv` | TraceKeep 证据包导出一个"桌面兼容格式"变体 | 使 MVT `check-androidqf`、ALEAPP、DroidCustos 可直接消费；**待实测**（见第 11 节） |
| MVT 分析结果消费 | MVT 输出 JSON / `timeline.csv` | 文档指导 + 可选桌面脚本 | 分析结果**不得**回填覆盖原始证据包 |
| android-collector（MIT）参考 | 其 `find`/`ps` 命令与 JSON 输出结构 | 参考其输出格式设计 TraceKeep 文件清单结构 | 端上 App 不执行该二进制（无必要且受系统限制） |
| androidqf 模块状态模型 | `module_results` 的 completed/partial/failed + 错误字段 | 采用为 TraceKeep 会话状态机与清单字段设计参考 | 概念对齐，不复制代码 |

### 5.3 需参考实现后自行开发的能力（核心自研清单）

| 能力 | 参考来源 | 自研原因 |
|---|---|---|
| 录音 / 摄像头录像 / MediaProjection 录屏 | 无（四个项目均无录制能力） | 端上能力，只能自研（CameraX/AudioRecord/MediaProjection） |
| GPS 轨迹采样与异常记录 | 无 | 端上能力，只能自研 |
| SHA-256 流式哈希 + 版本化哈希链 | DroidCustos `hashing.py`（**仅参考思想**）；AndroidQF `hashes.csv` 时机设计 | GPL 不可复制；需求含自有规范编码要求 |
| Keystore 数字签名（私钥不出包） | DroidCustos Ed25519 封存流程（仅参考） | 系统 API 自研；需求要求密钥管理与轮换规则 |
| 证据包 + `manifest.json` + PDF 报告 | DroidCustos 案件结构、AndroidQF 归档结构（仅参考） | 需按中国证据场景与需求文档字段自研 |
| 独立离线验证工具（PASS/FAIL/WARN/SKIPPED） | DroidCustos `verify`（仅参考） | **GPL 代码不可复制**；且需求要求不依赖原 App 数据库 |
| 可信时间戳/第三方存证适配 | 四个项目均无此能力 | 属阶段 0 法律与服务调研范畴，另行处理 |
| 时间字段体系（墙钟/单调钟/定位时间/签发时间分离） | DroidCustos `time_sync`（主机-设备偏移思想，仅参考） | 端上实现自研 |

### 5.4 无法实现或受 Android 系统权限限制的能力

| 能力 | 限制来源 | 影响 |
|---|---|---|
| 无 root 访问 `/data/data/`（其他应用私有数据） | Android 沙箱 | 任何工具（含 androidqf 在无 root 时）都无法获取；TraceKeep 更不应尝试绕过 |
| 物理镜像 / 写入阻断 | 系统与硬件限制 | 四个工具同样声明不做；TraceKeep 定位为应用级记录工具，不宣称具备镜像取证能力 |
| 锁屏后持续录屏 / 全机型内部音频录制 | MediaProjection 与厂商限制 | 需求已明确"不能声称所有机型都支持"；自研时如实记录 |
| 对任意手机录制过程提供公证 | 公证机构业务范围 | 必须逐案咨询公证处（阶段 0 调研事项） |
| 端上直接运行 Python 工具链（MVT/ALEAPP/DroidCustos） | 无支持的 Android 运行环境（Termux 为非支持路径） | 桌面伴侣模式是唯一合理集成方式 |
| androidqf 全量模块复刻 | 需 root / 需设备交互 / Android 12+ 备份失效 | 部分模块（侵入日志、Magisk、init.d）在 TraceKeep 场景不适用或不可得 |

---

## 6. 需求覆盖矩阵（对照 PROJECT_REQUIREMENTS.md）

| 需求章节 | 需求要点 | 四个开源项目覆盖情况 | TraceKeep 处理方式 |
|---|---|---|---|
| §1 法律与服务评估 | 可信时间戳/电子认证/存证/公证调研 | **无任何覆盖**（均为美国/欧洲背景的威胁排查工具，无中国法律能力） | 自研文档（阶段 0 单独执行，未包含在本报告内） |
| §2 工程基线 | Kotlin/Compose/Room/Keystore；无广告无分析 SDK；不要求账号 | 不适用（均为 Python/Go 桌面程序） | 自研；四个工具均无账号要求、无广告，此点上与本项目精神一致但不构成复用 |
| §3 录制 | 录音/录像/录屏 + 异常记录 + 真机验证 | **完全无覆盖**（无录制能力） | 完全自研 |
| §4 GPS/时间/日志 | GPS 采样、四类时间字段、追加式事件日志 | androidqf 采集系统日志但无 GPS；DroidCustos 有 time_sync 偏移测量（仅参考） | 自研；可参考 DroidCustos 的偏移记录字段设计 |
| §5 原始媒体/哈希链/签名 | 私有存储、原子封存、SHA-256、哈希链、Keystore 签名 | androidqf 有"采集后逐条目 SHA-256 清单"（部分对应）；DroidCustos 有证据清单 + Ed25519 封存（部分对应） | 自研主链路；导出格式与 androidqf 清单模式对齐；**注意：两者均不校验对方清单，验证缺口须由我方补上** |
| §6 证据包/报告/独立验证 | 证据包结构、PDF、离线独立验证 | DroidCustos 案件结构/报告/verify 可作设计参考（GPL，不可复制）；AndroidQF 归档结构可对齐 | 自研；格式兼容 androidqf 以便桌面生态消费 |
| §7 第三方存证集成 | TimestampProvider/EvidencePreservationProvider 接口 | **无覆盖** | 自研接口层（阶段 0 调研另行完成） |
| §8 隐私/合法性/安全 | 默认本地、无隐蔽录制、权限最小化 | 四项目均本地优先、无上传（DroidCustos 明确 "Evidence upload: None"），可引用其隐私文本作为对标检查项 | 自研；文档引用其"无上传"实践作为设计佐证 |
| §9 测试/交付 | 单元/集成/破坏性/真机测试 | androidqf 有 Go 测试；MVT/ALEAPP 有 pytest；DroidCustos 有模拟 E2E（无设备） | 自研测试体系；可参考 DroidCustos 的"验证等级"记录模板（DECLARATIVE/EMULATOR/PHYSICAL/DEEP/REGRESSION） |

**差异与冲突（不静默降低要求）**：

- 四个项目**均不提供**可信时间证明、公证对接、中国证据规则适配 —— TraceKeep 需求中的这些部分无任何开源可复用项，必须自研或依赖阶段 0 确认的第三方服务。
- DroidCustos 明确"不保证可采性"；若 TraceKeep 文档引用其能力，**不得**转述为"达到司法取证标准"。
- androidqf 与 MVT 之间的完整性链条存在已验证的缺口（MVT 不校验 `hashes.csv`）；TraceKeep 若做格式兼容，应额外提供独立的校验说明或工具，**不得**让用户误以为"能被 MVT 打开"等于"完整性已被验证"。

---

## 7. 推荐架构与数据流

```
┌─────────────────────────── TraceKeep App（手机端，主链路，完全离线可用） ───────────────────────────┐
│  录制(录音/录像/录屏) + GPS + 事件日志                                                                │
│      → 封装完成后流式 SHA-256 → 版本化哈希链 → Keystore 签名                                          │
│      → 应用私有存储：原始媒体 / 日志 / 位置 / 签名材料 四分离                                          │
│      → 证据包导出（自有 manifest.json + 可选"桌面兼容格式"变体）                                        │
└──────────────────────────────────────────────┬───────────────────────────────────────────────────┘
                                               │ 用户主动导出（本地文件，无强制上传）
                                               ▼
                              TraceKeep 证据包（自包含、可独立验证）
                                               │
                       ┌───────────────────────┴─────────────────────────┐
                       │ 可选（桌面，用户自愿安装，App 不依赖、不集成）        │
                       ▼                                                 ▼
         androidqf（补充 ADB 系统级采集）                      MVT / ALEAPP / DroidCustos
         → 独立归档，不动 TraceKeep 原始包                     → 对"桌面兼容格式"导出物做
                                                             IOC 扫描 / 解析 / 案件化管理
                       所有分析产物写入新的输出目录，永不回写、覆盖原始证据
```

**关键架构决策（建议）**：

1. **App 端零第三方运行时依赖**：录音、录像、录屏、GPS、哈希、签名、导出、验证均自研；四个工具的任何代码/二进制不进入 APK。
2. **"桌面兼容格式"作为可选导出**（非默认、非唯一）：在 TraceKeep 自有证据包之外，额外生成一个对齐 AndroidQF 归档最小结构的 ZIP（`acquisition.json` 风格元数据 + `hashes.csv` 风格清单 + `media/`、`logs/` 等），并附 `README.txt` 说明：格式来源、字段含义、可用哪些社区工具查看、以及"这些工具与任何法律效力无关联"的声明。**导出失败不得影响原始证据包**。
3. **四分离强制执行**：原始证据（只读）、工作副本（一次性）、分析结果（永远写入新目录）、导出报告（独立目录）——借鉴 DroidCustos 目录模式的**思想**（GPL 代码不复制），并在导出包内以只读标记 + 校验和固定原始件。
4. **验证双通道**：(a) TraceKeep 自带独立离线验证工具（自研，PASS/FAIL/WARN/SKIPPED）；(b) 可选桌面复核：MVT/ALEAPP 等对导出物的读取只作为"附加检查"，结果单独标注。
5. **供应商/工具解耦**：未来若引入可信时间戳服务（阶段 0 结果），走 `TimestampProvider` 接口；桌面工具同理走"导出格式适配层"，核心业务不感知。

---

## 8. 建议复用 / 参考 / 独立实现 / 暂不实现

### 8.1 建议复用（低耦合、无传染）

| 项 | 方式 | 许可证动作 |
|---|---|---|
| AndroidQF 归档公开结构（ZIP + `acquisition.json` + `hashes.csv` 字段约定） | 格式对齐（独立实现读写代码） | 无代码复制；文档注明兼容性来源 |
| `android-collector`（MIT）的输出 JSON 结构参考 | 设计参考 | 无；若复制代码则保留 MIT 声明 |
| ALEAPP（MIT）作为用户侧桌面工具 | 文档推荐 | 无（用户自行安装） |
| MVT（MVT 1.1）作为用户侧桌面工具 | 文档推荐 + 许可证提示 | 无（用户自行安装；提示同意条款） |

### 8.2 建议参考实现（只借鉴设计，干净重写）

| 项 | 来源 | 借鉴点 |
|---|---|---|
| 案件目录四分离结构 | DroidCustos | `00_metadata/01_evidence/02_working/03_analysis/04_reports/05_hashes` 思想（改为证据包内布局） |
| 保管链记录 | DroidCustos | `custody.jsonl` 字段（UTC 时间、命令、返回码、工具版本、哈希）→ TraceKeep 的追加式操作日志字段设计 |
| 模块/会话状态显式化 | AndroidQF | completed/partial/failed + 错误对象，禁止静默忽略缺失 |
| 时钟偏移测量 | DroidCustos | 记录主机-设备偏移与不确定度的字段设计 → TraceKeep 的墙钟/单调钟差值异常检测 |
| 归档安全提取 | DroidCustos | 路径穿越/符号链接/压缩比检查清单 → TraceKeep 导入导出安全测试用例 |
| 验证等级记录 | DroidCustos | DECLARATIVE/EMULATOR/PHYSICAL/DEEP/REGRESSION 分级用于 TraceKeep 兼容性文档 |

### 8.3 独立实现（自研，无可用复用）

录音、录像、录屏、GPS、流式 SHA-256、版本化哈希链、Keystore 签名与密钥轮换、证据包与 manifest、PDF 报告、独立验证工具、时间戳/存证接口层、隐私与合法性提示、全部测试体系。

### 8.4 暂不实现（本阶段及首版明确不做）

| 项 | 理由 |
|---|---|
| 在 App 内运行或捆绑 MVT/ALEAPP/DroidCustos/androidqf | 无端上价值；许可证与体积/隐私风险 |
| ADB 采集功能进入 App | 需要电脑侧 ADB 主机，手机单机无法完成；与"个人手机应用"定位冲突 |
| 侵入日志（Intrusion Logging）采集 | 依赖 Android 16+ 高级保护模式与人工导出流程，超出首版范围（记入路线图备忘） |
| 磁盘镜像 / 物理取证能力 | 明确超出 TraceKeep 定位；四个工具也不做 |
| 完整 ALEAPP 解析能力端上化 | Python 生态无法在 Android 端合理解析；桌面伴侣模式替代 |

---

## 9. 主要技术限制及法律风险

### 技术限制

1. **桌面/端上鸿沟**：四个项目需要 Python≥3.10/3.11 或 Go 桌面环境，本机（macOS）当前仅有系统 Python 3.9.6、无 Go 工具链——若未来做"桌面兼容格式实测"，需先安装 Python 3.12（属后续阶段的独立动作，本阶段未安装）。macOS 版 androidqf 发布二进制已签名可直接使用。
2. **ADB 依赖**：桌面伴侣路线的所有工具都要求 USB 调试 + 人工授权，普通个人用户门槛较高；且 ADB 授权记录只能识别主机密钥（androidqf 归档中 `adb_host_key.pub` 明确"标识 ADB 主机身份，不标识具体程序"）。
3. **完整性链条缺口**：MVT 与 DroidCustos 均不校验 androidqf `hashes.csv`（已核实源码）；跨工具流转时完整性责任落在使用方。TraceKeep 若做格式兼容必须自带校验工具与说明。
4. **Alpha 软件风险**：DroidCustos 为 0.3.2 Alpha（0 stars、单作者、一次真机记录）。不可作为关键依赖，只可列为"可选的用户自装工具"。
5. **MVT v3 破坏性变更**：MVT 最近合并 v3 分支，脚本接口可能已破坏；若未来写桌面兼容说明，须固定版本号并注明。

### 法律风险（不构成法律意见）

1. **任何人不得从本报告得出"复用这些工具即满足中国司法证据要求"的结论**。四个项目均无中国证据法适配、无可信时间戳、无公证对接、无电子认证；DroidCustos 在官方 README 中将"保证法庭可采性"列入明确"不做"清单。
2. **MVT License 1.1 的使用限制**（第 3.0 条）要求数据所有者明确同意——这与 TraceKeep"用户录制自己设备"的场景相容，但**向用户推荐桌面工具时必须在文档中如实转述该条件**，避免用户将工具用于非同意的第三方数据。
3. **GPL-3.0 传染**：任何对 DroidCustos 的代码级复用都会要求 TraceKeep 整体以 GPL 发布并开放源码——与当前项目性质不符，本报告明确不建议。
4. **不得使用"司法鉴定""法院认证""百分之百有效"等措辞描述任何工具或其输出**（PROJECT_REQUIREMENTS.md §12 红线同样适用于对开源工具的表述）。
5. **格式兼容不等于效力背书**：在导出包 README 与 App 文案中，应描述为"与部分开源取证工具的文件格式兼容，便于第三方复核"，**不得**表述为"被专业取证工具认可/支持"。

---

## 10. 分阶段开发计划与测试验收标准（受本评估影响的增量部分）

现有 PROJECT_REQUIREMENTS.md 的 11 阶段计划保持不变，本评估增补如下增量：

| 阶段 | 增量事项 |
|---|---|
| 阶段 1（环境与架构） | 文档记录：本评估结论进入 TECHNICAL_PLAN.md 的"不集成第三方工具"决策与理由；THREAT_MODEL.md 增加"格式兼容导出的隐私考量（导出物含媒体，桌面流转须提示加密存储）" |
| 阶段 9（证据包） | 实现"桌面兼容格式"导出（对齐 AndroidQF 归档最小结构）+ 导出自带 README（含许可证声明、工具推荐、效力免责声明）；导出失败不得影响原始证据包 |
| 阶段 9/10 衔接 | 用真实导出物做一次桌面消费实测（安装 Python 3.12 + MVT），记录实际结果；**结果只允许表述为"格式可被某版本工具读取"，不得引申为效力** |
| 阶段 10（独立验证） | 验证工具同时校验"桌面兼容格式"变体与自有证据包的一致性；跨格式哈希核对 |
| 阶段 11（发布候选） | 依赖/许可证清单复核：确认 APK 未打包任何第三方工具；文档中所有对 MVT/ALEAPP/DroidCustos/androidqf 的引用均附许可证属性与免责声明 |

**新增测试验收标准：**

1. "桌面兼容格式"导出物通过 JSON/CSV 结构校验（字段齐全、hashes.csv 条目哈希与文件核对一致）。
2. 桌面实测（阶段 9/10，需安装 Python ≥3.10）：`mvt-android check-androidqf <导出物>` 能运行并输出结果（无论是否命中 IOC）；若因缺少 androidqf 专有文件报错，记录实际行为并明确文档提示——**此为待实测项，不得提前宣称通过**。
3. 破坏性测试覆盖：修改导出物中任一文件后，TraceKeep 自带验证工具必须报 FAIL，且 MVT 等桌面工具无完整校验的事实要写入报告说明。
4. 文案红线测试：全文搜索导出包 README、App 界面、报告字段——禁止出现"法院""必然采信""司法效力"等与事实不符的正向表述。

---

## 11. 待核实与待决策事项

**待实测（需要实际运行才能确认，本阶段仅静态核对）：**

1. TraceKeep 未来生成的 AndroidQF 兼容导出物能否被 MVT `check-androidqf`（v2026.10.26）无致命错误地读取——本机缺 Python ≥3.10，未执行；不得在实测前宣传兼容性。
2. ALEAPP 对 androidqf 风格 ZIP 的**整体**支持程度（仅确认其 `intrusion_logging` artifact 明确支持 androidqf 目录；其余 artifact 对压缩包输入的覆盖待实测）。
3. DroidCustos 是否可将外部证据包纳管（其 import 为自有 `.dcx` 加密格式；外部包导入路径待核实）。

**待用户决策：**

4. 是否需要"桌面伴侣"路线（用户实际使用场景中是否有电脑可用）——直接决定"桌面兼容格式"的投入优先级。
5. TraceKeep 的分发方式（个人 sideload 自用 vs 未来公开分发）——影响对 MVT License / GPL 风险的保守程度评估。
6. 阶段 0（法律与第三方服务调研，含可信时间戳/存证）与本报告的衔接顺序——本报告不覆盖该部分，等待另行执行与确认。

---

## 12. 附录：核对记录

- 核对命令（节选，均在 `/tmp/tracekeep-oss-assessment/` 执行，未触碰项目目录）：
  - `git clone --depth 1 https://github.com/{mvt-project/androidqf,abrignoni/ALEAPP,mvt-project/mvt,h3st4k3r/DroidCustos}.git`
  - `git fetch --unshallow`（补全历史用于活跃度统计）
  - `gh api repos/<repo> --jq '{stars,license,archived,pushed}'`（元数据核对）
  - 逐仓库 `LICENSE`、`pyproject.toml`、`go.mod`、README 全文、`docs/*.md` 阅读
  - `grep -rn "hashes.csv" mvt/src ...`（确认 MVT/DroidCustos 均不校验）
  - `grep -rn "verify" androidqf --include="*.go"`（确认 androidqf 无归档验证子命令）
- 环境核对（本机，2026-10-29）：
  - JDK 17.0.20.1（`/opt/homebrew/opt/openjdk@17`）；Android SDK 位于 `~/Library/Android/sdk`（platform-tools/adb 37.0.1、build-tools、platforms、emulator）；系统 Python 3.9.6；无 Go；`adb devices` 无设备（评估后已 `adb kill-server`）。
  - 项目目录仅含 `PROJECT_REQUIREMENTS.md` 与空 `docs/`；本评估未修改任何既有文件，未安装依赖，未提交 Git。
- 引用来源均为上述仓库源码快照（commit 哈希见第 2 节表格），核实日期 2026-10-29。

---

*本报告为技术评估，不构成法律意见；任何工具或技术方案均不保证证据真实性、合法性、关联性或法院采信结果。*
