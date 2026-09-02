# Component Lab

跨框架组件实验项目，用于对比和实践不同框架的组件设计模式。

## 子项目

| 目录 | 框架 | 状态 |
|---|---|---|
| `vue2/` | Vue 2.7 + Vite | 进行中 |

## 快速开始

```bash
cd vue2
npm install
npm run dev
```

访问 `http://localhost:3100` 查看效果。

## 目录约定

每个框架子项目保持独立的技术栈和依赖，但遵循统一的组件命名和目录结构，便于横向对比：

```
<framework>/
├── src/
│   ├── components/   # 组件目录
│   ├── App.vue       # 入口组件（展示所有组件）
│   └── main.js       # 应用入口
├── index.html
├── package.json
└── vite.config.js
```

## License

MIT
