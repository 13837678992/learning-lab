Layout 能力增强任务

当前微前端脚手架基础能力已经完成。

本任务用于在已有 main-layout 基础上增强企业级后台 Layout 能力。

禁止重新初始化项目。

禁止破坏已有 qiankun、登录、菜单、权限、通信能力。

一、项目名称

fmac-front-main

二、任务背景

当前项目已经完成：

main-layout 主应用建设
app-demo 子应用建设
qiankun 微前端接入
登录认证能力
菜单权限能力
主子应用通信
独立运行能力
独立部署基础能力

当前缺少企业后台系统常见 Layout 能力：

标签页管理
标签状态同步
页面缓存管理

本任务目标：

在不影响已有架构的基础上，增强 main-layout 企业级后台能力。

三、执行规则

执行前必须读取：

CLAUDE.md

TASK_LAYOUT_ENHANCEMENT.md

docs/context-state.md

docs/phase-log.md

必须基于当前代码继续开发。

禁止：

重新初始化项目
重建微前端架构
修改 qiankun 技术方案
升级 Vue3
升级 Webpack5
引入 TypeScript
删除已有功能
四、执行模式

Claude Code 自动执行：

分析现有代码

↓

制定实现方案

↓

修改代码

↓

执行测试

↓

修复问题

↓

更新文档

↓

完成任务

除明确业务无法判断情况外：

禁止等待人工确认。

五、目标架构

增强后的 main-layout：

main-layout

负责：

微前端能力
qiankun基座
子应用注册
子应用加载
子应用卸载
生命周期管理
用户体系
登录
token管理
session管理
超时退出
权限体系
菜单管理
权限控制
动态路由
Layout体系
页面布局
标签页管理
页面状态同步
页面缓存
网络体系
axios封装
请求拦截
响应处理
全局异常处理
Phase 1 当前架构分析

目标：

分析当前 main-layout 实现。

重点检查：

src/layout
src/router
src/store
src/views
src/components
qiankun入口
主子应用通信
页面渲染方式

分析内容：

当前Layout结构

包括：

页面布局方式
Header实现
Sidebar实现
Content区域实现
当前路由结构

检查：

router配置
route meta
动态路由
子应用路由
当前状态管理

检查：

Vuex结构
全局状态
页面状态
当前缺失能力

分析：

Tab管理缺失点
缓存缺失点
状态同步问题

输出：

docs/layout-enhancement-analysis.md

文档包含：

当前实现分析
存在问题
改造方案
技术风险

完成后：

更新：

docs/context-state.md

docs/phase-log.md

Phase 2 标签页管理能力

目标：

实现企业后台系统 Tab 标签管理。

标签数据模型

设计统一标签数据结构。

包含：

标签唯一ID
标签名称
路由地址
页面参数
查询参数
是否允许关闭

示例：

{
id:"",
title:"",
path:"",
name:"",
params:{},
query:{},
closable:true
}

标签创建

根据路由变化自动创建标签。

规则：

进入新页面：

创建新的 Tab。

进入已有页面：

激活已有 Tab。

标签切换

支持：

点击标签切换页面
路由同步
当前激活状态维护

流程：

点击Tab

↓

更新activeTab

↓

router.push

标签关闭

支持：

关闭当前标签
关闭其他标签
关闭全部标签
关闭左侧标签
关闭右侧标签

关闭后：

自动跳转到有效页面。

标签刷新

支持：

刷新当前标签页面。

要求：

保持：

当前路由
当前参数
当前标签状态
Phase 3 标签状态同步

目标：

建立：

路由

↓

标签

↓

页面

三者同步机制。

路由同步标签

监听：

vue-router

根据：

route.path
route.name
route.meta

维护标签列表。

标签同步路由

点击标签：

必须执行：

router.push()

保证：

浏览器地址

当前标签

页面内容

保持一致。

主子应用标签通信

基于已有 qiankun 通信机制扩展。

支持子应用通知主应用：

打开页面

事件：

TAB_OPEN

数据：

{
type:"TAB_OPEN",
title:"",
path:"",
params:{}
}

关闭页面

事件：

TAB_CLOSE

数据：

{
type:"TAB_CLOSE",
path:""
}

刷新页面

事件：

TAB_REFRESH

数据：

{
type:"TAB_REFRESH",
path:""
}

Phase 4 页面缓存能力

目标：

实现后台系统页面缓存。

技术方案：

Vue2 keep-alive。

路由缓存配置

支持：

route.meta.keepAlive

示例：

{
meta:{
keepAlive:true
}
}

缓存管理

维护：

cachedViews

visitedViews

实现：

添加缓存
删除缓存
清理缓存
页面刷新
页面刷新机制

刷新当前页面：

删除缓存

↓

重新创建组件

↓

恢复页面

微前端页面缓存

针对 qiankun 子应用。

实现：

子应用切换保持状态
子应用重新加载控制
子应用缓存清理

缓存维度：

appName
route
Phase 5 文档输出

新增：

docs/layout-tab.md

内容包括：

标签设计
数据结构
创建规则
生命周期
状态同步
路由同步
Tab同步
主子应用同步
缓存设计
keep-alive方案
缓存策略
清理机制
Phase 6 测试验收
标签测试

验证：

打开页面生成标签
页面切换正常
标签关闭正常
标签刷新正常
缓存测试

验证：

keepAlive生效
页面状态保持
缓存清理有效
微前端测试

验证：

子应用打开页面
子应用关闭页面
子应用刷新页面
主子状态同步
七、完成标准

最终 main-layout 必须具备：

Layout能力

支持：

页面布局
标签页管理
标签状态同步
页面缓存
微前端能力

保持：

qiankun
独立部署
主子通信
文档要求

新增：

docs/layout-enhancement-analysis.md

docs/layout-tab.md

更新：

docs/context-state.md

docs/phase-log.md

八、执行完成要求

任务完成后必须输出：

修改文件列表
功能实现说明
测试结果
存在问题
后续优化建议
九、最终执行流程

严格执行：

读取状态

↓

分析当前代码

↓

设计方案

↓

实现功能

↓

测试验证

↓

修复问题

↓

更新文档

↓

任务完成

---

# Phase 7 标签高级能力增强


目标：

完善企业级后台 Tab 管理能力。


实现：

- 标签通信测试
- 标签拖拽排序
- 标签持久化
- 标签刷新恢复
- 登录后页面恢复
- 深链接访问恢复



---

# 一、子应用标签通信端到端测试


目标：

验证主应用和子应用完整标签流程。


测试场景：


## 子应用打开新页面


流程：


子应用页面操作

↓

发送 TAB_OPEN

↓

主应用创建标签

↓

路由跳转

↓

页面展示



验证：

- 标签生成
- 标题正确
- 路由正确
- 参数保留



---


## 子应用关闭页面


流程：


子应用发送 TAB_CLOSE

↓

主应用删除标签

↓

切换剩余页面



验证：

- 标签删除
- 页面跳转正常



---


## 子应用刷新页面


流程：

子应用发送 TAB_REFRESH


验证：

- 当前页面刷新
- 标签保持



输出：

增加：

docs/layout-tab-test.md



---

# 二、标签拖拽排序


目标：

支持用户调整 Tab 顺序。


要求：


支持：


- 鼠标拖动标签
- 调整标签位置
- 保持当前激活状态


排序后：


更新：

visitedViews


activeView


---

# 三、标签持久化


目标：

浏览器刷新后恢复用户当前工作状态。


使用：

localStorage


保存：


## 标签列表


数据：


visitedViews



包含：


- path
- name
- title
- params
- query
- keepAlive状态



---


## 当前激活标签


保存：


activeView



---


# 四、页面刷新恢复


目标：

刷新浏览器后保持当前页面。


场景：


用户打开：


/finance/list


存在标签：


财务列表



执行：

F5刷新



结果：


重新加载页面后：

1. 恢复标签列表

2. 恢复当前激活标签

3. 自动进入原页面



---


# 五、未登录深链接恢复


目标：

支持后台系统常见访问方式。


场景：


用户直接访问：


/finance/detail?id=100


当前：

未登录



流程：


访问页面

↓

保存目标地址

↓

跳转登录页

↓

完成登录

↓

恢复原始地址

↓

打开对应标签



---


# 六、登录状态恢复设计


登录前保存：


redirectUrl


内容：


包括：


- path
- query
- params
- hash



示例：


{
 path:"/finance/detail",
 query:{
   id:"100"
 }
}



---


登录成功后：


读取：

redirectUrl



执行：


router.replace()


恢复页面。


同时：


创建对应Tab。



---


# 七、标签恢复规则


系统启动时：


读取：

localStorage


恢复：


visitedViews


activeView



恢复顺序：


1. 初始化Layout

2. 加载用户信息

3. 获取菜单权限

4. 恢复标签

5. 恢复当前路由



---


# 八、标签双击关闭


目标：

提供快捷操作。


规则：


双击普通标签：


关闭当前标签。



以下标签禁止关闭：

- 首页
- 固定页面



---


# 九、异常处理


需要处理：


## 菜单变化


如果缓存标签：

不存在当前权限。


处理：


删除标签。


---


## 路由不存在


恢复标签时：

如果路由不存在。


处理：

跳转首页。



---


# 十、测试验收


## 刷新测试


验证：

- F5刷新保持当前Tab
- 页面参数保持



---


## 深链接测试


验证：


未登录：

直接访问业务页面。


登录后：

自动进入原页面。



---


## 持久化测试


验证：


关闭浏览器。


重新打开。


恢复：

- 标签列表
- 当前页面



---


## 拖拽测试


验证：


- 标签排序
- 状态保持



---


# 十一、文档输出


新增：


docs/layout-tab-advanced.md



内容：


包括：


- 标签持久化设计
- 登录恢复设计
- 深链接处理
- 拖拽方案
- 测试方案


---

完成后更新：


docs/context-state.md

docs/phase-log.md
