# 执行日志：阶段 6 收口 + 阶段 7（哈希链与 Android Keystore 签名）v0.1.4

- **开始**：2026-10-30 14:30｜**结束**：2026-10-30 15:40（+08:00）
- **范围**：① 阶段 6 收口（时间源一致性检测）② 阶段 7（哈希链 + Keystore 签名 + 验证器）③ 版本 0.1.4

## 1. 执行前状态恢复（实测）

- 分支 `main`，工作区干净；阶段 5 及之前共 11 个提交存在（`311cb1f` 为 v0.1.3）。
- 版本：versionCode 4 / versionName 0.1.3（执行前）→ 本轮更新为 5 / 0.1.4。
- 模块：11 个（app + core/{model,storage,integrity,crypto,location,timestamp,provider,export,verify,recording}）；
  `core:crypto` 与 `core:verify` 此前为空骨架，本轮填充。
- **阶段 6 前置判断**：GPS/日志的实质能力已在阶段 2–5 实现（locations.jsonl、LocationSampler 四态、
  双时间源字段、追加式日志）；缺口为「时间跳变异常检测」与模块化——本轮补齐（不构成阶段 7 硬阻塞，
  但按"不擅自跳过阶段"原则先行收口）。

## 2. 阶段 6 收口：时间源一致性

- `core:location` 转纯 JVM（D-027）+ `TimeJumpDetector`：墙钟−单调钟偏移突变检测；
  现象分类 `WALL_CLOCK_ADVANCED` / `WALL_CLOCK_SET_BACK` / `MONOTONIC_RESET_SUSPECTED`
  —— **措辞纪律：分类是可观察到现象，非原因断言**（不得写成"时间被篡改"）。
- `EvidenceStore.appendEvent` 写入侧接入：突变时先追加 `time_anomaly_observed` 再写原事件；
  基线跨实例从事件日志末条恢复（**重启不误报**）。
- **修复真实缺陷**：异常事件的 seq 曾在主事件之前分配，导致后续事件序号乱序（`[1,2,4,3]`）；
  改为检测完成后再分配序号。
- 测试：`TimeJumpDetectorTest` 8 + `TimeAnomalyIntegrationTest` 3（跳变如实记录、历史字节不被改写、重启不误报）。
- 覆盖需求 §4 验收：「模拟时间跳变测试不会悄悄改写历史记录」。

## 3. 阶段 7：哈希链（4.1/4.3）

- `CanonicalEncoding`（`core:integrity`）：事件哈希输入的**版本化**确定性编码——
  固定字段顺序（seq/sessionId/wallMs/monoMs/type/source/payload/prevHash）、
  payload 键名**字典序**、UTF-8 **长度前缀**文本、null 与空串区分、**不含自身 hash 字段**、Long 十进制。
- `HashChain`：`hash = SHA-256(规范编码(事件))`，`prevHash` 前向绑定（创世 `GENESIS` 常量）；
  `verify` 逐条分项：OK / PRE_CHAIN（阶段 7 前历史）/ BAD_GENESIS / BROKEN_LINK /
  HASH_MISMATCH / SEQ_GAP / SEQ_OUT_OF_ORDER / INCOMPLETE。
- 写入侧：`appendChainedEvent` 计算并维护链尾；`OpenState.lastEventHash` 跨实例从 `events.log` 恢复
  （重启后新事件正确续链）；时间异常事件同样入链。
- 测试 12 项：编码确定性、键序无关、null-vs-空串区分 + 改/删/插/重排/坏创世/字段缺失逐项。

## 4. 阶段 7：Keystore 签名（4.2/4.3）

- `core:crypto` 转纯 JVM：`SealCanonicalEncoder`（签名对象确定性编码）、`SignatureEngine` 接口、
  `SignatureVerifier`（`java.security`，逐项 UnsupportedAlgorithm / InvalidPublicKey /
  PayloadDigestMismatch / InvalidSignature）。
- `core:model`：`SignatureAlgorithm` / `KeyProtectionLevel` / `KeyDescriptor`（仅公钥+元数据）/
  `SignatureRecord`。
- app `AndroidKeystoreSigner`：EC P-256 + `SHA256withECDSA`；`setUserAuthenticationRequired(false)`
  （如实记录）；**私钥永不导出**；硬件支持如实检测（`isInsideSecureHardware` / securityLevel，
  **软件级不冒充硬件级**）；keyId = 公钥 SHA-256 指纹；别名↔keyId 映射持久化。
- **签名对象**：链头哈希 + 事件数 + 文件清单摘要（相对路径→SHA-256）+ 算法/对象版本/密钥标识/应用版本；
  封存时签署，落盘 `signatures.json`（**不含私钥**）。
- **修复真实缺陷**：① Keystore 别名生成/查找不一致 → 私钥定位失败；② 已封存未签名无法补签；
  ③ app 模块未启用 kotlin.serialization → `StoredKey` 序列化器缺失致签名静默失败（模拟器 logcat 定位）；
  ④ 证据库对话框内容超屏 → 按钮触摸命中区错位（改限高可滚动）。

## 5. 阶段 7：验证机制与独立验证（4.4/4.5）

- `core:verify`（纯 JVM）：`EvidenceVerifier` 逐项 PASS/FAIL/WARN/SKIPPED——
  格式版本兼容性 / 文件重算 SHA-256 / 哈希链连续性 / 签名有效性；
  **不做"整体可信"结论**；单项通过不提升其他项。
- 独立验证能力：验证逻辑不依赖 Android Activity/UI/原 App 数据库/私钥；
  `OfflineVerificationExampleTest` 演示脱离原 App 的验证。

## 6. 验证结果（实测）

### 单元测试（全部真实执行）
`./gradlew ...test` → **EXIT 0**，**170 项全绿**：model 15 + storage 58 + integrity 19 +
crypto 6 + verify 15 + location 8 + recording 49。

### 模拟器 E2E（Pixel 5 AVD / Android 13；辅助验证）
| 场景 | 结果 |
|---|---|
| 录音 → 停止保存 | ✅ `saveStatus=SAVED`；事件逐条入链（10 条） |
| **封存并签名（真实 Android Keystore）** | ✅ 生成密钥 `EC-P256-266076977855CDEB`，如实报告 **SOFTWARE_BACKED**（模拟器无 TEE）；`signatures.json` 落盘且**不含私钥** |
| **脱离原 App 的独立验证** | ✅ 将设备材料拉到主机，纯 JVM 验证器 4 项全 **PASS**（格式 v2 / 文件完整性 1/1 / 链 10 条 / 签名有效） |
| **篡改媒体 1 字节** | ✅ 独立验证器准确定位 `FAIL 文件完整性（哈希不符 登记 1645… 实际 f4a8…）`，链与签名其余项如实报告 |

- 构建：`:app:assembleDebug :app:assembleRelease` → **BUILD SUCCESSFUL**（115 tasks）。

### 待真实设备验证（不得视为通过）
- Keystore 硬件支持（TEE/StrongBox）与厂商实现差异；
- 密钥丢失/轮换/设备迁移的真机行为；
- 独立验证器在真机导出包（阶段 9/10）上的端到端流程。

## 7. 交付物与版本
- 版本：versionCode 4→5；versionName 0.1.3→0.1.4。
- 本轮 Git 提交：`d503b2c`（链/编码）、`fc1e700`（签名/验证器）、`1f3809f`（app 集成）+
  文档批次（本文件、CHANGELOG、DECISIONS、ACCEPTANCE）。

## 8. 遗留问题
1. 阶段 8（第三方时间证明/存证）**前置未满足**：L-1 法律调研已由用户取消（D-018），
   且需用户选定供应商——**阶段 8 阻塞于用户决策**（保留接口层与「未存证」状态）；
2. 阶段 9（证据包导出 + PDF）、阶段 10（独立验证 CLI）、阶段 11（安全审计）待推进；
3. 阶段 3/4/5/7 真机项持续待验（无设备）；
4. 法律合规待办（L-1）保持发布阻塞状态。
