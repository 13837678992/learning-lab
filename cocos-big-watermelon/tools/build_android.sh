#!/bin/bash
# Android APK 构建脚本（Cocos Creator 2.4.13 + Gradle 8.0.2/AGP 8.0.2 + JDK17 + NDK r21e）
# 用法: tools/build_android.sh [debug|release|all]   默认 all
set -e
MODE="${1:-all}"
export JAVA_HOME=$HOME/tools/zulu17.68.203-ca-jdk17.0.20.1-macosx_aarch64/Contents/Home
export PATH=$HOME/tools/bin:$JAVA_HOME/bin:$PATH
export NDK_ROOT=$HOME/tools/android-ndk-r21e
export ANDROID_SDK_ROOT=$HOME/Library/Android/sdk
export ANDROID_NDK_ROOT=$NDK_ROOT

PROJ="$(cd "$(dirname "$0")/.." && pwd)"
P=$PROJ/build/jsb-link/frameworks/runtime-src/proj.android-studio

echo "== [1/4] Creator android build =="
$HOME/tools/creator/CocosCreator.app/Contents/MacOS/CocosCreator --path "$PROJ" --build "platform=android;debug=true" > /tmp/apk_build_creator.log 2>&1
grep -E "successfully" /tmp/apk_build_creator.log | tail -1

echo "== [2/4] patch gradle.properties + version =="
python3 - "$PROJ" <<'PY'
import json, re, sys
proj = sys.argv[1]
p = proj + '/build/jsb-link/frameworks/runtime-src/proj.android-studio'
ver = json.load(open(proj + '/version.json'))
lines = open(p + '/gradle.properties').read().splitlines()
vals = {
    'PROP_COMPILE_SDK_VERSION': '33',
    'PROP_TARGET_SDK_VERSION': '33',
    'PROP_MIN_SDK_VERSION': '21',
    'PROP_BUILD_TOOLS_VERSION': '33.0.2',
    'PROP_APP_ABI': 'armeabi-v7a:arm64-v8a',
    'RELEASE_STORE_FILE': '/Users/weicheng/tools/keystore/watermelon.jks',
    'RELEASE_STORE_PASSWORD': 'watermelon123',
    'RELEASE_KEY_ALIAS': 'watermelon',
    'RELEASE_KEY_PASSWORD': 'watermelon123',
}
out = []
for ln in lines:
    m = re.match(r'^([A-Z_]+)=(.*)$', ln)
    out.append(f'{m.group(1)}={vals[m.group(1)]}' if m and m.group(1) in vals else ln)
open(p + '/gradle.properties', 'w').write('\n'.join(out) + '\n')

bg = open(p + '/app/build.gradle').read()
bg = re.sub(r'versionCode \d+', 'versionCode %d' % ver['versionCode'], bg)
bg = re.sub(r'versionName "[^"]*"', 'versionName "%s"' % ver['versionName'], bg)
open(p + '/app/build.gradle', 'w').write(bg)
print('version ->', ver)
PY

echo "== [3/4] force asset recopy =="
rm -rf $P/app/build/intermediates/assets $P/app/build/intermediates/compressed_assets
rm -rf $P/instantapp/build/intermediates/assets $P/instantapp/build/intermediates/compressed_assets

echo "== [4/4] gradle =="
cd "$P"
if [ "$MODE" = "debug" ]; then
    ./gradlew assembleDebug --no-daemon
elif [ "$MODE" = "release" ]; then
    ./gradlew :合成大西瓜:assembleRelease --no-daemon
else
    ./gradlew assembleDebug :合成大西瓜:assembleRelease --no-daemon
fi
echo "== outputs =="
find $P/app/build/outputs -name "*.apk" -exec ls -la {} \;
