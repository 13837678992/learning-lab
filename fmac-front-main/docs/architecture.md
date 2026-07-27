# 架构文档


---


# 一、项目概述


fmac-front-main 是企业级 qiankun 微前端脚手架。


采用独立应用模式，实现：
- 主应用独立开发、运行、部署
- 子应用独立开发、运行、部署
- 主子应用通过 qiankun 通信


---


# 二、技术栈


- Vue 2.7.x
- Webpack 4.47.x
- qiankun 2.x
- axios 1.x
- Vue Router 3.x
- Vuex 3.x
- JavaScript（ES6+）
- Node.js 18
- CommonJS 配置体系


---


# 三、目录结构


```
fmac-front-main/
├── main-layout/          # 主应用
│   ├── src/
│   │   ├── api/          # API 接口
│   │   ├── layout/       # 布局组件
│   │   ├── micro/        # qiankun 配置
│   │   ├── platform/     # 平台能力（session、bridge）
│   │   ├── router/       # 路由
│   │   ├── store/        # Vuex 状态管理
│   │   ├── utils/        # 工具函数
│   │   └── views/        # 页面
│   ├── mock/             # Mock 数据
│   └── webpack.config.js
│
├── app-demo/             # 子应用示例
│   ├── src/
│   │   ├── api/
│   │   ├── router/
│   │   ├── utils/
│   │   └── views/
│   ├── mock/
│   └── webpack.config.js
│
├── deploy/
│   └── nginx/            # Nginx 配置
│
├── docs/                 # 文档
├── CLAUDE.md             # 执行规范
└── TASK.md               # 任务定义
```


---


# 四、应用职责


## 主应用（main-layout）


- 微前端基座（qiankun 注册、加载、卸载）
- 用户认证（登录、token、session）
- 菜单权限（动态菜单、路由生成）
- 网络请求（统一 axios 封装）
- 全局状态管理


## 子应用（app-demo）


- 独立运行能力
- qiankun 生命周期（bootstrap/mount/unmount）
- 独立请求封装
- 异常通知主应用


---


# 五、通信机制


主 → 子：
- initGlobalState 发送 token、userInfo、menu、permission


子 → 主：
- setGlobalState 发送 route、refresh、logout


---


# 六、部署架构


支持两种部署模式：
1. 多域名：每个应用独立域名
2. 单域名：共用域名，路径区分


详见 deploy.md。
