/**
 * @fmac/shared —— 通用小工具（框架无关，零依赖）。
 */

/** 空函数占位。 */
export function noop() {}

/** 原样返回。 */
export function identity(value) {
  return value;
}

/** 归一为数组：null/undefined → []，非数组 → [value]。 */
export function toArray(value) {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}
