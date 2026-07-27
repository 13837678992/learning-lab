# Phase 0 项目分析


---


# 一、当前架构


## 当前目录结构


fmac-front-main/
├── CLAUDE.md
├── TASK.md
└── docs/
    └── context-state.md


说明：


当前工作目录仅保留规范文件和状态文件。
main-layout 和 app-demo 目录均不存在。
项目处于空白状态，需要从零开始构建。


---


## 技术栈


目标技术栈（TASK.md 定义）：


- Vue2
- Webpack4
- qiankun
- axios
- JavaScript（ES6+）
- Node.js 18
- CommonJS 配置体系


---


## 构建方式


目标：


每个应用独立构建。
使用 webpack4 + vue-cli 风格配置。
babel 转译 ES6+ 和 Vue SFC。
环境变量通过 .env.dev / .env.test / .env.prod 管理。


---


# 二、存在问题


## 架构问题


1. 项目目录为空，main-layout 和 app-demo 均不存在。
2. 无任何应用代码、配置文件、构建脚本。
3. 需要从零搭建完整的微前端架构体系。


## 依赖问题


1. 无 package.json，无依赖声明。
2. 需要确定 Vue2、Webpack4、qiankun 等核心依赖版本。
3. 需要确保所有依赖兼容 Node 18 和 Webpack4。


## 构建问题


1. 无 webpack.config.js。
2. 无 babel.config.js。
3. 无 public/index.html 入口模板。
4. 无环境配置文件。


## 微前端问题


1. 无 qiankun 注册代码。
2. 无子应用生命周期管理。
3. 无主子应用通信机制。
4. 无全局状态管理。


---


# 三、风险分析


## 技术风险


1. Node 18 与部分旧版依赖可能存在兼容问题。
   缓解：选择经过验证的稳定版本。


2. Webpack4 生态已停止维护。
   缓解：使用已验证的稳定插件版本，不追求最新。


## 迁移风险


1. 从零构建，无历史代码可参考。
   缓解：严格按照 TASK.md 规范逐步建设。


## 兼容风险


1. Vue2 与 Webpack4 的 vue-loader 版本需匹配。
2. qiankun 版本需兼容 Vue2 和 Webpack4。
3. babel 配置需同时支持 Vue SFC 和 JSX。


---


# 四、改造建议


## 执行方案


按照 TASK.md 定义的 Phase 顺序逐步建设：


1. Phase 1：创建 main-layout 基础工程（Vue2 + Webpack4 + Router + Axios + qiankun 基础）。
2. Phase 2：完善 main-layout 基座能力（登录、菜单、权限、session、axios 增强）。
3. Phase 3：创建 app-demo 子应用（独立运行 + qiankun 接入）。
4. Phase 4：建立主子应用通信机制。
5. Phase 5：部署能力建设（环境配置、Nginx）。
6. Phase 6：测试验收。


## 核心依赖版本规划


- vue: ^2.7.x
- vue-router: ^3.x
- vuex: ^3.x
- axios: ^1.x
- qiankun: ^2.x
- webpack: ^4.x
- webpack-cli: ^4.x
- webpack-dev-server: ^3.x
- vue-loader: ^15.x
- babel-loader: ^8.x
- @babel/core: ^7.x
- @babel/preset-env: ^7.x


---


# 五、总结


当前项目处于空白状态。
所有应用代码和配置均需从零构建。
严格按照 TASK.md 阶段定义逐步推进。
优先保证稳定性和兼容性。
