/**
 * @fmac/shared —— 统一日志。
 * 带命名空间标签；warn / error 始终输出，debug / info 受全局开关控制（默认关闭）。
 */
import { NAMESPACE } from './constants.js';

let debugEnabled = false;

/** 打开 / 关闭调试日志（debug / info）。 */
export function setDebug(enabled) {
  debugEnabled = !!enabled;
}

export function isDebug() {
  return debugEnabled;
}

/** 创建带作用域标签的 logger。 */
export function createLogger(scope) {
  const tag = scope ? `[${NAMESPACE}:${scope}]` : `[${NAMESPACE}]`;
  return {
    debug(...args) {
      if (debugEnabled) console.debug(tag, ...args);
    },
    info(...args) {
      if (debugEnabled) console.info(tag, ...args);
    },
    warn(...args) {
      console.warn(tag, ...args);
    },
    error(...args) {
      console.error(tag, ...args);
    },
  };
}
