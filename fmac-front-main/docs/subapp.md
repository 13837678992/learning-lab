# Phase 3 子应用建设


---


# 一、完成内容


## 基础工程


1. 创建 app-demo 目录及完整工程结构。
2. package.json：Vue2 + Webpack4 + Vue Router + Axios。
3. webpack.config.js：端口 9001，开启 CORS（Access-Control-Allow-Origin: *）。
4. babel.config.js、环境配置、HTML 模板。


## qiankun 接入


1. public-path.js：动态设置 __webpack_public_path__。
2. main.js：实现 bootstrap / mount / unmount 生命周期。
3. 支持独立运行和 qiankun 加载两种模式。


## 路由


1. Vue Router（history 模式）。
2. base 路径根据运行模式自动切换（qiankun: /app-demo，独立: /）。
3. 页面：Home、About。


## 请求封装


1. request.js：独立 axios 实例。
2. 请求拦截：自动注入 token。
3. 响应拦截：
   - 401：通知主应用退出（window.microApp.logout）。
   - 418：通知主应用强制退出。


## 通信


1. context.js：接收和发送全局状态。
2. 支持：navigateTo（路由跳转）、requestRefresh（刷新）、requestLogout（退出）。


## Mock


1. mock/index.js：/api/demo/data 接口。


---


# 二、目录结构


app-demo/
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
│   │   └── index.js
│   ├── App.vue
│   ├── context.js
│   ├── main.js
│   ├── public-path.js
│   ├── router/
│   │   └── index.js
│   ├── utils/
│   │   └── request.js
│   └── views/
│       ├── About.vue
│       └── Home.vue
└── webpack.config.js


---


# 三、测试结果


构建测试：npm run build 通过（零警告零错误）。
依赖安装：npm install 通过。


---


# 四、遇到问题


无。


---


# 五、下一阶段


Phase 4：主子应用通信

- 完善 initGlobalState 通信
- 主应用发送 token/userInfo/menu/permission
- 子应用发送 route/refresh/logout
