# 构建与安装说明（build-and-install）

本文档记录在本机（macOS arm64）从零搭建环境并构建 Android APK 的完整过程，可复现。

## 1. 构建环境

| 组件 | 版本 | 位置 | 说明 |
| --- | --- | --- | --- |
| Cocos Creator | 2.4.13 (mac, Intel 版经 Rosetta 2 运行) | `~/tools/creator/CocosCreator.app` | 官方直链 `https://download.cocos.com/CocosCreator/v2.4.13/CocosCreator-v2.4.13-20240123-mac.zip`。原项目为 2.4.3，官方 CDN 已无法下载 2.4.3；2.4.13 为同系列最终版，完全兼容 |
| JDK | Zulu OpenJDK 17.0.20 (arm64) | `~/tools/zulu17.68.203-ca-jdk17.0.20.1-macosx_aarch64/Contents/Home` | 2.4.13 的 Android 模板使用 AGP 8.0.2 / Gradle 8.0.2，必须 JDK 17 |
| Android NDK | r21e (x86_64, Rosetta) | `~/tools/android-ndk-r21e` | Creator 2.4 官方推荐 r21 |
| Android SDK | platforms android-27/33/35, build-tools 28.0.3/33.0.2/34/35 | `~/Library/Android/sdk` | 缺的包用 sdkmanager 安装 |
| Python | 2.7.15 (conda osx-64, Rosetta) | `~/tools/py27/bin/python` | cocos2d-console（cocos.py）**强制要求 Python 2.x**，系统无 python2 时用 miniforge 建 osx-64 环境 |
| python shim | `~/tools/bin/python` → py27 | 加入 PATH 供 Creator 调用 |

注意：Creator 2.4 读取 NDK/SDK 路径使用系统环境变量 `NDK_ROOT`、`ANDROID_SDK_ROOT`（官方文档确认偏好设置不生效时可用环境变量）。

## 2. 构建命令

```bash
export JAVA_HOME=~/tools/zulu17.68.203-ca-jdk17.0.20.1-macosx_aarch64/Contents/Home
export PATH=$HOME/tools/bin:$JAVA_HOME/bin:$PATH
export NDK_ROOT=$HOME/tools/android-ndk-r21e
export ANDROID_SDK_ROOT=$HOME/Library/Android/sdk

cd /Users/weicheng/code/learning-lab/cocos-big-watermelon
~/tools/creator/CocosCreator.app/Contents/MacOS/CocosCreator --path . --build "platform=android;debug=true"
```

构建产物：`build/jsb-link/`（原生工程），APK 位于
`build/jsb-link/frameworks/runtime-src/proj.android-studio/app/build/outputs/apk/debug/`。

如需手动编译/重编 APK：

```bash
cd build/jsb-link/frameworks/runtime-src/proj.android-studio
./gradlew assembleDebug   # 需要 JAVA_HOME 指向 JDK 17
```

## 3. 构建过程实际问题与修复记录

1. `download.cocos.org` 对 2.4.3 安装包返回 403/404 → 改用官方 2.4.13 直链。
2. `[NDK Root] is empty` → 编辑器偏好设置文件无法离线写入，改用环境变量 `NDK_ROOT`/`ANDROID_SDK_ROOT`（文档确认的备用方案）。
3. `spawn python ENOENT` → macOS 无 `python` 命令，制作 shim。
4. `COCOS PYTHON VERSION DOES NOT MATCH: 3.9, WHILE 2.7+ IS REQUIRED` → cocos.py 需要 Python 2.x，通过 miniforge osx-64 环境提供 python 2.7.15。
5. NDK r21e 的 `ndk-build` 报 `Unknown host CPU architecture: arm64` → 在 `$NDK/build/ndk-build` 的 case 分支中把 `arm64` 映射为 `x86_64`（Rosetta 运行 x86_64 预编译工具链）。
6. 生成的 `gradle.properties` 中 `PROP_COMPILE_SDK_VERSION=-1`（CLI 未选 API Level）→ 手动改为 33；`PROP_BUILD_TOOLS_VERSION` 28.0.3 低于 AGP 8 下限 → 改 33.0.2；`PROP_APP_ABI` 增加 `arm64-v8a`；`PROP_MIN_SDK_VERSION` 16 → 21。
7. **增量构建陷阱**：模板用 `mergeAssets.doLast` 从 jsb-link 根目录拷贝游戏资源，Gradle 增量构建时该任务被判定 UP-TO-DATE 而跳过，导致 APK 内资源不更新。重打资源后必须删除 `app/build/intermediates/assets` 与 `compressed_assets` 再执行 gradlew。

## 4. 安装到设备

```bash
adb install -r build/jsb-link/frameworks/runtime-src/proj.android-studio/app/build/outputs/apk/debug/合成大西瓜-debug.apk
```

- Debug APK 使用 AGP 自动生成的 debug keystore 签名，仅限个人安装使用。
- 应用为竖屏、离线运行，安装后可断网启动。

## 5. 构建结果

| 产物 | 路径 | 大小 |
| --- | --- | --- |
| Debug APK（双 ABI） | `build/jsb-link/frameworks/runtime-src/proj.android-studio/app/build/outputs/apk/debug/合成大西瓜-debug.apk` | 约 27.1 MB |
| Release APK（双 ABI，已签名，minify） | `build/jsb-link/frameworks/runtime-src/proj.android-studio/app/build/outputs/apk/release/合成大西瓜-release.apk` | 约 20.6 MB |

Release 构建要点：
- 自生成 keystore：`~/tools/keystore/watermelon.jks`（alias `watermelon`，密码 `watermelon123`，仅个人使用）。
- 必须只构建主模块：`./gradlew :合成大西瓜:assembleRelease`。`instantapp` 模块的签名配置与自定义 keystore 冲突（其 validateSigningRelease 会拼接默认 debug.keystore 路径），个人使用不需要 Instant App。
- 注意：Creator 重新生成工程时会把 `RELEASE_STORE_FILE` 等写成内置 debug.keystore 的值，重打 Release 前需重新写入自定义 keystore 路径（整行替换，不能做前缀替换）。

APK 校验（aapt2）：包名 `com.learning.bigwatermelon`，标签"合成大西瓜"，minSdk 21 / target&compileSdk 33，`screenOrientation=portrait`，`native-code: arm64-v8a, armeabi-v7a`，游戏资源（场景/贴图/音频/脚本，脚本经 xxtea 加密）全部内置于 assets。

模拟器验证步骤（Android Emulator, API 33 arm64）：

```bash
~/Library/Android/sdk/cmdline-tools/latest/bin/avdmanager create avd -n wmtest -k "system-images;android-33;google_apis;arm64-v8a" -d pixel_5
~/Library/Android/sdk/emulator/emulator -avd wmtest -no-audio -no-boot-anim &
~/Library/Android/sdk/platform-tools/adb wait-for-device
~/Library/Android/sdk/platform-tools/adb install -r <apk路径>
~/Library/Android/sdk/platform-tools/adb shell am start -n com.learning.bigwatermelon/org.cocos2dx.javascript.AppActivity
```
