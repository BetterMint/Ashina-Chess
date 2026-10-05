# Ashina V6 — Readable Source

**A chess analysis & auto-play companion for chess.com and lichess** — multi-engine, coach-graded, humanized timing, opening books, and stream-proof overlays.

This is the **fully deobfuscated source** of Ashina V6. Every file was recovered from an obfuscated single-line bundle: all identifiers renamed to readable names, every function documented, and the code split into focused modules with a real build system.

> **Upstream notice:** Ashina is a derivative of **BetterMint V2** (https://github.com/BetterMint/BetterMint) by the BetterMint team, with additional ideas adapted from ChessKiller (IMTUIZZ) and ChessHv3 (Red-Eric). The original author's note is preserved verbatim at the bottom of this file. BetterMint is distributed under the **Reciprocal Public License 1.5 (RPL 1.5)** — see [`LICENSE`](LICENSE). This derivative is accordingly licensed under RPL 1.5, which requires notices, attribution, and source availability when deployed.

## Quick start

```
npm install        # once — fetches the bundler (esbuild)
npm run build      # bundles js/src/ -> js/Ashina.js
```

Then: Chrome -> `chrome://extensions` -> **Developer mode** -> **Load unpacked** -> select this folder. Open any chess.com or lichess game.

**Never edit `js/Ashina.js` directly** — it is generated. Edit `js/src/**` (or the plain `js/*.js` scripts) and rebuild. `npm run watch` rebuilds automatically; `npm run minify` produces a compact build.

New to the codebase? Read **`START_HERE.md`** — a beginner-friendly walkthrough with step-by-step "how do I change X" recipes.

## Project layout

```
js/src/                  <- the application (edit these)
  index.js               bundle entry - module load order
  compat.js              exposes chess.js as window.Chess
  core.js                options bridge, shared state, helpers
  config/opening-book.js opening preferences + trap data (pure data)
  board/game-controller.js   chess.com board integration (arrows, bars, events)
  engine/stockfish-engine.js main engine driver + auto-move/premove/ultrabullet/trap logic
  engine/eval-engine.js      small Stockfish worker for the eval bar
  engine/coach-engine.js     Torch worker grading played moves
  engine/pre-coach-engine.js Torch worker for pre-move analysis
  engine/maia-engine.js      Maia 3 ONNX worker (human-like Elo moves)
  coach/coaches.js           coach persona catalog (pure data)
  coach/coach-audio.js       coach voice URL helpers
  coach/classification.js    move-grade icons (pure data)
  better-mint.js             master orchestrator (widgets, wiring)
  init.js                    boot + keyboard shortcuts
  bootstrap/                 board observer, WebRTC patch, debug listener
  vendor/chess.js            chess.js 1.0.0 (ESM) - do not modify
js/Ashina.js             GENERATED bundle - do not edit
js/loader.js             chess.com content script (injects Ashina.js)
js/lichess-loader.js     lichess content script (injects lichess.js)
js/lichess.js            lichess-side integration (mirrors Ashina.js)
js/options.js + html/    settings popup
js/background.js         service worker (audio proxy, stream window, debugger bridge)
js/floating.js           floating panel   js/themes.js  themes
js/stream.js             stream-proof window   js/i18n.js  translations (11 languages)
css/, img/, book/, engine/, lib/   assets: styles, icons, books, engine WASM/ONNX
```

## Keyboard shortcuts (in-game)

| Key | Action |
| --- | --- |
| r | Re-analyze (full engine reset) |
| v | Play best move |
| h | Toggle arrows |
| b | Queue premove |
| c | Play check move |
| m | Toggle auto-move |
| n | Play Lefong trap |

## Verifying your build

```
node --check js/Ashina.js     # syntax
npm run build                 # rebuild after any src change
```

Runtime behavior was not re-verified in a browser during deobfuscation - test manually after changes.

## Credits

- **BetterMint team** (thedemons, Webcubed, HotaVN, ProtonDev, BetterMint) - the original BetterMint V2 this project derives from
- **IMTUIZZ** (ChessKiller), **Red-Eric** (ChessHv3) - feature ideas adapted by Ashina
- **chess.js** (Jeff Hlywa) - chess rules library
- **Stockfish, Komodo, Torch, Maia 3** - the bundled engines

---

## Original author's note (preserved)

> Ashina is a modded version of BETTERMINT. This extension was developed as a hobby with the help of an AI agent and is completely free to use.
>
> Some Features were inspired by adapted from or further improved based ideas found in other extensions, including CHESSKILLER by IMTUIZZ and CHESSHV3 by RED-ERIC.
>
> This is probably the final release. Enjoy
>
> BetterMint:  https://github.com/BetterMint/BetterMint
> ChessHv3:    https://github.com/Red-Eric/ChessHv3
