# TraceKeep 验收标准与需求追踪矩阵（ACCEPTANCE_CRITERIA.md）

> 阶段 1 交付物（`PROJECT_REQUIREMENTS.md` §2、§9）。本文件把需求文档 §3–§9 的验收要求拆解为可勾选清单，并维护「需求 ↔ 实施 ↔ 验证 ↔ 证据 ↔ 风险」追踪矩阵。
> 规则：**仅写了代码不代表已验证；仅编译成功也不代表功能验收通过。**所有状态以 `docs/execution/` 执行日志中的实测证据为准。
> 状态图例：待实施｜实施中｜待验证｜**已验证**｜阻塞｜不适用（须说明依据）。
> 验证环境口径（2026-10-29 起）：**模拟器（Pixel 5 AVD / Android 13 / SDK 33）结果仅作辅助证据**——不构成真机验收（需求 §9 禁止以模拟器替代真机测试）；模拟器已验证项在表中标注来源。

---

## 1. 需求追踪矩阵（按需求文档章节）

| 需求 ID | 需求摘要 | 实施位置（计划） | 验证方法 | 当前状态 | 验证证据 | 阻塞/风险 |
|---|---|---|---|---|---|---|
| R2.1 | Kotlin + 原生 Android + Compose 技术栈 | 工程骨架（app + core/*） | 构建成功 + 代码审查 | **已验证**（阶段 1 构建 + 阶段 2 扩展构建全绿） | 构建日志 stage1/stage2 | 无 |
| R2.2 | 工程可编译；依赖固定 + 许可证清单 | `libs.versions.toml`、ENVIRONMENT.md §6 | `./gradlew :app:assembleDebug` 实测 | **已验证**（阶段 2 构建 `BUILD SUCCESSFUL`，exit 0） | `docs/execution/logs/2026-10-29-stage2-build.log` | 无 |
| R2.3 | 无广告/分析/默认上传 SDK；不要求账号 | 依赖清单审查 | 依赖列表人工复核 | **已验证**（阶段 11：`releaseRuntimeClasspath` 190 制品全为 AndroidX/JetBrains/Guava 等 Apache-2.0；无广告/分析/上传 SDK；无账号） | `docs/SECURITY_AND_PRIVACY.md` §5 | 依赖漏洞扫描未执行（无工具） |
| R2.4 | 无未经确认的 Git push/发布/数据删除 | 流程约束 | 流程审计 | **已验证**（截至 2026-10-29 从未 push/发布） | git status 记录 | 持续约束 |
| R3.1 | 录音：权限/前台服务/状态/异常/锁屏行为 | core/recording + app | 真机测试矩阵 | **实施中**（代码+单测完成；模拟器验证：录音全流程+**停止即保存+重启持久化**+状态提示+计时+防连点） | `SaveOnStopTest` + `docs/execution/2026-10-30-save-and-layout.md` | **无真机**（锁屏/中断/ROM 限制待实测） |
| R3.2 | 录像：能力检查/音轨/封装/原始保全 | core/recording + CameraXVideoEngine | 真机测试 | **实施中**（代码+单测完成；模拟器验证录像全流程+水印入视频通过；真机项未验证） | 同上（含帧提取水印实证） | **无真机**；录像中切镜头为"不支持"（D-017） |
| R3.3 | 录屏：MediaProjection 授权/前台服务/音频提示 | core/recording + ScreenRecorderEngine（阶段 5） | 真机测试 + 兼容性矩阵 | **实施中**（代码+7 项单测完成；模拟器验证：授权对话框/录制/停止保存/内部音频双输出；真机项未验证） | `ScreenRecordingTest` + `docs/execution/2026-10-30-stage5-screen.md` | **无真机**（ROM 内部音频限制/旋转/长时录制待实测） |
| R3.4 | 记录真实编码参数；有损不得称原始 | core/recording（MediaInspector） | 单元测试 + 真机读回 | **部分已验证**（requested/observed 分离已测；模拟器读回 durationMs/mime 通过；真机一致性未验证） | `RecordingControllerTest` 参数读回用例 | 真机读回待验 |
| R3.5 | 停止即保存本地证据库（不依赖导出） | core/storage + core/recording | 单元 + 模拟器 E2E | **已验证（模拟器辅助）**（保存持久化/幂等/失败保留/恢复重试/重启可见；真机项标注） | `SaveOnStopTest` 8 项 + 2026-10-30 执行日志 | 真机复验待做 |
| R4.1 | GPS：开关控制/间隔/精度/来源 | core/location + app LocationSampler（阶段 6） | 单元 + 真机 | **部分已验证**（四态如实映射/不补造坐标已实现；模拟器注入 GPS 实测显示实际坐标；真机精度待验） | `docs/execution/2026-10-30-save-and-layout.md` | 真机精度/权限撤销待验 |
| R4.2 | 时间：墙钟/单调钟/定位/收写/签发分离 | core/model + core/location | 单元测试（时间跳变） | **已验证（JVM）**（双时间源分离 + TimeJumpDetector 8 项 + 集成 3 项：跳变如实记录、历史不被改写、重启不误报） | `TimeJumpDetectorTest`/`TimeAnomalyIntegrationTest` | 无法发现双钟同改（已如实披露） |
| R4.3 | 操作日志：追加式 + 来源类型标注 | core/storage（阶段 2 已完成核心） | 破坏性测试（删改重排） | **待验证→部分已验证**（追加/坏行跳过/跨实例序号单调已测；哈希链在阶段 7） | `EvidenceStoreTest`（36 项） | 链字段阶段 7 启用 |
| R5.1 | 私有存储 + 临时文件 + 原子提交 + 封存 | core/storage（阶段 2） | 单元 + 恢复测试 | **已验证**（封存/恢复/会话终态拒绝写入均实测；Android filesDir 接线在阶段 3） | `EvidenceStoreTest` + `docs/execution/2026-10-29-stage2.md` | Android 层接线待阶段 3 |
| R5.2 | 流式 SHA-256 + 五类校验状态 | core/integrity + core/storage | NIST 向量 + 破坏性测试 | **已验证**（NIST 7 向量 + 五分类 PASS/FAIL/MISSING/UNFINISHED 实测；UNREADABLE 分支代码已备待专项用例） | `Sha256Test` 7 + `EvidenceStoreTest` 校验组 | 无 |
| R5.3 | 版本化规范编码 + 哈希链（序号+前哈希） | core/integrity（阶段 7） | 固定向量 + 破坏性 | **已验证（JVM+模拟器）**（规范编码确定性 3 项 + 链破坏性 9 项：改/删/插/重排/坏创世/字段缺失分项） | `HashChainTest` 12 + 独立验证器 14 | 无 |
| R5.4 | Keystore 签名；私钥不出包；密钥丢失/轮换规则 | core/crypto + app AndroidKeystoreSigner（阶段 7） | 单元 + 导出包扫描 | **已验证（模拟器辅助）**（真实 Keystore 签名成功、signatures.json 不含私钥、硬件级别如实报告；密钥丢失/轮换规则已文档化） | `SealSigningTest` 6 + 模拟器实测 | **真机硬件支持（TEE/StrongBox）与厂商 Keystore 差异待验** |
| R5.5 | 校验失败不覆盖不自动修复 | core/integrity 设计约束 | 破坏性测试 | **已验证**（验证器只读；篡改真实证据后 FAIL 分项定位，原文件未改动） | `EvidenceVerifierTest` 14 | 无 |
| R6.1 | 证据包结构（manifest/报告/媒体/位置/日志/签名/时间戳/回执/验证） | core/export（阶段 9） | 结构校验 + 破坏性 | **已验证（JVM）**（`manifest.json`/`report.pdf`/`README.txt`/`media/`/`logs/`/`location/`/`signatures/`（无私钥）/`receipts/`（未配置时说明）/`verification/`；真实 builder 生成样本包并由独立 CLI 读取通过） | `EvidencePackageBuilderTest` 11 + `docs/execution/2026-10-30-stage9-10-export-verify.md` | 真机 SAF 导出端到端待验 |
| R6.2 | 导出后重读重算 + 不覆盖同名 + 失败不显示成功 | core/export + app EvidenceExporter（阶段 9） | 集成测试 | **已验证（JVM）/ 已修复（app）**（目标存在即失败；重读 media/logs/location 重算；篡改媒体与事件日志均检出。**v0.1.5 的 app 层曾覆盖同名并过早报成功，v0.1.6 修复**：同名另建目录、SAF 目标副本重读重算双复核） | `verifyPackage_detectsTamperedExport/EventLog`、`build_failsWhenTargetExists`；提交 `b09fa6a` | **app 层 SAF 行为未在模拟器/真机实测**（本轮无设备会话） |
| R6.3 | PDF 报告：区分事实/未证实；禁误导措辞 | core/export PdfReportGenerator | 文案扫描测试 | **已验证（JVM，ASCII 摘要）**（时间来源分节"NOT a trusted timestamp"、签名/链能力边界、异常/缺失分节、禁词命中即抛错；确定性输出） | `PdfReportGeneratorTest` 4 | **PDF 不渲染中文（D-030）**——中文叙述在 README/manifest；是否引入 CJK 字体待用户决策 |
| R6.4 | 独立离线验证工具（PASS/FAIL/WARN/SKIPPED） | core/verify CLI（阶段 10） | 干净环境验证测试 | **已验证（JVM + 本机 CLI 实测）**（`installDist` 产物离线运行；7 项逐项输出；干净包 exit 0；篡改 1 字节 → FAIL exit 1；清单穿越 `../../etc/passwd` → `path_safety` FAIL；未登记文件 → WARN；无公钥 → SKIPPED 不当通过） | `EvidenceVerifierTest` 24 + `CliVerificationTest` 2 + 执行日志 CLI 输出 | 「复制到另一台电脑验证」仅在本机不同目录模拟，**异机验证待做**；真机导出包验证待做 |
| R7.1 | TimestampProvider/EvidencePreservationProvider 接口 | core/timestamp + core/provider | 接口测试 | **已验证（接口层）**（TimestampProvider/EvidencePreservationProvider + NoOp 实现 + ThirdPartyStatus 诚实声明；5 项测试） | `NoOpProviderTest`/`ThirdPartyStatusTest` | **阶段 8 适配器阻塞于用户选定供应商**（D-018）；不硬编码 API、不虚构回执 |
| R7.2 | 提交前显示范围/费用/隐私；用户确认 | 接口层 + UI（阶段 8） | UI 测试 + 流程审查 | 待实施 | — | 同上（无接入时该流程仅存在于接口层与文档） |
| R7.3 | 保存凭证原文/验证材料；失败不伪造回执 | core/timestamp（阶段 8） | 集成 + 故障注入 | 待实施 | — | 同上 |
| R8.1 | 默认本地；无确认不上传；无隐蔽录制 | 架构约束 + Manifest 审查 | 网络审计 + 代码审查 | **已验证**（阶段 11：源码网络 API 0 命中 + 合并清单无 INTERNET 权限 → 技术上无法上传；录像需预览绑定、录屏每次重新授权；`allowBackup=false` + `dataExtractionRules`） | `docs/SECURITY_AND_PRIVACY.md` §2 | 持续约束 |
| R8.2 | 权限最小化/白名单/脱敏/路径安全 | 各模块 + 阶段 11 审计 | 静态检查 + 测试 | **已验证**（权限与功能一一对应、无 INTERNET；日志仅 4 处无敏感字段；路径安全写入端 `PathSafety` + 验证端 `path_safety`；lint Error 0） | `docs/SECURITY_AND_PRIVACY.md` §1/§2.4/§4 + `PathSafetyTest` + `EvidenceVerifierTest` | 依赖漏洞扫描未执行 |
| R9.1 | 单元测试（哈希/编码/链/签名/清单/路径/报告） | tests + core/* | 测试全绿 | **已验证**（当前 **195 项全绿**：model 15 + storage 58 + integrity 19 + crypto 7 + verify 24 + export 11 + location 8 + recording 48 + timestamp 2 + provider 3；覆盖哈希/编码/链/签名/清单/路径/报告全部类别） | `docs/execution/logs/` 测试 XML | 持续维护 |
| R9.2 | 集成/破坏性测试 | 阶段 2–11 | 见各阶段 | **部分已验证**（JVM 破坏性：改媒体/改清单/删改插重排事件/改签名/错公钥/删公钥/路径穿越/未引用文件/篡改导出日志均有分项；**改系统时间/断网/重复提交/服务端超时**：前者由 TimeJumpDetector 覆盖，后三者因无第三方接入**不适用于当前版本**） | 各模块测试 | 第三方场景待阶段 8 适配器 |
| R9.3 | 真机验证（型号+版本+步骤+结果+未验证项） | docs/execution/ | 测试记录 | 待实施 | — | **无真机**（用户提供后执行） |
| R10.1 | 每阶段交付文件/验收/未解决 | docs/execution/ | 阶段汇报 | **实施中**（阶段 1 执行日志本轮建立） | 2026-10-29-stage1.md | — |
| R11.1 | 第三方服务未核实不宣称已实现 | 文档 + 文案纪律 | 文案扫描 | **已验证**（DECISIONS.md D-003；报告/文档无此类宣称） | 文档审查 | 持续约束 |
| R12.1 | 验收红线（原始媒体/假阳性/隐瞒/时间措辞/独立验证/真机虚报/隐私审查） | THREAT_MODEL.md §4 映射 | 逐项检查 | **已逐项检查**（见下 §3 红线表；阶段 11 隐私审查完成；**真机项全部如实标注未执行**） | `docs/RELEASE_CHECKLIST.md` §7 | **发布验收未完成**（真机/漏洞扫描/法律确认/D-008） |

## 2. 阶段 1 验收清单（本轮）

- [x] 检查 JDK/SDK/Gradle/AGP/Kotlin 兼容性与目录状态（ENVIRONMENT.md §1）
- [x] 目录非空检查：仅需求/评估/文档，无既有工程被覆盖
- [x] Gradle Wrapper（8.11.1）生成并入库工作区
- [x] 工程骨架：app + core/{model,storage,integrity,crypto,location,timestamp,provider,export,verify}
- [x] 版本固定（libs.versions.toml 无动态版本）
- [x] **构建实测**：`./gradlew :app:assembleDebug` 成功且 APK 存在（10,064,050 字节，SHA-256 `c59ae270…`）
- [x] **单元测试实测**：`:core:model:test` `:core:integrity:test` 全绿（9/9）
- [x] ENVIRONMENT.md / ANDROID_COMPATIBILITY.md / ACCEPTANCE_CRITERIA.md / DECISIONS.md 更新
- [x] 暂不实现真实录制功能（骨架无任何录制代码）
- [x] 无真机连接、无证据数据、无 Git 提交/推送

**阶段 1 通过条件**：构建实测成功 + 测试全绿 + 文档齐备。→ **已满足（2026-10-29 实测）**。

## 2b. 阶段 2 验收清单（2026-10-29 实测）

- [x] EvidenceSession/EvidenceFile/EvidenceEvent/EvidenceLocation 数据模型（formatVersion=1 版本化 + 确定性序列化测试）
- [x] 证据状态机（全迁移真值表测试 + 非法迁移拒绝 + SEALED 仅经封存进入）
- [x] 应用私有存储适配：`core:storage` 纯 JVM（D-014），Android 层传 filesDir（阶段 3 接线）
- [x] 原子封存：tmp+fsync+ATOMIC_MOVE（账本）；追加+fsync（日志）
- [x] 恢复机制：CREATED/RECORDING/PAUSED→ABORTED + 未完成文件标记 + 观察事件（实测）
- [x] 破坏性测试：篡改媒体/追加伪造事件行/删除文件 → `verifySeal` 全部检出（修复了初版假阳性缺陷）
- [x] **无伪造录制数据作为正式证据**（测试数据仅存在于测试临时目录）
- [x] 构建实测：`BUILD SUCCESSFUL`，测试 **63/63 全绿**（model 14 + storage 49）

**阶段 2 通过条件**：状态机全路径与异常分支 ✓；恢复区分完整/未完成 ✓；构建与测试实测全绿 ✓。→ **已满足（2026-10-29）**。

## 3. 全局红线检查表（需求 §12，持续维护）

| 红线 | 当前状态 |
|---|---|
| 原始媒体不能稳定保存 / 中断后无法区分完整与不完整 | 已实现（停止即保存 + 恢复三态）；**真机行为待验** |
| 哈希/链/签名/凭证验证存在假阳性 | 阶段 7/10 破坏性测试把关：改/删/插/重排/错公钥/坏签名/清单穿越/清单与签名不符均 FAIL；缺材料 SKIPPED 不当通过（阶段 2 曾修复 `verifySeal` 假阳性） |
| 报告隐瞒中断/缺失/时间异常/校验失败 | manifest/README/PDF 均有「异常披露」「缺失数据」分节；时间异常事件入链；导出复核不一致如实列出且不报成功 |
| 第三方服务未核实却声称已实现可信存证 | **当前无任何此类宣称**（接口层 NoOp + `ThirdPartyStatus` 诚实声明；receipts/ 留说明） |
| 把设备时间称为可信时间戳 | PDF 显式 "NOT a trusted timestamp"；README/manifest 同；持续保持 |
| 把哈希一致/签名有效/上链等同于内容真实 | 验证器每项 detail 附能力边界；CLI 尾部必读声明；持续保持 |
| 独立验证依赖原 App 数据库或服务器 | **已验证**：CLI 只读包目录（manifest/media/logs/signatures 公钥），纯 JVM，无网络调用 |
| 未做真机测试写成已通过 | 当前所有真机项均标注「待真机」；v0.1.5/0.1.6 的 app 层导出**未在设备实测**，已如实标注 |
| 隐私/上传范围/合法性/第三方条款未审查 | 阶段 11 审查；L-1 调研已取消（D-018），应用维持不接入第三方服务，「未存证」状态如实显示 |

## 4. 需求不适用项（当前为零）

暂无标记为「不适用」的需求项。如未来出现，必须在此处说明依据并经用户确认后才可变更状态。
