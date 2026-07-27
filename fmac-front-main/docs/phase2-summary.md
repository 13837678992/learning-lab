# Phase 2 总结


---


# 完成目标


完善 main-layout 微前端基座能力。


---


# 核心能力


1. qiankun 动态注册子应用
2. 登录认证 + token 管理
3. session 超时检测（30分钟无操作自动退出）
4. 菜单管理（登录后动态获取）
5. 路由守卫（权限校验 + 页面标题）
6. axios 增强（401/418/异常统一处理）
7. 平台通信桥梁（bridge）


---


# 技术要点


- session 通过监听 mousemove/keydown/click 重置活跃时间
- 菜单数据同时驱动侧边栏和子应用注册
- bridge 模块封装全局状态通信


---


# 下一步


Phase 3：创建 app-demo 子应用
