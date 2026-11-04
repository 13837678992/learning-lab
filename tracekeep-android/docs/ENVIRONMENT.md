# TraceKeep 环境基线（ENVIRONMENT.md）

> 阶段 1 交付物（`PROJECT_REQUIREMENTS.md` §2）。记录工具链实测结果与版本固定依据。
> 核实日期：2026-10-29。**本文件同时是本机（开发机）配置说明；版本变更必须同步更新本文件与 `DECISIONS.md` D-010。**

---

## 1. 开发机环境（实测）

| 组件 | 版本/路径 | 核实方式 | 备注 |
|---|---|---|---|
| 操作系统 | macOS（Darwin 24.6.0，Apple Silicon） | `uname`/系统信息 | — |
| JDK | OpenJDK 17.0.20.1，`/opt/homebrew/opt/openjdk@17` | `java -version` 实测 | Homebrew keg-only，`JAVA_HOME` 默认未设置；已通过 `gradle.properties` 的 `org.gradle.java.home` 显式登记 |
| Android SDK | `~/Library/Android/sdk`（`local.properties` 指定） | 目录实测 | platform-tools（adb 37.0.1）、cmdline-tools、emulator、platforms、build-tools、system-images |
| SDK Platforms | android-27、android-33、**android-35** | `ls platforms/` | compileSdk 35 所需平台已具备 |
| Build-Tools | 28.0.3、33.0.2、34.0.0、**35.0.0** | `ls build-tools/` | 35.0.0 匹配 compileSdk 35 |
| SDK 许可 | `licenses/` 已包含 `android-sdk-license` 等 | `ls licenses/` | 构建无需交互接受许可 |
| Gradle | **8.11.1**（wrapper；本机 dists 缓存已存在，免下载） | `~/.gradle/wrapper/dists/` | wrapper 由 gradle 8.11.1 本体生成 |
| Gradle 缓存 | 亦存在 gradle-8.0.2-all（未使用） | 同上 | — |
| 真机 | **无**（`adb devices` 无设备） | 实测 | 真机验证在阶段 3+ 需要时由用户提供；模拟器不替代真机测试 |
| 桌面 Python | 系统 3.9.6（**未用于本项目**） | `python3 --version` | 「桌面兼容格式实测」若启动需 ≥3.12 另行安装（D-007 未纳入首版） |

## 2. 构建版本固定（D-010 定稿）

| 组件 | 固定版本 | 选版依据 |
|---|---|---|
| Gradle Wrapper | **8.11.1** | 本机已缓存；满足 AGP 8.7.x 最低要求（8.9+） |
| Android Gradle Plugin | **8.7.3** | 候选区间 8.7–8.9 内取 8.7 线最新补丁；官方 Maven 元数据核实存在（2026-10-29）；与 Gradle 8.11.1 / JDK 17 兼容 |
| Kotlin | **2.1.21** | 官方 Maven 元数据核实存在；2.1 线稳定补丁；Compose 编译器随 Kotlin 版本（`kotlin.plugin.compose` 2.1.21） |
| compileSdk | **35** | 本机已具备 android-35 平台与 build-tools 35.0.0 |
| minSdk | **26**（Android 8.0） | 需求 §2 定位「个人使用」；26 覆盖 2017 年后设备；与参考项目 DroidCustos 的 Android 8+ 目标一致；后续如需下调需评估 MediaProjection/前台服务 API 差异后另行决定 |
| targetSdk | **35** | 与 compileSdk 一致；**不得为规避权限规则降级**（需求 §2） |
| Java toolchain | **17**（source/target 17） | JDK 17 LTS；AGP 8.x 要求 |
| Compose BOM | **2025.06.01** | 官方 Maven 元数据核实存在（2026-10-29）；提供一致的 Compose 组件版本集 |
| androidx.activity:activity-compose | **1.10.1** | 元数据核实存在 |
| androidx.core:core-ktx | **1.15.0** | 元数据核实存在 |
| JUnit | **4.13.2** | 单元测试基线（Maven Central 核实存在） |

**版本纪律**：全部版本固定于 `gradle/libs.versions.toml`，禁止动态版本（`+`、`latest.*`）；升级必须经「官方兼容矩阵 + 实际构建 + 测试全绿」三重确认并记录于本文件与 `DECISIONS.md`。

## 3. 构建配置说明

- `gradle.properties`：
  - `org.gradle.jvmargs=-Xmx3g …`（AGP 构建内存）；
  - `org.gradle.java.home=/opt/homebrew/opt/openjdk@17`（本机 JDK 专用路径——**换机/换项目需注意**，见下方「可移植性」）；
  - `android.useAndroidX=true`、`android.nonTransitiveRClass=true`。
- `local.properties`：`sdk.dir` 指向本机 SDK（**不进版本控制**，已在 `.gitignore` 排除）。
- 仓库：`google()` + `mavenCentral()`，`FAIL_ON_PROJECT_REPOS`（依赖只能从 settings 声明的仓库解析）。

## 4. 可移植性说明（换机/他人复现）

1. `org.gradle.java.home` 若在他人机器上不存在会导致构建直接失败：他人复现时应删除该行（或改为本机 JDK 17 路径）；toolchain 行 `org.gradle.java.installations.paths` 同理。
2. `local.properties` 不随仓库分发，需各自生成（Android Studio 自动生成，或手写 `sdk.dir`）。
3. Gradle wrapper 首次运行会从 `services.gradle.org` 下载 8.11.1 发行版（本机已缓存，故免下载）。

## 5. 首次构建与测试实测结果

见 `docs/execution/2026-10-29-stage1.md` 与 `docs/execution/logs/` 保存的原始日志；结果摘要（以实测为准，不得提前宣称）：

- `./gradlew :app:assembleDebug :core:model:test :core:integrity:test`：**待实测填入**。
- APK 产物路径：`app/build/outputs/apk/debug/app-debug.apk`：**待实测确认**。

## 6. 依赖清单与许可证（初版）

| 依赖 | 用途 | 许可证 |
|---|---|---|
| AGP / AndroidX / Compose（Google） | 构建与 UI | Apache-2.0 |
| Kotlin stdlib | 语言运行时 | Apache-2.0 |
| kotlinx-serialization-json 1.8.1 | 证据账本 JSON 序列化（阶段 2 引入；Maven Central 元数据核实 2026-10-29） | Apache-2.0 |
| JUnit 4.13.2 | 单元测试 | EPL-1.0 |

**依赖纪律**（需求 §2/§8）：无广告、无分析统计、无默认上传 SDK；无网络权限声明（阶段 1 无任何权限）；不要求账号。后续每个阶段新增依赖必须更新本表；阶段 11 全量复审（漏洞 + 许可证）。
