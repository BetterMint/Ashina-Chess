// ─── better-mint.js · BetterMint master orchestrator ───
// Owns the game controller, engine, coach engines and all UI widgets
// (accuracy widget, tallies widget, mobile buttons, auto-start watcher…).
import { enumOptions, getValueConfig } from "./core.js";
import { GameController } from "./board/game-controller.js";
import { EvalEngine } from "./engine/eval-engine.js";
import { CoachEngine } from "./engine/coach-engine.js";
import { PreCoachEngine } from "./engine/pre-coach-engine.js";
import { MaiaEngine } from "./engine/maia-engine.js";
import { StockfishEngine } from "./engine/stockfish-engine.js";
import {
  CLASSIFICATION_ICONS,
  CL_BRILLIANT,
  CL_GREAT_FIND,
  CL_BEST,
  CL_EXCELLENT,
  CL_GOOD,
  CL_BOOK,
  CL_INACCURACY,
  CL_MISTAKE,
  CL_MISS,
  CL_BLUNDER,
} from "./coach/classification.js";
/**
 * BetterMint — master orchestrator of the Ashina extension.
 * Wires the chess.com board (GameController) to the engines (Stockfish, Maia,
 * coach / pre-coach / eval) and owns every UI widget: the accuracy badge, the
 * move-quality tallies widget, the mobile play/premove buttons, the
 * auto-start-new-game watcher and the clock-side engine-reload button.
 * Option changes arrive as "BetterMintUpdateOptions" window events.
 */
export class BetterMint {
  /**
   * @param {Element} chessboard the chess.com board element (`wc-chess-board`)
   *   passed on to GameController for move input and markings.
   * @param {object} options live options map (enumOptions keys → values);
   *   replaced wholesale on every "BetterMintUpdateOptions" event.
   */
  constructor(chessboard, options) {
    // Subsystems: board controller + all engines, plus coach audio state.
    this.options = options;
    this.game = new GameController(this, chessboard);
    this.engine = new StockfishEngine(this);
    this.coach = new CoachEngine();
    this.coachAudio = new Audio();
    this._lastCoachFen = null;
    this.lastCoachResult = null;
    this._audioCtx = null;
    this.maiaEngine = new MaiaEngine();
    this.preCoach = new PreCoachEngine();
    this.evalEngine = new EvalEngine();
    this._audioSource = null;
    // "BetterMintUpdateOptions" is dispatched by the popup/option layer with
    // the full option map in event.detail; re-sync every subsystem here.
    window.addEventListener(
      "BetterMintUpdateOptions",
      (event) => {
        this.options = event.detail;
        this.game.UpdateExtensionOptions();
        this.engine.UpdateExtensionOptions(this.options);
        // Auto-move: cancel any pending timer when disabled, (re)schedule when
        // enabled and an analysis line is already available.
        if (
          !this.options[enumOptions.AutoMoveEnabled] &&
          this.engine.autoMoveTimer !== null
        ) {
          clearTimeout(this.engine.autoMoveTimer);
          this.engine.autoMoveTimer = null;
        }
        if (
          this.options[enumOptions.AutoMoveEnabled] &&
          this.engine.topMoves?.length > 0
        ) {
          this.engine.scheduleAutoMove();
        }
        // Ultrabullet: same enable/disable dance for its own move timer.
        if (
          !this.options[enumOptions.UltrabulletEnabled] &&
          this.engine.ultrabulletMoveTimer !== null
        ) {
          clearTimeout(this.engine.ultrabulletMoveTimer);
          this.engine.ultrabulletMoveTimer = null;
        }
        if (
          this.options[enumOptions.UltrabulletEnabled] &&
          this.engine.topMoves?.length > 0
        ) {
          this.engine.scheduleUltrabulletMove();
        }
        // Coach workers must be restarted so they pick up the new settings.
        if (this.coach) {
          this.coach.restartWorker();
        }
        if (this.preCoach) {
          this.preCoach.restartWorker();
        }
        // Drop the cached ponder line when premoves are off, and clear every
        // pending auto-premove flag whose feature got disabled.
        if (!this.options["option-premove-enabled"]) {
          this.engine.lastPonder = null;
        }
        if (
          !this.options[enumOptions.AutoMoveEnabled] ||
          !this.options[enumOptions.PremoveEnabled]
        ) {
          this.engine.pendingAutoPremove = false;
          this.engine.pendingAutoPremoveMates = false;
          this.engine.lastMoveGaveCheck = false;
        }
        if (!this.options[enumOptions.AutoPremoveEnabled]) {
          this.engine.pendingAutoPremove = false;
        }
        if (!this.options[enumOptions.AutoPremoveMatesEnabled]) {
          this.engine.pendingAutoPremoveMates = false;
        }
        if (!this.options[enumOptions.AutoPremoveCheckingForkEnabled]) {
          this.engine.lastMoveGaveCheck = false;
        }
        // Mobile buttons: only touch the DOM when the option was actually sent.
        if (typeof this.options["option-mobile-play-btn"] !== "undefined") {
          this.applyMobilePlayBtn(!!this.options["option-mobile-play-btn"]);
        }
        if (typeof this.options["option-mobile-premove-btn"] !== "undefined") {
          this.applyMobilePremoveBtn(
            !!this.options["option-mobile-premove-btn"],
          );
        }
        // Tallies widget: remove it when the coach recap is off, (re)create it
        // from the last coach result when turned back on.
        const talliesWidget = document.getElementById("ashina-tallies-widget");
        if (!this.options[enumOptions.CoachRecap]) {
          if (talliesWidget) {
            talliesWidget.remove();
          }
        } else if (!talliesWidget && this.lastCoachResult?.tallies) {
          this.updateTalliesWidget(this.lastCoachResult.tallies);
        }
      },
      false,
    );
  }
  /** Lifecycle hook called once the Stockfish engine finished loading. */
  onEngineLoaded() {}
  /** Restart pre-move bookkeeping: zero the move counter, re-arm the
   *  "pre-move sequence" state and allow the limit message again. */
  resetPreMoveCounter() {
    this.engine.moveCounter = 0;
    this.engine.hasShownLimitMessage = false;
    this.engine.isPreMoveSequence = true;
  }
  /** Map a coach classification key (e.g. "brilliant", "blunder") to the
   *  chess.com-style effect name used for board markings; "miss" is reported
   *  as "Mistake" and anything unknown falls back to "Good". */
  _classificationToEffect(classificationName) {
    const effectMap = {
      brilliant: "Brilliant",
      greatFind: "GreatFind",
      best: "BestMove",
      excellent: "Excellent",
      good: "Good",
      book: "Book",
      inaccuracy: "Inaccuracy",
      mistake: "Mistake",
      miss: "Mistake",
      blunder: "Blunder",
      forced: "Forced",
    };
    return effectMap[classificationName] || "Good";
  }
  /** Accuracy → display color: green ≥90, blue ≥75, yellow ≥60, red below. */
  _accColor(accuracy) {
    if (accuracy >= 90) {
      return "#96bc4b";
    }
    if (accuracy >= 75) {
      return "#5c8bb0";
    }
    if (accuracy >= 60) {
      return "#FECA57";
    }
    return "#b33430";
  }
  /** Show a move-quality effect on the destination square of the played move.
   *  Uses the chess.com board markings API (`controller.markings`) with a
   *  persistent "effect" marking keyed as "effect|<square>". */
  placeMoveFeedbackSVG(feedback) {
    const {
      classificationName: classificationName,
      playedMoveLan: playedMoveLan,
    } = feedback;
    if (!classificationName || !playedMoveLan) {
      return;
    }
    try {
      // LAN ends with the destination square, e.g. "e2e4" → "e4".
      const targetSquare = playedMoveLan.slice(-2);
      const effectName = this._classificationToEffect(classificationName);
      const markings = this.game.controller.markings;
      markings.removeOne("effect|" + targetSquare);
      const markingData = {
        square: targetSquare,
        type: effectName,
      };
      const marking = {
        data: markingData,
        node: true,
        persistent: true,
        type: "effect",
      };
      markings.addOne(marking);
    } catch (error) {
      console.warn("[CoachEngine] placeMoveFeedbackSVG hata:", error);
    }
  }
  /** Build the draggable white/black accuracy badge once: injects its <style>,
   *  creates #ashina-accuracy-widget, restores the last dragged position from
   *  chrome.storage and wires mouse + touch dragging. */
  _createAccuracyWidget() {
    if (document.getElementById("ashina-accuracy-widget")) {
      return;
    }
    if (!document.getElementById("ashina-acc-style")) {
      const styleEl = document.createElement("style");
      styleEl.id = "ashina-acc-style";
      styleEl.textContent =
        "\n        #ashina-accuracy-widget {\n          position: fixed;\n          top: 80px;\n          right: 20px;\n          z-index: 99999;\n          cursor: grab;\n          user-select: none;\n          border-radius: 5px;\n          overflow: hidden;\n          display: flex;\n          flex-direction: row;\n          font-family: 'Segoe UI', Arial, sans-serif;\n        }\n        #ashina-accuracy-widget:active { cursor: grabbing; }\n        .ashina-acc-half {\n          display: flex;\n          align-items: center;\n          justify-content: center;\n          padding: 9px 20px;\n          min-width: 64px;\n        }\n        #ashina-acc-half-white {\n          background: #f0ede8;\n        }\n        #ashina-acc-half-black {\n          background: #1e1e1e;\n        }\n        #ashina-acc-val-white {\n          font-size: 20px;\n          font-weight: 800;\n          color: #1a1a1a;\n          letter-spacing: 0.3px;\n          line-height: 1;\n        }\n        #ashina-acc-val-black {\n          font-size: 20px;\n          font-weight: 800;\n          color: #ffffff;\n          letter-spacing: 0.3px;\n          line-height: 1;\n        }\n      ";
      document.head.appendChild(styleEl);
    }
    const widget = document.createElement("div");
    widget.id = "ashina-accuracy-widget";
    widget.innerHTML =
      '\n      <div class="ashina-acc-half" id="ashina-acc-half-white">\n        <span id="ashina-acc-val-white">—</span>\n      </div>\n      <div class="ashina-acc-half" id="ashina-acc-half-black">\n        <span id="ashina-acc-val-black">—</span>\n      </div>\n    ';
    document.body.appendChild(widget);
    // Default placement: hug the top-left corner of the chess.com board
    // (8px offsets), falling back to a fixed 100/100 spot without a board.
    function positionWidget() {
      const boardEl =
        document.querySelector("wc-chess-board") ||
        document.querySelector(".board");
      const widgetEl = document.getElementById("ashina-accuracy-widget");
      if (!widgetEl) {
        return;
      }
      if (boardEl) {
        const boardRect = boardEl.getBoundingClientRect();
        const widgetHeight = widgetEl.offsetHeight || 34;
        widgetEl.style.left = boardRect.left + 8 + "px";
        widgetEl.style.top = boardRect.top - widgetHeight - 8 + "px";
      } else {
        widgetEl.style.top = "100px";
        widgetEl.style.left = "100px";
      }
      widgetEl.style.right = "auto";
    }
    // Restore the saved drag position (if any), else use the board-relative
    // default. Without chrome.storage (outside the extension) just position it.
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.get(
        {
          "ashina-acc-pos": null,
        },
        function (stored) {
          const widgetEl = document.getElementById("ashina-accuracy-widget");
          if (!widgetEl) {
            return;
          }
          if (stored["ashina-acc-pos"]) {
            const { top: top, left: left } = stored["ashina-acc-pos"];
            widgetEl.style.top = top + "px";
            widgetEl.style.left = left + "px";
            widgetEl.style.right = "auto";
          } else {
            positionWidget();
          }
        },
      );
    } else {
      positionWidget();
    }
    // Drag handling (mouse): remember the grab offset, follow the pointer on
    // mousemove, persist the final position on mouseup.
    let isDragging = false;
    let startX;
    let startY;
    let originLeft;
    let originTop;
    widget.addEventListener("mousedown", function (event) {
      isDragging = true;
      startX = event.clientX;
      startY = event.clientY;
      const rect = widget.getBoundingClientRect();
      originLeft = rect.left;
      originTop = rect.top;
      widget.style.right = "auto";
      event.preventDefault();
    });
    document.addEventListener("mousemove", function (event) {
      if (!isDragging) {
        return;
      }
      const newLeft = originLeft + (event.clientX - startX);
      const newTop = originTop + (event.clientY - startY);
      widget.style.left = newLeft + "px";
      widget.style.top = newTop + "px";
    });
    document.addEventListener("mouseup", function () {
      if (!isDragging) {
        return;
      }
      isDragging = false;
      if (typeof chrome !== "undefined" && chrome.storage) {
        const rect = widget.getBoundingClientRect();
        const pos = {
          top: rect.top,
          left: rect.left,
        };
        const payload = {
          "ashina-acc-pos": pos,
        };
        chrome.storage.local.set(payload);
      }
    });
    // Drag handling (touch): same behavior via touch events; passive:false so
    // preventDefault() can stop the page from scrolling while dragging.
    widget.addEventListener(
      "touchstart",
      function (event) {
        var touch = event.touches[0];
        isDragging = true;
        startX = touch.clientX;
        startY = touch.clientY;
        const rect = widget.getBoundingClientRect();
        originLeft = rect.left;
        originTop = rect.top;
        widget.style.right = "auto";
        event.preventDefault();
      },
      {
        passive: false,
      },
    );
    document.addEventListener(
      "touchmove",
      function (event) {
        if (!isDragging) {
          return;
        }
        var touch = event.touches[0];
        widget.style.left = originLeft + (touch.clientX - startX) + "px";
        widget.style.top = originTop + (touch.clientY - startY) + "px";
        event.preventDefault();
      },
      {
        passive: false,
      },
    );
    document.addEventListener("touchend", function () {
      if (!isDragging) {
        return;
      }
      isDragging = false;
      if (typeof chrome !== "undefined" && chrome.storage) {
        const rect = widget.getBoundingClientRect();
        const pos = {
          top: rect.top,
          left: rect.left,
        };
        const payload = {
          "ashina-acc-pos": pos,
        };
        chrome.storage.local.set(payload);
      }
    });
  }
  /** Refresh the accuracy badge with the latest {whiteAccuracy, blackAccuracy}
   *  percentages (one decimal place), creating the widget on first use. */
  updateAccuracyWidget(accuracies) {
    this._createAccuracyWidget();
    const { whiteAccuracy: whiteAccuracy, blackAccuracy: blackAccuracy } =
      accuracies;
    if (whiteAccuracy != null) {
      const whiteValEl = document.getElementById("ashina-acc-val-white");
      if (whiteValEl) {
        whiteValEl.textContent = whiteAccuracy.toFixed(1);
      }
    }
    if (blackAccuracy != null) {
      const blackValEl = document.getElementById("ashina-acc-val-black");
      if (blackValEl) {
        blackValEl.textContent = blackAccuracy.toFixed(1);
      }
    }
  }
  /** Put both accuracy values back to the em-dash placeholder (new game). */
  resetAccuracyWidget() {
    const whiteValEl = document.getElementById("ashina-acc-val-white");
    const blackValEl = document.getElementById("ashina-acc-val-black");
    if (whiteValEl) {
      whiteValEl.textContent = "—";
    }
    if (blackValEl) {
      blackValEl.textContent = "—";
    }
  }
  // Icon glyphs per classification, and the row order of the tallies widget
  // (best moves at the top, blunders at the bottom).
  _TALLY_ICONS = CLASSIFICATION_ICONS;
  _TALLY_ROWS = [
    CL_BRILLIANT,
    CL_GREAT_FIND,
    CL_BEST,
    CL_EXCELLENT,
    CL_GOOD,
    CL_BOOK,
    CL_INACCURACY,
    CL_MISTAKE,
    CL_MISS,
    CL_BLUNDER,
  ];
  /** Build the draggable per-side move-quality tally widget (one row per
   *  classification, white/black counts). Injects CSS, localizes the title via
   *  the "option-language" sync setting, restores its dragged position and
   *  wires mouse + touch dragging. */
  _createTalliesWidget() {
    if (document.getElementById("ashina-tallies-widget")) {
      return;
    }
    if (!document.getElementById("ashina-tallies-style")) {
      const styleEl = document.createElement("style");
      styleEl.id = "ashina-tallies-style";
      styleEl.textContent =
        "\n        #ashina-tallies-widget {\n          position: fixed;\n          z-index: 99999;\n          background: rgba(30,28,26,0.92);\n          border-radius: 6px;\n          overflow: hidden;\n          font-family: 'Segoe UI', Arial, sans-serif;\n          cursor: grab;\n          user-select: none;\n          width: 82px;\n          box-shadow: 0 2px 8px rgba(0,0,0,0.5);\n        }\n        #ashina-tallies-widget:active { cursor: grabbing; }\n        #atw-header {\n          display: grid;\n          grid-template-columns: 1fr 18px 1fr;\n          align-items: center;\n          padding: 3px 5px 2px;\n          border-bottom: 1px solid rgba(255,255,255,0.08);\n        }\n        .atw-header-white {\n          width: 8px; height: 8px;\n          border-radius: 50%;\n          background: #fff;\n          justify-self: center;\n        }\n        .atw-header-black {\n          width: 8px; height: 8px;\n          border-radius: 50%;\n          background: #1a1a1a;\n          border: 1px solid #555;\n          justify-self: center;\n        }\n        .atw-row {\n          display: grid;\n          grid-template-columns: 1fr 18px 1fr;\n          align-items: center;\n          height: 18px;\n          padding: 0 6px;\n          gap: 2px;\n          border-bottom: 1px solid rgba(255,255,255,0.04);\n        }\n        .atw-row:last-child { border-bottom: none; }\n        .atw-num {\n          font-size: 10px;\n          font-weight: 700;\n          line-height: 1;\n        }\n        .atw-num-w { text-align: center; }\n        .atw-num-b { text-align: center; }\n        .atw-icon {\n          display: flex;\n          align-items: center;\n          justify-content: center;\n        }\n        .atw-c-brilliant  { color: #26c2a3; }\n        .atw-c-greatFind  { color: #749BBF; }\n        .atw-c-best       { color: #81B64C; }\n        .atw-c-excellent  { color: #81B64C; }\n        .atw-c-good       { color: #95b776; }\n        .atw-c-book       { color: #D5A47D; }\n        .atw-c-inaccuracy { color: #F7C631; }\n        .atw-c-mistake    { color: #FFA459; }\n        .atw-c-miss       { color: #FF7769; }\n        .atw-c-blunder    { color: #FA412D; }\n        @media (min-width: 769px) {\n          #ashina-tallies-widget { width: 150px; }\n          #atw-header { grid-template-columns: 1fr 24px 1fr; }\n          .atw-row { grid-template-columns: 1fr 24px 1fr; height: 22px; }\n          .atw-num { font-size: 12px; }\n          .atw-header-white, .atw-header-black { width: 10px; height: 10px; }\n        }\n      ";
      document.head.appendChild(styleEl);
    }
    const widget = document.createElement("div");
    widget.id = "ashina-tallies-widget";
    const titlesByLang = {
      en: "MOVES",
      tr: "HAMLELER",
      ru: "ХОДЫ",
    };
    const headerHtml =
      '\n      <div id="atw-header">\n        <div class="atw-header-white"></div>\n        <div></div>\n        <div class="atw-header-black"></div>\n      </div>\n    ';
    // One grid row per classification: white count | icon | black count, with
    // ids "atw-<key>" / "atb-<key>" so updateTalliesWidget can find the cells.
    const rowsHtml = this._TALLY_ROWS
      .map(
        (row) =>
          '\n      <div class="atw-row">\n        <span class="atw-num atw-num-w atw-c-' +
          row.key +
          '" id="atw-' +
          row.key +
          '">—</span>\n        <span class="atw-icon">' +
          (this._TALLY_ICONS[row.key] || "") +
          '</span>\n        <span class="atw-num atw-num-b atw-c-' +
          row.key +
          '" id="atb-' +
          row.key +
          '">—</span>\n      </div>\n    ',
      )
      .join("");
    // Localize the "MOVES" header from the synced language option (en/tr/ru);
    // without chrome.storage, render without a title.
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.sync.get(
        {
          "option-language": "en",
        },
        (stored) => {
          const lang = stored["option-language"] || "en";
          const title = titlesByLang[lang] || titlesByLang.en;
          widget.innerHTML =
            '<div id="atw-title" style="text-align:center;font-size:8px;font-weight:700;letter-spacing:1px;color:#888;padding:3px 0 1px;">' +
            title +
            "</div>" +
            headerHtml +
            rowsHtml;
        },
      );
    } else {
      widget.innerHTML = headerHtml + rowsHtml;
    }
    document.body.appendChild(widget);
    // Default placement: right of the board, bottom-aligned to it; if it
    // would overflow the viewport, tuck it inside the board's top-left.
    function positionWidget() {
      const widgetEl = document.getElementById("ashina-tallies-widget");
      if (!widgetEl) {
        return;
      }
      const boardEl =
        document.querySelector("wc-chess-board") ||
        document.querySelector(".board");
      if (boardEl) {
        const boardRect = boardEl.getBoundingClientRect();
        const widgetWidth = widgetEl.offsetWidth || 82;
        const widgetHeight = widgetEl.offsetHeight || 200;
        const viewportWidth = window.innerWidth;
        if (boardRect.right + 10 + widgetWidth <= viewportWidth) {
          widgetEl.style.left = boardRect.right + 10 + "px";
          widgetEl.style.top = boardRect.bottom - widgetHeight + "px";
        } else {
          widgetEl.style.left = Math.max(boardRect.left + 4, 4) + "px";
          widgetEl.style.top = Math.max(boardRect.top + 4, 60) + "px";
        }
      } else {
        widgetEl.style.top = "100px";
        widgetEl.style.left = "10px";
        return;
      }
      widgetEl.style.right = "auto";
    }
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.get(
        {
          "ashina-tallies-pos": null,
        },
        (stored) => {
          const widgetEl = document.getElementById("ashina-tallies-widget");
          if (!widgetEl) {
            return;
          }
          if (stored["ashina-tallies-pos"]) {
            const savedPos = stored["ashina-tallies-pos"];
            if (
              savedPos.left < window.innerWidth - 20 &&
              savedPos.top < window.innerHeight - 20
            ) {
              widgetEl.style.top = savedPos.top + "px";
              widgetEl.style.left = savedPos.left + "px";
              widgetEl.style.right = "auto";
            } else {
              positionWidget();
            }
          } else {
            positionWidget();
          }
        },
      );
    } else {
      positionWidget();
    }
    let isDragging = false;
    let startX;
    let startY;
    let originLeft;
    let originTop;
    // Shared drag helpers for mouse and touch: beginDrag records the grab
    // offset, moveDrag repositions, endDrag persists to chrome.storage.
    function beginDrag(clientX, clientY) {
      isDragging = true;
      startX = clientX;
      startY = clientY;
      const rect = widget.getBoundingClientRect();
      originLeft = rect.left;
      originTop = rect.top;
      widget.style.right = "auto";
    }
    function moveDrag(clientX, clientY) {
      if (!isDragging) {
        return;
      }
      widget.style.left = originLeft + clientX - startX + "px";
      widget.style.top = originTop + clientY - startY + "px";
    }
    function endDrag() {
      if (!isDragging) {
        return;
      }
      isDragging = false;
      if (typeof chrome !== "undefined" && chrome.storage) {
        const rect = widget.getBoundingClientRect();
        const pos = {
          top: rect.top,
          left: rect.left,
        };
        const payload = {
          "ashina-tallies-pos": pos,
        };
        chrome.storage.local.set(payload);
      }
    }
    widget.addEventListener("mousedown", (event) => {
      beginDrag(event.clientX, event.clientY);
      event.preventDefault();
    });
    document.addEventListener("mousemove", (event) =>
      moveDrag(event.clientX, event.clientY),
    );
    document.addEventListener("mouseup", endDrag);
    widget.addEventListener(
      "touchstart",
      (event) => {
        const touch = event.touches[0];
        beginDrag(touch.clientX, touch.clientY);
        event.preventDefault();
      },
      {
        passive: false,
      },
    );
    document.addEventListener(
      "touchmove",
      (event) => {
        if (!isDragging) {
          return;
        }
        const touch = event.touches[0];
        moveDrag(touch.clientX, touch.clientY);
        event.preventDefault();
      },
      {
        passive: false,
      },
    );
    document.addEventListener("touchend", endDrag);
  }
  /** Write the latest per-side classification counts
   *  ({white:{…}, black:{…}}) into the widget cells; missing keys show 0. */
  updateTalliesWidget(tallies) {
    if (!tallies) {
      return;
    }
    this._createTalliesWidget();
    // One-shot flag marking that tally data has been logged at least once.
    if (!this._talliesLogged) {
      this._talliesLogged = true;
    }
    const whiteTallies = tallies.white || {};
    const blackTallies = tallies.black || {};
    this._TALLY_ROWS.forEach((row) => {
      const whiteCell = document.getElementById("atw-" + row.key);
      const blackCell = document.getElementById("atb-" + row.key);
      if (whiteCell) {
        whiteCell.textContent = whiteTallies[row.key] ?? 0;
      }
      if (blackCell) {
        blackCell.textContent = blackTallies[row.key] ?? 0;
      }
    });
  }
  /** Clear every tally cell back to the em-dash placeholder (new game). */
  resetTalliesWidget() {
    this._TALLY_ROWS.forEach((row) => {
      const whiteCell = document.getElementById("atw-" + row.key);
      const blackCell = document.getElementById("atb-" + row.key);
      if (whiteCell) {
        whiteCell.textContent = "—";
      }
      if (blackCell) {
        blackCell.textContent = "—";
      }
    });
  }
  // Repeat timers for the mobile buttons: while a button is held (and not
  // being dragged) the action fires periodically; cleared on release.
  _mobilePlayInterval = null;
  _mobilePremoveInterval = null;
  /** Floating round "play best move" button for touch devices: injects CSS,
   *  supports drag-to-reposition (persisted in chrome.storage) and, while
   *  held, repeats engine.playBestMove() every 200ms. */
  _createMobilePlayBtn() {
    if (document.getElementById("ashina-mobile-play-btn")) {
      return;
    }
    if (!document.getElementById("ashina-mobile-play-style")) {
      const styleEl = document.createElement("style");
      styleEl.id = "ashina-mobile-play-style";
      styleEl.textContent =
        "\n        #ashina-mobile-play-btn {\n          position: fixed;\n          bottom: 80px;\n          right: 14px;\n          z-index: 99999;\n          width: 48px;\n          height: 48px;\n          border-radius: 10px;\n          background: rgba(0,0,0,0.42);\n          border: 1px solid rgba(255,255,255,0.1);\n          cursor: grab;\n          display: flex;\n          align-items: center;\n          justify-content: center;\n          user-select: none;\n          -webkit-user-select: none;\n          touch-action: none;\n          transition: background 0.15s, border 0.15s;\n        }\n        #ashina-mobile-play-btn.ashina-mpb-pressing {\n          background: rgba(255,255,255,0.12);\n          border: 1px solid rgba(255,255,255,0.22);\n          cursor: grabbing;\n        }\n        #ashina-mobile-play-btn svg {\n          pointer-events: none;\n          opacity: 0.65;\n        }\n        #ashina-mobile-play-btn.ashina-mpb-pressing svg {\n          opacity: 0.9;\n        }\n      ";
      document.head.appendChild(styleEl);
    }
    const btn = document.createElement("button");
    btn.id = "ashina-mobile-play-btn";
    btn.innerHTML =
      '\n      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#fff">\n        <polygon points="5,3 19,12 5,21"/>\n      </svg>\n    ';
    document.body.appendChild(btn);
    let isDragging = false;
    let startX;
    let startY;
    let originLeft;
    let originTop;
    let pointerMoved = false;
    btn.addEventListener(
      "touchstart",
      (event) => {
        const touch = event.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        const rect = btn.getBoundingClientRect();
        originLeft = rect.left;
        originTop = rect.top;
        isDragging = false;
        pointerMoved = false;
        btn.classList.add("ashina-mpb-pressing");
        event.preventDefault();
      },
      {
        passive: false,
      },
    );
    document.addEventListener(
      "touchmove",
      (event) => {
        if (!btn.classList.contains("ashina-mpb-pressing")) {
          return;
        }
        const touch = event.touches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;
        // Movement > 6px means "drag the button", not a tap/hold.
        if (!pointerMoved && (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6)) {
          pointerMoved = true;
          isDragging = true;
        }
        if (isDragging) {
          btn.style.right = "auto";
          btn.style.left = originLeft + deltaX + "px";
          btn.style.top = originTop + deltaY + "px";
          event.preventDefault();
        }
      },
      {
        passive: false,
      },
    );
    document.addEventListener("touchend", () => {
      if (!btn.classList.contains("ashina-mpb-pressing")) {
        return;
      }
      btn.classList.remove("ashina-mpb-pressing");
      if (isDragging) {
        if (typeof chrome !== "undefined" && chrome.storage) {
          const rect = btn.getBoundingClientRect();
          const pos = {
            top: rect.top,
            left: rect.left,
          };
          const payload = {
            "ashina-mpb-pos": pos,
          };
          chrome.storage.local.set(payload);
        }
      }
      isDragging = false;
      pointerMoved = false;
      clearInterval(this._mobilePlayInterval);
      this._mobilePlayInterval = null;
    });
    document.addEventListener("touchcancel", () => {
      btn.classList.remove("ashina-mpb-pressing");
      clearInterval(this._mobilePlayInterval);
      this._mobilePlayInterval = null;
      isDragging = false;
      pointerMoved = false;
    });
    // Second touchstart listener: play immediately, then repeat every 200ms
    // while held (paused while the button is being dragged).
    btn.addEventListener(
      "touchstart",
      (event) => {
        this.engine.playBestMove();
        this._mobilePlayInterval = setInterval(() => {
          if (!isDragging) {
            this.engine.playBestMove();
          }
        }, 200);
      },
      {
        passive: false,
      },
    );
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.get(
        {
          "ashina-mpb-pos": null,
        },
        (stored) => {
          if (stored["ashina-mpb-pos"]) {
            btn.style.right = "auto";
            btn.style.left = stored["ashina-mpb-pos"].left + "px";
            btn.style.top = stored["ashina-mpb-pos"].top + "px";
          }
        },
      );
    }
  }
  /** Remove the play button and stop its repeat timer. */
  _removeMobilePlayBtn() {
    const btn = document.getElementById("ashina-mobile-play-btn");
    if (btn) {
      btn.remove();
    }
    clearInterval(this._mobilePlayInterval);
    this._mobilePlayInterval = null;
  }
  /** Show/hide the mobile play button per the "option-mobile-play-btn" option. */
  applyMobilePlayBtn(enabled) {
    if (enabled) {
      this._createMobilePlayBtn();
    } else {
      this._removeMobilePlayBtn();
    }
  }
  /** Floating red "PRE MOVE" button for touch devices: drag-to-reposition
   *  (persisted), and a tap plays the engine's cached ponder line as a
   *  premove through the chess.com board's `game.premoves` API. */
  _createMobilePremoveBtn() {
    if (document.getElementById("ashina-mobile-premove-btn")) {
      return;
    }
    if (!document.getElementById("ashina-mobile-premove-style")) {
      const styleEl = document.createElement("style");
      styleEl.id = "ashina-mobile-premove-style";
      styleEl.textContent =
        "\n        #ashina-mobile-premove-btn {\n          position: fixed;\n          bottom: 80px;\n          left: 14px;\n          z-index: 99999;\n          width: 42px;\n          height: 42px;\n          border-radius: 50%;\n          background: rgba(0,0,0,0.42);\n          border: 1.5px solid rgba(255,51,51,0.6);\n          cursor: grab;\n          display: flex;\n          flex-direction: column;\n          align-items: center;\n          justify-content: center;\n          user-select: none;\n          -webkit-user-select: none;\n          touch-action: none;\n          transition: background 0.15s, border 0.15s;\n          gap: 1px;\n        }\n        #ashina-mobile-premove-btn.ashina-mpre-pressing {\n          background: rgba(255,51,51,0.18);\n          border: 1.5px solid rgba(255,51,51,0.9);\n          cursor: grabbing;\n        }\n        #ashina-mobile-premove-btn .ashina-mpre-line {\n          pointer-events: none;\n          color: rgba(255,255,255,0.65);\n          font-size: 7.5px;\n          font-weight: 700;\n          letter-spacing: 0.04em;\n          line-height: 1;\n          font-family: sans-serif;\n        }\n        #ashina-mobile-premove-btn.ashina-mpre-pressing .ashina-mpre-line {\n          color: rgba(255,255,255,0.95);\n        }\n      ";
      document.head.appendChild(styleEl);
    }
    const btn = document.createElement("button");
    btn.id = "ashina-mobile-premove-btn";
    btn.innerHTML =
      '\n      <span class="ashina-mpre-line">PRE</span>\n      <span class="ashina-mpre-line">MOVE</span>\n    ';
    document.body.appendChild(btn);
    const self = this;
    let isDragging = false;
    let startX;
    let startY;
    let originLeft;
    let originTop;
    let pointerMoved = false;
    btn.addEventListener(
      "touchstart",
      (event) => {
        const touch = event.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        const rect = btn.getBoundingClientRect();
        originLeft = rect.left;
        originTop = rect.top;
        isDragging = false;
        pointerMoved = false;
        btn.classList.add("ashina-mpre-pressing");
        event.preventDefault();
      },
      {
        passive: false,
      },
    );
    document.addEventListener(
      "touchmove",
      (event) => {
        if (!btn.classList.contains("ashina-mpre-pressing")) {
          return;
        }
        const touch = event.touches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;
        // Movement > 6px means "drag the button", not a tap.
        if (!pointerMoved && (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6)) {
          pointerMoved = true;
          isDragging = true;
        }
        if (isDragging) {
          btn.style.left = "auto";
          btn.style.right = "auto";
          btn.style.left = originLeft + deltaX + "px";
          btn.style.top = originTop + deltaY + "px";
          event.preventDefault();
        }
      },
      {
        passive: false,
      },
    );
    btn.addEventListener(
      "touchend",
      (event) => {
        if (!btn.classList.contains("ashina-mpre-pressing")) {
          return;
        }
        btn.classList.remove("ashina-mpre-pressing");
        if (isDragging) {
          if (typeof chrome !== "undefined" && chrome.storage) {
            const rect = btn.getBoundingClientRect();
            const pos = {
              top: rect.top,
              left: rect.left,
            };
            const payload = {
              "ashina-mpre-pos": pos,
            };
            chrome.storage.local.set(payload);
          }
        } else {
          // Tap (no drag): submit the last ponder line as a premove on the
          // chess.com board. The empty if/else blocks are guard clauses,
          // kept as-is from the original build.
          try {
            const engine = self.engine;
            if (!self.options["option-premove-enabled"]) {
            } else {
              const lastPonder = engine.lastPonder;
              if (!lastPonder) {
              } else {
                const boardEl = document.querySelector("wc-chess-board");
                if (!boardEl || !boardEl.game || !boardEl.game.premoves) {
                } else {
                  const premove = {
                    from: lastPonder.from,
                    to: lastPonder.to,
                  };
                  boardEl.game.premoves.move(premove);
                }
              }
            }
          } catch (error) {
            console.warn("[MobilePremove] tap hatası:", error);
          }
        }
        isDragging = false;
        pointerMoved = false;
        event.preventDefault();
      },
      {
        passive: false,
      },
    );
    btn.addEventListener("touchcancel", () => {
      btn.classList.remove("ashina-mpre-pressing");
      isDragging = false;
      pointerMoved = false;
    });
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.get(
        {
          "ashina-mpre-pos": null,
        },
        (stored) => {
          if (stored["ashina-mpre-pos"]) {
            btn.style.left = stored["ashina-mpre-pos"].left + "px";
            btn.style.top = stored["ashina-mpre-pos"].top + "px";
          }
        },
      );
    }
  }
  /** Remove the premove button (no timer to clear — taps are one-shot). */
  _removeMobilePremoveBtn() {
    const btn = document.getElementById("ashina-mobile-premove-btn");
    if (btn) {
      btn.remove();
    }
  }
  /** Show/hide the mobile premove button per "option-mobile-premove-btn". */
  applyMobilePremoveBtn(enabled) {
    if (enabled) {
      this._createMobilePremoveBtn();
    } else {
      this._removeMobilePremoveBtn();
    }
  }
  /** Lazily create the WebAudio context used for coach voice clips and
   *  unlock it: browsers start AudioContexts suspended until a user gesture,
   *  so any click/keypress resumes it. */
  _ensureAudioContext() {
    if (this._audioCtx) {
      return;
    }
    try {
      this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
      console.warn("[CoachAudio] AudioContext oluşturulamadı:", error);
    }
    const resumeAudioCtx = () => {
      if (this._audioCtx && this._audioCtx.state === "suspended") {
        this._audioCtx.resume();
      }
    };
    document.addEventListener("click", resumeAudioCtx, {
      once: false,
    });
    document.addEventListener("keydown", resumeAudioCtx, {
      once: false,
    });
  }
  /** Play a coach voice clip by key (e.g. "brilliant"). The content script
   *  does the fetching: we post "AsinaFetchAudio" and wait for the matching
   *  "AsinaFetchAudioResponse" (correlated via a unique requestId), then
   *  decode and play it through the WebAudio context. */
  playCoachAudio(audioKey) {
    if (!audioKey) {
      return;
    }
    this._ensureAudioContext();
    if (!this._audioCtx) {
      return;
    }
    // Stop any clip that is still playing before starting the new one.
    if (this._audioSource) {
      try {
        this._audioSource.stop();
      } catch (error) {}
      this._audioSource = null;
    }
    const audioCtx = this._audioCtx;
    // Clip URL: coach-provided base, else chess.com's David (en-US) voice bank.
    const audioBase =
      this.coach?._audioBase ||
      "https://text-and-audio.chess.com/prod/released/David_coach/en-US/";
    const audioUrl = audioBase + audioKey + ".mp3";
    const requestId = "audio_" + Date.now();
    // Decode + play path: buffer → WebAudio source → output; keep the source
    // in this._audioSource so a newer clip can stop it.
    const playBuffer = (audioBuffer) => {
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }
      source.start(0);
      this._audioSource = source;
    };
    const onResponse = (event) => {
      // Ignore responses for stale requests; the requestId acts as a nonce.
      if (event.detail.requestId !== requestId) {
        return;
      }
      window.removeEventListener("AsinaFetchAudioResponse", onResponse);
      if (event.detail.error) {
        console.warn(
          "[CoachAudio] fetch hatası:",
          event.detail.error,
          "| URL:",
          audioUrl,
        );
        return;
      }
      const audioBytes = new Uint8Array(event.detail.buffer);
      audioCtx
        .decodeAudioData(audioBytes.buffer)
        .then((decoded) => playBuffer(decoded))
        .catch((decodeError) =>
          console.warn("[CoachAudio] decode hatası:", decodeError),
        );
    };
    window.addEventListener("AsinaFetchAudioResponse", onResponse);
    const requestDetail = {
      url: audioUrl,
      requestId: requestId,
    };
    const requestEvent = {
      detail: requestDetail,
    };
    window.dispatchEvent(new CustomEvent("AsinaFetchAudio", requestEvent));
  }
  // Watcher state: 1s pollers for the auto-start-new-game clicker and the
  // clock-reload button, plus a latch so the new-game button is clicked once.
  _autoStartNewGameInterval = null;
  _clockReloadInterval = null;
  _autoStartNewGameClicked = false;
  /** Find the visible "new game" / "rematch" button on chess.com's game-over
   *  UI, trying the most specific selectors first and skipping hidden nodes
   *  (offsetParent === null). */
  _findNewGameButton() {
    const selectors = [
      'button[data-cy="new-game-button"]',
      'button[data-cy="rematch-button"]',
      ".game-over-buttons button.cc-button-primary",
      ".game-over-modal button.cc-button-primary",
      ".board-modal-container button.cc-button-primary",
      ".game-over-buttons-component button",
      "button.cc-button-secondary.cc-button-medium",
    ];
    for (const selector of selectors) {
      try {
        const candidate = document.querySelector(selector);
        if (candidate && candidate.offsetParent !== null) {
          return candidate;
        }
      } catch (error) {}
    }
    return null;
  }
  /** Poll once a second: when "AutoStartNewGame" + "AutoMoveEnabled" are on
   *  and a game-over button is visible, stop all running timers and click it
   *  (once per game) to start the next game immediately. */
  _startAutoStartNewGameWatcher() {
    if (this._autoStartNewGameInterval !== null) {
      return;
    }
    this._autoStartNewGameInterval = setInterval(() => {
      if (!getValueConfig(enumOptions.AutoStartNewGame)) {
        return;
      }
      if (!getValueConfig(enumOptions.AutoMoveEnabled)) {
        return;
      }
      if (this._autoStartNewGameClicked) {
        return;
      }
      const button = this._findNewGameButton();
      if (!button) {
        return;
      }
      // A new game is starting: kill the mobile repeat timers and any pending
      // auto-move so they don't fire into the finished position.
      try {
        if (this._mobilePlayInterval !== null) {
          clearInterval(this._mobilePlayInterval);
          this._mobilePlayInterval = null;
        }
        if (this._mobilePremoveInterval !== null) {
          clearInterval(this._mobilePremoveInterval);
          this._mobilePremoveInterval = null;
        }
        if (this.engine && this.engine.autoMoveTimer !== null) {
          clearTimeout(this.engine.autoMoveTimer);
          this.engine.autoMoveTimer = null;
        }
        button.click();
        this._autoStartNewGameClicked = true;
      } catch (error) {
        console.warn("[AutoStartNewGame] tıklama hatası:", error);
      }
    }, 1000);
  }
  /** Stop the auto-start poller (does not reset the clicked latch). */
  _stopAutoStartNewGameWatcher() {
    if (this._autoStartNewGameInterval !== null) {
      clearInterval(this._autoStartNewGameInterval);
      this._autoStartNewGameInterval = null;
    }
  }
  /** Insert a small reload button next to the board's ".clock-bottom" that
   *  dispatches "AsinaReloadEngine" (rebinds the engine, e.g. after the board
   *  re-rendered). Removed entirely in stream mode; idempotent — if the button
   *  is already in place it only re-syncs its size. */
  _insertClockReloadBtn() {
    try {
      // Stream mode: the button must never appear; remove a leftover one.
      if (getValueConfig("option-stream-mode")) {
        const existingBtn = document.getElementById("ashina-clock-reload-btn");
        if (existingBtn) {
          existingBtn.remove();
        }
        return;
      }
      const clockEl = document.querySelector(".clock-bottom");
      if (!clockEl || !clockEl.parentNode) {
        return;
      }
      let btn = document.getElementById("ashina-clock-reload-btn");
      if (btn && btn.isConnected && btn.nextElementSibling === clockEl) {
        this._syncClockReloadBtnSize(btn, clockEl);
        return;
      }
      if (btn) {
        btn.remove();
      }
      if (!document.getElementById("ashina-clock-reload-btn-style")) {
        const styleEl = document.createElement("style");
        styleEl.id = "ashina-clock-reload-btn-style";
        styleEl.textContent =
          "\n          #ashina-clock-reload-btn {\n            display: inline-flex;\n            align-items: center;\n            justify-content: center;\n            width: 20px;\n            height: 20px;\n            margin-right: 6px;\n            border: none;\n            border-radius: 6px;\n            background: rgba(255,255,255,0.1);\n            color: rgba(255,255,255,0.7);\n            cursor: pointer;\n            vertical-align: middle;\n            padding: 0;\n            flex-shrink: 0;\n            transition: background 0.15s, color 0.15s;\n          }\n          #ashina-clock-reload-btn:hover {\n            background: rgba(255,255,255,0.18);\n            color: #fff;\n          }\n          #ashina-clock-reload-btn svg {\n            display: block;\n          }\n          #ashina-clock-reload-btn.ashina-crb-spinning svg {\n            animation: ashina-crb-spin 0.6s linear;\n          }\n          @keyframes ashina-crb-spin {\n            from { transform: rotate(0deg); }\n            to   { transform: rotate(360deg); }\n          }\n        ";
        document.head.appendChild(styleEl);
      }
      btn = document.createElement("button");
      btn.id = "ashina-clock-reload-btn";
      btn.type = "button";
      btn.title = "Reload Engine (R)";
      btn.innerHTML =
        '\n        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">\n          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>\n          <path d="M3 3v5h5"/>\n        </svg>\n      ';
      btn.addEventListener("mousedown", (event) => event.stopPropagation());
      btn.addEventListener("touchstart", (event) => event.stopPropagation(), {
        passive: true,
      });
      // Click → ask the engine layer to reload; spin the icon for 600ms (one
      // animation cycle) as visual feedback.
      btn.addEventListener("click", (event) => {
        event.stopPropagation();
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("AsinaReloadEngine"));
        btn.classList.add("ashina-crb-spinning");
        setTimeout(() => btn.classList.remove("ashina-crb-spinning"), 600);
      });
      clockEl.parentNode.insertBefore(btn, clockEl);
      this._syncClockReloadBtnSize(btn, clockEl);
    } catch (error) {
      console.warn("[ClockReloadBtn] ekleme hatası:", error);
    }
  }
  /** Match the reload button to the clock's height, clamped to 22–48px, and
   *  scale the svg icon to ~55% of the button (min 10px). */
  _syncClockReloadBtnSize(btn, clockEl) {
    try {
      const clockRect = clockEl.getBoundingClientRect();
      let size = Math.round(clockRect.height);
      if (!size || size < 22) {
        size = 22;
      }
      if (size > 48) {
        size = 48;
      }
      if (btn.style.width !== size + "px") {
        btn.style.width = size + "px";
        btn.style.height = size + "px";
        const svg = btn.querySelector("svg");
        if (svg) {
          const iconSize = Math.max(10, Math.round(size * 0.55));
          svg.setAttribute("width", iconSize);
          svg.setAttribute("height", iconSize);
        }
      }
    } catch (error) {}
  }
  /** Keep the reload button in place: chess.com re-renders the clock area,
   *  so re-insert it every second (the insert call is idempotent). */
  _startClockReloadBtnWatcher() {
    if (this._clockReloadInterval !== null) {
      return;
    }
    this._insertClockReloadBtn();
    this._clockReloadInterval = setInterval(() => {
      this._insertClockReloadBtn();
    }, 1000);
  }
  /** Stop the poller and remove the button from the DOM. */
  _stopClockReloadBtnWatcher() {
    if (this._clockReloadInterval !== null) {
      clearInterval(this._clockReloadInterval);
      this._clockReloadInterval = null;
    }
    const btn = document.getElementById("ashina-clock-reload-btn");
    if (btn) {
      btn.remove();
    }
  }
}
