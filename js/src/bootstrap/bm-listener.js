// ─── js/src/bootstrap/bm-listener.js · "bm" debug listener (leftover) ───
// Debug leftover: pops an alert when the page posts a "bm" message to
// itself. Kept for behavior parity with the original build.
// NOTE (suspicious, left as-is): it alerts `"best move: " + event`, which
// stringifies to "[object Event]" — it almost certainly meant event.data.
// Also, `this.alert` only works because addEventListener sets `this` to
// `window` for regular functions.
window.addEventListener(
  "bm",
  function (event) {
    if (event.source === window && event.data) {
      this.alert("best move: " + event);
    }
  },
  false,
);
