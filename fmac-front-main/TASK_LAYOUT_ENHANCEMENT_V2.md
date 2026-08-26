一、项目名称

fmac-front-main

二、任务背景

当前项目已经完成：

main-layout 主应用
app-demo 子应用
qiankun 微前端接入
登录认证
菜单权限
路由管理
主子应用通信
独立运行
独立部署

当前缺少企业后台核心 Layout 能力。

需要新增：

Layout 标签页管理
标签状态同步
页面缓存
标签持久化
刷新恢复
登录后页面恢复
深链接恢复
标签拖拽排序
标签快捷操作
子应用标签端到端通信测试
三、执行规则

执行前必须读取：

CLAUDE.md

TASK_LAYOUT_ENHANCEMENT_V2.md

docs/context-state.md

docs/phase-log.md

必须基于当前代码继续增强。

禁止：

重新创建项目
修改项目技术栈
修改 qiankun 方案
升级 Vue3
升级 Webpack5
引入 TypeScript
删除已有功能
四、执行模式

Claude Code 自动执行：

分析当前代码

↓

设计实现方案

↓

修改代码

↓

执行测试

↓

修复问题

↓

更新文档

除非遇到无法判断的业务规则：

禁止暂停等待确认。

五、目标架构

增强后的 main-layout：

main-layout

负责：

微前端基座

包括：

qiankun注册
子应用加载
子应用卸载
生命周期管理
用户体系

包括：

登录
token
session
超时退出
登录恢复
权限体系

包括：

菜单
动态路由
页面权限
Layout体系

包括：

页面布局
Tab标签管理
Tab状态同步
页面缓存
页面恢复
状态体系

统一维护：

当前路由
当前标签
页面缓存
用户状态
子应用状态
Phase 1 当前架构分析

目标：

分析现有 Layout 实现。

检查：

src/layout
src/router
src/store
src/components
src/views
qiankun入口
子应用通信

分析：

Layout结构

确认：

Header
Sidebar
Content
页面渲染方式
路由结构

检查：

router配置
route meta
动态路由
子应用路由
状态管理

确认：

Vuex结构
全局状态
页面状态

输出：

docs/layout-enhancement-analysis.md

内容：

当前架构
缺失能力
实现方案
风险分析

完成后更新：

docs/context-state.md

docs/phase-log.md

Phase 2 Tab标签基础能力

目标：

实现企业后台标签管理。

Tab数据模型

设计统一结构。

包含：

id
title
path
name
params
query
closable

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

Tab创建

根据路由自动生成。

规则：

新页面：

创建Tab。

已有页面：

激活Tab。

Tab切换

支持：

点击Tab
路由同步
状态同步
Tab关闭

支持：

当前关闭
关闭其他
关闭全部
左侧关闭
右侧关闭
Tab刷新

支持：

刷新当前页面。

要求：

保持：

路由
参数
Tab状态
Phase 3 Tab状态同步

目标：

建立：

路由

↓

Tab

↓

页面

同步机制。

路由同步Tab

监听：

vue-router

根据：

path
name
meta

维护Tab。

Tab同步路由

点击Tab：

执行：

router.push()

保证：

URL

Tab

页面

一致。

Phase 4 页面缓存能力

目标：

实现后台页面缓存。

技术：

Vue2 keep-alive。

缓存配置

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

支持：

添加缓存
删除缓存
清理缓存
页面刷新
Phase 5 Tab持久化与恢复

目标：

实现浏览器刷新后恢复工作状态。

LocalStorage持久化

保存：

Tab列表

visitedViews

包含：

path
title
params
query
keepAlive
当前Tab

activeView

浏览器刷新恢复

场景：

用户打开：

/finance/list

存在Tab。

执行：

F5刷新。

结果：

恢复：

Tab列表
当前Tab
页面路由
Phase 6 登录恢复与深链接恢复

目标：

解决后台系统常见访问场景。

未登录访问业务地址

场景：

用户直接访问：

/finance/detail?id=100

当前未登录。

流程：

访问页面

↓

保存目标地址

↓

跳转登录

↓

登录成功

↓

恢复原地址

↓

创建对应Tab

登录前保存信息

保存：

redirectUrl

包含：

path
query
params
hash

示例：

{
path:"/finance/detail",
query:{
id:"100"
}
}

登录成功恢复

执行：

router.replace()

恢复：

页面
Tab
参数
Phase 7 子应用Tab通信

目标：

完善主子应用Tab能力。

基于已有 qiankun 通信。

子应用打开页面

事件：

TAB_OPEN

数据：

{
type:"TAB_OPEN",
title:"",
path:"",
params:{}
}

子应用关闭页面

事件：

TAB_CLOSE

数据：

{
type:"TAB_CLOSE",
path:""
}

子应用刷新页面

事件：

TAB_REFRESH

数据：

{
type:"TAB_REFRESH",
path:""
}

Phase 8 Tab高级交互
标签拖拽排序

实现：

支持：

鼠标拖拽
顺序调整
状态保存

同步：

visitedViews

双击关闭

支持：

双击普通Tab关闭。

禁止关闭：

首页
固定页面
Phase 9 端到端测试

新增：

docs/layout-tab-test.md

测试：

Tab打开

验证：

子应用打开页面

↓

主应用生成Tab

Tab关闭

验证：

子应用通知

↓

主应用关闭Tab

Tab刷新

验证：

刷新页面

↓

Tab保持

页面恢复

验证：

浏览器刷新：

恢复当前页面。

登录恢复

验证：

未登录访问：

业务地址。

登录后：

回到原页面。

Phase 10 文档输出

新增：

docs/layout-tab.md

docs/layout-tab-advanced.md

docs/layout-tab-test.md

更新：

docs/context-state.md

docs/phase-log.md

十一、最终验收标准

main-layout必须具备：

Layout能力

支持：

页面布局
Tab管理
Tab同步
页面缓存
页面恢复
Tab能力

支持：

创建
切换
删除
刷新
拖拽
双击关闭
持久化
登录能力

支持：

未登录深链接访问
保存目标地址
登录后恢复页面
恢复Tab状态
微前端能力

保持：

qiankun
独立部署
主子通信
十二、执行完成要求

完成后必须输出：

修改文件列表
实现功能说明
技术方案说明
测试结果
遗留问题
后续优化建议
十三、执行流程

严格执行：

读取状态

↓

分析现有代码

↓

实现功能

↓

测试验证

↓

修复问题

↓

更新文档

↓

完成任务