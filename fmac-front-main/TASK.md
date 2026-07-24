# 微前端脚手架升级任务


# 一、项目名称


fmac-front-main



# 二、项目目标


建设企业级 qiankun 微前端脚手架。


架构模式：

独立应用模式。


技术栈：

Vue2

Webpack4

qiankun

axios

JavaScript


项目目标：

实现主应用和子应用完全独立开发、独立运行、独立部署。



# 三、最终架构目标


项目目录：


fmac-front-main


main-layout

负责：

- 微前端基座
- 登录认证
- 菜单管理
- 权限管理
- 子应用加载
- 全局状态管理


app-demo

负责：

- 子应用示例
- 独立运行
- qiankun接入


docs

负责：

- 架构文档
- 开发文档
- 部署文档
- 阶段记录


CLAUDE.md

项目执行规范


TASK.md

当前升级任务



# 四、架构原则


## 应用隔离原则


主应用和子应用：

必须完全独立。


每个应用拥有自己的：

- package.json
- webpack配置
- src目录
- 依赖管理
- 构建流程
- 部署流程


禁止：

- 共享源码
- 依赖其他应用目录
- 通过相对路径引用其他应用代码
- 建立公共packages
- 使用workspace管理应用


应用之间：

只能通过：

- qiankun通信
- HTTP接口
- 浏览器事件

进行交互。



# 五、独立运行要求


## 主应用


必须支持：


npm install

npm run serve


可以独立启动。


## 子应用


必须支持：


npm install

npm run serve


可以独立启动。



# 六、执行规则


必须严格按照 Phase 顺序执行。


禁止：

- 一次性修改全部代码
- 跳过阶段
- 未测试直接进入下一阶段


每完成一个 Phase：

必须执行：


1. 完成功能开发

2. 执行测试

3. 输出阶段总结文档

4. 更新 docs/context-state.md

5. 更新 docs/phase-log.md



# Phase 0 项目分析


目标：

分析当前项目结构。


检查内容：

- package.json
- webpack配置
- Vue入口文件
- qiankun代码
- 路由配置
- axios封装
- 目录结构
- 环境配置


输出：

docs/current-analysis.md


文档内容：

包含：

- 当前架构分析
- 当前技术栈
- 存在问题
- 风险分析
- 改造建议



# Phase 1 主应用初始化


目标：

建设 main-layout 主应用。


完成：

- Vue2项目结构
- Webpack4配置
- qiankun依赖
- Vue入口
- 路由配置
- axios基础封装


验证：


npm install

npm run build


输出：

docs/layout-init.md



# Phase 2 主应用能力建设


目标：

完善 main-layout 基座能力。



## qiankun能力


实现：

registerMicroApps

start


实现生命周期：


bootstrap

mount

unmount



负责：

- 子应用注册
- 子应用加载
- 子应用卸载



## 登录能力


实现：


- token管理
- session管理
- 单点登录
- 登录跳转
- 登录状态维护



## 菜单能力


登录成功后：


请求接口：

/api/menu


根据返回菜单：

动态加载子应用。



包含：

- app名称
- app地址
- 路由地址
- 权限信息



## Axios能力


统一封装请求。


请求阶段：

处理：

- token注入
- 公共参数


响应阶段：

处理：

- 401
- 418
- 网络异常
- 服务异常



## 路由能力


实现：

beforeEach

afterEach


负责：

- 页面权限
- 路由状态维护
- 子应用跳转



输出：

docs/layout.md

docs/phase2-summary.md



# Phase 3 子应用建设


目标：

创建示例子应用。


应用名称：

app-demo


要求：

支持独立运行。


启动：


npm run serve



同时支持 qiankun 接入。


必须实现：


bootstrap

mount

unmount



# 子应用规范


子应用必须拥有：


request.js


负责：

- token处理
- 请求封装
- 异常处理


响应异常：


401：

处理未登录状态。


418：

执行：

window.microApp.logout()


通知主应用退出登录。



输出：

docs/subapp.md



# Phase 4 主子应用通信


目标：

建立主应用和子应用通信机制。



## 主应用发送数据


使用：

initGlobalState


发送：

- token
- userInfo
- menu
- 权限信息



## 子应用发送数据


发送：

- route
- refresh
- logout


实现：

- 页面跳转
- 参数传递
- 状态同步
- 用户退出



输出：

docs/communication.md



# Phase 5 部署能力建设


目标：

实现独立部署能力。


每个应用：

单独构建。

单独部署。


增加环境配置：


.env.dev

.env.test

.env.prod


完善：

docs/deploy.md


包含：


- nginx部署
- 静态资源配置
- 多环境配置
- 主应用部署
- 子应用部署
- 子应用注册地址配置



# Phase 6 测试验收


## 主应用测试


验证：

- 独立启动
- 登录流程
- 菜单加载
- session管理
- 超时退出
- 子应用加载



## 子应用测试


验证：

- 独立启动
- qiankun加载
- 生命周期
- request请求
- 异常处理



## 通信测试


验证：

- 数据同步
- 页面跳转
- 参数传递
- logout通知



输出：

docs/test-report.md



# 七、最终验收标准


必须满足：


## 主应用


可以执行：

npm run serve


正常运行。


## 子应用


可以执行：

npm run serve


正常运行。


## 微前端能力


支持：

- qiankun
- 独立部署
- 登录
- 菜单
- session
- axios统一处理
- 超时退出
- 418退出
- 主子应用通信
- 路由跳转



# 八、任务完成标准


项目完成后：

必须输出：

docs/


architecture.md

develop.md

deploy.md

api.md

phase-log.md

context-state.md

current-analysis.md

layout.md

subapp.md

communication.md

test-report.md


并确保：

主应用和子应用均可独立运行和部署。