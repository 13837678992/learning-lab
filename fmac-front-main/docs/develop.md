# 开发指南


---


# 一、环境要求


- Node.js 18
- npm


---


# 二、快速开始


## 主应用


```bash
cd main-layout
npm install
npm run serve
```


访问：http://localhost:9000


## 子应用


```bash
cd app-demo
npm install
npm run serve
```


访问：http://localhost:9001


---


# 三、开发流程


1. 启动主应用（端口 9000）
2. 启动子应用（端口 9001）
3. 在主应用中访问 /app-demo 路径加载子应用


---


# 四、构建


## 主应用


```bash
cd main-layout
npm run build
```


产物：main-layout/dist


## 子应用


```bash
cd app-demo
npm run build
```


产物：app-demo/dist


---


# 五、环境配置


每个应用包含三个环境文件：
- .env.dev
- .env.test
- .env.prod


构建时自动选择对应环境配置。


---


# 六、应用隔离


主应用和子应用完全独立：
- 各自拥有 package.json
- 各自拥有 webpack 配置
- 各自拥有独立的依赖
- 禁止相互引用源码


应用之间通过以下方式通信：
- qiankun 全局状态
- HTTP 接口
- 浏览器事件


---


# 七、代码规范


- 所有 Node 配置使用 CommonJS（module.exports）
- 禁止使用 ES Module（export default）
- 禁止升级 Vue3、Webpack5、TypeScript
