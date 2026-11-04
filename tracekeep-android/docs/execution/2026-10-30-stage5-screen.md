# 执行日志：阶段 5 屏幕录制 + 停止即保存基线提交（v0.1.3）

- **开始时间**：2026-10-30 10:00（+08:00）
- **结束时间**：2026-10-30 14:10（+08:00）
- **范围**：① Git 基线分批提交（7 批）② 阶段 5 屏幕录制 ③ 版本 0.1.3

## 1. Git 基线分批提交（用户指令："分批次来提交代码"）

此前 tracekeep-android 完全未被 Git 跟踪（位于 learning-lab 父仓库外的独立目录）。
本轮初始化**独立仓库**并分 7 批提交既有 v0.1.2 基线（未动父仓库中用户自己的修改）：

| # | commit | 内容 |
|---|---|---|
| 1 | `12a0d77` chore | git init + .gitignore + PROJECT_REQUIREMENTS.md |
| 2 | `a542802` docs | OPEN_SOURCE_ASSESSMENT + DECISIONS + TECHNICAL_PLAN + THREAT_MODEL + 环境/兼容/验收文档 + CHANGELOG |
| 3 | `ed9a1fd` docs(execution) | 阶段 1-4 与专项优化执行日志 + logs/ 证据存档 |
| 4 | `743fd73` build | Gradle Wrapper + 版本目录 + 10 模块骨架 + Manifest |
| 5 | `ff57af6` feat(core) | model（含 SaveStatus/格式 v2）+ integrity + storage（含 completeRecordingSave） |
| 6 | `db5d884` feat(core) | recording 编排 + 视频水印文本工厂 + 测试 |
| 7 | `7dac7b1` feat(app) | 引擎/前台服务/UI/证据库 |

## 2. 阶段 5：屏幕录制（需求 §3 录屏节）

### 2.1 架构改造（多输出支持）
`RecordingEngine` 接口升级：`outputFileNames()` 声明本次会话的输出清单（第一个为主输出），
`start(Map<String, Path>)` 接收存储层为每个输出创建的绝对路径。控制器为每个输出登记独立
ORIGINAL 原始件——**录屏的内部音频轨（WAV）与屏幕视频（MP4）是并列的两条原始证据记录**，
分开保存、各自计算 SHA-256、互不混流。`completeRecordingSave` 升级为多文件会话：
**全部已封装文件逐一完整性校验**（任一异常 → 整次保存失败），未封装成功的次级输出如实披露。

### 2.2 新增组件
- `core:recording/ScreenRecordingConfig` + `ScreenAudioSource`（NONE/MICROPHONE/INTERNAL）+ `forScreen` 工厂；
- `core:recording/WavPacker`（纯 JVM，PCM WAV 头生成与回填；测试覆盖 RIFF 结构）；
- `app/ScreenRecorderEngine`：MediaRecorder(SURFACE) + `MediaProjection.createVirtualDisplay`；
  内部音频经 `AudioPlaybackCaptureConfiguration` + AudioRecord → WAV 独立文件（API 29+）；
  系统 `MediaProjection.Callback.onStop`（用户从通知停止共享）→ 转交引擎错误路径；
- `RecordingService` 增加 `mediaProjection` 前台类型（+ 通知文案区分录屏）；
- Manifest：`FOREGROUND_SERVICE_MEDIA_PROJECTION` 权限 + 服务类型扩展；
- UI：第三个模式 chip「屏幕录制」+ 音频来源三选（麦克风/内部音频(10+)/无音频）+
  系统授权对话框流程（`createScreenCaptureIntent`）+ 录屏模式禁用暂停；
- **Android 14+ 顺序保证**：`startScreen()` 先启动 mediaProjection 前台服务，
  再请求授权令牌（`getMediaProjection` 在服务运行后调用）；用户拒绝 → 如实失败并停掉服务。

### 2.3 顺带修复的存量缺陷
1. **前台服务从不停止**：`RecordingService.stop()` 此前无任何调用点——录制结束后服务与通知
   永久驻留。已在 stop/abort/引擎错误三条终止路径补上服务停止；
2. **MediaRecorder 状态机顺序**（模拟器实测发现）：`setAudioSource` 必须在 `setOutputFormat`
   之前调用，否则抛**无 message 的** `IllegalStateException`（事件日志曾显示
   `screen start failed: null`）。已修正顺序，并新增 `describe(e)` 兜底（message 为空时回落类名）。

## 3. 验证结果（实测）

### 命令与退出码
- `./gradlew :core:model:test :core:storage:test :core:integrity:test :core:recording:test :app:assembleDebug :app:assembleRelease` → **exit 0**
- 单元测试 **119/119 全绿**（model 15 + storage 49 + integrity 7 + recording 48，其中录屏专项 `ScreenRecordingTest` 7 项）
- APK：`dist/TraceKeep-v0.1.3-release.apk`（SHA-256 `aaa84ed4433d…`；apksigner v2 验签通过）

### 模拟器 E2E（Pixel 5 AVD / Android 13；辅助验证）
| 场景 | 结果 |
|---|---|
| 进入录屏模式 → 开始录屏 | ✅ 系统授权对话框正确弹出（"Start recording or casting with TraceKeep?"） |
| 授权后录制 | ✅ SCREEN 类型会话 RECORDING；screen.mp4 持续写入（12MB/35s） |
| 停止 → 保存 | ✅ `recording_saved` + `saveStatus=SAVED`；读回 durationMs=35109/mime=video/mp4；文件校验 PASS |
| **内部音频多输出** | ✅ 两条原始件：screen.mp4(3.2MB) + internal-audio.wav(822KB)，独立登记、保存 SAVED |
| 取消授权 | ✅ 走 `onScreenProjectionDenied` → 未创建会话 + 停服务 + 如实提示（代码路径；UI 手动取消未逐帧复核，列为待验证项） |
| 引擎失败路径 | ✅ MediaRecorder 顺序缺陷期间：文件 INCOMPLETE + 会话 ABORTED + `engine_action_failed` 原因入日志（无伪造成功） |

### 待真实设备验证（不得视为通过）
- 内部音频在各厂商 ROM 的实际可用性（部分 ROM 对播放捕获有限制）；
- 录屏期间旋转屏幕（当前以启动时尺寸为准，旋转后画面留边——已知限制）；
- 长时录屏（存储/发热/系统回收）与 Android 14+ 前台服务类型校验；
- 受保护内容（FLAG_SECURE 应用）在真机录屏中的实际表现。

## 4. 版本
versionCode 3→4；versionName 0.1.2→0.1.3（`app/build.gradle.kts`；CHANGELOG 已更新）

## 5. 遗留问题
1. 录屏暂停不支持（如实返回 Failure；UI 已禁用暂停按钮）——MediaProjection+MediaRecorder 原生限制；
2. 旋转不重建虚拟显示（已知限制，如实披露于引擎注释）；
3. 录屏不含水印（水印为摄像头录像特性；录屏水印属将来增强）；
4. 阶段 7（哈希链+Keystore 签名）、阶段 9（证据包导出）未实现——本地保存已独立完成。
