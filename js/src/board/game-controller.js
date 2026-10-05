// ─── board/game-controller.js · wraps the chess.com board element ───
// Owns the eval/depth bars, arrow markings, coach triggering and pre-analyze.
import { enumOptions, getValueConfig, BetterMintmaster } from "../core.js";
export class GameController {
  // Wires into the chess.com board controller (`chessboard.game`) and subscribes
  // to its lifecycle events — Move, ModeChanged, RendererSet, Load and
  // UpdateOptions — so the engine, coach and eval/depth bars stay in sync with
  // whatever happens on the board.
  constructor(master, chessboard) {
    this.BetterMintmaster = master;
    this.chessboard = chessboard;
    this.controller = chessboard.game;
    this.options = this.controller.getOptions();
    this.depthBar = null;
    this.evalBar = null;
    this.evalBarFill = null;
    this.evalScore = null;
    this.evalScoreAbbreviated = null;
    this.currentMarkings = [];
    let self = this;
    // Coach pipeline: builds a UCI "position" command for the line currently
    // shown on the board (or the bare current FEN when no line is active) and
    // hands it to the coach engine. Once the async analysis resolves, a
    // stale-FEN guard discards the result if the position changed in the
    // meantime; otherwise the result fans out to move feedback, accuracy,
    // voice and recap widgets according to the enabled options.
    const triggerCoachAnalysis = () => {
      if (!master.coach) {
        return;
      }
      if (!getValueConfig(enumOptions.CoachEnabled)) {
        return;
      }
      const fullLine = this.controller.getCurrentFullLine
        ? this.controller.getCurrentFullLine()
        : null;
      let positionCmd = "";
      if (fullLine && fullLine.length > 0) {
        const startFen =
          fullLine[0].beforeFen ||
          "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
        const movesUci = fullLine
          .map((step) => step.from + step.to + (step.promotion || ""))
          .join(" ");
        positionCmd =
          "position fen " + startFen + (movesUci ? " moves " + movesUci : "");
      } else {
        positionCmd = "position fen " + this.controller.getFEN();
      }
      const currentFen = this.controller.getFEN();
      master._lastCoachFen = currentFen;
      master.coach
        .getAnalysis(positionCmd)
        .then((analysis) => {
          if (!analysis) {
            return;
          }
          if (master._lastCoachFen !== currentFen) {
            return;
          }
          master.lastCoachResult = analysis;
          if (
            getValueConfig(enumOptions.CoachMoveFeedback) &&
            !getValueConfig(enumOptions.PreAnalyzeEnabled)
          ) {
            master.placeMoveFeedbackSVG(analysis);
          }
          if (getValueConfig(enumOptions.CoachAccuracy)) {
            master.updateAccuracyWidget(analysis);
          } else if (master.resetAccuracyWidget) {
            master.resetAccuracyWidget();
          }
          if (getValueConfig(enumOptions.CoachVoiceEnabled)) {
            master.playCoachAudio(analysis.audioUrlHash);
          }
          if (analysis.tallies && getValueConfig(enumOptions.CoachRecap)) {
            master.updateTalliesWidget(analysis.tallies);
          }
        })
        .catch((error) => console.error("[CoachEngine] hata:", error));
    };
    // Builds the UCI `position fen … moves …` string for a candidate move:
    // replays the current analysis line first, then appends the candidate —
    // i.e. "what does the engine think about this move played from here?".
    this.buildUciPositionWithCandidate = (candidateUci) => {
      const fullLine = this.controller.getCurrentFullLine
        ? this.controller.getCurrentFullLine()
        : null;
      if (fullLine && fullLine.length > 0) {
        const startFen =
          fullLine[0].beforeFen ||
          "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
        const movesUci = fullLine
          .map((step) => step.from + step.to + (step.promotion || ""))
          .join(" ");
        const allMoves = movesUci
          ? movesUci + " " + candidateUci
          : candidateUci;
        return "position fen " + startFen + " moves " + allMoves;
      } else {
        return (
          "position fen " + this.controller.getFEN() + " moves " + candidateUci
        );
      }
    };
    // Re-analysis hook for the move-list navigation buttons: the board updates
    // asynchronously after a click, so the engine and coach re-run after an
    // 80ms delay. A MutationObserver re-attaches the handlers whenever
    // chess.com re-renders the move list (the `_asinaNavAttached` flag guards
    // against double-binding).
    const attachNavButtons = () => {
      const attachButton = (selector) => {
        const button = document.querySelector(selector);
        if (!button || button._asinaNavAttached) {
          return;
        }
        button._asinaNavAttached = true;
        button.addEventListener("click", () => {
          setTimeout(() => {
            this.UpdateEngine(false);
            triggerCoachAnalysis();
          }, 80);
        });
      };
      attachButton('[data-cy="move-list-button-forward"]');
      attachButton('[data-cy="move-list-button-backward"]');
    };
    const navObserver = new MutationObserver(() => attachNavButtons());
    navObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
    attachNavButtons();
    // Arrow-key move navigation triggers the same delayed re-analysis.
    document.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        setTimeout(() => {
          this.UpdateEngine(false);
          triggerCoachAnalysis();
        }, 80);
      }
    });
    // Same re-analysis hook for the board controller's own navigation events;
    // try/catch because not every board build exposes `on` for all of them.
    ["MoveForward", "MoveBackward", "Seek", "ScrollMove"].forEach(
      (eventName) => {
        try {
          this.controller.on(eventName, () => {
            setTimeout(() => {
              this.UpdateEngine(false);
              triggerCoachAnalysis();
            }, 80);
          });
        } catch (e) {}
      },
    );
    // Fires on every move played on the board: while still on the initial
    // position it flags the opening phase (`isPreMoveSequence`), then updates
    // the engine and re-runs the coach.
    this.controller.on("Move", (moveData) => {
      const fen = this.controller.getFEN();
      if (fen.startsWith("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR")) {
        if (master.engine.moveCounter === 0 && fen.endsWith("w KQkq")) {
          master.engine.isPreMoveSequence = true;
        }
      }
      this.UpdateEngine(false);
      triggerCoachAnalysis();
    });
    // Build the evaluation bar right away if the option is already enabled.
    if (this.evalBar == null && getValueConfig(enumOptions.EvaluationBar)) {
      this.CreateAnalysisTools();
    }
    // Game-mode transitions: entering "playing" resets the game state, engine
    // counters and one-shot flags; "passive-observing" only marks that a Load
    // event is expected before the engine may be touched.
    this.controller.on("ModeChanged", (modeEvent) => {
      if (modeEvent.data === "playing") {
        this.ResetGame();
        master.game.RefreshEvalutionBar();
        master.engine.moveCounter = 0;
        master.engine.hasShownLimitMessage = false;
        master.engine.isPreMoveSequence = true;
        master._autoStartNewGameClicked = false;
      } else if (modeEvent.data === "observing") {
      } else if (modeEvent.data === "passive-observing") {
        this._waitingForLoad = true;
      }
    });
    // When the board renderer is (re)created, reset everything. If the board
    // never fires "RendererSet" (older builds), fall back to its "ResetGame"
    // event after 1.1s.
    let rendererSetFired = false;
    this.controller.on("RendererSet", (rendererData) => {
      this.ResetGame();
      this.RefreshEvalutionBar();
      rendererSetFired = true;
    });
    setTimeout(() => {
      if (!rendererSetFired) {
        this.controller.on("ResetGame", (resetData) => {
          this.ResetGame();
          this.RefreshEvalutionBar();
        });
      }
    }, 1100);
    // A position finished loading (e.g. after switching to an observed game):
    // stop the running evaluation and restart the engine from the loaded FEN.
    this.controller.on("Load", (loadData) => {
      if (this._waitingForLoad) {
        this._waitingForLoad = false;
        try {
          const fen = this.controller.getFEN();
          if (fen) {
            master.engine.stopEvaluation(() => {
              master.engine.topMoves = [];
              master.engine.send("ucinewgame");
              master.engine.UpdateOptions();
              master.engine.UpdatePosition(fen, false);
            });
          }
        } catch (e) {}
      }
    });
    // Keep the cached options snapshot in sync with the board's settings.
    this.controller.on("UpdateOptions", (optionsData) => {
      this.options = this.controller.getOptions();
    });
  }
  // Applies runtime option changes: creates/removes the depth and evaluation
  // bars, clears hint markings when hints/arrows are off or stream mode is
  // active, and drops the last-move effect when move analysis is disabled.
  UpdateExtensionOptions() {
    if (getValueConfig(enumOptions.EvaluationBar) && this.evalBar == null) {
      this.CreateAnalysisTools();
    } else if (
      !getValueConfig(enumOptions.EvaluationBar) &&
      this.evalBar != null
    ) {
      this.evalBar.remove();
      this.evalBar = null;
      document.body.classList.remove("with-evaluation");
    }
    if (getValueConfig(enumOptions.DepthBar) && this.depthBar == null) {
      this.CreateAnalysisTools();
    } else if (!getValueConfig(enumOptions.DepthBar) && this.depthBar != null) {
      this.depthBar.parentElement.remove();
      this.depthBar = null;
    }
    if (
      !getValueConfig(enumOptions.ShowHints) ||
      getValueConfig("option-stream-mode")
    ) {
      this.RemoveCurrentMarkings();
    }
    if (!getValueConfig(enumOptions.MoveAnalysis)) {
      let lastMove = this.controller.getLastMove();
      if (lastMove) {
        this.controller.markings.removeOne("effect|" + lastMove.to);
      }
    }
    if (
      getValueConfig(enumOptions.HideArrows) ||
      getValueConfig("option-stream-mode")
    ) {
      this.RemoveCurrentMarkings();
    }
    this.ApplyHidePlayers();
  }
  // No-op hook — the hide-players feature is intentionally empty in this build.
  ApplyHidePlayers() {}
  // Injects the depth bar and evaluation bar DOM next to the board. The board
  // wrapper may not exist yet when the extension boots, so a 10ms retry
  // interval polls for it and installs whichever bars are enabled once found.
  CreateAnalysisTools() {
    if (getValueConfig("option-stream-mode")) {
      return;
    }
    let waitInterval = setInterval(() => {
      let boardWrap = this.chessboard.parentElement;
      if (boardWrap == null) {
        return;
      }
      let boardOuter = boardWrap.parentElement;
      if (boardOuter == null) {
        return;
      }
      clearInterval(waitInterval);
      if (getValueConfig(enumOptions.DepthBar) && this.depthBar == null) {
        let depthBarEl = document.createElement("div");
        depthBarEl.classList.add("depthBarLayoutt");
        depthBarEl.innerHTML =
          '<div class="depthBarr"><span class="depthBarProgress"></span></div>';
        boardOuter.insertBefore(depthBarEl, boardWrap.nextSibling);
        this.depthBar = depthBarEl.querySelector(".depthBarProgress");
      }
      if (getValueConfig(enumOptions.EvaluationBar) && this.evalBar == null) {
        let evalBarEl = document.createElement("div");
        evalBarEl.style.flex = "1 1 auto;";
        evalBarEl.innerHTML =
          '\n                <div class="evaluation-bar-bar">\n                    <span class="evaluation-bar-scoreAbbreviated evaluation-bar-dark">0.0</span>\n                    <span class="evaluation-bar-score evaluation-bar-dark ">+0.00</span>\n                    <div class="evaluation-bar-fill">\n                    <div class="evaluation-bar-color evaluation-bar-black"></div>\n                    <div class="evaluation-bar-color evaluation-bar-draw"></div>\n                    <div class="evaluation-bar-color evaluation-bar-white" style="transform: translate3d(0px, 50%, 0px);"></div>\n                    </div>\n                </div>';
        let evalContainer = boardWrap.querySelector("#board-layout-evaluation");
        if (evalContainer == null) {
          evalContainer = document.createElement("div");
          evalContainer.classList.add("board-layout-evaluation");
          boardWrap.insertBefore(evalContainer, boardWrap.firstElementChild);
        }
        evalContainer.innerHTML = "";
        evalContainer.appendChild(evalBarEl);
        document.body.classList.add("with-evaluation");
        if (window.innerWidth < 960) {
          const syncHeight = () => {
            const rect = this.chessboard.getBoundingClientRect();
            if (rect.height > 0) {
              evalContainer.style.height = rect.height + "px";
            }
          };
          syncHeight();
          window.addEventListener("resize", syncHeight);
        }
        this.evalBar = evalContainer.querySelector(".evaluation-bar-bar");
        this.evalBarFill = evalContainer.querySelector(".evaluation-bar-white");
        this.evalScore = evalContainer.querySelector(".evaluation-bar-score");
        this.evalScoreAbbreviated = evalContainer.querySelector(
          ".evaluation-bar-scoreAbbreviated",
        );
      }
    }, 10);
  }
  // Rebuilds the evaluation bar — used after renderer resets so the bar is
  // re-attached to the fresh board DOM.
  RefreshEvalutionBar() {
    if (getValueConfig(enumOptions.EvaluationBar)) {
      if (this.evalBar == null) {
        this.CreateAnalysisTools();
      } else if (this.evalBar != null) {
        this.evalBar.remove();
        this.evalBar = null;
        document.body.classList.remove("with-evaluation");
        this.CreateAnalysisTools();
      }
    }
  }
  // Pushes the current board FEN into the engine; `isNewGame` tells the engine
  // to start a fresh search instead of continuing the previous one. The depth
  // bar is reset to 0 because the old search depth no longer applies.
  UpdateEngine(isNewGame) {
    let fen = this.controller.getFEN();
    this.BetterMintmaster.engine.UpdatePosition(fen, isNewGame);
    this.SetCurrentDepth(0);
  }
  // Delayed full reset: re-analyses as a new game, refreshes the eval bar and
  // resets the coach and accuracy widgets. The 300ms delay lets the board
  // finish its own reset first.
  ResetGame() {
    setTimeout(() => {
      this.UpdateEngine(true);
      BetterMintmaster.game.RefreshEvalutionBar();
      if (BetterMintmaster.coach) {
        BetterMintmaster.coach.newGame();
      }
      if (BetterMintmaster && BetterMintmaster.resetAccuracyWidget) {
        BetterMintmaster.resetAccuracyWidget();
      }
    }, 300);
  }
  // Removes every marking this controller added (the board API keys markings
  // as `type|square` or `type|fromto`), then clears the local tracking list.
  RemoveCurrentMarkings() {
    this.currentMarkings.forEach((marking) => {
      let key = marking.type + "|";
      if (marking.data.square != null) {
        key += marking.data.square;
      } else {
        key += "" + marking.data.from + marking.data.to;
      }
      this.controller.markings.removeOne(key);
    });
    this.currentMarkings = [];
  }
  // Renders engine hints on the board.
  // NOTE: the 2nd parameter (`lastTopMoves`) is currently unused in the body;
  // the 3rd parameter (`isSearching`) switches between live-search and
  // finished-search depth display (see the depth-bar percentage below).
  // Two arrow modes:
  //  - Komodo PV mode (MultiPV=1 + PredDepth + live search + Komodo engine):
  //    draws the best line as a chain of arrows, alternating best/other colors
  //    per ply and fading opacity every full move, capped by PredDepth and the
  //    engine's current depth.
  //  - Default mode: one arrow per top move — the best move in the "best"
  //    color, the rest in the "other" color with opacity fading by rank.
  // A mate score additionally marks the destination square with a
  // Winner/Resign effect. Afterwards the eval bar and stream overlays are fed
  // via the `AsinaEngineUpdate` / `AsinaSendStreamData` window events; the
  // `evalEngine.evaluate` callback orients scores by side-to-move (turn 2 =
  // black) before updating the bar.
  HintMoves(topMoves, lastTopMoves, isSearching) {
    let best = topMoves[0];
    if (
      getValueConfig(enumOptions.ShowHints) &&
      !getValueConfig("option-stream-mode")
    ) {
      this.RemoveCurrentMarkings();
      const multipv = getValueConfig(enumOptions.MultiPV) || 1;
      const predDepth = getValueConfig(enumOptions.PredDepth) || 0;
      const isKomodo = this.BetterMintmaster.engine?.engineType === "komodo";
      const showPvArrows =
        multipv === 1 && predDepth > 0 && isSearching && isKomodo;
      if (showPvArrows) {
        const bestColor =
          getValueConfig(enumOptions.ColorBestArrow) || "#FF3333";
        const otherColor =
          getValueConfig(enumOptions.ColorOtherArrow) || "#FECA57";
        const turn = this.controller.getFEN().split(" ")[1];
        const pvLine = best.line;
        const engineDepth = this.BetterMintmaster.engine.depth;
        const pliesToShow = Math.min(predDepth, pvLine.length, engineDepth);
        for (let ply = 0; ply < pliesToShow; ply++) {
          const uci = pvLine[ply];
          if (!uci || uci.length < 4) {
            break;
          }
          const from = uci.substring(0, 2);
          const to = uci.substring(2, 4);
          const isOwnPly = ply % 2 === 0;
          const color = isOwnPly ? bestColor : otherColor;
          const moveIdx = Math.floor(ply / 2);
          const opacity = Math.max(1 - moveIdx * 0.2, 0.2);
          const arrowData = {
            from: from,
            color: color,
            opacity: opacity,
            to: to,
          };
          const arrowMarking = {
            data: arrowData,
            node: true,
            persistent: true,
            type: "arrow",
          };
          this.currentMarkings.push(arrowMarking);
        }
        if (best.mate != null && pliesToShow > 0) {
          const lastUci = pvLine[pliesToShow - 1];
          if (lastUci && lastUci.length >= 4) {
            this.currentMarkings.push({
              data: {
                square: lastUci.substring(2, 4),
                type: best.mate < 0 ? "ResignWhite" : "WinnerWhite",
              },
              node: true,
              persistent: true,
              type: "effect",
            });
          }
        }
        // Reversed so the first ply of the line is drawn last (on top).
        this.currentMarkings.reverse();
        if (
          !getValueConfig(enumOptions.HideArrows) &&
          !getValueConfig("option-stream-mode")
        ) {
          this.controller.markings.addMany(this.currentMarkings);
        }
      } else {
        topMoves.forEach((topMove, rank) => {
          if (isSearching && topMove.depth != best.depth) {
            return;
          }
          let bestColor =
            getValueConfig(enumOptions.ColorBestArrow) || "#FF3333";
          let otherColor =
            getValueConfig(enumOptions.ColorOtherArrow) || "#FECA57";
          let color = rank === 0 ? bestColor : otherColor;
          let opacity =
            rank === 0
              ? 1
              : rank === 1
                ? 1
                : Math.max(1 - (rank - 1) * 0.2, 0.2);
          const arrowData = {
            from: topMove.from,
            color: color,
            opacity: opacity,
            to: topMove.to,
          };
          const arrowMarking = {
            data: arrowData,
            node: true,
            persistent: true,
            type: "arrow",
          };
          this.currentMarkings.push(arrowMarking);
          if (topMove.mate != null) {
            this.currentMarkings.push({
              data: {
                square: topMove.to,
                type: topMove.mate < 0 ? "ResignWhite" : "WinnerWhite",
              },
              node: true,
              persistent: true,
              type: "effect",
            });
          }
        });
        // Same ordering trick for the per-rank arrows.
        this.currentMarkings.reverse();
        if (
          !getValueConfig(enumOptions.HideArrows) &&
          !getValueConfig("option-stream-mode")
        ) {
          this.controller.markings.addMany(this.currentMarkings);
        }
      }
    }
    if (
      getValueConfig(enumOptions.DepthBar) &&
      !getValueConfig("option-stream-mode")
    ) {
      let depthPercent =
        ((isSearching ? best.depth : best.depth - 1) /
          getValueConfig(enumOptions.Depth)) *
        100;
      this.SetCurrentDepth(depthPercent);
    }
    if (
      getValueConfig(enumOptions.EvaluationBar) ||
      getValueConfig("option-stream-mode")
    ) {
      const fen = this.controller.getFEN();
      const evalEngine = this.BetterMintmaster?.evalEngine;
      const controller = this.controller;
      const streamMode = getValueConfig("option-stream-mode");
      if (evalEngine && fen) {
        evalEngine.evaluate(fen, (cp, mate) => {
          if (
            !getValueConfig(enumOptions.EvaluationBar) &&
            !getValueConfig("option-stream-mode")
          ) {
            return;
          }
          if (!streamMode) {
            // Scores are relative to the side to move: flip for black (turn 2).
            let orientedCp = mate !== null ? mate : cp;
            if (controller.getTurn() == 2) {
              orientedCp *= -1;
            }
            this.SetEvaluation(orientedCp, mate !== null);
          }
          if (cp !== null) {
            this.lastStockfishCp = controller.getTurn() == 2 ? -cp : cp;
            this.lastStockfishFen = fen;
          }
          // For the update event: report a cp score only when it is not a mate.
          const orientedCp =
            mate !== null ? null : controller.getTurn() == 2 ? -cp : cp;
          if (!streamMode) {
            const engineUpdate = {
              cp: orientedCp,
              mate: mate,
              depth: best.depth,
            };
            const updateEvent = {
              detail: engineUpdate,
            };
            window.dispatchEvent(
              new CustomEvent("AsinaEngineUpdate", updateEvent),
            );
          }
          if (streamMode) {
            const streamData = {
              sfCp: orientedCp,
              sfMate: mate,
            };
            const streamEvent = {
              detail: streamData,
            };
            window.dispatchEvent(
              new CustomEvent("AsinaSendStreamData", streamEvent),
            );
          }
        });
      }
    }
    const engineUpdate = {
      cp: best.cp,
      mate: best.mate,
      depth: best.depth,
    };
    const updateEvent = {
      detail: engineUpdate,
    };
    window.dispatchEvent(new CustomEvent("AsinaEngineUpdate", updateEvent));
    if (getValueConfig("option-stream-mode")) {
      window.dispatchEvent(
        new CustomEvent("AsinaSendStreamData", {
          detail: {
            fen: this.controller.getFEN(),
            topMoves: topMoves.map((topMove) => ({
              from: topMove.from,
              to: topMove.to,
              cp: topMove.cp,
              mate: topMove.mate,
            })),
            cp: best.cp,
            mate: best.mate,
            depth: best.depth,
            maxDepth: getValueConfig(enumOptions.Depth) || 20,
          },
        }),
      );
    }
  }
  // Updates the depth bar fill width (a percentage). 0 snaps to an empty bar
  // without the CSS transition; values above 100 are clamped.
  SetCurrentDepth(percent) {
    if (this.depthBar == null) {
      return;
    }
    let style = this.depthBar.style;
    if (percent <= 0) {
      this.depthBar.classList.add("disable-transition");
      style.width = "0%";
      this.depthBar.classList.remove("disable-transition");
    } else {
      if (percent > 100) {
        percent = 100;
      }
      style.width = percent + "%";
    }
  }
  // Updates the evaluation bar. Centipawn scores map onto a fill percentage
  // clamped to 5–95 (±5 pawns spans the whole bar); mate scores pin the bar to
  // 0/100 and render as "M<n>". The score text switches between dark/light
  // styling depending on which side the evaluation favors.
  SetEvaluation(evalValue, isMate) {
    if (this.evalBar == null) {
      return;
    }
    var fillPercent;
    var scoreText;
    var scoreAbbrev;
    if (!isMate) {
      let maxCp = 500;
      let minCp = -500;
      let pawns = evalValue / 100;
      fillPercent = 90 - ((evalValue - minCp) / (maxCp - minCp)) * 90 + 5;
      if (fillPercent < 5) {
        fillPercent = 5;
      } else if (fillPercent > 95) {
        fillPercent = 95;
      }
      scoreText = (evalValue >= 0 ? "+" : "") + pawns.toFixed(2);
      scoreAbbrev = Math.abs(pawns).toFixed(1);
    } else {
      fillPercent = evalValue < 0 ? 100 : 0;
      scoreText = "M" + Math.abs(evalValue).toString();
      scoreAbbrev = scoreText;
    }
    this.evalBarFill.style.transform =
      "translate3d(0px, " + fillPercent + "%, 0px)";
    this.evalScore.innerText = scoreText;
    this.evalScoreAbbreviated.innerText = scoreAbbrev;
    let activeClass =
      evalValue >= 0 ? "evaluation-bar-dark" : "evaluation-bar-light";
    let inactiveClass =
      evalValue >= 0 ? "evaluation-bar-light" : "evaluation-bar-dark";
    this.evalScore.classList.remove(inactiveClass);
    this.evalScoreAbbreviated.classList.remove(inactiveClass);
    this.evalScore.classList.add(activeClass);
    this.evalScoreAbbreviated.classList.add(activeClass);
  }
  // Returns the board's player-color code (1 = white, 2 = black).
  getPlayingAs() {
    if (this.options.isPlayerBlack) {
      return 2;
    } else {
      return 1;
    }
  }
  // Places a move-classification effect icon (brilliant/good/…, resolved via
  // the master's classifier) on a square during pre-analyze, remembering it so
  // clearPreAnalyzeMarkings can remove it later.
  placePreAnalyzeIcon(square, classification) {
    try {
      const effectType = this.BetterMintmaster._classificationToEffect
        ? this.BetterMintmaster._classificationToEffect(classification)
        : "Good";
      const markings = this.controller.markings;
      markings.removeOne("effect|" + square);
      const effectData = {
        square: square,
        type: effectType,
      };
      const effectMarking = {
        data: effectData,
        node: true,
        persistent: true,
        type: "effect",
      };
      markings.addOne(effectMarking);
      this._preAnalyzeSquares = this._preAnalyzeSquares || [];
      this._preAnalyzeSquares.push(square);
    } catch (e) {
      console.warn("[PreAnalyze] placePreAnalyzeIcon hata:", e);
    }
  }
  // Removes all pre-analyze effect icons placed by placePreAnalyzeIcon.
  clearPreAnalyzeMarkings() {
    try {
      const markings = this.controller.markings;
      (this._preAnalyzeSquares || []).forEach((square) =>
        markings.removeOne("effect|" + square),
      );
      this._preAnalyzeSquares = [];
    } catch (e) {}
  }
}
