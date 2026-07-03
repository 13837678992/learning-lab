const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

const TITLE_REGEX = /title\s*:\s*['"]([^'"]+)['"]/g;
const COMPONENT_IMPORT_REGEX = /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/;
const FILE_EXTENSIONS = ['.vue', '.tsx', '.jsx', '.js', '.ts'];

/** @type {RouteEntry[] | null} */
let cachedEntries = null;

/**
 * @typedef {Object} RouteEntry
 * @property {string} title
 * @property {vscode.Uri} targetFile
 * @property {string} label
 * @property {string} description
 */

function getConfig() {
  const config = vscode.workspace.getConfiguration('routerJump');
  return {
    routerGlobs: config.get('routerGlobs', [
      '**/router/**/*.{js,ts,jsx,tsx}',
      '**/routers/**/*.{js,ts,jsx,tsx}',
      '**/src/router/**/*.{js,ts,jsx,tsx}',
    ]),
    exclude: config.get('exclude', '**/{node_modules,dist,build,out,.git}/**'),
  };
}

function invalidateCache() {
  cachedEntries = null;
}

function findProjectRoot(startPath) {
  let current = path.dirname(startPath);
  const root = path.parse(current).root;

  while (current !== root) {
    if (fs.existsSync(path.join(current, 'package.json'))) {
      return current;
    }
    current = path.dirname(current);
  }

  return path.dirname(startPath);
}

function loadPathAliases(projectRoot) {
  /** @type {{ prefix: string, targetDir: string }[]} */
  const rules = [];

  for (const fileName of ['tsconfig.json', 'jsconfig.json']) {
    const configPath = path.join(projectRoot, fileName);
    if (!fs.existsSync(configPath)) {
      continue;
    }

    try {
      const text = fs.readFileSync(configPath, 'utf8');
      const baseUrlMatch = text.match(/"baseUrl"\s*:\s*"([^"]+)"/);
      const baseUrl = baseUrlMatch ? baseUrlMatch[1] : '.';
      const baseDir = path.resolve(projectRoot, baseUrl);
      const pathRegex = /"(@[^"]+)"\s*:\s*\[\s*"([^"]+)"\s*\]/g;
      let match;

      while ((match = pathRegex.exec(text)) !== null) {
        const aliasKey = match[1];
        const prefix = aliasKey.endsWith('/*')
          ? aliasKey.slice(0, -1)
          : `${aliasKey}/`;
        const target = match[2].replace(/\/?\*$/, '');
        rules.push({
          prefix,
          targetDir: path.resolve(baseDir, target),
        });
      }
    } catch {
      // 忽略无效配置
    }
  }

  rules.sort((a, b) => b.prefix.length - a.prefix.length);
  return rules;
}

/**
 * @param {string} importPath
 * @param {string} projectRoot
 * @param {string} routerFilePath
 * @param {{ prefix: string, targetDir: string }[]} aliasRules
 * @returns {string | undefined}
 */
function resolveImportPath(importPath, projectRoot, routerFilePath, aliasRules) {
  if (importPath.startsWith('.')) {
    return path.resolve(path.dirname(routerFilePath), importPath);
  }

  for (const rule of aliasRules) {
    if (importPath.startsWith(rule.prefix)) {
      const rest = importPath.slice(rule.prefix.length);
      return path.join(rule.targetDir, rest);
    }
  }

  if (importPath.startsWith('@/')) {
    return path.join(projectRoot, 'src', importPath.slice(2));
  }

  return path.join(projectRoot, importPath);
}

/**
 * @param {string} resolvedPath
 * @returns {string | undefined}
 */
function findExistingFile(resolvedPath) {
  const candidates = [];

  if (path.extname(resolvedPath)) {
    candidates.push(resolvedPath);
  } else {
    for (const ext of FILE_EXTENSIONS) {
      candidates.push(resolvedPath + ext);
      candidates.push(path.join(resolvedPath, `index${ext || '.js'}`));
    }
  }

  return candidates.find((candidate) => {
    try {
      return fs.statSync(candidate).isFile();
    } catch {
      return false;
    }
  });
}

/**
 * @param {string} text
 * @param {number} objectStart
 * @returns {string | undefined}
 */
function extractBlockFromStart(text, objectStart) {
  let depth = 0;

  for (let i = objectStart; i < text.length; i++) {
    const char = text[i];
    if (char === '{') {
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0) {
        return text.slice(objectStart, i + 1);
      }
    }
  }

  return undefined;
}

/**
 * 提取 title 所在的路由对象 `{ ... }` 文本。
 * 取包含 title 且含 component/path 的最小对象（兼容 title 写在 meta 里的情况）。
 * @param {string} text
 * @param {number} titleIndex
 * @returns {string | undefined}
 */
function extractRouteObjectBlock(text, titleIndex) {
  /** @type {{ start: number, block: string } | undefined} */
  let bestMatch;

  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '{') {
      continue;
    }

    const block = extractBlockFromStart(text, i);
    if (!block) {
      continue;
    }

    const end = i + block.length;
    if (titleIndex < i || titleIndex >= end) {
      continue;
    }

    if (!/(?:component\s*:|path\s*:)/.test(block)) {
      continue;
    }

    if (!bestMatch || block.length < bestMatch.block.length) {
      bestMatch = { start: i, block };
    }
  }

  return bestMatch?.block;
}

/**
 * 只在 title 所在的同一个路由对象里匹配 component import
 * 跳过含 children 的一级/layout 路由
 * @param {string} text
 * @param {number} titleIndex
 * @returns {string | undefined}
 */
function extractComponentImport(text, titleIndex) {
  const block = extractRouteObjectBlock(text, titleIndex);
  if (!block) {
    return undefined;
  }

  if (/children\s*:/.test(block)) {
    return undefined;
  }

  const match = block.match(COMPONENT_IMPORT_REGEX);
  return match ? match[1] : undefined;
}

/**
 * @param {vscode.Uri} routerUri
 * @param {string} importPath
 * @returns {vscode.Uri | undefined}
 */
function resolveComponentFile(routerUri, importPath) {
  const routerFilePath = routerUri.fsPath;
  const projectRoot = findProjectRoot(routerFilePath);
  const aliasRules = loadPathAliases(projectRoot);
  const resolvedPath = resolveImportPath(
    importPath,
    projectRoot,
    routerFilePath,
    aliasRules
  );
  const existingFile = findExistingFile(resolvedPath);

  return existingFile ? vscode.Uri.file(existingFile) : undefined;
}

/**
 * @param {vscode.Uri} uri
 * @returns {Promise<RouteEntry[]>}
 */
async function parseRouterFile(uri) {
  const document = await vscode.workspace.openTextDocument(uri);
  const text = document.getText();
  /** @type {RouteEntry[]} */
  const entries = [];

  TITLE_REGEX.lastIndex = 0;
  let match;
  while ((match = TITLE_REGEX.exec(text)) !== null) {
    const title = match[1].trim();
    if (!title) {
      continue;
    }

    const importPath = extractComponentImport(text, match.index);
    if (!importPath) {
      continue;
    }

    const targetFile = resolveComponentFile(uri, importPath);
    if (!targetFile) {
      continue;
    }

    entries.push({
      title,
      targetFile,
      label: title,
      description: vscode.workspace.asRelativePath(targetFile),
    });
  }

  return entries;
}

async function collectRouteEntries() {
  if (cachedEntries) {
    return cachedEntries;
  }

  const { routerGlobs, exclude } = getConfig();
  const fileMap = new Map();

  for (const pattern of routerGlobs) {
    const files = await vscode.workspace.findFiles(pattern, exclude, 200);
    for (const file of files) {
      fileMap.set(file.toString(), file);
    }
  }

  /** @type {RouteEntry[]} */
  const allEntries = [];

  for (const uri of fileMap.values()) {
    try {
      const entries = await parseRouterFile(uri);
      allEntries.push(...entries);
    } catch {
      // 忽略无法读取的文件
    }
  }

  allEntries.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
  cachedEntries = allEntries;
  return allEntries;
}

/**
 * @param {RouteEntry[]} entries
 * @param {string} query
 */
function filterEntries(entries, query) {
  const keyword = query.trim();
  if (!keyword) {
    return entries;
  }

  return entries.filter(
    (entry) =>
      entry.title.includes(keyword) || entry.description.includes(keyword)
  );
}

/**
 * @param {RouteEntry} entry
 */
async function openPageFile(entry) {
  const document = await vscode.workspace.openTextDocument(entry.targetFile);
  await vscode.window.showTextDocument(document, {
    viewColumn: vscode.ViewColumn.Active,
    preview: false,
  });
}

async function jumpByTitle() {
  const entries = await collectRouteEntries();

  if (entries.length === 0) {
    vscode.window.showWarningMessage(
      '未找到可跳转的路由页面。请确认 router 中有 title 和 component import。'
    );
    return;
  }

  const quickPick = vscode.window.createQuickPick();
  quickPick.placeholder = '输入中文 title 搜索页面';
  quickPick.items = entries;

  quickPick.onDidChangeValue((value) => {
    quickPick.items = filterEntries(entries, value);
  });

  quickPick.onDidAccept(async () => {
    const selected = quickPick.selectedItems[0];
    quickPick.hide();
    if (selected) {
      await openPageFile(selected);
    }
  });

  quickPick.onDidHide(() => quickPick.dispose());
  quickPick.show();
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('router-jump.jumpByTitle', jumpByTitle),
    vscode.workspace.onDidSaveTextDocument(invalidateCache),
    vscode.workspace.onDidDeleteFiles(invalidateCache),
    vscode.workspace.onDidCreateFiles(invalidateCache),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('routerJump')) {
        invalidateCache();
      }
    })
  );
}

function deactivate() {
  cachedEntries = null;
}

module.exports = { activate, deactivate };
