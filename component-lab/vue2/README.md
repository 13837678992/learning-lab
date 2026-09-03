# Component Lab — Vue 2

基于 **Vue 2.7 + Vite 5** 的组件实验项目，用于实践 Vue 2 组件设计模式，并与后续其他框架的实现进行横向对比。

## 技术栈

| 依赖 | 版本 | 说明 |
|---|---|---|
| Vue | 2.7.x | 内置 Composition API，同时兼容 Options API |
| Vite | 5.x | 通过 `@vitejs/plugin-vue2` 支持 Vue 2 |
| Element UI | 2.15.x | Crud 组件的 UI 基础 |
| dayjs | 1.x | Crud 组件日期逻辑 |
| sass | 1.x | 构建期编译 scss（devDependency） |
| Node | >= 18 | 推荐使用 Volta 管理 |

## 环境要求

推荐使用 [Volta](https://volta.sh) 管理 Node 版本，项目已配置 Volta pin Node 18：

```bash
# 安装 Volta（如未安装）
curl https://get.volta.sh | bash

# 安装 Node 18（Volta 会自动读取 package.json 中的 volta 配置）
volta install node@18
```

也可直接使用 Node >= 18，无需 Volta。

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（端口 3100）
npm run dev

# 生产构建
npm run build

# 预览构建产物
npm run preview
```

## 目录结构

```
vue2/
├── src/
│   ├── components/       # 组件目录
│   │   ├── BaseButton.vue
│   │   ├── Crud/         # 配置化 CRUD 组件（单文件版 + 说明文档）
│   │   │   ├── index.vue
│   │   │   └── README.md
│   │   └── Form/         # 配置化数据收集表单组件（单文件版 + 说明文档）
│   │       ├── index.vue
│   │       └── README.md
│   ├── demo/             # 组件演示页
│   │   ├── CrudDemo.vue
│   │   └── FormDemo.vue
│   ├── App.vue           # 入口组件，展示所有组件
│   └── main.js           # 应用入口
├── index.html
├── vite.config.js
└── package.json
```

## 组件列表

| 组件 | 说明 |
|---|---|
| `BaseButton` | 基础按钮组件，支持 `label`、`variant`（default / primary / danger）、`disabled` 属性 |
| `Crud` | 基于 Element UI 的配置化 CRUD 组件（单文件版），支持查询/分页/排序/增删改查/批量删除/下载/上传等，详见 [`src/components/Crud/README.md`](./src/components/Crud/README.md)，演示见 `src/demo/CrudDemo.vue` |
| `Form` | 基于 Element UI 的配置化数据收集表单组件（单文件版），17 种控件/校验/异步缓存/联动/条件必填，提交走 `submit` 事件，详见 [`src/components/Form/README.md`](./src/components/Form/README.md)，演示见 `src/demo/FormDemo.vue` |

> 共享模块架构：`Form` 是全项目的共享表单核心，`Crud` 复用 `Form` 渲染查询表单与弹窗表单（通过 `buttons` prop 注入 CRUD 专属按钮），表单渲染逻辑只维护一份。

## License

MIT
