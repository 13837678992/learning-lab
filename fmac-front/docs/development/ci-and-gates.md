# CI 与提交门禁

## 全量本地门禁

```bash
pnpm check          # = check:arch + lint + test（提交前建议先跑）
pnpm test:coverage  # 覆盖率报告（coverage/，已 gitignore）
```

单项：

| 命令                | 作用                                                      |
| ------------------- | --------------------------------------------------------- |
| `pnpm check:arch`   | 架构守卫（目录 / qiankun 边界 / 依赖方向 / 框架隔离 / …） |
| `pnpm lint`         | ESLint                                                    |
| `pnpm format:check` | Prettier 校验                                             |
| `pnpm test`         | Vitest 单元 + 集成测试                                    |
| `pnpm build`        | 构建全部 apps                                             |

## CI（GitHub Actions）

`fmac-front` 是 `learning-lab` 仓库的子目录，故工作流置于**仓库根** `.github/workflows/fmac-front-ci.yml`，并用 `paths: ['fmac-front/**']` 过滤——**只有 fmac-front 变更才触发**，同级项目（`cloud2024` 等）不受影响。

流水线（`working-directory: fmac-front`）：

```
checkout → setup-node 20 → corepack enable → pnpm install --frozen-lockfile
        → check:arch → lint → format:check → test → build
```

任一步失败即拒绝合并。`--frozen-lockfile` 要求 `pnpm-lock.yaml` 已提交且与 `package.json` 一致。

## 提交门禁（lint-staged）

对暂存文件自动修复 + 校验，配置见 [`.lintstagedrc.json`](../../.lintstagedrc.json)：

```bash
pnpm precommit      # = lint-staged，对暂存的 js/vue/json/md/css 执行 eslint --fix + prettier
```

### 接入 git 钩子（可选，注意 monorepo 约束）

> **约束**：git 根是 `learning-lab`（含多个同级项目）。husky 会设置**仓库级** `core.hooksPath`，影响所有同级项目，故本项目**不默认安装 husky**。

如需在提交时自动执行 fmac-front 门禁，可在**仓库根**手动添加一个「按路径生效」的 `pre-commit` 钩子：

```bash
# learning-lab/.git/hooks/pre-commit（记得 chmod +x）
#!/bin/sh
# 仅当本次提交涉及 fmac-front 时，运行其提交门禁
if git diff --cached --name-only | grep -q '^fmac-front/'; then
  cd fmac-front && pnpm precommit
fi
```

或在整个 `learning-lab` 统一采用 husky 时，于根 `package.json` 接入并在钩子内 `cd fmac-front && pnpm precommit`。无论哪种方式，**CI 都是最终强制门禁**。
