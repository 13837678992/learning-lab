/**
 * qiankun 子应用注册表 —— 从配置中心派生，消除硬编码与漂移（单一事实源）。
 *
 * - 名称 / 激活规则 / 挂载容器：来自 @fmac/constants（与各子应用 router base 共用同一 activeRule）；
 * - entry：来自 @fmac/env（按 mode 解析），并允许 VITE_SUB_* 环境变量覆盖以适配部署。
 */
import { MICRO_APPS, SUBAPPS, SUBAPP_CONTAINER } from '@fmac/constants';
import { resolveEnv } from '@fmac/env';

const ENTRIES = resolveEnv(process.env.APP_MODE).SUBAPPS;

/** 部署期可经环境变量覆盖各子应用 entry。 */
const ENTRY_OVERRIDES = {
  [MICRO_APPS.USER]: process.env.VITE_SUB_USER,
  [MICRO_APPS.ORDER]: process.env.VITE_SUB_ORDER,
  [MICRO_APPS.REPORT]: process.env.VITE_SUB_REPORT,
  [MICRO_APPS.FINANCE]: process.env.VITE_SUB_FINANCE,
};

export const microApps = Object.values(MICRO_APPS).map((name) => ({
  name,
  entry: ENTRY_OVERRIDES[name] || ENTRIES[name],
  container: SUBAPP_CONTAINER,
  activeRule: SUBAPPS[name].activeRule,
}));
