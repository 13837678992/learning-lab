# Phase 4 主子应用通信


---


# 一、完成内容


## 主应用发送


通过 initGlobalState 发送以下状态：


- token：用户认证令牌
- userInfo：用户信息（用户名、角色等）
- menu：菜单数据
- permission：权限列表


触发时机：


- 登录成功后：syncUserState() + syncMenuState()
- 状态变更时：通过 store mutations 触发同步


## 子应用发送


通过 setGlobalState 发送以下指令：


- route：页面跳转（{ action: 'route', path: '/xxx' }）
- refresh：请求刷新
- logout：通知主应用退出


## 通信实现


### 主应用侧


1. micro/globalState.js：封装 qiankun initGlobalState。
2. platform/bridge.js：
   - syncUserState：同步用户状态到子应用。
   - syncMenuState：同步菜单状态到子应用。
   - notifyLogout：通知子应用退出。
   - initBridge：监听子应用发来的状态变更。


### 子应用侧


1. context.js：
   - setActions：存储主应用传入的 actions。
   - navigateTo：请求主应用路由跳转。
   - requestRefresh：请求主应用刷新。
   - requestLogout：请求主应用退出。
2. main.js：
   - mount 时调用 setActions 存储 actions。
   - 监听 onGlobalStateChange 接收主应用状态。
   - 暴露 window.microApp.logout 供 request.js 调用。


## 数据流


主 → 子：


登录成功 → syncUserState/syncMenuState → setGlobalState → 子应用 onGlobalStateChange 回调


子 → 主：


子应用操作 → context.js 方法 → setGlobalState → 主应用 onGlobalStateChange 回调 → bridge.js 处理


---


# 二、修改文件


主应用：
- src/views/Login.vue（登录后同步状态）
- src/platform/bridge.js（通信桥梁）

子应用：
- src/main.js（存储 actions，暴露 microApp）
- src/context.js（通信方法）


---


# 三、测试结果


主应用构建：通过。
子应用构建：通过。


---


# 四、遇到问题


无。


---


# 五、下一阶段


Phase 5：部署能力建设

- 环境配置完善
- Nginx 配置
- 独立部署方案
