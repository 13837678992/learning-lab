import * as path from 'node:path';

export function relPath(root: string, file: string): string {
  if (!file) return '';
  let rel = path.relative(root, file);
  rel = rel.split(path.sep).join('/');
  return rel || path.basename(file);
}

export function displayPath(root: string, file: string): string {
  return relPath(root, file);
}

export function basenameOf(file: string): string {
  return path.basename(file);
}
