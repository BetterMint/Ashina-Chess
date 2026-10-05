# START HERE — Beginner's Guide to Modifying This Extension

This is the deobfuscated source of **Ashina V6**, a chess analysis/auto-play extension for chess.com and lichess. Every file has been renamed from `_0x…` gibberish to readable names and commented. This guide explains how the pieces fit and how to change things — no prior experience with the codebase needed.

## 30-second overview

```
You open chess.com or lichess
  → the content script (js/loader.js or js/lichess-loader.js) runs
  → it injects the main brain (js/Ashina.js on chess.com, js/lichess.js on lichess) into the page
  → the brain finds the chess board, starts a chess engine (Stockfish/Komodo/Torch/Maia)
  → the engine analyzes positions; arrows + eval bar + coach appear on the board
  → optional: auto-move plays moves for you, with human-like timing
```

## The files, in plain language

| File | What it does |
| --- | --- |
| `js/src/index.js` | Bundle entry — lists all modules in load order. Start reading here. |
| `js/src/core.js` | Shared helpers: reading options, the options bridge to the popup, global state. |
| `js/src/config/opening-book.js` | Hardcoded opening first-moves and trap lines (plain data — easy to edit). |
| `js/src/board/game-controller.js` | Talks to the chess.com board: reads moves, draws arrows/eval bar. |
| `js/src/engine/stockfish-engine.js` | THE BIG ONE — runs the engine, parses its output, decides moves (auto-move, premoves, ultrabullet, traps). |
| `js/src/engine/eval-engine.js` | A small second engine that only feeds the eval bar. |
| `js/src/engine/coach-engine.js` | Grades your moves (Brilliant → Blunder) like chess.com's review. |
| `js/src/engine/pre-coach-engine.js` | Same grading, but for moves you're about to play. |
| `js/src/engine/maia-engine.js` | Maia neural net — picks human-like moves at a chosen Elo. |
| `js/src/coach/coaches.js` | The coach personas (names, voices, pictures). Pure data. |
| `js/src/coach/classification.js` | The move-grade icons (SVGs). Pure data. |
| `js/src/better-mint.js` | The orchestrator that wires everything together. |
| `js/src/init.js` | Startup + keyboard shortcuts. |
| `js/src/vendor/chess.js` | The chess rules library (chess.js 1.0.0) — don't modify. |
| `js/loader.js`, `js/lichess-loader.js` | Content scripts: the bridge between the page and the extension. |
| `js/options.js` + `html/options.html` | The settings popup. |
| `js/background.js` | Background worker: audio proxy, stream window, lichess debugger bridge. |
| `js/floating.js` | The small floating panel on the page. |
| `js/themes.js` | Color themes. |
| `js/stream.js` | The stream-proof overlay window. |
| `js/i18n.js` | Translations (11 languages). Pure data. |

## Build & install

```
npm install        # once — downloads the bundler (esbuild)
npm run build      # bundles js/src/ → js/Ashina.js
```

Then: Chrome → `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select this folder. That's it.

**Golden rule:** never edit `js/Ashina.js` — it's generated. Edit files under `js/src/` (or the plain `js/*.js` scripts) and run `npm run build`. Use `npm run watch` while developing — it rebuilds automatically.

## "How do I change …?" — the recipes

### …the default analysis depth?
`js/src/core.js` → `enumOptions` maps friendly names to setting keys. The defaults live in `js/options.js` (`DEFAULTS`) and `js/loader.js` (`inputObjects`). Change `"option-depth": 6` in both places, rebuild.

### …the auto-move timing?
`js/src/engine/stockfish-engine.js` → `scheduleAutoMove()`. The delay comes from `computeLichessAutoMoveDelay()`-style math: midpoint of min/max + Box-Muller noise, shaped by the center-weight setting. The min/max/centerweight defaults are in `js/options.js` (`option-automove-min/max/centerweight`).

### …the opening moves it plays?
`js/src/config/opening-book.js` — plain data. Each entry is `{ type, from, to }` (plus `trigger` for black replies). Add your own line, rebuild.

### …the Lefong trap / ultrabullet behavior?
Same file: `ULTRABULLET_OPENING_BOOK` (scripted trap lines), `LEFONG_TRAP_*` (piece values/weights), `ULTRABULLET_CHANCE_LOCK_MOVES` (how many opening moves are script-controlled before random chances start).

### …the coach personas (names/voices/pictures)?
`js/src/coach/coaches.js` — each entry is a coach. Copy one, change `voiceId`/`name`/`imageUrl`, add it to the list. It shows up in the settings dropdown (see `html/options.html`).

### …the keyboard shortcuts?
`js/src/init.js` → the `keydown` listener. Keys: `r` re-analyze, `v` play best, `h` toggle arrows, `b` premove, `c` check move, `m` auto-move, `n` Lefong trap.

### …the colors of the arrows?
Settings popup → arrow colors (stored as `option-color-best-arrow` / `option-color-other-arrow`). Default values in `js/options.js` → `DEFAULTS`.

### …a new engine?
`js/src/engine/stockfish-engine.js` → the `constructor` has an `engineSource` if/else chain (komodo / torch / maia / websocket). Add a branch, point it at your engine's worker script URL (served from the extension, listed in `manifest.json` → `web_accessible_resources`, and exposed to the page via the `__asina-engine-urls` meta tag built in `js/loader.js`).

### …translations?
`js/i18n.js` — a dictionary per language (11 languages × 152 keys). Add/edit keys; the popup reads them by `data-i18n` attributes.

## Debugging

- Open the page's DevTools console (F12) — the engine logs with `[ASHINA-DBG]` prefixes.
- The extension's own console (service worker logs): `chrome://extensions` → ASHINA → "service worker".
- After changes: rebuild, then hit the reload icon on the extension card, then refresh the chess tab.
- Keyboard shortcut `r` re-runs analysis if the arrows look stale.

## Gotchas

- `js/Ashina.js` is **generated** — editing it directly works until the next build.
- The chess.com and lichess sides are **separate implementations** (Ashina.js vs lichess.js) that mirror each other. A feature change usually needs both.
- Options must exist in **three** places to appear in the UI: `DEFAULTS` (js/options.js), the HTML control (html/options.html), and the loader defaults (js/loader.js). Missing one causes "option is undefined" bugs.
- Some option defaults intentionally differ between files (e.g. depth 8 in the loader vs 6 in options) — the options-page value wins once the user opens settings.
- Turkish comments/strings are from the original author — they're preserved on purpose.
