/* Ashina V6 - stream.js (deobfuscated from stream.orig.js)
 * Page script for html/stream.html (the stream-proof popup window):
 * renders board position + top-move arrows on a canvas, eval/depth bars,
 * and the current theme. Receives ASHINA_STREAM_DATA messages forwarded
 * by background.js; theme via chrome.storage ("option-theme"). */
"use strict";

// Unicode glyphs for drawing pieces, keyed by "<color><type>" codes as
// produced by parseFen() (e.g. "wK" = white king).
const PIECE_UNICODE = {
  wK: "♔",
  wQ: "♕",
  wR: "♖",
  wB: "♗",
  wN: "♘",
  wP: "♙",
  bK: "♚",
  bQ: "♛",
  bR: "♜",
  bB: "♝",
  bN: "♞",
  bP: "♟",
};
// Board/piece palette (lichess-style colors). The stroke colors give the
// glyphs contrast against both light and dark squares.
const LIGHT_SQ = "#f0d9b5";
const DARK_SQ = "#b58863";
const PIECE_WHITE = "#fff";
const PIECE_BLACK = "#1a1a1a";
const PIECE_STROKE_W = "rgba(0,0,0,0.55)";
const PIECE_STROKE_B = "rgba(255,255,255,0.12)";
// Mutable stream state, seeded with the standard start position; updated by
// ASHINA_STREAM_DATA messages and read by render()/update*().
let currentFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
let currentMoves = [];
let currentCp = null;
let currentMate = null;
let currentDepth = 0;
let maxDepth = 20;
// --- Theme handling ---------------------------------------------------------
// Apply a theme's CSS custom properties to <html> so the popup chrome (bars,
// labels) matches the board. THEMES/DEFAULT_THEME_KEY are globals from
// themes.js; fall back to the built-in "ashina-red" theme.
function applyStreamTheme(themeKey) {
  if (typeof THEMES === "undefined") {
    return;
  }
  const resolvedKey =
    themeKey ||
    (typeof DEFAULT_THEME_KEY !== "undefined"
      ? DEFAULT_THEME_KEY
      : "ashina-red");
  const theme = THEMES[resolvedKey] || THEMES[DEFAULT_THEME_KEY];
  if (!theme) {
    return;
  }
  const rootEl = document.documentElement;
  Object.keys(theme.colors).forEach(function (cssVar) {
    rootEl.style.setProperty(cssVar, theme.colors[cssVar]);
  });
}
// Initial theme: read the saved "option-theme" from chrome.storage.sync once,
// then keep following live changes made in other extension pages.
const themeDefaults = {
  "option-theme":
    typeof DEFAULT_THEME_KEY !== "undefined" ? DEFAULT_THEME_KEY : "ashina-red",
};
chrome.storage.sync.get(themeDefaults, function (items) {
  applyStreamTheme(items["option-theme"]);
});
chrome.storage.onChanged.addListener(function (changes, area) {
  if (area === "sync" && changes["option-theme"]) {
    applyStreamTheme(changes["option-theme"].newValue);
  }
});
// DOM references, cached once on DOMContentLoaded (see bottom of file).
let canvas;
let ctx;
let evalFill;
let depthFill;
let infoCp;
let infoDepth;
let infoMoves;
let headerDepth;
// --- Canvas rendering pipeline ----------------------------------------------
// FEN placement field -> board[row][col] matrix of "wK"-style piece codes
// (uppercase letter = white, lowercase = black; digits = empty squares).
// Only the part before the first space is used; row 0 is rank 8 (top).
function parseFen(fen) {
  const board = [];
  const rows = fen.split(" ")[0].split("/");
  for (const row of rows) {
    const cells = [];
    for (const ch of row) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < parseInt(ch); i++) {
          cells.push(null);
        }
      } else {
        const color = ch === ch.toUpperCase() ? "w" : "b";
        cells.push(color + ch.toUpperCase());
      }
    }
    board.push(cells);
  }
  return board;
}
// Algebraic square ("e4") -> canvas grid coords: file 0-7 left-to-right
// ('a' = charCode 97), rank 0-7 top-to-bottom (rank 8 -> row 0).
function algebraicToCoords(square) {
  const file = square.charCodeAt(0) - 97;
  const rank = 8 - parseInt(square[1]);
  const coords = {
    file: file,
    rank: rank,
  };
  return coords;
}
// Size the canvas to the #stream-board container (460px fallback if the
// popup hasn't laid out yet), keep it square, then redraw.
function resizeCanvas() {
  const boardEl = document.getElementById("stream-board");
  const width = boardEl.offsetWidth || 460;
  canvas.width = width;
  canvas.height = width;
  render();
}
// 8x8 checkerboard; (row + col) % 2 === 0 marks the light squares.
function drawSquares() {
  const sqSize = canvas.width / 8;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? LIGHT_SQ : DARK_SQ;
      ctx.fillRect(col * sqSize, row * sqSize, sqSize, sqSize);
    }
  }
}
// Draw pieces as Unicode glyphs centered in each square. Font size is 72% of
// a square; stroke + fill keeps glyphs readable on both square colors.
// Unknown codes fall back to "?" instead of breaking the render loop.
function drawPieces(board) {
  const sqSize = canvas.width / 8;
  const fontSize = Math.floor(sqSize * 0.72);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = fontSize + "px serif";
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) {
        continue;
      }
      const cx = col * sqSize + sqSize / 2;
      const cy = row * sqSize + sqSize / 2;
      const isWhite = piece[0] === "w";
      ctx.lineWidth = fontSize * 0.08;
      ctx.strokeStyle = isWhite ? PIECE_STROKE_W : PIECE_STROKE_B;
      ctx.fillStyle = isWhite ? PIECE_WHITE : PIECE_BLACK;
      ctx.strokeText(PIECE_UNICODE[piece] || "?", cx, cy);
      ctx.fillText(PIECE_UNICODE[piece] || "?", cx, cy);
    }
  }
}
// Draw one arrow between square centers. Geometry (fractions of a square):
// shaft starts 0.22 off the source center, tip is pulled back 0.38 from the
// target center so the head doesn't cover the piece, head half-width 0.22,
// shaft line width 0.14. perpX/perpY = unit vector rotated 90 deg, used for
// the two head corners.
function drawArrow(from, to, color, alpha) {
  const sqSize = canvas.width / 8;
  const fromCoords = algebraicToCoords(from);
  const toCoords = algebraicToCoords(to);
  const x1 = fromCoords.file * sqSize + sqSize / 2;
  const y1 = fromCoords.rank * sqSize + sqSize / 2;
  const x2 = toCoords.file * sqSize + sqSize / 2;
  const y2 = toCoords.rank * sqSize + sqSize / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) {
    return;
  }
  const ux = dx / len;
  const uy = dy / len;
  const headLen = sqSize * 0.38;
  const headHalf = sqSize * 0.22;
  const shaftWidth = sqSize * 0.14;
  const tipX = x2 - ux * headLen;
  const tipY = y2 - uy * headLen;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = shaftWidth;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1 + ux * sqSize * 0.22, y1 + uy * sqSize * 0.22);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  const perpX = -uy;
  const perpY = ux;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(tipX + perpX * headHalf, tipY + perpY * headHalf);
  ctx.lineTo(tipX - perpX * headHalf, tipY - perpY * headHalf);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
// Draw top moves back-to-front so the best move (index 0) paints on top:
// red #FF3333 at alpha 0.9; the rest yellow #FECA57 fading 0.75, 0.60, ...
// with a 0.2 floor so deep alternatives stay visible.
function drawArrows(moves) {
  if (!moves || moves.length === 0) {
    return;
  }
  const bestColor = "#FF3333";
  const altColor = "#FECA57";
  for (let i = moves.length - 1; i >= 0; i--) {
    const move = moves[i];
    if (!move || !move.from || !move.to) {
      continue;
    }
    const color = i === 0 ? bestColor : altColor;
    const alpha = i === 0 ? 0.9 : Math.max(0.75 - (i - 1) * 0.15, 0.2);
    drawArrow(move.from, move.to, color, alpha);
  }
}
// Vertical eval bar: fill height as % of the bar. A mate score pins the fill
// to 95% (we mate) / 5% (we get mated); a cp score is clamped to +/-800
// centipawns (+/-8.00) and mapped onto the 5-95% range around the midpoint.
// Label: "M#" for mates, "+x.x"/"-x.x" pawns for cp (cp / 100), "—" if none.
function updateEvalBar(cp, mate) {
  let pct = 50;
  if (mate != null) {
    pct = mate > 0 ? 95 : 5;
  } else if (cp != null) {
    const clampedCp = Math.max(-800, Math.min(800, cp));
    pct = 50 + (clampedCp / 800) * 45;
  }
  evalFill.style.height = pct + "%";
  const label =
    mate != null
      ? mate > 0
        ? "M" + mate
        : "M" + Math.abs(mate)
      : cp != null
        ? cp >= 0
          ? "+" + (cp / 100).toFixed(1)
          : "" + (cp / 100).toFixed(1)
        : "—";
  infoCp.textContent = label;
}
// Horizontal depth bar: width = depth/maxDepth (capped at 100%); also
// mirrors the depth into the info line and the popup header.
function updateDepthBar(depth, max) {
  if (!max) {
    return;
  }
  depthFill.style.width = Math.min((depth / max) * 100, 100) + "%";
  infoDepth.textContent = depth;
  headerDepth.textContent = "depth " + depth;
}
// Info line: top 3 moves as "e2e4, d2d4, ..." (from+to squares concatenated).
function updateInfo(moves) {
  infoMoves.textContent =
    moves && moves.length
      ? moves
          .slice(0, 3)
          .map((move) => move.from + move.to)
          .join(", ")
      : "—";
}
// Full board redraw: clear -> squares -> pieces (from currentFen) -> arrows
// (from currentMoves). Called on resize and on every full data message.
function render() {
  if (!ctx) {
    return;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawSquares();
  drawPieces(parseFen(currentFen));
  drawArrows(currentMoves);
}
// --- Message protocol --------------------------------------------------------
// background.js forwards ASHINA_STREAM_DATA events captured on the chess
// page. Two payload flavors:
//  - eval-only updates (sfCp/sfMate from the engine): refresh the eval bar
//    and return early - no board repaint needed;
//  - full updates (fen/topMoves/depth/maxDepth/cp/mate): update state and
//    repaint board + all bars. Fields are applied individually so partial
//    messages never clobber unrelated state.
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== "ASHINA_STREAM_DATA") {
    return;
  }
  if (msg.fen) {
    currentFen = msg.fen;
  }
  if (msg.topMoves) {
    currentMoves = msg.topMoves;
  }
  if (msg.depth !== undefined) {
    currentDepth = msg.depth;
  }
  if (msg.maxDepth !== undefined) {
    maxDepth = msg.maxDepth;
  }
  if (msg.sfCp !== undefined || msg.sfMate !== undefined) {
    currentCp = msg.sfCp !== undefined ? msg.sfCp : currentCp;
    currentMate = msg.sfMate !== undefined ? msg.sfMate : currentMate;
    updateEvalBar(currentCp, currentMate);
    return;
  }
  if (msg.cp !== undefined) {
    currentCp = msg.cp;
  }
  if (msg.mate !== undefined) {
    currentMate = msg.mate;
  }
  render();
  updateEvalBar(currentCp, currentMate);
  updateDepthBar(currentDepth, maxDepth);
  updateInfo(currentMoves);
});
// --- Startup -----------------------------------------------------------------
// Cache DOM refs, then size/draw on the first animation frame (so the popup
// has its final layout) and keep redrawing on window resizes.
document.addEventListener("DOMContentLoaded", () => {
  canvas = document.getElementById("board-canvas");
  ctx = canvas.getContext("2d");
  evalFill = document.getElementById("eval-bar-fill");
  depthFill = document.getElementById("depth-bar-fill");
  infoCp = document.getElementById("info-cp");
  infoDepth = document.getElementById("info-depth");
  infoMoves = document.getElementById("info-moves");
  headerDepth = document.getElementById("header-depth");
  requestAnimationFrame(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
  });
});
