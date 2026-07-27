# 微前端脚手架升级任务

> Claude Code 当前执行任务文件。
> 执行前必须读取：
>
> - CLAUDE.md
> - docs/context-state.md
> - docs/phase-log.md
>
> 必须按照 Phase 顺序执行。
> 禁止跳过阶段。


---

# 一、项目名称


fmac-front-main


---

# 二、项目目标


建设企业级 qiankun 微前端脚手架。


采用：

独立应用模式。


目标：

实现：

- 主应用独立开发
- 子应用独立开发
- 主应用独立运行
- 子应用独立运行
- 主应用独立部署
- 子应用独立部署


---

# 三、固定技术栈


必须使用：


- Vue2
- Webpack4
- qiankun
- axios
- JavaScript
- Node.js 18.19.0


禁止：

- Vue3
- Webpack5
- TypeScript
- 其他微前端框架


---

# 四、最终目录目标


fmac-front-main



fmac-front-main

├── main-layout
│
├── app-demo
│
├── docs
│
├── CLAUDE.md
│
└── TASK.md



---

# 五、应用职责


# main-layout


主应用。


负责：


## 微前端基座


包含：

- qiankun初始化
- 子应用注册
- 子应用加载
- 子应用卸载
- 生命周期管理


实现：

registerMicroApps

start


生命周期：

bootstrap

mount

unmount



---

## 用户认证


负责：

- 登录
- 单点登录
- token管理
- session管理
- 超时退出
- 登录跳转


---

## 菜单权限


负责：

- 获取菜单
- 动态路由
- 权限控制
- 子应用入口管理


菜单数据包含：



[
{
app_code:"",
app_name:"",
entry:"",
route:"",
permission:[]
}
]



---

## 网络请求


统一axios处理。


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


---

# app-demo


子应用示例。


负责：

- 独立运行
- qiankun接入
- 页面展示
- 请求处理


必须支持：


独立启动：


npm run serve


qiankun加载。


---

# 六、架构原则


## 应用隔离


main-layout 与 app-demo：

必须完全独立。


每个应用拥有：

- package.json
- webpack.config.js
- babel.config.js
- src
- 独立依赖


禁止：

- 相互引用源码
- 相对路径引用
- workspace关联应用


---

# 七、执行阶段


---

# Phase 0 项目分析


目标：

分析当前项目状态。


检查：


- 项目目录
- package.json
- webpack配置
- babel配置
- Vue入口
- qiankun代码
- 路由
- axios
- 环境配置


输出：


docs/current-analysis.md


必须包含：


## 当前架构


说明：

- 当前目录结构
- 技术栈
- 构建方式


## 存在问题


包含：

- 架构问题
- 依赖问题
- 构建问题
- 微前端问题


## 风险分析


包含：

- 技术风险
- 迁移风险
- 兼容风险


## 改造建议


输出：

后续执行方案。


完成后：

更新：

docs/context-state.md

docs/phase-log.md


---

# Phase 1 主应用初始化


目标：

创建：

main-layout


完成：


## 基础工程


包括：

- Vue2初始化
- Webpack4配置
- Babel配置
- 环境配置


要求：

CommonJS配置。


---

## qiankun基础


安装：

qiankun


完成：

- 初始化入口
- 生命周期结构


---

## 路由


实现：

- Vue Router
- 路由入口
- 基础页面


---

## Axios


完成：

基础request封装。


---

验证：


npm install

npm run build

npm run serve


输出：


docs/layout-init.md


完成后：

更新状态文件。


---

# Phase 2 主应用能力建设


目标：

完善微前端基座。


---

# qiankun能力


实现：


注册：

registerMicroApps


启动：

start


生命周期：

bootstrap

mount

unmount



负责：

- 子应用管理
- 加载状态
- 销毁处理


---

# 登录能力


实现：


token管理。


包括：

- 保存
- 获取
- 清理


session管理。


包括：

- 超时检测
- 自动退出


登录跳转：

支持：

- 登录页
- 首页


---

# 菜单能力


登录成功后：


请求：

/api/menu


根据返回结果：


动态生成：


- 菜单
- 路由
- 子应用配置


---

# 路由能力


实现：

beforeEach

afterEach


负责：

- 权限校验
- 页面状态
- 子应用跳转


---

# Axios增强


增加：


请求：

- token注入
- loading处理


响应：

- 401
- 418
- 异常统一处理


输出：


docs/layout.md

docs/phase2-summary.md


---

# Phase 3 子应用建设


目标：

创建：

app-demo


要求：


支持：


独立运行。


执行：

npm run serve


---

支持qiankun。


实现：


bootstrap

mount

unmount


---

创建：

request.js


负责：


- token处理
- 请求封装
- 异常处理


---

异常规则：


401：

通知未登录。


418：


执行：


window.microApp.logout()


通知主应用退出。


输出：


docs/subapp.md


---

# Phase 4 主子应用通信


目标：

建立通信机制。


---

# 主应用发送


使用：

initGlobalState


发送：


- token
- userInfo
- menu
- permission


---

# 子应用发送


发送：


- route
- refresh
- logout


---

实现：


- 页面跳转
- 参数传递
- 状态同步
- 用户退出


输出：


docs/communication.md


---

# Phase 5 部署能力建设


目标：

实现独立部署。


每个应用：


独立构建。

独立发布。


---

增加环境：


.env.dev

.env.test

.env.prod


---

完善：

docs/deploy.md


包含：


- 构建流程
- Nginx配置
- 静态资源配置
- 环境变量
- 主应用部署
- 子应用部署
- 子应用注册地址


---

# Phase 6 测试验收


## 主应用测试


验证：


- 独立启动
- 登录流程
- 菜单加载
- session管理
- 超时退出
- 子应用加载


---

## 子应用测试


验证：


- 独立启动
- qiankun加载
- 生命周期
- request处理
- 异常处理


---

## 通信测试


验证：


- 状态同步
- 页面跳转
- 参数传递
- logout通知


---

输出：


docs/test-report.md


---

# 八、最终验收标准


必须满足：


## 主应用


执行：


npm run serve


正常启动。


---

## 子应用


执行：


npm run serve


正常启动。


---

## 微前端能力


支持：


- qiankun
- 独立部署
- 登录认证
- 菜单管理
- 权限控制
- session管理
- axios统一处理
- 超时退出
- 418退出
- 主子应用通信
- 路由跳转


---

# 九、最终文档要求


项目完成后：

docs目录必须包含：



architecture.md

develop.md

deploy.md

api.md

phase-log.md

context-state.md

current-analysis.md

layout-init.md

layout.md

subapp.md

communication.md

test-report.md



---

# 十、执行要求


Claude Code 必须：

自动执行。

自动分析。

自动修改。

自动测试。

自动修复。


除明确暂停条件：

禁止停止。


最终执行流程：


分析

↓

实现

↓

验证

↓

修复

↓

记录

↓

下一阶段