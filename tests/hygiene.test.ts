import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { BEGIN_MARKER, END_MARKER, injectCoreIntoWebHtml } from '../scripts/build-web.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.tmp']);

function walk(dir: string): string[] {
  const results: string[] = [];
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      results.push(...walk(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

test('repository carries MIT license for Patch Bandit, accurate Node engine, and live link in README', () => {
  const license = readFileSync(path.join(REPO_ROOT, 'LICENSE'), 'utf-8');
  assert.match(license, /MIT License/);
  assert.match(license, /Copyright \(c\) 2026 Patch Bandit/);

  const pkg = JSON.parse(readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf-8'));
  assert.equal(pkg.engines?.node, '>=22.18.0');

  const readme = readFileSync(path.join(REPO_ROOT, 'README.md'), 'utf-8');
  assert.match(readme, /https:\/\/patchbandit\.com\/tools\/html-boilerplate-generator\//);
  assert.match(readme, /Built and maintained by \[Patch Bandit\]\(https:\/\/patchbandit\.com\)/);
  assert.match(readme, /^## Not yet$/m);
});

test('repository contains no absolute machine paths and no innerHTML sinks', () => {
  const absPathRe = /\b[A-Za-z]:[\\/](?:git|Users|python)\b/;
  const innerHtmlRe = /\.\s*innerHTML\s*=/;
  for (const file of walk(REPO_ROOT)) {
    const rel = path.relative(REPO_ROOT, file).replace(/\\/g, '/');
    const text = readFileSync(file, 'utf-8');
    if (rel !== 'tests/hygiene.test.ts') {
      assert.doesNotMatch(text, absPathRe, `Absolute machine path found in ${rel}`);
      assert.doesNotMatch(text, innerHtmlRe, `innerHTML assignment found in ${rel}`);
    }
  }
});

test('standalone web page uses strict sandbox iframe, CSP connect-src none, and shared core', () => {
  const webHtml = readFileSync(path.join(REPO_ROOT, 'web', 'index.html'), 'utf-8');
  const coreTs = readFileSync(path.join(REPO_ROOT, 'src', 'core', 'boilerplate.ts'), 'utf-8');

  assert.match(webHtml, /Content-Security-Policy/);
  assert.match(webHtml, /connect-src 'none'/);
  assert.match(webHtml, /<iframe[^>]+sandbox=""/);
  assert.ok(webHtml.includes(BEGIN_MARKER), 'web/index.html must include generated core begin marker');
  assert.ok(webHtml.includes(END_MARKER), 'web/index.html must include generated core end marker');

  const expectedWebHtml = injectCoreIntoWebHtml(webHtml, coreTs);
  assert.equal(
    webHtml.replace(/\r\n/g, '\n'),
    expectedWebHtml,
    'web/index.html generated core is out of sync with src/core/boilerplate.ts; run npm run build:web',
  );

  // Confirm no unescaped </script> inside the single <script> element and that the embedded core executes cleanly.
  const scriptMatches = [...webHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scriptMatches.length, 1, 'web/index.html should contain exactly one <script> block');
  const scriptBody = scriptMatches[0][1];
  const coreSlice = scriptBody.slice(scriptBody.indexOf(BEGIN_MARKER), scriptBody.indexOf(END_MARKER));
  assert.doesNotMatch(coreSlice, /<\/script/i, 'embedded core must escape </script> sequences');

  const sandbox: Record<string, unknown> = { TextEncoder, URL };
  vm.runInNewContext(`${coreSlice}\nthis.exportedCore = core;`, sandbox);
  const embedded = sandbox.exportedCore as {
    generateHtmlBoilerplate: (opts?: Record<string, unknown>) => { html: string; warnings: string[] };
    sanitizeAssetPath: (raw: string, fallback: string) => { valid: boolean };
  };
  const base = embedded.generateHtmlBoilerplate({ cssMode: 'inline-base' });
  const classless = embedded.generateHtmlBoilerplate({ cssMode: 'inline-classless' });
  assert.notEqual(base.html, classless.html, 'inline-classless must differ from inline-base in standalone page');
  assert.match(classless.html, /blockquote \{/);
  assert.equal(embedded.sanitizeAssetPath('\\\\evil.example/a.js', 'app.js').valid, false);
});
