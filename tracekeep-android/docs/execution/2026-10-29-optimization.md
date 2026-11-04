# 执行日志：录音录像体验与布局专项优化（v0.1.1）

- **开始时间**：2026-10-29 17:35（+08:00）
- **结束时间**：2026-10-29 22:35（+08:00）
- **范围**：用户指令「录音录像体验与布局专项优化」三项任务（视频水印 / 录音状态提示 / 布局覆盖修复）+ 模式与资源管理 + 验证

## 1. 根因（均有证据支持）

| 问题 | 根因 | 证据 |
|---|---|---|
| 视频水印缺失 | 原实现**根本没有水印功能**（预览与最终视频均无水印）；需求 §3.2 要求水印进入最终视频 | 原 CameraXVideoEngine 无任何 Overlay/绘制代码 |
| 录音提示不足 | 原实现仅状态卡一行文本；无"正在录音"醒目提示、无计时、无启动中/保存中阶段、无防连点 | 原 MainActivity 无计时/阶段代码 |
| 摄像头模式布局被覆盖 | **双重根因**：① targetSdk 35 强制 edge-to-edge，根布局未处理窗口 Insets（顶部被状态栏、底部被手势导航栏覆盖）；② 单 Column 布局无滚动/权重，插入 240dp 预览后底部按钮被挤出屏幕 | 代码检查：无 `safeDrawing`/`windowInsetsPadding`；Column 无 weight/scroll（已在优化前代码中实证）|
| （模拟器实测新发现）录像启动崩溃 | `Path.of()` 为 Java 11 API，Android 侧 API 34+ 才可用（minSdk 26 直接 `NoSuchMethodError`）| logcat `NoSuchMethodError: No method of(Ljava/lang/String;[Ljava/lang/String;)Ljava/nio/file/Path`；**只有真机/模拟器能发现，JVM 单测无法暴露** |
| （模拟器实测新发现）GL 效果目标组合 | `OverlayEffect(PREVIEW|VIDEO_CAPTURE)` 在模拟器 SwiftShader 上挂起整个效果管线（预览黑屏 + Finalize ERROR_NO_VALID_DATA）；改为 `VIDEO_CAPTURE` 目标后稳定、水印正常进入最终视频 | 对照实验 4 轮：preview+video=黑屏 0 字节；仅 video=成功且帧提取可见水印 |

## 2. 修改内容

### 新增文件
| 文件 | 说明 |
|---|---|
| `core/recording/src/main/.../WatermarkTextFactory.kt` | 水印文本工厂（纯 JVM）：设备时间/起录时间/四态定位/会话编号；时间显式带时区偏移；定位未取得时显式显示「未启用/定位中/不可用」，**绝不伪造坐标** |
| `core/recording/src/main/.../WatermarkLayout.kt` | 显示坐标→缓冲区坐标仿射矩阵（0/90/180/270 旋转 + 裁剪偏移；镜像标记），纯 JVM 可单测 |
| `app/src/main/.../recording/WatermarkOverlayRenderer.kt` | 逐帧绘制水印进 `OverlayEffect` 画布（半透明底衬、红色 REC、阴影提升可读性）；`bindSession` 在会话创建后绑定编号/起录时间；帧计数（`drawnFrames`，0=未绘制需披露） |
| `app/src/main/.../recording/LocationSampler.kt` | 前台定位采样（仅"使用中"权限；不申请后台定位）；四态如实映射；实际结果回调写入 `locations.jsonl` |
| `core/recording/src/test/.../WatermarkTest.kt` | 水印真实性测试 13 项（时区格式、暂停态、四态定位、坐标精度、矩阵旋转映射、非法角度回退） |

### 修改文件
| 文件 | 关键改动 |
|---|---|
| `app/.../recording/CameraXVideoEngine.kt` | ① 接入 `OverlayEffect`（官方 camera-effects 1.4.2，目标 `VIDEO_CAPTURE`、队列深度 0、专用 GL HandlerThread）；② `UseCaseGroup` 绑定；③ `shutdown()` 释放 GL 线程；④ 水印初始化失败如实失败（不降级为"无水的录制"） |
| `app/.../recording/RecordingSessionHolder.kt` | ① `PendingOp`（IDLE/STARTING/SAVING）阶段状态 + 全部按钮联动禁用（防连点，模拟器双击测试通过）；② 录制计时器（挂钟差值、暂停冻结，仅提示用途）；③ 定位开关 + `LocationSampler` 接线；④ 水印渲染器仅在水印开启时创建；⑤ 引擎切换时先解绑旧实例（防资源泄漏）；⑥ ops 线程未捕获异常兜底（不允许杀死进程）；⑦ 录制中禁止模式切换 |
| `app/.../MainActivity.kt` | ① `enableEdgeToEdge()` + `WindowInsets.safeDrawing` 处理（顶部/底部永不被系统栏覆盖）；② 重构为「固定顶栏 + weight 弹性内容区 + 固定状态卡/开关/两行底部按钮」——预览只占分配区域；③ 录音模式显示醒目状态面板（闪烁红点 +「正在录音」+ 计时）；④ 权限被拒明确显示原因；⑤ 模式切换在录制中禁用并提示 |
| `app/.../recording/RecordingService.kt` | 前台服务支持 location 类型（14+）与视频/音频通知区分 |
| `app/src/main/AndroidManifest.xml` | 新增 CAMERA / ACCESS_FINE_LOCATION / ACCESS_COARSE_LOCATION / FOREGROUND_SERVICE_CAMERA 权限；服务类型 `microphone|camera|location`；`configChanges` 防旋转重建中断录制 |
| `core/model/.../EventTypes.kt` | 新增 `watermark_configured` / `watermark_frames` 事件类型 |
| `core/recording/.../RecordingController.kt` | 水印配置事件（`timeSource=device_wall_clock` 显式标注）；停止后写入 `watermark_frames` 帧计数；`startWallMs` 暴露 |
| `core/recording/.../RecordingEngine.kt`（配置类） | `VideoRecordingConfig` + watermark/timeZone/location 字段；`RecordingEngine.watermarkFramesDrawn()` |
| `core/storage/.../EvidenceStore.kt`、`PathSafety.kt` | **`Path.of()` → `Paths.get()`**（Android API 26 兼容性修复，见根因表） |
| `gradle/libs.versions.toml`、`app/build.gradle.kts` | 新增 camera-effects 1.4.2、kotlinx-coroutines-android 1.10.2 |

## 3. 水印实现（对应指令第三节）

- **实现方式**：androidx.camera.effects `OverlayEffect`（官方 API，源码核实自 1.4.2 sources jar）逐帧绘制进编码器输入帧。**水印进入最终视频文件**（已用模拟器录制 + 帧提取实证：`● REC · TK-XXXX / 设备时间 … / 起录 … / 位置 …` 清晰可见）。
- **字段**：REC/暂停中状态、本地记录编号（会话 ID 短形式 TK-XXXXXXXX）、设备时间（显式时区）、起录时间（设备时间）、位置行（四态）。
- **定位失败处理**：未启用→「位置 未启用」；定位中→「位置 定位中…」；不可用→「位置 不可用」；仅实际结果→坐标 6 位小数 + ±精度 + 定位时间（模拟器注入 31.2304/121.4737 实测水印显示 `31.230398, 121.473698 ±5m`）。**无任何伪造地理信息**。
- **时间来源**：一律设备系统时钟，水印与事件中显式标注 `timeSource=device_wall_clock`，**不宣称为可信时间戳**；定位时间与水印画面时间分开标注。
- **原始证据保护**：水印在相机→编码器管线内直接合成，录制产物即带水印的**原始件**（单一文件，无"先录后转码"的二次产物）；原始媒体保护规则（不覆盖、不改写）不被违反。
- **一致性**：`watermark_configured` 事件记录启用状态/时区/编号；停止后 `watermark_frames` 记录绘制帧数（本次实测 226 帧）；`drawnFrames=0` 时报告必须披露"水印未绘制"——不得仅凭配置声称视频含水印。
- **能力边界**：水印不证明视频未被篡改、不构成可信时间戳、不保证任何法律效力（与 `LegalCopy`/THREAT_MODEL 表述一致）。

## 4. 录音提示（对应指令第四节）

- 状态阶段：空闲 / 正在初始化（STARTING）/ **正在录音（闪烁红点 + 大字提示 + 实时计时）** / 已暂停（计时冻结 + 黄色指示）/ 正在保存（SAVING，含等待编码器 Finalize）/ 已停止（封装完成）/ 已中断（如实标注）。
- 计时来源：挂钟差值、暂停冻结，**仅界面提示用途**（不是可信时间）。
- 防连点：STARTING/SAVING 期间全部操作按钮禁用；模拟器双击停止实测后状态一致（STOPPED）。
- 状态来源：一律来自 `RecordingController` 真实结果与状态机（非按钮点击事件推断）；启动失败/停止失败如实显示原因。

## 5. 布局修复（对应指令第五节）

- **根因**（见 §1）：Insets 未处理 + 固定高度溢出。
- **修复**：`enableEdgeToEdge()` + `WindowInsets.safeDrawing` 内边距；布局重构为固定顶栏（模式 chips 常驻可见）+ `weight(1f)` 弹性内容区（预览只占此区域）+ 固定状态卡 + 固定底部两行按钮。不采用 z-index/elevation 补丁。
- **横竖屏**：`configChanges` 防重建 + 窗口 Insets 自适应；模拟器横屏实测：顶部 chips 与底部按钮全部可见（uiautomator 断言）。
- **预览资源**：单实例绑定（幂等 `attachPreview`）；切换模式/退出时 `detachPreview` 解绑；重建引擎前先解绑旧实例。

## 6. 验证结果（如实区分）

### 已通过（模拟器辅助验证：Pixel 5 AVD / Android 13 (SDK 33) / 后置模拟摄像头）
1. ✅ 录音模式布局：顶部 chips、底部按钮完整可见（截图 + uiautomator）。
2. ✅ 录音状态提示：录制中显示「正在录音」+ 闪烁红点 + 计时（00:06 实测）；停止后 STOPPED、文件 123KB 封装成功。
3. ✅ 快速连续点击：双击停止无重复会话、状态一致。
4. ✅ 录像模式布局：顶部 chips 与底部按钮完整可见（修复前会被预览挤掉/被系统栏覆盖）。
5. ✅ 视频水印**进入最终视频**：`OverlayEffect(VIDEO_CAPTURE)` 绘制；帧提取可见完整水印；`watermark_frames=226`。
6. ✅ 定位可用：模拟器注入 GPS → 水印显示实际坐标 `31.230398, 121.473698 ±5m`（与实际注入一致）；`locations.jsonl` 写入实际定位记录（精度 5m、provider=gps）。
7. ✅ 定位不可用：未授权时水印显示「位置 未启用」（截图实证），**无伪造坐标**。
8. ✅ 横竖屏：竖屏（1080x2340）与横屏（2340x1080）下顶部与底部控件均完整可见。
9. ✅ 异常路径：录像 Finalize 失败时如实标记 ABORTED + 文件 INCOMPLETE + 事件记录（模拟器 GL 兼容实验中的真实失败被正确记录，未伪造成功）。
10. ✅ 保存失败路径：引擎 stop 失败 → `engine_action_failed` 事件 + INCOMPLETE + ABORTED（模拟器实测 error code=8 时按设计走通）。
11. ✅ 录音/录像多次切换：会话隔离、无残留（多次实测中每次会话目录独立）。
12. ✅ 单元测试 103/103 全绿（model 14 + storage 49 + integrity 7 + recording 33）。
13. ✅ 构建：`:app:assembleDebug` + `:app:assembleRelease` 全部 `BUILD SUCCESSFUL`（含 lintVitalRelease）。

### 未通过 / 修复后重验
- 初版在模拟器上录像崩溃（`Path.of` NoSuchMethodError）→ 已修复（Paths.get）并重验通过。
- `PREVIEW|VIDEO_CAPTURE` 目标组合致管线停摆 → 已改为 `VIDEO_CAPTURE` 并重验通过（水印在视频中，预览无水印但有独立状态提示）。

### 待真实设备验证（不得视为通过）
- 真机上 `PREVIEW|VIDEO_CAPTURE` 组合是否可用（若可用且稳定，可升级为"预览+视频同管线"；当前实现为保守方案）；
- 前置摄像头镜像下水印方向（[WatermarkLayout] 镜像路径逻辑已备，需真机确认）；
- 各机型 GL 兼容性（OverlayEffect 官方注明依赖设备能力；低端设备可能不可用——当前实现如实失败不静默降级）；
- 锁屏/切后台录像行为、厂商后台限制、定位真实精度；
- 14+ 前台服务 location 类型的系统校验行为。

## 7. 遗留问题与建议

1. **预览不含水印**（保守方案）：模拟器上 `PREVIEW|VIDEO_CAPTURE` 组合停摆，当前水印只进视频文件；真机验证通过后可评估是否恢复双目标。**功能上满足"水印在最终视频"核心要求**。
2. **录像中切换摄像头**仍为如实"不支持"（CameraX 限制，D-017 待用户决策）。
3. Wmtest AVD 仅为辅助验证环境，其结果**不构成真机验收**（需求 §9）。
4. 发布阻塞状态维持：L-1 法律调研已由用户取消（D-018），相关交付物不再列为本项目要求。

## 8. 交付物

- **APK**：`dist/TraceKeep-v0.1.1-release.apk`（8,834,426 字节；SHA-256 `2b268348311b2395…`；apksigner v2 验签通过；versionCode=2 / versionName=0.1.1）
- **源码/测试/文档** 全部在工作区；证据：`docs/execution/logs/2026-10-29-optimization*.log`、测试 XML、截图 `/tmp/tk-*.png`（会话级临时文件）、帧提取图 `/tmp/tk-video*.mp4.png`。
- 未执行 Git 提交/推送（未授权）。
