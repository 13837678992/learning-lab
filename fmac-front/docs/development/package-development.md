# 能力包（package）开发规范

## 何时新增 package

公共能力放 `packages/`，业务放 `apps/`。**禁止业务代码进入 packages**，禁止新增职责重复的包。

## 目录结构

```
packages/<name>/
├── package.json     @fmac/<name>，private，type: module
├── src/
│   ├── index.js     对外聚合导出 + 默认单例
│   └── *.js         实现（单一职责，拆小文件）
└── README.md        API + 用法 + 约束
```

## package.json 统一约定

```json
{
  "name": "@fmac/<name>",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "src/index.js",
  "module": "src/index.js",
  "exports": { ".": "./src/index.js" },
  "files": ["src"],
  "dependencies": { "@fmac/shared": "workspace:*" }
}
```

## 依赖规则

- 中间能力层**只能依赖 `@fmac/shared`**，彼此不引用（见 [../architecture/dependency.md](../architecture/dependency.md)）。
- 除 `ui-adapter` 外**框架无关**：禁止依赖 Vue/React/Vuex/Pinia/ElementUI/Element Plus/Redux。
- `qiankun` 仅 `core` 可用。

## 设计原则

- SOLID / KISS / DRY，单一职责，依赖倒置，组合优于继承，禁止过度设计。
- 隔离底层实现用**适配器**（如 `request` 的 fetch 适配器、`router` 的 History 适配器、`message`/`loading` 的 UI 适配器），便于未来替换。
- 对外导出：命名 `create*()` 工厂 + 默认单例。

## 版本

各包**独立版本**（`version` 独立演进），便于未来单独发布 npm。发布约定见 [deployment.md](./deployment.md)。
