import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  generateHtmlBoilerplate,
  getPresetOptions,
  type BoilerplateOptions,
  type CssMode,
  type IndentMode,
  type PresetId,
  type ScriptMode,
} from './core/index.ts';

const HELP_TEXT = `HTML Boilerplate Generator (Patch Bandit, MIT)

Usage:
  node src/cli.ts [options]

Options:
  --preset <clean|minimal|article>              Starter preset (default: clean)
  --title <text>                                Page title
  --description <text>                          Meta description
  --lang <code>                                 HTML lang attribute (default: en)
  --author <text>                               Author meta tag
  --accent <#rrggbb>                            Accent and theme color (default: #2563eb)
  --css <none|linked|inline-base|inline-classless>
                                                CSS output mode
  --stylesheet <path>                           Stylesheet path (when --css linked)
  --script <none|defer|module>                  Script tag mode
  --script-src <path>                           Script path (when --script defer|module)
  --canonical <https-url>                       Enable canonical link with URL
  --og                                          Enable Open Graph and Twitter card meta
  --og-image <https-url>                        Social image URL (used with --og)
  --indent <2|4|tab>                            Indentation style (default: 2)
  --comments                                    Include helpful section comments
  --no-viewport                                 Omit viewport meta tag
  --no-favicon                                  Omit inline SVG favicon
  --no-skip                                     Omit skip-to-content link
  --no-landmarks                                Omit header/nav/footer landmarks
  -o, --out <file>                              Write output to file instead of stdout
  -h, --help                                    Show this help text
`;

export interface ParsedCli {
  help: boolean;
  outFile: string | null;
  options: BoilerplateOptions;
}

const VALID_PRESETS = new Set<PresetId>(['clean', 'minimal', 'article']);
const VALID_CSS = new Set<CssMode>(['none', 'linked', 'inline-base', 'inline-classless']);
const VALID_SCRIPT = new Set<ScriptMode>(['none', 'defer', 'module']);
const VALID_INDENT = new Set<IndentMode>(['2', '4', 'tab']);

export function parseCliArgs(argv: string[]): ParsedCli {
  let preset: PresetId = 'clean';
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '-h' || argv[i] === '--help') {
      return { help: true, outFile: null, options: getPresetOptions('clean') };
    }
    if (argv[i] === '--preset') {
      const val = argv[i + 1] as PresetId | undefined;
      if (!val || !VALID_PRESETS.has(val)) {
        throw new Error(`Invalid --preset value: ${val ?? '(missing)'}. Use clean, minimal, or article.`);
      }
      preset = val;
      i += 1;
    }
  }

  const options = getPresetOptions(preset);
  let outFile: string | null = null;

  const takeValue = (flag: string, idx: number): string => {
    const next = argv[idx + 1];
    if (next === undefined) {
      throw new Error(`Missing value for ${flag}.`);
    }
    return next;
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--preset':
        i += 1;
        break;
      case '--title':
        options.title = takeValue(arg, i);
        i += 1;
        break;
      case '--description':
        options.description = takeValue(arg, i);
        i += 1;
        break;
      case '--lang':
        options.lang = takeValue(arg, i);
        i += 1;
        break;
      case '--author':
        options.author = takeValue(arg, i);
        i += 1;
        break;
      case '--accent':
        options.accentColor = takeValue(arg, i);
        i += 1;
        break;
      case '--css': {
        const val = takeValue(arg, i) as CssMode;
        if (!VALID_CSS.has(val)) {
          throw new Error(`Invalid --css value: ${val}. Use none, linked, inline-base, or inline-classless.`);
        }
        options.cssMode = val;
        i += 1;
        break;
      }
      case '--stylesheet':
        options.stylesheetHref = takeValue(arg, i);
        i += 1;
        break;
      case '--script': {
        const val = takeValue(arg, i) as ScriptMode;
        if (!VALID_SCRIPT.has(val)) {
          throw new Error(`Invalid --script value: ${val}. Use none, defer, or module.`);
        }
        options.scriptMode = val;
        i += 1;
        break;
      }
      case '--script-src':
        options.scriptSrc = takeValue(arg, i);
        i += 1;
        break;
      case '--canonical':
        options.includeCanonical = true;
        options.canonicalUrl = takeValue(arg, i);
        i += 1;
        break;
      case '--og':
        options.includeOpenGraph = true;
        break;
      case '--og-image':
        options.includeOpenGraph = true;
        options.ogImageUrl = takeValue(arg, i);
        i += 1;
        break;
      case '--indent': {
        const val = takeValue(arg, i) as IndentMode;
        if (!VALID_INDENT.has(val)) {
          throw new Error(`Invalid --indent value: ${val}. Use 2, 4, or tab.`);
        }
        options.indent = val;
        i += 1;
        break;
      }
      case '--comments':
        options.includeComments = true;
        break;
      case '--no-viewport':
        options.includeViewport = false;
        break;
      case '--no-favicon':
        options.includeFavicon = false;
        break;
      case '--no-skip':
        options.includeSkipLink = false;
        break;
      case '--no-landmarks':
        options.includeLandmarks = false;
        break;
      case '-o':
      case '--out':
        outFile = takeValue(arg, i);
        i += 1;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}. Run with --help for usage.`);
    }
  }

  return { help: false, outFile, options };
}

export function runCli(argv: string[]): number {
  let parsed: ParsedCli;
  try {
    parsed = parseCliArgs(argv);
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n`);
    return 1;
  }

  if (parsed.help) {
    process.stdout.write(HELP_TEXT);
    return 0;
  }

  const result = generateHtmlBoilerplate(parsed.options);
  for (const warning of result.warnings) {
    process.stderr.write(`Warning: ${warning}\n`);
  }

  if (parsed.outFile) {
    writeFileSync(parsed.outFile, result.html, 'utf-8');
  } else {
    process.stdout.write(result.html);
  }
  return 0;
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  const selfPath = path.resolve(fileURLToPath(import.meta.url));
  const entryPath = path.resolve(entry);
  return process.platform === 'win32'
    ? selfPath.toLowerCase() === entryPath.toLowerCase()
    : selfPath === entryPath;
}

if (isMainModule()) {
  process.exitCode = runCli(process.argv.slice(2));
}
