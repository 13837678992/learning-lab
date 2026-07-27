# 测试报告


---


# 一、主应用测试


## 独立启动


验证：npm run serve（webpack-dev-server 端口 9000）
结果：构建成功，服务正常启动。


## 构建


验证：npm run build
结果：Webpack 4.47.0 编译成功，生成 dist 目录。


## 登录流程


验证：
- 访问 /login 页面正常渲染。
- 输入用户名密码后调用 /api/user/login mock 接口。
- 登录成功后获取用户信息和菜单。
- token 存入 localStorage。
- 跳转至首页。


结果：流程完整，mock 数据正常返回。


## 菜单加载


验证：
- 登录后请求 /api/menu 接口。
- 菜单数据存入 Vuex store。
- AppSidebar 动态渲染菜单项。


结果：菜单正常加载和渲染。


## session 管理


验证：
- platform/session.js 监听 mousemove/keydown/click 事件。
- 30分钟无操作触发自动退出。
- 退出时清除 token 并跳转登录页。


结果：session 机制正常。


## 超时退出


验证：
- session 超时后自动调用 logout()。
- logout 清除 token、停止 session、通知子应用、跳转登录页。


结果：退出流程完整。


## 子应用加载


验证：
- qiankun registerMicroApps 注册 app-demo。
- activeRule 为 /app-demo。
- container 为 #subapp-container。


结果：注册配置正确。


---


# 二、子应用测试


## 独立启动


验证：npm run serve（webpack-dev-server 端口 9001）
结果：构建成功，服务正常启动。


## 构建


验证：npm run build
结果：Webpack 4.47.0 编译成功，零警告零错误。


## qiankun 加载


验证：
- public-path.js 动态设置 __webpack_public_path__。
- mount 接收 props 并渲染。
- unmount 清理 DOM 和 Vue 实例。


结果：生命周期实现完整。


## 生命周期


验证：
- bootstrap：打印日志。
- mount：存储 actions，渲染应用。
- unmount：销毁实例。


结果：生命周期正常。


## request 处理


验证：
- 请求拦截注入 Bearer token。
- 响应拦截处理 401 和 418。
- 401/418 时调用 window.microApp.logout()。


结果：请求处理正常。


## 异常处理


验证：
- 网络异常提示。
- 401 通知主应用退出。
- 418 通知主应用强制退出。


结果：异常处理完整。


---


# 三、通信测试


## 状态同步


验证：
- 主应用登录后调用 syncUserState() 和 syncMenuState()。
- 通过 initGlobalState 的 setGlobalState 发送状态。
- 子应用通过 onGlobalStateChange 接收状态变更。


结果：状态同步机制正常。


## 路由跳转


验证：
- 子应用 context.js 的 navigateTo 方法。
- 通过 setGlobalState 发送 { action: 'route', path: '/xxx' }。
- 主应用 bridge.js 监听并处理路由跳转。


结果：路由跳转机制正常。


## 参数传递


验证：
- 主应用发送 token、userInfo、menu、permission。
- 子应用接收并存储到本地。


结果：参数传递正常。


## logout 通知


验证：
- 子应用 context.js 的 requestLogout 方法。
- 通过 setGlobalState 发送 { action: 'logout' }。
- 主应用 bridge.js 监听并执行退出。
- 子应用 request.js 在 401/418 时调用 window.microApp.logout()。


结果：退出通知机制正常。


---


# 四、构建验收


主应用：


- npm install：通过
- npm run build：通过（Webpack 4.47.0）
- npm run serve：通过（端口 9000）


子应用：


- npm install：通过
- npm run build：通过（Webpack 4.47.0，零警告零错误）
- npm run serve：通过（端口 9001）


---


# 五、总结


所有功能验证通过。
主应用和子应用均可独立构建和运行。
qiankun 微前端架构搭建完成。
主子应用通信机制正常工作。
