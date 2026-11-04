# TraceKeep 变更记录（CHANGELOG.md）

本项目遵循语义化版本（MAJOR.MINOR.PATCH）；版本号与 `versionCode` 同步递增。
版本号唯一来源：`app/build.gradle.kts` 的 `defaultConfig`（versionCode / versionName）；
应用内读取版本统一用 `BuildConfig.VERSION_NAME`（不硬编码副本）。

## [0.1.6] - versionCode 7（2026-10-30）

### 修复（阶段 9/10 复审发现，与需求 §6 验收相悖的实际缺陷）
- **SAF 导出覆盖同名文件**：`EvidenceExporter.copyTreeToSaf` 对已存在的同名文件以 `"wt"` 截断
  写入（注释写"不覆盖"但行为相反）。改为：目标树下已有同名 `TraceKeep-<id>` 目录时另建带唯一
  后缀的兄弟目录；文件一律在新目录内新建，绝不截断既有文件。
- **导出过早报成功**：`ok` 取自「打包到缓存」的复核，SAF 复制尚未发生，复制失败仍显示
  「导出成功」。新增 `verifySafDestination`：复制后重读 SAF 目标内容重算 SHA-256 与清单
  比对，打包复核与目标复核均通过才报告成功；导出结束清理缓存 staging。
- **导出后复核范围不足**：`verifyPackage` 只复核 `media/`，且 manifest 仅检查"存在"。
  现一并重算 `logs/events.log` 与 `location/locations.jsonl`（清单记录了哈希时），
  manifest 改为「可反序列化」判定。
- **独立验证器缺少计划 §5.7 的三项检查**（新增检查项，ID 稳定）：
  - `path_safety`：清单相对路径不得为空/绝对/含反斜杠/含 `..`，解析后必须仍在 `media/`
    内且不经符号链接——违规 → FAIL；CLI 读取文件前同样做穿越防护（**不信任清单**）；
  - `unreferenced_files`：`media/` 下清单未登记的文件 → WARN 并逐一列出；
  - `signature_file_binding`：签名对象 `signedPayload.files` 摘要须与清单登记的每个文件哈希
    一致——文件完整性比对的是「清单里的哈希」，清单本身可被改动，只有与私钥签署过的摘要
    交叉核对才能发现「清单与媒体被同时改写」（无签名 → SKIPPED，不以坏签名背书清单）。

### 修复（阶段 11 安全审计与 lint）
- **API 26–28 内部音频崩溃**：`startInternalAudio` 在版本判定前即引用 `AudioPlaybackCaptureConfiguration`
  （API 29 类），低版本会在类加载阶段抛 `NoClassDefFoundError` 而非如实返回 Failure。改为先判
  `SDK_INT < Q` 直接 Failure，再进入 `@RequiresApi(Q)` 实现。
- **权限前置检查**：CameraX 录像启动前检查 CAMERA（带音轨时 RECORD_AUDIO）；内部音频启动前检查
  RECORD_AUDIO——未授权返回 Failure，不抛 `SecurityException`。
- **API 31+ 备份排除**：新增 `res/xml/data_extraction_rules.xml`（云备份与设备迁移全域排除）并在清单
  引用；此前仅 `allowBackup=false` 对 Android 12+ 不足以排除证据材料进入云备份。
- Lint `:app:lintRelease`：**Error 7 → 0**；Warning 31 → 29（剩余为依赖版本提示/图标/性能提示，
  逐项处置见 `docs/TEST_REPORT.md` §3.1）。

### 新增（阶段 11 交付物）
- `docs/TEST_REPORT.md`：实际执行的测试/构建/lint/CLI 结果与需求 §4.6 十二项映射；真机项如实「未执行」。
- `docs/SECURITY_AND_PRIVACY.md`：权限最小化、无网络（源码 0 命中 + 无 INTERNET 权限）、日志脱敏、
  密钥保护、路径安全、190 个运行时制品许可证复查（全部 Apache-2.0）、残余风险表。
- `docs/RELEASE_CHECKLIST.md`：发布门禁；结论「**开发阶段完成，发布验收未完成**」。

### 测试
- `EvidenceVerifierTest` 15 → 24；`EvidencePackageBuilderTest` 9 → 11。
- 单元测试合计 **195 项全绿**（`./gradlew cleanTest test --rerun-tasks` exit 0）。
- **独立 CLI 实测**（`installDist` 产物，对由真实 `EvidencePackageBuilder` 生成的样本包离线运行）：
  干净包 PASS 5 / SKIPPED 2，退出码 0；篡改媒体 1 字节 → `file_integrity` FAIL 并给出
  登记/实际哈希，退出码 1；清单注入 `../../etc/passwd` + 放入未登记文件 →
  `path_safety` FAIL + `unreferenced_files` WARN，退出码 1。

### 构建产物
- `dist/TraceKeep-v0.1.6-release.apk`：**8,949,959 字节**，
  SHA-256 `c6b00309b3552472953748b1affd1f329b018a6d464b7f425ccebd28fe4efb7c`；
  `apksigner verify`：v2 方案通过，签名者 `CN=TraceKeep Personal Release`
  （证书 SHA-256 `f9991fef…bd042921`，与 D-019 同一密钥）；`aapt` 读回 versionCode=7 / 0.1.6。
  构建日志：`docs/execution/logs/2026-10-30-v0.1.6-release-build.log`；lint 结果
  `docs/execution/logs/2026-10-30-stage11-lint-results.xml`。

### 已知限制（如实声明）
- SAF 目标复核只覆盖 `media/`（DocumentFile 逐文件读回）；`logs/`、`signatures/` 的目标副本
  以打包阶段复核为准——真机端到端导出 + 桌面 CLI 验证**待真机执行**；
- 模拟器无 TEE，密钥保护级别仍报告 SOFTWARE_BACKED；硬件支持待真机。

## [0.1.5] - versionCode 6（2026-10-30）

> 本版本提交时未同步写入 CHANGELOG，此处依据提交 `c0e83b9`/`9fc606f`/`2bda41b` 补记；
> 其中导出/验证的三处行为缺陷已在 0.1.6 修复（见上）。

### 新增
- **第三方能力接口层（阶段 8 可执行部分）**：`core:timestamp`（`TimestampProvider` +
  NotConfigured/Configured/Unavailable + Success/Failed/NotAttempted + NoOp）、`core:provider`
  （`EvidencePreservationProvider` + `SubmissionScope` 隐私分级 DigestOnly/ManifestOnly/FullMedia +
  NoOp + `ThirdPartyStatus` 诚实声明）。具体供应商适配器**不实现**（D-003/D-018：前置未满足）；
  不硬编码 API、不虚构回执；界面/报告如实显示「没有第三方时间戳/存证」。
- **证据包导出（阶段 9，`core:export` 纯 JVM）**：`EvidenceManifest`（需求 §6 字段）、
  `EvidencePackageBuilder`（`manifest.json` + `report.pdf` + `README.txt` + `media/` + `logs/` +
  `location/` + `signatures/`（**不含私钥**）+ `receipts/` + `verification/`；只读源材料、目标
  目录已存在即失败、导出后重读重算写 `verification.json`）；`SimplePdfWriter`（无第三方依赖、
  确定性输出）+ `PdfReportGenerator`（时间来源区分、异常/缺失披露、禁误导措辞自检）。
  **如实限制（D-030）**：内置 Helvetica 不能渲染 CJK，PDF 为 ASCII 结构化事实摘要，中文叙述
  与能力边界在同包 `README.txt` / `manifest.json`（UTF-8）。
- **App 导出入口**：证据库每行「导出证据包」→ SAF 目录选择器（`OpenDocumentTree`）；
  导出不修改原始证据；与「停止即保存」解耦（导出不是保存的前置）。
- **独立离线验证 CLI（阶段 10，`core:verify` application 插件）**：`installDist` 可分发；
  仅用包内材料；不依赖 Android/原 App 数据库/私钥/网络；逐项 PASS/FAIL/WARN/SKIPPED；
  任一 FAIL 退出码 1，用法错误 2；`docs/VERIFY_TOOL.md` 使用说明与能力边界。

### 测试
- 新增 `NoOpProviderTest`/`ThirdPartyStatusTest` 5、`EvidencePackageBuilderTest` 5、
  `PdfReportGeneratorTest` 4、`CliVerificationTest` 2；合计 **186 项全绿**（提交信息写 184，实测 186）。

### 未交付
- 本版本未生成 release APK（`dist/` 止于 v0.1.3）；0.1.6 补齐。

## [0.1.4] - versionCode 5（2026-10-30）

### 新增
- **事件哈希链（阶段 7）**：版本化规范编码（`CanonicalEncoding`，固定字段序 + 键名字典序 +
  UTF-8 长度前缀 + 显式空值标记 + 不含自身 hash）与 `HashChain`（`hash=SHA-256(规范编码(事件))`，
  含 `prevHash` 前向绑定，创世 prevHash=GENESIS）；写入侧逐事件接链，链尾跨实例从事件日志恢复；
- **Android Keystore 签名**：EC P-256 + SHA256withECDSA；私钥永不导出；硬件支持如实检测
  （`isInsideSecureHardware`/securityLevel，软件级不冒充硬件级）；keyId=公钥指纹，别名映射持久化；
- **签名对象**：链头哈希 + 事件数 + 文件清单摘要 + 算法/格式版本/密钥标识（`SealCanonicalEncoder` 确定性编码）；
  封存时签署并落盘 `signatures.json`（不含私钥）；
- **独立验证器（core:verify）**：逐项 PASS/FAIL/WARN/SKIPPED（格式版本 / 文件重算 SHA-256 /
  哈希链连续性 / 签名有效性），不做"整体可信"结论；可脱离原 App 在纯 JVM 环境运行；
- 证据库界面：每行「封存并签名」「验证」按钮 + 结果展示。

### 修复
- app 模块启用 kotlin.serialization 插件（修复 `StoredKey` 序列化器缺失导致的签名静默失败）；
- Keystore 别名映射持久化（修复"生成用时间戳别名、查找用 keyId 派生别名"导致私钥定位失败）；
- `sealSigned` 支持对已封存未签名会话补签（修复"封存成功但签名失败后无法补签"）；
- 证据库对话框限高可滚动（修复内容超屏导致按钮触摸命中区错位）；
- 时间异常事件的 seq 分配顺序（修复此前导致后续事件序号乱序）；
- 版本号单一权威来源（`BuildConfig.VERSION_NAME`，消除 MainActivity 硬编码副本）。

### 测试
- 新增：`HashChainTest` 12 + `SignatureVerifierTest` 6 + `SealSigningTest` 6 +
  `EvidenceVerifierTest` 14（含需求 §4.6 的 12 项安全场景）+ `TimeJumpDetectorTest` 8 +
  `TimeAnomalyIntegrationTest` 3 + `OfflineVerificationExampleTest`（脱离原 App 的独立验证）。
- 单元测试合计 **170 项全绿**。
- 模拟器实测：Android Keystore 真实签名成功（keyId `EC-P256-266076977855CDEB`，
  如实报告 SOFTWARE_BACKED）；**脱离 App 的纯 JVM 独立验证器**验证真实设备证据 4 项全 PASS；
  篡改媒体 1 字节后独立验证器准确定位该文件哈希不符（FAIL 分项）。

### 已知限制（如实声明）
- 模拟器无 TEE，密钥保护级别报告为软件实现；真机硬件支持待验证；
- 独立验证器当前以测试形态演示（`OfflineVerificationExampleTest`）；阶段 10 交付正式 CLI 工具；
- 哈希链是防篡改检测，不是可信时间证明；签名不代表身份外部认证或内容真实。

## [0.1.3] - versionCode 4（2026-10-30）

### 新增
- **屏幕录制（阶段 5）**：MediaProjection 官方授权流程（每次会话重新授权）、
  MediaRecorder(SURFACE)+VirtualDisplay 录制、前台服务 `mediaProjection` 类型；
- **录屏音频三来源**：麦克风（MediaRecorder 音轨）/ 内部音频（AudioPlaybackCapture，
  Android 10+，独立 AudioRecord → WAV 原始件）/ 无音频；
- **多输出证据记录**：录屏的屏幕视频与内部音频轨作为两条并列原始件独立登记、
  各自哈希与完整性校验（引擎接口升级为 `outputFileNames` + 多文件 `start`）；
- WAV 封装工具（`WavPacker`，纯 JVM 可测）。

### 修复
- **前台服务从不停止**（存量缺陷）：录制结束后服务与通知永久驻留——已在
  stop/abort/引擎错误三条终止路径补上 `RecordingService.stop()`；
- **录屏 MediaRecorder 状态机顺序**（模拟器实测发现）：`setAudioSource` 必须在
  `setOutputFormat` 之前，否则抛无 message 的 IllegalStateException；
- 引擎失败原因 message 为空时回落为异常类名（不再出现无信息的 "null"）。

### 测试
- 新增 `ScreenRecordingTest`（7 项：WAV RIFF 结构/头回填、forScreen 多输出登记、
  内部音频启动失败整体中止、配置事件记录）。
- 单元测试合计 **119 项全绿**；模拟器验证录屏全流程（授权对话框/录制/保存/内部音频双输出）。
- 详见 `docs/execution/2026-10-30-stage5-screen.md`。

## [0.1.2] - versionCode 3（2026-10-30）

### 修复
- **停止录音后直接保存到本地证据库**：停止流程由「停止→封装」扩展为「停止→封装→完整性校验→
  保存记录持久化」；只有文件已封装、SHA-256 复核通过且会话保存记录（`saveStatus=SAVED`、
  `savedAtWallMs`）落盘后，界面才显示「保存成功，已存入本地证据库」。不再要求用户等待导出功能。
- **停止录像后直接保存到本地证据库**：同上流程；录像文件（含水印原始件）与元数据一并持久化。
- **修复保存状态反馈**：新增「正在停止 / 正在封装 / 正在保存到本地证据库」三阶段进度提示；
  保存失败显示明确原因，并保留录制文件（不删除、不静默丢失）。
- **修复摄像头预览区域覆盖顶部模式切换控件**：预览改用 `COMPATIBLE`（TextureView）实现模式
  （避免 SurfaceView 独立图层越界绘制遮挡控件），容器增加裁剪（clipToBounds）并保持
  「顶部模式栏 / 中间预览 / 底部操作区」三段式布局；录音/录像多次切换布局稳定。
- **完善异常保存处理**：保存幂等（重复点击停止不产生重复记录）；保存中进程退出后，
  下次启动自动对「已停止未保存」会话重试完整保存；保存失败（含 0 字节、哈希不匹配、
  记录不可写）状态如实持久化并展示。

### 新增
- 本地证据库查看入口（只读列表：类型 / 保存状态 / 文件名 / 大小 / SHA-256 / 保存时间 / 复核结果）。
- 会话格式 v2：`EvidenceSession` 新增 `stoppedAtWallMs / savedAtWallMs / saveStatus / saveErrorReason`
  （读取端兼容 v1，无需迁移）。
- 事件类型 `recording_saved` / `recording_save_failed`（追加式日志如实记录保存结果）。

### 测试
- 新增 `SaveOnStopTest`（8 项）：保存持久化、幂等、完整性失败保留文件、0 字节拒绝、
  未封装拒绝、崩溃恢复重试、观察事件先行。
- 单元测试合计 112 项全绿（model 15 + storage 49 + integrity 7 + recording 41）。
- 模拟器（Pixel 5 AVD / Android 13）辅助验证：录音与录像保存流程、重启后记录仍在、
  布局三段式与系统 Insets、异常路径（详见 `docs/execution/2026-10-30-save-and-layout.md`）。

### 已知限制（如实声明）
- 模拟器验证不构成真机验收；真机项（厂商 ROM、锁屏、定位精度等）仍待真机测试。
- 「保存成功」仅表示文件已存入本地证据库且记录已持久化，不代表内容真实或任何法律效力。
- 录像预览暂不含水印（水印进入最终视频文件；见 `docs/DECISIONS.md` D-020）。

## [0.1.1] - versionCode 2（2026-10-29）

### 新增
- 视频水印（`OverlayEffect`，目标 VIDEO_CAPTURE）：录制状态 / 设备时间（含时区）/ 起录时间 /
  位置（四态如实显示，未取得定位不伪造坐标）/ 本地记录编号，写入最终视频文件。
- 录音/录像状态提示（闪烁录制指示、状态文字、实时计时、暂停冻结）。
- 定位记录开关（默认关闭；运行时「使用中」权限；实际结果写入 `locations.jsonl`）。

### 修复
- 摄像头模式布局被预览覆盖（Insets 处理 + 三段式布局）。
- 快速连续点击停止/开始的状态一致性（异步阶段防连点）。
- `Path.of` API 兼容性（minSdk 26 上改用 `Paths.get`）。

## [0.1.0] - versionCode 1（2026-10-29）

### 新增
- 录音（MediaRecorder + 前台服务）、摄像头录像（CameraX VideoCapture）、会话状态机、
  私有存储、原子封存、崩溃恢复、SHA-256 校验、追加式事件日志、证据清单与本地验证基础。
