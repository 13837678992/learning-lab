# Phase 1 主应用初始化


---


# 一、完成内容


## 基础工程


1. 创建 main-layout 目录及完整工程结构。
2. package.json：声明 Vue2、Webpack4、qiankun、axios 等依赖。
3. webpack.config.js：完整 Webpack4 配置，支持 Vue SFC、Babel、CSS、静态资源。
4. babel.config.js：@babel/preset-env 配置。
5. 环境配置：.env.dev / .env.test / .env.prod。
6. public/index.html：入口 HTML 模板。


## qiankun 基础


1. main.js 中实现 bootstrap / mount / unmount 生命周期。
2. registerMicroApps 注册子应用。
3. start 启动 qiankun（开启 experimentalStyleIsolation）。
4. initGlobalState 初始化全局状态。


## 路由


1. Vue Router（history 模式）。
2. 路由定义：Login、Home、AppDemo。
3. Layout 布局组件（Header + Sidebar + Content）。
4. 路由守卫：beforeEach（权限校验）、afterEach（页面标题）。


## Axios 封装


1. request.js：基础 axios 实例。
2. 请求拦截：token 注入。
3. 响应拦截：401 跳转登录、418 强制退出、网络异常处理。


## 其他


1. store/index.js：Vuex 状态管理（token、userInfo、menu）。
2. utils/auth.js：token 存取。
3. utils/logout.js：退出登录。
4. utils/message.js：消息提示。
5. api/user.js、api/menu.js：API 接口。
6. mock/index.js：开发环境 mock 数据。


---


# 二、目录结构


main-layout/
├── .env.dev
├── .env.test
├── .env.prod
├── .gitignore
├── babel.config.js
├── mock/
│   └── index.js
├── package.json
├── public/
│   └── index.html
├── src/
│   ├── api/
│   │   ├── menu.js
│   │   └── user.js
│   ├── App.vue
│   ├── layout/
│   │   ├── AppHeader.vue
│   │   ├── AppSidebar.vue
│   │   └── Layout.vue
│   ├── main.js
│   ├── micro/
│   │   ├── apps.js
│   │   └── globalState.js
│   ├── router/
│   │   ├── guards.js
│   │   ├── index.js
│   │   └── routes.js
│   ├── store/
│   │   └── index.js
│   ├── utils/
│   │   ├── auth.js
│   │   ├── logout.js
│   │   ├── message.js
│   │   └── request.js
│   └── views/
│       ├── Home.vue
│       └── Login.vue
└── webpack.config.js


---


# 三、测试结果


## 构建测试


执行：npm run build

结果：通过

Webpack 4.47.0 编译成功，生成 dist 目录。


## 依赖安装


执行：npm install

结果：通过

所有依赖安装成功，无 peer dependency 冲突。


---


# 四、遇到问题


1. style-loader@3.x 和 css-loader@6.x 不兼容 Webpack4（peer dependency 要求 webpack 5）。
   解决：降级为 style-loader@2.x 和 css-loader@5.x。


2. micro/globalState.js 导出名与 qiankun 的 initGlobalState 冲突。
   解决：使用 import alias 重命名 qiankun 的导入。


---


# 五、下一阶段


Phase 2：主应用能力建设

- 完善 session 超时检测
- 登录后动态获取菜单
- 菜单驱动动态路由和子应用配置
- 完善路由控制和 axios 增强
