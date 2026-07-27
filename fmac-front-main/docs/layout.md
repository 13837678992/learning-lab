# Phase 2 主应用能力建设


---


# 一、完成内容


## qiankun 能力


1. registerMicroApps：根据菜单数据动态注册子应用。
2. start：启动 qiankun，开启 experimentalStyleIsolation 样式隔离。
3. 生命周期管理：bootstrap / mount / unmount。


## 登录能力


1. token 管理：保存、获取、清理（localStorage）。
2. session 管理：platform/session.js 实现超时检测（30分钟无操作自动退出）。
3. 登录跳转：登录后获取菜单，跳转至首页或重定向地址。


## 菜单能力


1. 登录成功后请求 /api/menu 获取菜单数据。
2. 菜单数据存入 Vuex store。
3. AppSidebar 动态渲染菜单。
4. micro/apps.js 根据菜单数据动态生成子应用配置。


## 路由能力


1. beforeEach：权限校验，未登录跳转登录页。
2. afterEach：设置页面标题。
3. 已登录用户访问登录页自动跳转首页。


## Axios 增强


1. 请求拦截：自动注入 Bearer token。
2. 响应拦截：
   - 401：清除 token，跳转登录页。
   - 418：清除 token，强制退出。
   - 网络异常 / 服务异常：统一消息提示。


## 平台能力


1. platform/session.js：session 超时检测与自动退出。
2. platform/bridge.js：主子应用通信桥梁。
   - syncUserState：同步用户状态到子应用。
   - syncMenuState：同步菜单状态到子应用。
   - notifyLogout：通知子应用退出。
   - initBridge：初始化全局状态监听（路由跳转、退出通知）。


---


# 二、修改文件


新增：
- src/platform/session.js
- src/platform/bridge.js


修改：
- src/main.js（集成 session 和 bridge）
- src/views/Login.vue（登录后获取菜单、启动 session）
- src/layout/AppSidebar.vue（动态菜单）
- src/micro/apps.js（动态子应用配置）
- src/utils/logout.js（集成 session 停止和 bridge 通知）


---


# 三、测试结果


构建测试：npm run build 通过。


---


# 四、遇到问题


无重大问题。


---


# 五、下一阶段


Phase 3：子应用建设

- 创建 app-demo
- 独立运行
- qiankun 接入
- 生命周期实现
- request 封装
