import { parse as parseSfc } from '@vue/compiler-sfc';

export interface VueScriptBlock {
  content: string;
  lang: string;
  isSetup: boolean;
  lineOffset: number;
}

export interface VueParseResult {
  scripts: VueScriptBlock[];
  errors: string[];
}

/**
 * 使用 @vue/compiler-sfc 提取 <script> / <script setup> 块。
 * 仅提取脚本内容，对 Vue 2 / Vue 3 SFC 均适用（本工具自带编译器，与项目 Vue 版本无关）。
 */
export function parseVueScripts(content: string, filename: string): VueParseResult {
  try {
    const { descriptor, errors } = parseSfc(content, { filename });
    const scripts: VueScriptBlock[] = [];
    for (const block of [descriptor.script, descriptor.scriptSetup]) {
      if (!block) continue;
      scripts.push({
        content: block.content,
        lang: block.lang || 'js',
        isSetup: block === descriptor.scriptSetup,
        lineOffset: block.loc.start.line - 1,
      });
    }
    return { scripts, errors: errors.map((e) => String(e.message ?? e)) };
  } catch (err) {
    return { scripts: [], errors: [err instanceof Error ? err.message : String(err)] };
  }
}
