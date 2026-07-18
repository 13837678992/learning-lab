/**
 * @fmac/shared —— 平台常量。
 * 统一命名空间前缀，避免与宿主环境 / 其它库冲突。
 */

/** 平台命名空间。用于日志标签、内部存储 key、事件前缀等。 */
export const NAMESPACE = 'fmac';

/** 平台内部 key 统一前缀（store / cache 等使用）。 */
export const KEY_PREFIX = `__${NAMESPACE}__`;
