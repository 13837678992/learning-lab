import { defineConfig } from 'vite';
import path from 'path';

// 用 AST 静态提取 resolve.alias，无需执行本文件。
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '~': path.resolve(__dirname, './src'),
    },
  },
});
