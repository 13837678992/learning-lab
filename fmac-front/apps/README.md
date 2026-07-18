# apps

业务子应用目录（主应用 + 各微应用），**仅写业务**。

- 每个子应用是独立的 pnpm workspace 包，**只依赖 `@fmac/core`**，不直接依赖下层能力 package。
- 每个子应用必须实现 `bootstrap` / `mount` / `unmount` 生命周期，卸载时清理 Timer / Event / DOM / 实例 / Observer（见 `CLAUDE.md` 第十六节）。
- 主应用（Vue2 + qiankun）与各微应用在 Phase 2+ 落地；Phase 1 仅确立目录结构，暂无业务实现。
