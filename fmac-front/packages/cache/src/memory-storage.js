/**
 * @fmac/cache —— 默认内存存储后端（框架 / 环境无关，进程内有效）。
 *
 * 实现最小的 Web Storage 风格接口，便于 @fmac/cache 在内存 / localStorage 等后端间切换。
 */
export function createMemoryStorage() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, value);
    },
    removeItem(key) {
      map.delete(key);
    },
    keys() {
      return [...map.keys()];
    },
    clear() {
      map.clear();
    },
  };
}
