# 开发进度记录

## 修复：Unicode 分片导致二维码内容异常

### 问题原因
`split.js` 使用二分查找在 UTF-16 码元索引上切割文本。当文本包含 emoji 等 BMP 外字符（由代理对/surrogate pair 表示）时，切割点可能落在代理对中间，导致：
- 字符被拆坏，产生 U+FFFD 替换字符
- 字节计数不准确，后续分片边界偏移
- chunk 之间出现内容重复或遗漏

### 修复方案
1. 使用 `Array.from(text)` 将文本转为 Unicode 码点数组，确保每个元素是一个完整字符
2. 二分查找改为在码点索引上操作
3. 全部使用 `slice` 替代 `substring`
4. App.vue 增加分片调试日志和 `chunks.join('') === source` 校验

### 修改文件
- `src/renderer/utils/split.js` — 重写为码点安全分片
- `src/renderer/App.vue` — 增加调试输出和拼接校验
- `test/run-tests.mjs` — 新增用户指定文本、无重叠无遗漏、Unicode 边界安全测试

### 测试结果
- 33 项测试全部通过，0 失败
- 用户指定文本（export 命令、中文、emoji）：`chunks.join('') === source` ✓
- 无重叠无遗漏：每个 chunk 位置精确验证 ✓
- Unicode 边界安全：全部 9 个 chunk 无损坏字符 ✓
- 大数据量：1MB(1457片) 拼接完全一致 ✓

---

## 纯文本模式重构

### 完成内容
- 二维码内容改为纯文本，扫码直接显示原文
- 移除 JSON 协议包装、gzip 压缩、Base64 编码、checksum、uuid
- 按 UTF-8 字节长度自动分片（每片 ≤1200 字节），确保不超 QR 容量
- 纠错等级改为 M
- 支持二维码尺寸切换：500px / 1000px / 1500px
- UI 移除压缩比例、协议信息、checksum 显示
- UI 保留：文本大小、二维码数量、当前编号
- 新增尺寸选择控件

### 修改文件
- `src/renderer/core/encoder.js` — 纠错等级 M，支持 size 参数
- `src/renderer/utils/split.js` — 纯文本按 UTF-8 字节二分查找分片
- `src/renderer/App.vue` — 移除压缩/协议逻辑，直接纯文本生成
- `src/renderer/components/ControlPanel.vue` — 移除压缩显示，新增尺寸选择
- `src/renderer/components/QrcodeViewer.vue` — 移除 chunk ID 显示
- `test/run-tests.mjs` — 全部重写为纯文本模式测试

### 测试结果
- 22 项测试全部通过
- 纯文本分片/合并：短文本、5000字符 ✓
- 中文分片：无乱码 ✓
- Emoji 分片：完整一致 ✓
- 混合内容（换行/URL/特殊字符）：完全一致 ✓
- 二维码内容验证：编码数据与原文完全一致，无 JSON 协议头 ✓
- 尺寸测试：500px / 1000px / 1500px ✓
- 特殊字符/换行符 ✓
- 大数据量：1000字符(2片)、50KB(72片)、500KB(712片)、1MB(1457片) ✓

---

## 历史版本

### 阶段一：项目初始化与基础功能
- Electron + Vue3 + Vite 项目搭建
- 文本输入、剪贴板读取、二维码生成
- 27 项测试通过

### Bug 修复
1. Electron 二进制下载超时 → 使用中国镜像
2. Node.js crypto 不可用 → globalThis.crypto + Math.random 回退
3. `"type": "module"` 导致 Electron 主进程 require 报错 → 重命名为 .cjs
4. `splitResult.length` 应为 `splitResult.chunks.length` → 二维码无法生成
5. Unicode 分片拆坏 emoji → `Array.from()` 码点安全分片 + `slice`

### 打包结果
| 平台 | 文件 | 大小 |
|------|------|------|
| macOS (arm64) | LargeQRCodeTransfer-1.0.0-arm64.dmg | 95 MB |
| Linux (x64) | LargeQRCodeTransfer-1.0.0.AppImage | 104 MB |
| Linux (x64) | large-qrcode-transfer_1.0.0_amd64.snap | 88 MB |
| Windows (x64) | large-qrcode-transfer.exe | 71 MB |
