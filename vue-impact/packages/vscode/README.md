# Vue Impact

Vue 项目的路由级代码影响分析工具：分析当前文件 / 符号 / 搜索结果影响了哪些 Vue Router 页面，输出建议的回归测试范围。

## 快速开始

1. 打开 Vue 项目（Vue 2 / Vue 3 均可，无需任何配置）
2. 打开任意文件，右键 → `Vue Impact: 分析当前文件影响范围`（快捷键 `Ctrl+Alt+I`）
3. 查看影响路由与影响链，使用 [复制测试范围] 得到回归测试清单

## 功能

- 当前文件 / 当前符号 / 工作区搜索匹配 → 影响路由
- Router 自动发现（new Router / new VueRouter / createRouter / addRoutes / addRoute / 封装函数 / 跨文件 routes）
- Webpack alias 自动识别（vue.config.js / webpack.config.js / jsconfig / tsconfig）
- children / Layout / 动态 import / 变量 component 支持
- TreeView + Webview 结果面板，路由与依赖链点击跳转
- 复制测试范围 / 复制 Markdown / 导出 JSON
- `.node-impact-cache` 缓存，大型项目快速重复分析

## 要求

- VS Code 1.85+
- Node.js 18+（插件运行时由 VS Code 提供）
- Windows 10 / macOS / Linux

完整文档见仓库根目录 README.md（vue-impact 项目）。
