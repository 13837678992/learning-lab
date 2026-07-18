import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue2';
import qiankun from 'vite-plugin-qiankun';

/**
 * 报表中心子应用 Vite 配置。
 * - 作为 qiankun 子应用独立打包（vite-plugin-qiankun 处理生命周期暴露与运行期 public-path）；
 * - 也可 standalone 独立运行 / 独立部署；qiankun 需跨域拉取资源，故开启 CORS。
 * - 多环境：`vite build --mode test|production` 经 import.meta.env 驱动（见 @fmac/env）。
 * qiankun 应用名须与 @fmac/constants 的 MICRO_APPS.REPORT 一致。
 */
const QIANKUN_NAME = 'app-report';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    base: env.VITE_BASE || '/',
    plugins: [vue(), qiankun(QIANKUN_NAME, { useDevMode: true })],
    server: {
      port: 7103,
      cors: true,
      origin: env.VITE_DEV_ORIGIN || 'http://localhost:7103',
    },
    preview: { port: 7103, cors: true },
    build: {
      target: 'es2015',
      sourcemap: mode !== 'production',
      cssCodeSplit: false,
    },
  };
});
