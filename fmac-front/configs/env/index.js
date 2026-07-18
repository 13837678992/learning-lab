/**
 * 环境配置统一入口。按 mode（development | test | production）选择对应配置。
 *
 * 与 Vite 集成：在 app 的 vite.config.js 中 `resolveEnv(mode)` 读取，注入到 define / server；
 * 运行期业务统一读取 Vite 的 import.meta.env，不直接读 process.env / window。
 */
import development from './development.js';
import test from './test.js';
import production from './production.js';

const ENVS = { development, test, production };

/** 解析指定 mode 的环境配置；未知 mode 回退 development。 */
export function resolveEnv(mode = 'development') {
  return ENVS[mode] || development;
}

export { development, test, production };
