# FMAC Front

长期维护、可扩展、可升级的**企业级微前端平台**。

- 主应用：Vue2
- 微前端：qiankun
- 包管理：pnpm workspace
- 语言：JavaScript（ES Module，不使用 TypeScript）

未来演进目标：Vue3 / React / Vite / Element Plus / Wujie / Module Federation。升级底层技术时，业务代码尽量无需修改。

> 完整架构约束见 [`CLAUDE.md`](./CLAUDE.md)；文档体系见 [`docs/`](./docs/README.md)，分层说明见 [`docs/architecture/overview.md`](./docs/architecture/overview.md)。

## 目录结构

```
fmac-front/
├── apps/          # 业务子应用（main + user / order / report），仅写业务
├── packages/      # 平台公共能力（框架无关，ui-adapter 除外）
├── configs/       # eslint / prettier / env / constants / webpack(预留)
├── docs/          # 架构与开发文档
└── pnpm-workspace.yaml
```

顶级目录固定为以上四个，**禁止新增顶级目录**。

## packages 分层

```
apps  →  core  →  { router, store, request, event, loading, message,
                    cache, auth, tab, ui-adapter, plugin }  →  shared
```

依赖方向自上而下固定，禁止循环依赖、禁止 apps 相互依赖、禁止 packages 交叉引用。仅 `core` 可引用 `qiankun`。详见 [`docs/architecture/dependency.md`](./docs/architecture/dependency.md)。

## 常用脚本

```bash
corepack pnpm install     # 安装依赖
corepack pnpm dev         # 并行启动所有 apps（main 7100 / user 7101 / order 7102 / report 7103）
corepack pnpm build       # 构建所有 apps
corepack pnpm lint        # ESLint
corepack pnpm format      # Prettier
corepack pnpm clean       # 清理构建产物
```

## 进度

- Phase 1 工程初始化 · Phase 2 packages 能力实现 · Phase 3 主应用基座 · Phase 4 三标准子应用
- **Phase 5（当前）**：工程能力完善 —— 插件机制、统一 Hook / 异常、批量脚本、环境配置、文档体系、提交规范。
- Phase 6+：待规划。变更记录见 [`CHANGELOG.md`](./CHANGELOG.md)。
