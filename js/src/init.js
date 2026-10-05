// ─── js/src/init.js · boots the BetterMint master and wires global shortcuts ───
// Entry point called once a chess board is found (see bootstrap/board-observer.js).
// Boot sequence: load the opening book into the shared eTable, then ask the
// background service worker (via ChromeRequest) for the stored settings and use
// them to construct the BetterMint master instance.
// Keyboard shortcuts (page context): r = re-analyze, v = play best move,
// h = toggle arrows, b = queue premove, c = play check move, m = toggle
// auto-move, n = play Lefong trap.
import {
  __awaiter,
  ChromeRequest,
  BetterMintmaster,
  setBetterMintmaster,
  setETable,
} from "./core.js";
import { BetterMint } from "./better-mint.js";
export function InitBetterMint(boardElement) {
  // The page injects a hidden #__asina-engine-urls script tag whose dataset
  // carries the URL of the opening book (book/eco.json).
  const engineUrlsScript = document.getElementById("__asina-engine-urls");
  const ecoUrl = engineUrlsScript ? engineUrlsScript.dataset.eco : "";
  // Load the opening book and mark every FEN ("f" field) as known in the
  // shared eTable, so the rest of the extension can tell book positions.
  fetch(ecoUrl).then(function (response) {
    return __awaiter(this, undefined, undefined, function* () {
      let ecoEntries = yield response.json();
      setETable(new Map(ecoEntries.map((entry) => [entry.f, true])));
    });
  });
  // Settings arrived from the background page — build the master and wire it up.
  ChromeRequest.getData().then(function (data) {
    try {
      setBetterMintmaster(new BetterMint(boardElement, data));
      BetterMintmaster.game.ApplyHidePlayers();
      BetterMintmaster.applyMobilePlayBtn(!!data["option-mobile-play-btn"]);
      BetterMintmaster.applyMobilePremoveBtn(
        !!data["option-mobile-premove-btn"],
      );
      BetterMintmaster._startAutoStartNewGameWatcher();
      BetterMintmaster._startClockReloadBtnWatcher();
      // Global keyboard shortcuts. Skipped while the user is typing in an
      // input, textarea, or contentEditable element.
      document.addEventListener("keydown", function (event) {
        const activeTagName =
          document.activeElement && document.activeElement.tagName;
        if (activeTagName === "INPUT" || activeTagName === "TEXTAREA") {
          return;
        }
        if (
          document.activeElement &&
          document.activeElement.isContentEditable
        ) {
          return;
        }
        // r — full engine reset: stop eval, clear top moves, send "ucinewgame",
        // refresh options and re-sync the position from the board.
        if (event.key === "r") {
          BetterMintmaster.engine.stopEvaluation(() => {
            BetterMintmaster.engine.topMoves = [];
            BetterMintmaster.engine.send("ucinewgame");
            BetterMintmaster.engine.UpdateOptions();
            BetterMintmaster.engine.UpdatePosition(
              BetterMintmaster.game.controller.getFEN(),
              false,
            );
          });
        }
        // v — play the engine's best move on the board.
        if (event.key === "v") {
          BetterMintmaster.engine.playBestMove();
        }
        // h — toggle the "hide arrows" option by broadcasting the updated
        // options object to any BetterMintUpdateOptions listeners.
        if (event.key === "h") {
          const hideArrowsEnabled =
            !!BetterMintmaster.options["option-hide-arrows"];
          const arrowPatch = {
            "option-hide-arrows": !hideArrowsEnabled,
          };
          const mergedOptions = Object.assign(
            {},
            BetterMintmaster.options,
            arrowPatch,
          );
          const eventInit = {
            detail: mergedOptions,
          };
          window.dispatchEvent(
            new CustomEvent("BetterMintUpdateOptions", eventInit),
          );
        }
        // b — queue a premove from the engine's last ponder move. Requires the
        // premove option, no pending Lefong trap, a ponder move, and a
        // chess.com board with a premove API; failures are logged, not fatal.
        if (event.key === "b") {
          try {
            const engine = BetterMintmaster.engine;
            if (!BetterMintmaster.options["option-premove-enabled"]) {
              return;
            }
            if (engine._lefongTrapPending) {
              return;
            }
            const lastPonder = engine.lastPonder;
            if (!lastPonder) {
              return;
            }
            const board = document.querySelector("wc-chess-board");
            if (!board || !board.game || !board.game.premoves) {
              return;
            }
            const premove = {
              from: lastPonder.from,
              to: lastPonder.to,
            };
            board.game.premoves.move(premove);
          } catch (error) {
            console.warn("[Premove] B hatası:", error);
          }
        }
        // c — play the engine's check move (best move that gives check).
        if (event.key === "c") {
          BetterMintmaster.engine.playCheckMove();
        }
        // m — toggle auto-move: broadcast the flipped option, then persist it
        // via AsinaPersistOption so the setting survives reloads.
        if (event.key === "m") {
          const automoveEnabled =
            !!BetterMintmaster.options["option-automove-enabled"];
          const automovePatch = {
            "option-automove-enabled": !automoveEnabled,
          };
          const mergedOptions = Object.assign(
            {},
            BetterMintmaster.options,
            automovePatch,
          );
          const eventInit = {
            detail: mergedOptions,
          };
          window.dispatchEvent(
            new CustomEvent("BetterMintUpdateOptions", eventInit),
          );
          window.dispatchEvent(
            new CustomEvent("AsinaPersistOption", {
              detail: {
                key: "option-automove-enabled",
                value: !automoveEnabled,
              },
            }),
          );
        }
        // n — play the Lefong trap (engine-side trap sequence).
        if (event.key === "n") {
          BetterMintmaster.engine.playLefongTrap();
        }
      });
      // Same reset sequence as the "r" shortcut, triggered by other parts of
      // the extension (e.g. after changing engine settings).
      window.addEventListener("AsinaReloadEngine", function () {
        BetterMintmaster.engine.stopEvaluation(() => {
          BetterMintmaster.engine.topMoves = [];
          BetterMintmaster.engine.send("ucinewgame");
          BetterMintmaster.engine.UpdateOptions();
          BetterMintmaster.engine.UpdatePosition(
            BetterMintmaster.game.controller.getFEN(),
            false,
          );
        });
      });
    } catch (error) {
      console.error("Oh noes! BetterMintmaster didn't load", error);
    }
  });
}
