# HTML Boilerplate Generator

Build one clean, accessible HTML5 starter page with sensible defaults for headings, focus rings, reduced motion, and optional Open Graph tags, right in your browser or terminal.

Use it online at [patchbandit.com/tools/html-boilerplate-generator](https://patchbandit.com/tools/html-boilerplate-generator/), or clone this repo and run it yourself. MIT licensed; see `LICENSE`.

## Quick example

```bash
node src/cli.ts --title "Field Notes" --preset article -o index.html
```

Or import the library directly in Node 22+:

```ts
import { generateHtmlBoilerplate } from './src/core/index.ts';

const { html } = generateHtmlBoilerplate({
  title: 'Field Notes',
  description: 'A clean HTML5 starter with focus and motion defaults.',
  cssMode: 'inline-base',
});
```

## What it builds

- **Three starter presets:** `clean` (headings, focus rings, reduced motion, skip link, semantic landmarks, inline SVG favicon), `minimal` (bare HTML5 shell), and `article` (Open Graph + canonical tags + compact classless semantic CSS).
- **Modern `<head>` tags:** `<!doctype html>`, sanitized BCP 47 `lang`, UTF-8 charset, mobile viewport, `color-scheme: light dark`, `theme-color`, inline SVG data-URI favicon (prevents `/favicon.ico` 404s), optional canonical URL, Open Graph, and Twitter card tags.
- **Accessible CSS defaults:** `box-sizing: border-box`, readable 68ch measure, clear `:focus-visible` outlines, WCAG AA link contrast in both light and dark modes (auto-tinted `--accent-text` in dark mode plus light-mode contrast warnings), skip-to-content reveal styling, `prefers-color-scheme: dark`, and `prefers-reduced-motion: reduce`.
- **Safe output:** every user field is HTML-escaped; `javascript:`, `data:`, `vbscript:`, protocol-relative `//`, and backslash paths are rejected; hex colors are validated before entering CSS; placeholder `example.com` page URLs raise a warning.
- **Zero external dependencies:** runs in any modern browser (`web/index.html`) or Node 22.18+ (`src/cli.ts`).

## Privacy

Nothing leaves your device. The standalone web page (`web/index.html`) is a single static file built directly from `src/core/boilerplate.ts` with no server code, no uploads, no accounts, no analytics, no cookies, and a strict Content Security Policy blocking network connections.

## Standalone web page

Open `web/index.html` directly in your browser, or serve the `web/` folder from any static host. The page embeds the shared core from `src/core/boilerplate.ts` via `npm run build:web` (checked by `npm test`), and the live preview renders inside a strict `<iframe sandbox="">` with scripts and external links disabled.

## Command line

Requires Node 22.18+ (native TypeScript execution):

```bash
node src/cli.ts --help
node src/cli.ts --preset clean --title "My Page"
node src/cli.ts --preset article --title "Release Notes" --canonical https://example.com/notes/ -o index.html
```

Flags:

- `--preset clean|minimal|article` (default: `clean`)
- `--title <text>`
- `--description <text>`
- `--lang <code>` (default: `en`)
- `--author <text>`
- `--accent <#rrggbb>` (default: `#2563eb`)
- `--css none|linked|inline-base|inline-classless`
- `--stylesheet <path>` (used with `--css linked`)
- `--script none|defer|module`
- `--script-src <path>` (used with `--script defer|module`)
- `--canonical <https-url>` (enables canonical link)
- `--og` (enables Open Graph and Twitter card meta tags)
- `--og-image <https-url>`
- `--indent 2|4|tab` (default: `2`)
- `--comments` (include short section comments)
- `--no-viewport`, `--no-favicon`, `--no-skip`, `--no-landmarks`
- `-o, --out <file>` (write to file instead of stdout)

Exit codes: `0` success, `1` invalid usage or unknown option.

## Security notes

- All text inputs (`title`, `description`, `author`, `lang`, URLs, asset paths) are HTML-escaped before insertion into markup or attributes.
- Canonical and Open Graph image URLs accept only `http://` or `https://`.
- Stylesheet and script paths reject `javascript:`, `data:`, `vbscript:`, protocol-relative `//`, and backslash `\` paths.
- The browser UI uses DOM text APIs only (`textContent`, `.value`, `createElement`) and never writes user input to `innerHTML`.
- The live preview iframe runs with `sandbox=""` and strips external `<link>` and `<script>` tags so previewing makes no network requests.

## Not yet

- Multi-file zip export (separate `index.html`, `styles.css`, and `app.js` files in one archive).
- Custom `<meta>` key/value rows beyond the built-in head toggles.
- Built-in HTML validator diagnostics beyond the live defaults checklist.

## Tests

```bash
npm test
```

Tests cover presets, HTML/attribute escaping against XSS payloads, URL/color/path sanitization, favicon data URIs, CLI flags and file output, and repo hygiene (no absolute paths, no `innerHTML`).

## Credits

Patterns referenced under the MIT License from `h5bp/html5-boilerplate` (head tag ordering) and `kevquirk/simple.css` (classless semantic styling). See `NOTICE`.

## License

MIT. See `LICENSE` and `NOTICE`.

Built and maintained by [Patch Bandit](https://patchbandit.com). Got an idea for the next tool? Drop it in [ideas](https://github.com/patch-bandit/ideas/discussions).
