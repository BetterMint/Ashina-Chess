// ─── js/src/bootstrap/board-observer.js · waits for a chess board, then boots ───
// Watches the DOM until chess.com mounts its <wc-chess-board> element (or the
// legacy <chess-board>), then calls InitBetterMint once and disconnects.
import { InitBetterMint } from "../init.js";
const observer = new MutationObserver(async function (mutations) {
  mutations.forEach(async function (mutation) {
    mutation.addedNodes.forEach(async function (node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName == "WC-CHESS-BOARD" || node.tagName == "CHESS-BOARD") {
          // Only boot once the board element exposes its "game" API —
          // chess.com attaches it after the custom element upgrades.
          if (Object.hasOwn(node, "game")) {
            InitBetterMint(node);
            observer.disconnect();
          }
        }
      }
    });
  });
});
// Observe the whole document: the board can be mounted anywhere, at any time.
observer.observe(document, {
  childList: true,
  subtree: true,
});
