# 依赖规则与依赖图

## 硬性规则

1. **禁止循环依赖**（任意层级）。
2. **`packages` 不允许依赖 `apps`**。
3. **`apps` 不允许相互依赖**。
4. **公共能力只能从 `packages` 获取**；业务（apps）经 `@fmac/core` 使用能力，**不直连下层能力包**；仅允许额外依赖配置包 `@fmac/constants` / `@fmac/env`（非运行时能力）。
5. 除 `ui-adapter` 外，`packages` 不依赖任何 UI / 业务框架。
6. `qiankun` 仅 `@fmac/core` 可引用。

## 依赖图（workspace 内部）

```
                 shared
                   ▲
   ┌───────┬───────┼───────┬───────┬────────┐
 router  store  request  event  loading  message
 cache   auth   tab    ui-adapter  plugin
                   ▲   （均只依赖 shared）
                   │
                 core   ── 依赖全部中间层 + shared + plugin + qiankun
                   ▲
                  apps  ── 只依赖 core（+ vue / vue-router 等框架）
```

- 中间能力层各包**仅**依赖 `@fmac/shared`，彼此不引用。
- `core` 是唯一聚合点（组合根）。
- `apps` 仅依赖 `@fmac/core`；框架依赖（`vue`/`vue-router`）由 apps 自持。

## 校验方式

依赖方向、qiankun 边界、框架隔离、apps 直连下层包与包级循环依赖由**架构守卫**自动校验（Phase 8 落地，零依赖，纳入 `pnpm check`）：

```bash
pnpm check:arch   # 6 项：顶级目录 / qiankun 边界 / 依赖方向 / 框架隔离 / apps 边界 / 循环依赖
pnpm check        # check:arch + lint + test 全量门禁
```

守卫脚本位于 [`configs/arch-check/index.js`](../../configs/arch-check/index.js)。任一违规（中间包互相引用、apps 直连下层包、packages 引用 apps、qiankun 泄漏出 core、循环依赖）都会打印分组报告并以退出码 1 结束，可直接接入 CI。
