// Ashina V6 — js/lichess.js: lichess.org board integration (page-context script).
// Runs inside the lichess.org page, injected by js/lichess-loader.js (content script):
// reads moves/positions, draws arrows & eval UI, plays moves (drag via AshinaLichessDragMove events),
// bridges the engine WebSocket (AshinaWs* events) and renders the coach UI.
// Deobfuscated from the original obfuscated build — see js/lichess.orig.js for the untouched backup.
// Verify: node --check passes; webcrack (string-array/rotation/decoder removed) + prettier; 2026-10-04.
"use strict";

const OPENING_BOOK = {
  white: {
    center: {
      type: "unconditional",
      from: "e2",
      to: "e4",
    },
    english: {
      type: "unconditional",
      from: "c2",
      to: "c4",
    },
    larsen: {
      type: "unconditional",
      from: "b2",
      to: "b3",
    },
    reti: {
      type: "unconditional",
      from: "g1",
      to: "f3",
    },
  },
  black: {
    modern: {
      type: "unconditional",
      from: "g7",
      to: "g6",
    },
    caro: {
      type: "conditional",
      trigger: "e2e4",
      from: "c7",
      to: "c6",
    },
    scandinavian: {
      type: "conditional",
      trigger: "e2e4",
      from: "d7",
      to: "d5",
    },
    sicilian: {
      type: "conditional",
      trigger: "e2e4",
      from: "c7",
      to: "c5",
    },
    pirc: {
      type: "conditional",
      trigger: "e2e4",
      from: "d7",
      to: "d6",
    },
    french: {
      type: "conditional",
      trigger: "e2e4",
      from: "e7",
      to: "e6",
    },
    indian: {
      type: "conditional",
      trigger: "d2d4",
      from: "g7",
      to: "g6",
    },
    englund: {
      type: "conditional",
      trigger: "d2d4",
      from: "e7",
      to: "e5",
    },
  },
};
// Reads which side we are playing from the lichess board ("white"/"black").
function getLichessSide() {
  const boardWrap = document.querySelector(".cg-wrap");
  if (!boardWrap) {
    return "white";
  }
  if (boardWrap.classList.contains("orientation-black")) {
    return "black";
  } else {
    return "white";
  }
}
// Draws one arrow on chessground's SVG shape layer (best-move highlight).
function drawArrow(fromSquare, toSquare, color = "#FF3333", opacity = 1) {
  const shapesSvg = document.querySelector(".cg-shapes");
  const shapesDefs = document.querySelector(".cg-shapes defs");
  const shapesGroup = document.querySelector(".cg-shapes g");
  if (!shapesDefs || !shapesGroup) {
    if (shapesSvg) {
      console.log(
        "[ASHINA-DBG][lichess.js][drawArrow] .cg-shapes innerHTML:",
        shapesSvg.outerHTML.slice(0, 300),
      );
    }
    return;
  }
  const isBlackView = getLichessSide() === "black";
  const markerId = "ashina-arrowhead-" + color.replace("#", "");
  const squareToCoords = (square) => {
    const fileIndex = square.charCodeAt(0) - 96;
    const rankNumber = parseInt(square[1]);
    if (isBlackView) {
      return {
        x: 4.5 - fileIndex,
        y: rankNumber - 4.5,
      };
    } else {
      return {
        x: fileIndex - 4.5,
        y: 4.5 - rankNumber,
      };
    }
  };
  const fromCoords = squareToCoords(fromSquare);
  const toCoords = squareToCoords(toSquare);
  const dx = toCoords.x - fromCoords.x;
  const dy = toCoords.y - fromCoords.y;
  const arrowLength = Math.sqrt(dx * dx + dy * dy);
  const headInset = 0.15625;
  const endX = toCoords.x - (dx / arrowLength) * headInset;
  const endY = toCoords.y - (dy / arrowLength) * headInset;
  if (!shapesDefs.querySelector("#" + markerId)) {
    const marker = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "marker",
    );
    marker.setAttribute("id", markerId);
    marker.setAttribute("orient", "auto");
    marker.setAttribute("overflow", "visible");
    marker.setAttribute("markerWidth", "4");
    marker.setAttribute("markerHeight", "4");
    marker.setAttribute("refX", "2.05");
    marker.setAttribute("refY", "2");
    const markerPath = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    markerPath.setAttribute("d", "M0,0 V4 L3,2 Z");
    markerPath.setAttribute("fill", color);
    marker.appendChild(markerPath);
    shapesDefs.appendChild(marker);
  }
  const lineEl = document.createElementNS("http://www.w3.org/2000/svg", "line");
  lineEl.setAttribute("stroke", color);
  lineEl.setAttribute("stroke-width", "0.15625");
  lineEl.setAttribute("stroke-linecap", "round");
  lineEl.setAttribute("marker-end", "url(#" + markerId + ")");
  lineEl.setAttribute("opacity", String(opacity));
  lineEl.setAttribute("x1", String(fromCoords.x));
  lineEl.setAttribute("y1", String(fromCoords.y));
  lineEl.setAttribute("x2", String(endX));
  lineEl.setAttribute("y2", String(endY));
  shapesGroup.appendChild(lineEl);
}
// Removes every engine arrow from the shape layer.
function clearArrows() {
  const shapesGroup = document.querySelector(".cg-shapes g");
  if (shapesGroup) {
    shapesGroup.innerHTML = "";
  }
}
// Draws the ranked MultiPV arrows: best move in the accent color, alternatives faded by rank.
function drawMultipvArrows(moves) {
  clearArrows();
  if (lichessOptions["option-stream-mode"]) {
    return;
  }
  if (lichessOptions["option-hide-arrows"]) {
    return;
  }
  const predDepth = lichessOptions["option-pred-depth"] || 0;
  const usePredictionLines =
    lichessEngine.multipv === 1 &&
    predDepth > 0 &&
    lichessEngine.source === "komodo" &&
    moves[0]?.line?.length;
  if (usePredictionLines) {
    const bestColor = lichessOptions["option-color-best-arrow"] || "#FF3333";
    const otherColor = lichessOptions["option-color-other-arrow"] || "#FECA57";
    const firstLine = moves[0].line;
    const engineDepth = lichessEngine.depth;
    const arrowCount = Math.min(predDepth, firstLine.length, engineDepth);
    for (let i = 0; i < arrowCount; i++) {
      const lineMove = firstLine[i];
      if (!lineMove || lineMove.length < 4) {
        break;
      }
      const fromSq = lineMove.substring(0, 2);
      const toSq = lineMove.substring(2, 4);
      const arrowColor = i % 2 === 0 ? bestColor : otherColor;
      const arrowOpacity = Math.max(1 - Math.floor(i / 2) * 0.2, 0.2);
      drawArrow(fromSq, toSq, arrowColor, arrowOpacity);
    }
    return;
  }
  const bestColor = lichessOptions["option-color-best-arrow"] || "#FF3333";
  const otherColor = lichessOptions["option-color-other-arrow"] || "#FECA57";
  [...moves].reverse().forEach((move, reversedIndex) => {
    const moveIndex = moves.length - 1 - reversedIndex;
    const arrowColor = moveIndex === 0 ? bestColor : otherColor;
    const arrowOpacity =
      moveIndex === 0
        ? 1
        : moveIndex === 1
          ? 1
          : Math.max(1 - (moveIndex - 1) * 0.2, 0.2);
    drawArrow(move.from, move.to, arrowColor, arrowOpacity);
  });
}
// Injects the evaluation bar DOM next to the lichess board.
function lichessCreateEvalBar() {
  if (document.getElementById("ashina-eval-bar")) {
    return;
  }
  const siteGauge = document.querySelector(".eval-gauge");
  if (siteGauge) {
    siteGauge.style.display = "none";
  }
  const board = document.querySelector("cg-board");
  if (!board || !board.parentNode) {
    return;
  }
  if (!document.getElementById("ashina-eval-bar-style")) {
    const styleEl = document.createElement("style");
    styleEl.id = "ashina-eval-bar-style";
    styleEl.textContent =
      "\n      #ashina-eval-bar {\n        position: relative;\n        left: -50px;\n        width: 20px;\n        flex-shrink: 0;\n        z-index: 9999;\n      }\n      #ashina-eval-bar-inner {\n        border-radius: .2rem;\n        flex-shrink: 0;\n        height: 100%;\n        position: relative;\n        user-select: none;\n        width: 20px;\n        cursor: default;\n      }\n      #ashina-eval-bar-fill {\n        background-color: hsla(0,0%,100%,.05);\n        border-radius: .2rem;\n        height: 100%;\n        overflow: hidden;\n        position: relative;\n        width: 100%;\n        z-index: -1;\n      }\n      .ashina-eval-color {\n        bottom: 0;\n        height: 100%;\n        left: 0;\n        position: absolute;\n        transition: transform 1s ease-in;\n        width: 100%;\n      }\n      #ashina-eval-white {\n        background-color: #fff;\n        z-index: 2;\n        transform: translate3d(0px, 50%, 0px);\n      }\n      #ashina-eval-black {\n        background-color: #403d39;\n        z-index: 1;\n      }\n      #ashina-eval-draw {\n        background-color: #777574;\n        z-index: 0;\n      }\n      #ashina-eval-score {\n        display: none;\n        font-size: 1.2rem;\n        font-weight: 600;\n        hyphens: auto;\n        padding: .5rem .2rem;\n        position: absolute;\n        text-align: center;\n        width: 100%;\n        z-index: 2;\n      }\n      #ashina-eval-score.ashina-eval-dark {\n        bottom: 0;\n        color: #403d39;\n      }\n      #ashina-eval-score.ashina-eval-light {\n        color: #fff;\n        top: 0;\n      }\n      #ashina-eval-bar-inner:hover #ashina-eval-score {\n        border-radius: .3rem;\n        bottom: auto;\n        display: block;\n        font-weight: 700;\n        padding: .1rem .5rem;\n        position: absolute;\n        text-align: center;\n        top: 50%;\n        transform: translate(calc(10px - 50%), -50%);\n        transition: opacity .2s;\n        transition-delay: .1s;\n        width: 45px;\n        z-index: 2;\n      }\n      #ashina-eval-bar-inner:hover #ashina-eval-score.ashina-eval-dark {\n        background-color: #fff;\n        color: #403d39;\n      }\n      #ashina-eval-bar-inner:hover #ashina-eval-score.ashina-eval-light {\n        background-color: #403d39;\n        color: #fff;\n      }\n      #ashina-eval-scoreAbbreviated {\n        font-size: 1rem;\n        font-weight: 600;\n        padding: .5rem 0;\n        position: absolute;\n        text-align: center;\n        white-space: pre;\n        width: 100%;\n        z-index: 2;\n      }\n      #ashina-eval-scoreAbbreviated.ashina-eval-dark {\n        bottom: 0;\n        color: #403d39;\n      }\n      #ashina-eval-scoreAbbreviated.ashina-eval-light {\n        color: #fff;\n        top: 0;\n      }\n    ";
    document.head.appendChild(styleEl);
  }
  const bar = document.createElement("div");
  bar.id = "ashina-eval-bar";
  bar.innerHTML =
    '\n    <div id="ashina-eval-bar-inner">\n      <span id="ashina-eval-scoreAbbreviated" class="ashina-eval-dark">0.0</span>\n      <span id="ashina-eval-score" class="ashina-eval-dark">+0.00</span>\n      <div id="ashina-eval-bar-fill">\n        <div id="ashina-eval-black" class="ashina-eval-color"></div>\n        <div id="ashina-eval-draw"  class="ashina-eval-color"></div>\n        <div id="ashina-eval-white" class="ashina-eval-color"></div>\n      </div>\n    </div>';
  board.parentNode.style.display = "flex";
  board.parentNode.insertBefore(bar, board);
  const barInner = bar.querySelector("#ashina-eval-bar-inner");
  const syncHeight = () => {
    const boardHeight = board.offsetHeight;
    if (boardHeight > 0) {
      barInner.style.height = boardHeight + "px";
    }
  };
  syncHeight();
  if (window.ResizeObserver) {
    new ResizeObserver(syncHeight).observe(board);
  } else {
    window.addEventListener("resize", syncHeight);
  }
}
// Removes the evaluation bar and its layout class.
function lichessRemoveEvalBar() {
  const bar = document.getElementById("ashina-eval-bar");
  if (bar) {
    bar.remove();
  }
  const siteGauge = document.querySelector(".eval-gauge");
  if (siteGauge) {
    siteGauge.style.display = "";
  }
}
// Injects the search-depth progress bar under the board.
function lichessCreateDepthBar() {
  if (document.getElementById("ashina-depth-bar-lichess")) {
    return;
  }
  const mainBoard = document.querySelector(".round__app__board.main-board");
  const boardWrap = document.querySelector(".cg-wrap");
  const anchor = mainBoard || boardWrap;
  if (!anchor) {
    return;
  }
  if (!document.getElementById("ashina-depth-bar-style-lichess")) {
    const styleEl = document.createElement("style");
    styleEl.id = "ashina-depth-bar-style-lichess";
    styleEl.textContent =
      "\n      .round__app__board.main-board { position: relative; }\n      #ashina-depth-bar-lichess {\n        position: absolute;\n        top: 100%;\n        left: 0;\n        width: 100%;\n        height: 5px;\n        background: #111;\n        z-index: 9998;\n        margin-top: 2px;\n        pointer-events: none;\n        overflow: visible;\n      }\n      #ashina-depth-bar-fill-lichess {\n        display: block;\n        height: 100%;\n        width: 0%;\n        background-color: var(--theme-accent, #ff0a2f);\n        box-shadow: 0 0 8px rgba(var(--theme-accent-rgb, 255, 10, 47), 0.5);\n        transition: width 100ms ease;\n      }\n      #ashina-depth-bar-fill-lichess.disable-transition {\n        transition: none !important;\n      }\n    ";
    document.head.appendChild(styleEl);
  }
  const bar = document.createElement("div");
  bar.id = "ashina-depth-bar-lichess";
  bar.innerHTML = '<div id="ashina-depth-bar-fill-lichess"></div>';
  anchor.appendChild(bar);
}
// Removes the depth bar.
function lichessRemoveDepthBar() {
  const bar = document.getElementById("ashina-depth-bar-lichess");
  if (bar) {
    bar.remove();
  }
}
// Sets the depth bar fill width (0-100%).
function lichessSetDepthBarProgress(percent) {
  const fill = document.getElementById("ashina-depth-bar-fill-lichess");
  if (!fill) {
    return;
  }
  try {
    if (percent <= 0) {
      fill.classList.add("disable-transition");
      fill.style.width = "0%";
      fill.classList.remove("disable-transition");
    } else {
      if (percent > 100) {
        percent = 100;
      }
      fill.style.width = percent + "%";
    }
  } catch (error) {
    console.warn(
      "[ASHINA-DBG][lichess.js][depth-bar] güncelleme hatası:",
      error,
    );
  }
}
// Updates the eval bar: cp/100 pawns mapped to a 5-95% fill (white from the bottom), mate shows M<n> and pins the bar.
function lichessSetEvaluation(score, isMate) {
  const whiteFill = document.getElementById("ashina-eval-white");
  const scoreEl = document.getElementById("ashina-eval-score");
  const scoreAbbrevEl = document.getElementById("ashina-eval-scoreAbbreviated");
  if (!whiteFill || !scoreEl || !scoreAbbrevEl) {
    return;
  }
  let whitePercent;
  let scoreText;
  let abbrevText;
  if (!isMate) {
    const maxCp = 500;
    const minCp = -500;
    const pawnScore = score / 100;
    whitePercent = 90 - ((score - minCp) / (maxCp - minCp)) * 90 + 5;
    if (whitePercent < 5) {
      whitePercent = 5;
    }
    if (whitePercent > 95) {
      whitePercent = 95;
    }
    scoreText = (score >= 0 ? "+" : "") + pawnScore.toFixed(2);
    abbrevText = Math.abs(pawnScore).toFixed(1);
  } else {
    whitePercent = score < 0 ? 100 : 0;
    scoreText = "M" + Math.abs(score).toString();
    abbrevText = scoreText;
  }
  whiteFill.style.transform = "translate3d(0px, " + whitePercent + "%, 0px)";
  scoreEl.innerText = scoreText;
  scoreAbbrevEl.innerText = abbrevText;
  const classToAdd = score >= 0 ? "ashina-eval-dark" : "ashina-eval-light";
  const classToRemove = score >= 0 ? "ashina-eval-light" : "ashina-eval-dark";
  scoreEl.classList.remove(classToRemove);
  scoreEl.classList.add(classToAdd);
  scoreAbbrevEl.classList.remove(classToRemove);
  scoreAbbrevEl.classList.add(classToAdd);
}
let lichessTopMoves = [];
let lastLichessPonder = null;
let _lichessAutoMoveTimer = null;
let _lichessSimulateMateActive = false;
let _lichessAutoStartNewGameInterval = null;
let _lichessAutoStartNewGameClicked = false;
let _lichessLastOpponentMoves = [];
let _lichessPreMoveFEN = null;
let _lichessBlunderReactEvalDisabled = false;
let _lichessPreOpponentCp = null;
let _lichessOpponentLastMoveScore = null;
let _lichessFlagProfileActive = false;
let _lichessLastSteps = null;
let _lichessLastMove = null;
let _lichessCurrentAnalysisFen = null;
let _lichessPreAnalyzeFen = null;
let _lichessOpeningMovePlayed = false;
let _lichessPreAnalyzeRunning = false;
let _lichessSiteFallbackChess = null;
let _lichessSiteFallbackSteps = null;
// Rebuilds the true FEN by replaying moves through chess.js — lichess step FENs lack castling/ep info in live games.
function reconstructFen(steps, extraMove) {
  if (typeof Chess === "undefined") {
    return null;
  }
  if (!steps || steps.length === 0) {
    return null;
  }
  try {
    const chess = new Chess(steps[0].fen);
    for (let i = 1; i < steps.length; i++) {
      const moveStr = steps[i].san || steps[i].uci;
      if (!moveStr) {
        continue;
      }
      try {
        chess.move(moveStr, {
          strict: false,
        });
      } catch (error) {}
    }
    if (extraMove) {
      try {
        chess.move(extraMove, {
          strict: false,
        });
      } catch (error) {}
    }
    return chess.fen();
  } catch (error) {
    return null;
  }
}
// Returns the FEN after the last recorded step.
function fenFromSteps(steps) {
  if (!steps || steps.length === 0) {
    return null;
  }
  const lastStep = steps.at(-1);
  return lastStep.fen || null;
}
// Plays the move sound through the page's own audio elements (site-native feedback).
function handleLichessSiteSoundFallback(data) {
  if (typeof Chess === "undefined") {
    return;
  }
  if (!data || !data.fen || typeof data.ply !== "number") {
    return;
  }
  const boardFen = data.fen;
  const turnColor = data.ply % 2 === 0 ? "w" : "b";
  const baseFen = boardFen + " " + turnColor + " KQkq - 0 1";
  try {
    if (!_lichessSiteFallbackChess) {
      _lichessSiteFallbackChess = new Chess(baseFen);
      _lichessSiteFallbackSteps = [
        {
          fen: _lichessSiteFallbackChess.fen(),
        },
      ];
    } else {
      const chess = _lichessSiteFallbackChess;
      let matchedMove = null;
      const moveOpts = {
        verbose: true,
      };
      for (const candidate of chess.moves(moveOpts)) {
        const played = chess.move(candidate.san, {
          strict: false,
        });
        if (!played) {
          continue;
        }
        if (chess.fen().split(" ")[0] === boardFen) {
          matchedMove = played;
          break;
        }
        chess.undo();
      }
      if (matchedMove) {
        _lichessSiteFallbackSteps.push({
          fen: chess.fen(),
          san: matchedMove.san,
          uci:
            matchedMove.from + matchedMove.to + (matchedMove.promotion || ""),
        });
      } else {
        _lichessSiteFallbackChess = new Chess(baseFen);
        _lichessSiteFallbackSteps = [
          {
            fen: _lichessSiteFallbackChess.fen(),
          },
        ];
      }
    }
    if (_lichessLastSteps && _lichessLastSteps.at(-1)?.fen === boardFen) {
      return;
    }
    const historyPayload = {
      steps: _lichessSiteFallbackSteps,
      lastMove: null,
    };
    const eventInit = {
      detail: historyPayload,
    };
    window.dispatchEvent(new CustomEvent("AsinaLichessHistory", eventInit));
  } catch (error) {}
}
(function setupLichessSiteSoundFallback() {
  let patched = false;
  const tryPatch = () => {
    if (patched) {
      return;
    }
    if (
      typeof site !== "undefined" &&
      site &&
      site.sound &&
      typeof site.sound.move === "function"
    ) {
      patched = true;
      clearInterval(pollTimer);
      const originalMove = site.sound.move;
      site.sound.move = function (moveData) {
        try {
          handleLichessSiteSoundFallback(moveData);
        } catch (error) {
          console.log(
            "[ASHINA-DBG][lichess.js][site-fallback] patch hata:",
            error.message,
          );
        }
        return originalMove.apply(this, arguments);
      };
    }
  };
  const pollTimer = setInterval(tryPatch, 100);
  tryPatch();
})();
let _lichessMaiaReady = false;
let _lichessMaiaRequestCounter = 0;
const _lichessMaiaPending = new Map();
window.addEventListener("AsinaLichessMaiaReadyChanged", (event) => {
  _lichessMaiaReady = !!event.detail?.ready;
  if (_lichessMaiaReady && _lichessPendingReadyFen) {
    const pendingFen = _lichessPendingReadyFen;
    _lichessPendingReadyFen = null;
    analyzePosition(pendingFen);
  }
});
window.addEventListener("AsinaLichessMaiaResponse", (event) => {
  const { requestId: requestId, uciMove: uciMove } = event.detail;
  const pendingEntry = _lichessMaiaPending.get(requestId);
  if (!pendingEntry) {
    return;
  }
  _lichessMaiaPending.delete(requestId);
  clearTimeout(pendingEntry.timeoutHandle);
  if (!uciMove || uciMove.length < 4) {
    return;
  }
  if (uciMove[0] === uciMove[2] && uciMove[1] === uciMove[3]) {
    return;
  }
  if (_lichessCurrentAnalysisFen !== pendingEntry.fen) {
    return;
  }
  const fromSq = uciMove.substring(0, 2);
  const toSq = uciMove.substring(2, 4);
  lichessTopMoves = [
    {
      from: fromSq,
      to: toSq,
      promo: uciMove.length > 4 ? uciMove.substring(4) : "",
      cp: 0,
      mate: null,
    },
  ];
  drawMultipvArrows(lichessTopMoves);
  _lichessTriggerEvalBar(pendingEntry.fen);
  if (lichessTopMoves.length > 0) {
    const bestMove = lichessTopMoves[0];
    const evalPayload = {
      cp: bestMove.cp ?? 0,
      mate: bestMove.mate ?? null,
      depth: 1,
    };
    const eventInit = {
      detail: evalPayload,
    };
    window.dispatchEvent(new CustomEvent("AsinaEngineUpdate", eventInit));
  }
  if (lichessOptions["option-stream-mode"] && lichessTopMoves.length > 0) {
    const bestMove = lichessTopMoves[0];
    window.dispatchEvent(
      new CustomEvent("AsinaSendStreamData", {
        detail: {
          fen: _lichessCurrentAnalysisFen,
          topMoves: lichessTopMoves.map((move) => ({
            from: move.from,
            to: move.to,
            cp: move.cp,
            mate: move.mate,
          })),
          cp: bestMove.cp,
          mate: bestMove.mate,
          depth: 1,
          maxDepth: lichessEngine.depth,
        },
      }),
    );
  }
});
let lichessEngine = {
  worker: null,
  socket: null,
  source: null,
  ready: false,
  depth: 8,
  multipv: 5,
  searching: false,
};
// Lightweight Stockfish worker dedicated to the eval bar (separate from the main engine so evals stay smooth during searches).
class LichessEvalEngine {
  constructor() {
    this.worker = null;
    this._ready = false;
    this._blobURL = null;
    this._wasmURL = null;
    this._pendingFen = null;
    this._searching = false;
    this._depth = 12;
    this._onResult = null;
    const stockfishUrl = ashinaUrls.stockfish || "";
    const wasmUrl = ashinaUrls.stockfishWasm || "";
    if (!stockfishUrl) {
      return;
    }
    this._wasmURL = wasmUrl;
    fetch(stockfishUrl)
      .then((response) => response.blob())
      .then((blob) => {
        this._blobURL = URL.createObjectURL(blob);
        this._startWorker();
      })
      .catch(() => {});
  }
  _startWorker() {
    try {
      this.worker = new Worker(
        this._blobURL + "#" + encodeURIComponent(this._wasmURL),
      );
    } catch (error) {
      return;
    }
    this.worker.onmessage = (event) => {
      const message =
        typeof event.data === "string" ? event.data : String(event.data ?? "");
      this._onMessage(message);
    };
    this.worker.onerror = (event) => {
      this._searching = false;
    };
    this.worker.postMessage("uci");
  }
  _onMessage(message) {
    if (message === "uciok" || message === "readyok") {
      if (!this._ready) {
        this._ready = true;
        if (this._pendingFen) {
          const pendingFen = this._pendingFen;
          this._pendingFen = null;
          this._analyze(pendingFen);
        }
      }
      return;
    }
    if (message.startsWith("info") && message.includes("score cp")) {
      const cpMatch = message.match(/score cp (-?\d+)/);
      if (cpMatch && this._onResult) {
        this._onResult(parseInt(cpMatch[1]), null);
      }
      return;
    }
    if (message.startsWith("info") && message.includes("score mate")) {
      const mateMatch = message.match(/score mate (-?\d+)/);
      if (mateMatch && this._onResult) {
        this._onResult(null, parseInt(mateMatch[1]));
      }
      return;
    }
    if (message.startsWith("bestmove")) {
      this._searching = false;
      if (this._pendingFen) {
        const pendingFen = this._pendingFen;
        this._pendingFen = null;
        this._analyze(pendingFen);
      }
    }
  }
  _analyze(fen) {
    if (!this.worker || !this._ready) {
      return;
    }
    this._searching = true;
    this.worker.postMessage("position fen " + fen);
    this.worker.postMessage("go depth " + this._depth);
  }
  evaluate(fen, onResult) {
    this._onResult = onResult;
    if (!this._ready) {
      this._pendingFen = fen;
      return;
    }
    if (this._searching) {
      this._pendingFen = fen;
      this.worker.postMessage("stop");
      return;
    }
    this._analyze(fen);
  }
  destroy() {
    try {
      this.worker?.postMessage("quit");
    } catch (error) {}
    try {
      this.worker?.terminate();
    } catch (error) {}
    this.worker = null;
    this._ready = false;
    this._searching = false;
  }
}
let lichessEvalEngine = null;
const LICHESS_WS_RECONNECT_DELAY = 500;
const LICHESS_WS_MAX_RECONNECT_DELAY = 3000;
const LICHESS_WS_MAX_RECONNECT_ATTEMPTS = 5;
let _lichessWsReconnectAttempts = 0;
let _lichessWsIsSwitching = false;
// Sends a raw UCI command to the main engine (worker or WebSocket).
function sendToEngine(command) {
  if (lichessEngine.socket) {
    if (lichessEngine.socket.readyState === WebSocket.OPEN) {
      lichessEngine.socket.send(command);
    } else {
    }
  } else if (lichessEngine.worker) {
    lichessEngine.worker.postMessage(command);
  } else {
  }
}
// True once the main engine answered the UCI handshake.
function isLichessEngineReady() {
  const source = lichessOptions["option-engine-source"] || "komodo";
  if (source === "maia") {
    return _lichessMaiaReady;
  }
  if (lichessEngine.socket) {
    return (
      lichessEngine.ready && lichessEngine.socket.readyState === WebSocket.OPEN
    );
  }
  return lichessEngine.ready && !!lichessEngine.worker;
}
let ashinaUrls = {};
let lichessEcoTable = null;
let _lichessEcoReadyPromise = null;
let _lichessCurrentAnalysisInTheory = false;
let lichessOptions = {};
const ENGINE_TRACKED_KEYS = [
  "option-uci-elo",
  "option-hash",
  "option-personality",
  "option-limit-strength",
  "option-auto-skill",
  "option-own-book",
  "option-chess960",
  "option-best-book-line",
  "option-limit-book-moves",
  "option-book-moves",
  "option-depth",
  "option-multipv",
];
let _lichessLastEngineOptionsSnapshot = null;
let _lichessPendingEngineSettingsResend = false;
let _lichessPendingFen = null;
let _lichessPendingReadyFen = null;
let _lichessLastAnalyzedBoardFen = null;
let _lichessLastCoachTriggeredBoardFen = null;
let _lichessCoachInFlightBoardFen = null;
let _lichessSearchSafetyTimer = null;
const LICHESS_ULTRABULLET_ENGINE_OVERRIDES = {
  "option-personality": "Aggressive",
  "option-depth": 2,
  "option-multipv": 5,
};
const LICHESS_ULTRABULLET_AUTOMOVE_OVERRIDES = {
  "option-automove-enabled": false,
};
// Reads an ultrabullet option, applying the ultrabullet engine overrides when the mode is on.
function getLichessUltrabulletValue(key, options) {
  const opts = options || lichessOptions;
  if (opts["option-ultrabullet-enabled"]) {
    if (
      Object.prototype.hasOwnProperty.call(
        LICHESS_ULTRABULLET_ENGINE_OVERRIDES,
        key,
      )
    ) {
      return LICHESS_ULTRABULLET_ENGINE_OVERRIDES[key];
    }
    if (
      Object.prototype.hasOwnProperty.call(
        LICHESS_ULTRABULLET_AUTOMOVE_OVERRIDES,
        key,
      )
    ) {
      return LICHESS_ULTRABULLET_AUTOMOVE_OVERRIDES[key];
    }
  }
  return opts[key];
}
const LICHESS_ULTRABULLET_CHANCE_LOCK_MOVES = 4;
// Counts our completed moves from the FEN move counter (used to gate ultrabullet chance rolls).
function _lichessGetOwnMoveNumber(fen, isWhite) {
  try {
    const fenParts = fen.split(" ");
    const turn = fenParts[1];
    const moveNumber = parseInt(fenParts[5], 10) || 1;
    const sideToMove = isWhite ? "w" : "b";
    if (turn === sideToMove) {
      return moveNumber;
    }
    if (sideToMove === "w") {
      return moveNumber + 1;
    } else {
      return moveNumber;
    }
  } catch (error) {
    return 1;
  }
}
// Collects the squares currently occupied by enemy pieces (used for capture-aware timing).
function _lichessGetOpponentSquares(fen, opponentIsBlack) {
  const squares = new Set();
  try {
    const boardPart = fen.split(" ")[0];
    const ranks = boardPart.split("/");
    for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
      let fileIdx = 0;
      for (const ch of ranks[rankIdx]) {
        if (ch >= "1" && ch <= "8") {
          fileIdx += parseInt(ch);
        } else {
          const isOpponentPiece = opponentIsBlack
            ? ch === ch.toLowerCase()
            : ch === ch.toUpperCase();
          if (isOpponentPiece) {
            const fileChar = String.fromCharCode("a".charCodeAt(0) + fileIdx);
            const rankChar = String(8 - rankIdx);
            squares.add(fileChar + rankChar);
          }
          fileIdx++;
        }
      }
    }
  } catch (error) {}
  return squares;
}
const LICHESS_ULTRABULLET_OPENING_BOOK = {
  "knight-sac": {
    white: [
      {
        from: "b1",
        to: "c3",
      },
      {
        from: "c3",
        to: "b5",
      },
      {
        from: "b5",
        to: "c7",
      },
    ],
    black: [
      {
        from: "b8",
        to: "c6",
      },
      {
        from: "c6",
        to: "b4",
      },
      {
        from: "b4",
        to: "c2",
      },
    ],
  },
  "scholars-mate": {
    white: [
      {
        from: "e2",
        to: "e4",
      },
      {
        from: "d1",
        to: "f3",
      },
      {
        from: "f1",
        to: "c4",
      },
    ],
    black: [
      {
        from: "e7",
        to: "e6",
      },
      {
        from: "d8",
        to: "f6",
      },
      {
        from: "f8",
        to: "c5",
      },
    ],
    mateFollowUp: true,
  },
  "bishop-sac": {
    white: [
      {
        from: "d2",
        to: "d4",
      },
      {
        from: "c1",
        to: "g5",
      },
      {
        from: "g5",
        to: "d8",
      },
    ],
    black: [
      {
        from: "d7",
        to: "d5",
      },
      {
        from: "c8",
        to: "g4",
      },
      {
        from: "g4",
        to: "d1",
      },
    ],
  },
};
let _lastOwnMoveWasBookFallback = false;
const LICHESS_LEFONG_TRAP_VALUE = {
  n: 3,
  b: 3,
  r: 5,
  q: 9,
};
const LICHESS_LEFONG_TRAP_ATTACKER_TYPES = ["n", "b", "r"];
const LICHESS_LEFONG_TRAP_PIECE_WEIGHTS = {
  q: 40,
  r: 30,
  b: 15,
  n: 15,
};
let _lichessLefongTrapPending = null;
let _lichessPremoveStreak = 0;
let _lichessUltrabulletMoveTimer = null;
// Pushes the configured UCI options (depth, MultiPV, hash, Elo, book settings…) to the engine.
function sendLichessEngineOptions(options) {
  const limitBookMoves = !!options["option-limit-book-moves"];
  const bookMovesRaw = parseInt(options["option-book-moves"]);
  const bookMoves = limitBookMoves
    ? bookMovesRaw === 11
      ? 1000
      : bookMovesRaw || 5
    : 1000;
  sendToEngine("setoption name Hash value " + (options["option-hash"] ?? 64));
  sendToEngine(
    "setoption name UCI Elo value " + (options["option-uci-elo"] ?? 3500),
  );
  sendToEngine(
    "setoption name Personality value " +
      (getLichessUltrabulletValue("option-personality", options) || "Default"),
  );
  sendToEngine(
    "setoption name UCI LimitStrength value " +
      !!options["option-limit-strength"],
  );
  sendToEngine(
    "setoption name Auto Skill value " + !!options["option-auto-skill"],
  );
  sendToEngine(
    "setoption name OwnBook value " + (options["option-own-book"] !== false),
  );
  sendToEngine(
    "setoption name UCI_Chess960 value " + !!options["option-chess960"],
  );
  sendToEngine(
    "setoption name Best Book Line value " +
      (options["option-best-book-line"] !== false),
  );
  sendToEngine("setoption name Book Moves value " + bookMoves);
}
let _lichessEngineGeneration = 0;
// Creates the configured engine backend (komodo/torch/maia worker, or remote UCI WebSocket) and runs the handshake.
function initLichessEngine(options) {
  _lichessEngineGeneration++;
  const generation = _lichessEngineGeneration;
  const source = options["option-engine-source"] || "komodo";
  lichessEngine.source = source;
  lichessEngine.depth =
    getLichessUltrabulletValue("option-depth", options) || 8;
  lichessEngine.multipv =
    getLichessUltrabulletValue("option-multipv", options) || 5;
  {
    const snapshot = {};
    ENGINE_TRACKED_KEYS.forEach((key) => {
      snapshot[key] = options[key];
    });
    _lichessLastEngineOptionsSnapshot = snapshot;
  }
  const wantEvalBar =
    lichessOptions["option-evaluation-bar"] &&
    !lichessOptions["option-stream-mode"];
  const wantEvalEngine =
    lichessOptions["option-evaluation-bar"] ||
    lichessOptions["option-stream-mode"];
  if (wantEvalBar) {
    lichessCreateEvalBar();
  } else {
    lichessRemoveEvalBar();
  }
  if (wantEvalEngine) {
    if (!lichessEvalEngine) {
      lichessEvalEngine = new LichessEvalEngine();
    }
  } else if (lichessEvalEngine) {
    lichessEvalEngine.destroy();
    lichessEvalEngine = null;
  }
  const wantDepthBar =
    lichessOptions["option-depth-bar"] && !lichessOptions["option-stream-mode"];
  if (wantDepthBar) {
    lichessCreateDepthBar();
  } else {
    lichessRemoveDepthBar();
  }
  if (source === "maia") {
    lichessEngine.worker = null;
    lichessEngine.socket = null;
    _lichessFireInitialAnalysisIfNeeded();
    return;
  }
  if (source === "websocket") {
    const wsUrl = options["option-url-api-stockfish"];
    if (!wsUrl) {
      console.warn(
        "[Ashina/Lichess] WebSocket URL boş — option-url-api-stockfish ayarlanmamış",
      );
      return;
    }
    if (lichessEngine.socket?._cleanup) {
      lichessEngine.socket._cleanup();
    }
    const fakeSocket = {
      url: wsUrl,
      readyState: WebSocket.CONNECTING,
      send(command) {
        const payload = {
          cmd: command,
        };
        const eventInit = {
          detail: payload,
        };
        window.dispatchEvent(new CustomEvent("AshinaWsSend", eventInit));
      },
      close() {
        fakeSocket.readyState = WebSocket.CLOSING;
        fakeSocket._cleanup();
        window.dispatchEvent(new CustomEvent("AshinaWsDisconnect"));
      },
      _cleanup: null,
    };
    const onOpen = () => {
      if (lichessEngine.socket !== fakeSocket) {
        return;
      }
      fakeSocket.readyState = WebSocket.OPEN;
      _lichessWsReconnectAttempts = 0;
      console.log(
        "[ASHINA-DBG][lichess.js][websocket] ✅ köprü bağlantısı açıldı:",
        wsUrl,
      );
      sendToEngine("uci");
      sendToEngine("setoption name MultiPV value " + lichessEngine.multipv);
      sendLichessEngineOptions(options);
      sendToEngine("ucinewgame");
      lichessEngine.ready = true;
      console.log(
        "[ASHINA-DBG][lichess.js][websocket] ✅ ready = true olarak işaretlendi",
      );
      _lichessFireInitialAnalysisIfNeeded();
    };
    const onMessage = (event) => {
      if (lichessEngine.socket !== fakeSocket) {
        return;
      }
      processEngineMessage(event.detail.data);
    };
    const onClose = () => {
      if (lichessEngine.socket !== fakeSocket) {
        return;
      }
      fakeSocket.readyState = WebSocket.CLOSED;
      console.warn("[Ashina/Lichess][websocket] köprü bağlantısı kapandı");
      lichessEngine.ready = false;
      lichessEngine.searching = false;
      if (_lichessWsIsSwitching) {
        _lichessWsIsSwitching = false;
        return;
      }
      _lichessAttemptWsReconnect(options);
    };
    const onError = () => {
      if (lichessEngine.socket !== fakeSocket) {
        return;
      }
      console.error("[Ashina/Lichess][websocket] köprü hatası");
    };
    fakeSocket._cleanup = () => {
      window.removeEventListener("AshinaWsOpen", onOpen);
      window.removeEventListener("AshinaWsMessage", onMessage);
      window.removeEventListener("AshinaWsClose", onClose);
      window.removeEventListener("AshinaWsError", onError);
    };
    window.addEventListener("AshinaWsOpen", onOpen);
    window.addEventListener("AshinaWsMessage", onMessage);
    window.addEventListener("AshinaWsClose", onClose);
    window.addEventListener("AshinaWsError", onError);
    lichessEngine.worker = null;
    lichessEngine.socket = fakeSocket;
    lichessEngine.ready = false;
    console.log(
      "[ASHINA-DBG][lichess.js][websocket] köprü üzerinden bağlanılıyor:",
      wsUrl,
    );
    const connectPayload = {
      url: wsUrl,
    };
    const eventInit = {
      detail: connectPayload,
    };
    window.dispatchEvent(new CustomEvent("AshinaWsConnect", eventInit));
    return;
  }
  const workerUrl =
    source === "torch" ? ashinaUrls.workerTorch : ashinaUrls.workerKomodo;
  const wasmUrl =
    source === "torch" ? ashinaUrls.wasmTorch : ashinaUrls.wasmKomodo;
  if (!workerUrl || !wasmUrl) {
    return;
  }
  fetch(workerUrl)
    .then((response) => {
      return response.blob();
    })
    .then((blob) => {
      if (generation !== _lichessEngineGeneration) {
        console.log(
          "[ASHINA-DBG][lichess.js] stale worker init iptal edildi (motor bu arada tekrar değiştirilmiş)",
        );
        return;
      }
      const bookUrl = ashinaUrls.book;
      const encodedUrls = encodeURIComponent(wasmUrl + "|" + bookUrl);
      const workerBlobUrl = URL.createObjectURL(blob) + "#" + encodedUrls;
      const worker = new Worker(workerBlobUrl);
      if (generation !== _lichessEngineGeneration) {
        try {
          worker.terminate();
        } catch (error) {}
        return;
      }
      lichessEngine.worker = worker;
      lichessEngine.worker.onmessage = (event) => {
        if (lichessEngine.worker !== worker) {
          return;
        }
        processEngineMessage(event.data ?? event);
      };
      lichessEngine.worker.onerror = (event) =>
        console.error(
          "[Ashina/Lichess] Worker error:",
          event,
          "-- muhtemelen lib/book dosyaları eksik",
        );
      sendToEngine("uci");
      sendToEngine("setoption name MultiPV value " + lichessEngine.multipv);
      sendLichessEngineOptions(options);
      sendToEngine("ucinewgame");
      lichessEngine.ready = true;
      _lichessFireInitialAnalysisIfNeeded();
    })
    .catch((error) =>
      console.error("[Ashina/Lichess] Worker fetch failed:", error),
    );
}
// WebSocket engine reconnect with capped exponential backoff.
function _lichessAttemptWsReconnect(options) {
  if (_lichessWsReconnectAttempts < LICHESS_WS_MAX_RECONNECT_ATTEMPTS) {
    _lichessWsReconnectAttempts++;
    const delay = Math.min(
      LICHESS_WS_RECONNECT_DELAY * _lichessWsReconnectAttempts,
      LICHESS_WS_MAX_RECONNECT_DELAY,
    );
    console.log(
      "[ASHINA-DBG][lichess.js][websocket] yeniden bağlanılıyor (deneme " +
        _lichessWsReconnectAttempts +
        "/" +
        LICHESS_WS_MAX_RECONNECT_ATTEMPTS +
        "), " +
        delay +
        "ms sonra",
    );
    setTimeout(() => initLichessEngine(options), delay);
  } else {
    console.error(
      "[Ashina/Lichess][websocket] Maksimum yeniden bağlanma denemesi aşıldı.",
    );
  }
}
// Analyzes the current position once the engine becomes ready (covers the engine-start race).
function _lichessFireInitialAnalysisIfNeeded() {
  if (_lichessPendingReadyFen) {
    const pendingFen = _lichessPendingReadyFen;
    _lichessPendingReadyFen = null;
    analyzePosition(pendingFen);
  } else if (
    _lichessLastAnalyzedBoardFen === null &&
    getLichessSide() === "white"
  ) {
    const startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const fireOnce = () => {
      if (_lichessLastAnalyzedBoardFen !== null) {
        return;
      }
      analyzePosition(startFen);
    };
    if (_lichessEcoReadyPromise) {
      _lichessEcoReadyPromise.then(fireOnce).catch(fireOnce);
    } else {
      fireOnce();
    }
  }
}
let _lichessMultipvBuffer = [];
// True when the FEN side-to-move matches our color.
function isLichessOurTurnFen(fen) {
  if (!fen) {
    return false;
  }
  const side = getLichessSide();
  const turn = fen.split(" ")[1];
  return (
    (side === "white" && turn === "w") || (side === "black" && turn === "b")
  );
}
// Plays the configured opening first move (white preferences or black replies) if the position matches.
function _lichessTryOpeningPreference() {
  try {
    if (_lichessOpeningMovePlayed) {
      return null;
    }
    const fen = _lichessCurrentAnalysisFen;
    if (!fen) {
      return null;
    }
    const fenParts = fen.split(" ");
    const turn = fenParts[1];
    const moveNumber = parseInt(fenParts[5], 10);
    if (moveNumber !== 1) {
      return null;
    }
    const side = getLichessSide();
    if (side === "white" && turn === "w") {
      const whitePref1 = lichessOptions["option-opening-white-1"] || "none";
      const whitePref2 = lichessOptions["option-opening-white-2"] || "none";
      let chosenKey = null;
      if (whitePref1 !== "none" && OPENING_BOOK.white[whitePref1]) {
        chosenKey = whitePref1;
      } else if (whitePref2 !== "none" && OPENING_BOOK.white[whitePref2]) {
        chosenKey = whitePref2;
      }
      if (!chosenKey) {
        return null;
      }
      const bookEntry = OPENING_BOOK.white[chosenKey];
      const move = {
        from: bookEntry.from,
        to: bookEntry.to,
      };
      return move;
    }
    if (side === "black" && turn === "b") {
      const blackPref1 = lichessOptions["option-opening-black-1"] || "none";
      const blackPref2 = lichessOptions["option-opening-black-2"] || "none";
      const pickBlackOpening = (key) => {
        if (key === "none" || !OPENING_BOOK.black[key]) {
          return null;
        }
        const entry = OPENING_BOOK.black[key];
        if (entry.type === "unconditional") {
          return entry;
        }
        if (
          entry.type === "conditional" &&
          _lichessLastMove === entry.trigger
        ) {
          return entry;
        }
        return null;
      };
      const bookEntry =
        pickBlackOpening(blackPref1) || pickBlackOpening(blackPref2);
      if (!bookEntry) {
        return null;
      }
      const move = {
        from: bookEntry.from,
        to: bookEntry.to,
      };
      return move;
    }
    return null;
  } catch (error) {
    console.warn("[Opening Pref] _lichessTryOpeningPreference hatası:", error);
    return null;
  }
}
// Returns the piece char at a square from the FEN (uppercase = white, lowercase = black), or null.
function _lichessPieceAtSquare(fen, square) {
  try {
    const boardPart = fen.split(" ")[0];
    const ranks = boardPart.split("/");
    const fileIdx = square.charCodeAt(0) - "a".charCodeAt(0);
    const rankIdx = 8 - parseInt(square[1], 10);
    let fileCursor = 0;
    for (const ch of ranks[rankIdx]) {
      if (ch >= "1" && ch <= "8") {
        fileCursor += parseInt(ch, 10);
      } else {
        if (fileCursor === fileIdx) {
          return ch;
        }
        fileCursor++;
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}
// Returns the destination square of the opponent's last capture (for instant-recapture).
function _lichessGetRecaptureSquare(whiteRecapture) {
  try {
    if (!_lichessLastMove || _lichessLastMove.length < 4) {
      return null;
    }
    const targetSquare = _lichessLastMove.slice(2, 4);
    if (!_lichessPreMoveFEN) {
      return null;
    }
    const piece = _lichessPieceAtSquare(_lichessPreMoveFEN, targetSquare);
    if (piece === null) {
      return null;
    }
    const isMatchingColor = whiteRecapture
      ? piece === piece.toUpperCase()
      : piece === piece.toLowerCase();
    if (isMatchingColor) {
      return targetSquare;
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}
// Reads our remaining clock time from the page DOM (null when not found).
function getLichessMyClockSeconds() {
  try {
    const clockEl = document.querySelector(".rclock-bottom .time");
    if (!clockEl) {
      return null;
    }
    const tenthsEl = clockEl.querySelector("tenths");
    let tenths = 0;
    let timeText = clockEl.textContent;
    if (tenthsEl) {
      const tenthsDigits = tenthsEl.textContent.replace(/[^\d]/g, "");
      tenths = tenthsDigits ? parseInt(tenthsDigits, 10) : 0;
      timeText = timeText.slice(
        0,
        timeText.length - tenthsEl.textContent.length,
      );
    }
    const parts = timeText
      .split(":")
      .map((part) => part.replace(/[^\d]/g, ""))
      .filter(Boolean);
    let seconds;
    if (parts.length === 2) {
      seconds = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    } else if (parts.length === 1) {
      seconds = parseInt(parts[0], 10);
    } else {
      return null;
    }
    if (isNaN(seconds)) {
      return null;
    } else {
      return seconds + tenths / 10;
    }
  } catch (error) {
    return null;
  }
}
// Flag mode: switches the engine to low depth / aggressive personality when we are about to flag.
function applyLichessFlagProfile(depth, personality) {
  if (_lichessFlagProfileActive) {
    return;
  }
  _lichessFlagProfileActive = true;
  lichessEngine.depth = depth;
  sendToEngine("setoption name Personality value " + personality);
}
// Flag mode: restores the normal engine profile.
function restoreLichessNormalProfile() {
  if (!_lichessFlagProfileActive) {
    return;
  }
  _lichessFlagProfileActive = false;
  lichessEngine.depth = getLichessUltrabulletValue("option-depth") || 8;
  sendToEngine(
    "setoption name Personality value " +
      (getLichessUltrabulletValue("option-personality") || "Default"),
  );
}
// Tests whether the piece at a square attacks the enemy king (used for check-move play).
function _lichessDoesPieceGiveCheck(fen, square, kingIsBlack) {
  try {
    const boardPart = fen.split(" ")[0];
    const grid = [];
    for (let r = 0; r < 8; r++) {
      grid.push(new Array(8).fill(null));
    }
    let row = 7;
    let col = 0;
    for (const ch of boardPart) {
      if (ch === "/") {
        row--;
        col = 0;
      } else if (ch >= "1" && ch <= "8") {
        col += parseInt(ch, 10);
      } else {
        grid[row][col] = ch;
        col++;
      }
    }
    const pieceFile = square.charCodeAt(0) - "a".charCodeAt(0);
    const pieceRank = parseInt(square[1], 10) - 1;
    const piece = grid[pieceRank] ? grid[pieceRank][pieceFile] : null;
    if (!piece) {
      return false;
    }
    const kingChar = kingIsBlack ? "k" : "K";
    let kingFile = -1;
    let kingRank = -1;
    rankLoop: for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (grid[r][c] === kingChar) {
          kingRank = r;
          kingFile = c;
          break rankLoop;
        }
      }
    }
    if (kingFile === -1) {
      return false;
    }
    const pathIsClear = (fromFile, fromRank, toFile, toRank) => {
      const stepFile = toFile === fromFile ? 0 : toFile > fromFile ? 1 : -1;
      const stepRank = toRank === fromRank ? 0 : toRank > fromRank ? 1 : -1;
      let curFile = fromFile + stepFile;
      let curRank = fromRank + stepRank;
      while (curFile !== toFile || curRank !== toRank) {
        if (grid[curRank][curFile] !== null) {
          return false;
        }
        curFile += stepFile;
        curRank += stepRank;
      }
      return true;
    };
    const pieceType = piece.toLowerCase();
    const dFile = Math.abs(pieceFile - kingFile);
    const dRank = Math.abs(pieceRank - kingRank);
    if (pieceType === "n") {
      return (dFile === 1 && dRank === 2) || (dFile === 2 && dRank === 1);
    }
    if (pieceType === "b") {
      return (
        dFile === dRank &&
        dFile !== 0 &&
        pathIsClear(pieceFile, pieceRank, kingFile, kingRank)
      );
    }
    if (pieceType === "r") {
      return (
        (dFile === 0 || dRank === 0) &&
        dFile + dRank !== 0 &&
        pathIsClear(pieceFile, pieceRank, kingFile, kingRank)
      );
    }
    if (pieceType === "q") {
      const diagonal = dFile === dRank && dFile !== 0;
      const straight = (dFile === 0 || dRank === 0) && dFile + dRank !== 0;
      return (
        (diagonal || straight) &&
        pathIsClear(pieceFile, pieceRank, kingFile, kingRank)
      );
    }
    if (pieceType === "p") {
      if (kingIsBlack) {
        return dRank === 1 && dFile === 1 && kingRank > pieceRank;
      } else {
        return dRank === 1 && dFile === 1 && kingRank < pieceRank;
      }
    }
    return false;
  } catch (error) {
    return false;
  }
}
// Core UCI parser: `info … score cp/mate … pv` lines become TopMove entries; `bestmove` finalizes the search and drives arrows, eval, coach and auto-move.
function processEngineMessage(message) {
  if (message === "uciok" || message === "readyok") {
    return;
  }
  const multipvMatch = message.match(/^info .*?multipv (\d+)/);
  const pvMatch = message.match(
    /^info .*?pv ([a-h][1-8][a-h][1-8][qrbn]?(?: [a-h][1-8][a-h][1-8][qrbn]?)*)(?: .*)?/,
  );
  const scoreMatch = message.match(/^info .*?score (\w+) (-?\d+)/);
  const depthMatch = message.match(/^info .*?\bdepth (\d+)/);
  const bestmoveMatch = message.match(
    /^bestmove ([a-h][1-8][a-h][1-8][qrbn]?)(?: ponder ([a-h][1-8][a-h][1-8][qrbn]?))?/,
  );
  if (multipvMatch && pvMatch) {
    const multipvIndex = parseInt(multipvMatch[1]) - 1;
    const pvMoves = pvMatch[1].split(" ");
    const firstMove = pvMoves[0];
    _lichessMultipvBuffer[multipvIndex] = {
      from: firstMove.substring(0, 2),
      to: firstMove.substring(2, 4),
      promo: firstMove.length > 4 ? firstMove.substring(4) : "",
      cp: scoreMatch && scoreMatch[1] === "cp" ? parseInt(scoreMatch[2]) : null,
      mate:
        scoreMatch && scoreMatch[1] === "mate" ? parseInt(scoreMatch[2]) : null,
      line: pvMoves,
      depth: depthMatch ? parseInt(depthMatch[1]) : null,
    };
    if (
      multipvIndex === 0 &&
      depthMatch &&
      lichessOptions["option-depth-bar"] &&
      !lichessOptions["option-stream-mode"]
    ) {
      const depthPercent =
        (parseInt(depthMatch[1]) / (lichessEngine.depth || 1)) * 100;
      lichessSetDepthBarProgress(depthPercent);
    }
  } else if (message.startsWith("bestmove")) {
    lichessEngine.searching = false;
    clearTimeout(_lichessSearchSafetyTimer);
    if (bestmoveMatch) {
      lichessTopMoves = _lichessMultipvBuffer.filter(Boolean);
      if (
        (lichessTopMoves.length === 0 || _lichessCurrentAnalysisInTheory) &&
        bestmoveMatch[1]
      ) {
        const bestMoveUci = bestmoveMatch[1];
        const fallbackDepth =
          (_lichessMultipvBuffer[0] && _lichessMultipvBuffer[0].depth) ||
          lichessEngine.depth;
        lichessTopMoves = [
          {
            from: bestMoveUci.substring(0, 2),
            to: bestMoveUci.substring(2, 4),
            promo: bestMoveUci.length > 4 ? bestMoveUci.substring(4) : "",
            cp: 0,
            mate: null,
            depth: fallbackDepth,
          },
        ];
      }
      if (lichessTopMoves.length > 0) {
        drawMultipvArrows(lichessTopMoves);
        if (isLichessOurTurnFen(_lichessCurrentAnalysisFen)) {
          runLichessPreAnalyzeQueue(lichessTopMoves);
          let recaptured = _tryInstantRecapture();
          if (!isLichessOurTurnFen(_lichessCurrentAnalysisFen)) {
          } else {
            const topMove = lichessTopMoves[0];
            if (topMove && topMove.mate != null) {
              _lichessOpponentLastMoveScore =
                topMove.mate < 0 ? "Brilliant" : "Blunder";
            } else if (
              topMove &&
              topMove.cp != null &&
              _lichessPreOpponentCp != null
            ) {
              const side = getLichessSide();
              const currentCp = topMove.cp;
              const cpDelta = currentCp - _lichessPreOpponentCp;
              if (cpDelta > 100) {
                _lichessOpponentLastMoveScore = "Blunder";
              } else if (cpDelta > 30) {
                _lichessOpponentLastMoveScore = "Mistake";
              } else if (cpDelta > 10) {
                _lichessOpponentLastMoveScore = "Inaccuracy";
              } else if (cpDelta > -10) {
                _lichessOpponentLastMoveScore = "Good";
              } else if (cpDelta > -30) {
                _lichessOpponentLastMoveScore = "Excellent";
              } else {
                _lichessOpponentLastMoveScore = "BestMove";
              }
              if (
                Math.abs(currentCp) >= 1100 ||
                Math.abs(_lichessPreOpponentCp) >= 1100
              ) {
                _lichessBlunderReactEvalDisabled = true;
              }
            } else {
              _lichessOpponentLastMoveScore = null;
            }
          }
          if (
            !recaptured &&
            getLichessUltrabulletValue("option-automove-enabled")
          ) {
            scheduleLichessAutoMove();
          }
          if (!recaptured) {
            scheduleLichessUltrabulletMove();
          }
        } else {
          _lichessLastOpponentMoves = lichessTopMoves.map((move) => ({
            from: move.from,
            to: move.to,
          }));
        }
        {
          const topMove = lichessTopMoves[0];
          const evalPayload = {
            cp: topMove.cp,
            mate: topMove.mate,
            depth: topMove.depth ?? null,
          };
          const eventInit = {
            detail: evalPayload,
          };
          window.dispatchEvent(new CustomEvent("AsinaEngineUpdate", eventInit));
          if (
            lichessOptions["option-depth-bar"] &&
            !lichessOptions["option-stream-mode"]
          ) {
            const depthPercent =
              ((topMove.depth ?? 0) / (lichessEngine.depth || 1)) * 100;
            lichessSetDepthBarProgress(depthPercent);
          }
        }
        if (lichessOptions["option-stream-mode"]) {
          const topMove = lichessTopMoves[0];
          window.dispatchEvent(
            new CustomEvent("AsinaSendStreamData", {
              detail: {
                fen: _lichessCurrentAnalysisFen,
                topMoves: lichessTopMoves.map((move) => ({
                  from: move.from,
                  to: move.to,
                  cp: move.cp,
                  mate: move.mate,
                })),
                cp: topMove.cp,
                mate: topMove.mate,
                depth: topMove.depth,
                maxDepth: lichessEngine.depth,
              },
            }),
          );
        }
      }
      try {
        const ponderMove = bestmoveMatch[2];
        if (
          ponderMove &&
          ponderMove.length >= 4 &&
          !isLichessOurTurnFen(_lichessCurrentAnalysisFen)
        ) {
          lastLichessPonder = {
            from: ponderMove.substring(0, 2),
            to: ponderMove.substring(2, 4),
            promotion:
              ponderMove.length > 4 ? ponderMove.substring(4, 5) : null,
            bestMate:
              lichessTopMoves.length > 0 ? lichessTopMoves[0].mate : null,
          };
          const weAreWhite = getLichessSide() === "white";
          try {
            if (
              lichessOptions["option-automove-enabled"] &&
              lichessOptions["option-premove-enabled"] &&
              lichessOptions["option-autopremove-enabled"] &&
              bestmoveMatch[1] &&
              bestmoveMatch[1].length >= 4
            ) {
              const bestToSquare = bestmoveMatch[1].substring(2, 4);
              const bestToPiece = _lichessPieceAtSquare(
                _lichessCurrentAnalysisFen,
                bestToSquare,
              );
              const pieceIsOurs =
                bestToPiece !== null &&
                (weAreWhite
                  ? bestToPiece === bestToPiece.toUpperCase()
                  : bestToPiece === bestToPiece.toLowerCase());
              if (pieceIsOurs && lastLichessPonder.to === bestToSquare) {
                _lichessMobilePremoveAttempt();
              }
            }
          } catch (error) {}
          try {
            if (
              lichessOptions["option-automove-enabled"] &&
              lichessOptions["option-premove-enabled"] &&
              lichessOptions["option-autopremove-mates-enabled"] &&
              lastLichessPonder.bestMate === -1
            ) {
              _lichessMobilePremoveAttempt();
            }
          } catch (error) {}
          try {
            if (
              lichessOptions["option-automove-enabled"] &&
              lichessOptions["option-premove-enabled"] &&
              lichessOptions["option-autopremove-checking-fork-enabled"] &&
              _lichessLastMove &&
              _lichessLastMove.length >= 4
            ) {
              const lastToSquare = _lichessLastMove.slice(2, 4);
              const lastMoveGivesCheck = _lichessDoesPieceGiveCheck(
                _lichessCurrentAnalysisFen,
                lastToSquare,
                weAreWhite,
              );
              const ponderFromIsLastTo =
                lastLichessPonder.from === lastToSquare;
              if (lastMoveGivesCheck && ponderFromIsLastTo) {
                const ponderToPiece = _lichessPieceAtSquare(
                  _lichessCurrentAnalysisFen,
                  lastLichessPonder.to,
                );
                const ponderToIsOurs =
                  ponderToPiece !== null &&
                  (weAreWhite
                    ? ponderToPiece === ponderToPiece.toLowerCase()
                    : ponderToPiece === ponderToPiece.toUpperCase());
                if (ponderToIsOurs) {
                  _lichessMobilePremoveAttempt();
                }
              }
            }
          } catch (error) {}
          try {
            const myClock = getLichessMyClockSeconds();
            const flagChance =
              myClock !== null
                ? myClock <= 5
                  ? 0.5
                  : myClock <= 10
                    ? 0.2
                    : 0
                : 0;
            if (
              lichessOptions["option-flag-mode-enabled"] &&
              lichessOptions["option-automove-enabled"] &&
              myClock !== null &&
              myClock <= 10 &&
              Math.random() < flagChance
            ) {
              _lichessMobilePremoveAttempt();
            }
          } catch (error) {}
          try {
            const ubOpeningPref =
              lichessOptions["option-ultrabullet-opening-preference"] || "none";
            const bookFallbackActive =
              ubOpeningPref === "none" && _lastOwnMoveWasBookFallback === true;
            const ubFlagMode =
              lichessOptions["option-ultrabullet-flag-mode-enabled"];
            const ubEnabled = lichessOptions["option-ultrabullet-enabled"];
            const ubClock = getLichessMyClockSeconds();
            if (
              ubFlagMode &&
              ubEnabled &&
              !bookFallbackActive &&
              ubClock !== null &&
              ubClock === 0 &&
              Math.random() < 0.9
            ) {
              _lichessMobilePremoveAttempt();
            }
          } catch (error) {}
          try {
            const ubOpeningPref =
              lichessOptions["option-ultrabullet-opening-preference"] || "none";
            const bookFallbackActive =
              ubOpeningPref === "none" && _lastOwnMoveWasBookFallback === true;
            if (
              lichessOptions["option-ultrabullet-enabled"] &&
              !_lichessLefongTrapPending &&
              !bookFallbackActive &&
              _lichessGetOwnMoveNumber(_lichessCurrentAnalysisFen, weAreWhite) >
                LICHESS_ULTRABULLET_CHANCE_LOCK_MOVES
            ) {
              const premoveChance =
                parseInt(lichessOptions["option-ultrabullet-premove-chance"]) ||
                0;
              if (premoveChance > 0 && Math.random() * 100 < premoveChance) {
                const chainLimit =
                  parseInt(
                    lichessOptions["option-ultrabullet-premove-chain-limit"],
                  ) || 5;
                if (_lichessPremoveStreak >= chainLimit) {
                  _lichessPremoveStreak = 0;
                } else {
                  const ponderFromPiece = _lichessPieceAtSquare(
                    _lichessCurrentAnalysisFen,
                    lastLichessPonder.from,
                  );
                  const queenGuardRisk =
                    !!lichessOptions["option-ultrabullet-guard-queen"] &&
                    ponderFromPiece !== null &&
                    ponderFromPiece.toLowerCase() === "q";
                  const skipForQueenGuard =
                    queenGuardRisk && Math.random() * 100 < 80;
                  if (!skipForQueenGuard) {
                    _lichessMobilePremoveAttempt();
                    _lichessPremoveStreak++;
                  }
                }
              } else {
                _lichessPremoveStreak = 0;
              }
            }
          } catch (error) {
            console.warn("[Ultrabullet] Auto Premove Chance hatası:", error);
          }
        } else if (isLichessOurTurnFen(_lichessCurrentAnalysisFen)) {
          lastLichessPonder = null;
        }
      } catch (error) {
        console.warn("[Lichess Ponder] hata:", error);
      }
    } else {
      lichessTopMoves = [];
      lastLichessPonder = null;
    }
    _lichessMultipvBuffer = [];
    if (_lichessPendingFen) {
      const pendingFen = _lichessPendingFen;
      _lichessPendingFen = null;
      _lichessAnalyzeNow(pendingFen);
    }
  }
}
// Sends `position fen …` + `go` for the current analysis position.
function analyzePosition(fen) {
  const engineSource = lichessOptions["option-engine-source"] || "komodo";
  if (engineSource === "maia") {
    if (!_lichessMaiaReady) {
      _lichessPendingReadyFen = fen;
      return;
    }
    _lichessCurrentAnalysisFen = fen;
    _lichessLastAnalyzedBoardFen = fen.split(" ")[0];
    _lichessCurrentAnalysisInTheory = lichessEcoTable
      ? lichessEcoTable.get(fen.split(" ").slice(0, 3).join(" ")) === true
      : false;
    const maiaElo = parseInt(lichessOptions["option-maia-elo"]) || 1500;
    let legalUci;
    try {
      const chess = new Chess(fen);
      legalUci = chess
        .moves({
          verbose: true,
        })
        .map((move) => move.from + move.to + (move.promotion ?? ""));
    } catch (error) {
      return;
    }
    const requestId = ++_lichessMaiaRequestCounter;
    const timeoutHandle = setTimeout(() => {
      _lichessMaiaPending.delete(requestId);
    }, 10000);
    const pendingEntry = {
      fen: fen,
      timeoutHandle: timeoutHandle,
    };
    _lichessMaiaPending.set(requestId, pendingEntry);
    const requestPayload = {
      requestId: requestId,
      fen: fen,
      elo: maiaElo,
      legalUci: legalUci,
    };
    const eventInit = {
      detail: requestPayload,
    };
    window.dispatchEvent(new CustomEvent("AsinaLichessMaiaRequest", eventInit));
    return;
  }
  if (!isLichessEngineReady()) {
    _lichessPendingReadyFen = fen;
    return;
  }
  if (lichessEngine.searching) {
    _lichessPendingFen = fen;
    sendToEngine("stop");
    return;
  }
  _lichessAnalyzeNow(fen);
}
// Routes an eval update to the eval bar (and stream mode when enabled).
function _lichessTriggerEvalBar(fen) {
  if (
    (!lichessOptions["option-evaluation-bar"] &&
      !lichessOptions["option-stream-mode"]) ||
    !lichessEvalEngine
  ) {
    return;
  }
  lichessEvalEngine.evaluate(fen, (cp, mate) => {
    const turnColor = fen.split(" ")[1];
    let whiteScore = mate !== null ? mate : cp;
    if (turnColor === "b") {
      whiteScore = whiteScore !== null ? -whiteScore : null;
    }
    if (!lichessOptions["option-stream-mode"]) {
      lichessSetEvaluation(whiteScore, mate !== null);
      const whiteCp = mate !== null ? null : turnColor === "b" ? -cp : cp;
      const evalPayload = {
        cp: whiteCp,
        mate: mate,
        depth: lichessEngine.depth,
      };
      const eventInit = {
        detail: evalPayload,
      };
      window.dispatchEvent(new CustomEvent("AsinaEngineUpdate", eventInit));
    }
    if (lichessOptions["option-stream-mode"]) {
      window.dispatchEvent(
        new CustomEvent("AsinaSendStreamData", {
          detail: {
            sfCp: mate !== null ? null : whiteScore,
            sfMate: mate,
          },
        }),
      );
    }
  });
}
// Stops any running search and analyzes the given FEN immediately.
function _lichessAnalyzeNow(fen) {
  lichessEngine.searching = true;
  _lichessCurrentAnalysisFen = fen;
  _lichessLastAnalyzedBoardFen = fen.split(" ")[0];
  _lichessCurrentAnalysisInTheory = lichessEcoTable
    ? lichessEcoTable.get(fen.split(" ").slice(0, 3).join(" ")) === true
    : false;
  _lichessPreAnalyzeFen = "__RESET__";
  _lichessMultipvBuffer = [];
  if (
    lichessOptions["option-depth-bar"] &&
    !lichessOptions["option-stream-mode"]
  ) {
    lichessSetDepthBarProgress(0);
  }
  sendToEngine("stop");
  if (_lichessPendingEngineSettingsResend) {
    _lichessPendingEngineSettingsResend = false;
    sendLichessEngineOptions(lichessOptions);
    sendToEngine("setoption name MultiPV value " + lichessEngine.multipv);
    console.log(
      "[ASHINA-DBG][lichess.js][engine-settings] kuyruktaki ayarlar motor idle olunca gönderildi",
    );
  }
  sendToEngine("position fen " + fen);
  sendToEngine("go depth " + lichessEngine.depth);
  _lichessTriggerEvalBar(fen);
  clearTimeout(_lichessSearchSafetyTimer);
  _lichessSearchSafetyTimer = setTimeout(() => {
    if (!lichessEngine.searching) {
      return;
    }
    lichessEngine.searching = false;
    if (_lichessPendingFen) {
      const pendingFen = _lichessPendingFen;
      _lichessPendingFen = null;
      _lichessAnalyzeNow(pendingFen);
    }
  }, 2000);
}
// Finds the lichess "new game" / rematch button element.
function _lichessFindNewGameButton() {
  const newGameBtn = document.querySelector(".fbt.new-opponent");
  if (newGameBtn && newGameBtn.offsetParent !== null) {
    return newGameBtn;
  } else {
    return null;
  }
}
// Watches the DOM and auto-clicks the new-game button when the option is enabled.
function _startLichessAutoStartNewGameWatcher() {
  if (_lichessAutoStartNewGameInterval !== null) {
    return;
  }
  _lichessAutoStartNewGameInterval = setInterval(() => {
    if (!lichessOptions["option-autostart-newgame"]) {
      return;
    }
    if (!lichessOptions["option-automove-enabled"]) {
      return;
    }
    if (_lichessAutoStartNewGameClicked) {
      return;
    }
    const newGameBtn = _lichessFindNewGameButton();
    if (!newGameBtn) {
      return;
    }
    if (_lichessAutoMoveTimer !== null) {
      clearTimeout(_lichessAutoMoveTimer);
      _lichessAutoMoveTimer = null;
    }
    try {
      newGameBtn.click();
      _lichessAutoStartNewGameClicked = true;
    } catch (error) {}
  }, 1000);
}
window.addEventListener(
  "AsinaLichessInitOptions",
  (event) => {
    ashinaUrls = event.detail?.urls || {};
    const opts = event.detail?.opts || {};
    lichessOptions = opts;
    if (opts["option-language"]) {
      lichessLanguage = opts["option-language"];
    }
    if (ashinaUrls.eco) {
      _lichessEcoReadyPromise = fetch(ashinaUrls.eco)
        .then((response) => response.json())
        .then((ecoRows) => {
          lichessEcoTable = new Map(ecoRows.map((row) => [row.f, true]));
        })
        .catch((error) =>
          console.error("[Ashina/Lichess] eco.json fetch hatası:", error),
        );
    }
    try {
      initLichessEngine(opts);
    } catch (error) {
      console.error(
        "[Ashina/Lichess] initLichessEngine (ilk yükleme) hata verdi:",
        error,
      );
    }
    try {
      applyLichessCoachOptions(opts);
      lichessCoach = new LichessCoachEngine(ashinaUrls);
      lichessPreCoach = new LichessPreCoachEngine(ashinaUrls);
    } catch (error) {
      console.error(
        "[Ashina/Lichess] Coach kurulumu hata verdi (motor tarafı etkilenmedi):",
        error,
      );
    }
    try {
      applyMobilePlayBtnLichess(!!opts["option-mobile-play-btn"]);
      applyMobilePremoveBtnLichess(!!opts["option-mobile-premove-btn"]);
    } catch (error) {
      console.error(
        "[Ashina/Lichess] Mobil buton kurulumu hata verdi (motor/coach etkilenmedi):",
        error,
      );
    }
    _startLichessAutoStartNewGameWatcher();
  },
  {
    once: true,
  },
);
window.addEventListener("AsinaLichessOptionsUpdate", (event) => {
  const updates = event.detail;
  if (!updates) {
    return;
  }
  Object.assign(lichessOptions, updates);
  try {
    if ("option-mobile-play-btn" in updates) {
      applyMobilePlayBtnLichess(!!updates["option-mobile-play-btn"]);
    }
    if ("option-mobile-premove-btn" in updates) {
      applyMobilePremoveBtnLichess(!!updates["option-mobile-premove-btn"]);
    }
  } catch (error) {
    console.error(
      "[Ashina/Lichess] Mobil buton canlı güncelleme hata verdi:",
      error,
    );
  }
  try {
    if (
      "option-automove-enabled" in updates &&
      !updates["option-automove-enabled"] &&
      _lichessAutoMoveTimer
    ) {
      clearTimeout(_lichessAutoMoveTimer);
      _lichessAutoMoveTimer = null;
    }
    if (
      "option-ultrabullet-enabled" in updates &&
      !updates["option-ultrabullet-enabled"] &&
      _lichessUltrabulletMoveTimer
    ) {
      clearTimeout(_lichessUltrabulletMoveTimer);
      _lichessUltrabulletMoveTimer = null;
    }
    if (
      (("option-automove-enabled" in updates &&
        !updates["option-automove-enabled"]) ||
        ("option-flag-mode-enabled" in updates &&
          !updates["option-flag-mode-enabled"])) &&
      _lichessFlagProfileActive
    ) {
      restoreLichessNormalProfile();
    }
  } catch (error) {}
  if ("option-hide-arrows" in updates) {
    if (updates["option-hide-arrows"]) {
      clearArrows();
    } else if (lichessTopMoves.length > 0) {
      drawMultipvArrows(lichessTopMoves);
    }
  }
  try {
    let coachRestartNeeded = false;
    if ("option-coach-enabled" in updates) {
      lichessCoachSettings.enabled = !!updates["option-coach-enabled"];
    }
    if (
      "option-coach-depth" in updates &&
      updates["option-coach-depth"] !== lichessCoachSettings.depth
    ) {
      lichessCoachSettings.depth = updates["option-coach-depth"];
      coachRestartNeeded = true;
    }
    if (
      "option-coach-voice" in updates &&
      updates["option-coach-voice"] !== lichessCoachSettings.voice
    ) {
      lichessCoachSettings.voice = updates["option-coach-voice"];
      coachRestartNeeded = true;
    }
    if (
      "option-coach-locale" in updates &&
      updates["option-coach-locale"] !== lichessCoachSettings.locale
    ) {
      lichessCoachSettings.locale = updates["option-coach-locale"];
      coachRestartNeeded = true;
    }
    if ("option-coach-move-feedback" in updates) {
      lichessCoachSettings.moveFeedback =
        !!updates["option-coach-move-feedback"];
    }
    if ("option-coach-accuracy" in updates) {
      lichessCoachSettings.accuracy = !!updates["option-coach-accuracy"];
    }
    if ("option-coach-voice-enabled" in updates) {
      lichessCoachSettings.voiceEnabled =
        !!updates["option-coach-voice-enabled"];
    }
    if ("option-coach-recap" in updates) {
      lichessCoachSettings.recap = !!updates["option-coach-recap"];
    }
    if ("option-pre-analyze-enabled" in updates) {
      lichessCoachSettings.preAnalyze = !!updates["option-pre-analyze-enabled"];
      if (!lichessCoachSettings.preAnalyze) {
        clearLichessPreAnalyzeMarkings();
      }
    }
    if ("option-language" in updates) {
      lichessLanguage = updates["option-language"] || "en";
    }
    if (coachRestartNeeded && lichessCoach) {
      lichessCoach.restartWorker();
    }
    if (coachRestartNeeded && lichessPreCoach) {
      lichessPreCoach.restartWorker();
    }
  } catch (error) {
    console.error(
      "[Ashina/Lichess] Coach ayar güncellemesi hata verdi (motor tarafı etkilenmedi):",
      error,
    );
  }
  const changedKeys = _lichessLastEngineOptionsSnapshot
    ? ENGINE_TRACKED_KEYS.filter(
        (key) => updates[key] !== _lichessLastEngineOptionsSnapshot[key],
      )
    : [];
  {
    const snapshot = {};
    ENGINE_TRACKED_KEYS.forEach((key) => {
      snapshot[key] = updates[key];
    });
    _lichessLastEngineOptionsSnapshot = snapshot;
  }
  const nonDepthChanged = changedKeys.some(
    (key) => key !== "option-depth" && key !== "option-multipv",
  );
  const depthChanged = changedKeys.includes("option-depth");
  const multipvChanged = changedKeys.includes("option-multipv");
  const sourceChanged =
    ("option-engine-source" in updates &&
      (updates["option-engine-source"] || "komodo") !== lichessEngine.source) ||
    (lichessEngine.source === "websocket" &&
      "option-url-api-stockfish" in updates &&
      lichessEngine.socket &&
      updates["option-url-api-stockfish"] !== lichessEngine.socket.url);
  if (
    (nonDepthChanged || depthChanged || multipvChanged) &&
    !sourceChanged &&
    lichessEngine.source !== "maia"
  ) {
    if (depthChanged) {
      lichessEngine.depth =
        getLichessUltrabulletValue("option-depth", updates) || 8;
    }
    if (multipvChanged) {
      lichessEngine.multipv =
        getLichessUltrabulletValue("option-multipv", updates) || 5;
    }
    if (isLichessEngineReady()) {
      if (lichessEngine.searching) {
        if (nonDepthChanged || multipvChanged) {
          _lichessPendingEngineSettingsResend = true;
        }
        _lichessPendingFen = _lichessCurrentAnalysisFen;
        sendToEngine("stop");
        console.log(
          "[ASHINA-DBG][lichess.js][engine-settings] arama sürüyor — durduruldu, ayar+FEN kuyruğa alındı",
        );
      } else {
        if (nonDepthChanged) {
          sendLichessEngineOptions(lichessOptions);
        }
        if (multipvChanged) {
          sendToEngine("setoption name MultiPV value " + lichessEngine.multipv);
        }
        console.log(
          "[ASHINA-DBG][lichess.js][engine-settings] canlı güncelleme gönderildi (restart YOK) — depth:",
          lichessEngine.depth,
          "| multipv:",
          lichessEngine.multipv,
          "| değişen:",
          changedKeys,
        );
        if (_lichessCurrentAnalysisFen) {
          _lichessAnalyzeNow(_lichessCurrentAnalysisFen);
        }
      }
    }
    return;
  }
  if ("option-engine-source" in updates) {
    const newSource = updates["option-engine-source"] || "komodo";
    if (newSource === "maia") {
      return;
    }
    if (newSource === "websocket" && lichessEngine.socket) {
      const newWsUrl = updates["option-url-api-stockfish"];
      if (newWsUrl && newWsUrl !== lichessEngine.socket.url) {
        console.log(
          "[ASHINA-DBG][lichess.js][websocket] URL değişti, yeniden bağlanılıyor:",
          newWsUrl,
        );
        _lichessWsIsSwitching = true;
        try {
          lichessEngine.socket.close();
        } catch (error) {}
        lichessEngine.socket = null;
        lichessEngine.ready = false;
        lichessEngine.searching = false;
        _lichessPendingFen = null;
        _lichessPendingReadyFen = _lichessCurrentAnalysisFen;
        _lichessLastAnalyzedBoardFen = null;
        _lichessLastCoachTriggeredBoardFen = null;
        _lichessCoachInFlightBoardFen = null;
        _lichessMultipvBuffer = [];
        lichessTopMoves = [];
        clearArrows();
        try {
          initLichessEngine(updates);
        } catch (error) {
          console.error(
            "[Ashina/Lichess] initLichessEngine (URL değişimi) hata verdi:",
            error,
          );
        }
        return;
      }
      if ("option-depth" in updates) {
        lichessEngine.depth = getLichessUltrabulletValue(
          "option-depth",
          updates,
        );
      }
      if ("option-multipv" in updates) {
        lichessEngine.multipv = getLichessUltrabulletValue(
          "option-multipv",
          updates,
        );
        if (isLichessEngineReady()) {
          sendToEngine("setoption name MultiPV value " + lichessEngine.multipv);
        }
      }
      return;
    }
    try {
      lichessEngine.worker?.postMessage("quit");
      lichessEngine.worker?.terminate();
    } catch (error) {}
    if (lichessEngine.socket) {
      _lichessWsIsSwitching = true;
      try {
        lichessEngine.socket.close();
      } catch (error) {}
    }
    _lichessMaiaPending.forEach((pendingEntry) =>
      clearTimeout(pendingEntry.timeoutHandle),
    );
    _lichessMaiaPending.clear();
    _lichessMaiaReady = false;
    lichessEngine.worker = null;
    lichessEngine.socket = null;
    lichessEngine.ready = false;
    lichessEngine.searching = false;
    _lichessPendingFen = null;
    _lichessPendingReadyFen = _lichessCurrentAnalysisFen;
    clearTimeout(_lichessSearchSafetyTimer);
    _lichessLastAnalyzedBoardFen = null;
    _lichessLastCoachTriggeredBoardFen = null;
    _lichessCoachInFlightBoardFen = null;
    _lichessMultipvBuffer = [];
    lichessTopMoves = [];
    clearArrows();
    try {
      initLichessEngine(updates);
    } catch (error) {
      console.error(
        "[Ashina/Lichess] initLichessEngine (motor değişimi) hata verdi:",
        error,
      );
    }
    return;
  }
  if ("option-depth" in updates) {
    lichessEngine.depth = getLichessUltrabulletValue("option-depth", updates);
  }
  if ("option-multipv" in updates) {
    lichessEngine.multipv = getLichessUltrabulletValue(
      "option-multipv",
      updates,
    );
    if (isLichessEngineReady()) {
      sendToEngine("setoption name MultiPV value " + lichessEngine.multipv);
    }
  }
});
window.addEventListener("AsinaLichessHistory", (event) => {
  const { steps: steps, lastMove: lastMove } = event.detail;
  let fen = reconstructFen(steps, lastMove);
  if (!fen) {
    fen = fenFromSteps(steps);
  }
  if (!fen) {
    return;
  }
  const boardPart = fen.split(" ")[0];
  if (
    boardPart !== _lichessLastCoachTriggeredBoardFen &&
    boardPart !== _lichessCoachInFlightBoardFen
  ) {
    triggerLichessCoachAnalysis(steps, lastMove, boardPart);
  }
  if (boardPart === _lichessLastAnalyzedBoardFen) {
    if (lastMove && !_lichessLastMove) {
      _lichessLastMove = lastMove;
      if (isLichessOurTurnFen(_lichessCurrentAnalysisFen)) {
        _tryInstantRecapture();
      }
    }
    clearLichessPreAnalyzeMarkings();
    return;
  }
  if (_lichessAutoMoveTimer) {
    clearTimeout(_lichessAutoMoveTimer);
    _lichessAutoMoveTimer = null;
  }
  if (_lichessUltrabulletMoveTimer) {
    clearTimeout(_lichessUltrabulletMoveTimer);
    _lichessUltrabulletMoveTimer = null;
  }
  _lichessPreMoveFEN = _lichessCurrentAnalysisFen;
  _lichessLastSteps = steps;
  _lichessLastMove = lastMove;
  if (lichessEcoTable) {
    const ecoKey = fen.split(" ").slice(0, 3).join(" ");
    const inTheory = lichessEcoTable.get(ecoKey) === true;
    if (inTheory && lastMove) {
      placeLichessEcoBookIcon(lastMove.slice(-2));
    } else if (!inTheory) {
      clearLichessEcoBookIcon();
    }
  }
  if (boardPart === "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR") {
    lichessSetEvaluation(0, false);
    _lichessSimulateMateActive = false;
    _lichessAutoStartNewGameClicked = false;
    _lichessBlunderReactEvalDisabled = false;
    _lichessPreOpponentCp = null;
    _lichessOpponentLastMoveScore = null;
    _lichessFlagProfileActive = false;
    _lichessOpeningMovePlayed = false;
    _lichessLefongTrapPending = null;
    _lichessPremoveStreak = 0;
  }
  if (isLichessOurTurnFen(fen)) {
    _lichessPreOpponentCp =
      lichessTopMoves.length > 0 && lichessTopMoves[0].cp != null
        ? lichessTopMoves[0].cp
        : null;
  }
  analyzePosition(fen);
});
// Converts an algebraic square to pixel coordinates on the board (orientation-aware).
function squareToPixels(square, boardRect, orientation) {
  const files = "abcdefgh";
  const fileIndex = files.indexOf(square[0]);
  const rankIndex = parseInt(square[1], 10) - 1;
  const squareSize = boardRect.width / 8;
  let pixelX;
  let pixelY;
  if (orientation === "white") {
    pixelX = boardRect.left + fileIndex * squareSize + squareSize / 2;
    pixelY = boardRect.top + (7 - rankIndex) * squareSize + squareSize / 2;
  } else {
    pixelX = boardRect.left + (7 - fileIndex) * squareSize + squareSize / 2;
    pixelY = boardRect.top + rankIndex * squareSize + squareSize / 2;
  }
  const result = {
    x: pixelX,
    y: pixelY,
  };
  return result;
}
let _lichessDragMoveReqCounter = 0;
window.playMove = function (uciMove) {
  const boardEl = document.querySelector("cg-board");
  if (!boardEl) {
    return Promise.resolve({
      success: false,
      error: "cg-board bulunamadı",
    });
  }
  const fromSquare = uciMove.slice(0, 2);
  const toSquare = uciMove.slice(2, 4);
  const side = getLichessSide();
  const domRect = boardEl.getBoundingClientRect();
  const boardRect = {
    left: domRect.left,
    top: domRect.top,
    width: domRect.width,
    height: domRect.height,
  };
  const rect = boardRect;
  const fromPx = squareToPixels(fromSquare, rect, side);
  const toPx = squareToPixels(toSquare, rect, side);
  const requestId =
    "dragmove_" + ++_lichessDragMoveReqCounter + "_" + Date.now();
  const resultPromise = new Promise((resolve) => {
    let settled = false;
    const timeoutHandle = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      window.removeEventListener("AshinaLichessDragMoveDone", onDone);
      resolve({
        success: false,
        error: "timeout — AshinaLichessDragMoveDone hiç gelmedi",
      });
    }, 4000);
    const onDone = (event) => {
      if (event.detail?.requestId !== requestId) {
        return;
      }
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutHandle);
      window.removeEventListener("AshinaLichessDragMoveDone", onDone);
      resolve(event.detail);
    };
    window.addEventListener("AshinaLichessDragMoveDone", onDone);
  });
  const message = {
    type: "AshinaLichessDragMove",
    requestId: requestId,
    fromX: fromPx.x,
    fromY: fromPx.y,
    toX: toPx.x,
    toY: toPx.y,
  };
  window.postMessage(message, "*");
  return resultPromise;
};
let _lichessChatOrSearchWasClicked = false;
document.addEventListener(
  "mousedown",
  (event) => {
    const target = event.target;
    _lichessChatOrSearchWasClicked =
      !!target.closest &&
      (!!target.closest(".mchat__say") || !!target.closest("#clinput"));
  },
  true,
);
document.addEventListener(
  "focusin",
  (event) => {
    const target = event.target;
    const isChatOrSearch =
      !!target.closest &&
      (!!target.closest(".mchat__say") || !!target.closest("#clinput"));
    if (!isChatOrSearch) {
      _lichessChatOrSearchWasClicked = false;
    }
  },
  true,
);
// True while the user is typing in chat/search (suppresses shortcuts).
function _lichessIsChatOrSearchFocus(element) {
  if (!element) {
    return false;
  }
  const matchesChatOrSearch =
    (element.classList && element.classList.contains("mchat__say")) ||
    (element.closest && element.closest("#clinput"));
  if (!matchesChatOrSearch) {
    return false;
  }
  return !_lichessChatOrSearchWasClicked;
}
window.addEventListener("keydown", (event) => {
  if (event.key !== "h") {
    return;
  }
  const activeTag = document.activeElement?.tagName;
  if (activeTag === "INPUT" || activeTag === "TEXTAREA") {
    return;
  }
  if (document.activeElement?.isContentEditable) {
    return;
  }
  lichessOptions["option-hide-arrows"] = !lichessOptions["option-hide-arrows"];
  if (lichessOptions["option-hide-arrows"]) {
    clearArrows();
  } else if (lichessTopMoves.length > 0) {
    drawMultipvArrows(lichessTopMoves);
  }
});
window.addEventListener("keydown", (event) => {
  if (event.key !== "v") {
    return;
  }
  const activeEl = document.activeElement;
  if (_lichessIsChatOrSearchFocus(activeEl)) {
    event.preventDefault();
  } else {
    const activeTag = activeEl?.tagName;
    if (activeTag === "INPUT" || activeTag === "TEXTAREA") {
      return;
    }
    if (activeEl?.isContentEditable) {
      return;
    }
  }
  _lichessMobileFireWithRetries(_lichessMobilePlayAttempt);
});
window.addEventListener("keydown", (event) => {
  if (event.key !== "b") {
    return;
  }
  const activeEl = document.activeElement;
  if (_lichessIsChatOrSearchFocus(activeEl)) {
    event.preventDefault();
  } else {
    const activeTag = activeEl?.tagName;
    if (activeTag === "INPUT" || activeTag === "TEXTAREA") {
      return;
    }
    if (activeEl?.isContentEditable) {
      return;
    }
  }
  _lichessMobileFireWithRetries(_lichessMobilePremoveAttempt);
});
// Plays the best move that gives check (keyboard shortcut action).
function playLichessCheckMove() {
  try {
    if (_lichessMobilePlayBusy) {
      return false;
    }
    if (!lichessOptions["option-checkmove-enabled"]) {
      return false;
    }
    if (typeof Chess === "undefined") {
      return false;
    }
    const fen = _lichessCurrentAnalysisFen;
    if (!fen) {
      return false;
    }
    if (!isLichessOurTurnFen(fen)) {
      return false;
    }
    const turn = fen.split(" ")[1];
    const boardPart = fen.split(" ")[0];
    const grid = [];
    for (let r = 0; r < 8; r++) {
      grid.push(new Array(8).fill(null));
    }
    let row = 7;
    let col = 0;
    for (let ch of boardPart) {
      if (ch === "/") {
        row--;
        col = 0;
      } else if (ch >= "1" && ch <= "8") {
        col += parseInt(ch);
      } else {
        grid[row][col] = ch;
        col++;
      }
    }
    const kingChar = turn === "w" ? "k" : "K";
    let kingFile = -1;
    let kingRank = -1;
    rankLoop: for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (grid[r][c] === kingChar) {
          kingRank = r;
          kingFile = c;
          break rankLoop;
        }
      }
    }
    if (kingFile === -1) {
      return false;
    }
    const pathIsClear = (fromFile, fromRank, toFile, toRank) => {
      const stepFile = toFile === fromFile ? 0 : toFile > fromFile ? 1 : -1;
      const stepRank = toRank === fromRank ? 0 : toRank > fromRank ? 1 : -1;
      let curFile = fromFile + stepFile;
      let curRank = fromRank + stepRank;
      while (curFile !== toFile || curRank !== toRank) {
        if (grid[curRank][curFile] !== null) {
          return false;
        }
        curFile += stepFile;
        curRank += stepRank;
      }
      return true;
    };
    const chess = new Chess(fen);
    const legalMoves = chess
      .moves({
        verbose: true,
      })
      .map((move) => ({
        from: move.from,
        to: move.to,
      }));
    if (!legalMoves || legalMoves.length === 0) {
      return false;
    }
    let checkingMoves = legalMoves.filter((move) => {
      const toFile = move.to.charCodeAt(0) - 97;
      const toRank = parseInt(move.to[1]) - 1;
      const dFile = Math.abs(toFile - kingFile);
      const dRank = Math.abs(toRank - kingRank);
      const fromFile = move.from.charCodeAt(0) - 97;
      const fromRank = parseInt(move.from[1]) - 1;
      const piece = grid[fromRank][fromFile];
      if (!piece) {
        return false;
      }
      const pieceType = piece.toLowerCase();
      let givesCheck = false;
      if (pieceType === "n") {
        givesCheck =
          (dFile === 1 && dRank === 2) || (dFile === 2 && dRank === 1);
      } else if (pieceType === "b") {
        givesCheck =
          dFile === dRank &&
          dFile !== 0 &&
          pathIsClear(toFile, toRank, kingFile, kingRank);
      } else if (pieceType === "r") {
        givesCheck =
          (dFile === 0 || dRank === 0) &&
          dFile + dRank !== 0 &&
          pathIsClear(toFile, toRank, kingFile, kingRank);
      } else if (pieceType === "q") {
        const diagonal = dFile === dRank && dFile !== 0;
        const straight = (dFile === 0 || dRank === 0) && dFile + dRank !== 0;
        givesCheck =
          (diagonal || straight) &&
          pathIsClear(toFile, toRank, kingFile, kingRank);
      } else if (pieceType === "p") {
        givesCheck =
          turn === "w"
            ? dRank === 1 && dFile === 1 && toRank > fromRank
            : dRank === 1 && dFile === 1 && toRank < fromRank;
      }
      if (givesCheck) {
        move._checkPiece = pieceType;
      }
      return givesCheck;
    });
    if (checkingMoves.length === 0) {
      return false;
    }
    if (lichessOptions["option-ultrabullet-guard-queen"]) {
      checkingMoves = checkingMoves.filter((move) => move._checkPiece !== "q");
      if (checkingMoves.length === 0) {
        return false;
      }
    }
    const pieceOrder = {
      p: 1,
      n: 2,
      b: 3,
      r: 4,
      q: 5,
    };
    checkingMoves.sort(
      (a, b) => pieceOrder[a._checkPiece] - pieceOrder[b._checkPiece],
    );
    const bestCheckMove = checkingMoves[0];
    const uciMove = bestCheckMove.from + bestCheckMove.to;
    if (typeof window.playMove !== "function") {
      return false;
    }
    _lichessMobilePlayBusy = true;
    return window
      .playMove(uciMove)
      .catch((error) => {
        console.warn(
          "[ASHINA-DBG][lichess.js][checkmove] playMove hatası:",
          error,
        );
        const failure = {
          success: false,
          error: error,
        };
        return failure;
      })
      .finally(() => {
        _lichessMobilePlayBusy = false;
      });
  } catch (error) {
    return false;
  }
}
// Plays the pending Lefong-trap move (punishes greedy early piece grabs).
function playLichessLefongTrap() {
  try {
    if (_lichessMobilePlayBusy) {
      return false;
    }
    const fen = _lichessCurrentAnalysisFen;
    if (!fen) {
      return false;
    }
    if (!isLichessOurTurnFen(fen)) {
      return false;
    }
    if (typeof Chess === "undefined") {
      return false;
    }
    const turn = fen.split(" ")[1];
    const weAreWhite = getLichessSide() === "white";
    if (_lichessLefongTrapPending) {
      const pendingTrap = _lichessLefongTrapPending;
      const attackerPiece = _lichessPieceAtSquare(
        fen,
        pendingTrap.attackerSquare,
      );
      const attackerIsOurs =
        attackerPiece !== null &&
        (weAreWhite
          ? attackerPiece === attackerPiece.toUpperCase()
          : attackerPiece === attackerPiece.toLowerCase());
      const targetPiece = _lichessPieceAtSquare(fen, pendingTrap.targetSquare);
      const targetMatches =
        targetPiece !== null &&
        targetPiece.toLowerCase() === pendingTrap.targetPiece;
      let followUpUci = null;
      if (attackerIsOurs && targetMatches) {
        try {
          const chess = new Chess(fen);
          const isLegal = chess
            .moves({
              verbose: true,
            })
            .some(
              (move) =>
                move.from === pendingTrap.attackerSquare &&
                move.to === pendingTrap.targetSquare,
            );
          if (isLegal) {
            followUpUci = pendingTrap.attackerSquare + pendingTrap.targetSquare;
          }
        } catch (error) {}
      }
      _lichessLefongTrapPending = null;
      if (followUpUci) {
        if (typeof window.playMove !== "function") {
          return false;
        }
        _lichessMobilePlayBusy = true;
        return window
          .playMove(followUpUci)
          .catch((error) => {
            console.warn(
              "[ASHINA-DBG][lichess.js][lefong-trap] playMove hatası (follow-up):",
              error,
            );
            const failure = {
              success: false,
              error: error,
            };
            return failure;
          })
          .finally(() => {
            _lichessMobilePlayBusy = false;
          });
      }
    }
    let chess;
    try {
      chess = new Chess(fen);
    } catch (error) {
      return false;
    }
    const legalMoves = chess.moves({
      verbose: true,
    });
    if (!legalMoves || legalMoves.length === 0) {
      return false;
    }
    const legalUciSet = new Set(legalMoves.map((move) => move.from + move.to));
    const boardPart = fen.split(" ")[0];
    const grid = [];
    for (let r = 0; r < 8; r++) {
      grid.push(new Array(8).fill(null));
    }
    let row = 7;
    let col = 0;
    for (const ch of boardPart) {
      if (ch === "/") {
        row--;
        col = 0;
      } else if (ch >= "1" && ch <= "8") {
        col += parseInt(ch);
      } else {
        grid[row][col] = ch;
        col++;
      }
    }
    const kingChar = turn === "w" ? "k" : "K";
    let kingFile = -1;
    let kingRank = -1;
    rankLoop: for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (grid[r][c] === kingChar) {
          kingRank = r;
          kingFile = c;
          break rankLoop;
        }
      }
    }
    const valuableSquares = _lichessGetValuablePieceSquares(fen, weAreWhite);
    const trapsByType = {
      q: [],
      r: [],
      b: [],
      n: [],
    };
    for (const move of legalMoves) {
      if (!legalUciSet.has(move.from + move.to)) {
        continue;
      }
      const fromFile = move.from.charCodeAt(0) - 97;
      const fromRank = parseInt(move.from[1]) - 1;
      const attackerPiece = grid[fromRank] ? grid[fromRank][fromFile] : null;
      if (!attackerPiece) {
        continue;
      }
      const attackerType = attackerPiece.toLowerCase();
      if (!LICHESS_LEFONG_TRAP_ATTACKER_TYPES.includes(attackerType)) {
        continue;
      }
      const toFile = move.to.charCodeAt(0) - 97;
      const toRank = parseInt(move.to[1]) - 1;
      if (
        kingFile !== -1 &&
        _lichessSquareIsAttackedBy(
          attackerPiece,
          toFile,
          toRank,
          kingFile,
          kingRank,
          grid,
        )
      ) {
        continue;
      }
      for (const [targetSquare, targetType] of valuableSquares) {
        if (targetSquare === move.to) {
          continue;
        }
        if (
          LICHESS_LEFONG_TRAP_VALUE[targetType] <
          LICHESS_LEFONG_TRAP_VALUE[attackerType]
        ) {
          continue;
        }
        const targetFile = targetSquare.charCodeAt(0) - 97;
        const targetRank = parseInt(targetSquare[1]) - 1;
        if (
          _lichessSquareIsAttackedBy(
            attackerPiece,
            toFile,
            toRank,
            targetFile,
            targetRank,
            grid,
          )
        ) {
          trapsByType[targetType].push({
            move: move,
            targetSquare: targetSquare,
            targetType: targetType,
          });
        }
      }
    }
    const availableTypes = Object.keys(trapsByType).filter(
      (type) => trapsByType[type].length > 0,
    );
    if (availableTypes.length === 0) {
      return false;
    }
    const totalWeight = availableTypes.reduce(
      (sum, type) => sum + LICHESS_LEFONG_TRAP_PIECE_WEIGHTS[type],
      0,
    );
    let roll = Math.random() * totalWeight;
    let chosenType = availableTypes[availableTypes.length - 1];
    for (const type of availableTypes) {
      if (roll < LICHESS_LEFONG_TRAP_PIECE_WEIGHTS[type]) {
        chosenType = type;
        break;
      }
      roll -= LICHESS_LEFONG_TRAP_PIECE_WEIGHTS[type];
    }
    const candidates = trapsByType[chosenType];
    const chosenTrap =
      candidates[Math.floor(Math.random() * candidates.length)];
    const triggerUci = chosenTrap.move.from + chosenTrap.move.to;
    const pending = {
      attackerSquare: chosenTrap.move.to,
      targetSquare: chosenTrap.targetSquare,
      targetPiece: chosenTrap.targetType,
    };
    _lichessLefongTrapPending = pending;
    if (typeof window.playMove !== "function") {
      return false;
    }
    _lichessMobilePlayBusy = true;
    return window
      .playMove(triggerUci)
      .catch((error) => {
        console.warn(
          "[ASHINA-DBG][lichess.js][lefong-trap] playMove hatası (trigger):",
          error,
        );
        const failure = {
          success: false,
          error: error,
        };
        return failure;
      })
      .finally(() => {
        _lichessMobilePlayBusy = false;
      });
  } catch (error) {
    console.error(
      "[ASHINA-DBG][lichess.js][lefong-trap] playLichessLefongTrap error:",
      error,
    );
    return false;
  }
}
window.addEventListener("keydown", (event) => {
  if (event.key !== "n") {
    return;
  }
  const activeEl = document.activeElement;
  if (_lichessIsChatOrSearchFocus(activeEl)) {
    event.preventDefault();
  } else {
    const activeTag = activeEl?.tagName;
    if (activeTag === "INPUT" || activeTag === "TEXTAREA") {
      return;
    }
    if (activeEl?.isContentEditable) {
      return;
    }
  }
  _lichessMobileFireWithRetries(playLichessLefongTrap);
});
window.addEventListener("keydown", (event) => {
  if (event.key !== "r") {
    return;
  }
  const activeTag = document.activeElement?.tagName;
  if (activeTag === "INPUT" || activeTag === "TEXTAREA") {
    return;
  }
  if (document.activeElement?.isContentEditable) {
    return;
  }
  reloadLichessEngine();
});
window.addEventListener("AsinaLichessReloadEngine", () => {
  reloadLichessEngine();
});
// Full engine reset: stop, ucinewgame, re-apply options, re-analyze.
function reloadLichessEngine() {
  console.log("[ASHINA-DBG][lichess.js] 🔄 reloadLichessEngine() tetiklendi");
  sendToEngine("stop");
  if (lichessEngine.worker) {
    try {
      lichessEngine.worker.terminate();
    } catch (error) {}
  }
  if (lichessEngine.socket?.close) {
    try {
      lichessEngine.socket.close();
    } catch (error) {}
  }
  lichessEngine.worker = null;
  lichessEngine.socket = null;
  lichessEngine.ready = false;
  lichessTopMoves = [];
  clearArrows();
  _lichessLastAnalyzedBoardFen = null;
  _lichessCurrentAnalysisInTheory = false;
  const lastFen = _lichessCurrentAnalysisFen;
  try {
    initLichessEngine(lichessOptions);
  } catch (error) {
    console.error(
      "[Ashina/Lichess] initLichessEngine (reload) hata verdi:",
      error,
    );
    return;
  }
  if (lastFen) {
    analyzePosition(lastFen);
  }
}
window.addEventListener("keydown", (event) => {
  if (event.key !== "c") {
    return;
  }
  const activeEl = document.activeElement;
  if (_lichessIsChatOrSearchFocus(activeEl)) {
    event.preventDefault();
  } else {
    const activeTag = activeEl?.tagName;
    if (activeTag === "INPUT" || activeTag === "TEXTAREA") {
      return;
    }
    if (activeEl?.isContentEditable) {
      return;
    }
  }
  _lichessMobileFireWithRetries(playLichessCheckMove);
});
window.addEventListener("keydown", (event) => {
  if (event.key !== "m") {
    return;
  }
  const activeEl = document.activeElement;
  if (_lichessIsChatOrSearchFocus(activeEl)) {
    event.preventDefault();
  } else {
    const activeTag = activeEl?.tagName;
    if (activeTag === "INPUT" || activeTag === "TEXTAREA") {
      return;
    }
    if (activeEl?.isContentEditable) {
      return;
    }
  }
  const wasEnabled = !!lichessOptions["option-automove-enabled"];
  lichessOptions["option-automove-enabled"] = !wasEnabled;
  const patch = {
    "option-automove-enabled": !wasEnabled,
  };
  const eventInit = {
    detail: patch,
  };
  window.dispatchEvent(new CustomEvent("BetterMintUpdateOptions", eventInit));
  window.dispatchEvent(
    new CustomEvent("AsinaPersistOption", {
      detail: {
        key: "option-automove-enabled",
        value: !wasEnabled,
      },
    }),
  );
  if (!lichessOptions["option-automove-enabled"] && _lichessAutoMoveTimer) {
    clearTimeout(_lichessAutoMoveTimer);
    _lichessAutoMoveTimer = null;
  }
  if (lichessOptions["option-automove-enabled"] && lichessTopMoves.length > 0) {
    scheduleLichessAutoMove();
  }
});
let lichessCoachSettings = {
  enabled: false,
  depth: 10,
  voice: "david",
  locale: "en-US",
  moveFeedback: true,
  accuracy: true,
  voiceEnabled: true,
  recap: false,
  preAnalyze: false,
};
let lichessCoach = null;
let lichessPreCoach = null;
let lichessLanguage = "en";
const ASHINA_COACHES = {
  david: {
    voiceId: "David_coach",
    multiLocale: true,
    id: "377706c2-d0a4-11ee-b135-19f9e53c40f5",
    name: "David",
    titledName: "Coach David",
    analyticsId: "David",
    imageUrl: "https://assets-coaches.chess.com/image/coachdavid.png",
    iconUrl: "https://assets-coaches.chess.com/image/coachdavid-icon.png",
    country: {
      id: 112,
      name: "Poland",
      code: "PL",
    },
  },
  mae: {
    voiceId: "Mae_coach",
    multiLocale: true,
    id: "3779595e-d0a4-11ee-a188-05b5e2276152",
    name: "Mae",
    titledName: "Coach Mae",
    analyticsId: "Mae",
    imageUrl: "https://assets-coaches.chess.com/image/coachmae.png",
    iconUrl: "https://assets-coaches.chess.com/image/coachmae-icon.png",
    country: {
      id: 78,
      name: "Japan",
      code: "JP",
    },
  },
  dante: {
    voiceId: "Dante_coach",
    multiLocale: true,
    id: "37791f20-d0a4-11ee-b634-89fef0259834",
    name: "Dante",
    titledName: "Coach Dante",
    analyticsId: "Dante",
    imageUrl: "https://assets-coaches.chess.com/image/coachdante.png",
    iconUrl: "https://assets-coaches.chess.com/image/coachdante-icon.png",
    country: {
      id: 3,
      name: "Canada",
      code: "CA",
    },
  },
  nadia: {
    voiceId: "Nadia_coach",
    multiLocale: true,
    id: "3778e546-d0a4-11ee-803d-937400864b17",
    name: "Nadia",
    titledName: "Coach Nadia",
    analyticsId: "Nadia",
    imageUrl: "https://assets-coaches.chess.com/image/coachnadia.png",
    iconUrl: "https://assets-coaches.chess.com/image/coachnadia-icon.png",
    country: {
      id: 138,
      name: "Türkiye",
      code: "TR",
    },
  },
  sloane: {
    voiceId: "Sloane_coach",
    multiLocale: true,
    id: "167864ce-ab73-11f0-8bbc-45df3aeaea91",
    textId: "Sloane_coach",
    name: "Sloane",
    titledName: "Coach Sloane",
    analyticsId: "Sloane",
    imageUrl:
      "https://assets-coaches.chess.com/image/coachsloane.png?v=6c448cfa",
    iconUrl:
      "https://assets-coaches.chess.com/image/coachsloane-icon.png?v=0a4c5293",
    country: {
      id: 17,
      name: "Australia",
      code: "AU",
    },
    riveAnimationUrl:
      "https://assets-coaches.chess.com/image/coach_sloane.riv?v=c3e13fe7",
    greetingRiveAnimationUrl:
      "https://assets-coaches.chess.com/image/coach_sloane_greeting.riv?v=efa3d5ef",
    taglines: [
      {
        text: "Hey, I’m Sloane. Choose me as your coach and I’ll teach you everything I know.",
        audioUrlHash:
          "a2b10a8003dcc3ab992476750cc6508f25bbe37c2b8b7482d682ee53af4f0fb7",
      },
      {
        text: "My chess vision is up there with the greats. Ready to see what I see?",
        audioUrlHash:
          "d8d61000b04386e25d1650a47719c7050b62d4674430a67421588f1ce5bff93f",
      },
      {
        text: "Want to build confidence while you learn? Pick me.",
        audioUrlHash:
          "b0f06747b5989f80ee3dda81defcceb4ea856c36ee7ea41200431d1a153238b1",
      },
      {
        text: "I’m ready to guide you, move by move. Pick me and let’s learn some chess.",
        audioUrlHash:
          "04e4e3e1a7b065764d80e8b97b36b8774923bc06cca8de8fb732ce1c62c1b5f3",
      },
    ],
  },
  drwolf: {
    voiceId: "Drwolf_coach",
    multiLocale: true,
    id: "167107ba-ab73-11f0-a6d9-3d00a545bfed",
    textId: "Drwolf_coach",
    name: "Dr. Wolf",
    titledName: "Coach Dr. Wolf",
    analyticsId: "DrWolf",
    imageUrl:
      "https://assets-coaches.chess.com/image/coachdrwolf.png?v=0f2770b3",
    iconUrl:
      "https://assets-coaches.chess.com/image/coachdrwolf-icon.png?v=de69116b",
    country: {
      id: 159,
      name: "England",
      code: "XE",
    },
    riveAnimationUrl:
      "https://assets-coaches.chess.com/image/coach_drwolf.riv?v=0584b8d3",
    greetingRiveAnimationUrl:
      "https://assets-coaches.chess.com/image/coach_drwolf_greeting.riv?v=55348ffd",
    taglines: [
      {
        text: "It would be my honor to guide you through this beautiful game.",
        audioUrlHash:
          "e674c460472aa128483cdd69f0e007eccdf1a41f34f53e1554875b597da87272",
      },
      {
        text: "Under my tutelage, you’ll see the beauty of chess like never before.",
        audioUrlHash:
          "541d81a406ed9af0d4a4361eea042066f2644cb9c9ff1bd283e70fece4f1bffa",
      },
      {
        text: "Chess teaches us about life, and I can teach you about chess.",
        audioUrlHash:
          "8cd77f2338bb6911e31bd302e1a4ea8526fe496efa2632f68d2bf00c9dee7123",
      },
      {
        text: "We’re all students of the game. Though I’d love to be your teacher.",
        audioUrlHash:
          "425e6a3926c49c7c0669d728b1bbb6e18b9014ccf523ba193eb044d40f418b10",
      },
    ],
  },
  magnus: {
    voiceId: "Magnus_coach",
    multiLocale: false,
    coachId: 49,
    name: "Magnus",
    titledName: "Coach Magnus",
    analyticsId: "Magnus",
    imageUrl: "https://assets-coaches.chess.com/image/coachmagnus.png",
    iconUrl: "https://assets-coaches.chess.com/image/coachmagnus-icon.png",
    country: {
      id: 160,
      name: "Norway",
      code: "NO",
    },
  },
  hikaru: {
    voiceId: "Hikaru_coach",
    multiLocale: false,
    coachId: 50,
    name: "Hikaru",
    titledName: "Coach Hikaru",
    analyticsId: "Hikaru",
    imageUrl: "https://assets-coaches.chess.com/image/coachhikaru.png",
    iconUrl: "https://assets-coaches.chess.com/image/coachhikaru-icon.png",
    country: {
      id: 228,
      name: "United States",
      code: "US",
    },
  },
  levy: {
    voiceId: "Levy_coach",
    multiLocale: false,
    id: "6ddf1ca2-ff6c-11ef-baea-5dc78a000edb",
    textId: "Levy_coach",
    name: "Levy",
    titledName: "Coach Levy",
    analyticsId: "Levy",
    imageUrl: "https://assets-coaches.chess.com/image/coachlevy.png?v=9f98615d",
    iconUrl:
      "https://assets-coaches.chess.com/image/coachlevy-icon.png?v=19825017",
    country: {
      id: 2,
      name: "United States",
      code: "US",
    },
    isCelebrity: true,
    riveAnimationUrl:
      "https://assets-coaches.chess.com/image/coach_levy.riv?v=21120709",
    greetingRiveAnimationUrl:
      "https://assets-coaches.chess.com/image/coach_levy_greeting.riv?v=38752839",
    taglines: [
      {
        text: "GothamChess here! I’m the internet’s chess teacher, who else could you possibly pick?",
        audioUrlHash:
          "b36a35b100e1ad842020b45f1bbcac3421b83588423e578ad1e2ffa245d259dd",
      },
      {
        text: "Choose me as your coach and I’ll make you a better chess player!",
        audioUrlHash:
          "f0ee85ebd9cded2c4c233a4b33d0f40261987f035a4d9820f9b36a66a27e95a8",
      },
      {
        text: "I’m just a chill guy who can improve your chess game. Pick me!",
        audioUrlHash:
          "14cd9bf73b06b4a5d46d703de37a0adcda2c93ff3f2e83cd9e0cd0bee7e3ca1b",
      },
      {
        text: "Levy Rozman reporting for duty. I’m the best possible choice here, no clickbait.",
        audioUrlHash:
          "364aa165570aa0cbe4be362d0dea2c5aeb5611d0453679186f733899d36ba5d7",
      },
    ],
  },
  anna: {
    voiceId: "Anna_coach",
    multiLocale: false,
    id: "4fdf1a48-7917-11f0-83ed-d56e6dd5307c",
    textId: "Anna_coach",
    name: "Anna",
    titledName: "Coach Anna",
    analyticsId: "Anna",
    imageUrl: "https://assets-coaches.chess.com/image/coachanna.png?v=745c4e84",
    iconUrl:
      "https://assets-coaches.chess.com/image/coachanna-icon.png?v=ac97bcaa",
    country: {
      id: 132,
      name: "Sweden",
      code: "SE",
    },
    isCelebrity: true,
    riveAnimationUrl:
      "https://assets-coaches.chess.com/image/coach_anna.riv?v=4390de55",
    greetingRiveAnimationUrl:
      "https://assets-coaches.chess.com/image/coach_anna_greeting.riv?v=12d9fd31",
    taglines: [
      {
        text: "Hello from Sweden! Want to learn from one of the most popular chess YouTubers?",
        audioUrlHash:
          "37eb03999bac8f1688f4fd407acbbf74dc31d025b0a2e120ee76867064e11d1a",
      },
      {
        text: "I’m Anna, and I’m here to make learning fun and easy.",
        audioUrlHash:
          "0178691a89ba37649fe2a13b0883b3a6d65fc6217fbe48acb4807db0558ba3d6",
      },
      {
        text: "Let’s have some fun learning chess together. What do you say?",
        audioUrlHash:
          "6f6898a63e6c7376a8d583687d6aa8a4c1dc7942f880c9bbdcf09bdbe7211d09",
      },
      {
        text: "I love chess! Let me teach you how to play the best game in the world.",
        audioUrlHash:
          "0afcf003a459ce263ec41acc868eba1a19786581ec5fb03bad07fc66e2840880",
      },
    ],
  },
  judit: {
    voiceId: "Judit_coach",
    multiLocale: false,
    id: "c4106a5e-337d-11f1-b0fb-c9f8e5a66472",
    textId: "Judit_coach",
    name: "Judit",
    titledName: "Coach Judit",
    analyticsId: "Judit",
    imageUrl:
      "https://assets-coaches.chess.com/image/coachjudit.png?v=4e581e71",
    iconUrl:
      "https://assets-coaches.chess.com/image/coachjudit-icon.png?v=0fce7644",
    country: {
      id: 67,
      name: "Hungary",
      code: "HU",
    },
    isCelebrity: true,
    riveAnimationUrl: "",
    greetingRiveAnimationUrl: "",
    taglines: [
      {
        text: "Chess has given me skills I use every single day. I’d love to share what I’ve learned.",
        audioUrlHash:
          "b3967aeea4041b00be777b540ac6789b88e2b15d30fbae7838fc1ea10509316e",
      },
      {
        text: "Practice, perseverance, and passion. That’s what chess taught me.",
        audioUrlHash:
          "072c05de5ff714b043ed96847c5fa95cc2ab7bf0fded278d7790ea1874d9ed5c",
      },
      {
        text: "Ready to learn from the highest rated woman of all time?",
        audioUrlHash:
          "ded08d20246458ca53119b6d0c7342cb0cc59a7644c13e9da29c962014741cef",
      },
      {
        text: "I was once the youngest grandmaster in chess history. Let me help you learn chess.",
        audioUrlHash:
          "2cb706410a580e8952dae5eb3523875542ccfdaf8ba2408085ccc2a652281ad0",
      },
    ],
  },
  vishy: {
    voiceId: "Anand_coach",
    multiLocale: false,
    id: "d62b1920-a0f1-11ef-ba68-b103c62ed2bc",
    textId: "Anand_coach",
    name: "Vishy",
    titledName: "Coach Vishy",
    analyticsId: "Vishy",
    imageUrl:
      "https://assets-coaches.chess.com/image/coachvishy.png?v=ea3d532d",
    iconUrl:
      "https://assets-coaches.chess.com/image/coachvishy-icon.png?v=9c622a35",
    country: {
      id: 69,
      name: "India",
      code: "IN",
    },
    isCelebrity: true,
    riveAnimationUrl: "",
    greetingRiveAnimationUrl: "",
    taglines: [
      {
        text: "I am Vishy Anand, the 5-time World Champion. Nice to meet you.",
        audioUrlHash:
          "d2689d438642593a08f47fd4835d930f6df87bcd57e0ad3415ceeb239dd48ec1",
      },
      {
        text: "Pick me to take your game to the next level.",
        audioUrlHash:
          "e26c17c481882a068753bff37b7a5d4dde7854350e550aa9a3ac8bcf89be3afe",
      },
      {
        text: "Let me help you get better at this lovely game! Take it from a World Champion.",
        audioUrlHash:
          "cf32d8ee814e63f65740039ca2d010e679865687b2667649b135f3f518cfedbc",
      },
      {
        text: "Vishy Anand, naam to suna hi hoga.",
        audioUrlHash:
          "568bc7ee87aab52a130827498d9fe70e7be009329169ac62ff3dc621cbf752ea",
      },
    ],
  },
  botez: {
    voiceId: "Botez_coach",
    multiLocale: false,
    id: "d62a2aba-a0f1-11ef-a2f0-9118eb9f958d",
    textId: "Botez_coach",
    name: "Botez",
    titledName: "Coach Botez",
    analyticsId: "Botez Sisters",
    imageUrl:
      "https://assets-coaches.chess.com/image/coachbotezsisters.png?v=794138d4",
    iconUrl:
      "https://assets-coaches.chess.com/image/coachbotezsisters-icon.png?v=8824e754",
    country: {
      id: 2,
      name: "United States",
      code: "US",
    },
    isCelebrity: true,
    riveAnimationUrl:
      "https://assets-coaches.chess.com/image/coach_botez.riv?v=ce5847dc",
    greetingRiveAnimationUrl:
      "https://assets-coaches.chess.com/image/coach_botez_greeting.riv?v=1c071485",
    taglines: [
      {
        text: "Recognize us from YouTube? We’ll make you a better chess player!",
        audioUrlHash:
          "26d978719bebb2b2c0dd6c558932ce76b77aef5d5e700e8262c57a9ca28fc5a1",
      },
      {
        text: "Double trouble! We can help you achieve chess glory.",
        audioUrlHash:
          "d9dbca669e1ecf98fdd9ca5e48c2fad9bbe44c19871d3393c0942086a571e83c",
      },
      {
        text: "Want TWO chess coaches instead of one? We’re the right choice.",
        audioUrlHash:
          "17f6652dcb38d254525c8e787589cbc1a927fb083353d954e56b32bf8854a83a",
      },
      {
        text: "Alexandra and Andrea here! You’d be a FOOL not to pick us!",
        audioUrlHash:
          "0e9bbd8c90284fce7385adf07a745c340b29d88434f6feecc73b30bc3dd35446",
      },
    ],
  },
  ben: {
    voiceId: "Ben_coach",
    multiLocale: false,
    id: "6dde8ddc-ff6c-11ef-a8d2-d5eb2eeec084",
    textId: "Ben_coach",
    name: "Ben",
    titledName: "Coach Ben",
    analyticsId: "Ben",
    imageUrl: "https://assets-coaches.chess.com/image/coachben.png?v=80369bf7",
    iconUrl:
      "https://assets-coaches.chess.com/image/coachben-icon.png?v=b27b2f23",
    country: {
      id: 2,
      name: "United States",
      code: "US",
    },
    isCelebrity: true,
    riveAnimationUrl: "",
    greetingRiveAnimationUrl: "",
    taglines: [
      {
        text: "Hey, it’s Ben. You can pick me if you want, but I’ll probably make fun of your blunders.",
        audioUrlHash:
          "f97764e9163395c49e103ebc2366ddfacfa8ae12bf56428697789e02701fdb9f",
      },
      {
        text: "If you pick me, you may learn a thing or two. I am a grandmaster after all.",
        audioUrlHash:
          "061e36df97a1e330252c842168034958803803af2173402815622e20e8c83903",
      },
      {
        text: "Trust me, you’ll want me as your coach. The horsey goes diagonally, right?",
        audioUrlHash:
          "b4f71b3595e0ec9c992edd91c1b4a1a0a75baf08dcfbdaaab12ff3b0ef994391",
      },
      {
        text: "You’re thinking about picking me? Think twice, bucko.",
        audioUrlHash:
          "03cf87a5f7572b20ffd3661e8064a0f599595ab48b1924cf9290f1a74d4a04ae",
      },
    ],
  },
  canty: {
    voiceId: "Canty_coach",
    multiLocale: false,
    id: "d62b98a0-a0f1-11ef-bf0b-b5dcb6c5161b",
    textId: "Canty_coach",
    name: "Canty",
    titledName: "Coach Canty",
    analyticsId: "Canty",
    imageUrl:
      "https://assets-coaches.chess.com/image/coachcanty.png?v=fe8bc7a2",
    iconUrl:
      "https://assets-coaches.chess.com/image/coachcanty-icon.png?v=20e7d9f0",
    country: {
      id: 2,
      name: "United States",
      code: "US",
    },
    isCelebrity: true,
    riveAnimationUrl: "",
    greetingRiveAnimationUrl: "",
    taglines: [
      {
        text: "Want to spar with a chessboxing world champ? I’m your man.",
        audioUrlHash:
          "7f8c5e1531f95ff5222d02b21976659615f8fc8abd6c223483865572efb3e6f5",
      },
      {
        text: "I’m a titled chess player, popular streamer, and your next chess coach.",
        audioUrlHash:
          "61844de18c921a7c198bed711030fd991216117cc91a7db83bc987625ed5c8a2",
      },
      {
        text: "BOOM! I got you with all the tips and tricks if you pick me as your coach.",
        audioUrlHash:
          "59a408724ab3d6732020bd5defeb94ab9005ef76d0bd0786fe04a17df7b3e8fe",
      },
      {
        text: "If you pick me as your coach I’ll teach you all the tactinos and gambinos that make a great player.",
        audioUrlHash:
          "a8d7874d422ebb0492130a3718536111ec2aee2ff61efc53cc7cc8e9c412ae66",
      },
    ],
  },
  ruben: {
    voiceId: "Ruben_coach",
    multiLocale: false,
    id: "167962e8-ab73-11f0-8281-4de448a78c1a",
    textId: "Ruben_coach",
    name: "Ruben",
    titledName: "Coach Ruben",
    analyticsId: "Ruben",
    imageUrl:
      "https://assets-coaches.chess.com/image/coachruben.png?v=a50e65f4",
    iconUrl:
      "https://assets-coaches.chess.com/image/coachruben-icon.png?v=87a78d9c",
    country: {
      id: 37,
      name: "Cuba",
      code: "CU",
    },
    riveAnimationUrl: "",
    greetingRiveAnimationUrl: "",
    taglines: [
      {
        text: "Want to learn chess from a park hustler? Choose me.",
        audioUrlHash:
          "f20c93c8dd6fc31bf8d2e2ffcbedde47c407752671d2885ab28b1a8bbde07fc8",
      },
      {
        text: "Stick with me, and I’ll teach you a thing or two about chess and trash talking.",
        audioUrlHash:
          "8e2078128996e7754bfac61e72a25fba9b0f193e38d9e25c060585fd491fbfd0",
      },
      {
        text: "Ready for some expert coaching? Let’s do it.",
        audioUrlHash:
          "5015d396ed4354ce9e0811973b0499e66fa87c64f233081010b0a4ddd218a766",
      },
      {
        text: "Choose me, and watch your chess rating skyrocket! It’s simple.",
        audioUrlHash:
          "1411caad304cb3407918f0e3239a26d2db27d1faa1dba1b49d4799afb213d253",
      },
    ],
  },
  calvin: {
    voiceId: "Calvin_coach",
    multiLocale: false,
    id: "1678e624-ab73-11f0-9644-6fc23344afd8",
    textId: "Calvin_coach",
    name: "Calvin",
    titledName: "Coach Calvin",
    analyticsId: "Calvin",
    imageUrl:
      "https://assets-coaches.chess.com/image/coachcalvin.png?v=2fa90df5",
    iconUrl:
      "https://assets-coaches.chess.com/image/coachcalvin-icon.png?v=730ed413",
    country: {
      id: 2,
      name: "United States",
      code: "US",
    },
    riveAnimationUrl: "",
    greetingRiveAnimationUrl: "",
    taglines: [
      {
        text: "You need an expert chess coach? Say no more.",
        audioUrlHash:
          "7ce3682d495ecec0536dc32f6445a6814a527d369d3872c78f7b37aa858e9731",
      },
      {
        text: "I’m the best chess player in my school. Ready to learn?",
        audioUrlHash:
          "fcb3f2e9e3f1fc2ce88b39f965088f9cfe3451da888788ecd1de162da5463fcd",
      },
      {
        text: "I’m the coach you want in your corner. Let’s do this.",
        audioUrlHash:
          "0a14582301c14e9b7b56a0fb20cfce290bb21e43f5719ffdd4447db567799a23",
      },
      {
        text: "Are we standing around or are we playing chess? C’mon!",
        audioUrlHash:
          "c7d519fde47bc45b1bb9425d18bc6e581cbe7419805c3a0766d2b5c446589a47",
      },
    ],
  },
  tania: {
    voiceId: "Tania_coach",
    multiLocale: false,
    id: "d62aa12a-a0f1-11ef-8c86-0b794ad057db",
    textId: "Tania_coach",
    name: "Tania",
    titledName: "Coach Tania",
    analyticsId: "Tania",
    imageUrl:
      "https://assets-coaches.chess.com/image/coachtania.png?v=dc1e4f9f",
    iconUrl:
      "https://assets-coaches.chess.com/image/coachtania-icon.png?v=271636b6",
    country: {
      id: 69,
      name: "India",
      code: "IN",
    },
    isCelebrity: true,
    riveAnimationUrl: "",
    greetingRiveAnimationUrl: "",
    taglines: [
      {
        text: "I’ve commentated on the best in the world. Now I’m here to help you play like them!",
        audioUrlHash:
          "91581b8ddbb50042a22d52e8702d8f3c9060c545fd20b413069c631f3114c63c",
      },
      {
        text: "Want to learn chess from an Olympiad gold medalist? Pick me.",
        audioUrlHash:
          "92388d370eeec75aef641267e8ecc78499c4749b233dd7b52c2824b468407b21",
      },
      {
        text: "Coach Tania here! I can help you become a better chess player!",
        audioUrlHash:
          "381a903056cac3a440df8780ca6ec4e726a5b591a8e90d42d7f37ad0eaefcc8f",
      },
      {
        text: "It’s Tania. You’re going to want to be my student. Trust me!",
        audioUrlHash:
          "57cdbda82e9abe2fd695621285d67c9a7b7ab76083663f0d449c55cbd3aa4c54",
      },
    ],
  },
  danny: {
    voiceId: "Danny_coach",
    multiLocale: false,
    id: "6dd9d7b0-ff6c-11ef-9341-ff6621b6b8b5",
    textId: "Danny_coach",
    name: "Danny",
    titledName: "Coach Danny",
    analyticsId: "Danny",
    imageUrl:
      "https://assets-coaches.chess.com/image/coachdanny.png?v=7fd13701",
    iconUrl:
      "https://assets-coaches.chess.com/image/coachdanny-icon.png?v=2fc4419f",
    country: {
      id: 2,
      name: "United States",
      code: "US",
    },
    isCelebrity: true,
    riveAnimationUrl: "",
    greetingRiveAnimationUrl: "",
    taglines: [
      {
        text: "Want to learn from Chess.com’s Chief Chess Officer?",
        audioUrlHash:
          "331029009912d371cbaee9aad487a2402e3cc9ea6e08135946c66a489ad35a84",
      },
      {
        text: "Have no fear, Coach Danny is here! I’ll teach you everything you need to know.",
        audioUrlHash:
          "dabbc9e92028d617bce30a421c8fd8a14742794ac98d255a9632e37c58829016",
      },
      {
        text: "Nice job finding my avatar, now click the big green button. You’re so close. You can do this.",
        audioUrlHash:
          "7cfa01dff35858df653ae1dcc00a0cf6916affeda8eb6b7d111cfd83483c53e9",
      },
      {
        text: "Improve your game with tips from me, a world-class chess commentator.",
        audioUrlHash:
          "e1f1f1e5bf7c885c922f5af5c883e33510ae4d18951c7c06b68491b27a38c7f9",
      },
    ],
  },
};
const LOCALE_TO_LANG = {
  "en-US": "en_US",
  "fr-FR": "fr_FR",
  "es-ES": "es_ES",
  "de-DE": "de_DE",
  "it-IT": "it_IT",
  "pt-PT": "pt_PT",
  "tr-TR": "tr_TR",
  "ru-RU": "ru_RU",
  "ar-SA": "ar_SA",
  "pl-PL": "pl_PL",
  "ko-KR": "ko_KR",
  "id-ID": "id_ID",
};
// Builds the chess.com coach audio CDN base URL for a coach/locale.
function buildAudioBase(coach2, locale2) {
  return (
    "https://text-and-audio.chess.com/prod/released/" +
    coach2.voiceId +
    "/" +
    locale2 +
    "/"
  );
}
// Builds the UCI `load-and-set-coach-asset` command that switches the Torch coach persona.
function buildCoachCmd(coach2, locale2) {
  const coachId2 = coach2.id ?? coach2.coachId ?? null;
  const textId2 = coach2.textId || "Generic_coach";
  const coachAsset2 = {
    id: coachId2,
    name: coach2.name,
    titledName: coach2.titledName,
    voiceId: coach2.voiceId,
    locale: "en-US",
    textId: textId2,
    analyticsId: coach2.analyticsId,
    imageUrl: coach2.imageUrl,
    iconUrl: coach2.iconUrl,
    country: coach2.country,
    taglines: coach2.taglines || [],
    i18nMeta: {
      languageIndicator: "",
    },
    riveAnimationUrl: coach2.riveAnimationUrl || "",
    greetingRiveAnimationUrl: coach2.greetingRiveAnimationUrl || "",
  };
  const coachJson2 = JSON.stringify(coachAsset2);
  return (
    "load-and-set-coach-asset text_id " +
    textId2 +
    " locale " +
    locale2 +
    ' json {"currentCoach":' +
    coachJson2 +
    "}"
  );
}
// Torch worker that grades played moves (classification, accuracy, tallies) — the lichess mirror of the chess.com coach.
class LichessCoachEngine {
  constructor(urls2) {
    this.worker = null;
    this._blobURL = null;
    this._ready = false;
    this._pendingResolve = null;
    this._pendingTimeout = null;
    this._busy = false;
    this._queuedRequest = null;
    this._restartPending = false;
    this._coachCmd = null;
    const torchUrl2 = urls2?.workerTorch || "";
    const wasmTorch2 = urls2?.wasmTorch || "";
    if (!torchUrl2) {
      console.warn("[LichessCoach] torch URL yok — ashinaUrls:", urls2);
      return;
    }
    const wasmParam2 = wasmTorch2 ? encodeURIComponent(wasmTorch2) : "";
    fetch(torchUrl2)
      .then((response) => response.blob())
      .then((blob2) => {
        this._blobURL =
          URL.createObjectURL(blob2) + (wasmParam2 ? "#" + wasmParam2 : "");
        this._startWorker();
      })
      .catch((error) =>
        console.error(
          "[ASHINA-DBG][lichess.js][coach] fetch torch.js failed:",
          error,
        ),
      );
  }
  _startWorker() {
    try {
      this.worker = new Worker(this._blobURL);
    } catch (e2) {
      console.error(
        "[ASHINA-DBG][lichess.js][coach] Worker oluşturulamadı:",
        e2,
      );
      return;
    }
    this.worker.onmessage = (event) =>
      this._onMessage(
        typeof event.data === "string" ? event.data : String(event.data ?? ""),
      );
    this.worker.onerror = (error2) => {
      console.warn(
        "[ASHINA-DBG][lichess.js][coach] Worker error — restartWorker() tetikleniyor",
      );
      if (this._pendingResolve) {
        clearTimeout(this._pendingTimeout);
        const resolvePending = this._pendingResolve;
        this._pendingResolve = null;
        resolvePending(null);
      }
      if (this._queuedRequest) {
        this._queuedRequest.resolve(null);
        this._queuedRequest = null;
      }
      this._busy = false;
      this.restartWorker();
    };
    this.worker.postMessage("uci");
  }
  _onMessage(line2) {
    if (line2 === "uciok" || line2 === "readyok") {
      if (!this._ready) {
        this._ready = true;
        this._setup();
      }
      return;
    }
    if (line2.includes("ABORD")) {
      console.error(
        "[ASHINA-DBG][lichess.js][coach] Torch WASM crash — restartWorker()",
      );
      if (this._pendingResolve) {
        clearTimeout(this._pendingTimeout);
        const resolvePending = this._pendingResolve;
        this._pendingResolve = null;
        resolvePending(null);
      }
      if (this._queuedRequest) {
        this._queuedRequest.resolve(null);
        this._queuedRequest = null;
      }
      this._busy = false;
      this.restartWorker();
      return;
    }
    if (!line2.startsWith("json ")) {
      return;
    }
    if (!this._pendingResolve) {
      return;
    }
    let analysis2;
    try {
      analysis2 = JSON.parse(line2.slice(5));
    } catch (e2) {
      console.warn("[ASHINA-DBG][lichess.js][coach] JSON parse hatası:", e2);
      return;
    }
    const positions2 = analysis2.positions || [];
    const lastPosition2 = positions2[positions2.length - 1];
    if (!lastPosition2?.playedMove) {
      return;
    }
    const speech2 = lastPosition2.playedMove?.speech;
    const audioUrlHash2 =
      speech2 && typeof speech2 === "object" && !Array.isArray(speech2)
        ? speech2.audioUrlHash
        : Array.isArray(speech2)
          ? speech2?.[0]?.audioUrlHash
          : null;
    clearTimeout(this._pendingTimeout);
    const resolvePending2 = this._pendingResolve;
    this._pendingResolve = null;
    resolvePending2({
      classificationName: lastPosition2.classificationName || null,
      caps2: lastPosition2.caps2 ?? null,
      difference: lastPosition2.difference ?? null,
      fen: lastPosition2.fen || null,
      playedMoveLan: lastPosition2.playedMove?.moveLan || null,
      bestMoveLan: lastPosition2.bestMove?.moveLan || null,
      audioUrlHash: audioUrlHash2,
      whiteAccuracy: analysis2.CAPS?.white?.all ?? null,
      blackAccuracy: analysis2.CAPS?.black?.all ?? null,
      whiteElo: analysis2.reportCard?.white?.effectiveElo ?? null,
      blackElo: analysis2.reportCard?.black?.effectiveElo ?? null,
      tallies: analysis2.tallies || null,
      openingName: analysis2.book?.name || null,
      arc: analysis2.arc || null,
      pv: lastPosition2.evals?.[0]?.pv || [],
      cpHistory: positions2.map((position) => position.evals?.[0]?.cp ?? null),
    });
    this._finishAnalysis();
  }
  _setup() {
    const send2 = (cmd) => this.worker?.postMessage(cmd);
    send2("setoption name UseDeclarativePositionCommand value true");
    send2("setoption name WhiteElo value 3200");
    send2("setoption name BlackElo value 3200");
    send2("setoption name ClassificationV3 value true");
    send2("setoption name SerializeSpeechDetails value true");
    send2("setoption name SerializeEvals value true");
    send2("setoption name SerializeLikeCEAC value true");
    send2("setoption name HandleContinuations value true");
    const coachDepth2 = lichessCoachSettings.depth || 10;
    send2("setoption name HandleContinuationsDepth value " + coachDepth2);
    send2("setoption name ServeCommandV2 value true");
    send2("setoption name SpeechV3 value true");
    send2("setoption name BotChatPrioritizePlayerMove value true");
    const coachKey2 = lichessCoachSettings.voice || "david";
    const coach2 = ASHINA_COACHES[coachKey2] || ASHINA_COACHES.david;
    const locale2 = coach2.multiLocale
      ? lichessCoachSettings.locale || "en-US"
      : "en-US";
    const lang2 = LOCALE_TO_LANG[locale2] || "en_US";
    this._coachCmd = buildCoachCmd(coach2, locale2);
    send2(this._coachCmd);
    send2("setoption name Language value " + lang2);
    this._audioBase = buildAudioBase(coach2, locale2);
  }
  getAnalysis(positionCmd2) {
    return new Promise((resolve2) => {
      if (!this.worker || !this._ready) {
        console.warn("[ASHINA-DBG][lichess.js][coach] Worker hazır değil");
        resolve2(null);
        return;
      }
      if (this._busy) {
        if (this._queuedRequest) {
          this._queuedRequest.resolve(null);
        }
        const queuedRequest = {
          uciPosition: positionCmd2,
          resolve: resolve2,
        };
        this._queuedRequest = queuedRequest;
        return;
      }
      this._runAnalysis(positionCmd2, resolve2);
    });
  }
  _runAnalysis(positionCmd2, resolve2) {
    this._busy = true;
    this._pendingResolve = resolve2;
    this._pendingTimeout = setTimeout(() => {
      if (this._pendingResolve === resolve2) {
        console.warn(
          "[ASHINA-DBG][lichess.js][coach] Timeout — analiz gelmedi",
        );
        this._pendingResolve = null;
        resolve2(null);
        this._finishAnalysis();
      }
    }, 12000);
    this.worker.postMessage(positionCmd2);
    if (this._coachCmd) {
      this.worker.postMessage(this._coachCmd);
    }
    this.worker.postMessage("fetch analysis");
  }
  _finishAnalysis() {
    this._busy = false;
    if (this._restartPending) {
      this._restartPending = false;
      if (this._queuedRequest) {
        this._queuedRequest.resolve(null);
        this._queuedRequest = null;
      }
      this._doRestart();
      return;
    }
    if (this._queuedRequest) {
      const { uciPosition: positionCmd, resolve: resolve } =
        this._queuedRequest;
      this._queuedRequest = null;
      setTimeout(() => {
        if (!this.worker || !this._ready || this._busy) {
          resolve(null);
          return;
        }
        this._runAnalysis(positionCmd, resolve);
      }, 150);
    }
  }
  newGame() {
    if (this._pendingResolve) {
      clearTimeout(this._pendingTimeout);
      this._pendingResolve(null);
      this._pendingResolve = null;
    }
    if (this._queuedRequest) {
      this._queuedRequest.resolve(null);
      this._queuedRequest = null;
    }
    this._busy = false;
  }
  restartWorker() {
    if (this._busy) {
      this._restartPending = true;
      return;
    }
    this._doRestart();
  }
  _doRestart() {
    this._ready = false;
    try {
      this.worker?.terminate();
    } catch (e2) {}
    this.worker = null;
    if (this._blobURL) {
      this._startWorker();
    }
  }
  hardStop() {
    clearTimeout(this._pendingTimeout);
    this._pendingResolve = null;
    if (this._queuedRequest) {
      this._queuedRequest.resolve(null);
      this._queuedRequest = null;
    }
    this._busy = false;
    this._restartPending = false;
    this._ready = false;
    try {
      this.worker?.terminate();
    } catch (e2) {}
    this.worker = null;
  }
}
// Torch worker for pre-move analysis (grades the move we are about to play).
class LichessPreCoachEngine {
  constructor(urls2) {
    this.worker = null;
    this._blobURL = null;
    this._ready = false;
    this._pendingResolve = null;
    this._pendingTimeout = null;
    this._busy = false;
    this._queuedRequest = null;
    this._restartPending = false;
    const torchUrl2 = urls2?.workerTorch || "";
    const wasmTorch2 = urls2?.wasmTorch || "";
    if (!torchUrl2) {
      console.warn(
        "[ASHINA-DBG][lichess.js][preanalyze] torch URL yok — ashinaUrls:",
        urls2,
      );
      return;
    }
    const wasmParam2 = wasmTorch2 ? encodeURIComponent(wasmTorch2) : "";
    fetch(torchUrl2)
      .then((response) => response.blob())
      .then((blob2) => {
        this._blobURL =
          URL.createObjectURL(blob2) + (wasmParam2 ? "#" + wasmParam2 : "");
        this._startWorker();
      })
      .catch((error) =>
        console.error(
          "[ASHINA-DBG][lichess.js][preanalyze] fetch torch.js failed:",
          error,
        ),
      );
  }
  _startWorker() {
    try {
      this.worker = new Worker(this._blobURL);
    } catch (e2) {
      console.error(
        "[ASHINA-DBG][lichess.js][preanalyze] Worker oluşturulamadı:",
        e2,
      );
      return;
    }
    this.worker.onmessage = (event) =>
      this._onMessage(
        typeof event.data === "string" ? event.data : String(event.data ?? ""),
      );
    this.worker.onerror = (error2) => {
      console.warn(
        "[ASHINA-DBG][lichess.js][preanalyze] Worker error — restartWorker() tetikleniyor",
      );
      if (this._pendingResolve) {
        clearTimeout(this._pendingTimeout);
        const resolvePending = this._pendingResolve;
        this._pendingResolve = null;
        resolvePending(null);
      }
      if (this._queuedRequest) {
        this._queuedRequest.resolve(null);
        this._queuedRequest = null;
      }
      this._busy = false;
      this.restartWorker();
    };
    this.worker.postMessage("uci");
  }
  _onMessage(line2) {
    if (line2 === "uciok" || line2 === "readyok") {
      if (!this._ready) {
        this._ready = true;
        this._setup();
      }
      return;
    }
    if (line2.includes("ABORD")) {
      console.error(
        "[ASHINA-DBG][lichess.js][preanalyze] Torch WASM crash — restartWorker()",
      );
      if (this._pendingResolve) {
        clearTimeout(this._pendingTimeout);
        const resolvePending = this._pendingResolve;
        this._pendingResolve = null;
        resolvePending(null);
      }
      if (this._queuedRequest) {
        this._queuedRequest.resolve(null);
        this._queuedRequest = null;
      }
      this._busy = false;
      this.restartWorker();
      return;
    }
    if (!line2.startsWith("json ")) {
      return;
    }
    if (!this._pendingResolve) {
      return;
    }
    let analysis2;
    try {
      analysis2 = JSON.parse(line2.slice(5));
    } catch (e2) {
      console.warn(
        "[ASHINA-DBG][lichess.js][preanalyze] JSON parse hatası:",
        e2,
      );
      return;
    }
    const positions2 = analysis2.positions || [];
    const lastPosition2 = positions2[positions2.length - 1];
    if (!lastPosition2?.playedMove) {
      return;
    }
    clearTimeout(this._pendingTimeout);
    const resolvePending2 = this._pendingResolve;
    this._pendingResolve = null;
    const coachResult2 = {
      classificationName: lastPosition2.classificationName || null,
      difference: lastPosition2.difference ?? null,
      fen: lastPosition2.fen || null,
    };
    resolvePending2(coachResult2);
    this._finishAnalysis();
  }
  _setup() {
    const send2 = (cmd) => this.worker?.postMessage(cmd);
    send2("setoption name UseDeclarativePositionCommand value true");
    send2("setoption name WhiteElo value 3200");
    send2("setoption name BlackElo value 3200");
    send2("setoption name ClassificationV3 value true");
    send2("setoption name SerializeEvals value true");
    send2("setoption name SerializeLikeCEAC value true");
    send2("setoption name HandleContinuations value true");
    const coachDepth2 = lichessCoachSettings.depth || 10;
    send2("setoption name HandleContinuationsDepth value " + coachDepth2);
    send2("setoption name ServeCommandV2 value true");
  }
  getAnalysis(positionCmd2) {
    return new Promise((resolve2) => {
      if (!this.worker || !this._ready) {
        resolve2(null);
        return;
      }
      if (this._busy) {
        if (this._queuedRequest) {
          this._queuedRequest.resolve(null);
        }
        const queuedRequest = {
          uciPosition: positionCmd2,
          resolve: resolve2,
        };
        this._queuedRequest = queuedRequest;
        return;
      }
      this._runAnalysis(positionCmd2, resolve2);
    });
  }
  _runAnalysis(positionCmd2, resolve2) {
    this._busy = true;
    this._pendingResolve = resolve2;
    this._pendingTimeout = setTimeout(() => {
      if (this._pendingResolve === resolve2) {
        this._pendingResolve = null;
        resolve2(null);
        this._finishAnalysis();
      }
    }, 12000);
    this.worker.postMessage(positionCmd2);
    this.worker.postMessage("fetch analysis");
  }
  _finishAnalysis() {
    this._busy = false;
    if (this._restartPending) {
      this._restartPending = false;
      if (this._queuedRequest) {
        this._queuedRequest.resolve(null);
        this._queuedRequest = null;
      }
      this._doRestart();
      return;
    }
    if (this._queuedRequest) {
      const { uciPosition: positionCmd, resolve: resolve } =
        this._queuedRequest;
      this._queuedRequest = null;
      setTimeout(() => {
        if (!this.worker || !this._ready || this._busy) {
          resolve(null);
          return;
        }
        this._runAnalysis(positionCmd, resolve);
      }, 150);
    }
  }
  newGame() {
    if (this._pendingResolve) {
      clearTimeout(this._pendingTimeout);
      this._pendingResolve(null);
      this._pendingResolve = null;
    }
    if (this._queuedRequest) {
      this._queuedRequest.resolve(null);
      this._queuedRequest = null;
    }
    this._busy = false;
  }
  restartWorker() {
    if (this._busy) {
      this._restartPending = true;
      return;
    }
    this._doRestart();
  }
  _doRestart() {
    this._ready = false;
    try {
      this.worker?.terminate();
    } catch (e2) {}
    this.worker = null;
    if (this._blobURL) {
      this._startWorker();
    }
  }
  hardStop() {
    clearTimeout(this._pendingTimeout);
    this._pendingResolve = null;
    if (this._queuedRequest) {
      this._queuedRequest.resolve(null);
      this._queuedRequest = null;
    }
    this._busy = false;
    this._restartPending = false;
    this._ready = false;
    try {
      this.worker?.terminate();
    } catch (e2) {}
    this.worker = null;
  }
}
const ASHINA_MOVE_ICONS = {
  brilliant:
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 18 19"><g id="Brilliant"><path class="icon-shadow" opacity="0.3" d="M9,.5a9,9,0,1,0,9,9A9,9,0,0,0,9,.5Z"></path><path class="icon-background" fill="#26c2a3" d="M9,0a9,9,0,1,0,9,9A9,9,0,0,0,9,0Z"></path><g class="icon-component-shadow" opacity="0.2"><path d="M12.57,14.6a.51.51,0,0,1,0,.13.44.44,0,0,1-.08.11l-.11.08-.13,0h-2l-.13,0L10,14.84A.41.41,0,0,1,10,14.6V12.7a.32.32,0,0,1,.09-.23.39.39,0,0,1,.1-.08l.13,0h2a.31.31,0,0,1,.24.1.39.39,0,0,1,.08.1.51.51,0,0,1,0,.13Zm-.12-3.93a.17.17,0,0,1,0,.12.41.41,0,0,1-.07.11.4.4,0,0,1-.23.08H10.35a.31.31,0,0,1-.34-.31L9.86,3.9A.36.36,0,0,1,10,3.66a.23.23,0,0,1,.11-.08.27.27,0,0,1,.13,0H12.3a.32.32,0,0,1,.25.1.36.36,0,0,1,.09.24Z"></path><path d="M8.07,14.6a.51.51,0,0,1,0,.13.44.44,0,0,1-.08.11l-.11.08-.13,0h-2l-.13,0-.11-.08a.41.41,0,0,1-.08-.24V12.7a.27.27,0,0,1,0-.13.36.36,0,0,1,.07-.1.39.39,0,0,1,.1-.08l.13,0h2a.31.31,0,0,1,.24.1.39.39,0,0,1,.08.1.51.51,0,0,1,0,.13ZM8,10.67a.17.17,0,0,1,0,.12.41.41,0,0,1-.07.11.4.4,0,0,1-.23.08H5.85a.31.31,0,0,1-.34-.31L5.36,3.9a.36.36,0,0,1,.09-.24.23.23,0,0,1,.11-.08.27.27,0,0,1,.13,0H7.8a.35.35,0,0,1,.25.1.36.36,0,0,1,.09.24Z"></path></g><g><path class="icon-component" fill="#fff" d="M12.57,14.1a.51.51,0,0,1,0,.13.44.44,0,0,1-.08.11l-.11.08-.13,0h-2l-.13,0L10,14.34A.41.41,0,0,1,10,14.1V12.2A.32.32,0,0,1,10,12a.39.39,0,0,1,.1-.08l.13,0h2a.31.31,0,0,1,.24.1.39.39,0,0,1,.08.1.51.51,0,0,1,0,.13Zm-.12-3.93a.17.17,0,0,1,0,.12.41.41,0,0,1-.07.11.4.4,0,0,1-.23.08H10.35a.31.31,0,0,1-.34-.31L9.86,3.4A.36.36,0,0,1,10,3.16a.23.23,0,0,1,.11-.08.27.27,0,0,1,.13,0H12.3a.32.32,0,0,1,.25.1.36.36,0,0,1,.09.24Z"></path><path class="icon-component" fill="#fff" d="M8.07,14.1a.51.51,0,0,1,0,.13.44.44,0,0,1-.08.11l-.11.08-.13,0h-2l-.13,0-.11-.08a.41.41,0,0,1-.08-.24V12.2a.27.27,0,0,1,0-.13.36.36,0,0,1,.07-.1.39.39,0,0,1,.1-.08l.13,0h2A.31.31,0,0,1,8,12a.39.39,0,0,1,.08.1.51.51,0,0,1,0,.13ZM8,10.17a.17.17,0,0,1,0,.12.41.41,0,0,1-.07.11.4.4,0,0,1-.23.08H5.85a.31.31,0,0,1-.34-.31L5.36,3.4a.36.36,0,0,1,.09-.24.23.23,0,0,1,.11-.08.27.27,0,0,1,.13,0H7.8a.35.35,0,0,1,.25.1.36.36,0,0,1,.09.24Z"></path></g></g></svg>',
  greatFind:
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 18 19"><g id="great_find"><path class="icon-shadow" opacity="0.3" d="M9,.5a9,9,0,1,0,9,9A9,9,0,0,0,9,.5Z"></path><path class="icon-background" fill="#749BBF" d="M9,0a9,9,0,1,0,9,9A9,9,0,0,0,9,0Z"></path><g><g class="icon-component-shadow" opacity="0.2"><path d="M10.32,14.6a.27.27,0,0,1,0,.13.44.44,0,0,1-.08.11l-.11.08-.13,0H8l-.13,0-.11-.08a.41.41,0,0,1-.08-.24V12.7a.27.27,0,0,1,0-.13.36.36,0,0,1,.07-.1.39.39,0,0,1,.1-.08l.13,0h2a.31.31,0,0,1,.24.1.39.39,0,0,1,.08.1.51.51,0,0,1,0,.13Zm-.12-3.93a.17.17,0,0,1,0,.12.41.41,0,0,1-.07.11.4.4,0,0,1-.23.08H8.1a.31.31,0,0,1-.34-.31L7.61,3.9a.36.36,0,0,1,.09-.24.23.23,0,0,1,.11-.08.27.27,0,0,1,.13,0h2.11a.32.32,0,0,1,.25.1.36.36,0,0,1,.09.24Z"></path></g><path class="icon-component" fill="#fff" d="M10.32,14.1a.27.27,0,0,1,0,.13.44.44,0,0,1-.08.11l-.11.08-.13,0H8l-.13,0-.11-.08a.41.41,0,0,1-.08-.24V12.2a.27.27,0,0,1,0-.13.36.36,0,0,1,.07-.1.39.39,0,0,1,.1-.08l.13,0h2a.31.31,0,0,1,.24.1.39.39,0,0,1,.08.1.51.51,0,0,1,0,.13Zm-.12-3.93a.17.17,0,0,1,0,.12.41.41,0,0,1-.07.11.4.4,0,0,1-.23.08H8.1a.31.31,0,0,1-.34-.31L7.61,3.4a.36.36,0,0,1,.09-.24.23.23,0,0,1,.11-.08.27.27,0,0,1,.13,0h2.11a.32.32,0,0,1,.25.1.36.36,0,0,1,.09.24Z"></path></g></g></svg>',
  best: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 18 19"><g id="best"><path class="icon-shadow" opacity="0.3" d="M9,.5a9,9,0,1,0,9,9A9,9,0,0,0,9,.5Z"></path><path class="icon-background" fill="#81B64C" d="M9,0a9,9,0,1,0,9,9A9,9,0,0,0,9,0Z"></path><path class="icon-component-shadow" opacity="0.2" d="M9,3.43a.5.5,0,0,0-.27.08.46.46,0,0,0-.17.22L7.24,7.17l-3.68.19a.52.52,0,0,0-.26.1.53.53,0,0,0-.16.23.45.45,0,0,0,0,.28.44.44,0,0,0,.15.23l2.86,2.32-1,3.56a.45.45,0,0,0,0,.28.46.46,0,0,0,.17.22.41.41,0,0,0,.26.09.43.43,0,0,0,.27-.08l3.09-2,3.09,2a.46.46,0,0,0,.53,0,.46.46,0,0,0,.17-.22.53.53,0,0,0,0-.28l-1-3.56L14.71,8.2A.44.44,0,0,0,14.86,8a.45.45,0,0,0,0-.28.53.53,0,0,0-.16-.23.52.52,0,0,0-.26-.1l-3.68-.2L9.44,3.73a.46.46,0,0,0-.17-.22A.5.5,0,0,0,9,3.43Z"></path><path class="icon-component" fill="#fff" d="M9,2.93A.5.5,0,0,0,8.73,3a.46.46,0,0,0-.17.22L7.24,6.67l-3.68.19A.52.52,0,0,0,3.3,7a.53.53,0,0,0-.16.23.45.45,0,0,0,0,.28.44.44,0,0,0,.15.23L6.15,10l-1,3.56a.45.45,0,0,0,0,.28.46.46,0,0,0,.17.22.41.41,0,0,0,.26.09.43.43,0,0,0,.27-.08l3.09-2,3.09,2a.46.46,0,0,0,.53,0,.46.46,0,0,0,.17-.22.53.53,0,0,0,0-.28l-1-3.56L14.71,7.7a.44.44,0,0,0,.15-.23.45.45,0,0,0,0-.28A.53.53,0,0,0,14.7,7a.52.52,0,0,0-.26-.1l-3.68-.2L9.44,3.23A.46.46,0,0,0,9.27,3,.5.5,0,0,0,9,2.93Z"></path></g></svg>',
  excellent:
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 18 19"><g id="excellent"><g><path class="icon-shadow" opacity="0.3" d="M9,.5a9,9,0,1,0,9,9A9,9,0,0,0,9,.5Z"></path><path class="icon-background" fill="#81B64C" d="M9,0a9,9,0,1,0,9,9A9,9,0,0,0,9,0Z"></path></g><g class="icon-component-shadow" opacity="0.2"><path d="M13.79,11.34c0-.2.4-.53.4-.94S14,9.72,14,9.58a2.06,2.06,0,0,0,.18-.83,1,1,0,0,0-.3-.69,1.13,1.13,0,0,0-.55-.2,10.29,10.29,0,0,1-2.07,0c-.37-.23,0-1.18.18-1.7S11.9,4,10.62,3.7c-.69-.17-.66.37-.78.9-.05.21-.09.43-.13.57A5,5,0,0,1,7.05,8.23a1.57,1.57,0,0,1-.42.18v4.94A7.23,7.23,0,0,1,8,13.53c.52.12.91.25,1.44.33A11.11,11.11,0,0,0,11,14a6.65,6.65,0,0,0,1.18,0,1.09,1.09,0,0,0,1-.59.66.66,0,0,0,.06-.2,1.63,1.63,0,0,1,.07-.3c.13-.28.37-.3.5-.68S13.74,11.53,13.79,11.34Z"></path><path d="M5.49,8.09H4.31a.5.5,0,0,0-.5.5v4.56a.5.5,0,0,0,.5.5H5.49a.5.5,0,0,0,.5-.5V8.59A.5.5,0,0,0,5.49,8.09Z"></path></g><g><path class="icon-component" fill="#fff" d="M13.79,10.84c0-.2.4-.53.4-.94S14,9.22,14,9.08a2.06,2.06,0,0,0,.18-.83,1,1,0,0,0-.3-.69,1.13,1.13,0,0,0-.55-.2,10.29,10.29,0,0,1-2.07,0c-.37-.23,0-1.18.18-1.7s.51-2.12-.77-2.43c-.69-.17-.66.37-.78.9-.05.21-.09.43-.13.57A5,5,0,0,1,7.05,7.73a1.57,1.57,0,0,1-.42.18v4.94A7.23,7.23,0,0,1,8,13c.52.12.91.25,1.44.33a11.11,11.11,0,0,0,1.62.16,6.65,6.65,0,0,0,1.18,0,1.09,1.09,0,0,0,1-.59.66.66,0,0,0,.06-.2,1.63,1.63,0,0,1,.07-.3c.13-.28.37-.3.5-.68S13.74,11,13.79,10.84Z"></path><path class="icon-component" fill="#fff" d="M5.49,7.59H4.31a.5.5,0,0,0-.5.5v4.56a.5.5,0,0,0,.5.5H5.49a.5.5,0,0,0,.5-.5V8.09A.5.5,0,0,0,5.49,7.59Z"></path></g></g></svg>',
  good: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 18 19"><g id="good"><g><path class="icon-shadow" opacity="0.3" d="M9,.5a9,9,0,1,0,9,9A9,9,0,0,0,9,.5Z"></path><path class="icon-background" fill="#95b776" d="M9,0a9,9,0,1,0,9,9A9,9,0,0,0,9,0Z"></path></g><g><path class="icon-component-shadow" opacity="0.2" d="M15.11,6.81,9.45,12.47,7.79,14.13a.39.39,0,0,1-.28.11.39.39,0,0,1-.27-.11L2.89,9.78a.39.39,0,0,1-.11-.28.39.39,0,0,1,.11-.27L4.28,7.85a.34.34,0,0,1,.12-.09l.15,0a.37.37,0,0,1,.15,0,.38.38,0,0,1,.13.09l2.69,2.68,5.65-5.65a.38.38,0,0,1,.13-.09.37.37,0,0,1,.15,0,.4.4,0,0,1,.15,0,.34.34,0,0,1,.12.09l1.39,1.38a.41.41,0,0,1,.08.13.33.33,0,0,1,0,.15.4.4,0,0,1,0,.15A.5.5,0,0,1,15.11,6.81Z"></path><path class="icon-component" fill="#fff" d="M15.11,6.31,9.45,12,7.79,13.63a.39.39,0,0,1-.28.11.39.39,0,0,1-.27-.11L2.89,9.28A.39.39,0,0,1,2.78,9a.39.39,0,0,1,.11-.27L4.28,7.35a.34.34,0,0,1,.12-.09l.15,0a.37.37,0,0,1,.15,0,.38.38,0,0,1,.13.09L7.52,10l5.65-5.65a.38.38,0,0,1,.13-.09.37.37,0,0,1,.15,0,.4.4,0,0,1,.15,0,.34.34,0,0,1,.12.09l1.39,1.38a.41.41,0,0,1,.08.13.33.33,0,0,1,0,.15.4.4,0,0,1,0,.15A.5.5,0,0,1,15.11,6.31Z"></path></g></g></svg>',
  book: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 18 19"><g id="book"><path class="icon-shadow" opacity="0.3" d="M9,.5a9,9,0,1,0,9,9A9,9,0,0,0,9,.5Z"></path><path class="icon-background" fill="#D5A47D" d="M9,0a9,9,0,1,0,9,9A9,9,0,0,0,9,0Z"></path><g><path class="icon-component-shadow" opacity="0.3" isolation="isolate" d="M8.45,5.9c-1-.75-2.51-1.09-4.83-1.09H2.54v8.71H3.62a8.16,8.16,0,0,1,4.83,1.17Z"></path><path class="icon-component-shadow" opacity="0.3" isolation="isolate" d="M9.54,14.69a8.14,8.14,0,0,1,4.84-1.17h1.08V4.81H14.38c-2.31,0-3.81.34-4.84,1.09Z"></path><path class="icon-component" fill="#fff" d="M8.45,5.4c-1-.75-2.51-1.09-4.83-1.09H3V13h.58a8.09,8.09,0,0,1,4.83,1.17Z"></path><path class="icon-component" fill="#fff" d="M9.54,14.19A8.14,8.14,0,0,1,14.38,13H15V4.31h-.58c-2.31,0-3.81.34-4.84,1.09Z"></path></g></g></svg>',
  inaccuracy:
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 18 19"><g id="inaccuracy"><path class="icon-shadow" opacity="0.3" d="M9,.5a9,9,0,1,0,9,9A9,9,0,0,0,9,.5Z"></path><path class="icon-background" fill="#F7C631" d="M9,0a9,9,0,1,0,9,9A9,9,0,0,0,9,0Z"></path><g class="icon-component-shadow" opacity="0.2"><path d="M13.66,14.8a.28.28,0,0,1,0,.13.23.23,0,0,1-.08.11.28.28,0,0,1-.11.08l-.12,0h-2l-.13,0a.27.27,0,0,1-.1-.08A.36.36,0,0,1,11,14.8V12.9a.59.59,0,0,1,0-.13.36.36,0,0,1,.07-.1l.1-.08.13,0h2a.33.33,0,0,1,.23.1.39.39,0,0,1,.08.1.28.28,0,0,1,0,.13Zm-.12-3.93a.31.31,0,0,1,0,.13.3.3,0,0,1-.07.1.3.3,0,0,1-.23.08H11.43a.31.31,0,0,1-.34-.31L10.94,4.1A.5.5,0,0,1,11,3.86l.11-.08.13,0h2.11a.35.35,0,0,1,.26.1.41.41,0,0,1,.08.24Z"></path><path d="M7.65,14.82a.27.27,0,0,1,0,.12.26.26,0,0,1-.07.11l-.1.07-.13,0H5.43a.25.25,0,0,1-.12,0,.27.27,0,0,1-.1-.08.31.31,0,0,1-.09-.22V13a.36.36,0,0,1,.09-.23l.1-.07.12,0H7.32a.32.32,0,0,1,.23.09.3.3,0,0,1,.07.1.28.28,0,0,1,0,.13Zm2.2-7.17a3.1,3.1,0,0,1-.36.73A5.58,5.58,0,0,1,9,9a4.85,4.85,0,0,1-.52.49,8,8,0,0,0-.65.63,1,1,0,0,0-.27.7V11a.21.21,0,0,1,0,.12.17.17,0,0,1-.06.1.23.23,0,0,1-.1.07l-.12,0H5.53a.21.21,0,0,1-.12,0,.18.18,0,0,1-.1-.07.2.2,0,0,1-.08-.1.37.37,0,0,1,0-.12v-.35a2.68,2.68,0,0,1,.13-.84,2.91,2.91,0,0,1,.33-.66,3.38,3.38,0,0,1,.45-.55c.16-.15.33-.29.49-.42a7.84,7.84,0,0,0,.65-.64,1,1,0,0,0,.25-.67.77.77,0,0,0-.07-.34.67.67,0,0,0-.23-.27A1.16,1.16,0,0,0,6.49,6,1.61,1.61,0,0,0,6,6.11a3,3,0,0,0-.41.18,1.75,1.75,0,0,0-.29.18l-.11.09A.5.5,0,0,1,5,6.62a.31.31,0,0,1-.21-.13l-1-1.21a.3.3,0,0,1,0-.4A1.36,1.36,0,0,1,4,4.68a3.07,3.07,0,0,1,.56-.38,5.49,5.49,0,0,1,.9-.37,3.69,3.69,0,0,1,1.19-.17,3.92,3.92,0,0,1,2.3.75,2.85,2.85,0,0,1,.77.92A2.82,2.82,0,0,1,10,6.71,3,3,0,0,1,9.85,7.65Z"></path></g><g><path class="icon-component" fill="#fff" d="M13.66,14.3a.28.28,0,0,1,0,.13.23.23,0,0,1-.08.11.28.28,0,0,1-.11.08l-.12,0h-2l-.13,0a.27.27,0,0,1-.1-.08A.36.36,0,0,1,11,14.3V12.4a.59.59,0,0,1,0-.13.36.36,0,0,1,.07-.1l.1-.08.13,0h2a.33.33,0,0,1,.23.1.39.39,0,0,1,.08.1.28.28,0,0,1,0,.13Zm-.12-3.93a.31.31,0,0,1,0,.13.3.3,0,0,1-.07.1.3.3,0,0,1-.23.08H11.43a.31.31,0,0,1-.34-.31L10.94,3.6A.5.5,0,0,1,11,3.36l.11-.08.13,0h2.11a.35.35,0,0,1,.26.1.41.41,0,0,1,.08.24Z"></path><path class="icon-component" fill="#fff" d="M7.65,14.32a.27.27,0,0,1,0,.12.26.26,0,0,1-.07.11l-.1.07-.13,0H5.43a.25.25,0,0,1-.12,0,.27.27,0,0,1-.1-.08.31.31,0,0,1-.09-.22V12.49a.36.36,0,0,1,.09-.23l.1-.07.12,0H7.32a.32.32,0,0,1,.23.09.3.3,0,0,1,.07.1.28.28,0,0,1,0,.13Zm2.2-7.17a3.1,3.1,0,0,1-.36.73,5.58,5.58,0,0,1-.49.6A4.85,4.85,0,0,1,8.48,9a8,8,0,0,0-.65.63,1,1,0,0,0-.27.7v.22a.21.21,0,0,1,0,.12.17.17,0,0,1-.06.1.23.23,0,0,1-.1.07l-.12,0H5.53a.21.21,0,0,1-.12,0,.18.18,0,0,1-.1-.07.2.2,0,0,1-.08-.1.37.37,0,0,1,0-.12v-.35a2.68,2.68,0,0,1,.13-.84,2.91,2.91,0,0,1,.33-.66,3.38,3.38,0,0,1,.45-.55c.16-.15.33-.29.49-.42a7.84,7.84,0,0,0,.65-.64,1,1,0,0,0,.25-.67.77.77,0,0,0-.07-.34.67.67,0,0,0-.23-.27,1.16,1.16,0,0,0-.72-.24A1.61,1.61,0,0,0,6,5.61a3,3,0,0,0-.41.18A1.75,1.75,0,0,0,5.3,6l-.11.09A.5.5,0,0,1,5,6.12.31.31,0,0,1,4.74,6l-1-1.21a.3.3,0,0,1,0-.4A1.36,1.36,0,0,1,4,4.18a3.07,3.07,0,0,1,.56-.38,5.49,5.49,0,0,1,.9-.37,3.69,3.69,0,0,1,1.19-.17A3.92,3.92,0,0,1,8.93,4a2.85,2.85,0,0,1,.77.92A2.82,2.82,0,0,1,10,6.21,3,3,0,0,1,9.85,7.15Z"></path></g></g></svg>',
  mistake:
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 18 19"><g id="mistake"><g><path class="icon-shadow" opacity="0.3" d="M9,.5a9,9,0,1,0,9,9A9,9,0,0,0,9,.5Z"></path><path class="icon-background" fill="#FFA459" d="M9,0a9,9,0,1,0,9,9A9,9,0,0,0,9,0Z"></path></g><g><g class="icon-component-shadow" opacity="0.2"><path d="M9.92,15a.27.27,0,0,1,0,.12.41.41,0,0,1-.07.11.32.32,0,0,1-.23.09H7.7a.25.25,0,0,1-.12,0,.27.27,0,0,1-.1-.08A.31.31,0,0,1,7.39,15V13.19A.32.32,0,0,1,7.48,13l.1-.07.12,0H9.59a.32.32,0,0,1,.23.09.61.61,0,0,1,.07.1.28.28,0,0,1,0,.13Zm2.2-7.17a3.1,3.1,0,0,1-.36.73,5.58,5.58,0,0,1-.49.6,6,6,0,0,1-.52.49,8,8,0,0,0-.65.63,1,1,0,0,0-.27.7v.22a.24.24,0,0,1,0,.12.17.17,0,0,1-.06.1.3.3,0,0,1-.1.07l-.12,0H7.79l-.12,0a.3.3,0,0,1-.1-.07.26.26,0,0,1-.07-.1.37.37,0,0,1,0-.12v-.35A2.42,2.42,0,0,1,7.61,10a2.55,2.55,0,0,1,.33-.66,3.38,3.38,0,0,1,.45-.55c.16-.15.33-.29.49-.42a7.73,7.73,0,0,0,.64-.64,1,1,0,0,0,.26-.67.77.77,0,0,0-.07-.34.75.75,0,0,0-.23-.27,1.16,1.16,0,0,0-.72-.24,1.61,1.61,0,0,0-.49.07,3,3,0,0,0-.41.18,1.41,1.41,0,0,0-.29.18l-.11.09a.5.5,0,0,1-.24.06A.31.31,0,0,1,7,6.69L6,5.48a.29.29,0,0,1,0-.4,1.36,1.36,0,0,1,.21-.2,3.07,3.07,0,0,1,.56-.38,5.38,5.38,0,0,1,.89-.37A3.75,3.75,0,0,1,8.9,4a4.07,4.07,0,0,1,1.2.19,4,4,0,0,1,1.09.56,2.76,2.76,0,0,1,.78.92,2.82,2.82,0,0,1,.28,1.28A3,3,0,0,1,12.12,7.85Z"></path></g><path class="icon-component" fill="#fff" d="M9.92,14.52a.27.27,0,0,1,0,.12.41.41,0,0,1-.07.11.32.32,0,0,1-.23.09H7.7a.25.25,0,0,1-.12,0,.27.27,0,0,1-.1-.08.31.31,0,0,1-.09-.22V12.69a.32.32,0,0,1,.09-.23l.1-.07.12,0H9.59a.32.32,0,0,1,.23.09.61.61,0,0,1,.07.1.28.28,0,0,1,0,.13Zm2.2-7.17a3.1,3.1,0,0,1-.36.73,5.58,5.58,0,0,1-.49.6,6,6,0,0,1-.52.49,8,8,0,0,0-.65.63,1,1,0,0,0-.27.7v.22a.24.24,0,0,1,0,.12.17.17,0,0,1-.06.1.3.3,0,0,1-.1.07l-.12,0H7.79l-.12,0a.3.3,0,0,1-.1-.07.26.26,0,0,1-.07-.1.37.37,0,0,1,0-.12v-.35a2.42,2.42,0,0,1,.13-.84,2.55,2.55,0,0,1,.33-.66,3.38,3.38,0,0,1,.45-.55c.16-.15.33-.29.49-.42a7.73,7.73,0,0,0,.64-.64,1,1,0,0,0,.26-.67.77.77,0,0,0-.07-.34A.75.75,0,0,0,9.48,6a1.16,1.16,0,0,0-.72-.24,1.61,1.61,0,0,0-.49.07A3,3,0,0,0,7.86,6a1.41,1.41,0,0,0-.29.18l-.11.09a.5.5,0,0,1-.24.06A.31.31,0,0,1,7,6.19L6,5a.29.29,0,0,1,0-.4,1.36,1.36,0,0,1,.21-.2A3.07,3.07,0,0,1,6.81,4a5.38,5.38,0,0,1,.89-.37,3.75,3.75,0,0,1,1.2-.17,4.07,4.07,0,0,1,1.2.19,4,4,0,0,1,1.09.56,2.76,2.76,0,0,1,.78.92,2.82,2.82,0,0,1,.28,1.28A3,3,0,0,1,12.12,7.35Z"></path></g></g></svg>',
  miss: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 18 19"><defs><style>.cls-1{fill:#f1f2f2;}.cls-2{fill:#FF7769;}.cls-3{opacity:.2;}.cls-4{opacity:.3;}</style></defs><g id="incorrect"><path class="cls-4" d="M9,.5C4.03,.5,0,4.53,0,9.5s4.03,9,9,9,9-4.03,9-9S13.97,.5,9,.5Z"></path><path class="cls-2" d="M9,0C4.03,0,0,4.03,0,9s4.03,9,9,9,9-4.03,9-9S13.97,0,9,0Z"></path><g class="cls-3"><path d="M13.99,12.51s.06,.08,.08,.13c.02,.05,.03,.1,.03,.15s-.01,.1-.03,.15c-.02,.05-.05,.09-.08,.13l-1.37,1.37s-.08,.06-.13,.08c-.05,.02-.1,.03-.15,.03s-.1-.01-.15-.03c-.05-.02-.09-.05-.13-.08l-3.06-3.06-3.06,3.06s-.08,.06-.13,.08c-.05,.02-.1,.03-.15,.03s-.1-.01-.15-.03c-.05-.02-.09-.05-.13-.08l-1.37-1.37c-.07-.07-.11-.17-.11-.28s.04-.2,.11-.28l3.06-3.06-3.06-3.06c-.07-.07-.11-.17-.11-.28s.04-.2,.11-.28l1.37-1.37c.07-.07,.17-.11,.28-.11s.2,.04,.28,.11l3.06,3.06,3.06-3.06c.07-.07,.17-.11,.28-.11s.2,.04,.28,.11l1.37,1.37s.06,.08,.08,.13c.02,.05,.03,.1,.03,.15s-.01,.1-.03,.15c-.02,.05-.05,.09-.08,.13l-3.06,3.06,3.06,3.06Z"></path></g><path class="cls-1" d="M13.99,12.01s.06,.08,.08,.13c.02,.05,.03,.1,.03,.15s-.01,.1-.03,.15c-.02,.05-.05,.09-.08,.13l-1.37,1.37s-.08,.06-.13,.08c-.05,.02-.1,.03-.15,.03s-.1-.01-.15-.03c-.05-.02-.09-.05-.13-.08l-3.06-3.06-3.06,3.06s-.08,.06-.13,.08c-.05,.02-.1,.03-.15,.03s-.1-.01-.15-.03c-.05-.02-.09-.05-.13-.08l-1.37-1.37c-.07-.07-.11-.17-.11-.28s.04-.2,.11-.28l3.06-3.06-3.06-3.06c-.07-.07-.11-.17-.11-.28s.04-.2,.11-.28l1.37-1.37c.07-.07,.17-.11,.28-.11s.2,.04,.28,.11l3.06,3.06,3.06-3.06c.07-.07,.17-.11,.28-.11s.2,.04,.28,.11l1.37,1.37s.06,.08,.08,.13c.02,.05,.03,.1,.03,.15s-.01,.1-.03,.15c-.02,.05-.05,.09-.08,.13l-3.06,3.06,3.06,3.06Z"></path></g></svg>',
  blunder:
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 18 19"><g id="blunder"><path class="icon-shadow" opacity="0.3" d="M9,.5a9,9,0,1,0,9,9A9,9,0,0,0,9,.5Z"></path><path class="icon-background" fill="#FA412D" d="M9,0a9,9,0,1,0,9,9A9,9,0,0,0,9,0Z"></path><g class="icon-component-shadow" opacity="0.2"><path d="M14.74,5.45A2.58,2.58,0,0,0,14,4.54,3.76,3.76,0,0,0,12.89,4a4.07,4.07,0,0,0-1.2-.19A3.92,3.92,0,0,0,10.51,4a5.87,5.87,0,0,0-.9.37,3,3,0,0,0-.32.2,3.46,3.46,0,0,1,.42.63,3.29,3.29,0,0,1,.36,1.47.31.31,0,0,0,.19-.06l.11-.08a2.9,2.9,0,0,1,.29-.19,3.89,3.89,0,0,1,.41-.17,1.55,1.55,0,0,1,.48-.07,1.1,1.1,0,0,1,.72.24.72.72,0,0,1,.23.26.8.8,0,0,1,.07.34,1,1,0,0,1-.25.67,7.71,7.71,0,0,1-.65.63,6.2,6.2,0,0,0-.48.43,2.93,2.93,0,0,0-.45.54,2.55,2.55,0,0,0-.33.66,2.62,2.62,0,0,0-.13.83V11a.24.24,0,0,0,0,.12.35.35,0,0,0,.17.17l.12,0h1.71l.12,0a.23.23,0,0,0,.1-.07.21.21,0,0,0,.06-.1.27.27,0,0,0,0-.12V10.8a1,1,0,0,1,.26-.7q.27-.28.66-.63A5.79,5.79,0,0,0,14.05,9a4.51,4.51,0,0,0,.48-.6,2.56,2.56,0,0,0,.36-.72,2.81,2.81,0,0,0,.14-1A2.66,2.66,0,0,0,14.74,5.45Z"></path><path d="M12.38,12.65H10.5l-.12,0a.34.34,0,0,0-.18.29v1.82a.36.36,0,0,0,.08.23.23.23,0,0,0,.1.07l.12,0h1.88a.24.24,0,0,0,.12,0,.26.26,0,0,0,.11-.07.36.36,0,0,0,.07-.1.28.28,0,0,0,0-.13V13a.27.27,0,0,0,0-.12.61.61,0,0,0-.07-.1A.32.32,0,0,0,12.38,12.65Z"></path><path d="M6.79,12.65H4.91l-.12,0a.34.34,0,0,0-.18.29v1.82a.36.36,0,0,0,.08.23.23.23,0,0,0,.1.07l.12,0H6.79a.24.24,0,0,0,.12,0A.26.26,0,0,0,7,15a.36.36,0,0,0,.07-.1.28.28,0,0,0,0-.13V13a.27.27,0,0,0,0-.12.61.61,0,0,0-.07-.1A.32.32,0,0,0,6.79,12.65Z"></path><path d="M8.39,4.54A3.76,3.76,0,0,0,7.3,4a4.07,4.07,0,0,0-1.2-.19A3.92,3.92,0,0,0,4.92,4a5.87,5.87,0,0,0-.9.37,3.37,3.37,0,0,0-.55.38l-.21.19a.32.32,0,0,0,0,.41l1,1.2a.26.26,0,0,0,.2.12.48.48,0,0,0,.24-.06l.11-.08a2.9,2.9,0,0,1,.29-.19l.4-.17A1.66,1.66,0,0,1,6,6.06a1.1,1.1,0,0,1,.72.24.72.72,0,0,1,.23.26A.77.77,0,0,1,7,6.9a1,1,0,0,1-.26.67,7.6,7.6,0,0,1-.64.63,6.28,6.28,0,0,0-.49.43,2.93,2.93,0,0,0-.45.54,2.72,2.72,0,0,0-.33.66,2.62,2.62,0,0,0-.13.83V11a.43.43,0,0,0,0,.12.39.39,0,0,0,.08.1.18.18,0,0,0,.1.07.21.21,0,0,0,.12,0H6.72l.12,0a.23.23,0,0,0,.1-.07.36.36,0,0,0,.07-.1A.5.5,0,0,0,7,11V10.8a1,1,0,0,1,.27-.7A8,8,0,0,1,8,9.47c.18-.15.35-.31.52-.48A7,7,0,0,0,9,8.39a3.23,3.23,0,0,0,.36-.72,3.07,3.07,0,0,0,.13-1,2.66,2.66,0,0,0-.29-1.27A2.58,2.58,0,0,0,8.39,4.54Z"></path></g><g><path class="icon-component" fill="#fff" d="M14.74,5A2.58,2.58,0,0,0,14,4a3.76,3.76,0,0,0-1.09-.56,4.07,4.07,0,0,0-1.2-.19,3.92,3.92,0,0,0-1.18.17,5.87,5.87,0,0,0-.9.37,3,3,0,0,0-.32.2,3.46,3.46,0,0,1,.42.63,3.29,3.29,0,0,1,.36,1.47.31.31,0,0,0,.19-.06L10.37,6a2.9,2.9,0,0,1,.29-.19,3.89,3.89,0,0,1,.41-.17,1.55,1.55,0,0,1,.48-.07,1.1,1.1,0,0,1,.72.24.72.72,0,0,1,.23.26.8.8,0,0,1,.07.34,1,1,0,0,1-.25.67,7.71,7.71,0,0,1-.65.63,6.2,6.2,0,0,0-.48.43,2.93,2.93,0,0,0-.45.54,2.55,2.55,0,0,0-.33.66,2.62,2.62,0,0,0-.13.83v.35a.24.24,0,0,0,0,.12.35.35,0,0,0,.17.17l.12,0h1.71l.12,0a.23.23,0,0,0,.1-.07.21.21,0,0,0,.06-.1.27.27,0,0,0,0-.12V10.3a1,1,0,0,1,.26-.7q.27-.28.66-.63a5.79,5.79,0,0,0,.51-.48,4.51,4.51,0,0,0,.48-.6,2.56,2.56,0,0,0,.36-.72,2.81,2.81,0,0,0,.14-1A2.66,2.66,0,0,0,14.74,5Z"></path><path class="icon-component" fill="#fff" d="M12.38,12.15H10.5l-.12,0a.34.34,0,0,0-.18.29v1.82a.36.36,0,0,0,.08.23.23.23,0,0,0,.1.07l.12,0h1.88a.24.24,0,0,0,.12,0,.26.26,0,0,0,.11-.07.36.36,0,0,0,.07-.1.28.28,0,0,0,0-.13V12.46a.27.27,0,0,0,0-.12.61.61,0,0,0-.07-.1A.32.32,0,0,0,12.38,12.15Z"></path><path class="icon-component" fill="#fff" d="M6.79,12.15H4.91l-.12,0a.34.34,0,0,0-.18.29v1.82a.36.36,0,0,0,.08.23.23.23,0,0,0,.1.07l.12,0H6.79a.24.24,0,0,0,.12,0A.26.26,0,0,0,7,14.51a.36.36,0,0,0,.07-.1.28.28,0,0,0,0-.13V12.46a.27.27,0,0,0,0-.12.61.61,0,0,0-.07-.1A.32.32,0,0,0,6.79,12.15Z"></path><path class="icon-component" fill="#fff" d="M8.39,4A3.76,3.76,0,0,0,7.3,3.48a4.07,4.07,0,0,0-1.2-.19,3.92,3.92,0,0,0-1.18.17,5.87,5.87,0,0,0-.9.37,3.37,3.37,0,0,0-.55.38l-.21.19a.32.32,0,0,0,0,.41l1,1.2a.26.26,0,0,0,.2.12.48.48,0,0,0,.24-.06L4.78,6a2.9,2.9,0,0,1,.29-.19l.4-.17A1.66,1.66,0,0,1,6,5.56a1.1,1.1,0,0,1,.72.24.72.72,0,0,1,.23.26A.77.77,0,0,1,7,6.4a1,1,0,0,1-.26.67,7.6,7.6,0,0,1-.64.63,6.28,6.28,0,0,0-.49.43,2.93,2.93,0,0,0-.45.54,2.72,2.72,0,0,0-.33.66,2.62,2.62,0,0,0-.13.83v.35a.43.43,0,0,0,0,.12.39.39,0,0,0,.08.1.18.18,0,0,0,.1.07.21.21,0,0,0,.12,0H6.72l.12,0a.23.23,0,0,0,.1-.07.36.36,0,0,0,.07-.1.5.5,0,0,0,0-.12V10.3a1,1,0,0,1,.27-.7A8,8,0,0,1,8,9c.18-.15.35-.31.52-.48A7,7,0,0,0,9,7.89a3.23,3.23,0,0,0,.36-.72,3.07,3.07,0,0,0,.13-1A2.66,2.66,0,0,0,9.15,5,2.58,2.58,0,0,0,8.39,4Z"></path></g></g></svg>',
};
// Maps a coach classification name to the icon asset key.
function classificationToIconKey(classification2) {
  const iconKeyMap2 = {
    brilliant: "brilliant",
    greatFind: "greatFind",
    best: "best",
    excellent: "excellent",
    good: "good",
    book: "book",
    inaccuracy: "inaccuracy",
    mistake: "mistake",
    miss: "mistake",
    blunder: "blunder",
  };
  return iconKeyMap2[classification2] || null;
}
const ASHINA_ICON_SQUARE_FRACTION = 0.37;
const ASHINA_ICON_CORNER_INSET_X = 6 / 92.5;
const ASHINA_ICON_CORNER_INSET_Y = 4 / 92.5;
const ASHINA_ICON_CORNER_OFFSET_X = 0.5 - ASHINA_ICON_CORNER_INSET_X;
const ASHINA_ICON_CORNER_OFFSET_Y = -(0.5 - ASHINA_ICON_CORNER_INSET_Y);
// Draws a classification icon on the board's SVG layer at a square (orientation-aware).
function _drawAshinaBoardIcon(square2, classification2, wrapperId2) {
  const iconKey2 = classificationToIconKey(classification2);
  if (!iconKey2) {
    return false;
  }
  const iconSvg2 = ASHINA_MOVE_ICONS[iconKey2];
  if (!iconSvg2) {
    return false;
  }
  const shapesGroup2 = document.querySelector(".cg-shapes g");
  if (!shapesGroup2) {
    return false;
  }
  document.getElementById(wrapperId2)?.remove();
  const isBlackSide2 = getLichessSide() === "black";
  const fileNum2 = square2.charCodeAt(0) - 96;
  const rankNum2 = parseInt(square2[1], 10);
  const cornerPos2 = isBlackSide2
    ? {
        x: 4.5 - fileNum2,
        y: rankNum2 - 4.5,
      }
    : {
        x: fileNum2 - 4.5,
        y: 4.5 - rankNum2,
      };
  let svgEl2;
  try {
    svgEl2 = new DOMParser().parseFromString(
      iconSvg2,
      "image/svg+xml",
    ).documentElement;
  } catch (e2) {
    return false;
  }
  const viewBox2 = (svgEl2.getAttribute("viewBox") || "0 0 18 19")
    .split(/\s+/)
    .map(Number);
  const viewBoxW2 = viewBox2[2] || 18;
  const viewBoxH2 = viewBox2[3] || 19;
  const squareFraction2 = ASHINA_ICON_SQUARE_FRACTION / viewBoxW2;
  const iconGroup2 = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "g",
  );
  iconGroup2.setAttribute("id", wrapperId2);
  iconGroup2.setAttribute(
    "transform",
    "translate(" +
      (cornerPos2.x + ASHINA_ICON_CORNER_OFFSET_X) +
      ", " +
      (cornerPos2.y + ASHINA_ICON_CORNER_OFFSET_Y) +
      ") scale(" +
      squareFraction2 +
      ") translate(" +
      -viewBoxW2 / 2 +
      ", " +
      -viewBoxH2 / 2 +
      ")",
  );
  Array.from(svgEl2.childNodes).forEach((child2) => {
    iconGroup2.appendChild(document.importNode(child2, true));
  });
  shapesGroup2.appendChild(iconGroup2);
  return true;
}
const ASHINA_ECO_ICON_WRAPPER_ID = "ashina-eco-book-icon";
// Shows the book-move icon on the board.
function placeLichessEcoBookIcon(square2) {
  _drawAshinaBoardIcon(square2, "book", ASHINA_ECO_ICON_WRAPPER_ID);
}
// Removes the book-move icon.
function clearLichessEcoBookIcon() {
  document.getElementById(ASHINA_ECO_ICON_WRAPPER_ID)?.remove();
}
const ASHINA_ICON_WRAPPER_ID = "ashina-move-feedback-icon";
const ASHINA_PREANALYZE_ID_PREFIX = "ashina-preanalyze-icon-";
let _lichessPreAnalyzeSquares = [];
// Removes move-feedback icons.
function clearLichessMoveFeedback() {
  document.getElementById(ASHINA_ICON_WRAPPER_ID)?.remove();
}
// Shows the classification icon for the move just played.
function placeLichessMoveFeedback(square2, classification2) {
  clearLichessMoveFeedback();
  _drawAshinaBoardIcon(square2, classification2, ASHINA_ICON_WRAPPER_ID);
}
// Shows the pre-analyze classification icon on a square.
function placeLichessPreAnalyzeIcon(square2, classification2) {
  const iconId2 = ASHINA_PREANALYZE_ID_PREFIX + square2;
  const iconEl2 = _drawAshinaBoardIcon(square2, classification2, iconId2);
  if (iconEl2 && !_lichessPreAnalyzeSquares.includes(square2)) {
    _lichessPreAnalyzeSquares.push(square2);
  }
}
// Removes all pre-analyze icons.
function clearLichessPreAnalyzeMarkings() {
  _lichessPreAnalyzeSquares.forEach((square2) => {
    document.getElementById(ASHINA_PREANALYZE_ID_PREFIX + square2)?.remove();
  });
  _lichessPreAnalyzeSquares = [];
}
// Syncs coach settings (enabled, depth, voice, locale) into the Torch worker.
function applyLichessCoachOptions(options2) {
  lichessCoachSettings.enabled = !!options2["option-coach-enabled"];
  lichessCoachSettings.depth = options2["option-coach-depth"] || 10;
  lichessCoachSettings.voice = options2["option-coach-voice"] || "david";
  lichessCoachSettings.locale = options2["option-coach-locale"] || "en-US";
  lichessCoachSettings.moveFeedback =
    options2["option-coach-move-feedback"] !== false;
  lichessCoachSettings.accuracy = options2["option-coach-accuracy"] !== false;
  lichessCoachSettings.voiceEnabled =
    options2["option-coach-voice-enabled"] !== false;
  lichessCoachSettings.recap = !!options2["option-coach-recap"];
  lichessCoachSettings.preAnalyze = !!options2["option-pre-analyze-enabled"];
}
// Replays recorded steps (plus an optional candidate move) through chess.js into a UCI `position` replay list.
function getLichessReplayUciMoves(steps2, candidateMove2) {
  if (typeof Chess === "undefined") {
    return null;
  }
  if (!steps2 || steps2.length === 0) {
    return null;
  }
  try {
    const startFen =
      steps2[0].fen ||
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const chess = new Chess(startFen);
    const uciMoves = [];
    for (let stepIdx = 1; stepIdx < steps2.length; stepIdx++) {
      const moveSan = steps2[stepIdx].san || steps2[stepIdx].uci;
      if (!moveSan) {
        continue;
      }
      try {
        const stepMove = chess.move(moveSan, {
          strict: false,
        });
        if (stepMove) {
          uciMoves.push(
            stepMove.from + stepMove.to + (stepMove.promotion || ""),
          );
        }
      } catch (e2) {}
    }
    if (candidateMove2) {
      try {
        const candidateMoveRes = chess.move(candidateMove2, {
          strict: false,
        });
        if (candidateMoveRes) {
          uciMoves.push(
            candidateMoveRes.from +
              candidateMoveRes.to +
              (candidateMoveRes.promotion || ""),
          );
        }
      } catch (e2) {}
    }
    const replayResult = {
      startFen: startFen,
      uciMoves: uciMoves,
    };
    return replayResult;
  } catch (e2) {
    return null;
  }
}
// Builds the `position fen … moves …` command for the coach from the current line.
function buildCoachUciPosition(steps2, lastMove2) {
  const replay2 = getLichessReplayUciMoves(steps2, lastMove2);
  if (!replay2) {
    return null;
  }
  return (
    "position fen " +
    replay2.startFen +
    (replay2.uciMoves.length ? " moves " + replay2.uciMoves.join(" ") : "")
  );
}
// Builds the `position fen … moves …` command including a candidate move (pre-move analysis).
function buildPreAnalyzeUciPosition(steps2, lastMove2, candidateUci2) {
  const replay2 = getLichessReplayUciMoves(steps2, lastMove2);
  if (!replay2) {
    return null;
  }
  const allMoves2 = replay2.uciMoves.concat([candidateUci2]);
  return "position fen " + replay2.startFen + " moves " + allMoves2.join(" ");
}
let _lichessCoachAnalysisId = 0;
// Coach pipeline trigger: builds the position, waits for the Torch worker, runs the analysis with a stale-FEN guard.
function triggerLichessCoachAnalysis(steps2, fullLine2, boardFen2) {
  if (!lichessCoachSettings.enabled) {
    return;
  }
  if (!lichessCoach) {
    return;
  }
  const positionCmd2 = buildCoachUciPosition(steps2, fullLine2);
  if (!positionCmd2) {
    return;
  }
  const analysisId2 = ++_lichessCoachAnalysisId;
  if (boardFen2) {
    _lichessCoachInFlightBoardFen = boardFen2;
  }
  const waitForCoach2 = async () => {
    let waited2 = 0;
    while (
      lichessCoach &&
      lichessCoach.worker &&
      !lichessCoach._ready &&
      waited2 < 3000
    ) {
      await new Promise((timerResolve) => setTimeout(timerResolve, 100));
      waited2 += 100;
      if (analysisId2 !== _lichessCoachAnalysisId) {
        return false;
      }
    }
    return true;
  };
  waitForCoach2().then((ready2) => {
    if (!ready2) {
      if (_lichessCoachInFlightBoardFen === boardFen2) {
        _lichessCoachInFlightBoardFen = null;
      }
      return;
    }
    if (!lichessCoach || !lichessCoach.worker || !lichessCoach._ready) {
      console.warn(
        "[ASHINA-DBG][lichess.js][coach] 3sn beklendi, worker hâlâ hazır değil — bu deneme atlanıyor",
      );
      if (_lichessCoachInFlightBoardFen === boardFen2) {
        _lichessCoachInFlightBoardFen = null;
      }
      return;
    }
    _runLichessCoachGetAnalysis(positionCmd2, analysisId2, boardFen2);
  });
}
// Runs the coach analysis and fans results out to feedback icons, accuracy, voice and tallies.
function _runLichessCoachGetAnalysis(positionCmd2, analysisId2, boardFen2) {
  lichessCoach
    .getAnalysis(positionCmd2)
    .then((analysis2) => {
      if (!analysis2) {
        return;
      }
      if (analysisId2 !== _lichessCoachAnalysisId) {
        return;
      }
      if (boardFen2) {
        _lichessLastCoachTriggeredBoardFen = boardFen2;
      }
      window.lichessLastCoachResult = analysis2;
      if (
        lichessCoachSettings.moveFeedback &&
        !lichessCoachSettings.preAnalyze &&
        analysis2.classificationName &&
        analysis2.playedMoveLan
      ) {
        const playedTo = analysis2.playedMoveLan.slice(-2);
        placeLichessMoveFeedback(playedTo, analysis2.classificationName);
      }
      if (analysis2.tallies && lichessCoachSettings.recap) {
        updateLichessTalliesWidget(analysis2.tallies);
      }
      if (lichessCoachSettings.accuracy) {
        updateLichessAccuracyWidget(analysis2);
      } else {
        resetLichessAccuracyWidget();
      }
      if (lichessCoachSettings.voiceEnabled) {
        playLichessCoachAudio(analysis2.audioUrlHash);
      }
    })
    .catch(() => {})
    .finally(() => {
      if (_lichessCoachInFlightBoardFen === boardFen2) {
        _lichessCoachInFlightBoardFen = null;
      }
    });
}
// Clamps a widget position so it stays inside the viewport (6px margin).
function _ashinaClampWidgetPos(left2, top2, widgetW2, widgetH2) {
  const margin2 = 6;
  const maxLeft2 = Math.max(margin2, window.innerWidth - widgetW2 - margin2);
  const maxTop2 = Math.max(margin2, window.innerHeight - widgetH2 - margin2);
  return {
    left: Math.min(Math.max(left2, margin2), maxLeft2),
    top: Math.min(Math.max(top2, margin2), maxTop2),
  };
}
const LICHESS_TALLY_ROWS = [
  {
    key: "brilliant",
  },
  {
    key: "greatFind",
  },
  {
    key: "best",
  },
  {
    key: "excellent",
  },
  {
    key: "good",
  },
  {
    key: "book",
  },
  {
    key: "inaccuracy",
  },
  {
    key: "mistake",
  },
  {
    key: "miss",
  },
  {
    key: "blunder",
  },
];
// Builds the accuracy widget (white/black accuracy badges) and positions it near the board.
function createLichessAccuracyWidget() {
  if (document.getElementById("ashina-accuracy-widget")) {
    return;
  }
  if (!document.getElementById("ashina-acc-style")) {
    const accStyle = document.createElement("style");
    accStyle.id = "ashina-acc-style";
    accStyle.textContent =
      "\n      #ashina-accuracy-widget {\n        position: fixed;\n        top: 80px;\n        right: 20px;\n        z-index: 99999;\n        cursor: grab;\n        user-select: none;\n        border-radius: 5px;\n        overflow: hidden;\n        display: flex;\n        flex-direction: row;\n        font-family: 'Segoe UI', Arial, sans-serif;\n      }\n      #ashina-accuracy-widget:active { cursor: grabbing; }\n      .ashina-acc-half {\n        display: flex;\n        align-items: center;\n        justify-content: center;\n        padding: 9px 20px;\n        min-width: 64px;\n      }\n      #ashina-acc-half-white { background: #f0ede8; }\n      #ashina-acc-half-black { background: #1e1e1e; }\n      #ashina-acc-val-white {\n        font-size: 20px;\n        font-weight: 800;\n        color: #1a1a1a;\n        letter-spacing: 0.3px;\n        line-height: 1;\n      }\n      #ashina-acc-val-black {\n        font-size: 20px;\n        font-weight: 800;\n        color: #ffffff;\n        letter-spacing: 0.3px;\n        line-height: 1;\n      }\n    ";
    document.head.appendChild(accStyle);
  }
  const accWidget2 = document.createElement("div");
  accWidget2.id = "ashina-accuracy-widget";
  accWidget2.innerHTML =
    '\n    <div class="ashina-acc-half" id="ashina-acc-half-white">\n      <span id="ashina-acc-val-white">—</span>\n    </div>\n    <div class="ashina-acc-half" id="ashina-acc-half-black">\n      <span id="ashina-acc-val-black">—</span>\n    </div>\n  ';
  document.body.appendChild(accWidget2);
  function positionAccuracyWidget2(attempt2) {
    attempt2 = attempt2 || 0;
    const accBoardEl2 =
      document.querySelector(".cg-wrap") || document.querySelector("cg-board");
    const accWidget2 = document.getElementById("ashina-accuracy-widget");
    if (!accWidget2) {
      return;
    }
    if (accBoardEl2) {
      const accBoardRect = accBoardEl2.getBoundingClientRect();
      if (
        (accBoardRect.width === 0 || accBoardRect.height === 0) &&
        attempt2 < 60
      ) {
        requestAnimationFrame(() => positionAccuracyWidget2(attempt2 + 1));
        return;
      }
      const accWidgetW = accWidget2.offsetWidth || 140;
      const accWidgetH = accWidget2.offsetHeight || 34;
      const talliesWidget = document.getElementById("ashina-tallies-widget");
      const talliesWidgetH = talliesWidget
        ? talliesWidget.offsetHeight || 220
        : 220;
      const accLeftBase = accBoardRect.left - 50;
      const accLeft = accLeftBase - accWidgetW - 6 - accWidgetW / 3;
      const accTop = accBoardRect.bottom - talliesWidgetH - accWidgetH - 20;
      const clampedPos = _ashinaClampWidgetPos(
        accLeft,
        accTop,
        accWidgetW,
        accWidgetH,
      );
      accWidget2.style.left = clampedPos.left + "px";
      accWidget2.style.top = clampedPos.top + "px";
    } else if (attempt2 < 60) {
      requestAnimationFrame(() => positionAccuracyWidget2(attempt2 + 1));
      return;
    } else {
      accWidget2.style.top = "100px";
      accWidget2.style.left = "100px";
    }
    accWidget2.style.right = "auto";
  }
  positionAccuracyWidget2();
  let isDragging2 = false;
  let grabX2;
  let grabY2;
  let startLeft2;
  let startTop2;
  accWidget2.addEventListener("mousedown", function (mouseEvent2) {
    isDragging2 = true;
    grabX2 = mouseEvent2.clientX;
    grabY2 = mouseEvent2.clientY;
    const widgetRect2 = accWidget2.getBoundingClientRect();
    startLeft2 = widgetRect2.left;
    startTop2 = widgetRect2.top;
    accWidget2.style.right = "auto";
    mouseEvent2.preventDefault();
  });
  document.addEventListener("mousemove", function (mouseEvent2) {
    if (!isDragging2) {
      return;
    }
    accWidget2.style.left = startLeft2 + (mouseEvent2.clientX - grabX2) + "px";
    accWidget2.style.top = startTop2 + (mouseEvent2.clientY - grabY2) + "px";
  });
  document.addEventListener("mouseup", function () {
    isDragging2 = false;
  });
  accWidget2.addEventListener(
    "touchstart",
    function (touchEvent2) {
      const touch2 = touchEvent2.touches[0];
      isDragging2 = true;
      grabX2 = touch2.clientX;
      grabY2 = touch2.clientY;
      const widgetRect2 = accWidget2.getBoundingClientRect();
      startLeft2 = widgetRect2.left;
      startTop2 = widgetRect2.top;
      accWidget2.style.right = "auto";
      touchEvent2.preventDefault();
    },
    {
      passive: false,
    },
  );
  document.addEventListener(
    "touchmove",
    function (touchEvent2) {
      if (!isDragging2) {
        return;
      }
      const touch2 = touchEvent2.touches[0];
      accWidget2.style.left = startLeft2 + (touch2.clientX - grabX2) + "px";
      accWidget2.style.top = startTop2 + (touch2.clientY - grabY2) + "px";
      touchEvent2.preventDefault();
    },
    {
      passive: false,
    },
  );
  document.addEventListener("touchend", function () {
    isDragging2 = false;
  });
}
// Updates the accuracy badge values from a coach result.
function updateLichessAccuracyWidget(accuracy2) {
  createLichessAccuracyWidget();
  const { whiteAccuracy: whiteAccuracy2, blackAccuracy: blackAccuracy2 } =
    accuracy2;
  if (whiteAccuracy2 != null) {
    const whiteAccEl = document.getElementById("ashina-acc-val-white");
    if (whiteAccEl) {
      whiteAccEl.textContent = whiteAccuracy2.toFixed(1);
    }
  }
  if (blackAccuracy2 != null) {
    const blackAccEl = document.getElementById("ashina-acc-val-black");
    if (blackAccEl) {
      blackAccEl.textContent = blackAccuracy2.toFixed(1);
    }
  }
}
// Resets the accuracy badges to the placeholder dash.
function resetLichessAccuracyWidget() {
  const whiteAccEl2 = document.getElementById("ashina-acc-val-white");
  const blackAccEl2 = document.getElementById("ashina-acc-val-black");
  if (whiteAccEl2) {
    whiteAccEl2.textContent = "—";
  }
  if (blackAccEl2) {
    blackAccEl2.textContent = "—";
  }
}
// Builds the move-quality tallies widget (Brilliant…Blunder counts per side).
function createLichessTalliesWidget() {
  if (document.getElementById("ashina-tallies-widget")) {
    return;
  }
  if (!document.getElementById("ashina-tallies-style")) {
    const talliesStyle = document.createElement("style");
    talliesStyle.id = "ashina-tallies-style";
    talliesStyle.textContent =
      "\n      #ashina-tallies-widget {\n        position: fixed;\n        z-index: 99999;\n        background: rgba(30,28,26,0.92);\n        border-radius: 6px;\n        overflow: hidden;\n        font-family: 'Segoe UI', Arial, sans-serif;\n        cursor: grab;\n        user-select: none;\n        width: 82px;\n        box-shadow: 0 2px 8px rgba(0,0,0,0.5);\n      }\n      #ashina-tallies-widget:active { cursor: grabbing; }\n      #atw-header {\n        display: grid;\n        grid-template-columns: 1fr 18px 1fr;\n        align-items: center;\n        padding: 3px 5px 2px;\n        border-bottom: 1px solid rgba(255,255,255,0.08);\n      }\n      .atw-header-white {\n        width: 8px; height: 8px;\n        border-radius: 50%;\n        background: #fff;\n        justify-self: center;\n      }\n      .atw-header-black {\n        width: 8px; height: 8px;\n        border-radius: 50%;\n        background: #1a1a1a;\n        border: 1px solid #555;\n        justify-self: center;\n      }\n      .atw-row {\n        display: grid;\n        grid-template-columns: 1fr 18px 1fr;\n        align-items: center;\n        height: 18px;\n        padding: 0 6px;\n        gap: 2px;\n        border-bottom: 1px solid rgba(255,255,255,0.04);\n      }\n      .atw-row:last-child { border-bottom: none; }\n      .atw-num { font-size: 10px; font-weight: 700; line-height: 1; }\n      .atw-num-w { text-align: center; }\n      .atw-num-b { text-align: center; }\n      .atw-icon { display: flex; align-items: center; justify-content: center; }\n      .atw-c-brilliant  { color: #26c2a3; }\n      .atw-c-greatFind  { color: #749BBF; }\n      .atw-c-best       { color: #81B64C; }\n      .atw-c-excellent  { color: #81B64C; }\n      .atw-c-good       { color: #95b776; }\n      .atw-c-book       { color: #D5A47D; }\n      .atw-c-inaccuracy { color: #F7C631; }\n      .atw-c-mistake    { color: #FFA459; }\n      .atw-c-miss       { color: #FF7769; }\n      .atw-c-blunder    { color: #FA412D; }\n      @media (min-width: 769px) {\n        #ashina-tallies-widget { width: 150px; }\n        #atw-header { grid-template-columns: 1fr 24px 1fr; }\n        .atw-row { grid-template-columns: 1fr 24px 1fr; height: 22px; }\n        .atw-num { font-size: 12px; }\n        .atw-header-white, .atw-header-black { width: 10px; height: 10px; }\n      }\n    ";
    document.head.appendChild(talliesStyle);
  }
  const talliesWidget2 = document.createElement("div");
  talliesWidget2.id = "ashina-tallies-widget";
  const talliesTitles2 = {
    en: "MOVES",
    tr: "HAMLELER",
    ru: "ХОДЫ",
  };
  const titleText2 = talliesTitles2[lichessLanguage] || talliesTitles2.en;
  const talliesHeader2 =
    '\n    <div id="atw-header">\n      <div class="atw-header-white"></div>\n      <div></div>\n      <div class="atw-header-black"></div>\n    </div>\n  ';
  const talliesRows2 = LICHESS_TALLY_ROWS.map(
    (row) =>
      '\n    <div class="atw-row">\n      <span class="atw-num atw-num-w atw-c-' +
      row.key +
      '" id="atw-' +
      row.key +
      '">—</span>\n      <span class="atw-icon">' +
      (ASHINA_MOVE_ICONS[row.key] || "") +
      '</span>\n      <span class="atw-num atw-num-b atw-c-' +
      row.key +
      '" id="atb-' +
      row.key +
      '">—</span>\n    </div>\n  ',
  ).join("");
  talliesWidget2.innerHTML =
    '<div id="atw-title" style="text-align:center;font-size:8px;font-weight:700;letter-spacing:1px;color:#888;padding:3px 0 1px;">' +
    titleText2 +
    "</div>" +
    talliesHeader2 +
    talliesRows2;
  document.body.appendChild(talliesWidget2);
  function positionTalliesWidget2(attempt2) {
    attempt2 = attempt2 || 0;
    const talliesWidget2 = document.getElementById("ashina-tallies-widget");
    if (!talliesWidget2) {
      return;
    }
    const talliesBoardEl2 =
      document.querySelector(".cg-wrap") || document.querySelector("cg-board");
    if (talliesBoardEl2) {
      const talliesBoardRect = talliesBoardEl2.getBoundingClientRect();
      if (
        (talliesBoardRect.width === 0 || talliesBoardRect.height === 0) &&
        attempt2 < 60
      ) {
        requestAnimationFrame(() => positionTalliesWidget2(attempt2 + 1));
        return;
      }
      const widgetW = talliesWidget2.offsetWidth || 82;
      const talliesWidgetH = talliesWidget2.offsetHeight || 220;
      const boardLeft = talliesBoardRect.left - 50;
      const talliesLeft = boardLeft - widgetW - 6;
      const talliesTop = talliesBoardRect.bottom - talliesWidgetH;
      const clampedPos = _ashinaClampWidgetPos(
        talliesLeft,
        talliesTop,
        widgetW,
        talliesWidgetH,
      );
      talliesWidget2.style.left = clampedPos.left + "px";
      talliesWidget2.style.top = clampedPos.top + "px";
    } else if (attempt2 < 60) {
      requestAnimationFrame(() => positionTalliesWidget2(attempt2 + 1));
      return;
    } else {
      talliesWidget2.style.top = "100px";
      talliesWidget2.style.left = "10px";
      return;
    }
    talliesWidget2.style.right = "auto";
  }
  positionTalliesWidget2();
  let isDragging2 = false;
  let grabX2;
  let grabY2;
  let startLeft2;
  let startTop2;
  function startTalliesDrag2(clientX2, clientY2) {
    isDragging2 = true;
    grabX2 = clientX2;
    grabY2 = clientY2;
    const widgetRect2 = talliesWidget2.getBoundingClientRect();
    startLeft2 = widgetRect2.left;
    startTop2 = widgetRect2.top;
    talliesWidget2.style.right = "auto";
  }
  function dragTalliesWidgetTo2(clientX2, clientY2) {
    if (!isDragging2) {
      return;
    }
    talliesWidget2.style.left = startLeft2 + clientX2 - grabX2 + "px";
    talliesWidget2.style.top = startTop2 + clientY2 - grabY2 + "px";
  }
  function endDrag2() {
    isDragging2 = false;
  }
  talliesWidget2.addEventListener("mousedown", (mouseEvent2) => {
    startTalliesDrag2(mouseEvent2.clientX, mouseEvent2.clientY);
    mouseEvent2.preventDefault();
  });
  document.addEventListener("mousemove", (mouseEvent) =>
    dragTalliesWidgetTo2(mouseEvent.clientX, mouseEvent.clientY),
  );
  document.addEventListener("mouseup", endDrag2);
  talliesWidget2.addEventListener(
    "touchstart",
    (touchEvent2) => {
      const touch2 = touchEvent2.touches[0];
      startTalliesDrag2(touch2.clientX, touch2.clientY);
      touchEvent2.preventDefault();
    },
    {
      passive: false,
    },
  );
  document.addEventListener(
    "touchmove",
    (touchEvent2) => {
      if (!isDragging2) {
        return;
      }
      const touch2 = touchEvent2.touches[0];
      dragTalliesWidgetTo2(touch2.clientX, touch2.clientY);
      touchEvent2.preventDefault();
    },
    {
      passive: false,
    },
  );
  document.addEventListener("touchend", endDrag2);
}
// Updates the tallies counts from a coach result.
function updateLichessTalliesWidget(tallies2) {
  if (!tallies2) {
    return;
  }
  createLichessTalliesWidget();
  const whiteTallies2 = tallies2.white || {};
  const blackTallies2 = tallies2.black || {};
  LICHESS_TALLY_ROWS.forEach((row2) => {
    const whiteTallyEl2 = document.getElementById("atw-" + row2.key);
    const blackTallyEl2 = document.getElementById("atb-" + row2.key);
    if (whiteTallyEl2) {
      whiteTallyEl2.textContent = whiteTallies2[row2.key] ?? 0;
    }
    if (blackTallyEl2) {
      blackTallyEl2.textContent = blackTallies2[row2.key] ?? 0;
    }
  });
}
// Resets the tallies counts to dashes.
function resetLichessTalliesWidget() {
  LICHESS_TALLY_ROWS.forEach((row2) => {
    const whiteTallyEl2 = document.getElementById("atw-" + row2.key);
    const blackTallyEl2 = document.getElementById("atb-" + row2.key);
    if (whiteTallyEl2) {
      whiteTallyEl2.textContent = "—";
    }
    if (blackTallyEl2) {
      blackTallyEl2.textContent = "—";
    }
  });
}
let _lichessAudioCtx = null;
let _lichessAudioSource = null;
// Lazily creates the shared AudioContext for coach voice playback.
function _ensureLichessAudioContext() {
  if (_lichessAudioCtx) {
    return;
  }
  try {
    _lichessAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e2) {
    console.warn(
      "[ASHINA-DBG][lichess.js][coach] AudioContext oluşturulamadı:",
      e2,
    );
  }
  const dismissHandler2 = () => {
    if (_lichessAudioCtx && _lichessAudioCtx.state === "suspended") {
      _lichessAudioCtx.resume();
    }
  };
  document.addEventListener("click", dismissHandler2, {
    once: false,
  });
  document.addEventListener("keydown", dismissHandler2, {
    once: false,
  });
}
// Fetches the coach voice clip through the background service worker (CORS proxy) and plays it.
function playLichessCoachAudio(audioHash2) {
  if (!audioHash2) {
    return;
  }
  _ensureLichessAudioContext();
  if (!_lichessAudioCtx) {
    return;
  }
  if (_lichessAudioSource) {
    try {
      _lichessAudioSource.stop();
    } catch (e2) {}
    _lichessAudioSource = null;
  }
  const audioCtx2 = _lichessAudioCtx;
  const audioBase2 =
    lichessCoach?._audioBase ||
    "https://text-and-audio.chess.com/prod/released/David_coach/en-US/";
  const audioUrl2 = audioBase2 + audioHash2 + ".mp3";
  const requestId2 = "audio_" + Date.now();
  const playBuffer2 = (audioBuffer2) => {
    const bufferSource2 = audioCtx2.createBufferSource();
    bufferSource2.buffer = audioBuffer2;
    bufferSource2.connect(audioCtx2.destination);
    if (audioCtx2.state === "suspended") {
      audioCtx2.resume();
    }
    bufferSource2.start(0);
    _lichessAudioSource = bufferSource2;
  };
  const audioResponseHandler2 = (event2) => {
    if (event2.detail.requestId !== requestId2) {
      return;
    }
    window.removeEventListener(
      "AsinaFetchAudioResponse",
      audioResponseHandler2,
    );
    if (event2.detail.error) {
      console.warn(
        "[ASHINA-DBG][lichess.js][coach] ses fetch hatası:",
        event2.detail.error,
        "| URL:",
        audioUrl2,
      );
      return;
    }
    const audioBytes2 = new Uint8Array(event2.detail.buffer);
    audioCtx2
      .decodeAudioData(audioBytes2.buffer)
      .then((audioBuffer) => playBuffer2(audioBuffer))
      .catch((e) =>
        console.warn("[ASHINA-DBG][lichess.js][coach] ses decode hatası:", e),
      );
  };
  window.addEventListener("AsinaFetchAudioResponse", audioResponseHandler2);
  const audioRequest3 = {
    url: audioUrl2,
    requestId: requestId2,
  };
  const audioRequest4 = {
    detail: audioRequest3,
  };
  window.dispatchEvent(new CustomEvent("AsinaFetchAudio", audioRequest4));
}
// Processes queued pre-move analyses one by one, placing classification icons on the target squares.
async function runLichessPreAnalyzeQueue(queue2) {
  if (!lichessCoachSettings.preAnalyze) {
    return;
  }
  if (_lichessPreAnalyzeRunning) {
    return;
  }
  if (!lichessPreCoach) {
    console.warn(
      "[ASHINA-DBG][lichess.js][preanalyze] lichessPreCoach yok — çıkış",
    );
    return;
  }
  const analysisFen2 = _lichessCurrentAnalysisFen;
  if (!analysisFen2) {
    return;
  }
  _lichessPreAnalyzeRunning = true;
  _lichessPreAnalyzeFen = analysisFen2;
  clearLichessPreAnalyzeMarkings();
  for (const queueItem of queue2) {
    if (_lichessPreAnalyzeFen !== analysisFen2) {
      break;
    }
    if (!lichessCoachSettings.preAnalyze) {
      break;
    }
    const moveUci = queueItem.from + queueItem.to + (queueItem.promo || "");
    const positionCmd = buildPreAnalyzeUciPosition(
      _lichessLastSteps,
      _lichessLastMove,
      moveUci,
    );
    if (!positionCmd) {
      continue;
    }
    let waited = 0;
    while (lichessPreCoach.worker && !lichessPreCoach._ready && waited < 3000) {
      await new Promise((timerResolve) => setTimeout(timerResolve, 100));
      waited += 100;
      if (_lichessPreAnalyzeFen !== analysisFen2) {
        break;
      }
    }
    if (_lichessPreAnalyzeFen !== analysisFen2) {
      break;
    }
    let preResult = null;
    try {
      preResult = await lichessPreCoach.getAnalysis(positionCmd);
    } catch (e2) {
      console.warn("[ASHINA-DBG][lichess.js][preanalyze] hata:", e2);
    }
    if (!preResult || !preResult.classificationName) {
      continue;
    }
    if (_lichessPreAnalyzeFen !== analysisFen2) {
      break;
    }
    placeLichessPreAnalyzeIcon(queueItem.to, preResult.classificationName);
  }
  _lichessPreAnalyzeRunning = false;
}
let _lichessMobilePlayInterval = null;
let _lichessMobilePlayBusy = false;
const LICHESS_SMART_TIMING_PROFILES = {
  bullet: {
    fastSimple: [0, 600],
    mateFirst: [3500, 5000],
    mateCont: [0, 500],
    blunderReact: [3500, 5500],
    flagCriticalNormal: [0, 300],
    flagCriticalCapture: [500, 800],
    flagOnFlagNormal: [0, 500],
    flagOnFlagCapture: [500, 800],
  },
  blitz: {
    fastSimple: [0, 900],
    mateFirst: [5500, 10500],
    mateCont: [0, 800],
    blunderReact: [3500, 8500],
    flagCriticalNormal: [0, 300],
    flagCriticalCapture: [500, 800],
    flagOnFlagNormal: [0, 500],
    flagOnFlagCapture: [500, 800],
  },
};
// Humanized auto-move delay: midpoint + Box-Muller noise scaled by the center-weight setting, clamped to [min,max].
function computeLichessAutoMoveDelay() {
  const blunderReactEnabled2 = !!lichessOptions["option-blunder-react"];
  if (blunderReactEnabled2 && !!lichessOptions["option-automove-enabled"]) {
    const flagModeEnabled = !!lichessOptions["option-flag-mode-enabled"];
    const myClock = getLichessMyClockSeconds();
    const flagOpening = flagModeEnabled && myClock !== null && myClock <= 10;
    if (
      !flagOpening &&
      !_lichessBlunderReactEvalDisabled &&
      _lichessOpponentLastMoveScore === "Blunder"
    ) {
      const profileKey =
        lichessOptions["option-smart-timing-profile"] || "bullet";
      const blunderProfile =
        LICHESS_SMART_TIMING_PROFILES[profileKey] ||
        LICHESS_SMART_TIMING_PROFILES.bullet;
      const [minMs, maxMs] = blunderProfile.blunderReact;
      return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    }
  }
  const simulateMatesEnabled2 = !!lichessOptions["option-simulate-checkmates"];
  if (simulateMatesEnabled2 && lichessTopMoves.length > 0) {
    const bestMate = lichessTopMoves[0].mate;
    const profileKey =
      lichessOptions["option-smart-timing-profile"] || "bullet";
    const mateProfile =
      LICHESS_SMART_TIMING_PROFILES[profileKey] ||
      LICHESS_SMART_TIMING_PROFILES.bullet;
    const flagModeEnabled = !!lichessOptions["option-flag-mode-enabled"];
    const myClock = getLichessMyClockSeconds();
    const flagOpening = flagModeEnabled && myClock !== null && myClock <= 10;
    if (
      bestMate !== null &&
      bestMate !== undefined &&
      bestMate >= 2 &&
      bestMate <= 3
    ) {
      if (!_lichessSimulateMateActive) {
        _lichessSimulateMateActive = true;
        const [minMs, maxMs] = flagOpening
          ? [1500, 2500]
          : mateProfile.mateFirst;
        return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
      } else if (bestMate < 2 || bestMate > 3) {
        _lichessSimulateMateActive = false;
      } else {
        return Math.floor(Math.random() * (mateProfile.mateCont[1] + 1));
      }
    } else if (bestMate === null || bestMate === undefined || bestMate <= 0) {
      if (_lichessSimulateMateActive) {
        if (bestMate !== null && bestMate !== undefined) {
          _lichessSimulateMateActive = false;
        } else {
          return Math.floor(Math.random() * 501);
        }
      }
    }
  }
  const fastSimpleEnabled2 = !!lichessOptions["option-fast-simple-moves"];
  if (fastSimpleEnabled2 && lichessTopMoves.length > 0) {
    const bestMove = lichessTopMoves[0];
    const moveUci = bestMove.from + bestMove.to + (bestMove.promo || "");
    const isCastle = ["e1g1", "e1c1", "e8g8", "e8c8"].includes(moveUci);
    const isPromotion = moveUci.length === 5;
    if (isCastle || isPromotion) {
      const profileKey =
        lichessOptions["option-smart-timing-profile"] || "bullet";
      const fastProfile =
        LICHESS_SMART_TIMING_PROFILES[profileKey] ||
        LICHESS_SMART_TIMING_PROFILES.bullet;
      const [minMs, maxMs] = fastProfile.fastSimple;
      return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    }
  }
  const flagModeEnabled2 = !!lichessOptions["option-flag-mode-enabled"];
  const myClock2 = getLichessMyClockSeconds();
  if (flagModeEnabled2 && myClock2 !== null && myClock2 <= 5) {
    applyLichessFlagProfile(3, "Beginner");
    const profileKey =
      lichessOptions["option-smart-timing-profile"] || "bullet";
    const flagProfile =
      LICHESS_SMART_TIMING_PROFILES[profileKey] ||
      LICHESS_SMART_TIMING_PROFILES.bullet;
    let flagDelay =
      Math.floor(
        Math.random() *
          (flagProfile.flagCriticalNormal[1] -
            flagProfile.flagCriticalNormal[0] +
            1),
      ) + flagProfile.flagCriticalNormal[0];
    try {
      if (lichessTopMoves.length > 0 && _lichessCurrentAnalysisFen) {
        const isWhiteSide = getLichessSide() === "white";
        const isOwnSquare = (square2) => {
          const pieceAtTo2 = _lichessPieceAtSquare(
            _lichessCurrentAnalysisFen,
            square2,
          );
          return (
            pieceAtTo2 !== null &&
            (isWhiteSide
              ? pieceAtTo2 === pieceAtTo2.toLowerCase()
              : pieceAtTo2 === pieceAtTo2.toUpperCase())
          );
        };
        const isOwnTo = (tm) => isOwnSquare(tm.to);
        const bestMove = lichessTopMoves[0];
        let chosenMove = bestMove;
        if (isOwnTo(bestMove) && Math.random() < 0.5) {
          const alternateMove = lichessTopMoves.find((tm) => !isOwnTo(tm));
          if (alternateMove) {
            chosenMove = alternateMove;
          }
        }
        if (isOwnTo(chosenMove)) {
          flagDelay =
            Math.floor(
              Math.random() *
                (flagProfile.flagCriticalCapture[1] -
                  flagProfile.flagCriticalCapture[0] +
                  1),
            ) + flagProfile.flagCriticalCapture[0];
        }
      }
    } catch (e2) {
      console.warn("[FLAG MODE] Capture kontrolü hatası (≤5s):", e2);
    }
    return flagDelay;
  } else if (flagModeEnabled2 && myClock2 !== null && myClock2 <= 10) {
    applyLichessFlagProfile(3, "Human");
    const profileKey =
      lichessOptions["option-smart-timing-profile"] || "bullet";
    const flagProfile =
      LICHESS_SMART_TIMING_PROFILES[profileKey] ||
      LICHESS_SMART_TIMING_PROFILES.bullet;
    let isOwnPiece = false;
    try {
      if (lichessTopMoves.length > 0 && _lichessCurrentAnalysisFen) {
        const isWhiteSide = getLichessSide() === "white";
        const pieceAtTo = _lichessPieceAtSquare(
          _lichessCurrentAnalysisFen,
          lichessTopMoves[0].to,
        );
        isOwnPiece =
          pieceAtTo !== null &&
          (isWhiteSide
            ? pieceAtTo === pieceAtTo.toLowerCase()
            : pieceAtTo === pieceAtTo.toUpperCase());
      }
    } catch (e2) {
      console.warn("[FLAG MODE] Capture kontrolü hatası (≤10s):", e2);
    }
    if (isOwnPiece) {
      return (
        Math.floor(
          Math.random() *
            (flagProfile.flagOnFlagCapture[1] -
              flagProfile.flagOnFlagCapture[0] +
              1),
        ) + flagProfile.flagOnFlagCapture[0]
      );
    } else {
      return (
        Math.floor(
          Math.random() *
            (flagProfile.flagOnFlagNormal[1] -
              flagProfile.flagOnFlagNormal[0] +
              1),
        ) + flagProfile.flagOnFlagNormal[0]
      );
    }
  } else if (fastSimpleEnabled2 && _lichessCurrentAnalysisInTheory) {
    restoreLichessNormalProfile();
    const profileKey =
      lichessOptions["option-smart-timing-profile"] || "bullet";
    const fastProfile =
      LICHESS_SMART_TIMING_PROFILES[profileKey] ||
      LICHESS_SMART_TIMING_PROFILES.bullet;
    const [minMs, maxMs] = fastProfile.fastSimple;
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  } else {
    restoreLichessNormalProfile();
  }
  const automoveMin2 = parseInt(lichessOptions["option-automove-min"]) || 0;
  const automoveMax2 = parseInt(lichessOptions["option-automove-max"]) || 0;
  if (automoveMin2 >= automoveMax2) {
    return automoveMin2;
  }
  const centerWeight2 =
    parseInt(lichessOptions["option-automove-centerweight"]) || 1;
  if (centerWeight2 <= 1) {
    return (
      Math.floor(Math.random() * (automoveMax2 - automoveMin2 + 1)) +
      automoveMin2
    );
  }
  const midpoint2 = (automoveMin2 + automoveMax2) / 2;
  const spread2 = (automoveMax2 - automoveMin2) / (2 + centerWeight2 * 1.2);
  let x2;
  let y2;
  let r22;
  do {
    x2 = Math.random() * 2 - 1;
    y2 = Math.random() * 2 - 1;
    r22 = x2 * x2 + y2 * y2;
  } while (r22 >= 1 || r22 === 0);
  let delay2 = Math.round(
    midpoint2 + x2 * Math.sqrt((Math.log(r22) * -2) / r22) * spread2,
  );
  delay2 = Math.max(automoveMin2, Math.min(automoveMax2, delay2));
  return delay2;
}
// Auto-recaptures immediately when the option is enabled and the opponent just captured.
function _tryInstantRecapture() {
  if (
    !lichessOptions["option-instant-recapture"] ||
    !_lichessLastMove ||
    _lichessLastMove.length < 4
  ) {
    return false;
  }
  try {
    const lastMoveTo = _lichessLastMove.slice(2, 4);
    const lastMoveFrom = _lichessLastMove.slice(0, 2);
    const isRecapture = _lichessLastOpponentMoves.some(
      (om) => om.from === lastMoveFrom && om.to === lastMoveTo,
    );
    let isOwnPiece = false;
    if (isRecapture && _lichessPreMoveFEN) {
      const placement = _lichessPreMoveFEN.split(" ")[0];
      const fenRows = placement.split("/");
      const toFileIdx = lastMoveTo.charCodeAt(0) - "a".charCodeAt(0);
      const rowIdx = 8 - parseInt(lastMoveTo[1], 10);
      let fileCursor = 0;
      let piece = null;
      for (const ch of fenRows[rowIdx]) {
        if (ch >= "1" && ch <= "8") {
          fileCursor += parseInt(ch, 10);
        } else {
          if (fileCursor === toFileIdx) {
            piece = ch;
            break;
          }
          fileCursor++;
        }
      }
      if (piece !== null) {
        const isWhiteSide = getLichessSide() === "white";
        isOwnPiece = isWhiteSide
          ? piece === piece.toUpperCase()
          : piece === piece.toLowerCase();
      }
    }
    if (lichessTopMoves.length === 0) {
      return false;
    }
    const bestMoveIsRecapture = lichessTopMoves[0].to === lastMoveTo;
    if (isRecapture && isOwnPiece && bestMoveIsRecapture) {
      if (_lichessAutoMoveTimer) {
        clearTimeout(_lichessAutoMoveTimer);
        _lichessAutoMoveTimer = null;
      }
      setTimeout(() => _lichessMobilePlayAttempt(), 0);
      return true;
    }
    return false;
  } catch (e2) {
    return false;
  }
}
// Schedules the auto-move with the humanized delay (respects premove/flag/simulate-mates branches).
function scheduleLichessAutoMove() {
  if (_lichessAutoMoveTimer) {
    return;
  }
  const autoMoveDelay2 = computeLichessAutoMoveDelay();
  _lichessAutoMoveTimer = setTimeout(() => {
    _lichessAutoMoveTimer = null;
    _lichessMobilePlayAttempt();
  }, autoMoveDelay2);
}
// Finds valuable enemy pieces (Q/R/B/N) that can be trapped — feeds the Lefong trap planner.
function _lichessGetValuablePieceSquares(fen2, isBlack2) {
  const squareMap2 = new Map();
  try {
    const placement = fen2.split(" ")[0];
    const fenRows = placement.split("/");
    for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
      let fileCursor = 0;
      for (const ch of fenRows[rankIdx]) {
        if (ch >= "1" && ch <= "8") {
          fileCursor += parseInt(ch, 10);
        } else {
          const isOwnPiece = isBlack2
            ? ch === ch.toLowerCase()
            : ch === ch.toUpperCase();
          const pieceType = ch.toLowerCase();
          if (
            isOwnPiece &&
            (pieceType === "q" ||
              pieceType === "r" ||
              pieceType === "b" ||
              pieceType === "n")
          ) {
            const fileChar = String.fromCharCode(
              "a".charCodeAt(0) + fileCursor,
            );
            const rankStr = String(8 - rankIdx);
            squareMap2.set(fileChar + rankStr, pieceType);
          }
          fileCursor++;
        }
      }
    }
  } catch (e2) {}
  return squareMap2;
}
// Attack detection: knight/bishop/rook/queen/pawn/king attack patterns over the board array.
function _lichessSquareIsAttackedBy(
  piece2,
  fromFile3,
  toFile3,
  fromFile4,
  toFile4,
  board2,
) {
  try {
    const pieceType = piece2.toLowerCase();
    const rankDist = Math.abs(fromFile4 - fromFile3);
    const fileDist = Math.abs(toFile4 - toFile3);
    const squaresAligned = (fromFile2, toFile2) => {
      const fileStep2 =
        fromFile2 === fromFile3 ? 0 : fromFile2 > fromFile3 ? 1 : -1;
      const rankStep2 = toFile2 === toFile3 ? 0 : toFile2 > toFile3 ? 1 : -1;
      let curFile2 = fromFile3 + fileStep2;
      let curRank2 = toFile3 + rankStep2;
      while (curFile2 !== fromFile2 || curRank2 !== toFile2) {
        if (board2[curRank2][curFile2] !== null) {
          return false;
        }
        curFile2 += fileStep2;
        curRank2 += rankStep2;
      }
      return true;
    };
    if (pieceType === "n") {
      return (
        (rankDist === 1 && fileDist === 2) || (rankDist === 2 && fileDist === 1)
      );
    }
    if (pieceType === "b") {
      return (
        rankDist === fileDist &&
        rankDist !== 0 &&
        squaresAligned(fromFile4, toFile4)
      );
    }
    if (pieceType === "r") {
      return (
        (rankDist === 0 || fileDist === 0) &&
        rankDist + fileDist !== 0 &&
        squaresAligned(fromFile4, toFile4)
      );
    }
    if (pieceType === "q") {
      return (
        ((rankDist === fileDist && rankDist !== 0) ||
          ((rankDist === 0 || fileDist === 0) && rankDist + fileDist !== 0)) &&
        squaresAligned(fromFile4, toFile4)
      );
    }
    if (pieceType === "p") {
      const isKing = piece2 === piece2.toUpperCase();
      return (
        fileDist === 1 &&
        rankDist === 1 &&
        (isKing ? toFile4 > toFile3 : toFile4 < toFile3)
      );
    }
    return false;
  } catch (e2) {
    return false;
  }
}
// Ultrabullet mode: plays fast premoves/traps with randomized chances (opening book lines first, chance-locked for 4 moves).
function scheduleLichessUltrabulletMove(isReschedule2 = false) {
  if (!isReschedule2 && !lichessOptions["option-ultrabullet-enabled"]) {
    return;
  }
  if (!lichessTopMoves || lichessTopMoves.length === 0) {
    return;
  }
  if (!isLichessOurTurnFen(_lichessCurrentAnalysisFen)) {
    return;
  }
  if (_lichessUltrabulletMoveTimer) {
    clearTimeout(_lichessUltrabulletMoveTimer);
    _lichessUltrabulletMoveTimer = null;
  }
  const isWhiteSide2 = getLichessSide() === "white";
  if (_lichessLefongTrapPending) {
    try {
      const trapPlan = _lichessLefongTrapPending;
      const attackerPiece = _lichessPieceAtSquare(
        _lichessCurrentAnalysisFen,
        trapPlan.attackerSquare,
      );
      const attackerIsOwn =
        !!attackerPiece &&
        (isWhiteSide2
          ? attackerPiece === attackerPiece.toUpperCase()
          : attackerPiece === attackerPiece.toLowerCase());
      const targetPiece = _lichessPieceAtSquare(
        _lichessCurrentAnalysisFen,
        trapPlan.targetSquare,
      );
      const targetMatches =
        !!targetPiece && targetPiece.toLowerCase() === trapPlan.targetPiece;
      let hasLegalMoves = false;
      if (attackerIsOwn && targetMatches) {
        try {
          const chess = new Chess(_lichessCurrentAnalysisFen);
          hasLegalMoves = chess
            .moves({
              verbose: true,
            })
            .some(
              (m) =>
                m.from === trapPlan.attackerSquare &&
                m.to === trapPlan.targetSquare,
            );
        } catch (e2) {
          hasLegalMoves = false;
        }
      }
      _lichessLefongTrapPending = null;
      if (hasLegalMoves) {
        window.playMove(trapPlan.attackerSquare + trapPlan.targetSquare);
        return;
      }
    } catch (e2) {
      console.warn(
        "[ASHINA-DBG][lichess.js][ultrabullet] Lefong Trap Follow-Up hatası:",
        e2,
      );
      _lichessLefongTrapPending = null;
    }
  }
  const ownMoveNumber2 = _lichessGetOwnMoveNumber(
    _lichessCurrentAnalysisFen,
    isWhiteSide2,
  );
  const pastChanceLock2 =
    ownMoveNumber2 > LICHESS_ULTRABULLET_CHANCE_LOCK_MOVES;
  try {
    const openingPref =
      lichessOptions["option-ultrabullet-opening-preference"] || "none";
    const trapLine = LICHESS_ULTRABULLET_OPENING_BOOK[openingPref];
    if (trapLine) {
      const trapMoves = isWhiteSide2 ? trapLine.white : trapLine.black;
      const moveNumber =
        parseInt((_lichessCurrentAnalysisFen || "").split(" ")[5], 10) || 1;
      const moveIdx = moveNumber - 1;
      if (moveIdx >= 0 && moveIdx < trapMoves.length) {
        const trapMove = trapMoves[moveIdx];
        let hasLegalMoves = false;
        try {
          const chess = new Chess(_lichessCurrentAnalysisFen);
          hasLegalMoves = chess
            .moves({
              verbose: true,
            })
            .some((m) => m.from === trapMove.from && m.to === trapMove.to);
        } catch (e2) {
          hasLegalMoves = false;
        }
        if (hasLegalMoves) {
          _lastOwnMoveWasBookFallback = true;
          _lichessUltrabulletMoveTimer = setTimeout(() => {
            _lichessUltrabulletMoveTimer = null;
            window.playMove(trapMove.from + trapMove.to);
          }, 0);
          return;
        }
      } else if (
        trapLine.mateFollowUp &&
        moveIdx === trapMoves.length &&
        lichessTopMoves.length > 0 &&
        lichessTopMoves[0].mate === 1
      ) {
        _lastOwnMoveWasBookFallback = true;
        _lichessUltrabulletMoveTimer = setTimeout(() => {
          _lichessUltrabulletMoveTimer = null;
          _lichessMobilePlayAttempt();
        }, 0);
        return;
      }
    }
  } catch (e2) {
    console.warn(
      "[ASHINA-DBG][lichess.js][ultrabullet] Opening Preference hatası:",
      e2,
    );
  }
  try {
    if (lichessOptions["option-ultrabullet-react-to-check"]) {
      let inCheck = false;
      try {
        const chess = new Chess(_lichessCurrentAnalysisFen);
        inCheck = chess.isCheck();
      } catch (e2) {
        inCheck = false;
      }
      if (inCheck) {
        const checkDelay = Math.floor(Math.random() * 401) + 400;
        _lichessUltrabulletMoveTimer = setTimeout(() => {
          _lichessUltrabulletMoveTimer = null;
          _lichessMobilePlayAttempt();
        }, checkDelay);
        return;
      }
    }
  } catch (e2) {
    console.warn(
      "[ASHINA-DBG][lichess.js][ultrabullet] React To Check hatası:",
      e2,
    );
  }
  let openingFired2 = false;
  try {
    if (
      lichessOptions["option-ultrabullet-follow-through-attack"] &&
      lichessTopMoves.length > 0 &&
      _lichessLastSteps &&
      _lichessLastSteps.length >= 2
    ) {
      const prevStepUci = _lichessLastSteps[_lichessLastSteps.length - 2]?.uci;
      if (prevStepUci && prevStepUci.length >= 4) {
        const prevTo = prevStepUci.slice(2, 4);
        const bestMove = lichessTopMoves[0];
        if (bestMove && bestMove.from === prevTo) {
          const opponentSquares = _lichessGetOpponentSquares(
            _lichessCurrentAnalysisFen,
            isWhiteSide2,
          );
          if (opponentSquares.has(bestMove.to)) {
            openingFired2 = true;
          }
        }
      }
    }
  } catch (e2) {
    console.warn(
      "[ASHINA-DBG][lichess.js][ultrabullet] Follow Through Attack hatası:",
      e2,
    );
  }
  let lefongFired2 = false;
  let pendingTrapMove2 = null;
  try {
    let trapLineReady = false;
    const openingPref =
      lichessOptions["option-ultrabullet-opening-preference"] || "none";
    const trapLine = LICHESS_ULTRABULLET_OPENING_BOOK[openingPref];
    if (trapLine) {
      const trapMoves = isWhiteSide2 ? trapLine.white : trapLine.black;
      const moveNumber =
        parseInt((_lichessCurrentAnalysisFen || "").split(" ")[5], 10) || 1;
      trapLineReady = moveNumber - 1 < trapMoves.length;
    }
    if (
      !openingFired2 &&
      !trapLineReady &&
      !_lichessLefongTrapPending &&
      pastChanceLock2
    ) {
      const lefongChance =
        parseInt(lichessOptions["option-ultrabullet-lefong-trap-chance"]) || 0;
      if (lefongChance > 0 && _lichessCurrentAnalysisFen) {
        let legalMoves = [];
        try {
          const chess = new Chess(_lichessCurrentAnalysisFen);
          legalMoves = chess.moves({
            verbose: true,
          });
        } catch (e2) {
          legalMoves = [];
        }
        if (legalMoves.length > 0) {
          const placement = _lichessCurrentAnalysisFen.split(" ")[0];
          const board = [];
          for (let rank = 0; rank < 8; rank++) {
            board.push(new Array(8).fill(null));
          }
          let rankIdx = 7;
          let fileCursor = 0;
          for (const ch of placement) {
            if (ch === "/") {
              rankIdx--;
              fileCursor = 0;
            } else if (ch >= "1" && ch <= "8") {
              fileCursor += parseInt(ch, 10);
            } else {
              board[rankIdx][fileCursor] = ch;
              fileCursor++;
            }
          }
          const sideToMove = _lichessCurrentAnalysisFen.split(" ")[1];
          const kingChar = sideToMove === "w" ? "k" : "K";
          let kingFile = -1;
          let kingRank = -1;
          rankLoop: for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
              if (board[rank][file] === kingChar) {
                kingRank = rank;
                kingFile = file;
                break rankLoop;
              }
            }
          }
          const valuableSquares = _lichessGetValuablePieceSquares(
            _lichessCurrentAnalysisFen,
            isWhiteSide2,
          );
          const trapsByVictim = {
            q: [],
            r: [],
            b: [],
            n: [],
          };
          for (const move of legalMoves) {
            const fromFile = move.from.charCodeAt(0) - 97;
            const fromRank = parseInt(move.from[1], 10) - 1;
            const attackerPiece = board[fromRank]
              ? board[fromRank][fromFile]
              : null;
            if (!attackerPiece) {
              continue;
            }
            const attackerType = attackerPiece.toLowerCase();
            if (!LICHESS_LEFONG_TRAP_ATTACKER_TYPES.includes(attackerType)) {
              continue;
            }
            const fileIdx = move.to.charCodeAt(0) - 97;
            const toRank = parseInt(move.to[1], 10) - 1;
            if (
              kingFile !== -1 &&
              _lichessSquareIsAttackedBy(
                attackerPiece,
                fileIdx,
                toRank,
                kingFile,
                kingRank,
                board,
              )
            ) {
              continue;
            }
            for (const [targetSquare, victimPiece] of valuableSquares) {
              if (targetSquare === move.to) {
                continue;
              }
              if (
                LICHESS_LEFONG_TRAP_VALUE[victimPiece] <
                LICHESS_LEFONG_TRAP_VALUE[attackerType]
              ) {
                continue;
              }
              const targetFile = targetSquare.charCodeAt(0) - 97;
              const kingRank = parseInt(targetSquare[1], 10) - 1;
              if (
                _lichessSquareIsAttackedBy(
                  attackerPiece,
                  fileIdx,
                  toRank,
                  targetFile,
                  kingRank,
                  board,
                )
              ) {
                const trapEntry = {
                  from: move.from,
                  to: move.to,
                };
                trapsByVictim[victimPiece].push({
                  move: trapEntry,
                  targetSquare: targetSquare,
                  targetType: victimPiece,
                });
              }
            }
          }
          const victimTypes = Object.keys(trapsByVictim).filter(
            (vKey) => trapsByVictim[vKey].length > 0,
          );
          if (victimTypes.length > 0) {
            const totalWeight = victimTypes.reduce(
              (weightSum, wVictim) =>
                weightSum + LICHESS_LEFONG_TRAP_PIECE_WEIGHTS[wVictim],
              0,
            );
            let weightRoll = Math.random() * totalWeight;
            let victimType = victimTypes[victimTypes.length - 1];
            for (const candidateVictim of victimTypes) {
              if (
                weightRoll < LICHESS_LEFONG_TRAP_PIECE_WEIGHTS[candidateVictim]
              ) {
                victimType = candidateVictim;
                break;
              }
              weightRoll -= LICHESS_LEFONG_TRAP_PIECE_WEIGHTS[candidateVictim];
            }
            const trapList = trapsByVictim[victimType];
            const trapMove =
              trapList[Math.floor(Math.random() * trapList.length)];
            if (Math.random() * 100 < lefongChance) {
              lefongFired2 = true;
              pendingTrapMove2 = trapMove;
            }
          }
        }
      }
    }
  } catch (e2) {
    console.warn(
      "[ASHINA-DBG][lichess.js][ultrabullet] Lefong Trap Trigger hatası:",
      e2,
    );
  }
  let checkmoveFired2 = false;
  try {
    if (pastChanceLock2 && !openingFired2 && !lefongFired2) {
      const checkmoveChance =
        parseInt(lichessOptions["option-ultrabullet-checkmove-chance"]) || 0;
      if (checkmoveChance > 0 && Math.random() * 100 < checkmoveChance) {
        checkmoveFired2 = true;
      }
    }
  } catch (e2) {
    console.warn(
      "[ASHINA-DBG][lichess.js][ultrabullet] Checkmove Chance hatası:",
      e2,
    );
  }
  let recaptureFired2 = false;
  try {
    if (
      pastChanceLock2 &&
      !openingFired2 &&
      !lefongFired2 &&
      !checkmoveFired2
    ) {
      const recaptureSquare = _lichessGetRecaptureSquare(isWhiteSide2);
      if (recaptureSquare && lichessTopMoves.length > 0) {
        const bestMove = lichessTopMoves[0];
        const isRecapture = (tm) => tm.to === recaptureSquare;
        if (isRecapture(bestMove)) {
          recaptureFired2 = true;
          const ignoreRecaptureChance =
            parseInt(lichessOptions["option-ultrabullet-ignore-recapture"]) ||
            0;
          if (
            ignoreRecaptureChance > 0 &&
            Math.random() * 100 < ignoreRecaptureChance
          ) {
            const alternateMove = lichessTopMoves.find(
              (tm) => !isRecapture(tm),
            );
            if (alternateMove) {
              lichessTopMoves = [
                alternateMove,
                ...lichessTopMoves.filter((tm) => tm !== alternateMove),
              ];
            }
          }
        }
      }
    }
  } catch (e2) {
    console.warn(
      "[ASHINA-DBG][lichess.js][ultrabullet] Ignore Recapture hatası:",
      e2,
    );
  }
  try {
    if (
      pastChanceLock2 &&
      !openingFired2 &&
      !lefongFired2 &&
      !checkmoveFired2 &&
      !recaptureFired2
    ) {
      const ignoreCapturesChance =
        parseInt(lichessOptions["option-ultrabullet-ignore-captures"]) || 0;
      if (
        ignoreCapturesChance > 0 &&
        lichessTopMoves.length > 0 &&
        _lichessLastMove &&
        _lichessLastMove.length >= 4
      ) {
        const lastMoveTo = _lichessLastMove.slice(2, 4);
        const lastMoveFrom = _lichessLastMove.slice(0, 2);
        const noRecapture = !_lichessLastOpponentMoves.some(
          (om) => om.from === lastMoveFrom && om.to === lastMoveTo,
        );
        if (noRecapture) {
          const isCaptureOfLast = (tm) => tm.to === lastMoveTo;
          const bestMove = lichessTopMoves[0];
          if (
            isCaptureOfLast(bestMove) &&
            Math.random() * 100 < ignoreCapturesChance
          ) {
            const alternateMove = lichessTopMoves.find(
              (tm) => !isCaptureOfLast(tm),
            );
            if (alternateMove) {
              lichessTopMoves = [
                alternateMove,
                ...lichessTopMoves.filter((tm) => tm !== alternateMove),
              ];
            }
          }
        }
      }
    }
  } catch (e2) {
    console.warn(
      "[ASHINA-DBG][lichess.js][ultrabullet] Overlook Blunders hatası:",
      e2,
    );
  }
  let ultrabulletDelay2;
  try {
    const noOpeningPref =
      (lichessOptions["option-ultrabullet-opening-preference"] || "none") ===
      "none";
    if (noOpeningPref) {
      if (_lastOwnMoveWasBookFallback === true) {
        ultrabulletDelay2 = Math.floor(Math.random() * 201) + 100;
      } else if (ownMoveNumber2 <= 10 && lichessTopMoves.length > 0) {
        const opponentSquares = _lichessGetOpponentSquares(
          _lichessCurrentAnalysisFen,
          isWhiteSide2,
        );
        const bestMoveAttacked = opponentSquares.has(lichessTopMoves[0].to);
        ultrabulletDelay2 = bestMoveAttacked
          ? Math.floor(Math.random() * 301) + 200
          : Math.floor(Math.random() * 201) + 100;
      }
    }
  } catch (e2) {
    console.warn(
      "[ASHINA-DBG][lichess.js][ultrabullet] kitap-farkındalıklı Move Timing hatası:",
      e2,
    );
    ultrabulletDelay2 = undefined;
  }
  try {
    const flagModeEnabled =
      lichessOptions["option-ultrabullet-flag-mode-enabled"];
    const myClock = getLichessMyClockSeconds();
    const flagBurn = flagModeEnabled && myClock !== null && myClock === 0;
    if (flagBurn && lichessTopMoves.length > 0) {
      const opponentSquares = _lichessGetOpponentSquares(
        _lichessCurrentAnalysisFen,
        isWhiteSide2,
      );
      const bestMoveAttacked = opponentSquares.has(lichessTopMoves[0].to);
      const [minMs, maxMs] = bestMoveAttacked ? [100, 300] : [0, 200];
      ultrabulletDelay2 =
        Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    }
  } catch (e2) {}
  if (ultrabulletDelay2 === undefined) {
    const ultrabulletMin =
      parseInt(lichessOptions["option-ultrabullet-min"]) || 0;
    const ultrabulletMax =
      parseInt(lichessOptions["option-ultrabullet-max"]) || 0;
    ultrabulletDelay2 =
      ultrabulletMin >= ultrabulletMax
        ? ultrabulletMin
        : Math.floor(Math.random() * (ultrabulletMax - ultrabulletMin + 1)) +
          ultrabulletMin;
  }
  if (isReschedule2) {
    ultrabulletDelay2 = 0;
  }
  _lastOwnMoveWasBookFallback = false;
  _lichessUltrabulletMoveTimer = setTimeout(() => {
    _lichessUltrabulletMoveTimer = null;
    if (lefongFired2 && pendingTrapMove2) {
      try {
        const analysisFen = _lichessCurrentAnalysisFen;
        let hasLegalMoves = false;
        if (analysisFen) {
          try {
            const chess = new Chess(analysisFen);
            hasLegalMoves = chess
              .moves({
                verbose: true,
              })
              .some(
                (m) =>
                  m.from === pendingTrapMove2.move.from &&
                  m.to === pendingTrapMove2.move.to,
              );
          } catch (e2) {
            hasLegalMoves = false;
          }
        }
        if (hasLegalMoves) {
          const trapPlan = {
            attackerSquare: pendingTrapMove2.move.to,
            targetSquare: pendingTrapMove2.targetSquare,
            targetPiece: pendingTrapMove2.targetType,
          };
          _lichessLefongTrapPending = trapPlan;
          window.playMove(
            pendingTrapMove2.move.from + pendingTrapMove2.move.to,
          );
        } else {
          _lichessMobilePlayAttempt();
        }
      } catch (e2) {
        console.warn(
          "[ASHINA-DBG][lichess.js][ultrabullet] Lefong Trap Trigger oynama hatası:",
          e2,
        );
        _lichessMobilePlayAttempt();
      }
    } else if (checkmoveFired2) {
      const checkMoveResult = playLichessCheckMove();
      if (!checkMoveResult) {
        _lichessMobilePlayAttempt();
      }
    } else {
      _lichessMobilePlayAttempt();
    }
  }, ultrabulletDelay2);
}
// Mobile play button: plays the engine's best move via the page API.
function _lichessMobilePlayAttempt() {
  const openingMove2 = _lichessTryOpeningPreference();
  if (openingMove2) {
    _lichessOpeningMovePlayed = true;
    _lichessMobilePlayBusy = true;
    const moveUci = openingMove2.from + openingMove2.to;
    return window
      .playMove(moveUci)
      .catch((error2) => {
        console.warn("[Opening Pref] playMove hatası:", error2);
        const trapEntry2 = {
          success: false,
          error: error2,
        };
        return trapEntry2;
      })
      .finally(() => {
        _lichessMobilePlayBusy = false;
      });
  }
  if (_lichessMobilePlayBusy) {
    return;
  }
  if (lichessTopMoves.length === 0) {
    return;
  }
  if (!isLichessOurTurnFen(_lichessCurrentAnalysisFen)) {
    return;
  }
  if (typeof window.playMove !== "function") {
    return;
  }
  const bestMove2 = lichessTopMoves[0];
  const moveUci2 = bestMove2.from + bestMove2.to;
  _lichessMobilePlayBusy = true;
  return window
    .playMove(moveUci2)
    .then((result2) => {
      return result2;
    })
    .catch((error2) => {
      console.warn(
        "[ASHINA-DBG][lichess.js][mobile-play-btn] playMove hatası:",
        error2,
      );
      const trapEntry2 = {
        success: false,
        error: error2,
      };
      return trapEntry2;
    })
    .finally(() => {
      _lichessMobilePlayBusy = false;
    });
}
// Mobile premove button: queues the engine's ponder move as a premove.
function _lichessMobilePremoveAttempt() {
  if (_lichessMobilePlayBusy) {
    return;
  }
  if (!lichessOptions["option-premove-enabled"]) {
    return;
  }
  if (!lastLichessPonder) {
    return;
  }
  if (isLichessOurTurnFen(_lichessCurrentAnalysisFen)) {
    return;
  }
  if (typeof window.playMove !== "function") {
    return;
  }
  const moveUci2 =
    lastLichessPonder.from +
    lastLichessPonder.to +
    (lastLichessPonder.promotion || "");
  _lichessMobilePlayBusy = true;
  return window
    .playMove(moveUci2)
    .catch((error2) => {
      console.warn(
        "[ASHINA-DBG][lichess.js][mobile-premove-btn] playMove hatası:",
        error2,
      );
      const playOutcome2 = {
        success: false,
        error: error2,
      };
      return playOutcome2;
    })
    .finally(() => {
      _lichessMobilePlayBusy = false;
    });
}
// Retries a mobile-button action until it succeeds (the page API appears asynchronously).
function _lichessMobileFireWithRetries(spawnFn2) {
  let spawned2 = false;
  function trySpawnMobilePlayBtn2() {
    if (spawned2) {
      return;
    }
    const spawnResult2 = spawnFn2();
    if (!spawnResult2 || typeof spawnResult2.then !== "function") {
      return;
    }
    spawnResult2.then((result2) => {
      if (result2 && result2.success !== false) {
        spawned2 = true;
      }
    });
  }
  trySpawnMobilePlayBtn2();
  [120, 280, 450, 650].forEach((delay) =>
    setTimeout(trySpawnMobilePlayBtn2, delay),
  );
}
// Builds the draggable mobile PLAY button (position persisted to localStorage).
function _createMobilePlayBtnLichess() {
  if (document.getElementById("ashina-lichess-mobile-play-btn")) {
    return;
  }
  if (!document.getElementById("ashina-lichess-mobile-play-style")) {
    const mpbStyle = document.createElement("style");
    mpbStyle.id = "ashina-lichess-mobile-play-style";
    mpbStyle.textContent =
      "\n      #ashina-lichess-mobile-play-btn {\n        position: fixed;\n        bottom: 80px;\n        right: 14px;\n        z-index: 99999;\n        width: 48px;\n        height: 48px;\n        border-radius: 10px;\n        background: rgba(0,0,0,0.42);\n        border: 1px solid rgba(255,255,255,0.1);\n        cursor: grab;\n        display: flex;\n        align-items: center;\n        justify-content: center;\n        user-select: none;\n        -webkit-user-select: none;\n        touch-action: none;\n        transition: background 0.15s, border 0.15s;\n      }\n      #ashina-lichess-mobile-play-btn.ashina-lichess-mpb-pressing {\n        background: rgba(255,255,255,0.12);\n        border: 1px solid rgba(255,255,255,0.22);\n        cursor: grabbing;\n      }\n      #ashina-lichess-mobile-play-btn svg {\n        pointer-events: none;\n        opacity: 0.65;\n      }\n      #ashina-lichess-mobile-play-btn.ashina-lichess-mpb-pressing svg {\n        opacity: 0.9;\n      }\n    ";
    document.head.appendChild(mpbStyle);
  }
  const playBtn2 = document.createElement("button");
  playBtn2.id = "ashina-lichess-mobile-play-btn";
  playBtn2.innerHTML =
    '\n    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#fff">\n      <polygon points="5,3 19,12 5,21"/>\n    </svg>\n  ';
  document.body.appendChild(playBtn2);
  let dragStarted2 = false;
  let startX2;
  let startY2;
  let startLeft2;
  let startTop2;
  let isDragging2 = false;
  playBtn2.addEventListener(
    "touchstart",
    (touchEvent2) => {
      const touch2 = touchEvent2.touches[0];
      startX2 = touch2.clientX;
      startY2 = touch2.clientY;
      const btnRect2 = playBtn2.getBoundingClientRect();
      startLeft2 = btnRect2.left;
      startTop2 = btnRect2.top;
      dragStarted2 = false;
      isDragging2 = false;
      playBtn2.classList.add("ashina-lichess-mpb-pressing");
      touchEvent2.preventDefault();
    },
    {
      passive: false,
    },
  );
  document.addEventListener(
    "touchmove",
    (touchEvent2) => {
      if (!playBtn2.classList.contains("ashina-lichess-mpb-pressing")) {
        return;
      }
      const touch2 = touchEvent2.touches[0];
      const deltaX2 = touch2.clientX - startX2;
      const deltaY2 = touch2.clientY - startY2;
      if (!isDragging2 && (Math.abs(deltaX2) > 6 || Math.abs(deltaY2) > 6)) {
        isDragging2 = true;
        dragStarted2 = true;
      }
      if (dragStarted2) {
        playBtn2.style.right = "auto";
        playBtn2.style.left = startLeft2 + deltaX2 + "px";
        playBtn2.style.top = startTop2 + deltaY2 + "px";
        touchEvent2.preventDefault();
      }
    },
    {
      passive: false,
    },
  );
  document.addEventListener("touchend", () => {
    if (!playBtn2.classList.contains("ashina-lichess-mpb-pressing")) {
      return;
    }
    playBtn2.classList.remove("ashina-lichess-mpb-pressing");
    if (dragStarted2) {
      try {
        const btnRect = playBtn2.getBoundingClientRect();
        const mpbPos = {
          top: btnRect.top,
          left: btnRect.left,
        };
        localStorage.setItem("ashina-lichess-mpb-pos", JSON.stringify(mpbPos));
      } catch (e2) {}
    }
    dragStarted2 = false;
    isDragging2 = false;
    clearInterval(_lichessMobilePlayInterval);
    _lichessMobilePlayInterval = null;
    _lichessMobilePlayBusy = false;
  });
  document.addEventListener("touchcancel", () => {
    playBtn2.classList.remove("ashina-lichess-mpb-pressing");
    clearInterval(_lichessMobilePlayInterval);
    _lichessMobilePlayInterval = null;
    dragStarted2 = false;
    isDragging2 = false;
    _lichessMobilePlayBusy = false;
  });
  playBtn2.addEventListener(
    "touchstart",
    (touchEvent2) => {
      _lichessMobileFireWithRetries(_lichessMobilePlayAttempt);
      _lichessMobilePlayInterval = setInterval(() => {
        if (!dragStarted2) {
          _lichessMobilePlayAttempt();
        }
      }, 200);
    },
    {
      passive: false,
    },
  );
  try {
    const savedPosRaw = localStorage.getItem("ashina-lichess-mpb-pos");
    if (savedPosRaw) {
      const savedPos = JSON.parse(savedPosRaw);
      if (
        savedPos &&
        typeof savedPos.top === "number" &&
        typeof savedPos.left === "number"
      ) {
        playBtn2.style.right = "auto";
        playBtn2.style.left = savedPos.left + "px";
        playBtn2.style.top = savedPos.top + "px";
      }
    }
  } catch (e2) {}
}
// Removes the mobile play button.
function _removeMobilePlayBtnLichess() {
  const playBtnEl2 = document.getElementById("ashina-lichess-mobile-play-btn");
  if (playBtnEl2) {
    playBtnEl2.remove();
  }
  clearInterval(_lichessMobilePlayInterval);
  _lichessMobilePlayInterval = null;
}
// Shows/hides the mobile play button per the option.
function applyMobilePlayBtnLichess(enabled2) {
  if (enabled2) {
    _createMobilePlayBtnLichess();
  } else {
    _removeMobilePlayBtnLichess();
  }
}
// Builds the draggable mobile PREMOVE button (position persisted to localStorage).
function _createMobilePremoveBtnLichess() {
  if (document.getElementById("ashina-lichess-mobile-premove-btn")) {
    return;
  }
  if (!document.getElementById("ashina-lichess-mobile-premove-style")) {
    const mpreStyle = document.createElement("style");
    mpreStyle.id = "ashina-lichess-mobile-premove-style";
    mpreStyle.textContent =
      "\n      #ashina-lichess-mobile-premove-btn {\n        position: fixed;\n        bottom: 80px;\n        left: 14px;\n        z-index: 99999;\n        width: 42px;\n        height: 42px;\n        border-radius: 50%;\n        background: rgba(0,0,0,0.42);\n        border: 1.5px solid rgba(255,51,51,0.6);\n        cursor: grab;\n        display: flex;\n        flex-direction: column;\n        align-items: center;\n        justify-content: center;\n        user-select: none;\n        -webkit-user-select: none;\n        touch-action: none;\n        transition: background 0.15s, border 0.15s;\n        gap: 1px;\n      }\n      #ashina-lichess-mobile-premove-btn.ashina-lichess-mpre-pressing {\n        background: rgba(255,51,51,0.18);\n        border: 1.5px solid rgba(255,51,51,0.9);\n        cursor: grabbing;\n      }\n      #ashina-lichess-mobile-premove-btn .ashina-lichess-mpre-line {\n        pointer-events: none;\n        color: rgba(255,255,255,0.65);\n        font-size: 7.5px;\n        font-weight: 700;\n        letter-spacing: 0.04em;\n        line-height: 1;\n        font-family: sans-serif;\n      }\n      #ashina-lichess-mobile-premove-btn.ashina-lichess-mpre-pressing .ashina-lichess-mpre-line {\n        color: rgba(255,255,255,0.95);\n      }\n    ";
    document.head.appendChild(mpreStyle);
  }
  const premoveBtn2 = document.createElement("button");
  premoveBtn2.id = "ashina-lichess-mobile-premove-btn";
  premoveBtn2.innerHTML =
    '\n    <span class="ashina-lichess-mpre-line">PRE</span>\n    <span class="ashina-lichess-mpre-line">MOVE</span>\n  ';
  document.body.appendChild(premoveBtn2);
  let dragStarted2 = false;
  let startX2;
  let startY2;
  let startLeft2;
  let startTop2;
  let isDragging2 = false;
  premoveBtn2.addEventListener(
    "touchstart",
    (touchEvent2) => {
      const touch2 = touchEvent2.touches[0];
      startX2 = touch2.clientX;
      startY2 = touch2.clientY;
      const btnRect2 = premoveBtn2.getBoundingClientRect();
      startLeft2 = btnRect2.left;
      startTop2 = btnRect2.top;
      dragStarted2 = false;
      isDragging2 = false;
      premoveBtn2.classList.add("ashina-lichess-mpre-pressing");
      touchEvent2.preventDefault();
    },
    {
      passive: false,
    },
  );
  document.addEventListener(
    "touchmove",
    (touchEvent2) => {
      if (!premoveBtn2.classList.contains("ashina-lichess-mpre-pressing")) {
        return;
      }
      const touch2 = touchEvent2.touches[0];
      const deltaX2 = touch2.clientX - startX2;
      const deltaY2 = touch2.clientY - startY2;
      if (!isDragging2 && (Math.abs(deltaX2) > 6 || Math.abs(deltaY2) > 6)) {
        isDragging2 = true;
        dragStarted2 = true;
      }
      if (dragStarted2) {
        premoveBtn2.style.left = "auto";
        premoveBtn2.style.right = "auto";
        premoveBtn2.style.left = startLeft2 + deltaX2 + "px";
        premoveBtn2.style.top = startTop2 + deltaY2 + "px";
        touchEvent2.preventDefault();
      }
    },
    {
      passive: false,
    },
  );
  premoveBtn2.addEventListener(
    "touchend",
    (touchEvent2) => {
      if (!premoveBtn2.classList.contains("ashina-lichess-mpre-pressing")) {
        return;
      }
      premoveBtn2.classList.remove("ashina-lichess-mpre-pressing");
      if (dragStarted2) {
        try {
          const btnRect = premoveBtn2.getBoundingClientRect();
          const mprePos = {
            top: btnRect.top,
            left: btnRect.left,
          };
          localStorage.setItem(
            "ashina-lichess-mpre-pos",
            JSON.stringify(mprePos),
          );
        } catch (e2) {}
      } else {
        _lichessMobileFireWithRetries(_lichessMobilePremoveAttempt);
      }
      dragStarted2 = false;
      isDragging2 = false;
      touchEvent2.preventDefault();
    },
    {
      passive: false,
    },
  );
  premoveBtn2.addEventListener("touchcancel", () => {
    premoveBtn2.classList.remove("ashina-lichess-mpre-pressing");
    dragStarted2 = false;
    isDragging2 = false;
  });
  try {
    const savedPosRaw = localStorage.getItem("ashina-lichess-mpre-pos");
    if (savedPosRaw) {
      const savedPos = JSON.parse(savedPosRaw);
      if (
        savedPos &&
        typeof savedPos.top === "number" &&
        typeof savedPos.left === "number"
      ) {
        premoveBtn2.style.left = savedPos.left + "px";
        premoveBtn2.style.top = savedPos.top + "px";
      }
    }
  } catch (e2) {}
}
// Removes the mobile premove button.
function _removeMobilePremoveBtnLichess() {
  const premoveBtnEl2 = document.getElementById(
    "ashina-lichess-mobile-premove-btn",
  );
  if (premoveBtnEl2) {
    premoveBtnEl2.remove();
  }
}
// Shows/hides the mobile premove button per the option.
function applyMobilePremoveBtnLichess(enabled2) {
  if (enabled2) {
    _createMobilePremoveBtnLichess();
  } else {
    _removeMobilePremoveBtnLichess();
  }
}
