# learning-lab
由 `weicheng` 维护的学习与实践项目集合。

## 目录
- [简介](#简介)
- [项目列表](#项目列表)
  - [前端工程](#前端工程)
  - [后端 & 微服务](#后端-微服务)
  - [全栈项目](#全栈项目)
  - [桌面应用 & 工具](#桌面应用-工具)
  - [AI & 数据](#ai-数据)
  - [其他](#其他)
- [使用说明](#使用说明)
- [贡献说明](#贡献说明)
- [许可证](#许可证)

## 简介
本仓库记录作者在前端、后端、桌面应用、AI 等多个方向上的学习与实践，涵盖 Java、TypeScript、Vue、React、Python、Go、Rust 等多种语言。子项目既包括独立的小练习，也包括完整的全栈应用和工具类项目。

## 项目列表

### 前端工程

| 子项目 | 说明 |
|---|---|
| `fmac-front` | 企业级微前端平台。Vue 2 + qiankun + pnpm workspace，含框架核心、路由、状态管理、请求、权限等公共能力层，目标支持未来向 Vue 3 / React / Vite 平滑演进。 |
| `fmac-front-main` | fmac-front 微前端平台的主应用基座与演示子应用，提供主布局和集成示例。 |
| `front-vue-study` | 基于 vue-pure-admin 精简版的 Vue 前端框架学习项目。 |
| `vueandreactcomponent` | Vue 与 React 组件化开发对比研究。 |
| `component-lab` | 跨框架组件实验项目，当前包含 Vue 2.7 + Vite 子项目，用于实践和对比不同框架的组件设计模式。 |
| `react-admin-antd-node` | 基于 React + Ant Design + Node（Koa + MySQL）的前后端分离管理后台，使用 IPv6 作为个人服务器。 |
| `router-title-jump` | VS Code 插件：通过中文标题、拼音、首字母、路径等多维度搜索，快速跳转到 Vue2/Vue3 路由对应的页面文件。基于 AST 解析，支持 3000+ 条路由 <2ms 搜索。 |

### 后端 & 微服务

| 子项目 | 说明 |
|---|---|
| `java` | Java 练习集合，包含 MinIO 对象存储、MyBatis-Plus、Knife4j 接口文档、Redis 缓存、租赁系统等多个子模块。 |
| `mybatis-study` | MyBatis 框架学习。 |
| `reactor-programming` | Java 响应式编程（Reactor）学习，含 Stream 与 Reactor 实践。 |
| `nginxManagement` | Nginx 可视化管理系统。前端 Vue 3 + Element Plus，后端 Go + Gin，支持代理配置管理、配置在线编辑/测试/重载、命令执行等功能。 |

### 全栈项目

| 子项目 | 说明 |
|---|---|
| `large-qrcode-transfer` | 大容量二维码文本传输工具（Electron + Vue 3）。将任意长度文本自动分片为多个二维码，扫码即可还原原文，支持自动播放、键盘快捷键、剪贴板读取、跨平台打包。 |

### 桌面应用 & 工具

| 子项目 | 说明 |
|---|---|
| `my-electron-app` | Electron 桌面应用入门学习。 |
| `rust_lib` | Rust 库项目，包含 WebAssembly 缩略图生成模块（wasm-bindgen + image）。 |
| `playwright_demo` | Playwright 端到端自动化测试练习。 |

### AI & 数据

| 子项目 | 说明 |
|---|---|
| `agents_study` | AI Agent 学习，Python 编写的工具调用示例（天气查询、景点搜索等）。 |
| `awesome-ai-learning` | AI 学习资源汇总。 |
| `python-study` | Python 基础练习。 |

### 其他

| 子项目 | 说明 |
|---|---|
| `deepjavascript` | 深入 JavaScript 的学习笔记。 |

## 使用说明
1. 克隆仓库：
   ```bash
   git clone https://github.com/13837678992/learning-lab.git 
   ```
2. 进入你感兴趣的子项目目录，例如：
   ```bash 
   cd learning-lab/front-vue-study 
   ```

3. 根据子项目的 README 或说明，安装依赖并运行。例如常见流程：
   ```bash
   npm install
   npm run dev
   ```

4. 若子项目为 Java 或 Python 类型，则按照各自说明（例如 `mvn clean install`、`python main.py`）进行。
5. 建议经常更新：
   ```bash
   git pull origin master
   ```

> 提示：每个子项目可能有不同的技术栈、目录结构及运行方式。请先查看该子项目目录下是否有 README 或说明文件。

## 贡献说明

欢迎你为该仓库提交 issues 或 pull requests：

+ 如果你发现某个子项目有错误、可以改进或需要完善，欢迎提交修复或增强。
+ 若你有新的学习项目或练习，也可按现有目录结构新增子目录并提交。
+ 提交 PR 前，请确保代码格式简洁、可读，并在 README 中附上使用说明。

## 许可证

本仓库采用 MIT License 开源协议。
你可以自由使用、修改、分发，只需保留原始许可声明即可。

感谢你关注并使用本项目！如果你有任何问题或建议，欢迎在 Issues 中提出。
