/**
 * 从菜单派生 qiankun 子应用注册表（单一事实源：菜单）。
 * 菜单项含 microApp 字段者即为子应用；entry 允许经环境变量覆盖以适配部署。
 */
const ENTRY_OVERRIDES = {
  'app-demo': process.env.SUBAPP_DEMO_ENTRY,
};

export function buildMicroApps(menu) {
  const result = [];
  const seen = new Set();

  const walk = (items) => {
    (items || []).forEach((item) => {
      if (item.microApp && !seen.has(item.microApp)) {
        seen.add(item.microApp);
        result.push({
          name: item.microApp,
          entry: ENTRY_OVERRIDES[item.microApp] || item.entry,
          activeRule: item.activeRule || item.path,
        });
      }
      if (item.children) walk(item.children);
    });
  };

  walk(menu);
  return result;
}
