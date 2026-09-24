import { parse as parseSfc } from '@vue/compiler-sfc';

export interface VueScriptBlock {
  content: string;
  lang: string;
  isSetup: boolean;
  lineOffset: number;
}

export interface VueParseResult {
  scripts: VueScriptBlock[];
}

/**
 * 提取 .vue 文件的 <script> / <script setup> 块。
 *
 * 依赖分析只关心脚本内容，模板完全不参与分析：
 * - 模板语法错误（如 "Invalid end tag"）不影响脚本提取，忽略；
 * - 文件只有非 HTML 模板（如 <template lang="pug">）或只有 <style> 时，
 *   @vue/compiler-sfc 会整体抛错 —— 回退到轻量脚本块扫描（仅作兜底，核心仍是编译器）。
 * 任何情况下都不会因模板问题丢失脚本块。
 */
export function parseVueScripts(content: string, filename: string): VueParseResult {
  let scripts: VueScriptBlock[] = [];
  try {
    const { descriptor } = parseSfc(content, { filename });
    for (const block of [descriptor.script, descriptor.scriptSetup]) {
      if (!block) continue;
      scripts.push({
        content: block.content,
        lang: block.lang || 'js',
        isSetup: block === descriptor.scriptSetup,
        lineOffset: block.loc.start.line - 1,
      });
    }
  } catch {
    scripts = [];
  }
  if (scripts.length === 0) {
    scripts = extractScriptBlocksFallback(content);
  }
  return { scripts };
}

/** 轻量兜底：直接扫描 <script ...> ... </script>，不解析模板 */
function extractScriptBlocksFallback(content: string): VueScriptBlock[] {
  const blocks: VueScriptBlock[] = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    const attrs = m[1] || '';
    const lang = /lang\s*=\s*["']([^"']+)["']/.exec(attrs)?.[1] || 'js';
    const isSetup = /\bsetup\b/.test(attrs);
    const lineOffset = content.slice(0, m.index).split('\n').length - 1;
    blocks.push({ content: m[2], lang, isSetup, lineOffset });
  }
  return blocks;
}
