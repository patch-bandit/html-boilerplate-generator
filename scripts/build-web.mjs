import { readFileSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const BEGIN_MARKER = '// BEGIN GENERATED CORE (src/core/boilerplate.ts)';
export const END_MARKER = '// END GENERATED CORE';

export function buildCoreBrowserBundle(tsSource) {
  const stripped = stripTypeScriptTypes(tsSource, { mode: 'strip' });
  const exportNames = [];
  const exportRe = /^export\s+(?:const|function)\s+([A-Za-z0-9_]+)/gm;
  let m;
  while ((m = exportRe.exec(stripped)) !== null) {
    exportNames.push(m[1]);
  }

  const body = stripped
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/^export\s+(?=(?:const|function)\b)/gm, '')
    .replace(/<\/script/gi, '<\\/script')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const indentedBody = body
    .split('\n')
    .map((line) => (line ? `        ${line}` : ''))
    .join('\n');

  return [
    `      ${BEGIN_MARKER}`,
    '      // Generated via `npm run build:web`. Do not edit this block by hand.',
    '      const core = (function () {',
    indentedBody,
    `        return { ${exportNames.join(', ')} };`,
    '      })();',
    `      ${END_MARKER}`,
  ].join('\n');
}

export function injectCoreIntoWebHtml(webHtml, tsSource) {
  const normalized = webHtml.replace(/\r\n/g, '\n');
  const startIdx = normalized.indexOf(BEGIN_MARKER);
  const endIdx = normalized.indexOf(END_MARKER);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error(`Missing ${BEGIN_MARKER} / ${END_MARKER} markers in web/index.html.`);
  }
  const lineStart = normalized.lastIndexOf('\n', startIdx) + 1;
  const afterEnd = endIdx + END_MARKER.length;
  const bundle = buildCoreBrowserBundle(tsSource);
  return `${normalized.slice(0, lineStart)}${bundle}${normalized.slice(afterEnd)}`;
}

function isMainModule() {
  const entry = process.argv[1];
  if (!entry) return false;
  const selfPath = path.resolve(fileURLToPath(import.meta.url));
  const entryPath = path.resolve(entry);
  return process.platform === 'win32'
    ? selfPath.toLowerCase() === entryPath.toLowerCase()
    : selfPath === entryPath;
}

if (isMainModule()) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const corePath = path.join(repoRoot, 'src', 'core', 'boilerplate.ts');
  const webPath = path.join(repoRoot, 'web', 'index.html');
  const tsSource = readFileSync(corePath, 'utf-8');
  const webHtml = readFileSync(webPath, 'utf-8');
  const updated = injectCoreIntoWebHtml(webHtml, tsSource);
  writeFileSync(webPath, updated, 'utf-8');
  process.stdout.write('Updated web/index.html from src/core/boilerplate.ts.\n');
}
