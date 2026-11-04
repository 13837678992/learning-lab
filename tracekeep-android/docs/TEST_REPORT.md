# TraceKeep 测试报告（TEST_REPORT.md）

> 阶段 11 交付物（`TECHNICAL_PLAN.md` §8）。本报告只记录**实际执行**的测试与结果；未执行项明确标注「未执行」。
> 口径：模拟器结果为辅助证据，不构成真机验收（需求 §9）；本轮（2026-10-30 晚）**无设备会话**，所有真机/模拟器项沿用历史记录并标注日期。
> 版本：v0.1.6 / versionCode 7；提交 `e0bbf9d`。

## 1. 自动化测试（JVM 单元测试）

**命令**：`JAVA_HOME=/opt/homebrew/opt/openjdk@17 ./gradlew cleanTest test --rerun-tasks`
**结果**：EXIT 0；**195 项，0 失败，0 错误，0 跳过**（JUnit XML 汇总）。

| 模块 | 项数 | 覆盖 |
|---|---|---|
| core:model | 15 | 序列化确定性、状态机真值表、文案红线常量 |
| core:storage | 58 | 原子封存、恢复三态、追加日志、路径安全、封存签名、时间异常集成 |
| core:integrity | 19 | SHA-256 NIST 向量、规范编码确定性、哈希链改/删/插/重排/坏创世 |
| core:crypto | 7 | 签名验证分项（算法/公钥/摘要/签名值） |
| core:verify | 24 | 需求 §4.6 的 12 项安全场景 + 路径穿越/绝对路径/未引用文件/清单↔签名绑定 + CLI 样本 |
| core:export | 11 | 包结构、异常/缺失披露、目标存在即失败、不改原件、篡改媒体/事件日志检出、PDF 确定性与禁词 |
| core:location | 8 | 时间跳变检测分类与不误报 |
| core:recording | 48 | 录制编排、停止即保存幂等/失败保留/恢复、录屏多输出、水印、WAV |
| core:timestamp / provider | 5 | NoOp 语义、未尝试 vs 失败、诚实声明禁词 |

### 1.1 需求 §4.6 十二项安全场景 → 测试映射

| # | 场景 | 测试 | 结果 |
|---|---|---|---|
| 1 | 正常证据验证通过 | `scenario1_allValid_allPass` | PASS |
| 2 | 修改证据文件后失败 | `scenario2_modifiedFile_failsFileIntegrity`；CLI 实测篡改 1 字节 | FAIL 分项 ✓ |
| 3 | 修改元数据后失败 | `scenario3_modifiedEventContent_failsChain`；`manifestHashDiffersFromSignedFiles_failsBinding` | FAIL 分项 ✓ |
| 4 | 修改链中间记录 | `scenario4_modifiedMiddleRecord_failsChain` | FAIL ✓ |
| 5 | 删除记录 | `scenario5_deletedRecord_failsChain` | FAIL ✓ |
| 6 | 插入伪造记录 | `scenario6_insertedForgedRecord_failsChain` | FAIL ✓ |
| 7 | 错误公钥 | `scenario7_wrongPublicKey_failsSignature` | FAIL ✓ |
| 8 | 错误签名 | `scenario8_corruptedSignature_failsSignature` | FAIL ✓ |
| 9 | 密钥不可用 | `scenario9_missingPublicKey_skippedNotPassed`（SKIPPED 不当通过）；`SealSigningTest` 引擎失败不标记成功 | ✓ |
| 10 | 签名异常不标记成功 | `SealSigningTest`（engine 抛错 → 封存成功但签名状态如实为未签名） | ✓ |
| 11 | 重启后恢复验证状态 | `TimeAnomalyIntegrationTest`（基线跨实例恢复）、`HashChainTest` 链尾跨实例续链、`SaveOnStopTest` 崩溃恢复 | ✓ |
| 12 | 不支持格式明确报告 | `scenario12_unsupportedFormatVersion_fails` | FAIL（明确原因）✓ |

## 2. 独立验证 CLI 端到端（本机离线，2026-10-30）

样本包由**真实** `EvidencePackageBuilder` 生成；CLI 为 `:core:verify:installDist` 产物。

| 场景 | 逐项结果 | 退出码 |
|---|---|---|
| 干净包 | PASS 5（格式/路径/文件/未引用/链）SKIPPED 2（无签名） | 0 |
| 篡改 `media/a.m4a` 第 1 字节 | `file_integrity` FAIL（登记 a4f7af1c… 实际 d1fb694c…），其余不受影响 | 1 |
| 清单注入 `../../etc/passwd` + 未登记 `extra.bin` | `path_safety` FAIL；`unreferenced_files` WARN | 1 |

**未执行**：异机（另一台电脑）验证；真机导出包验证；含签名的真实包 CLI 验证（阶段 7 曾在模拟器以测试形态验证 4 项 PASS，非 CLI）。

## 3. 构建与静态检查

| 项 | 命令 | 结果 |
|---|---|---|
| Debug 构建 | `./gradlew :app:assembleDebug` | EXIT 0 |
| Release 构建 | `./gradlew :app:assembleRelease` | EXIT 0；`dist/TraceKeep-v0.1.6-release.apk` 8,949,959 B，SHA-256 `c6b00309…4efb7c` |
| APK 签名 | `apksigner verify --verbose` | v2 通过；`CN=TraceKeep Personal Release`，证书 SHA-256 `f9991fef…bd042921` |
| Lint | `./gradlew :app:lintRelease` | EXIT 0；**Error 0**（修复前 7：NewApi 5 真实缺陷、MissingPermission 2）；Warning 30（见 §3.1） |

### 3.1 Lint 剩余 Warning 处置

| ID | 数量 | 处置 |
|---|---|---|
| GradleDependency / AndroidGradlePluginVersion | 24 | 版本按 D-010「官方矩阵 + 实际构建 + 测试全绿」三重确认后固定；**不盲目升级**，列入下一版评估 |
| DataExtractionRules | 1 → **0** | 已新增 `res/xml/data_extraction_rules.xml` 并在清单引用（API 31+ 云备份/设备迁移全域排除）；见 SECURITY_AND_PRIVACY §2.3 |
| InlinedApi | 2 | `MediaMetadataRetriever` 常量在低版本返回 null，代码已按可空处理；无运行时风险 |
| MissingApplicationIcon | 1 | 个人 sideload 版本使用系统默认图标；公开分发前补齐 |
| ObsoleteSdkInt | 1 | minSdk 26 下冗余版本判断，无害 |
| AutoboxingStateCreation | 1 | 性能提示（`mutableStateOf<Int>` → `mutableIntStateOf`），非正确性问题 |

## 4. 模拟器 / 真机验证（历史记录，非本轮）

| 功能 | 模拟器（Pixel 5 AVD / Android 13） | 真机 |
|---|---|---|
| 录音全流程 + 停止即保存 + 重启持久化 | ✓ 2026-10-30（save-and-layout 日志） | **未执行** |
| 录像 + 水印入视频 | ✓ 2026-10-30 | **未执行** |
| 录屏授权/录制/内部音频双输出 | ✓ 2026-10-30（stage5 日志） | **未执行** |
| Keystore 真实签名 + 脱离 App 验证 + 篡改检出 | ✓ 2026-10-30（stage7 日志；SOFTWARE_BACKED） | **未执行**（TEE/StrongBox 待验） |
| **SAF 导出证据包（v0.1.5/0.1.6）** | **未执行** | **未执行** |
| 锁屏/切应用/权限撤销/磁盘不足/厂商 ROM 限制 | 不适用于模拟器 | **未执行** |

## 5. 结论

- 自动化与静态检查层面：**全部通过**（195/195，lint Error 0，release 构建与签名验证通过）。
- 功能验收层面：**真机项全部未执行**，SAF 导出未在任何设备实测——按需求 §9 与 §13，
  项目状态为「**开发阶段完成，发布验收未完成**」。
