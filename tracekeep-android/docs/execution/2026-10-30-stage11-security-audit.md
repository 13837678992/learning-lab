# 执行日志：阶段 11 安全审计与发布候选（v0.1.6）

- **开始**：2026-10-30 23:40｜**结束**：2026-10-31 00:15（+08:00）
- **范围**：安全审计、lint、依赖/许可证复查、权限审计、网络核查、文档（TEST_REPORT /
  SECURITY_AND_PRIVACY / RELEASE_CHECKLIST）、release 候选构建
- **前置**：阶段 9/10 收口（提交 `f29156e`）已完成；本阶段是 TECHNICAL_PLAN §8 的最后一个开发阶段。

## 1. Lint（`./gradlew :app:lintRelease`）

- 修复前：**Error 7**（NewApi 5、MissingPermission 2）、Warning 31、Info 1 → 构建失败（EXIT 1）。
- 修复后：**Error 0**，Warning 29，EXIT 0。结果 XML：`logs/2026-10-30-stage11-lint-results.xml`。
- **NewApi 是真实崩溃**（非误报）：`ScreenRecorderEngine.startInternalAudio` 在 `SDK_INT < Q` 判定之前
  就构造 API 29 类 `AudioPlaybackCaptureConfiguration`，API 26–28 上会 `NoClassDefFoundError`。
  改为版本前置判定 + `@RequiresApi(Q)` 实现方法。修复后 195 项测试与构建仍全绿。
- StaticFieldLeak ×2 为**假阳性**（单例只持 `applicationContext`），加 `@SuppressLint` 注明理由。

## 2. 权限审计（合并清单 release，实测）

声明：RECORD_AUDIO、CAMERA、ACCESS_FINE/COARSE_LOCATION、FOREGROUND_SERVICE(+MICROPHONE/CAMERA/
LOCATION/MEDIA_PROJECTION)、POST_NOTIFICATIONS、AndroidX 签名级自权限。
**无 INTERNET 权限**；`camera.any`/`location.gps` 均 `required=false`。
两个 `exported=true`：MainActivity（LAUNCHER，必需）、`ProfileInstallReceiver`（AndroidX，
受 `android.permission.DUMP` 保护，shell-only）。Service 为 `exported=false`。

## 3. 网络核查

`grep -rniE 'http://|https://|okhttp|retrofit|URLConnection|Socket|InetAddress|HttpClient|ConnectivityManager' --include='*.kt' core app`
→ **0 命中**；合并清单无 INTERNET 权限 → 技术上无法上传。**通过**。

## 4. 依赖与许可证

`releaseRuntimeClasspath` 解析 **190 制品**；分组均为 AndroidX / JetBrains / kotlinx / Guava /
auto-value-annotations / jspecify——**全部 Apache-2.0**；测试期 JUnit 4.13.2 为 EPL-1.0（不进运行时）。
无 GPL/AGPL/MPL；无广告/分析/上传 SDK；不要求账号。**通过**（版本固定见 `libs.versions.toml`）。

## 5. 日志脱敏

全 app 仅 4 处 `Log.*`（`TraceKeepApp`：会话计数 + 异常 message）；**无坐标/哈希/内容/路径**。**通过**。

## 6. 安全修复（本阶段顺带）

- **API 31+ 备份排除缺口**（lint DataExtractionRules）：原仅 `allowBackup=false`，Android 12+ 证据
  材料仍可能进入云备份。新增 `res/xml/data_extraction_rules.xml`（云备份 + 设备迁移排除
  root/file/database/sharedpref/external 全域），清单引用；合并清单实测两属性并存，lint 警告消除。
- 权限前置检查（见 §1 的 MissingPermission）。

## 7. 构建与产物（实测）

- `./gradlew :app:assembleRelease` → **EXIT 0**。
- `dist/TraceKeep-v0.1.6-release.apk`：**8,949,959 字节**；
  SHA-256 `c6b00309b3552472953748b1affd1f329b018a6d464b7f425ccebd28fe4efb7c`。
- `apksigner verify --verbose --print-certs`：**v2 通过**（EXIT 0），
  `CN=TraceKeep Personal Release`，证书 SHA-256 `f9991fef…bd042921`（D-019 同一密钥）。
- `aapt dump badging`：versionCode=7 / versionName=0.1.6。

## 8. 文档交付

- `docs/TEST_REPORT.md`——测试/构建/lint/CLI 实测汇总 + 需求 §4.6 十二项映射 + 真机项「未执行」。
- `docs/SECURITY_AND_PRIVACY.md`——权限/隐私/密钥/路径/许可证/备份 + 残余风险表 S-1…S-7。
- `docs/RELEASE_CHECKLIST.md`——发布门禁，结论「**开发阶段完成，发布验收未完成**」。

## 9. 遗留问题（阻断发布，均为环境/外部依赖）

1. **真机测试全部未执行**（无设备）——需求 §13.9；含 SAF 导出的设备端 E2E；
2. **依赖漏洞扫描未执行**——无工具/漏洞库访问（需求 §13.6）；
3. **发布前法律确认未完成**——需求 §13.8 / 用户指令 §十（L-1 已取消，不产生法律能力）；
4. **D-008 分发方式待用户确认**；
5. PDF 不渲染中文（D-030，待用户决策）；阶段 8 供应商适配器阻塞于用户选定。

## 10. 结论

TECHNICAL_PLAN §8 的**全部开发阶段（1–11）均已完成到「代码 + 测试 + 文档 + 验收记录」**；
剩余门禁项依赖设备、外部工具与法律确认，属**发布验收**而非开发范畴。
项目状态：**开发阶段完成，发布验收未完成**（不得对外分发）。
