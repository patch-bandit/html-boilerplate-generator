import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseCliArgs } from '../src/cli.ts';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI_PATH = path.join(REPO_ROOT, 'src', 'cli.ts');
const TMP_BASE = path.join(REPO_ROOT, '.tmp');

test('parseCliArgs handles presets, flags, and errors', () => {
  const parsed = parseCliArgs([
    '--preset',
    'article',
    '--title',
    'Launch Notes',
    '--lang',
    'es',
    '--indent',
    '4',
    '--comments',
  ]);
  assert.equal(parsed.help, false);
  assert.equal(parsed.options.title, 'Launch Notes');
  assert.equal(parsed.options.lang, 'es');
  assert.equal(parsed.options.indent, '4');
  assert.equal(parsed.options.includeComments, true);
  assert.equal(parsed.options.includeOpenGraph, true);

  assert.throws(() => parseCliArgs(['--preset', 'unknown']), /Invalid --preset/);
  assert.throws(() => parseCliArgs(['--nope']), /Unknown argument/);
});

test('CLI prints help, writes escaped HTML to stdout/file, and cleans only its own temp folder', () => {
  const helpOut = execFileSync(process.execPath, [CLI_PATH, '--help'], { encoding: 'utf-8' });
  assert.match(helpOut, /HTML Boilerplate Generator/);

  const stdoutHtml = execFileSync(
    process.execPath,
    [CLI_PATH, '--preset', 'minimal', '--title', 'A < B & C'],
    { encoding: 'utf-8' },
  );
  assert.match(stdoutHtml, /^<!doctype html>/);
  assert.match(stdoutHtml, /<title>A &lt; B &amp; C<\/title>/);

  mkdirSync(TMP_BASE, { recursive: true });
  const dir = mkdtempSync(path.join(TMP_BASE, 'pb-hb-'));
  try {
    const outPath = path.join(dir, 'index.html');
    execFileSync(
      process.execPath,
      [CLI_PATH, '--preset', 'clean', '--title', 'File Output', '-o', outPath],
      { encoding: 'utf-8' },
    );
    const written = readFileSync(outPath, 'utf-8');
    assert.match(written, /<title>File Output<\/title>/);
    assert.match(written, /prefers-reduced-motion: reduce/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    try {
      rmdirSync(TMP_BASE);
    } catch {
      // Leave .tmp alone if other files exist inside it.
    }
  }
  assert.equal(existsSync(dir), false);
});

test('importing src/cli.ts from another script ending in cli.ts does not execute the CLI', () => {
  mkdirSync(TMP_BASE, { recursive: true });
  const dir = mkdtempSync(path.join(TMP_BASE, 'pb-hb-import-'));
  try {
    const callerPath = path.join(dir, 'cli.ts');
    const cliUrl = pathToFileURL(CLI_PATH).href;
    writeFileSync(
      callerPath,
      `import { parseCliArgs } from ${JSON.stringify(cliUrl)};\nconsole.log('IMPORTED:' + typeof parseCliArgs);\n`,
      'utf-8',
    );
    const out = execFileSync(process.execPath, [callerPath, '--bogus-flag-should-not-run-cli'], {
      encoding: 'utf-8',
    });
    assert.equal(out.trim(), 'IMPORTED:function');
  } finally {
    rmSync(dir, { recursive: true, force: true });
    try {
      rmdirSync(TMP_BASE);
    } catch {
      // Leave .tmp alone if other files exist inside it.
    }
  }
});
