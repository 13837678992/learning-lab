import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue2';

/**
 * 主应用（qiankun 基座）Vite 配置（Vue 2.7）。
 * 基座正常打包为 SPA；不引用 vite-plugin-qiankun（子应用才需要）。
 * 多环境：`vite build --mode test|production` 经 import.meta.env 驱动子应用 entry（见 @fmac/env）。
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    // 基座部署基址（如部署在子路径则改此值 / 用 VITE_BASE 覆盖）。
    base: env.VITE_BASE || '/',
    plugins: [vue()],
    server: { port: 7100 },
    preview: { port: 7100 },
    build: {
      target: 'es2015',
      sourcemap: mode !== 'production',
    },
  };
});
