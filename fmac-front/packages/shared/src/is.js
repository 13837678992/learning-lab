/**
 * @fmac/shared —— 类型判断（框架无关，零依赖）。
 */

export function isUndefined(value) {
  return typeof value === 'undefined';
}

export function isNil(value) {
  return value === null || value === undefined;
}

export function isFunction(value) {
  return typeof value === 'function';
}

export function isString(value) {
  return typeof value === 'string';
}

export function isNumber(value) {
  return typeof value === 'number' && !Number.isNaN(value);
}

export function isObject(value) {
  return value !== null && typeof value === 'object';
}

export function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

/** thenable 判定：具备 then 方法即视为 Promise-like。 */
export function isPromise(value) {
  return isObject(value) && isFunction(value.then);
}
