# LargeQRCodeTransfer

大容量二维码文本传输工具 — 将任意长度的文本自动分片为多个二维码，扫码即可还原原文。

## 功能

- **大容量支持**：突破单个二维码容量限制，自动按字节分片（每片 ≤ 1200 字节）
- **分片校验**：生成后自动校验分片拼接结果与原文一致
- **自动播放**：支持定时自动切换二维码，速度可选 500ms / 1s / 2s
- **键盘快捷键**：`←` 上一张，`→` 下一张
- **剪贴板读取**：一键从剪贴板加载文本
- **多尺寸输出**：二维码尺寸可选 500px / 1000px / 1500px
- **跨平台**：支持 macOS (DMG/ZIP) 和 Windows (portable exe)

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面框架 | Electron 33 |
| 前端框架 | Vue 3 + Vite 6 |
| 二维码生成 | qrcode |
| 压缩 | pako |
| 校验 | crypto-js |

## 开发

```bash
# 安装依赖
npm install

# 启动开发模式（Vite + Electron）
npm run electron:dev

# 仅启动前端开发服务器
npm run dev
```

## 构建

```bash
# macOS (DMG + ZIP)
npm run electron:build

# Windows (portable exe)
npm run electron:build:win
```

构建产物输出到 `dist_electron/` 目录。

## 协议

每个分片包含 JSON 协议帧：

```json
{
  "app": "large-qrcode-transfer",
  "version": "1.0",
  "id": "<uuid>",
  "index": 1,
  "total": 6,
  "checksum": "<sha256>",
  "data": "..."
}
```

接收端解析协议帧后可按 `index` 排序、校验 `checksum`，拼接 `data` 还原原文。

## License

MIT
