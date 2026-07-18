# FMAC Front 微前端开发规范（Claude Code 必须遵守）

## 一、项目目标

当前项目名称：fmac-front

目标：

搭建一套长期维护、可扩展、可升级的企业级微前端平台。

当前：

- 主应用：Vue2
- 微前端：qiankun
- 包管理：pnpm workspace
- JavaScript（不使用 TypeScript）

未来支持：

- Vue3
- React
- Vite
- Element Plus
- Wujie
- Module Federation

要求：

升级底层技术时，业务代码尽量无需修改。

---

## 二、设计原则

遵循：

SOLID

KISS

DRY

单一职责

依赖倒置

组合优于继承

禁止过度设计。

---

## 三、目录结构

apps/

packages/

configs/

docs/

pnpm-workspace.yaml

禁止新增顶级目录。

---

## 四、packages

所有公共能力必须放在 packages。

apps 仅允许编写业务。

禁止业务代码进入 packages。

---

## 五、packages 划分

core

router

store

auth

request

event

tab

loading

message

cache

shared

ui-adapter

禁止新增职责重复的 package。

---

## 六、依赖关系

依赖方向固定：

shared

↑

router

store

request

event

loading

message

cache

auth

tab

ui-adapter

↑

core

↑

apps

禁止循环依赖。

禁止 apps 相互依赖。

禁止 packages 相互交叉引用。

---

## 七、框架隔离

除 ui-adapter 外：

packages 禁止依赖：

Vue

Vuex

Pinia

ElementUI

Element Plus

React

Redux

业务框架。

packages 必须保持框架无关。

---

## 八、qiankun

整个项目：

只有 packages/core 可以引用：

qiankun

其它任何地方禁止引用。

---

## 九、通信规范

共享状态：

store

临时事件：

event

页面跳转：

router

禁止：

window

sessionStorage

localStorage

进行跨应用通信。

---

## 十、Router

所有页面跳转：

统一调用：

router.push()

router.replace()

router.back()

router.reload()

禁止直接：

this.$router.push()

history.pushState()

---

## 十一、Request

所有请求：

统一使用：

request.get()

request.post()

禁止直接：

axios()

fetch()

---

## 十二、Message

统一：

message.success()

message.error()

message.warning()

message.confirm()

禁止：

this.$message

---

## 十三、Loading

统一：

loading.show()

loading.hide()

loading.withLoading()

---

## 十四、Store

统一：

store.get()

store.set()

store.remove()

store.subscribe()

store.unsubscribe()

禁止：

window.xxx

---

## 十五、Event

统一：

event.on()

event.off()

event.once()

event.emit()

---

## 十六、生命周期

所有子应用必须实现：

bootstrap

mount

unmount

卸载必须：

清除：

Timer

Event

DOM

实例

Observer

避免内存泄漏。

---

## 十七、样式隔离

所有子应用：

开启：

qiankun

strictStyleIsolation

禁止关闭。

---

## 十八、编码规范

全部使用：

ES Module

import/export

JavaScript

禁止：

CommonJS。

---

## 十九、输出要求

Claude 修改代码时：

禁止修改无关代码。

禁止为了兼容降低架构质量。

新增功能必须保持职责清晰。

优先复用已有 package。

不要重复造轮子。
