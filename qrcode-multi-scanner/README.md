# 二维码扫描器（qrcode-multi-scanner）

Android 端的多二维码文本扫描工具。核心场景只有一个：

> 一段文本太长，被拆成多个二维码。用户按顺序逐张扫描，App 把每张的原始文本
> 分别存下来，最后按扫描顺序拼回完整文本。

它是仓库里另外两个「发送端」工具的接收端：

| 工具 | 角色 | 二维码内容格式 |
|---|---|---|
| `large-qrcode-transfer` | 发送端（Electron + Vue3） | JSON 帧 `{app,version,id,index,total,checksum,data}`，gzip + base64 |
| `qrcode-transfer-web` | 发送端（单文件网页版） | **纯文本分片**，每片 ≤1200 字节，无头部 |
| **`qrcode-multi-scanner`** | **接收端（Android）** | 直接拼接 `rawValue` |

第一阶段按「直接拼接 rawValue」实现，与 `qrcode-transfer-web` 的分片完全对应。
与 Electron 版的 JSON 协议帧不兼容（那是第二阶段要做的协议解析），详见
[功能边界](#功能边界第一阶段--第二阶段)。

---

## 一、技术信息

| 项目 | 版本 / 取值 |
|---|---|
| 最低 Android 版本 | **API 26（Android 8.0）** |
| 目标 / 编译版本 | targetSdk 35 / compileSdk 35 |
| Kotlin | **2.1.0** |
| Android Gradle Plugin | **8.7.3** |
| Gradle | 8.11.1（wrapper 已内置，含官方 checksum 校验） |
| Jetpack Compose | BOM `2024.12.01`（Material 3） |
| CameraX | **1.4.1** |
| ML Kit Barcode Scanning | **17.3.0（bundled，模型打包进 APK）** |
| 构建所需 JDK | **17** |
| 应用 ID | `com.weicheng.qrscanner` |

> **为什么选 `com.google.mlkit:barcode-scanning`（bundled）而不是
> `play-services-mlkit-barcode-scanning`？**
> 只有 bundled 版本的识别模型是打包进 APK 的，装机即可用、完全离线。
> play-services 版本要在首次使用时由 Play 服务联网下载模型，不满足「离线可用」。

> **为什么 minSdk 是 26？**
> 26 是自适应图标、`VibrationEffect`、`java.time` 同时可用的最低版本，
> 定在这里可以省掉全部兼容分支（不需要 PNG 图标、不需要 desugaring）。

---

## 二、构建与安装

### 前置条件

- JDK 17（`java -version` 应显示 17）
- Android SDK，含 Platform 35 与 Build-Tools
- 在项目根目录创建 `local.properties` 指向 SDK（Android Studio 会自动生成）：
  ```properties
  sdk.dir=/Users/你的用户名/Library/Android/sdk
  ```
  或者设置环境变量 `ANDROID_HOME`。

### 已实测的构建结果

2026-09-23 在 Apple Silicon Mac + OpenJDK 17.0.20 + Android SDK Platform 35 / Build-Tools 35.0.0 上实测：

| 命令 | 结果 |
|---|---|
| `./gradlew test` | **61 个测试全部通过**，0 失败 0 错误（ScanSession 11 + JoinStrategy 7 + SingleShotGate 5 + ScanFileNames 4 + ZoomPresets 12 + FailureHintPolicy 12 + ScanGeometry 10） |
| `./gradlew assembleDebug` | 成功，APK **34 MB**，已用 Android Debug key 签名，`minSdkVersion 26`，含 arm64-v8a / armeabi-v7a / x86 / x86_64 |
| `./gradlew assembleRelease` | 成功（含 `lintVitalRelease`），**未签名**包 30 MB |

APK 偏大是 bundled ML Kit 把识别模型打进包里换来的——这正是「完全离线」的代价。

> **JDK 不在 `PATH` 上时**（Homebrew 的 openjdk 是 keg-only）：
> ```bash
> JAVA_HOME=/opt/homebrew/opt/openjdk@17 ./gradlew test
> ```

> **尚未验证：真机上的启动与相机扫码行为。** 构建机没有 Android 设备，
> 无法验证应用能否正常启动、相机预览是否正常、ML Kit 能否真的识别出二维码，
> 也无法验证自动对焦、缩放档位与高容量二维码的实际识别效果。
> 装到手机后的第一次运行才是真正的验收，具体步骤见「九、已知限制」。

### 本机联网注意事项

本机通过本地代理 `127.0.0.1:7890` 联网，而 **Java / Gradle 不读 `http_proxy` 环境变量**
（curl 会读）。这会造成一个很有迷惑性的现象：`curl` 能下 `dl.google.com`，
Gradle 却报 `Remote host terminated the handshake`。

解决办法是在仓库外的 `~/.gradle/gradle.properties` 里配置系统属性：

```properties
systemProp.http.proxyHost=127.0.0.1
systemProp.http.proxyPort=7890
systemProp.https.proxyHost=127.0.0.1
systemProp.https.proxyPort=7890
systemProp.http.nonProxyHosts=localhost|127.0.0.1
```

写在全局而不是项目里，是为了同时覆盖 lint 等 fork 出来的 worker 进程。
网络畅通的环境（或已在 `settings.gradle.kts` 启用阿里云镜像）不需要这段配置。

### 常用命令

在 `qrcode-multi-scanner/` 目录下执行：

```bash
# 跑纯逻辑单元测试（不需要设备/模拟器）
./gradlew test

# 生成 debug APK
./gradlew assembleDebug
# 产物：app/build/outputs/apk/debug/app-debug.apk

# 直接安装到已连接的设备/模拟器
./gradlew installDebug

# 生成 release APK（未签名）
./gradlew assembleRelease
```

国内网络下依赖下载慢，可取消 `settings.gradle.kts` 中阿里云镜像仓库的注释。

### 安装 APK

已构建好的包放在 `dist/`（该目录不入库）：

```
dist/二维码扫描器-v0.1.0-debug.apk
```

传到手机上，在「设置 → 应用 → 安装未知应用」里允许文件管理器安装，然后点击安装即可。
也可以用 adb：

```bash
adb install -r dist/二维码扫描器-v0.1.0-debug.apk
# 或使用构建输出
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

> **发布用的 release APK 需要自行配置签名**（`signingConfigs`）。
> 当前 `assembleRelease` 产出的是未签名包，仅用于体积验证，不能直接安装。

---

## 三、使用方式

### 单张扫描

```
首页 →「单张扫描」→ 授权相机 → 对准二维码
→ 识别成功（震动一下，自动停止扫描）→ 结果页
→「复制到剪贴板」/「再次扫描」/「返回首页」
```

结果页的内容区可以直接长按选中一部分复制，也可以一键复制全文。

**扫码页上的操作：**

- **点击画面任意位置** → 对焦到该处（3 秒后自动回到连续对焦）；
- **底部缩放档位**（如 `1.0x / 2.0x / 3.0x`）→ 二维码太小、太密时放大；
  档位由设备实际支持的范围推导，设备不支持缩放时整行不显示；
- **扫描框尽可能大** → 高容量二维码的关键是「每个 module 分到多少像素」，
  请让二维码**连同四周的白色边缘**一起占满扫描框；
- **连续 5 秒没扫出来** → 底部出现一行提示（不是弹窗，不会打断你）。

### 多张合并

```
首页 →「多张合并」→ 进入即创建一个新任务
→「扫描下一张」→ 对准二维码 → 识别成功自动返回列表
→ 顶部显示「第 N 张扫描成功」和「已扫描 N 张」
→ 继续点「扫描下一张」扫第二张……
→ 全部扫完点「完成」→ 最终结果页
→「复制全部」/「保存为 TXT」
```

**扫描顺序 = 拼接顺序。** 每扫到一张都会立即停下来等你操作，不会自动连着扫。

点击列表里的任意一条可以查看完整内容，也可以删除该张（删除后剩余条目序号自动重排）。

### TXT 保存位置

| Android 版本 | 保存方式 | 位置 |
|---|---|---|
| **API 29+** | 静默写入系统「下载」集合 | 内部共享存储 `Download/` 目录，例如 `/sdcard/Download/二维码扫描_20260923_094530.txt`，可在「文件」App 的「下载」中看到 |
| **API 26–28** | 弹出系统文件选择器（SAF） | 由用户自行选择，默认文件名已填好 |

文件名格式：`二维码扫描_YYYYMMDD_HHmmss.txt`，例如 `二维码扫描_20260923_094530.txt`。

**两条路径都不需要申请存储权限。**

---

## 四、核心功能说明

### 1. 扫描成功后立即停止（需求 11）

这是整个应用最关键的一条：CameraX 每秒回调几十帧，用户把二维码对准镜头后
会连续命中同一张码。如果不处理，就会变成「第1张、第1张、第1张」。

实现方式：

- `scan/SingleShotGate.kt` —— 用 `AtomicBoolean.compareAndSet` 做**只放行一次**的闸门。
  用 CAS 而不是「先判断再赋值」，是因为 ML Kit 回调与帧解析可能并发，
  分开写会留下竞态窗口导致仍然重复保存。
- `scan/QrAnalyzer.kt` —— 抢到闸门的帧才上报；没抢到的帧直接丢弃。
- `ui/scan/ScanScreen.kt` —— 命中后**先 `unbindAll()` 解绑相机**，再震动，最后跳转。

一次性由**页面生命周期**保证，而不是靠标志位：每次进入扫码页都会新建
`SingleShotGate` + `QrAnalyzer`，离开页面即作废。想再扫一张，必须重新进入扫码页。
所以「扫描成功后不自动进入下一张」在架构上是默认行为，而不是需要额外判断的分支。

### 2. 每张独立保存，最后才拼接（需求 5、8）

`ScanSession` 保存的是一个**列表**，不是拼接好的字符串：

```kotlin
data class ScanSession(
    val items: List<ScanItem>,   // [AAAA, BBBB, CCCC]
    val nextSeq: Int,
)
```

- 扫描时只 `append`，内容逐字原样保存：**不 trim、不补换行、不拼接**；
- 拼接只在用户点「完成」时发生，由 `JoinStrategy` 决定怎么拼；
- 拼接策略现在是 `JoinStrategy.Direct`（直接拼接，无分隔符），
  `AAA + BBB + CCC → AAABBBCCC`；
- 换行拼接 / 自定义分隔符已经在 `JoinStrategy.separated(...)` 里预留好，
  第二阶段接入界面即可，不需要改动数据结构。

### 3. 序号即顺序

`ScanItem.index` 恒等于该条目在列表中的位置，删除后由 `ScanSession.delete`
统一重排。这样「界面显示的『第 N 张』」和「最终拼接顺序」永远一致，
不会出现删掉一张之后序号断档、用户对不上位置的情况。

### 4. 数据安全

| 措施 | 说明 |
|---|---|
| **移除 `INTERNET` 权限** | 见下方「关于联网权限」。已在 `AndroidManifest.xml` 用 `tools:node="remove"` 显式剔除，并**从构建产物验证**确认最终 APK 只声明 `CAMERA` 与 `VIBRATE` |
| `android:allowBackup="false"` | 扫描内容不会进入 Google 云备份 |
| 日志禁止记录内容 | `util/AppLog.kt` **刻意不提供**任何能传入任意字符串的通用日志方法，只暴露 `scanSuccess(index, contentLength)`，让「记录二维码内容」在结构上写不出来 |
| 无后端、无账号 | 没有服务器、没有登录、没有云同步、没有统计埋点 |
| 不申请存储权限 | 导出走 MediaStore / SAF |

调试日志形如：`scan success index=3 contentLength=1250`。

#### 关于联网权限（一个真实的坑）

只在自己的 `AndroidManifest.xml` 里**不写** `INTERNET` 是不够的。

ML Kit 的传递依赖 `com.google.android.datatransport:transport-backend-cct`
是 Google 的 **CCT 遥测上传后端**，它会在清单合并阶段把
`INTERNET` 和 `ACCESS_NETWORK_STATE` 塞进最终清单——于是「没有联网能力」
这个承诺被依赖悄悄破坏了。（这是从 `app/build/outputs/logs/manifest-merger-debug-report.txt`
里查出来的，不是推测。）

所以本应用在清单里显式声明 `tools:node="remove"` 把这两个权限移除，
让离线保证重新成为结构性事实：**即使库里有遥测代码，进程也没有权限建立任何网络连接。**

验证方式（可自行复核）：

```bash
$ANDROID_HOME/build-tools/35.0.0/aapt2 dump permissions \
  app/build/outputs/apk/debug/app-debug.apk
# 期望只看到 CAMERA 与 VIBRATE
```

### 6. 高容量二维码识别优化

普通二维码能扫、高容量高密度二维码扫不出来，根因是**送进 ML Kit 的图本身分辨率不够**。

CameraX 的 `ImageAnalysis.Builder()` 在不做任何配置时继承 `ImageAnalysis.DEFAULT_CONFIG`，
目标分辨率写死为 **640×480**（可在 `camera-core` 的字节码里确认）。对高密度二维码：

```
二维码占画面宽度的一半
  V10 码（ 57×57 模块）在 640px 宽画面里 → 约 5.6 px/module  ✅ 能识别
  V30 码（137×137 模块）在 640px 宽画面里 → 约 2.3 px/module  ❌ 低于 ML Kit 的下限
```

ML Kit 稳定解码大致需要 3–4 px/module。所以本次只解决**分辨率、对焦、缩放**这三件基础的事，
不做二值化、锐化、超分辨率——那些都是在像素本来就不够的前提下修修补补。

| 改动 | 位置 | 说明 |
|---|---|---|
| 分析分辨率 640×480 → **1920×1440（4:3）** | `scan/CameraConfig.kt` | 本次的核心修复。4:3 是传感器原生画幅，比 16:9 视野更完整、像素多 33%；预览 `FILL_CENTER` 会裁切显示，所以分析区域只会比预览所见更大 |
| 分辨率协商**上不封顶** | 同上 | `FALLBACK_RULE_CLOSEST_LOWER_THEN_HIGHER`：设备不支持 1440p 就取最接近的更低尺寸（通常 1600×1200 / 1440×1080，仍是 VGA 的 4–6 倍）。刻意不用默认的 `CLOSEST_HIGHER_THEN_LOWER`，否则某些设备会悄悄选出 3–12MP 的流，ML Kit 每帧多花几百毫秒而解码率毫无提升 |
| 显式 YUV 输出 | 同上 | `OUTPUT_IMAGE_FORMAT_YUV_420_888`。**绝不能改成 RGBA**，那会强制一次 YUV→RGBA 转换、拷贝量翻倍 |
| 进入页面初始对焦 | `ScanScreen.wireCameraControls` | 等预览真正出帧（`STREAMING`）后再对画面中心对焦一次。这一步是必需的：`PreviewView` 的 metering 矩阵就绪前会返回哨兵点 `PointF(2f, 2f)`，用它对焦是无效的 |
| 点击对焦 | 同上 | 点画面任意位置重新对焦（AF + AE），3 秒后自动取消回到连续自动对焦。用 `CameraInfo.isFocusMeteringSupported` 判定，不支持定焦的设备直接跳过 |
| 缩放档位 | `scan/ZoomPresets.kt` | 高密度二维码最有效的补救手段：把二维码拍大，每个 module 分到的像素就更多。CameraX 的 zoom 走 `SCALER_CROP_REGION`，是真实传感器裁切而非插值放大 |
| 取景框 0.72 → **0.85** | `scan/ScanGeometry.kt` | 框越大，用户越会把二维码凑近，落到 module 上的像素越多 |
| 持续失败提示 | `scan/FailureHintPolicy.kt` | 连续 5 秒没扫出来才提示一次，绝不第一帧就弹。策略返回 `SHOW/HIDE/NONE` 而非布尔值，因此 30fps 跑一分钟对 UI 也只写入两次 |

**关于「高清模式」：** 需求里预留了这个开关，但最终决定不做，而是让扫码器**默认就使用最高质量配置**。
原因：切换分辨率必须重新绑定 `ImageAnalysis`，会连带重建预览流、重置对焦/曝光收敛，
而且多数机型的分析流本身就有上限，切了往往还是同一个尺寸——收益低、风险高。
取而代之的是 debug 包底部会显示实际生效的分辨率（如「分析 1920×1440」），
让你不用连电脑就能确认优化是否真的生效。

**代价（这是真实的取舍，不是白拿的）：** 分析分辨率从 640×480 提到 1920×1440，
像素多了 9 倍，ML Kit 每帧的耗时也会明显上升。配合 `STRATEGY_KEEP_ONLY_LATEST`
只会丢帧、不会堆积，所以**普通二维码的识别速度可能比改动前略慢一点**，
换来的是高容量二维码从「扫不出来」变成「能扫」。如果实测发现普通码慢得难以接受，
把 `CameraConfig.kt` 的目标分辨率降到 `1280×960` 是个折中点——
对高密度码仍是 4 倍于 VGA 的像素。

**真机验证步骤：**

1. 用「文字转二维码」工具生成高容量二维码（QR version 30+）。
2. 装 debug 包，进扫码页，看底部是否显示「分析 1920×1440」（或设备实际支持的尺寸）。
   **若显示 640×480，说明分辨率协商没生效**，高容量二维码就还是扫不出来。
   也可以连电脑看日志：`adb logcat -s QrScanner`，会有一行 `analysis resolution WxH`。
3. 依次验证：普通码仍能扫、高容量码能扫、近距离、远距离、各缩放档、不同光线。
4. 若预览卡顿或明显发热，把 `CameraConfig.kt` 里的目标分辨率下调为 `1920×1080`
   或 `1600×1200`——**只需改两个常量**。

### 7. 数据保存范围（重要）


扫描结果保存在 **ViewModel 的内存状态**中，因此：

- ✅ 横竖屏切换、页面间来回跳转，结果都不会丢；
- ❌ **App 被系统回收后（进程被杀），当前任务的扫描结果会丢失**。

这是刻意的取舍：持久化（扫描历史）属于第二阶段，见下节。
第一阶段请扫完就「复制全部」或「保存为 TXT」。

---

## 五、项目结构

```
qrcode-multi-scanner/
├── settings.gradle.kts / build.gradle.kts / gradle.properties
├── gradle/libs.versions.toml          # 版本目录：所有依赖版本集中在这里
├── gradlew, gradlew.bat, gradle/wrapper/   # 免安装 Gradle
└── app/
    ├── build.gradle.kts
    └── src/
        ├── main/
        │   ├── AndroidManifest.xml    # 只声明 CAMERA / VIBRATE
        │   ├── res/                   # 纯 Compose 界面，res 只有图标与主题
        │   └── java/com/weicheng/qrscanner/
        │       ├── MainActivity.kt        # 入口 + 路由表（页面地图在这里一眼看全）
        │       ├── model/                 # 纯 Kotlin 数据模型
        │       │   ├── ScanItem.kt        #   单张：id / index / content (+预留分片字段)
        │       │   └── ScanSession.kt     #   任务：append / delete / join
        │       ├── domain/                # 纯 Kotlin 领域逻辑
        │       │   ├── JoinStrategy.kt    #   拼接策略（含第二阶段扩展点）
        │       │   └── ScanFileNames.kt   #   导出文件名
        │       ├── scan/                  # 相机与识别
        │       │   ├── SingleShotGate.kt  #   防重复扫闸门
        │       │   ├── QrAnalyzer.kt      #   ML Kit QR 识别（图像直通，不做 Bitmap 转换）
        │       │   ├── CameraConfig.kt    #   分析流分辨率配置 ← 高容量二维码的核心修复
        │       │   ├── ZoomPresets.kt     #   由设备能力推导缩放档位（纯逻辑）
        │       │   ├── FailureHintPolicy.kt #  持续失败提示策略（纯逻辑）
        │       │   ├── ScanGeometry.kt    #   取景框尺寸 + 点击对焦坐标换算（纯逻辑）
        │       │   └── CameraProvider.kt  #   ListenableFuture → 挂起函数
        │       ├── data/                  # 平台 IO
        │       │   ├── Clipboard.kt       #   剪贴板
        │       │   └── TextFileExporter.kt#   MediaStore / SAF 导出
        │       ├── util/AppLog.kt         # 只记录长度与序号的日志
        │       └── ui/
        │           ├── ScanViewModel.kt   # 全应用共享状态
        │           ├── Routes.kt          # 路由常量
        │           ├── components/        # AppTopBar / ContentCard / 消息提示
        │           ├── home/              # 首页
        │           ├── scan/ScanScreen.kt # 扫码页（单张与多张共用）
        │           ├── single/            # 单张结果页
        │           └── multi/             # 多张：列表页 / 条目详情 / 最终结果页
        └── test/java/com/weicheng/qrscanner/   # JVM 单元测试
            ├── model/ScanSessionTest.kt
            ├── domain/JoinStrategyTest.kt
            ├── domain/ScanFileNamesTest.kt
            ├── scan/SingleShotGateTest.kt
            ├── scan/ZoomPresetsTest.kt
            ├── scan/FailureHintPolicyTest.kt
            └── scan/ScanGeometryTest.kt
```

`model/` 与 `domain/` 不含任何 `android.*` 依赖，是刻意为之：
核心逻辑（拼接顺序、防重复、文件命名）因此可以直接用 JVM 单元测试覆盖，
不需要设备或模拟器。

`scan/` 下的 `ZoomPresets` / `FailureHintPolicy` / `ScanGeometry` 同样不含 `android.*`——
它们虽然是相机相关概念，但都是纯计算，放在同一层可以直接单测。
坐标换算、缩放档位推导这类逻辑一旦出错，在真机上的表现只是「点了没反应」，
极难排查，所以更值得用测试守住。

---

## 六、测试

```bash
./gradlew test
```

覆盖了验收标准里最硬的三条：

| 测试 | 覆盖内容 |
|---|---|
| `ScanSessionTest` | AAA+BBB+CCC → AAABBBCCC；每张独立保存；删除后重新编号；内容不被 trim/加换行 |
| `SingleShotGateTest` | 同一张码连续 20 帧只放行 1 次；32 线程并发抢占只成功 1 次 |
| `JoinStrategyTest` | 直接拼接无分隔符；预留的换行/自定义分隔符可用 |
| `ScanFileNamesTest` | `二维码扫描_20260923_094530.txt` 格式与补零 |
| `ZoomPresetsTest` | 绝不假设 2× 存在；min=max、max<min、`NaN`/`Infinity`、max=100 封顶、min=2 时不重复给 2× |
| `FailureHintPolicyTest` | 第一帧绝不提示；300 帧连续失败对 UI 只写入 2 次；识别成功后重新计时；时间戳回退不会把提示卡死 |
| `ScanGeometryTest` | 取景框短边等比；点击坐标恒等/等比/越界钳制；尺寸为 0 或 `NaN` 时返回 null |

---

## 七、页面状态流转

```
home
 ├── scan/single ──扫描成功──> single/result
 │                                ├── 复制到剪贴板
 │                                ├── 再次扫描 ──> scan/single
 │                                └── 返回首页 ──> home
 └── multi/session                 ← 进入即新建任务
       ├──「扫描下一张」──> scan/multi ──扫描成功──> 自动返回 multi/session
       │                                              （等用户再点下一张）
       ├── 点击某一条 ──> multi/item/{id}
       │                     ├── 查看完整内容
       │                     └── 删除这一张 ──> 返回列表
       └──「完成」──> multi/result
                        ├── 复制全部
                        ├── 保存为 TXT
                        └── 重新扫描 ──> 清空任务并回到 home
```

---

## 八、功能边界（第一阶段 / 第二阶段）

### 第一阶段 MVP —— 已实现

- 单张扫描：识别、显示、复制到剪贴板、再次扫描
- 多张合并：一张一张扫、扫完即停、手动点「扫描下一张」、显示已扫数量
- 每张独立保存、可查看、可删除（带二次确认）
- 按顺序拼接、复制全部、保存为 TXT
- 无网络、无账号、无后端

### 第二阶段 —— 尚未实现

以下功能**按需求明确排除在第一阶段之外**，代码里已留好扩展点：

| 功能 | 预留位置 |
|---|---|
| 扫描历史（首页「最近扫描」） | 需引入本地持久化（Room / DataStore） |
| 单张重新扫描 | `ScanSession` 加一个 `replace(itemId, content)` 即可，扫码页无需改动 |
| 拖动调整顺序 | `ScanSession.items` 是普通列表，重排后按 `index` 重编号即可 |
| 换行拼接 / 自定义分隔符 | `JoinStrategy.separated(...)` 已实现，只差界面入口 |
| 自动解析 `[1/5]xxx` 分片 | `ScanItem.partIndex` / `totalParts` 字段已预留 |
| 显示 `3 / 5`、校验缺失与重复 | 依赖上一项解析结果 |

> **关于 Electron 版发送端：** 它的二维码内容是 JSON 协议帧
> （`{"app":"large-qrcode-transfer","index":1,"total":30,...}`）。
> 第一阶段的直接拼接会把整段 JSON 原样拼起来，**得到的是 JSON 串而不是原文**。
> 要接它需要第二阶段实现协议解析 + checksum 校验 + gzip 解压。
> 数据模型里的 `partIndex` / `totalParts` 正是为它准备的（与帧里的 `index` / `total` 一一对应）。

---

## 九、已知限制

- **真机行为未经验证**：构建机无 Android 设备，启动、相机、扫码识别均未实机跑过。
- **高容量二维码优化同样未经验证**：以下都只能由你在真机上确认——
  - 实际协商到的分析分辨率（看 debug 包底部徽标，或 `adb logcat -s QrScanner`）；
  - 高容量二维码是否真的能解码，以及 ML Kit 在 2.76MP 下的延迟是否可接受；
  - `bindToLifecycle` 在目标机型上是否成功（失败会被 `runCatching` 吞掉并打一条
    `camera bind failed` 日志，表现为黑屏）；
  - 点击对焦的实际效果（依赖设备是否支持测光对焦）；
  - 底部引导文案 + 缩放档位 + 分辨率徽标在小屏上是否放得下。
- **debug 包可直接安装**，release 包未签名（需自行配置 `signingConfigs`）。
- **进程被杀后当前扫描任务丢失**（见「数据保存范围」），持久化在第二阶段。
- **扫码页未锁定屏幕方向**，旋转屏幕会重建扫码页，相当于重新开始这一张的扫描
  （列表里的结果不受影响，因为状态在 ViewModel 中）。
- **取景框只是视觉引导**，实际识别区域是整帧画面。ML Kit 对整帧做检测，
  不裁剪到框内——这样用户手稍微偏一点也能扫到，成功率更高。
- **没有做自动 Zoom**：需求里的「检测到二维码太小就自动放大」属于 P2，
  本次只做了用户手动选择的缩放档位。
- Android 13 及以上系统在复制时会自己弹一次「已复制」浮层，本应用另有一个
  Snackbar 提示。这是为了让不同系统版本上的反馈保持一致。

---

## 十、许可证

MIT，与仓库其余部分一致。
