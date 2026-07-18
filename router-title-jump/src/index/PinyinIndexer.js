'use strict';

const { pinyin } = require('pinyin-pro');

/** @typedef {import('../types').PinyinData} PinyinData */

/**
 * 为文本生成拼音检索数据。**在建索引时调用一次**，避免搜索时重复转换
 * （分析问题 #9：旧实现每次输入都算）。
 *
 * - fullPinyin：全拼连写，如 保险产品 -> baoxianchanpin
 * - initials：每音节首字母，如 -> bxcp
 * - syllables：逐音节数组，如 -> ['bao','xian','chan','pin']
 *
 * pinyin-pro 对非中文按字符返回（如 'Login' -> ['l','o','g','i','n']），
 * 天然兼容中英混排。会按上下文选择多音字读音（银行 -> yinhang）。
 *
 * @param {string} text
 * @returns {PinyinData}
 */
function buildPinyin(text) {
  if (!text) return { fullPinyin: '', initials: '', syllables: [] };

  const raw = pinyin(text, { toneType: 'none', type: 'array' });
  const syllables = raw
    .map((s) => String(s).toLowerCase().trim())
    .filter((s) => s.length > 0);

  const fullPinyin = syllables.join('');
  const initials = syllables.map((s) => s[0]).join('');
  return { fullPinyin, initials, syllables };
}

module.exports = { buildPinyin };
