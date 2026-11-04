# TraceKeep 安全与隐私审查（SECURITY_AND_PRIVACY.md）

> 阶段 11 交付物（`TECHNICAL_PLAN.md` §8、需求 §8）。逐项对照需求红线；所有结论附实测/代码依据。
> 审查日期 2026-10-30；版本 v0.1.6（versionCode 7）。**本文件不构成法律意见。**

## 1. 权限最小化

合并清单（`release`）实际声明（实测 `grep`，2026-10-30）：

| 权限 | 必要性 | 运行时申请 | 备注 |
|---|---|---|---|
| RECORD_AUDIO | 录音/内部音频必需 | 是（用户可见说明） | 内部音频另在引擎内二次检查（v0.1.6） |
| CAMERA | 录像必需 | 是（仅录像模式） | 引擎启动前显式检查（v0.1.6） |
| ACCESS_FINE_LOCATION / ACCESS_COARSE_LOCATION | 可选「随录制记录位置」 | 是（默认关闭，开启时才请求） | **不申请后台定位**（D-021） |
| FOREGROUND_SERVICE + MICROPHONE/CAMERA/LOCATION/MEDIA_PROJECTION | 录制前台服务（14+ 按类型强制） | 不适用 | 与功能一一对应 |
| POST_NOTIFICATIONS | 13+ 前台服务通知可见性 | 是 | 被拒时服务仍可运行，界面如实提示 |
| DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION | AndroidX 注入（签名级自权限） | 不适用 | 非用户权限 |

**结论**：无 INTERNET 权限、无位置后台权限、无读取联系人/存储等无关权限。**通过**。
`<uses-feature camera.any / location.gps required="false">`：不排除无相应硬件设备安装。**通过**。

## 2. 隐私红线

### 2.1 默认本地，无未确认上传
- 全源码网络 API 扫描：`grep -rniE 'http://|https://|okhttp|retrofit|URLConnection|Socket|InetAddress|HttpClient|ConnectivityManager' --include='*.kt' core app` → **0 命中**（2026-10-30）；
- 合并清单 **无 INTERNET 权限**（`grep -c` = 0）——**技术上无法联网上传**；
- 第三方能力为 NoOp 接口层（D-018 后不接入），界面/报告如实显示「没有第三方时间戳/存证」。

### 2.2 无隐蔽录制
- 录像必须已绑定相机预览才能开始（`RecordingSessionHolder` 诚实性约束）；
- 录屏遵守 MediaProjection 官方授权流程，**每次会话重新授权**（D-026）；
- 无偷录/绕过授权/规避系统提示代码；前台服务通知如实展示。

### 2.3 备份通道
- `android:allowBackup="false"`（证据材料不进系统备份；API ≤30 完整生效）。
- **v0.1.6 修复**：新增 `android:dataExtractionRules="@xml/data_extraction_rules"`，对 API 31+ 的
  **云备份与设备迁移**均排除 `root/file/database/sharedpref/external` 全部域——证据不得经任何备份通道
  离开设备。lint `DataExtractionRules` 警告已消除；合并清单实测同时含两个属性。
- 边界：本规则约束的是**系统备份框架**；用户自行通过 SAF 导出证据包属于明确操作，不在此范围。

### 2.4 日志脱敏
- 全 app 仅 4 处 `Log.*`（TraceKeepApp）：会话计数与异常 message；**无坐标、无哈希、无文件内容、无路径**；
- core 模块 `println` 仅存在于验证 CLI（面向终端的用户可见输出），无静默日志。

## 3. 密钥保护

| 项 | 实现 | 依据 |
|---|---|---|
| 私钥存储 | Android Keystore，**永不导出**（`SignatureRecord`/`KeyDescriptor` 无私有字段） | `signatureRecord_containsNoPrivateKey`、导出包扫描 |
| 算法 | EC P-256 + SHA256withECDSA | D-029 |
| 用户认证 | `setUserAuthenticationRequired(false)`（**如实记录**，不夸大） | D-029 |
| 硬件支持 | `isInsideSecureHardware`/securityLevel 如实检测；软件级不冒充硬件 | 模拟器实测 SOFTWARE_BACKED |
| 密钥生命周期 | 丢失 → 旧签仍可验、不得重签冒充；轮换 → 新 keyId；卸载 → 私钥不可恢复 | D-029、TECHNICAL_PLAN §5.4 |

## 4. 导出与路径安全

- **路径穿越**：写入端 `PathSafety`（会话 ID 白名单 + 相对路径规范化 + `resolveInside` 双防线）；
  验证端 `path_safety`（v0.1.6，清单路径穿越/绝对/符号链接 → FAIL，CLI 读取前不信任清单）；
- **不覆盖同名**：`EvidencePackageBuilder` 目标存在即失败；app SAF 导出同名另建目录（v0.1.6 修复原截断缺陷）；
- **导出不改原件**：构建器只读源字节（`build_doesNotModifySourceBytes`）；
- **导出后复核**：重读包内 media/logs/location 重算比对（v0.1.6 扩展）。

## 5. 依赖与许可证

`releaseRuntimeClasspath` 解析 **190 个制品**（2026-10-30），按 group：

- `androidx.*`（含 compose / camera / lifecycle 等）——**Apache-2.0**
- `org.jetbrains.*` / `org.jetbrains.kotlinx.*`（stdlib / serialization / coroutines / annotations）——**Apache-2.0**
- `com.google.guava:guava`（listenablefuture 变体，AndroidX 传递）——**Apache-2.0**
- `com.google.auto.value:auto-value-annotations`、`org.jspecify:jspecify`——**Apache-2.0**
- 测试期：`junit:junit 4.13.2`——**EPL-1.0**（仅测试，不进 release 运行时）

**结论**：无 GPL/AGPL/MPL 等传染性或限制分发许可证；**无广告、无分析统计、无默认上传 SDK；不要求账号**（需求 §2）。**通过**。
版本固定于 `gradle/libs.versions.toml`（无动态版本）。依赖漏洞扫描（`dependencyCheck` 类工具）**未执行**（无此类工具/数据库访问）——列为发布前待办。

## 6. 第三方组件（D-001）

AndroidQF/MVT/ALEAPP/DroidCustos 代码与二进制**未集成**（仅文档层面参考其设计思想，干净重写）。**通过**。

## 7. 残余风险（如实披露，不得被文案掩盖）

| # | 风险 | 状态 |
|---|---|---|
| S-1 | 设备被完全控制/Root 时，本地哈希链与 Keystore 签名的历史状态无法保证 | 已披露（THREAT_MODEL、README、验证器输出） |
| S-2 | 模拟器无 TEE，硬件密钥保护未验证 | 待真机 |
| S-3 | API 31+ 备份排除缺口（§2.3） | **已修复（v0.1.6，dataExtractionRules）**；真机行为待验 |
| S-4 | SAF 导出行为未在设备实测 | 待真机 |
| S-5 | 依赖漏洞扫描未执行 | 待办 |
| S-6 | 无第三方时间戳/存证（D-003/D-018） | 如实显示「未存证」 |
| S-7 | PDF 不渲染中文（D-030） | 待用户决策 |

## 8. 发布门槛

- **L-1 法律调研已取消（D-018）**，但发布前法律确认（证据采集授权、个人信息保护、电子签名适用性、
  对外分发的隐私政策与权限告知）**仍未完成**——发布阻塞状态保持（用户指令 §十）。
- 本应用**不得**被表述为「法院必然采信」「绝对不可篡改」「自动取得司法效力」等（D-006）。
