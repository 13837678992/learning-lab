/**
 * @fmac/shared —— 断言。
 */
import { NAMESPACE } from './constants.js';

/** 条件不成立时抛出带命名空间前缀的错误。 */
export function assert(condition, message) {
  if (!condition) {
    throw new Error(`[${NAMESPACE}] ${message || 'assertion failed'}`);
  }
}
