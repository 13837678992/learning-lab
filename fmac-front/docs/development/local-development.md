# 本地开发

## 环境

- Node ≥ 18，pnpm 经 corepack 提供（`packageManager: pnpm@11.13.1`）。
- 纯 JavaScript（ES Module），**不使用 TypeScript**，保持 Vue2 兼容。

## 安装与启动

```bash
corepack pnpm install          # 安装全部 workspace 依赖
corepack pnpm dev              # 并行启动全部 apps（main:7100 / user:7101 / order:7102 / report:7103）
corepack pnpm --filter @fmac/app-main dev     # 只启动主应用
```

## 常用脚本（根目录）

| 脚本                                | 说明                                                  |
| ----------------------------------- | ----------------------------------------------------- |
| `pnpm dev`                          | 并行启动所有 `apps/*` 的 dev                          |
| `pnpm build` / `pnpm build:apps`    | 构建所有 `apps/*`                                     |
| `pnpm lint` / `pnpm lint:fix`       | ESLint 检查 / 修复                                    |
| `pnpm format` / `pnpm format:check` | Prettier 格式化 / 校验                                |
| `pnpm clean`                        | 清理 `apps/*/dist`、`packages/*/dist`、`.eslintcache` |
| `pnpm clean:deps`                   | 清理所有 `node_modules`                               |
| `pnpm commitlint`                   | 校验提交信息                                          |

## 编码规范

- 统一 **ES Module** `import/export`，禁止 CommonJS。
- 不使用 TypeScript，不引入 TS 配置。
- 格式由 **Prettier** 统一（单引号、分号、trailing comma、printWidth 100、2 空格）；质量由 **ESLint** 保证（`prefer-const` / `no-var` / `eqeqeq` 等）。
- 业务禁止直接：`this.$router` / `this.$message` / `axios()` / `fetch()` / `window|sessionStorage|localStorage` 跨应用通信 —— 统一走 `@fmac/core` 的能力。
- 子应用卸载必须清理 Timer / Event / DOM / 实例 / Observer（见 [micro-app-guide.md](./micro-app-guide.md)）。

## 提交规范（Conventional Commits）

格式：`<type>(<scope>): <subject>`，type 见 `commitlint.config.js`（`feat`/`fix`/`docs`/`refactor`/`perf`/`test`/`build`/`ci`/`chore`/`revert` 等）。

```bash
git commit -m "feat(router): 支持路由 meta 透传"
echo "feat(x): y" | pnpm commitlint    # 手动校验（CI / git hook 可自动执行）
```

> 当前 git 仓库为上层目录，未强制安装 husky hook；建议在 CI 或独立化仓库后接入 `commitlint` 与 `lint-staged`。
