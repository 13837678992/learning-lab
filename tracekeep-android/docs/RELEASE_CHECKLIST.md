# TraceKeep 发布检查清单（RELEASE_CHECKLIST.md）

> 阶段 11 交付物（`TECHNICAL_PLAN.md` §8）。本清单是**发布门禁**：任一项未满足，项目不得标记为「发布验收完成」。
> 审查日期 2026-10-30；候选版本 v0.1.6（versionCode 7）。图例：☑ 已完成｜☐ 未完成｜— 不适用（附依据）。

## 1. 构建与产物

- ☑ Debug 构建成功（`./gradlew :app:assembleDebug`，EXIT 0）
- ☑ Release 构建成功（`./gradlew :app:assembleRelease`，EXIT 0）
- ☑ Release APK 存在：`dist/TraceKeep-v0.1.6-release.apk`，**8,949,959 字节**
- ☑ APK SHA-256：`c6b00309b3552472953748b1affd1f329b018a6d464b7f425ccebd28fe4efb7c`
- ☑ 签名验证：`apksigner verify` v2 通过；`CN=TraceKeep Personal Release`，证书 SHA-256 `f9991fef…bd042921`（与 D-019 同一密钥）
- ☑ 版本一致性：`app/build.gradle.kts` 单一来源；`aapt` 读回 versionCode=7 / versionName=0.1.6
- ☑ **Debug 构建未充当 Release 交付物**（分发包为 release 变体，经 apksigner 验证）

## 2. 代码质量

- ☑ 单元测试 195/195 全绿（`cleanTest test --rerun-tasks`）
- ☑ Lint `:app:lintRelease`：**Error 0**（修复 7 项：NewApi 真实崩溃 5、MissingPermission 2）
- ☑ 破坏性测试覆盖需求 §4.6 十二项（TEST_REPORT §1.1）
- ☑ 无调试产物/临时文件进入版本控制（`git status` 干净；`dist/`、`keystore/` 已 gitignore）

## 3. 安全与隐私（对照 SECURITY_AND_PRIVACY.md）

- ☑ 权限最小化：无 INTERNET 权限；权限与功能一一对应
- ☑ 无网络 API（源码扫描 0 命中）+ 无 INTERNET 权限 → 技术上无法上传
- ☑ 日志脱敏：仅 4 处 Log，无坐标/哈希/内容
- ☑ 密钥保护：私钥永不导出；`signatureRecord_containsNoPrivateKey` 测试通过
- ☑ 路径穿越防护：写入端 + 验证端（`path_safety`）
- ☑ 导出不覆盖同名 / 不改原件 / 失败不显示成功（v0.1.6 修复）
- ☑ 备份排除：`allowBackup=false` + `dataExtractionRules`（覆盖 API 31+，v0.1.6 修复）
- ☐ **依赖漏洞扫描**（如 OWASP dependency-check）**未执行**——无工具/漏洞库访问
- ☑ 许可证复查：全部 Apache-2.0（+ 测试期 EPL-1.0），无传染性许可证（SECURITY_AND_PRIVACY §5）
- ☑ 无广告/分析/默认上传 SDK；不要求账号

## 4. 功能完整性（需求 §3–§9）

- ☑ 录音 / 录像 / 录屏：代码 + 单测完成
- ☑ 停止即保存到本地证据库（不依赖导出）
- ☑ 流式 SHA-256 + 版本化规范编码 + 哈希链
- ☑ Android Keystore 签名 + 独立验证核心
- ☑ 证据包导出 + PDF 报告 + 独立离线验证 CLI
- ☐ **真机端到端**（录音/录像/录屏/锁屏/权限撤销/SAF 导出/Keystore 硬件）**未执行**——无设备
- ☐ 模拟器 E2E 导出未执行

## 5. 文档

- ☑ CHANGELOG（0.1.0–0.1.6 完整）
- ☑ 执行日志（阶段 1–11）
- ☑ TEST_REPORT / SECURITY_AND_PRIVACY / RELEASE_CHECKLIST（本文件）
- ☑ 需求追踪矩阵（ACCEPTANCE_CRITERIA）与 DECISIONS 更新
- ☑ 独立验证工具使用说明（VERIFY_TOOL.md）

## 6. 法律与合规门槛（用户指令 §十）

- ☐ **发布前法律确认未完成**：证据采集授权、个人信息保护、电子签名适用性、对外分发的隐私政策与权限告知
- — L-1 调研任务已由用户取消（D-018），不产生法律能力
- ☑ 无「法院必然采信/绝对不可篡改/自动取得司法效力」等越界表述
- ☐ **D-008 分发方式待用户确认**（个人 sideload vs 公开分发）

## 7. 发布结论

**当前状态：「开发阶段完成，发布验收未完成」。**

未满足的门禁项（阻断发布，均为环境/外部依赖）：
1. 真机测试全部未执行（无设备）——需求 §9、§13.9；
2. 依赖漏洞扫描未执行——需求 §13.6；
3. 发布前法律确认未完成——需求 §13.8（用户指令 §十）；
4. D-008 分发方式待确认。

在满足以上四项前，**不得**将本项目标记为「开发完成可发布」，也不得对外分发。
