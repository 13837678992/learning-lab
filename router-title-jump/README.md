# 路由标题跳转

轻量 VS Code 插件：输入 router 里的中文 title，直接打开对应页面文件。

## 使用

1. 按 `Ctrl+Alt+P`（Windows / Linux）或 `Cmd+Alt+P`（macOS）
2. 输入中文 title，如「首页」「产品」
3. 回车打开对应页面组件

## 支持写法

扫描 router 文件中的 `title` 和 `component` 动态 import：

```js
{ title: '产品', component: lazy(() => import('@view/Products')) }
meta: { title: '首页' }
component: () => import('@/views/welcome/index.vue')
```

会根据项目里的 `tsconfig.json` / `jsconfig.json` 路径别名，自动解析并打开 `.vue`、`.tsx`、`.jsx`、`.js` 等页面文件。

## 本地调试

1. 用 VS Code 打开本目录
2. 按 `F5` 启动 Extension Development Host
3. 在新窗口打开前端项目后测试

## 配置

- `routerJump.routerGlobs`：router 文件扫描路径
- `routerJump.exclude`：排除目录
