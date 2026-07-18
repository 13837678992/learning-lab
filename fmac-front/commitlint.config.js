/**
 * 提交信息规范：Conventional Commits（`<type>(<scope>): <subject>`）。
 *
 * 校验方式：CI 或本地 `pnpm commitlint`（配合 git hook 时读取提交信息文件）。
 * 说明见 docs/development/local-development.md。
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // 新功能
        'fix', // 缺陷修复
        'docs', // 文档
        'style', // 格式（不影响逻辑）
        'refactor', // 重构
        'perf', // 性能
        'test', // 测试
        'build', // 构建 / 依赖
        'ci', // CI 配置
        'chore', // 杂项
        'revert', // 回滚
      ],
    ],
    'subject-case': [0],
  },
};
