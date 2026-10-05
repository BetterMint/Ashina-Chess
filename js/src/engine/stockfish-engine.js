// ─── engine/stockfish-engine.js · main engine driver ───
// Runs Komodo / Torch / Maia in a Worker (or a remote UCI WebSocket), applies
// UCI options, parses `info`/`bestmove` into TopMove lines and implements the
// auto-move / premove / ultrabullet / Lefong-trap play logic.
import {
  enumOptions,
  getValueConfig,
  BetterMintmaster,
  eTable,
} from "../core.js";
import {
  OPENING_BOOK,
  ULTRABULLET_CHANCE_LOCK_MOVES,
  ULTRABULLET_OPENING_BOOK,
  LEFONG_TRAP_VALUE,
  LEFONG_TRAP_ATTACKER_TYPES,
  LEFONG_TRAP_PIECE_WEIGHTS,
} from "../config/opening-book.js";
import { TopMove } from "./top-move.js";
import { Chess } from "../vendor/chess.js";

// Implicit window global in the original bundle (`window.top_pv_moves = []`,
// then bare assignments). Nothing outside this module reads it, so a module
// local preserves the behavior without the strict-mode global leak.
let top_pv_moves = [];
export class StockfishEngine {
  // Boot the configured engine backend. `master` is the BetterMint instance
  // (shared game/controller access). Komodo/Torch run as blob Workers, Maia is
  // delegated to its own engine class (always "ready"), and "websocket" speaks
  // UCI over a remote WebSocket. Most fields are per-game state reset in
  // MoveAndGo; the UCI option block mirrors the extension's settings panel.
  constructor(master) {
    this.BetterMintmaster = master;
    this.loaded = false;
    this.stopInFlight = false;
    this.ready = false;
    this.isEvaluating = false;
    this.isRequestedStop = false;
    this.isGameStarted = false;
    this.readyCallbacks = [];
    this.goDoneCallbacks = [];
    this.topMoves = [];
    this.lastTopMoves = [];
    this.moveCounter = 0;
    this.isPreMoveSequence = false;
    this.hasShownLimitMessage = false;
    this.isInTheory = false;
    this.lastMoveScore = null;
    this.autoMoveTimer = null;
    this.ultrabulletMoveTimer = null;
    this._flagProfileActive = false;
    this.simulateMateActive = false;
    this.lastOpponentMoves = [];
    this.opponentLastMoveScore = null;
    this.blunderReactEvalDisabled = false;
    this.lastStockfishCp = null;
    this.lastStockfishFen = null;
    this.preOpponentStockfishCp = null;
    this.lastBoardFEN = null;
    this.preOpponentFEN = null;
    this.premoveEnabled = false;
    this.pendingPremove = null;
    this.lastPonder = null;
    this._lefongTrapPending = null;
    this.premoveStreak = 0;
    this.pendingAutoPremove = false;
    this.pendingAutoPremoveMates = false;
    this.lastMoveGaveCheck = false;
    this.openingMovePlayed = false;
    this._preAnalyzeRunning = false;
    this._preAnalyzeFen = null;
    this.depth = getValueConfig(enumOptions.Depth);
    this.options = {
      MultiPV: getValueConfig(enumOptions.MultiPV),
      Hash: getValueConfig(enumOptions.DragonHash),
      "UCI Elo": getValueConfig(enumOptions.DragonUciElo),
      Personality: getValueConfig(enumOptions.DragonPersonality),
      "UCI LimitStrength": getValueConfig(enumOptions.DragonLimitStrength),
      "Auto Skill": getValueConfig(enumOptions.DragonAutoSkill),
      OwnBook: getValueConfig(enumOptions.DragonOwnBook),
      UCI_Chess960: getValueConfig(enumOptions.DragonChess960),
      "Best Book Line": getValueConfig(enumOptions.DragonBestBookLine),
      "Book Moves": getValueConfig(enumOptions.DragonLimitBookMoves)
        ? parseInt(getValueConfig(enumOptions.DragonBookMoves)) === 11
          ? 1000
          : parseInt(getValueConfig(enumOptions.DragonBookMoves)) || 5
        : 1000,
    };
    this.engineType = "komodo";
    const engineSource = getValueConfig(enumOptions.EngineSource) || "komodo";
    if (engineSource === "komodo") {
      this.engineType = "komodo";
      this.initializeWorker(
        document.getElementById("__asina-engine-urls").dataset.komodo,
      );
    } else if (engineSource === "torch") {
      this.engineType = "torch";
      this.initializeWorker(
        document.getElementById("__asina-engine-urls").dataset.torch,
      );
    } else if (engineSource === "maia") {
      this.engineType = "maia";
      this.ready = true;
      this.loaded = true;
      this.BetterMintmaster.onEngineLoaded();
      window.dispatchEvent(
        new CustomEvent("AsinaEngineStatus", {
          detail: {
            connected: true,
          },
        }),
      );
    } else {
      this.engineType = "websocket";
      this.initializeWebSocket(getValueConfig(enumOptions.UrlApiStockfish));
    }
    this.reconnectDelay = 500;
    this.maxReconnectDelay = 3000;
    this.reconnectAttempts = 5;
  }
  // Load the engine as a Web Worker. The script is fetched and instantiated
  // from a blob URL (avoids cross-origin worker restrictions); the wasm and
  // book paths are appended after "#", which stockfish.js-style workers parse
  // out of location.hash at startup. The handshake ("uci" → uciok/readyok)
  // starts immediately; options and the current position follow once ready.
  initializeWorker(workerUrl) {
    const meta = document.getElementById("__asina-engine-urls");
    let wasmUrl = "";
    let bookUrl = "";
    if (meta) {
      if (workerUrl.includes("komodo")) {
        wasmUrl = meta.dataset.komodoWasm || "";
      } else if (workerUrl.includes("torch")) {
        wasmUrl = meta.dataset.torchWasm || "";
      }
      bookUrl = meta.dataset.book || "";
    }
    fetch(workerUrl)
      .then((response) => response.blob())
      .then((blob) => {
        const encodedParams = wasmUrl
          ? encodeURIComponent(wasmUrl + (bookUrl ? "|" + bookUrl : ""))
          : "";
        const workerBlobUrl =
          URL.createObjectURL(blob) +
          (encodedParams ? "#" + encodedParams : "");
        try {
          this.stockfish = new Worker(workerBlobUrl);
          this.stockfish.onmessage = (event) => {
            const line = typeof event === "string" ? event : (event.data ?? "");
            this.ProcessMessage(line);
          };
          this.stockfish.onerror = (event) => {
            console.error("Worker error:", event);
            window.dispatchEvent(
              new CustomEvent("AsinaEngineStatus", {
                detail: {
                  connected: false,
                },
              }),
            );
          };
          this.ready = true;
          window.dispatchEvent(
            new CustomEvent("AsinaEngineStatus", {
              detail: {
                connected: true,
              },
            }),
          );
          this.send("uci");
          this.onReady(() => {
            this.UpdateOptions();
            this.send("ucinewgame");
            setTimeout(() => {
              try {
                const fen = this.BetterMintmaster.game.controller.getFEN();
                if (fen) {
                  this.UpdatePosition(fen, false);
                }
              } catch (error) {}
            }, 500);
          });
        } catch (error) {
          console.error("Failed to construct Worker from blob:", error);
          window.dispatchEvent(
            new CustomEvent("AsinaEngineStatus", {
              detail: {
                connected: false,
              },
            }),
          );
          throw error;
        }
      })
      .catch((error) => {
        console.error("Failed to fetch worker script:", error);
        window.dispatchEvent(
          new CustomEvent("AsinaEngineStatus", {
            detail: {
              connected: false,
            },
          }),
        );
      });
  }
  // Alternative backend: a remote UCI server over WebSocket. Same handshake as
  // the Worker path; engine output arrives as message strings. Close/error
  // events funnel into handleDisconnect (unless a deliberate URL switch is in
  // progress — see isSwitchingWsUrl).
  initializeWebSocket(url) {
    this.wsUrl = url;
    try {
      const socket = new WebSocket(url);
      this.stockfish = socket;
      socket.addEventListener("open", () => {
        this.reconnectAttempts = 0;
        window.dispatchEvent(
          new CustomEvent("AsinaEngineStatus", {
            detail: {
              connected: true,
            },
          }),
        );
        this.send("uci");
        this.onReady(() => {
          this.UpdateOptions();
          this.send("ucinewgame");
          setTimeout(() => {
            try {
              const fen = this.BetterMintmaster.game.controller.getFEN();
              if (fen) {
                this.UpdatePosition(fen, false);
              }
            } catch (error) {}
          }, 500);
        });
      });
      socket.addEventListener("message", (event) => {
        this.ProcessMessage(event.data);
      });
      socket.addEventListener("close", () => {
        if (this.stockfish !== socket) {
          return;
        }
        console.error("WebSocket connection closed.");
        window.dispatchEvent(
          new CustomEvent("AsinaEngineStatus", {
            detail: {
              connected: false,
            },
          }),
        );
        this.handleDisconnect();
      });
      socket.addEventListener("error", (event) => {
        if (this.stockfish !== socket) {
          return;
        }
        console.error("WebSocket error:", event);
        window.dispatchEvent(
          new CustomEvent("AsinaEngineStatus", {
            detail: {
              connected: false,
            },
          }),
        );
        this.handleDisconnect();
      });
    } catch (error) {
      console.error("Failed to load stockfish socket");
      throw error;
    }
  }
  // UCI command gate. Maia needs no UCI traffic, and commands sent before the
  // handshake completes would be lost, so anything while not ready is dropped.
  send(command) {
    if (this.engineType === "maia") {
      return;
    }
    if (!this.isReady()) {
      console.warn("Engine not ready, command dropped:", command);
      return;
    }
    if (this.engineType !== "websocket") {
      this.stockfish.postMessage(command);
    } else {
      this.stockfish.send(command);
    }
  }
  // Can the transport accept a command right now?
  isReady() {
    if (this.engineType === "maia") {
      return this.ready === true;
    }
    if (this.engineType !== "websocket") {
      return this.stockfish !== null && this.ready === true;
    }
    return this.stockfish && this.stockfish.readyState === WebSocket.OPEN;
  }
  // Start an evaluation. UCI forbids a new "go" while a search is running, so
  // the "go depth N" is chained behind stopEvaluation's stop→bestmove ack.
  // When the user caps book moves, OwnBook is switched off past that limit so
  // the engine stops playing its own opening book mid-game.
  go() {
    this.onReady(() => {
      this.stopEvaluation(() => {
        if (this.isEvaluating) {
          return;
        }
        console.assert(!this.isEvaluating, "Duplicated Stockfish go command");
        if (getValueConfig(enumOptions.DragonLimitBookMoves)) {
          const bookMovesSetting = parseInt(
            getValueConfig(enumOptions.DragonBookMoves),
          );
          const bookMoveLimit =
            bookMovesSetting === 11 ? Infinity : bookMovesSetting;
          try {
            const fen = this.BetterMintmaster.game.controller.getFEN();
            const fullmoveNumber = parseInt(fen.split(" ")[5]);
            const ownBook = getValueConfig(enumOptions.DragonOwnBook);
            if (ownBook) {
              if (fullmoveNumber > bookMoveLimit) {
                this.send("setoption name OwnBook value false");
              } else {
                this.send("setoption name OwnBook value true");
              }
            }
          } catch (error) {}
        }
        this.isEvaluating = true;
        this.send("go depth " + this.depth);
      });
    });
  }
  // WebSocket/worker died: mark disconnected, notify the UI, and schedule a reconnect.
  handleDisconnect() {
    this.ready = false;
    this.loaded = false;
    this.isEvaluating = false;
    if (this.engineType === "websocket") {
      if (this.isSwitchingWsUrl) {
        this.isSwitchingWsUrl = false;
        return;
      }
      this.attemptReconnect();
    }
  }
  // Reconnect loop with capped exponential backoff (used by the WebSocket backend).
  attemptReconnect() {
    if (this.reconnectAttempts < 5) {
      this.reconnectAttempts++;
      const delay = Math.min(
        this.reconnectDelay * this.reconnectAttempts,
        this.maxReconnectDelay,
      );
      setTimeout(() => {
        this.initializeWebSocket(getValueConfig(enumOptions.UrlApiStockfish));
      }, delay);
    } else {
      console.error(
        "Max reconnect attempts reached. Please check the connection.",
      );
    }
  }
  // Registers a callback to run once the engine finishes the UCI handshake.
  onReady(callback) {
    if (this.ready) {
      callback();
    } else {
      this.readyCallbacks.push(callback);
      this.send("isready");
    }
  }
  // Stops the running search; `callback` runs after the engine confirms with bestmove.
  stopEvaluation(callback) {
    if (this.isEvaluating) {
      if (!this.stopInFlight) {
        this.stopInFlight = true;
        this.goDoneCallbacks = [
          () => {
            this.isEvaluating = false;
            this.isRequestedStop = false;
            callback();
          },
        ];
        this.isRequestedStop = true;
        this.send("stop");
        this.stopInFlight = false;
        this.goDoneCallbacks.forEach((callback) => callback());
        this.goDoneCallbacks = [];
      } else {
        this.goDoneCallbacks.push(callback);
      }
    } else {
      callback();
    }
  }
  // Fired when a search completes — flushes queued ready/go callbacks.
  onStockfishResponse() {
    if (this.isRequestedStop) {
      this.isRequestedStop = false;
      this.stopInFlight = false;
      this.isEvaluating = false;
      this.executeCallbacks();
    }
  }
  // Runs and clears all queued callbacks (ready and go phases).
  executeCallbacks() {
    while (this.goDoneCallbacks.length) {
      const callback = this.goDoneCallbacks.shift();
      callback();
    }
  }
  // Sends `position fen …` (plus `ucinewgame` when newGame) to sync the engine with the board.
  UpdatePosition(fen = null, newGame = true) {
    this.onReady(() => {
      this.stopEvaluation(() => {
        if (newGame) {
          this.moveCounter = 0;
          this.hasShownLimitMessage = false;
          this.isPreMoveSequence = true;
          this.blunderReactEvalDisabled = false;
        }
        this.MoveAndGo(fen, newGame);
      });
    });
  }
  // Full per-game reset: ucinewgame, clear move counters and premove state.
  restartGame() {
    this.stopEvaluation(() => {
      this.isGameStarted = false;
      this.moveCounter = 0;
      this.isPreMoveSequence = false;
      this.send("ucinewgame");
      this.isGameStarted = true;
      this.go();
    });
  }
  // Applies option changes coming from the extension popup (arrows, automove, ultrabullet, coach…).
  UpdateExtensionOptions(options) {
    const engineSource = getValueConfig(enumOptions.EngineSource) || "komodo";
    if (engineSource !== this.engineType) {
      this.stopEvaluation(() => {
        if (this.engineType === "websocket" && this.stockfish) {
          this.stockfish.close();
        } else if (this.stockfish) {
          this.stockfish.terminate();
        }
        this.ready = false;
        this.loaded = false;
        this.stockfish = null;
        this.topMoves = [];
        this.lastTopMoves = [];
        this.isGameStarted = false;
        this.moveCounter = 0;
        if (engineSource === "komodo") {
          this.engineType = "komodo";
          this.initializeWorker(
            document.getElementById("__asina-engine-urls").dataset.komodo,
          );
        } else if (engineSource === "torch") {
          this.engineType = "torch";
          this.initializeWorker(
            document.getElementById("__asina-engine-urls").dataset.torch,
          );
        } else if (engineSource === "maia") {
          this.engineType = "maia";
          this.ready = true;
          this.loaded = true;
          this.BetterMintmaster.onEngineLoaded();
          window.dispatchEvent(
            new CustomEvent("AsinaEngineStatus", {
              detail: {
                connected: true,
              },
            }),
          );
        } else {
          this.engineType = "websocket";
          this.initializeWebSocket(getValueConfig(enumOptions.UrlApiStockfish));
        }
      });
      return;
    }
    if (engineSource === "websocket") {
      const newWsUrl = getValueConfig(enumOptions.UrlApiStockfish);
      if (newWsUrl && newWsUrl !== this.wsUrl) {
        this.isSwitchingWsUrl = true;
        if (this.stockfish) {
          this.stockfish.close();
        }
        this.ready = false;
        this.loaded = false;
        this.stockfish = null;
        this.initializeWebSocket(newWsUrl);
        return;
      }
    }
    this.options = {
      MultiPV: getValueConfig(enumOptions.MultiPV),
      Hash: getValueConfig(enumOptions.DragonHash),
      "UCI Elo": getValueConfig(enumOptions.DragonUciElo),
      Personality: getValueConfig(enumOptions.DragonPersonality),
      "UCI LimitStrength": getValueConfig(enumOptions.DragonLimitStrength),
      "Auto Skill": getValueConfig(enumOptions.DragonAutoSkill),
      OwnBook: getValueConfig(enumOptions.DragonOwnBook),
      UCI_Chess960: getValueConfig(enumOptions.DragonChess960),
      "Best Book Line": getValueConfig(enumOptions.DragonBestBookLine),
      "Book Moves": getValueConfig(enumOptions.DragonLimitBookMoves)
        ? parseInt(getValueConfig(enumOptions.DragonBookMoves)) === 11
          ? 1000
          : parseInt(getValueConfig(enumOptions.DragonBookMoves)) || 5
        : 1000,
    };
    this.depth = getValueConfig(enumOptions.Depth);
    if (this.isReady()) {
      this.UpdateOptions();
      if (this.currentFEN) {
        this.stopEvaluation(() => {
          this.topMoves = [];
          this.send("position fen " + this.currentFEN);
          this.isEvaluating = true;
          this.send("go depth " + this.depth);
        });
      }
    }
  }
  // Pushes the UCI option set (depth, MultiPV, hash, Elo, book…) to the engine worker.
  UpdateOptions(options = null) {
    if (options === null) {
      options = this.options;
    }
    Object.keys(options).forEach((name) => {
      this.send("setoption name " + name + " value " + options[name]);
    });
  }
  // Core UCI output parser. Handles: uciok/readyok handshake, `info … score cp/mate … pv …`
  // lines (parsed into TopMove entries), `bestmove` (finalizes the search), and engine
  // book/option echoes. Drives arrows, eval, coach and auto-move downstream.
  ProcessMessage(message) {
    if (this.engineType === "websocket") {
      this.ready = false;
    }
    let line =
      message && typeof message === "object" && "data" in message
        ? message.data
        : message;
    if (line === "uciok") {
      this.loaded = true;
      this.BetterMintmaster.onEngineLoaded();
    } else if (line === "readyok") {
      this.ready = true;
      if (this.readyCallbacks.length > 0) {
        let callbacks = this.readyCallbacks;
        this.readyCallbacks = [];
        callbacks.forEach(function (callback) {
          callback();
        });
      }
    } else if (this.isEvaluating && line === "Load eval file success: 1") {
      this.isEvaluating = false;
      this.isRequestedStop = false;
      if (this.goDoneCallbacks.length > 0) {
        let callbacks = this.goDoneCallbacks;
        this.goDoneCallbacks = [];
        callbacks.forEach(function (callback) {
          callback();
        });
      }
    } else {
      let depthMatch = line.match(/^info .*?depth (\d+)/);
      let seldepthMatch = line.match(/^info .*?seldepth (\d+)/);
      let timeMatch = line.match(/^info .*?time (\d+)/);
      let scoreMatch = line.match(/^info .*?score (\w+) (-?\d+)/);
      let pvMatch = line.match(
        /^info .*?pv ([a-h][1-8][a-h][1-8][qrbn]?(?: [a-h][1-8][a-h][1-8][qrbn]?)*)(?: .*)?/,
      );
      let multipvMatch = line.match(/^info .*?multipv (\d+)/);
      let bestmoveMatch = line.match(
        /^bestmove ([a-h][1-8][a-h][1-8][qrbn]?)(?: ponder ([a-h][1-8][a-h][1-8][qrbn]?))?/,
      );
      if (depthMatch && scoreMatch && pvMatch) {
        let depth = parseInt(depthMatch[1]);
        let seldepth = seldepthMatch ? parseInt(seldepthMatch[1]) : null;
        let timeMs = timeMatch ? parseInt(timeMatch[1]) : null;
        let scoreType = scoreMatch[1];
        let scoreValue = parseInt(scoreMatch[2]);
        let multipv = multipvMatch ? parseInt(multipvMatch[1]) : 1;
        let pv = pvMatch[1];
        let cp = scoreType === "cp" ? scoreValue : null;
        let mate = scoreType === "mate" ? scoreValue : null;
        if (!this.isRequestedStop) {
          let topMove = new TopMove(pv, depth, cp, mate, multipv);
          this.onTopMoves(topMove, false);
        }
      } else if (bestmoveMatch) {
        this.isEvaluating = false;
        if (this.goDoneCallbacks.length > 0) {
          let callbacks = this.goDoneCallbacks;
          this.goDoneCallbacks = [];
          callbacks.forEach(function (callback) {
            callback();
          });
        }
        try {
          const ponderMove = bestmoveMatch[2];
          if (ponderMove && ponderMove.length >= 4) {
            const fen = this.BetterMintmaster.game.controller.getFEN();
            const sideToMove = fen ? fen.split(" ")[1] : null;
            const playingAs = this.BetterMintmaster.game.controller.getPlayingAs
              ? this.BetterMintmaster.game.controller.getPlayingAs()
              : this.BetterMintmaster.game.options.isPlayerBlack
                ? 2
                : 1;
            const isMyTurn =
              (playingAs === 1 && sideToMove === "w") ||
              (playingAs === 2 && sideToMove === "b");
            if (!isMyTurn) {
              const bestMate =
                this.topMoves.length > 0 ? this.topMoves[0].mate : null;
              this.lastPonder = {
                from: ponderMove.substring(0, 2),
                to: ponderMove.substring(2, 4),
                promotion:
                  ponderMove.length > 4 ? ponderMove.substring(4, 5) : null,
                bestMate: bestMate,
                piece: this._getPieceAt(fen, ponderMove.substring(0, 2)),
              };
              try {
                if (
                  getValueConfig(enumOptions.AutoMoveEnabled) &&
                  getValueConfig(enumOptions.PremoveEnabled) &&
                  getValueConfig(enumOptions.AutoPremoveEnabled)
                ) {
                  const bestMove = bestmoveMatch[1];
                  const ponder = this.lastPonder;
                  if (bestMove && bestMove.length >= 4 && ponder) {
                    const bestMoveTo = bestMove.substring(2, 4);
                    let isOpponentPiece = false;
                    try {
                      const preFen = this.preOpponentFEN;
                      if (preFen) {
                        const board = preFen.split(" ")[0];
                        const rows = board.split("/");
                        const fileIdx =
                          bestMoveTo.charCodeAt(0) - "a".charCodeAt(0);
                        const rankIdx = 8 - parseInt(bestMoveTo[1]);
                        let col = 0;
                        let pieceChar = null;
                        for (const ch of rows[rankIdx]) {
                          if (ch >= "1" && ch <= "8") {
                            col += parseInt(ch);
                          } else {
                            if (col === fileIdx) {
                              pieceChar = ch;
                              break;
                            }
                            col++;
                          }
                        }
                        if (pieceChar !== null) {
                          isOpponentPiece =
                            playingAs === 1
                              ? pieceChar === pieceChar.toUpperCase()
                              : pieceChar === pieceChar.toLowerCase();
                        }
                      }
                    } catch (error) {}
                    if (isOpponentPiece && ponder.to === bestMoveTo) {
                      const boardEl = document.querySelector("wc-chess-board");
                      if (boardEl && boardEl.game && boardEl.game.premoves) {
                        const premoveMove = {
                          from: ponder.from,
                          to: ponder.to,
                        };
                        boardEl.game.premoves.move(premoveMove);
                      } else {
                      }
                    }
                  }
                }
              } catch (error) {
                console.warn("[AutoPremove] Hata:", error);
              }
              try {
                if (
                  getValueConfig(enumOptions.AutoMoveEnabled) &&
                  getValueConfig(enumOptions.PremoveEnabled) &&
                  getValueConfig(enumOptions.AutoPremoveMatesEnabled)
                ) {
                  const ponder = this.lastPonder;
                  const isMatePremove = ponder && ponder.bestMate === -1;
                  if (isMatePremove) {
                    const boardEl = document.querySelector("wc-chess-board");
                    if (boardEl && boardEl.game && boardEl.game.premoves) {
                      const premoveMove = {
                        from: ponder.from,
                        to: ponder.to,
                        promotion: ponder.promotion || undefined,
                      };
                      boardEl.game.premoves.move(premoveMove);
                    } else {
                    }
                  }
                }
              } catch (error) {
                console.warn("[AutoPremoveMates] Hata:", error);
              }
              try {
                if (
                  getValueConfig(enumOptions.AutoMoveEnabled) &&
                  getValueConfig(enumOptions.PremoveEnabled) &&
                  getValueConfig(enumOptions.AutoPremoveCheckingForkEnabled)
                ) {
                  const lastMove =
                    this.BetterMintmaster.game.controller.getLastMove();
                  const ponder = this.lastPonder;
                  const playingAs =
                    this.BetterMintmaster.game.controller.getPlayingAs();
                  if (
                    this.lastMoveGaveCheck &&
                    lastMove &&
                    ponder &&
                    ponder.from === lastMove.to &&
                    this.preOpponentFEN
                  ) {
                    let isMyPiece = false;
                    try {
                      const board = this.preOpponentFEN.split(" ")[0];
                      const rows = board.split("/");
                      const fileIdx =
                        ponder.to.charCodeAt(0) - "a".charCodeAt(0);
                      const rankIdx = 8 - parseInt(ponder.to[1]);
                      let col = 0;
                      let pieceChar = null;
                      for (const ch of rows[rankIdx]) {
                        if (ch >= "1" && ch <= "8") {
                          col += parseInt(ch);
                        } else {
                          if (col === fileIdx) {
                            pieceChar = ch;
                            break;
                          }
                          col++;
                        }
                      }
                      if (pieceChar !== null) {
                        isMyPiece =
                          playingAs === 1
                            ? pieceChar === pieceChar.toLowerCase()
                            : pieceChar === pieceChar.toUpperCase();
                      }
                    } catch (error) {}
                    if (isMyPiece) {
                      const boardEl = document.querySelector("wc-chess-board");
                      if (boardEl && boardEl.game && boardEl.game.premoves) {
                        const premoveMove = {
                          from: ponder.from,
                          to: ponder.to,
                          promotion: ponder.promotion || undefined,
                        };
                        boardEl.game.premoves.move(premoveMove);
                      }
                    }
                  }
                }
              } catch (error) {}
              try {
                const clockSeconds = this.getMyClockSeconds();
                const premoveChance =
                  clockSeconds <= 5 ? 0.5 : clockSeconds <= 10 ? 0.2 : 0;
                if (
                  getValueConfig(enumOptions.FlagModeEnabled) &&
                  getValueConfig(enumOptions.AutoMoveEnabled) &&
                  clockSeconds !== null &&
                  clockSeconds <= 10 &&
                  Math.random() < premoveChance
                ) {
                  const ponder = this.lastPonder;
                  if (ponder && ponder.from && ponder.to) {
                    const boardEl = document.querySelector("wc-chess-board");
                    if (boardEl && boardEl.game && boardEl.game.premoves) {
                      const premoveMove = {
                        from: ponder.from,
                        to: ponder.to,
                      };
                      boardEl.game.premoves.move(premoveMove);
                    } else {
                    }
                  }
                }
              } catch (error) {
                console.warn("[FlagMode] Random premove hatası:", error);
              }
              const bookFallbackActive =
                (getValueConfig(enumOptions.UltrabulletOpeningPreference) ||
                  "none") === "none" &&
                this._lastOwnMoveWasBookFallback === true;
              try {
                const ultrabulletFlagMode = getValueConfig(
                  enumOptions.UltrabulletFlagModeEnabled,
                );
                const ultrabulletEnabled = getValueConfig(
                  enumOptions.UltrabulletEnabled,
                );
                const clockSeconds = this.getMyClockSeconds();
                if (
                  ultrabulletFlagMode &&
                  ultrabulletEnabled &&
                  !bookFallbackActive &&
                  clockSeconds !== null &&
                  clockSeconds === 0 &&
                  Math.random() < 0.9
                ) {
                  const ponder = this.lastPonder;
                  if (ponder && ponder.from && ponder.to) {
                    const boardEl = document.querySelector("wc-chess-board");
                    if (boardEl && boardEl.game && boardEl.game.premoves) {
                      const premoveMove = {
                        from: ponder.from,
                        to: ponder.to,
                        promotion: ponder.promotion || undefined,
                      };
                      boardEl.game.premoves.move(premoveMove);
                    }
                  }
                }
              } catch (error) {
                console.warn("[Ultrabullet FlagMode] Premove hatası:", error);
              }
              try {
                if (
                  !this._lefongTrapPending &&
                  !bookFallbackActive &&
                  getValueConfig(enumOptions.UltrabulletEnabled) &&
                  this._getOwnMoveNumber(fen, playingAs) >
                    ULTRABULLET_CHANCE_LOCK_MOVES
                ) {
                  const premoveChancePct =
                    parseInt(
                      getValueConfig(enumOptions.UltrabulletPremoveChance),
                    ) || 0;
                  if (
                    premoveChancePct > 0 &&
                    Math.random() * 100 < premoveChancePct
                  ) {
                    const ponder = this.lastPonder;
                    if (ponder && ponder.from && ponder.to) {
                      const chainLimit =
                        parseInt(
                          getValueConfig(
                            enumOptions.UltrabulletPremoveChainLimit,
                          ),
                        ) || 5;
                      if (this.premoveStreak >= chainLimit) {
                        this.premoveStreak = 0;
                      } else {
                        const guardQueenRisk =
                          getValueConfig(enumOptions.UltrabulletGuardQueen) &&
                          ponder.piece &&
                          ponder.piece.toLowerCase() === "q";
                        const skipForQueenGuard =
                          guardQueenRisk && Math.random() * 100 < 80;
                        if (!skipForQueenGuard) {
                          const boardEl =
                            document.querySelector("wc-chess-board");
                          if (
                            boardEl &&
                            boardEl.game &&
                            boardEl.game.premoves
                          ) {
                            const premoveMove = {
                              from: ponder.from,
                              to: ponder.to,
                              promotion: ponder.promotion || undefined,
                            };
                            boardEl.game.premoves.move(premoveMove);
                          }
                          this.premoveStreak++;
                        }
                      }
                    }
                  } else {
                    this.premoveStreak = 0;
                  }
                }
              } catch (error) {
                console.warn(
                  "[Ultrabullet] Auto Premove Chance hatası:",
                  error,
                );
              }
            }
          }
        } catch (error) {}
        if (!this.isRequestedStop && bestmoveMatch[1] !== undefined) {
          const bestMove = bestmoveMatch[1];
          const matchIndex = this.topMoves.findIndex(
            (topMove) => topMove.move === bestMove,
          );
          if (matchIndex < 0) {
            console.warn(
              'The engine returned the best move "' +
                bestMove +
                "\" but it's not in the top move list.",
            );
            let fallbackTopMove = new TopMove(
              bestMove,
              getValueConfig(enumOptions.Depth),
              100,
              null,
            );
            this._lastOwnMoveWasBookFallback = true;
            this.onTopMoves(fallbackTopMove, true);
          } else {
            this._lastOwnMoveWasBookFallback = false;
            this.onTopMoves(this.topMoves[matchIndex], true);
          }
        }
        this.isRequestedStop = false;
      }
    }
  }
  // Runs and clears the queued on-ready callbacks after the handshake completes.
  executeReadyCallbacks() {
    while (this.readyCallbacks.length > 0) {
      const callback = this.readyCallbacks.shift();
      callback();
    }
  }
  // The main per-move entry point: syncs position state, runs the opening book,
  // triggers analysis, coach, premove and ultrabullet logic for the new position.
  MoveAndGo(fen = null, newGame = true) {
    if (this.engineType === "maia") {
      const fen = this.BetterMintmaster.game.controller.getFEN();
      if (!fen) {
        console.warn("[MaiaEngine] MoveAndGo — FEN alınamadı, atlanıyor.");
        return;
      }
      const maiaElo = parseInt(getValueConfig("option-maia-elo")) || 1500;
      const sideToMove = fen.split(" ")[1];
      const playingAs = this.BetterMintmaster.game.controller.getPlayingAs?.();
      const isMyTurn =
        (playingAs === 1 && sideToMove === "w") ||
        (playingAs === 2 && sideToMove === "b");
      let legalMoves = null;
      let verboseMoves = [];
      try {
        const chess = new Chess(fen);
        verboseMoves = chess.moves({
          verbose: true,
        });
      } catch (error) {
        console.error(
          "[MaiaEngine] MoveAndGo — chess.js legal moves hatası:",
          error.message,
        );
      }
      legalMoves = new Set(
        verboseMoves.map(
          (move) => move.from + move.to + (move.promotion ?? ""),
        ),
      );
      if (legalMoves.size === 0) {
        console.error(
          "[MaiaEngine] MoveAndGo — Legal hamle üretilemedi! FEN:",
          fen,
        );
      }
      this.BetterMintmaster.maiaEngine
        .getBestMove(fen, maiaElo, maiaElo, legalMoves)
        .then((uciMove) => {
          if (!uciMove || uciMove.length < 4) {
            console.warn(
              "[MaiaEngine] MoveAndGo — geçersiz/boş uciMove:",
              uciMove,
            );
            return;
          }
          if (uciMove[0] === uciMove[2] && uciMove[1] === uciMove[3]) {
            console.warn(
              "[MaiaEngine] MoveAndGo — null move filtrelendi:",
              uciMove,
            );
            return;
          }
          const from = uciMove.substring(0, 2);
          const to = uciMove.substring(2, 4);
          const promotion = uciMove.length === 5 ? uciMove[4] : null;
          const topMove = new TopMove(uciMove, 1, 0, null, 1);
          topMove.from = from;
          topMove.to = to;
          topMove.promotion = promotion;
          this.topMoves = [topMove];
          this.BetterMintmaster.game.HintMoves(
            [topMove],
            this.lastTopMoves,
            true,
          );
          if (isMyTurn) {
            this.scheduleAutoMove();
          }
        })
        .catch((error) => {
          console.error(
            "[MaiaEngine] MoveAndGo — getBestMove exception:",
            error,
          );
        });
      return;
    }
    let resetAndGo = () => {
      this.lastTopMoves = newGame ? [] : this.topMoves;
      this.lastMoveScore = null;
      this.opponentLastMoveScore = null;
      this.topMoves = [];
      this._preAnalyzeFen = "__RESET__";
      if (newGame) {
        this.lastPonder = null;
        this.premoveStreak = 0;
        this.pendingAutoPremove = false;
        this.pendingAutoPremoveMates = false;
        this.simulateMateActive = false;
        this.lastMoveGaveCheck = false;
        this.openingMovePlayed = false;
      }
      if (this.autoMoveTimer !== null) {
        clearTimeout(this.autoMoveTimer);
        this.autoMoveTimer = null;
      }
      if (this.ultrabulletMoveTimer !== null) {
        clearTimeout(this.ultrabulletMoveTimer);
        this.ultrabulletMoveTimer = null;
      }
      try {
        const fen = this.BetterMintmaster.game.controller.getFEN();
        const sideToMove = fen ? fen.split(" ")[1] : null;
        const playingAs = this.BetterMintmaster.game.controller.getPlayingAs();
        const isMyTurn =
          (playingAs === 1 && sideToMove === "w") ||
          (playingAs === 2 && sideToMove === "b");
        if (!isMyTurn) {
          this.lastOpponentMoves = [];
          this.preOpponentFEN = fen;
          this.preOpponentStockfishCp = this.lastStockfishCp;
          try {
            const lastMove =
              this.BetterMintmaster.game.controller.getLastMove();
            if (lastMove && lastMove.to && fen) {
              this.lastMoveGaveCheck = this._doesPieceGiveCheck(
                fen,
                lastMove.to,
                playingAs,
              );
            } else {
              this.lastMoveGaveCheck = false;
            }
          } catch (error) {
            this.lastMoveGaveCheck = false;
          }
        }
      } catch (error) {}
      if (eTable != null) {
        const theoryKey = this.BetterMintmaster.game.controller
          .getFEN()
          .split(" ")
          .slice(0, 3)
          .join(" ");
        this.isInTheory = eTable.get(theoryKey) === true;
      } else {
        this.isInTheory = false;
      }
      try {
        this.lastBoardFEN = this.BetterMintmaster.game.controller.getFEN();
      } catch (error) {
        this.lastBoardFEN = null;
      }
      if (fen != null) {
        this.currentFEN = fen;
        this.send("position fen " + fen);
      }
      this.go();
    };
    this.onReady(() => {
      if (newGame) {
        this.send("ucinewgame");
        if (
          getValueConfig(enumOptions.DragonLimitBookMoves) &&
          getValueConfig(enumOptions.DragonOwnBook)
        ) {
          this.send("setoption name OwnBook value true");
        }
        this.onReady(resetAndGo);
      } else {
        resetAndGo();
      }
    });
  }
  // Grades the move just played (ours or theirs) by comparing evals — feeds the coach.
  AnalyzeLastMove() {
    this.lastMoveScore = null;
    let lastMove = this.BetterMintmaster.game.controller.getLastMove();
    if (lastMove === undefined) {
      return;
    }
    if (this.isInTheory) {
      this.lastMoveScore = "Book";
    } else if (this.lastTopMoves.length > 0) {
      let prevTopMove = this.lastTopMoves[0];
      if (
        prevTopMove.from === lastMove.from &&
        prevTopMove.to === lastMove.to
      ) {
        this.lastMoveScore = "BestMove";
      } else {
        let currentTopMove = this.topMoves[0];
        if (prevTopMove.mate != null) {
          if (currentTopMove.mate == null) {
            this.lastMoveScore =
              prevTopMove.mate > 0 ? "MissedWin" : "Brilliant";
          } else {
            this.lastMoveScore =
              prevTopMove.mate > 0 ? "Excellent" : "ResignWhite";
          }
        } else if (currentTopMove.mate != null) {
          this.lastMoveScore =
            currentTopMove.mate < 0 ? "Brilliant" : "Blunder";
        } else if (currentTopMove.cp != null && prevTopMove.cp != null) {
          let cpDelta = -(currentTopMove.cp + prevTopMove.cp);
          if (cpDelta > 100) {
            this.lastMoveScore = "Brilliant";
          } else if (cpDelta > 0) {
            this.lastMoveScore = "GreatFind";
          } else if (cpDelta > -10) {
            this.lastMoveScore = "BestMove";
          } else if (cpDelta > -25) {
            this.lastMoveScore = "Excellent";
          } else if (cpDelta > -50) {
            this.lastMoveScore = "Good";
          } else if (cpDelta > -100) {
            this.lastMoveScore = "Inaccuracy";
          } else if (cpDelta > -250) {
            this.lastMoveScore = "Mistake";
          } else {
            this.lastMoveScore = "Blunder";
          }
        } else {
          console.assert(false, "Error while analyzing last move");
        }
      }
    }
    if (this.lastMoveScore != null) {
      const scoreColors = {
        Brilliant: "#1baca6",
        GreatFind: "#5c8bb0",
        BestMove: "#9eba5a",
        Excellent: "#96bc4b",
        Good: "#96af8b",
        Book: "#a88865",
        Inaccuracy: "#FECA57",
        Mistake: "#e6912c",
        Blunder: "#b33430",
        MissedWin: "#dbac16",
      };
      this.BetterMintmaster.game.controller.markings.addOne({
        data: {
          square: lastMove.to,
          type: this.lastMoveScore,
        },
        node: true,
        persistent: true,
        type: "effect",
      });
    }
  }
  // Detects an opponent blunder (eval swing) and reacts when blunder-react is enabled.
  AnalyzeOpponentBlunder() {
    this.opponentLastMoveScore = null;
    let lastMove = this.BetterMintmaster.game.controller.getLastMove();
    if (lastMove === undefined) {
      return;
    }
    if (this.isInTheory) {
      this.opponentLastMoveScore = "Book";
      return;
    }
    if (this.lastTopMoves.length === 0) {
      return;
    }
    let prevTopMove = this.lastTopMoves[0];
    if (prevTopMove.from === lastMove.from && prevTopMove.to === lastMove.to) {
      this.opponentLastMoveScore = "BestMove";
    } else {
      let currentTopMove = this.topMoves[0];
      if (!currentTopMove) {
        return;
      }
      if (prevTopMove.mate != null) {
        if (currentTopMove.mate == null) {
          this.opponentLastMoveScore =
            prevTopMove.mate > 0 ? "MissedWin" : "Brilliant";
        } else {
          this.opponentLastMoveScore =
            prevTopMove.mate > 0 ? "Excellent" : "ResignWhite";
        }
      } else if (currentTopMove.mate != null) {
        this.opponentLastMoveScore =
          currentTopMove.mate < 0 ? "Brilliant" : "Blunder";
      } else {
        const currentCp = this.lastStockfishCp;
        const preOpponentCp = this.preOpponentStockfishCp;
        if (
          currentCp !== null &&
          currentCp !== undefined &&
          preOpponentCp !== null &&
          preOpponentCp !== undefined
        ) {
          const playingAs =
            this.BetterMintmaster.game.controller.getPlayingAs();
          const cpDelta =
            playingAs === 2
              ? currentCp - preOpponentCp
              : -(currentCp - preOpponentCp);
          if (cpDelta > 100) {
            this.opponentLastMoveScore = "Brilliant";
          } else if (cpDelta > 0) {
            this.opponentLastMoveScore = "GreatFind";
          } else if (cpDelta > -10) {
            this.opponentLastMoveScore = "BestMove";
          } else if (cpDelta > -25) {
            this.opponentLastMoveScore = "Excellent";
          } else if (cpDelta > -50) {
            this.opponentLastMoveScore = "Good";
          } else if (cpDelta > -100) {
            this.opponentLastMoveScore = "Inaccuracy";
          } else if (cpDelta > -300) {
            this.opponentLastMoveScore = "Mistake";
          } else {
            this.opponentLastMoveScore = "Blunder";
          }
        } else if (currentTopMove.cp != null && prevTopMove.cp != null) {
          let cpDelta = -(currentTopMove.cp + prevTopMove.cp);
          if (cpDelta > 100) {
            this.opponentLastMoveScore = "Brilliant";
          } else if (cpDelta > 0) {
            this.opponentLastMoveScore = "GreatFind";
          } else if (cpDelta > -10) {
            this.opponentLastMoveScore = "BestMove";
          } else if (cpDelta > -25) {
            this.opponentLastMoveScore = "Excellent";
          } else if (cpDelta > -50) {
            this.opponentLastMoveScore = "Good";
          } else if (cpDelta > -100) {
            this.opponentLastMoveScore = "Inaccuracy";
          } else if (cpDelta > -300) {
            this.opponentLastMoveScore = "Mistake";
          } else {
            this.opponentLastMoveScore = "Blunder";
          }
        }
      }
    }
  }
  // Processes queued pre-move analyses one by one (Torch pre-coach) and places icons.
  async runPreAnalyzeQueue(moves) {
    if (!getValueConfig(enumOptions.PreAnalyzeEnabled)) {
      return;
    }
    if (this._preAnalyzeRunning) {
      return;
    }
    const preCoach = this.BetterMintmaster.preCoach;
    const game = this.BetterMintmaster.game;
    if (!preCoach || !game) {
      console.warn("[PreAnalyze] preCoach veya game yok — çıkış");
      return;
    }
    const fen = game.controller.getFEN();
    this._preAnalyzeRunning = true;
    this._preAnalyzeFen = fen;
    if (game.clearPreAnalyzeMarkings) {
      game.clearPreAnalyzeMarkings();
    }
    for (const entry of moves) {
      if (this._preAnalyzeFen !== fen) {
        break;
      }
      if (!getValueConfig(enumOptions.PreAnalyzeEnabled)) {
        break;
      }
      const move = entry.move;
      const positionUci = game.buildUciPositionWithCandidate(move);
      let waitedMs = 0;
      while (preCoach.worker && !preCoach._ready && waitedMs < 3000) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        waitedMs += 100;
        if (this._preAnalyzeFen !== fen) {
          break;
        }
      }
      if (this._preAnalyzeFen !== fen) {
        break;
      }
      let analysis = null;
      try {
        analysis = await preCoach.getAnalysis(positionUci);
      } catch (error) {
        console.warn("[PreAnalyze] hata:", error);
      }
      if (!analysis || !analysis.classificationName) {
        continue;
      }
      if (this._preAnalyzeFen !== fen) {
        break;
      }
      if (game.placePreAnalyzeIcon) {
        game.placePreAnalyzeIcon(entry.to, analysis.classificationName);
      }
    }
    this._preAnalyzeRunning = false;
  }
  // Consumes a finished search: stores top moves, updates arrows/eval, and arms
  // auto-move / ultrabullet / premove decisions for this position.
  onTopMoves(topMove = null, isBestMove = false) {
    window.top_pv_moves = [];
    var bestMoveReady = false;
    if (topMove != null) {
      const existingIndex = this.topMoves.findIndex(
        (tm) => tm.move === topMove.move,
      );
      if (isBestMove) {
        bestMoveReady = true;
        if (existingIndex === -1) {
          this.topMoves.push(topMove);
          this.SortTopMoves();
        }
        try {
          const fen = this.BetterMintmaster.game.controller.getFEN();
          const sideToMove = fen ? fen.split(" ")[1] : null;
          const playingAs =
            this.BetterMintmaster.game.controller.getPlayingAs();
          const isMyTurn =
            (playingAs === 1 && sideToMove === "w") ||
            (playingAs === 2 && sideToMove === "b");
          if (!isMyTurn) {
            this.lastOpponentMoves = this.topMoves.map((tm) => ({
              from: tm.from,
              to: tm.to,
            }));
          }
          const flagModeActive =
            getValueConfig(enumOptions.FlagModeEnabled) &&
            this.getMyClockSeconds() !== null &&
            this.getMyClockSeconds() <= 5;
          if (
            isMyTurn &&
            getValueConfig(enumOptions.InstantRecapture) &&
            !flagModeActive
          ) {
            const lastMove =
              this.BetterMintmaster.game.controller.getLastMove();
            const topMove = this.topMoves[0];
            if (lastMove && topMove) {
              const wasOpponentMove = this.lastOpponentMoves.some(
                (tracked) =>
                  tracked.from === lastMove.from && tracked.to === lastMove.to,
              );
              let isRecapture = false;
              try {
                const preFen = this.preOpponentFEN || this.lastBoardFEN;
                const boardPart = preFen.split(" ")[0];
                const rows = boardPart.split("/");
                const fileIdx = lastMove.to.charCodeAt(0) - "a".charCodeAt(0);
                const rankIdx = 8 - parseInt(lastMove.to[1]);
                let col = 0;
                let pieceChar = null;
                for (const ch of rows[rankIdx]) {
                  if (ch >= "1" && ch <= "8") {
                    col += parseInt(ch);
                  } else {
                    if (col === fileIdx) {
                      pieceChar = ch;
                      break;
                    }
                    col++;
                  }
                }
                if (pieceChar !== null) {
                  isRecapture =
                    playingAs === 1
                      ? pieceChar === pieceChar.toUpperCase()
                      : pieceChar === pieceChar.toLowerCase();
                }
              } catch (error) {}
              const sameTarget = topMove.to === lastMove.to;
              if (wasOpponentMove && isRecapture && sameTarget) {
                setTimeout(() => this.playBestMove(), 0);
              }
            }
          }
        } catch (error) {}
      } else {
        try {
          const fen = this.BetterMintmaster.game.controller.getFEN();
          const sideToMove = fen ? fen.split(" ")[1] : null;
          const playingAs =
            this.BetterMintmaster.game.controller.getPlayingAs();
          const isOpponentTurn =
            (playingAs !== 1 || sideToMove !== "w") &&
            (playingAs !== 2 || sideToMove !== "b");
          if (isOpponentTurn && topMove.from && topMove.to) {
            const alreadyTracked = this.lastOpponentMoves.some(
              (tracked) =>
                tracked.from === topMove.from && tracked.to === topMove.to,
            );
            if (!alreadyTracked) {
              const opponentMove = {
                from: topMove.from,
                to: topMove.to,
              };
              this.lastOpponentMoves.push(opponentMove);
            }
          }
        } catch (error) {}
        if (existingIndex === -1) {
          this.topMoves.push(topMove);
          this.SortTopMoves();
        } else if (topMove.depth >= this.topMoves[existingIndex].depth) {
          this.topMoves[existingIndex] = topMove;
          this.SortTopMoves();
        }
      }
    }
    if (bestMoveReady && this.topMoves.length > 0) {
      const topMove = this.topMoves[0];
      const fen = this.BetterMintmaster.game.controller.getFEN();
      const sideToMove = fen.split(" ")[1];
      const playingAs = this.BetterMintmaster.game.controller.getPlayingAs();
      if (false && false) {
        if (
          ((playingAs === 1 && sideToMove === "w") ||
            (playingAs === 2 && sideToMove === "b")) &&
          this.moveCounter < getValueConfig(enumOptions.MaxPreMoves) &&
          !this.hasShownLimitMessage
        ) {
          const legalMoves =
            this.BetterMintmaster.game.controller.getLegalMoves();
          const premoveMove = legalMoves.find(
            (legal) => legal.from === topMove.from && legal.to === topMove.to,
          );
          if (premoveMove) {
            premoveMove.userGenerated = true;
            if (topMove.promotion !== null) {
              premoveMove.promotion = topMove.promotion;
            }
            this.moveCounter++;
            let premoveDelay =
              getValueConfig(enumOptions.PreMoveTime) +
              (Math.floor(
                Math.random() * getValueConfig(enumOptions.PreMoveTimeRandom),
              ) %
                getValueConfig(enumOptions.PreMoveTimeRandomDiv)) *
                getValueConfig(enumOptions.PreMoveTimeRandomMulti);
            setTimeout(() => {
              this.BetterMintmaster.game.controller.move(premoveMove);
              if (this.moveCounter >= getValueConfig(enumOptions.MaxPreMoves)) {
                this.hasShownLimitMessage = true;
              }
            }, premoveDelay);
          }
        }
        if (
          topMove.mate !== null &&
          topMove.mate > 0 &&
          topMove.mate <= getValueConfig(enumOptions.MateFinderValue)
        ) {
          const legalMoves =
            this.BetterMintmaster.game.controller.getLegalMoves();
          const mateMove = legalMoves.find(
            (legal) => legal.from === topMove.from && legal.to === topMove.to,
          );
          if (mateMove) {
            mateMove.userGenerated = true;
            if (topMove.promotion !== null) {
              mateMove.promotion = topMove.promotion;
            }
            this.BetterMintmaster.game.controller.move(mateMove);
          }
        }
      }
    }
    if (false) {
      const topMove = this.topMoves[0];
      const utterance = new SpeechSynthesisUtterance(topMove.move);
      const voices = window.speechSynthesis.getVoices();
      const googleVoices = voices.filter((voice) =>
        voice.voiceURI.includes("Google UK English Female"),
      );
      if (googleVoices.length > 0) {
        utterance.voice = googleVoices[0];
      }
      utterance.volume = 0.75;
      utterance.rate = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
    if (bestMoveReady) {
      top_pv_moves = this.topMoves.slice(0, this.options.MultiPV);
      this.BetterMintmaster.game.HintMoves(
        top_pv_moves,
        this.lastTopMoves,
        isBestMove,
      );
      this.runPreAnalyzeQueue(top_pv_moves);
      if (false && getValueConfig(enumOptions.MoveAnalysis)) {
        this.AnalyzeLastMove();
      }
      try {
        const fen = this.BetterMintmaster.game.controller.getFEN();
        const sideToMove = fen ? fen.split(" ")[1] : null;
        const playingAs = this.BetterMintmaster.game.controller.getPlayingAs();
        const isMyTurn =
          (playingAs === 1 && sideToMove === "w") ||
          (playingAs === 2 && sideToMove === "b");
        if (isMyTurn) {
          this.AnalyzeOpponentBlunder();
        }
      } catch (error) {}
      this.scheduleAutoMove();
      this.scheduleUltrabulletMove();
    } else {
      if (false) {
        const accuracyMoves = this.topMoves.filter(
          (tm) => tm.accuracy !== undefined,
        );
        if (accuracyMoves.length > 0) {
          accuracyMoves.sort((a, b) => b.accuracy - a.accuracy);
          const totalAccuracy = accuracyMoves.reduce(
            (cumulative, tm) => cumulative + tm.accuracy,
            0,
          );
          const cumulative = accuracyMoves.reduce((cumulative, tm) => {
            const prevCumulative =
              cumulative.length > 0 ? cumulative[cumulative.length - 1] : 0;
            const probability = tm.accuracy / totalAccuracy;
            cumulative.push(prevCumulative + probability);
            return cumulative;
          }, []);
          const roll = Math.random();
          let picked;
          for (let i = 0; i < cumulative.length; i++) {
            if (roll <= cumulative[i]) {
              picked = accuracyMoves[i];
              break;
            }
          }
          top_pv_moves = [
            picked,
            ...this.topMoves.filter((tm) => tm !== picked),
          ];
        } else {
          top_pv_moves = this.topMoves.slice(0, this.options.MultiPV);
        }
      }
      top_pv_moves = this.topMoves.slice(0, this.options.MultiPV);
    }
  }
  // Reads our remaining clock from the chess.com DOM (null when not found).
  getMyClockSeconds() {
    try {
      const clockEl = document.querySelector(
        ".clock-bottom .clock-time-monospace",
      );
      if (!clockEl) {
        return null;
      }
      const clockText = clockEl.textContent.trim();
      const parts = clockText.split(":");
      if (parts.length !== 2) {
        return null;
      }
      const seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
      if (isNaN(seconds)) {
        return null;
      } else {
        return seconds;
      }
    } catch (error) {
      return null;
    }
  }
  applyFlagProfile({
    depth: depth,
    personality: personality,
    delayMin: delayMin,
    delayMax: delayMax,
  }) {
    if (this._flagProfileActive) {
      return;
    }
    this._flagProfileActive = true;
    this.depth = depth;
    this.send("setoption name Personality value " + personality);
  }
  // Flag mode: restores the normal engine profile after a flag-mode burst.
  restoreNormalProfile() {
    if (!this._flagProfileActive) {
      return;
    }
    this._flagProfileActive = false;
    this.depth = getValueConfig(enumOptions.Depth);
    const personality =
      getValueConfig(enumOptions.DragonPersonality) || "Default";
    this.send("setoption name Personality value " + personality);
  }
  // Collects the squares currently occupied by enemy pieces (capture-aware timing).
  _getOpponentSquares(fen, playingAs) {
    const squares = new Set();
    try {
      const boardPart = fen.split(" ")[0];
      const rows = boardPart.split("/");
      for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
        let col = 0;
        for (const ch of rows[rankIdx]) {
          if (ch >= "1" && ch <= "8") {
            col += parseInt(ch);
          } else {
            const isOpponentPiece =
              playingAs === 1
                ? ch === ch.toLowerCase()
                : ch === ch.toUpperCase();
            if (isOpponentPiece) {
              const fileChar = String.fromCharCode("a".charCodeAt(0) + col);
              const rankStr = String(8 - rankIdx);
              squares.add(fileChar + rankStr);
            }
            col++;
          }
        }
      }
    } catch (error) {}
    return squares;
  }
  // Counts our completed moves from the FEN move counter (gates ultrabullet chances).
  _getOwnMoveNumber(fen, playingAs) {
    try {
      const parts = fen.split(" ");
      const sideToMove = parts[1];
      const fullmoveNumber = parseInt(parts[5], 10) || 1;
      const myColor = playingAs === 1 ? "w" : "b";
      if (sideToMove === myColor) {
        return fullmoveNumber;
      }
      if (myColor === "w") {
        return fullmoveNumber + 1;
      } else {
        return fullmoveNumber;
      }
    } catch (error) {
      return 1;
    }
  }
  // Destination square of the opponent's last capture (instant-recapture target).
  _getRecaptureSquare(playingAs) {
    try {
      const lastMove = this.BetterMintmaster.game.controller.getLastMove();
      if (!lastMove || !lastMove.to) {
        return null;
      }
      const preFen = this.preOpponentFEN || this.lastBoardFEN;
      if (!preFen) {
        return null;
      }
      const boardPart = preFen.split(" ")[0];
      const rows = boardPart.split("/");
      const fileIdx = lastMove.to.charCodeAt(0) - "a".charCodeAt(0);
      const rankIdx = 8 - parseInt(lastMove.to[1]);
      let col = 0;
      let pieceChar = null;
      for (const ch of rows[rankIdx]) {
        if (ch >= "1" && ch <= "8") {
          col += parseInt(ch);
        } else {
          if (col === fileIdx) {
            pieceChar = ch;
            break;
          }
          col++;
        }
      }
      if (pieceChar === null) {
        return null;
      }
      const isOpponentPiece =
        playingAs === 1
          ? pieceChar === pieceChar.toUpperCase()
          : pieceChar === pieceChar.toLowerCase();
      if (isOpponentPiece) {
        return lastMove.to;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  }
  // Piece char at a square from the FEN (uppercase = white, lowercase = black), or null.
  _getPieceAt(fen, square) {
    try {
      if (!fen || !square || square.length < 2) {
        return null;
      }
      const boardPart = fen.split(" ")[0];
      const rows = boardPart.split("/");
      const fileIdx = square.charCodeAt(0) - "a".charCodeAt(0);
      const rankIdx = 8 - parseInt(square[1]);
      if (rankIdx < 0 || rankIdx > 7 || !rows[rankIdx]) {
        return null;
      }
      let col = 0;
      for (const ch of rows[rankIdx]) {
        if (ch >= "1" && ch <= "8") {
          col += parseInt(ch);
        } else {
          if (col === fileIdx) {
            return ch;
          }
          col++;
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }
  // Attack detection: knight/bishop/rook/queen/pawn/king patterns over the board array.
  _squareIsAttackedBy(pieceChar, fromFile, fromRank, toFile, toRank, board) {
    try {
      const pieceType = pieceChar.toLowerCase();
      const fileDist = Math.abs(toFile - fromFile);
      const rankDist = Math.abs(toRank - fromRank);
      const pathIsClear = (destFile, destRank) => {
        const fileStep =
          destFile === fromFile ? 0 : destFile > fromFile ? 1 : -1;
        const rankStep =
          destRank === fromRank ? 0 : destRank > fromRank ? 1 : -1;
        let curFile = fromFile + fileStep;
        let curRank = fromRank + rankStep;
        while (curFile !== destFile || curRank !== destRank) {
          if (board[curRank][curFile] !== null) {
            return false;
          }
          curFile += fileStep;
          curRank += rankStep;
        }
        return true;
      };
      if (pieceType === "n") {
        return (
          (fileDist === 1 && rankDist === 2) ||
          (fileDist === 2 && rankDist === 1)
        );
      }
      if (pieceType === "b") {
        return (
          fileDist === rankDist && fileDist !== 0 && pathIsClear(toFile, toRank)
        );
      }
      if (pieceType === "r") {
        return (
          (fileDist === 0 || rankDist === 0) &&
          fileDist + rankDist !== 0 &&
          pathIsClear(toFile, toRank)
        );
      }
      if (pieceType === "q") {
        return (
          ((fileDist === rankDist && fileDist !== 0) ||
            ((fileDist === 0 || rankDist === 0) &&
              fileDist + rankDist !== 0)) &&
          pathIsClear(toFile, toRank)
        );
      }
      if (pieceType === "p") {
        const isWhitePiece = pieceChar === pieceChar.toUpperCase();
        return (
          rankDist === 1 &&
          fileDist === 1 &&
          (isWhitePiece ? toRank > fromRank : toRank < fromRank)
        );
      }
      return false;
    } catch (error) {
      return false;
    }
  }
  // Finds valuable enemy pieces (Q/R/B/N) that can be trapped — feeds the Lefong planner.
  _getValuablePieceSquares(fen, playingAs) {
    const valuableSquares = new Map();
    try {
      const boardPart = fen.split(" ")[0];
      const rows = boardPart.split("/");
      for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
        let col = 0;
        for (const ch of rows[rankIdx]) {
          if (ch >= "1" && ch <= "8") {
            col += parseInt(ch);
          } else {
            const isOpponentPiece =
              playingAs === 1
                ? ch === ch.toLowerCase()
                : ch === ch.toUpperCase();
            const pieceType = ch.toLowerCase();
            if (
              isOpponentPiece &&
              (pieceType === "q" ||
                pieceType === "r" ||
                pieceType === "b" ||
                pieceType === "n")
            ) {
              const fileChar = String.fromCharCode("a".charCodeAt(0) + col);
              const rankStr = String(8 - rankIdx);
              valuableSquares.set(fileChar + rankStr, pieceType);
            }
            col++;
          }
        }
      }
    } catch (error) {}
    return valuableSquares;
  }
  // Ultrabullet mode: plays fast premoves/traps with randomized chances; scripted
  // opening lines run first, random chances unlock after 4 own moves.
  scheduleUltrabulletMove(immediate = false) {
    if (!immediate && !getValueConfig(enumOptions.UltrabulletEnabled)) {
      return;
    }
    if (!this.topMoves || this.topMoves.length === 0) {
      return;
    }
    let fen;
    let sideToMove;
    let playingAs;
    let isMyTurn;
    try {
      fen = this.BetterMintmaster.game.controller.getFEN();
      if (!fen) {
        return;
      }
      sideToMove = fen.split(" ")[1];
      playingAs = this.BetterMintmaster.game.controller.getPlayingAs();
      isMyTurn =
        (playingAs === 1 && sideToMove === "w") ||
        (playingAs === 2 && sideToMove === "b");
    } catch (error) {
      return;
    }
    if (!isMyTurn) {
      return;
    }
    if (this.ultrabulletMoveTimer !== null) {
      clearTimeout(this.ultrabulletMoveTimer);
      this.ultrabulletMoveTimer = null;
    }
    if (this._lefongTrapPending) {
      try {
        const pendingTrap = this._lefongTrapPending;
        const attackerPiece = this._getPieceAt(fen, pendingTrap.attackerSquare);
        const attackerIsMine =
          !!attackerPiece &&
          (playingAs === 1
            ? attackerPiece === attackerPiece.toUpperCase()
            : attackerPiece === attackerPiece.toLowerCase());
        const pieceAtTarget = this._getPieceAt(fen, pendingTrap.targetSquare);
        const targetStillThere =
          !!pieceAtTarget &&
          pieceAtTarget.toLowerCase() === pendingTrap.targetPiece;
        let trapMove = null;
        if (attackerIsMine && targetStillThere) {
          const legalMoves =
            this.BetterMintmaster.game.controller.getLegalMoves();
          const legalTrapMove =
            legalMoves &&
            legalMoves.find(
              (legal) =>
                legal.from === pendingTrap.attackerSquare &&
                legal.to === pendingTrap.targetSquare,
            );
          if (legalTrapMove) {
            try {
              const chess = new Chess(fen);
              const legalByChess = chess
                .moves({
                  verbose: true,
                })
                .some(
                  (vm) =>
                    vm.from === pendingTrap.attackerSquare &&
                    vm.to === pendingTrap.targetSquare,
                );
              if (legalByChess) {
                trapMove = legalTrapMove;
              }
            } catch (error) {}
          }
        }
        this._lefongTrapPending = null;
        if (trapMove) {
          const moveData = Object.assign({}, trapMove);
          moveData.userGenerated = true;
          this.BetterMintmaster.game.controller.move(moveData);
          return;
        }
      } catch (error) {
        console.warn("[Ultrabullet] Lefong Trap Follow-Up hatası:", error);
        this._lefongTrapPending = null;
      }
    }
    try {
      const openingKey =
        getValueConfig(enumOptions.UltrabulletOpeningPreference) || "none";
      const openingLine = ULTRABULLET_OPENING_BOOK[openingKey];
      if (openingLine) {
        const lineMoves =
          playingAs === 1 ? openingLine.white : openingLine.black;
        const fullmoveNumber = parseInt(fen.split(" ")[5], 10) || 1;
        const moveIndex = fullmoveNumber - 1;
        if (moveIndex >= 0 && moveIndex < lineMoves.length) {
          const bookMove = lineMoves[moveIndex];
          let isLegal = false;
          try {
            const chess = new Chess(fen);
            isLegal = chess
              .moves({
                verbose: true,
              })
              .some((vm) => vm.from === bookMove.from && vm.to === bookMove.to);
          } catch (error) {
            isLegal = false;
          }
          if (isLegal) {
            this.ultrabulletMoveTimer = setTimeout(() => {
              this.ultrabulletMoveTimer = null;
              const moveData = {
                from: bookMove.from,
                to: bookMove.to,
              };
              this._playMoveApi(moveData);
            }, 0);
            return;
          }
        } else if (
          openingLine.mateFollowUp &&
          moveIndex === lineMoves.length &&
          this.topMoves &&
          this.topMoves.length > 0 &&
          this.topMoves[0].mate === 1
        ) {
          this.ultrabulletMoveTimer = setTimeout(() => {
            this.ultrabulletMoveTimer = null;
            this.playBestMove();
          }, 0);
          return;
        }
      }
    } catch (error) {
      console.warn("[Ultrabullet] Opening Preference hatası:", error);
    }
    try {
      if (getValueConfig(enumOptions.UltrabulletReactToCheck)) {
        let inCheck = false;
        try {
          const chess = new Chess(fen);
          inCheck = chess.isCheck();
        } catch (error) {
          inCheck = false;
        }
        if (inCheck) {
          const checkDelay = Math.floor(Math.random() * 401) + 400;
          this.ultrabulletMoveTimer = setTimeout(() => {
            this.ultrabulletMoveTimer = null;
            this.playBestMove();
          }, checkDelay);
          return;
        }
      }
    } catch (error) {
      console.warn("[Ultrabullet] React To Check hatası:", error);
    }
    let followThroughAttack = false;
    try {
      if (
        getValueConfig(enumOptions.UltrabulletFollowThroughAttack) &&
        this.topMoves &&
        this.topMoves.length > 0
      ) {
        const fullLine = this.BetterMintmaster.game.controller
          .getCurrentFullLine
          ? this.BetterMintmaster.game.controller.getCurrentFullLine()
          : null;
        if (fullLine && fullLine.length >= 2) {
          const prevOwnMove = fullLine[fullLine.length - 2];
          const topMove = this.topMoves[0];
          if (prevOwnMove && topMove && topMove.from === prevOwnMove.to) {
            const opponentSquares = this._getOpponentSquares(fen, playingAs);
            if (opponentSquares.has(topMove.to)) {
              followThroughAttack = true;
            }
          }
        }
      }
    } catch (error) {
      console.warn("[Ultrabullet] Follow Through Attack hatası:", error);
    }
    let lefongTriggered = false;
    let lefongChoice = null;
    try {
      let inBookLine = false;
      const openingKey =
        getValueConfig(enumOptions.UltrabulletOpeningPreference) || "none";
      const openingLine = ULTRABULLET_OPENING_BOOK[openingKey];
      if (openingLine) {
        const lineMoves =
          playingAs === 1 ? openingLine.white : openingLine.black;
        const fullmoveNumber = parseInt(fen.split(" ")[5], 10) || 1;
        inBookLine = fullmoveNumber - 1 < lineMoves.length;
      }
      const ownMoveNumber = this._getOwnMoveNumber(fen, playingAs);
      if (
        !followThroughAttack &&
        !inBookLine &&
        !this._lefongTrapPending &&
        ownMoveNumber > ULTRABULLET_CHANCE_LOCK_MOVES
      ) {
        const lefongChancePct =
          parseInt(getValueConfig(enumOptions.UltrabulletLefongTrapChance)) ||
          0;
        if (lefongChancePct > 0) {
          const legalMoves =
            this.BetterMintmaster.game.controller.getLegalMoves();
          if (legalMoves && legalMoves.length > 0) {
            let legalUciSet = null;
            try {
              const chess = new Chess(fen);
              legalUciSet = new Set(
                chess
                  .moves({
                    verbose: true,
                  })
                  .map((vm) => vm.from + vm.to),
              );
            } catch (error) {
              legalUciSet = null;
            }
            const boardPart = fen.split(" ")[0];
            const board = [];
            for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
              board.push(new Array(8).fill(null));
            }
            let curRank = 7;
            let curCol = 0;
            for (const ch of boardPart) {
              if (ch === "/") {
                curRank--;
                curCol = 0;
              } else if (ch >= "1" && ch <= "8") {
                curCol += parseInt(ch);
              } else {
                board[curRank][curCol] = ch;
                curCol++;
              }
            }
            const enemyKingChar = sideToMove === "w" ? "k" : "K";
            let kingFile = -1;
            let kingRank = -1;
            kingSearch: for (let r = 0; r < 8; r++) {
              for (let c = 0; c < 8; c++) {
                if (board[r][c] === enemyKingChar) {
                  kingRank = r;
                  kingFile = c;
                  break kingSearch;
                }
              }
            }
            const valuableSquares = this._getValuablePieceSquares(
              fen,
              playingAs,
            );
            const trapsByType = {
              q: [],
              r: [],
              b: [],
              n: [],
            };
            for (const legal of legalMoves) {
              if (!legalUciSet || !legalUciSet.has(legal.from + legal.to)) {
                continue;
              }
              const fromFile = legal.from.charCodeAt(0) - 97;
              const fromRank = parseInt(legal.from[1]) - 1;
              const attackerPiece = board[fromRank]
                ? board[fromRank][fromFile]
                : null;
              if (!attackerPiece) {
                continue;
              }
              const attackerType = attackerPiece.toLowerCase();
              if (!LEFONG_TRAP_ATTACKER_TYPES.includes(attackerType)) {
                continue;
              }
              const toFile = legal.to.charCodeAt(0) - 97;
              const toRank = parseInt(legal.to[1]) - 1;
              if (
                kingFile !== -1 &&
                this._squareIsAttackedBy(
                  attackerPiece,
                  toFile,
                  toRank,
                  kingFile,
                  kingRank,
                  board,
                )
              ) {
                continue;
              }
              for (const [targetSquare, targetType] of valuableSquares) {
                if (targetSquare === legal.to) {
                  continue;
                }
                if (
                  LEFONG_TRAP_VALUE[targetType] <
                  LEFONG_TRAP_VALUE[attackerType]
                ) {
                  continue;
                }
                const targetFile = targetSquare.charCodeAt(0) - 97;
                const targetRank = parseInt(targetSquare[1]) - 1;
                if (
                  this._squareIsAttackedBy(
                    attackerPiece,
                    toFile,
                    toRank,
                    targetFile,
                    targetRank,
                    board,
                  )
                ) {
                  trapsByType[targetType].push({
                    move: legal,
                    targetSquare: targetSquare,
                    targetType: targetType,
                  });
                }
              }
            }
            const availableTypes = Object.keys(trapsByType).filter(
              (type) => trapsByType[type].length > 0,
            );
            if (availableTypes.length > 0) {
              const totalWeight = availableTypes.reduce(
                (totalWeight, type) =>
                  totalWeight + LEFONG_TRAP_PIECE_WEIGHTS[type],
                0,
              );
              let roll = Math.random() * totalWeight;
              let chosenType = availableTypes[availableTypes.length - 1];
              for (const type of availableTypes) {
                if (roll < LEFONG_TRAP_PIECE_WEIGHTS[type]) {
                  chosenType = type;
                  break;
                }
                roll -= LEFONG_TRAP_PIECE_WEIGHTS[type];
              }
              const typeTraps = trapsByType[chosenType];
              const chosenTrap =
                typeTraps[Math.floor(Math.random() * typeTraps.length)];
              if (Math.random() * 100 < lefongChancePct) {
                lefongTriggered = true;
                lefongChoice = chosenTrap;
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn("[Ultrabullet] Lefong Trap Trigger hatası:", error);
    }
    let checkMoveTriggered = false;
    try {
      const ownMoveNumber = this._getOwnMoveNumber(fen, playingAs);
      if (
        !followThroughAttack &&
        !lefongTriggered &&
        ownMoveNumber > ULTRABULLET_CHANCE_LOCK_MOVES
      ) {
        const checkChancePct =
          parseInt(getValueConfig(enumOptions.UltrabulletCheckmoveChance)) || 0;
        if (checkChancePct > 0 && Math.random() * 100 < checkChancePct) {
          checkMoveTriggered = true;
        }
      }
    } catch (error) {
      console.warn("[Ultrabullet] Checkmove Chance hatası:", error);
    }
    let recaptureTriggered = false;
    try {
      const ownMoveNumber = this._getOwnMoveNumber(fen, playingAs);
      if (
        !followThroughAttack &&
        !lefongTriggered &&
        !checkMoveTriggered &&
        ownMoveNumber > ULTRABULLET_CHANCE_LOCK_MOVES
      ) {
        const recaptureSquare = this._getRecaptureSquare(playingAs);
        if (recaptureSquare && this.topMoves && this.topMoves.length > 0) {
          const topMove = this.topMoves[0];
          const isRecaptureMove = (tm) => tm.to === recaptureSquare;
          if (isRecaptureMove(topMove)) {
            recaptureTriggered = true;
            const ignoreChancePct =
              parseInt(
                getValueConfig(enumOptions.UltrabulletIgnoreRecapture),
              ) || 0;
            if (ignoreChancePct > 0 && Math.random() * 100 < ignoreChancePct) {
              const alternative = this.topMoves.find(
                (tm) => !isRecaptureMove(tm),
              );
              if (alternative) {
                this.topMoves = [
                  alternative,
                  ...this.topMoves.filter((tm) => tm !== alternative),
                ];
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn("[Ultrabullet] Ignore Recapture hatası:", error);
    }
    try {
      const ownMoveNumber = this._getOwnMoveNumber(fen, playingAs);
      if (
        !followThroughAttack &&
        !lefongTriggered &&
        !checkMoveTriggered &&
        !recaptureTriggered &&
        ownMoveNumber > ULTRABULLET_CHANCE_LOCK_MOVES
      ) {
        const ignoreCapturesPct =
          parseInt(getValueConfig(enumOptions.UltrabulletIgnoreCaptures)) || 0;
        if (
          ignoreCapturesPct > 0 &&
          this.topMoves &&
          this.topMoves.length > 0
        ) {
          const lastMove = this.BetterMintmaster.game.controller.getLastMove();
          if (lastMove && lastMove.to) {
            const isOpponentMove = !this.lastOpponentMoves.some(
              (tracked) =>
                tracked.from === lastMove.from && tracked.to === lastMove.to,
            );
            if (isOpponentMove) {
              const captureSquare = lastMove.to;
              const targetsCaptureSquare = (tm) => tm.to === captureSquare;
              const topMove = this.topMoves[0];
              if (
                targetsCaptureSquare(topMove) &&
                Math.random() * 100 < ignoreCapturesPct
              ) {
                const alternative = this.topMoves.find(
                  (tm) => !targetsCaptureSquare(tm),
                );
                if (alternative) {
                  this.topMoves = [
                    alternative,
                    ...this.topMoves.filter((tm) => tm !== alternative),
                  ];
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn("[Ultrabullet] Overlook Blunders hatası:", error);
    }
    let moveDelay;
    try {
      const noOpeningPref =
        (getValueConfig(enumOptions.UltrabulletOpeningPreference) || "none") ===
        "none";
      if (noOpeningPref) {
        if (this._lastOwnMoveWasBookFallback === true) {
          moveDelay = Math.floor(Math.random() * 201) + 100;
        } else {
          const ownMoveNumber = this._getOwnMoveNumber(fen, playingAs);
          if (
            ownMoveNumber <= 10 &&
            this.topMoves &&
            this.topMoves.length > 0
          ) {
            const opponentSquares = this._getOpponentSquares(fen, playingAs);
            const attacksOpponent = opponentSquares.has(this.topMoves[0].to);
            moveDelay = attacksOpponent
              ? Math.floor(Math.random() * 301) + 200
              : Math.floor(Math.random() * 201) + 100;
          }
        }
      }
    } catch (error) {
      console.warn("[Ultrabullet OpeningBook] Move Timing hatası:", error);
      moveDelay = undefined;
    }
    try {
      const flagModeEnabled = getValueConfig(
        enumOptions.UltrabulletFlagModeEnabled,
      );
      const clockSeconds = this.getMyClockSeconds();
      const clockAtZero =
        flagModeEnabled && clockSeconds !== null && clockSeconds === 0;
      if (clockAtZero && this.topMoves && this.topMoves.length > 0) {
        const opponentSquares = this._getOpponentSquares(fen, playingAs);
        const attacksOpponent = opponentSquares.has(this.topMoves[0].to);
        const [delayMin, delayMax] = attacksOpponent ? [100, 300] : [0, 200];
        moveDelay =
          Math.floor(Math.random() * (delayMax - delayMin + 1)) + delayMin;
      }
    } catch (error) {
      console.warn("[Ultrabullet FlagMode] Move Timing hatası:", error);
      moveDelay = undefined;
    }
    if (moveDelay === undefined) {
      const minDelay =
        parseInt(getValueConfig(enumOptions.UltrabulletMin)) || 0;
      const maxDelay =
        parseInt(getValueConfig(enumOptions.UltrabulletMax)) || 0;
      moveDelay =
        minDelay >= maxDelay
          ? minDelay
          : Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
    }
    if (immediate) {
      moveDelay = 0;
    }
    this.ultrabulletMoveTimer = setTimeout(() => {
      this.ultrabulletMoveTimer = null;
      if (lefongTriggered && lefongChoice) {
        try {
          const fen = this.BetterMintmaster.game.controller.getFEN();
          const legalMoves =
            this.BetterMintmaster.game.controller.getLegalMoves();
          const legalTrapMove =
            legalMoves &&
            legalMoves.find(
              (legal) =>
                legal.from === lefongChoice.move.from &&
                legal.to === lefongChoice.move.to,
            );
          let legalByChess = false;
          if (legalTrapMove && fen) {
            try {
              const chess = new Chess(fen);
              legalByChess = chess
                .moves({
                  verbose: true,
                })
                .some(
                  (vm) =>
                    vm.from === lefongChoice.move.from &&
                    vm.to === lefongChoice.move.to,
                );
            } catch (error) {
              legalByChess = false;
            }
          }
          if (legalByChess) {
            const pendingTrap = {
              attackerSquare: lefongChoice.move.to,
              targetSquare: lefongChoice.targetSquare,
              targetPiece: lefongChoice.targetType,
            };
            this._lefongTrapPending = pendingTrap;
            const moveData = Object.assign({}, legalTrapMove);
            moveData.userGenerated = true;
            this.BetterMintmaster.game.controller.move(moveData);
          } else {
            this.playBestMove();
          }
        } catch (error) {
          console.warn(
            "[Ultrabullet] Lefong Trap Trigger oynama hatası:",
            error,
          );
          this.playBestMove();
        }
      } else if (checkMoveTriggered) {
        const played = this.playCheckMove();
        if (!played) {
          this.playBestMove();
        }
      } else {
        this.playBestMove();
      }
    }, moveDelay);
  }
  // Schedules the auto-move with a humanized delay (Box-Muller noise around the
  // min/max midpoint, shaped by the center-weight setting; flag/simulate branches).
  scheduleAutoMove() {
    if (!getValueConfig(enumOptions.AutoMoveEnabled)) {
      return;
    }
    if (!this.topMoves || this.topMoves.length === 0) {
      return;
    }
    try {
      const fen = this.BetterMintmaster.game.controller.getFEN();
      if (!fen) {
        return;
      }
      const sideToMove = fen.split(" ")[1];
      const playingAs = this.BetterMintmaster.game.controller.getPlayingAs();
      const isMyTurn =
        (playingAs === 1 && sideToMove === "w") ||
        (playingAs === 2 && sideToMove === "b");
      if (!isMyTurn) {
        return;
      }
    } catch (error) {
      return;
    }
    if (this.autoMoveTimer !== null) {
      clearTimeout(this.autoMoveTimer);
      this.autoMoveTimer = null;
    }
    const TIMING_PROFILES = {
      bullet: {
        flagCriticalNormal: [0, 300],
        flagCriticalCapture: [500, 800],
        flagOnFlagNormal: [0, 500],
        flagOnFlagCapture: [500, 800],
        fastSimple: [0, 600],
        mateFirst: [3500, 5000],
        mateFirstFlag: [1500, 2500],
        mateCont: [0, 500],
        blunderReact: [3500, 5500],
      },
      blitz: {
        flagCriticalNormal: [0, 300],
        flagCriticalCapture: [500, 800],
        flagOnFlagNormal: [0, 500],
        flagOnFlagCapture: [500, 800],
        fastSimple: [0, 900],
        mateFirst: [5500, 10500],
        mateFirstFlag: [1500, 2500],
        mateCont: [0, 800],
        blunderReact: [3500, 8500],
      },
    };
    const profileName =
      getValueConfig(enumOptions.SmartTimingProfile) || "bullet";
    const profile = TIMING_PROFILES[profileName] || TIMING_PROFILES.bullet;
    const blunderReactEnabled = getValueConfig(enumOptions.BlunderReactEnabled);
    if (blunderReactEnabled && getValueConfig(enumOptions.AutoMoveEnabled)) {
      const flagModeEnabled = getValueConfig(enumOptions.FlagModeEnabled);
      const clockSeconds = this.getMyClockSeconds();
      const flagCritical =
        flagModeEnabled && clockSeconds !== null && clockSeconds <= 10;
      const currentCp =
        this.lastStockfishCp !== null
          ? this.lastStockfishCp
          : this.topMoves[0]?.cp;
      if (
        currentCp !== undefined &&
        currentCp !== null &&
        Math.abs(currentCp) >= 1100
      ) {
        this.blunderReactEvalDisabled = true;
      }
      if (!flagCritical && !this.blunderReactEvalDisabled) {
        const lastScore = this.opponentLastMoveScore;
        if (lastScore === "Blunder") {
          const minDelay = profile.blunderReact[0];
          const maxDelay = profile.blunderReact[1];
          const blunderDelay =
            Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
          this.autoMoveTimer = setTimeout(() => {
            this.autoMoveTimer = null;
            this.playBestMove();
          }, blunderDelay);
          return;
        }
      } else {
      }
    }
    const simulateMateEnabled = getValueConfig(enumOptions.SimulateCheckmates);
    if (simulateMateEnabled && getValueConfig(enumOptions.AutoMoveEnabled)) {
      const topMove = this.topMoves[0];
      const mateIn = topMove?.mate;
      const flagModeEnabled = getValueConfig(enumOptions.FlagModeEnabled);
      const clockSeconds = this.getMyClockSeconds();
      const flagCritical =
        flagModeEnabled && clockSeconds !== null && clockSeconds <= 10;
      if (mateIn !== null && mateIn >= 2 && mateIn <= 3) {
        let mateDelay;
        if (!this.simulateMateActive) {
          this.simulateMateActive = true;
          const minDelay = flagCritical
            ? profile.mateFirstFlag[0]
            : profile.mateFirst[0];
          const maxDelay = flagCritical
            ? profile.mateFirstFlag[1]
            : profile.mateFirst[1];
          mateDelay =
            Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
        } else if (mateIn < 2 || mateIn > 3) {
          this.simulateMateActive = false;
        } else {
          mateDelay = Math.floor(Math.random() * (profile.mateCont[1] + 1));
        }
        this.autoMoveTimer = setTimeout(() => {
          this.autoMoveTimer = null;
          this.playBestMove();
        }, mateDelay);
        return;
      } else if (mateIn === null || mateIn <= 0) {
        if (this.simulateMateActive) {
          if (mateIn !== null) {
            this.simulateMateActive = false;
          } else {
            const pauseDelay = Math.floor(Math.random() * 501);
            this.autoMoveTimer = setTimeout(() => {
              this.autoMoveTimer = null;
              this.playBestMove();
            }, pauseDelay);
            return;
          }
        }
      }
    }
    const fastSimpleEnabled = getValueConfig(enumOptions.FastSimpleMoves);
    if (fastSimpleEnabled && this.topMoves && this.topMoves.length > 0) {
      const bestMoveUci = this.topMoves[0].move || "";
      const isCastling = ["e1g1", "e1c1", "e8g8", "e8c8"].includes(bestMoveUci);
      const isPromotion = bestMoveUci.length === 5;
      if (isCastling || isPromotion) {
        const fastDelay =
          Math.floor(
            Math.random() * (profile.fastSimple[1] - profile.fastSimple[0] + 1),
          ) + profile.fastSimple[0];
        this.autoMoveTimer = setTimeout(() => {
          this.autoMoveTimer = null;
          this.playBestMove();
        }, fastDelay);
        return;
      }
    }
    const flagModeEnabled = getValueConfig(enumOptions.FlagModeEnabled);
    let autoMoveDelay;
    const clockSeconds = this.getMyClockSeconds();
    if (flagModeEnabled && clockSeconds !== null && clockSeconds <= 5) {
      const flagProfile = {
        depth: 3,
        personality: "Beginner",
        delayMin: profile.flagCriticalNormal[0],
        delayMax: profile.flagCriticalNormal[1],
      };
      this.applyFlagProfile(flagProfile);
      autoMoveDelay =
        Math.floor(
          Math.random() *
            (profile.flagCriticalNormal[1] - profile.flagCriticalNormal[0] + 1),
        ) + profile.flagCriticalNormal[0];
      try {
        const fen = this.BetterMintmaster.game.controller.getFEN();
        if (fen && this.topMoves && this.topMoves.length > 0) {
          const playingAs =
            this.BetterMintmaster.game.controller.getPlayingAs();
          const boardPart = fen.split(" ")[0];
          const rows = boardPart.split("/");
          const opponentSquares = new Set();
          for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
            let col = 0;
            for (const ch of rows[rankIdx]) {
              if (ch >= "1" && ch <= "8") {
                col += parseInt(ch);
              } else {
                const isOpponentPiece =
                  playingAs === 1
                    ? ch === ch.toLowerCase()
                    : ch === ch.toUpperCase();
                if (isOpponentPiece) {
                  const fileChar = String.fromCharCode("a".charCodeAt(0) + col);
                  const rankStr = String(8 - rankIdx);
                  opponentSquares.add(fileChar + rankStr);
                }
                col++;
              }
            }
          }
          const targetsOpponent = (tm) => opponentSquares.has(tm.to);
          const topMove = this.topMoves[0];
          if (targetsOpponent(topMove) && Math.random() < 0.5) {
            const alternative = this.topMoves.find(
              (tm) => !targetsOpponent(tm),
            );
            if (alternative) {
              const originalOrder = this.topMoves;
              this.topMoves = [
                alternative,
                ...originalOrder.filter((tm) => tm !== alternative),
              ];
              const restoreTimer = setTimeout(() => {
                this.topMoves = originalOrder;
              }, 1000);
            } else {
            }
          }
        }
      } catch (error) {
        console.warn("[FlagMode] Capture sınırı hatası:", error);
      }
      try {
        if (this.topMoves && this.topMoves.length > 0) {
          const fen = this.BetterMintmaster.game.controller.getFEN();
          if (fen) {
            const playingAs =
              this.BetterMintmaster.game.controller.getPlayingAs();
            const boardPart = fen.split(" ")[0];
            const rows = boardPart.split("/");
            const opponentSquares = new Set();
            for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
              let col = 0;
              for (const ch of rows[rankIdx]) {
                if (ch >= "1" && ch <= "8") {
                  col += parseInt(ch);
                } else {
                  const isOpponentPiece =
                    playingAs === 1
                      ? ch === ch.toLowerCase()
                      : ch === ch.toUpperCase();
                  if (isOpponentPiece) {
                    const fileChar = String.fromCharCode(
                      "a".charCodeAt(0) + col,
                    );
                    const rankStr = String(8 - rankIdx);
                    opponentSquares.add(fileChar + rankStr);
                  }
                  col++;
                }
              }
            }
            if (opponentSquares.has(this.topMoves[0].to)) {
              autoMoveDelay =
                Math.floor(
                  Math.random() *
                    (profile.flagCriticalCapture[1] -
                      profile.flagCriticalCapture[0] +
                      1),
                ) + profile.flagCriticalCapture[0];
            }
          }
        }
      } catch (error) {
        console.warn("[FlagMode] Capture delay hatası (5s):", error);
      }
    } else if (flagModeEnabled && clockSeconds !== null && clockSeconds <= 10) {
      const flagProfile = {
        depth: 3,
        personality: "Human",
        delayMin: profile.flagOnFlagNormal[0],
        delayMax: profile.flagOnFlagNormal[1],
      };
      this.applyFlagProfile(flagProfile);
      let isCapture = false;
      try {
        const fen = this.BetterMintmaster.game.controller.getFEN();
        if (fen && this.topMoves && this.topMoves.length > 0) {
          const playingAs =
            this.BetterMintmaster.game.controller.getPlayingAs();
          const boardPart = fen.split(" ")[0];
          const rows = boardPart.split("/");
          const opponentSquares = new Set();
          for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
            let col = 0;
            for (const ch of rows[rankIdx]) {
              if (ch >= "1" && ch <= "8") {
                col += parseInt(ch);
              } else {
                const isOpponentPiece =
                  playingAs === 1
                    ? ch === ch.toLowerCase()
                    : ch === ch.toUpperCase();
                if (isOpponentPiece) {
                  const fileChar = String.fromCharCode("a".charCodeAt(0) + col);
                  const rankStr = String(8 - rankIdx);
                  opponentSquares.add(fileChar + rankStr);
                }
                col++;
              }
            }
          }
          isCapture = opponentSquares.has(this.topMoves[0].to);
        }
      } catch (error) {
        console.warn("[FlagMode] Capture kontrol hatası (10s):", error);
      }
      if (isCapture) {
        autoMoveDelay =
          Math.floor(
            Math.random() *
              (profile.flagOnFlagCapture[1] - profile.flagOnFlagCapture[0] + 1),
          ) + profile.flagOnFlagCapture[0];
      } else {
        autoMoveDelay =
          Math.floor(
            Math.random() *
              (profile.flagOnFlagNormal[1] - profile.flagOnFlagNormal[0] + 1),
          ) + profile.flagOnFlagNormal[0];
      }
    } else if (fastSimpleEnabled && this.isInTheory) {
      this.restoreNormalProfile();
      autoMoveDelay =
        Math.floor(
          Math.random() * (profile.fastSimple[1] - profile.fastSimple[0] + 1),
        ) + profile.fastSimple[0];
    } else {
      this.restoreNormalProfile();
      const minDelay = parseInt(getValueConfig(enumOptions.AutoMoveMin)) || 0;
      const maxDelay = parseInt(getValueConfig(enumOptions.AutoMoveMax)) || 0;
      if (minDelay >= maxDelay) {
        autoMoveDelay = minDelay;
      } else {
        const centerWeight =
          parseInt(getValueConfig(enumOptions.AutoMoveCenterWeight)) || 1;
        if (centerWeight <= 1) {
          autoMoveDelay =
            Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
        } else {
          const mean = (minDelay + maxDelay) / 2;
          const sigma = (maxDelay - minDelay) / (2 + centerWeight * 1.2);
          let u;
          let v;
          let s;
          do {
            u = Math.random() * 2 - 1;
            v = Math.random() * 2 - 1;
            s = u * u + v * v;
          } while (s >= 1 || s === 0);
          autoMoveDelay = Math.round(
            mean + u * Math.sqrt((Math.log(s) * -2) / s) * sigma,
          );
          autoMoveDelay = Math.max(minDelay, Math.min(maxDelay, autoMoveDelay));
        }
      }
    }
    this.autoMoveTimer = setTimeout(() => {
      this.autoMoveTimer = null;
      this.playBestMove();
    }, autoMoveDelay);
  }
  // Converts an algebraic square to pixel coordinates on the chess.com board.
  squareToPixel(square, boardEl) {
    const fileIdx = square.charCodeAt(0) - 97;
    const rankIdx = parseInt(square[1]) - 1;
    const rect = boardEl.getBoundingClientRect();
    const squareSize = rect.width / 8;
    const flipped = boardEl.classList.contains("flipped");
    const visualFile = flipped ? 7 - fileIdx : fileIdx;
    const visualRank = flipped ? rankIdx : 7 - rankIdx;
    const pixel = {
      x: rect.left + visualFile * squareSize + squareSize / 2,
      y: rect.top + visualRank * squareSize + squareSize / 2,
    };
    return pixel;
  }
  // Dispatches a synthetic pointer event at page coordinates (move input fallback).
  firePointer(target, type, clientX, clientY) {
    const eventInit = {
      bubbles: true,
      cancelable: true,
      clientX: clientX,
      clientY: clientY,
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,
    };
    target.dispatchEvent(new PointerEvent(type, eventInit));
  }
  // Plays a move by simulating mouse press/move/release on the board squares.
  playMoveByClick(from, to, promotion) {
    if (promotion) {
      return false;
    }
    const boardEl = document.querySelector("wc-chess-board");
    if (!boardEl) {
      console.error(
        "[Asina][playMoveByClick] wc-chess-board elementi bulunamadı!",
      );
      return false;
    }
    const fromPixel = this.squareToPixel(from, boardEl);
    const toPixel = this.squareToPixel(to, boardEl);
    const clickDelay = Math.floor(Math.random() * 31) + 10;
    this.firePointer(boardEl, "pointerdown", fromPixel.x, fromPixel.y);
    this.firePointer(boardEl, "pointerup", fromPixel.x, fromPixel.y);
    return new Promise((resolve) => {
      setTimeout(() => {
        this.firePointer(boardEl, "pointerdown", toPixel.x, toPixel.y);
        this.firePointer(boardEl, "pointerup", toPixel.x, toPixel.y);
        resolve(true);
      }, clickDelay);
    });
  }
  // Plays the engine's best move: picks the input method (site API or synthetic
  // click), applies promotion, and records the move for premove/flag logic.
  playBestMove() {
    try {
      try {
        if (!this.openingMovePlayed) {
          const fen = this.BetterMintmaster.game.controller.getFEN();
          if (fen) {
            const fenParts = fen.split(" ");
            const sideToMove = fenParts[1];
            const fullmoveNumber = parseInt(fenParts[5], 10);
            const playingAs =
              this.BetterMintmaster.game.controller.getPlayingAs();
            if (sideToMove === "w" && fullmoveNumber === 1 && playingAs === 1) {
              const whitePref1 =
                getValueConfig("option-opening-white-1") || "none";
              const whitePref2 =
                getValueConfig("option-opening-white-2") || "none";
              let chosenOpening = null;
              if (whitePref1 !== "none" && OPENING_BOOK.white[whitePref1]) {
                chosenOpening = whitePref1;
              } else if (
                whitePref2 !== "none" &&
                OPENING_BOOK.white[whitePref2]
              ) {
                chosenOpening = whitePref2;
              }
              if (chosenOpening) {
                const openingEntry = OPENING_BOOK.white[chosenOpening];
                const moveData = {
                  from: openingEntry.from,
                  to: openingEntry.to,
                };
                this._playMoveApi(moveData);
                this.openingMovePlayed = true;
                return;
              } else {
              }
            } else if (
              sideToMove === "b" &&
              fullmoveNumber === 1 &&
              playingAs === 2
            ) {
              let firstOpponentMove = null;
              try {
                const fullLine = this.BetterMintmaster.game.controller
                  .getCurrentFullLine
                  ? this.BetterMintmaster.game.controller.getCurrentFullLine()
                  : null;
                if (
                  fullLine &&
                  fullLine.length > 0 &&
                  fullLine[0] &&
                  fullLine[0].from &&
                  fullLine[0].to
                ) {
                  firstOpponentMove = fullLine[0].from + fullLine[0].to;
                } else {
                  console.log(
                    "[OpeningPref] getCurrentFullLine() boş veya null, conditional kontrol atlanıyor",
                  );
                }
              } catch (error) {
                console.error(
                  "[OpeningPref] HATA: getCurrentFullLine erişilemedi →",
                  error,
                );
              }
              const blackPref1 =
                getValueConfig("option-opening-black-1") || "none";
              const blackPref2 =
                getValueConfig("option-opening-black-2") || "none";
              const resolveOpening = (openingName) => {
                if (
                  openingName === "none" ||
                  !OPENING_BOOK.black[openingName]
                ) {
                  return null;
                }
                const openingEntry = OPENING_BOOK.black[openingName];
                if (openingEntry.type === "unconditional") {
                  return openingEntry;
                }
                if (openingEntry.type === "conditional") {
                  if (!firstOpponentMove) {
                    return null;
                  }
                  const triggerMatches =
                    firstOpponentMove === openingEntry.trigger;
                  if (triggerMatches) {
                    return openingEntry;
                  } else {
                    return null;
                  }
                }
                return null;
              };
              let chosenOpening = resolveOpening(blackPref1);
              if (!chosenOpening && blackPref2 !== "none") {
                chosenOpening = resolveOpening(blackPref2);
              }
              if (chosenOpening) {
                const moveData = {
                  from: chosenOpening.from,
                  to: chosenOpening.to,
                };
                this._playMoveApi(moveData);
                this.openingMovePlayed = true;
                return;
              } else {
              }
            }
          }
        }
      } catch (error) {
        console.error("[OpeningPref] HATA: intercept başarısız →", error);
      }
      if (!this.topMoves || this.topMoves.length === 0) {
        return;
      }
      const topMove = this.topMoves[0];
      if (!topMove || !topMove.from || !topMove.to) {
        return;
      }
      const fen = this.BetterMintmaster.game.controller.getFEN();
      if (!fen) {
        return;
      }
      const sideToMove = fen.split(" ")[1];
      const playingAs = this.BetterMintmaster.game.controller.getPlayingAs();
      const isMyTurn =
        (playingAs === 1 && sideToMove === "w") ||
        (playingAs === 2 && sideToMove === "b");
      if (!isMyTurn) {
        return;
      }
      const moveMethod = getValueConfig(enumOptions.MoveMethod);
      if (moveMethod === "clicksim") {
        if (topMove.promotion) {
          this._playMoveApi(topMove);
        } else {
          this.playMoveByClick(
            topMove.from,
            topMove.to,
            topMove.promotion,
          ).catch(() => this._playMoveApi(topMove));
        }
      } else {
        this._playMoveApi(topMove);
      }
    } catch (error) {
      console.error("[Asina] playBestMove error:", error);
    }
  }
  // Plays a move through chess.com's own page API (the safe, non-synthetic path).
  _playMoveApi(moveData) {
    try {
      const legalMoves = this.BetterMintmaster.game.controller.getLegalMoves();
      if (!legalMoves || legalMoves.length === 0) {
        return;
      }
      const legalMove = legalMoves.find(
        (legal) => legal.from === moveData.from && legal.to === moveData.to,
      );
      if (!legalMove) {
        console.warn(
          "[Asina][_playMoveApi] moveData bulunamadı: " +
            moveData.from +
            "→" +
            moveData.to,
        );
        return;
      }
      legalMove.userGenerated = true;
      if (moveData.promotion) {
        legalMove.promotion = moveData.promotion;
      }
      this.BetterMintmaster.game.controller.move(legalMove);
    } catch (error) {
      console.error("[Asina] _playMoveApi error:", error);
    }
  }
  // Tests whether the piece at a square attacks the enemy king (check-move play).
  _doesPieceGiveCheck(fen, square, playingAs) {
    try {
      const boardPart = fen.split(" ")[0];
      const board = [];
      for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
        board.push(new Array(8).fill(null));
      }
      let curRank = 7;
      let curCol = 0;
      for (const ch of boardPart) {
        if (ch === "/") {
          curRank--;
          curCol = 0;
        } else if (ch >= "1" && ch <= "8") {
          curCol += parseInt(ch);
        } else {
          board[curRank][curCol] = ch;
          curCol++;
        }
      }
      const fileIdx = square.charCodeAt(0) - "a".charCodeAt(0);
      const rankIdx = parseInt(square[1]) - 1;
      const pieceChar = board[rankIdx][fileIdx];
      if (!pieceChar) {
        return false;
      }
      const enemyKingChar = playingAs === 1 ? "k" : "K";
      let kingFile = -1;
      let kingRank = -1;
      kingSearch: for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (board[r][c] === enemyKingChar) {
            kingRank = r;
            kingFile = c;
            break kingSearch;
          }
        }
      }
      if (kingFile === -1) {
        return false;
      }
      const pathIsClear = (fromFile, fromRank, toFile, toRank) => {
        const fileStep = toFile === fromFile ? 0 : toFile > fromFile ? 1 : -1;
        const rankStep = toRank === fromRank ? 0 : toRank > fromRank ? 1 : -1;
        let curFile = fromFile + fileStep;
        let curRank = fromRank + rankStep;
        while (curFile !== toFile || curRank !== toRank) {
          if (board[curRank][curFile] !== null) {
            return false;
          }
          curFile += fileStep;
          curRank += rankStep;
        }
        return true;
      };
      const pieceType = pieceChar.toLowerCase();
      const fileDist = Math.abs(fileIdx - kingFile);
      const rankDist = Math.abs(rankIdx - kingRank);
      if (pieceType === "n") {
        return (
          (fileDist === 1 && rankDist === 2) ||
          (fileDist === 2 && rankDist === 1)
        );
      }
      if (pieceType === "b") {
        return (
          fileDist === rankDist &&
          fileDist !== 0 &&
          pathIsClear(fileIdx, rankIdx, kingFile, kingRank)
        );
      }
      if (pieceType === "r") {
        return (
          (fileDist === 0 || rankDist === 0) &&
          fileDist + rankDist !== 0 &&
          pathIsClear(fileIdx, rankIdx, kingFile, kingRank)
        );
      }
      if (pieceType === "q") {
        const diagonal = fileDist === rankDist && fileDist !== 0;
        const straight =
          (fileDist === 0 || rankDist === 0) && fileDist + rankDist !== 0;
        return (
          (diagonal || straight) &&
          pathIsClear(fileIdx, rankIdx, kingFile, kingRank)
        );
      }
      if (pieceType === "p") {
        if (playingAs === 1) {
          return rankDist === 1 && fileDist === 1 && kingRank > rankIdx;
        } else {
          return rankDist === 1 && fileDist === 1 && kingRank < rankIdx;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }
  // Plays the pending Lefong-trap move: offers bait, punishes greedy captures
  // (planned by _getValuablePieceSquares + LICHESS/ULTRABULLET trap data).
  playLefongTrap() {
    try {
      const fen = this.BetterMintmaster.game.controller.getFEN();
      if (!fen) {
        return false;
      }
      const sideToMove = fen.split(" ")[1];
      const playingAs = this.BetterMintmaster.game.controller.getPlayingAs();
      const isMyTurn =
        (playingAs === 1 && sideToMove === "w") ||
        (playingAs === 2 && sideToMove === "b");
      if (!isMyTurn) {
        return false;
      }
      if (this._lefongTrapPending) {
        const pendingTrap = this._lefongTrapPending;
        const attackerPiece = this._getPieceAt(fen, pendingTrap.attackerSquare);
        const attackerIsMine =
          !!attackerPiece &&
          (playingAs === 1
            ? attackerPiece === attackerPiece.toUpperCase()
            : attackerPiece === attackerPiece.toLowerCase());
        const pieceAtTarget = this._getPieceAt(fen, pendingTrap.targetSquare);
        const targetStillThere =
          !!pieceAtTarget &&
          pieceAtTarget.toLowerCase() === pendingTrap.targetPiece;
        let trapMove = null;
        if (attackerIsMine && targetStillThere) {
          const legalMoves =
            this.BetterMintmaster.game.controller.getLegalMoves();
          const legalTrapMove =
            legalMoves &&
            legalMoves.find(
              (legal) =>
                legal.from === pendingTrap.attackerSquare &&
                legal.to === pendingTrap.targetSquare,
            );
          if (legalTrapMove) {
            try {
              const chess = new Chess(fen);
              const legalByChess = chess
                .moves({
                  verbose: true,
                })
                .some(
                  (vm) =>
                    vm.from === pendingTrap.attackerSquare &&
                    vm.to === pendingTrap.targetSquare,
                );
              if (legalByChess) {
                trapMove = legalTrapMove;
              }
            } catch (error) {}
          }
        }
        this._lefongTrapPending = null;
        if (trapMove) {
          const moveData = Object.assign({}, trapMove);
          moveData.userGenerated = true;
          this.BetterMintmaster.game.controller.move(moveData);
          return true;
        }
      }
      const legalMoves = this.BetterMintmaster.game.controller.getLegalMoves();
      if (!legalMoves || legalMoves.length === 0) {
        return false;
      }
      let legalUciSet = null;
      try {
        const chess = new Chess(fen);
        legalUciSet = new Set(
          chess
            .moves({
              verbose: true,
            })
            .map((vm) => vm.from + vm.to),
        );
      } catch (error) {
        legalUciSet = null;
      }
      if (!legalUciSet) {
        return false;
      }
      const boardPart = fen.split(" ")[0];
      const board = [];
      for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
        board.push(new Array(8).fill(null));
      }
      let curRank = 7;
      let curCol = 0;
      for (const ch of boardPart) {
        if (ch === "/") {
          curRank--;
          curCol = 0;
        } else if (ch >= "1" && ch <= "8") {
          curCol += parseInt(ch);
        } else {
          board[curRank][curCol] = ch;
          curCol++;
        }
      }
      const enemyKingChar = sideToMove === "w" ? "k" : "K";
      let kingFile = -1;
      let kingRank = -1;
      kingSearch: for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (board[r][c] === enemyKingChar) {
            kingRank = r;
            kingFile = c;
            break kingSearch;
          }
        }
      }
      const valuableSquares = this._getValuablePieceSquares(fen, playingAs);
      const trapsByType = {
        q: [],
        r: [],
        b: [],
        n: [],
      };
      for (const legal of legalMoves) {
        if (!legalUciSet.has(legal.from + legal.to)) {
          continue;
        }
        const fromFile = legal.from.charCodeAt(0) - 97;
        const fromRank = parseInt(legal.from[1]) - 1;
        const attackerPiece = board[fromRank]
          ? board[fromRank][fromFile]
          : null;
        if (!attackerPiece) {
          continue;
        }
        const attackerType = attackerPiece.toLowerCase();
        if (!LEFONG_TRAP_ATTACKER_TYPES.includes(attackerType)) {
          continue;
        }
        const toFile = legal.to.charCodeAt(0) - 97;
        const toRank = parseInt(legal.to[1]) - 1;
        if (
          kingFile !== -1 &&
          this._squareIsAttackedBy(
            attackerPiece,
            toFile,
            toRank,
            kingFile,
            kingRank,
            board,
          )
        ) {
          continue;
        }
        for (const [targetSquare, targetType] of valuableSquares) {
          if (targetSquare === legal.to) {
            continue;
          }
          if (LEFONG_TRAP_VALUE[targetType] < LEFONG_TRAP_VALUE[attackerType]) {
            continue;
          }
          const targetFile = targetSquare.charCodeAt(0) - 97;
          const targetRank = parseInt(targetSquare[1]) - 1;
          if (
            this._squareIsAttackedBy(
              attackerPiece,
              toFile,
              toRank,
              targetFile,
              targetRank,
              board,
            )
          ) {
            trapsByType[targetType].push({
              move: legal,
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
        (totalWeight, type) => totalWeight + LEFONG_TRAP_PIECE_WEIGHTS[type],
        0,
      );
      let roll = Math.random() * totalWeight;
      let chosenType = availableTypes[availableTypes.length - 1];
      for (const type of availableTypes) {
        if (roll < LEFONG_TRAP_PIECE_WEIGHTS[type]) {
          chosenType = type;
          break;
        }
        roll -= LEFONG_TRAP_PIECE_WEIGHTS[type];
      }
      const typeTraps = trapsByType[chosenType];
      const chosenTrap =
        typeTraps[Math.floor(Math.random() * typeTraps.length)];
      const moveData = Object.assign({}, chosenTrap.move);
      moveData.userGenerated = true;
      const pendingTrap = {
        attackerSquare: chosenTrap.move.to,
        targetSquare: chosenTrap.targetSquare,
        targetPiece: chosenTrap.targetType,
      };
      this._lefongTrapPending = pendingTrap;
      this.BetterMintmaster.game.controller.move(moveData);
      return true;
    } catch (error) {
      console.error("[Asina] playLefongTrap error:", error);
      return false;
    }
  }
  // Plays the best move that gives check (keyboard shortcut action).
  playCheckMove() {
    try {
      if (!getValueConfig(enumOptions.CheckMoveEnabled)) {
        return false;
      }
      const fen = this.BetterMintmaster.game.controller.getFEN();
      if (!fen) {
        return false;
      }
      const sideToMove = fen.split(" ")[1];
      const playingAs = this.BetterMintmaster.game.controller.getPlayingAs();
      const isMyTurn =
        (playingAs === 1 && sideToMove === "w") ||
        (playingAs === 2 && sideToMove === "b");
      if (!isMyTurn) {
        return false;
      }
      const boardPart = fen.split(" ")[0];
      const board = [];
      for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
        board.push(new Array(8).fill(null));
      }
      let curRank = 7;
      let curCol = 0;
      for (let ch of boardPart) {
        if (ch === "/") {
          curRank--;
          curCol = 0;
        } else if (ch >= "1" && ch <= "8") {
          curCol += parseInt(ch);
        } else {
          board[curRank][curCol] = ch;
          curCol++;
        }
      }
      const enemyKingChar = sideToMove === "w" ? "k" : "K";
      let kingFile = -1;
      let kingRank = -1;
      kingSearch: for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (board[r][c] === enemyKingChar) {
            kingRank = r;
            kingFile = c;
            break kingSearch;
          }
        }
      }
      if (kingFile === -1) {
        return false;
      }
      const pathIsClear = (fromFile, fromRank, toFile, toRank) => {
        const fileStep = toFile === fromFile ? 0 : toFile > fromFile ? 1 : -1;
        const rankStep = toRank === fromRank ? 0 : toRank > fromRank ? 1 : -1;
        let curFile = fromFile + fileStep;
        let curRank = fromRank + rankStep;
        while (curFile !== toFile || curRank !== toRank) {
          if (board[curRank][curFile] !== null) {
            return false;
          }
          curFile += fileStep;
          curRank += rankStep;
        }
        return true;
      };
      const legalMoves = this.BetterMintmaster.game.controller.getLegalMoves();
      if (!legalMoves || legalMoves.length === 0) {
        return false;
      }
      let checkingMoves = legalMoves.filter((legal) => {
        const toFile = legal.to.charCodeAt(0) - 97;
        const toRank = parseInt(legal.to[1]) - 1;
        const fileDist = Math.abs(toFile - kingFile);
        const rankDist = Math.abs(toRank - kingRank);
        const fromFile = legal.from.charCodeAt(0) - 97;
        const fromRank = parseInt(legal.from[1]) - 1;
        const pieceChar = board[fromRank][fromFile];
        if (!pieceChar) {
          return false;
        }
        const pieceType = pieceChar.toLowerCase();
        let givesCheck = false;
        if (pieceType === "n") {
          givesCheck =
            (fileDist === 1 && rankDist === 2) ||
            (fileDist === 2 && rankDist === 1);
        } else if (pieceType === "b") {
          givesCheck =
            fileDist === rankDist &&
            fileDist !== 0 &&
            pathIsClear(toFile, toRank, kingFile, kingRank);
        } else if (pieceType === "r") {
          givesCheck =
            (fileDist === 0 || rankDist === 0) &&
            fileDist + rankDist !== 0 &&
            pathIsClear(toFile, toRank, kingFile, kingRank);
        } else if (pieceType === "q") {
          const diagonal = fileDist === rankDist && fileDist !== 0;
          const straight =
            (fileDist === 0 || rankDist === 0) && fileDist + rankDist !== 0;
          givesCheck =
            (diagonal || straight) &&
            pathIsClear(toFile, toRank, kingFile, kingRank);
        } else if (pieceType === "p") {
          givesCheck =
            sideToMove === "w"
              ? rankDist === 1 && fileDist === 1 && toRank > fromRank
              : rankDist === 1 && fileDist === 1 && toRank < fromRank;
        }
        if (givesCheck) {
          legal._checkPiece = pieceType;
        }
        return givesCheck;
      });
      if (checkingMoves.length === 0) {
        return false;
      }
      if (getValueConfig(enumOptions.UltrabulletGuardQueen)) {
        checkingMoves = checkingMoves.filter((m) => m._checkPiece !== "q");
        if (checkingMoves.length === 0) {
          return false;
        }
      }
      const CHECK_PIECE_ORDER = {
        p: 1,
        n: 2,
        b: 3,
        r: 4,
        q: 5,
      };
      checkingMoves.sort(
        (a, b) =>
          CHECK_PIECE_ORDER[a._checkPiece] - CHECK_PIECE_ORDER[b._checkPiece],
      );
      const chosenMove = checkingMoves[0];
      chosenMove.userGenerated = true;
      this.BetterMintmaster.game.controller.move(chosenMove);
      return true;
    } catch (error) {
      console.error("[Asina] playCheckMove error:", error);
      return false;
    }
  }
  // Sorts the collected engine lines by eval (mate first, then cp) for ranking.
  SortTopMoves() {
    this.topMoves.sort(function (a, b) {
      if (a.mate !== null && b.mate === null) {
        if (a.mate < 0) {
          return 1;
        } else {
          return -1;
        }
      }
      if (a.mate === null && b.mate !== null) {
        if (b.mate > 0) {
          return 1;
        } else {
          return -1;
        }
      }
      if (a.mate === null && b.mate === null) {
        if (a.depth === b.depth) {
          if (a.cp === b.cp) {
            return 0;
          }
          if (a.cp > b.cp) {
            return -1;
          } else {
            return 1;
          }
        }
        if (a.depth > b.depth) {
          return -1;
        } else {
          return 1;
        }
      }
      if (a.mate < 0 && b.mate < 0) {
        if (a.line.length === b.line.length) {
          return 0;
        }
        if (a.line.length < b.line.length) {
          return 1;
        } else {
          return -1;
        }
      }
      if (a.mate > 0 && b.mate > 0) {
        if (a.line.length === b.line.length) {
          return 0;
        }
        if (a.line.length > b.line.length) {
          return 1;
        } else {
          return -1;
        }
      }
      if (a.mate < b.mate) {
        return 1;
      } else {
        return -1;
      }
    });
  }
}
