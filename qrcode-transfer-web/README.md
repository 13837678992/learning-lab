# qrcode-transfer-web

大容量二维码文本传输工具的轻量单文件网页版。构建产物为一个约 40KB 的 HTML 文件，双击即用，无需安装、完全离线、不上传任何数据。

功能与 Electron 版（`large-qrcode-transfer`）一致：

- 文本输入与统计（字符数 / 字节数）
- 读取剪贴板（受浏览器限制时请直接 Ctrl+V 粘贴）
- 自动分片生成多张二维码（每张 ≤1200 字节，扫码直接显示原文）
- 上一张 / 下一张、键盘 ← / → 方向键切换、自动播放（500ms / 1s / 2s）
- 二维码尺寸切换（500 / 1000 / 1500px）
- 导出当前二维码 PNG

## 使用

直接用 Edge / Chrome 浏览器打开 `大容量二维码文本传输工具.html`（双击即可）。

> 注意：以 `file://` 方式打开时，部分浏览器会限制"读取剪贴板"按钮的权限，
> 此时请直接在文本框内 Ctrl+V 粘贴，效果相同。

## 开发与构建

```bash
npm install
npm run build        # 生成 dist/index.html，并复制为 大容量二维码文本传输工具.html
npm run test:smoke   # 用本机 Chrome 无头模式跑冒烟测试
```

构建依赖 `vite` + `vite-plugin-singlefile`，将 JS/CSS 全部内联进单个 HTML。

## 目录结构

```
├── index.html        # 入口模板
├── src/
│   ├── main.js       # 全部应用逻辑（分片、二维码生成、导航、剪贴板）
│   └── style.css     # 界面样式（内联进产物）
├── test/smoke.mjs    # 冒烟测试（playwright-core + 系统 Chrome）
├── copy-dist.mjs     # 构建后复制产物到项目根目录
└── 大容量二维码文本传输工具.html  # 构建产物（可直接分发）
```
