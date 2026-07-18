'use strict';

const vscode = require('vscode');

// 与旧版保持一致的默认值，确保向下兼容。
const DEFAULT_ROUTER_GLOBS = [
  '**/router/**/*.{js,ts,jsx,tsx}',
  '**/routers/**/*.{js,ts,jsx,tsx}',
  '**/src/router/**/*.{js,ts,jsx,tsx}',
];
const DEFAULT_EXCLUDE = '**/{node_modules,dist,build,out,.git}/**';

/**
 * 配置读取服务：集中封装 workspace 配置，保留旧配置键
 * （routerJump.routerGlobs / routerJump.exclude）以向下兼容。
 */
class ConfigService {
  /** @returns {string[]} */
  get routerGlobs() {
    return vscode.workspace
      .getConfiguration('routerJump')
      .get('routerGlobs', DEFAULT_ROUTER_GLOBS);
  }

  /** @returns {string} */
  get exclude() {
    return vscode.workspace
      .getConfiguration('routerJump')
      .get('exclude', DEFAULT_EXCLUDE);
  }
}

module.exports = { ConfigService, DEFAULT_ROUTER_GLOBS, DEFAULT_EXCLUDE };
