# 执行日志：停止后直接保存 + 预览布局修复 + 版本更新（v0.1.2）

- **开始时间**：2026-10-30 09:00（+08:00）
- **结束时间**：2026-10-30 10:00（+08:00）
- **范围**：用户指令三项任务（停止即保存 / 预览覆盖顶部控件修复 / 版本更新）+ 测试与文档

## 1. 问题根因（均有源码或运行证据）

### 1.1 停止后只显示"封装完成"、没有保存
**根因**：`RecordingController.stop()` 的流程止于「引擎停止 → `finalizeFile`（哈希+大小）→ 会话
`STOPPED`」；**从未存在"保存"步骤与持久化字段**——文件虽已写入应用私有目录，但会话记录里没有
任何"已保存"状态（`saveStatus` 字段不存在），UI 只能按状态机文案提示"可进入导出（阶段 9）"。
本地证据保存流程缺少的正是最后三步：**完整性复核 → 保存事件 → 保存记录持久化语义**。

### 1.2 摄像头预览覆盖顶部模式切换控件
**根因（双因素）**：
1. `PreviewView` 默认 `PERFORMANCE` 实现模式内部使用 **SurfaceView**——独立图层，部分设备/场景下
   无视父布局边界绘制、遮挡其他控件（模拟器复现：预览绘制区越过分配区域）；
2. 之前版本虽已用 `weight(1f)` 三段式布局，但预览容器无裁剪保障，SurfaceView 溢出不收容器约束。
**修复**：`implementationMode = COMPATIBLE`（TextureView，作为普通视图参与布局层级与合成，
天然受父容器裁剪）+ `clipToBounds()` 加固 + `FIT_CENTER` 避免拉伸。三段式布局（顶部模式栏 /
中间 previewBox / 底部操作区）结构不变。

### 1.3 模拟器验证中发现的衍生问题（诚实记录）
COMPATIBLE 模式修复布局后，在本机**软件 GL 模拟器**上出现录像+水印失败
（`VideoEncoder: data didn't reach expected timestamp` → Finalize `ERROR_NO_VALID_DATA`）。
多轮 A/B 实验（每次只改一个变量）结论：
| 变量组合 | 结果 |
|---|---|
| PERFORMANCE + 水印 | ✅ 录像成功（785KB，`watermark_frames:189`） |
| COMPATIBLE + 水印 | ❌ 编码器饥饿（软件 GL：TextureView 拷贝 + OverlayEffect GL 转发叠加） |
| COMPATIBLE + 无水印 | ✅ 录像成功（470KB，SAVED） |
**处置**：布局修复（COMPATIBLE）优先保留（跨设备正确性）；新增**视频水印开关**（默认开启，
界面上可见）作为明确降级路径；`ERROR_NO_VALID_DATA` 的失败信息附可操作建议（"可尝试关闭视频水印"）；
两种状态均在事件日志如实记录（`watermarkEnabled:true/false`）。真机（硬件 GPU）预期无此限制，
待真机验证。

## 2. 修改文件

| 文件 | 用途 |
|---|---|
| `core/model/SaveStatus.kt`（新） | 保存状态枚举（SAVED/FAILED，附语义边界注释） |
| `core/model/EvidenceSession.kt` | +`stoppedAtWallMs/savedAtWallMs/saveStatus/saveErrorReason` |
| `core/model/EvidenceFormat.kt` | 版本 v1→v2（向后兼容，无迁移） |
| `core/model/EventTypes.kt` | +`recording_saved` / `recording_save_failed` |
| `core/storage/EvidenceStore.kt` | +`completeRecordingSave()`（含完整性复核、幂等）、`recoverPendingSaves()`、`SaveOutcome`/`SaveRecoveryRecord`；`transition()` 记录 stoppedAtWallMs |
| `core/recording/RecordingController.kt` | `stop()` 扩展为「停止→封装→校验→**保存**」；结果 `Stopped`→`Saved`/`SaveFailed`（携带保存时间/失败原因）；`onProgress` 阶段回调（STOPPING/FINALIZING/SAVING） |
| `app/recording/RecordingSessionHolder.kt` | 处理 Saved/SaveFailed；`stopPhase`/`saveStatus`/`saveErrorReason` 状态；水印开关 `watermarkEnabled`；`listLibraryRecords()` 证据库列表 |
| `app/MainActivity.kt` | 保存状态显示（✓成功/✗失败+原因）；「查看本地证据库」对话框；水印开关 UI；预览 `COMPATIBLE`+裁剪；去掉"阶段 9"表述 |
| `app/recording/CameraXVideoEngine.kt` | `ERROR_NO_VALID_DATA` 可操作失败信息 |
| `app/TraceKeepApp.kt` | 启动接入 `recoverPendingSaves()`（保存中退出→重启重试保存） |
| `app/build.gradle.kts` | versionCode 2→3；versionName 0.1.1→0.1.2 |
| `CHANGELOG.md`（新） | 版本记录（0.1.2/0.1.1/0.1.0） |
| 测试 | `SaveOnStopTest`（新，8 项）；`RecordingControllerTest`/`EvidenceSerializationTest`/`EvidenceStoreTest` 适配 v2 |

## 3. 验证结果（实测）

### 命令与退出码
- `./gradlew :core:model:test :core:storage:test :core:integrity:test :core:recording:test :app:assembleDebug :app:assembleRelease` → **exit 0**（`BUILD SUCCESSFUL`，含 lintVitalRelease）
- 单元测试 **112/112 全绿**：model 15 + storage 49 + integrity 7 + recording 41（其中 SaveOnStopTest 8 项）
- APK：`dist/TraceKeep-v0.1.2-release.apk`（8,850,810 字节；SHA-256 `8ebdd551a491…`；apksigner v2 验签通过）

### 模拟器端到端（Pixel 5 AVD / Android 13，辅助验证）
| 项目 | 结果 |
|---|---|
| 录音：开始→停止→保存 | ✅ `recording_saved` 事件 + `saveStatus=SAVED` + `savedAtWallMs` 持久化；媒体 1.57MB |
| 录音界面反馈 | ✅ "✓ 保存成功，已存入本地证据库" + "停止后文件校验：PASS" |
| **App 重启后记录仍在** | ✅ 证据库对话框完整显示：类型/SAVED/文件名/大小/SHA-256/保存时间/复核 PASS |
| 录像（关水印降级路径） | ✅ 404KB、SAVED、`watermarkEnabled:false` 如实记录 |
| 录像（水印，PERFORMANCE 对照） | ✅ 785KB、SAVED、`watermark_frames:189` |
| 三段式布局 | ✅ 顶部 chips [88,295]-[469,350]、底部按钮 [308,1551]-[1036,1859] 全部可见可点击（uiautomator 断言） |
| 失败路径 | ✅ Finalize 失败→文件 INCOMPLETE + ABORTED + 原因事件（无伪造成功） |

### 待真实设备验证（不得视为通过）
- COMPATIBLE + 水印在硬件 GPU 真机的表现（预期无编码器饥饿；若可用，模拟器限制即消解）；
- 厂商 ROM（小米/华为/OPPO/vivo）后台限制、锁屏录像、定位真实精度；
- 保存路径不可写/磁盘满/保存中杀进程（恢复逻辑已单测覆盖，真机场景待验）。

## 4. 版本记录
- versionCode 2→3；versionName 0.1.1→0.1.2（唯一来源：`app/build.gradle.kts`；`CHANGELOG.md` 已建）

## 5. 遗留问题
1. 软件 GL 模拟器上"COMPATIBLE+水印"录像受限（真机预期无此问题；开关+建议+如实记录已就位）。
2. 录像中切换摄像头仍为如实"不支持"（D-017，待用户决策）。
3. 证据包导出（阶段 9）、封存（seal）UI 入口未实现——本地保存已独立完成，不依赖它们。
