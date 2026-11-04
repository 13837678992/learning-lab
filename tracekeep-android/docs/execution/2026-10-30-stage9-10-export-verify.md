# 执行日志：阶段 9/10 复审修正与收口（v0.1.6）

- **开始**：2026-10-30 22:30｜**结束**：2026-10-30 23:40（+08:00）
- **范围**：① 恢复项目真实状态 ② 复审已提交的阶段 9/10 代码 ③ 修复三处与需求 §6 相悖的缺陷
  ④ 补写 v0.1.5 缺失的文档与 v0.1.6 版本 ⑤ 构建 release APK

## 1. 执行前状态恢复（实测）

- 分支 `main`，工作区干净；最近提交 `2bda41b`（v0.1.5，versionCode 6）。
- 用户指令以「启动阶段 7」为起点，但仓库实际已有：阶段 7（`d503b2c`/`fc1e700`/`1f3809f`，v0.1.4，
  有执行日志与验收）、阶段 8 接口层（`c0e83b9`）、阶段 9/10（`9fc606f`）、app 导出入口（`2bda41b`）。
  **阶段 7 已验收，不重复实现**（指令 §五 第 9 条）。
- **文档缺口**：CHANGELOG 止于 0.1.4；无阶段 9/10 执行日志；ACCEPTANCE R6.x 仍为「待实施」；
  D-030 仅见于代码注释与提交信息；`dist/` 止于 v0.1.3，无 0.1.5 APK。
- 环境：`gradlew` 启动需显式 `JAVA_HOME=/opt/homebrew/opt/openjdk@17`（`gradle.properties` 的
  `org.gradle.java.home` 仅对守护进程生效，与 ENVIRONMENT.md 一致）。

## 2. 全量测试（强制重跑）

`./gradlew cleanTest test --rerun-tasks` → **EXIT 0**，XML 统计 **186 项全绿**
（提交信息写 184，实测 186）。

## 3. 复审发现（对照需求 §6、TECHNICAL_PLAN §5.6/§5.7）

| # | 文件 | 问题 | 性质 |
|---|---|---|---|
| 1 | `app/.../EvidenceExporter.copyTreeToSaf` | 同名文件走 `openOutputStream(uri, "wt")` 截断写入；注释写"不覆盖"但行为相反 | **违反验收「不覆盖同名」** |
| 2 | 同上 `exportToSafTree` | `ok` 取自打包到缓存的复核，SAF 复制尚未发生；复制失败仍显示"导出成功" | **违反「失败不显示成功」** |
| 3 | `core/export/.../verifyPackage` | 只复核 `media/`；manifest 仅判存在不判可解析 | 复核范围不足 |
| 4 | `core/verify/.../EvidenceVerifier` + CLI | 缺 §5.7 明列的「路径安全」「未引用文件」；CLI 直接 `media.resolve(清单路径)`，清单含 `..` 即可读包外文件 | **安全缺口** |
| 5 | 同上 | 文件完整性比对的是清单哈希，清单可改；签名 `files` 摘要从未与清单交叉核对 | 验证逻辑缺口 |

## 4. 修复（三批提交）

- `90f0eea` fix(verify)：新增 `path_safety`（FAIL）、`unreferenced_files`（WARN）、
  `signature_file_binding`（FAIL/SKIPPED）；`Materials.packageRoot` 可选参数；CLI `fileBytes`
  先做穿越防护再读。测试 15 → 24。
- `973a3e4` fix(export)：`verifyPackage` 复核 `logs/events.log`、`location/locations.jsonl`，
  manifest 改为反序列化判定。测试 9 → 11。
- `b09fa6a` fix(app)：同名 `TraceKeep-<id>` 目录另建唯一后缀兄弟目录、文件只新建；
  新增 `verifySafDestination` 重读 SAF 目标重算；双复核通过才 `ok`；`finally` 清理 staging。

## 5. 验证结果（实测）

### 单元测试
`./gradlew test :app:assembleDebug` → **EXIT 0**，**195 项全绿**：
crypto 7 + export 11 + integrity 19 + location 8 + model 15 + provider 3 + recording 48 + storage 58 + timestamp 2 + verify 24。

### 独立 CLI 端到端（本机，离线）
样本包由**真实** `EvidencePackageBuilder` 生成（临时 JUnit 生成器，用后删除，未入库）；
CLI 为 `:core:verify:installDist` 产物 `bin/verify`。

| 场景 | 结果 | 退出码 |
|---|---|---|
| 干净包 | PASS 5（格式/路径/文件/未引用/链）｜SKIPPED 2（无签名） | 0 |
| 篡改 `media/a.m4a` 第 1 字节 | `file_integrity` **FAIL**「哈希不符（登记 a4f7af1c… 实际 d1fb694c…）」，其余项不受影响 | 1 |
| 清单注入 `../../etc/passwd` + 放入 `media/extra.bin` | `path_safety` **FAIL**「含路径穿越段 ..」；`unreferenced_files` **WARN** 列出 2 个未登记文件 | 1 |

### Release 构建
`./gradlew :app:assembleRelease` → **EXIT 0**（日志 `logs/2026-10-30-v0.1.6-release-build.log`）。
`dist/TraceKeep-v0.1.6-release.apk`：8,949,335 字节；
SHA-256 `d2d2c3cb7e37d3e17f2237a36da044c450492ddabc5884ac31b3c90aa89aa4f2`；
`apksigner verify --verbose`：**v2 通过**，签名者 `CN=TraceKeep Personal Release`，
证书 SHA-256 `f9991fef8293cb7e007434e7c5da961bcdf78c157bff494f7bec7279bd042921`（与 D-019 同一密钥）；
`aapt dump badging`：versionCode=7 / versionName=0.1.6。

### 未执行（如实）
- **app 层 SAF 导出未在模拟器/真机实测**（本轮无设备会话）——修复 #1/#2 仅有代码审查与编译验证；
- 「复制到另一台电脑」仅本机异目录模拟；
- Keystore 硬件支持、真机导出包的 CLI 验证。

## 6. 交付物与版本
- versionCode 6 → 7；versionName 0.1.5 → 0.1.6（`app/build.gradle.kts` 单一来源）。
- 本轮提交：`90f0eea`、`973a3e4`、`b09fa6a` + 文档/版本批次。

## 7. 遗留问题
1. **代码**：PDF 不渲染中文（D-030，待用户决策是否引入 CJK 字体）；SAF 目标复核只覆盖 `media/`。
2. **环境**：无设备——真机/模拟器 E2E 导出未做。
3. **待真机**：阶段 3/4/5/7 真机项 + 本轮 app 导出行为 + 异机 CLI 验证。
4. **合规**：L-1 已取消（D-018）但发布门槛未解除——仍为「开发阶段完成、发布验收未完成」；D-008 分发方式待确认。
5. **阶段 8** 供应商适配器阻塞于用户决策（接口层已验收）。

## 8. 下一步
阶段 11（安全审计与发布候选）：lint、依赖/许可证清单、Manifest 权限审计、网络白名单核查、
`docs/TEST_REPORT.md` / `SECURITY_AND_PRIVACY.md` / `RELEASE_CHECKLIST.md`。
