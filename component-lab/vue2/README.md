# Component Lab — Vue 2

基于 **Vue 2.7 + Vite 5** 的组件实验项目，用于实践 Vue 2 组件设计模式，并与后续其他框架的实现进行横向对比。

## 技术栈

| 依赖 | 版本 | 说明 |
|---|---|---|
| Vue | 2.7.x | 内置 Composition API，同时兼容 Options API |
| Vite | 5.x | 通过 `@vitejs/plugin-vue2` 支持 Vue 2 |
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
│   │   └── BaseButton.vue
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

## License

MIT
