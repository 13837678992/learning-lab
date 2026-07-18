import { defineConfig } from 'vitest/config';

/**
 * FMAC Front 单元 / 集成测试配置。
 * 默认 node 环境；需浏览器语义的用例（core 装配）以 `// @vitest-environment happy-dom` 就近声明。
 * 测试与源码就近放置（*.test.js）。
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['packages/**/*.test.js'],
    setupFiles: ['./vitest.setup.js'],
    clearMocks: true,
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.js'],
      exclude: ['**/*.test.js'],
      reporter: ['text-summary', 'html'],
    },
  },
});
