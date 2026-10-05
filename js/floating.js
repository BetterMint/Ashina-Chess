/* Ashina V6 - floating.js (deobfuscated from floating.orig.js)
 * Content script declared in manifest.json: renders the draggable ASHINA
 * floating panel (eval/depth/personality/auto-move toast) on chess.com and
 * lichess pages. Listens for AsinaEngineUpdate / BetterMintUpdateOptions
 * window events and chrome.runtime.onMessage; state in chrome.storage. */
"use strict";

(function () {
  // Panel state: currentLang is the active UI language; panelEl and the *El
  // vars are cached DOM refs (null while the panel is off-page); the option
  // fields mirror chrome.storage so labels render without storage reads.
  var currentLang = "en";
  var panelEl = null;
  var evalValueEl = null;
  var depthValueEl = null;
  var personalityEl = null;
  var automoveToastEl = null;
  var toastHideTimer = null;
  var automoveEnabled = null;
  var engineSource = "komodo";
  var maiaElo = 1500;
  var engineWsUrl = "";
  var ultrabulletEnabled = false;
  // Pretty names for the websocket engine endpoints (Rodent 3 / Patricia 3
  // personalities hosted on Hugging Face Spaces).
  var wsUrlLabels = {
    "wss://ProtonnDev-engine.hf.space/rodent3-default": "Rodent 3 - Default",
    "wss://ProtonnDev-engine.hf.space/rodent3-fischer": "Rodent 3 - Fischer",
    "wss://ProtonnDev-engine.hf.space/rodent3-anand": "Rodent 3 - Anand",
    "wss://ProtonnDev-engine.hf.space/rodent3-reti": "Rodent 3 - Reti",
    "wss://ProtonnDev-engine.hf.space/rodent3-botvinnik":
      "Rodent 3 - Botvinnik",
    "wss://ProtonnDev-engine.hf.space/rodent3-marshall": "Rodent 3 - Marshall",
    "wss://ProtonnDev-engine.hf.space/rodent3-larsen": "Rodent 3 - Larsen",
    "wss://ProtonnDev-engine.hf.space/rodent3-spassky": "Rodent 3 - Spassky",
    "wss://ProtonnDev-engine.hf.space/rodent3-petrosian":
      "Rodent 3 - Petrosian",
    "wss://ProtonnDev-engine.hf.space/rodent3-tarrasch": "Rodent 3 - Tarrasch",
    "wss://ProtonnDev-engine.hf.space/rodent3-nimzowitsch":
      "Rodent 3 - Nimzowitsch",
    "wss://ProtonnDev-engine.hf.space/rodent3-rubinstein":
      "Rodent 3 - Rubinstein",
    "wss://ProtonnDev-engine.hf.space/rodent3-anderssen":
      "Rodent 3 - Anderssen",
    "wss://ProtonnDev-engine.hf.space/rodent3-steinitz": "Rodent 3 - Steinitz",
    "wss://ProtonnDev-engine.hf.space/rodent3-kinghunter":
      "Rodent 3 - KingHunter",
    "wss://ProtonnDev-engine.hf.space/rodent3-tortoise": "Rodent 3 - Tortoise",
    "wss://ProtonnDev-engine.hf.space/rodent3-drunk": "Rodent 3 - Drunk",
    "wss://ProtonnDev-engine.hf.space/patricia-1100": "Patricia 3 - 1100",
    "wss://ProtonnDev-engine.hf.space/patricia-1200": "Patricia 3 - 1200",
    "wss://ProtonnDev-engine.hf.space/patricia-1300": "Patricia 3 - 1300",
    "wss://ProtonnDev-engine.hf.space/patricia-1400": "Patricia 3 - 1400",
    "wss://ProtonnDev-engine.hf.space/patricia-1500": "Patricia 3 - 1500",
    "wss://ProtonnDev-engine.hf.space/patricia-1600": "Patricia 3 - 1600",
    "wss://ProtonnDev-engine.hf.space/patricia-1700": "Patricia 3 - 1700",
    "wss://ProtonnDev-engine.hf.space/patricia-1800": "Patricia 3 - 1800",
    "wss://ProtonnDev-engine.hf.space/patricia-1900": "Patricia 3 - 1900",
    "wss://ProtonnDev-engine.hf.space/patricia-2000": "Patricia 3 - 2000",
    "wss://ProtonnDev-engine.hf.space/patricia-2100": "Patricia 3 - 2100",
    "wss://ProtonnDev-engine.hf.space/patricia-2200": "Patricia 3 - 2200",
    "wss://ProtonnDev-engine.hf.space/patricia-2300": "Patricia 3 - 2300",
    "wss://ProtonnDev-engine.hf.space/patricia-2400": "Patricia 3 - 2400",
    "wss://ProtonnDev-engine.hf.space/patricia-2500": "Patricia 3 - 2500",
    "wss://ProtonnDev-engine.hf.space/patricia-2600": "Patricia 3 - 2600",
    "wss://ProtonnDev-engine.hf.space/patricia-2700": "Patricia 3 - 2700",
    "wss://ProtonnDev-engine.hf.space/patricia-2800": "Patricia 3 - 2800",
    "wss://ProtonnDev-engine.hf.space/patricia-2900": "Patricia 3 - 2900",
    "wss://ProtonnDev-engine.hf.space/patricia-3000": "Patricia 3 - 3000",
  };
  // Flash the AUTO MOVE ON/OFF toast; it hides itself after 1s
  // (toastHideTimer is reset when a new toast arrives first).
  function showAutomoveToast(enabled) {
    if (!automoveToastEl) {
      return;
    }
    if (toastHideTimer) {
      clearTimeout(toastHideTimer);
      toastHideTimer = null;
    }
    automoveToastEl.textContent = enabled ? "AUTO MOVE ON" : "AUTO MOVE OFF";
    automoveToastEl.className = enabled
      ? "afp-toast-on afp-toast-visible"
      : "afp-toast-off afp-toast-visible";
    toastHideTimer = setTimeout(function () {
      automoveToastEl.classList.remove("afp-toast-visible");
      toastHideTimer = null;
    }, 1000);
  }
  // Mouse + touch dragging for the panel. Pointer and panel position are
  // captured at drag start (offsetLeft/offsetTop) so the panel follows the
  // pointer delta; touch listeners are non-passive so preventDefault works.
  function makeDraggable(element) {
    var isDragging = false;
    var startX;
    var startY;
    var startLeft;
    var startTop;
    element.addEventListener("mousedown", function (event) {
      isDragging = true;
      startX = event.clientX;
      startY = event.clientY;
      startLeft = element.offsetLeft;
      startTop = element.offsetTop;
      element.style.cursor = "grabbing";
      event.preventDefault();
    });
    document.addEventListener("mousemove", function (event) {
      if (!isDragging) {
        return;
      }
      var deltaX = event.clientX - startX;
      var deltaY = event.clientY - startY;
      element.style.right = "auto";
      element.style.left = startLeft + deltaX + "px";
      element.style.top = startTop + deltaY + "px";
    });
    document.addEventListener("mouseup", function () {
      if (!isDragging) {
        return;
      }
      isDragging = false;
      element.style.cursor = "grab";
    });
    element.addEventListener(
      "touchstart",
      function (event) {
        var touch = event.touches[0];
        isDragging = true;
        startX = touch.clientX;
        startY = touch.clientY;
        startLeft = element.offsetLeft;
        startTop = element.offsetTop;
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
        element.style.right = "auto";
        element.style.left = startLeft + (touch.clientX - startX) + "px";
        element.style.top = startTop + (touch.clientY - startY) + "px";
        event.preventDefault();
      },
      {
        passive: false,
      },
    );
    document.addEventListener("touchend", function () {
      isDragging = false;
    });
  }
  // Build the panel DOM once (id "asina-floating-panel"), cache the element
  // refs, paint the labels, wire the reload button, and enable dragging.
  // Reload-button handlers stopPropagation so pressing it never drags the panel.
  function createPanel() {
    if (panelEl) {
      return;
    }
    panelEl = document.createElement("div");
    panelEl.id = "asina-floating-panel";
    panelEl.style.cursor = "grab";
    panelEl.innerHTML =
      '\n      <div class="afp-header">\n        <div class="afp-brand">\n          <span class="afp-name">ASHINA</span>\n        </div>\n        <button id="afp-reload-btn" title="Reload Engine (R)">\n          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">\n            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>\n            <path d="M3 3v5h5"/>\n          </svg>\n        </button>\n      </div>\n      <div class="afp-stats">\n        <div class="afp-stat">\n          <div class="afp-stat-label" id="afp-label-eval">EVALUATION</div>\n          <div class="afp-stat-val afp-neutral" id="afp-eval">—</div>\n        </div>\n        <div class="afp-stat">\n          <div class="afp-stat-label" id="afp-label-depth">DEPTH</div>\n          <div class="afp-stat-val" id="afp-depth">—</div>\n        </div>\n      </div>\n      <div class="afp-personality" id="afp-personality">Default</div>\n      <div id="afp-automove-toast"></div>\n    ';
    document.body.appendChild(panelEl);
    evalValueEl = document.getElementById("afp-eval");
    depthValueEl = document.getElementById("afp-depth");
    personalityEl = document.getElementById("afp-personality");
    automoveToastEl = document.getElementById("afp-automove-toast");
    applyLanguage(currentLang);
    var reloadBtn = document.getElementById("afp-reload-btn");
    if (reloadBtn) {
      reloadBtn.addEventListener("mousedown", function (event) {
        event.stopPropagation();
      });
      reloadBtn.addEventListener(
        "touchstart",
        function (event) {
          event.stopPropagation();
        },
        {
          passive: true,
        },
      );
      // Click: ask the page-side engine to reload (AsinaReloadEngine), then
      // spin the icon for 600ms as visual feedback.
      reloadBtn.addEventListener("click", function (event) {
        event.stopPropagation();
        window.dispatchEvent(new CustomEvent("AsinaReloadEngine"));
        reloadBtn.classList.add("afp-spinning");
        setTimeout(function () {
          reloadBtn.classList.remove("afp-spinning");
        }, 600);
      });
    }
    makeDraggable(panelEl);
    if (engineSource === "maia") {
      updateDepthLabel(true);
    } else if (engineSource === "websocket") {
      updateWebsocketLabel(engineWsUrl);
    }
  }
  // Re-render the static labels (EVALUATION / DEPTH / personality line) in
  // the given language via the global i18n helper ashina_t(). For maia the
  // depth column is labelled ELO instead.
  function applyLanguage(lang) {
    currentLang = lang;
    if (!panelEl) {
      return;
    }
    var evalLabelEl = document.getElementById("afp-label-eval");
    var depthLabelEl = document.getElementById("afp-label-depth");
    if (evalLabelEl) {
      evalLabelEl.textContent = ashina_t(lang, "fpEvaluation");
    }
    if (depthLabelEl) {
      depthLabelEl.textContent =
        engineSource === "maia"
          ? ashina_t(lang, "fpElo") || "ELO"
          : ashina_t(lang, "fpDepth");
    }
    if (personalityEl && ultrabulletEnabled) {
      personalityEl.textContent = "ULTRABULLET MODE";
    } else if (personalityEl && engineSource === "websocket") {
      updateWebsocketLabel(engineWsUrl);
    } else if (personalityEl && engineSource === "maia") {
      personalityEl.textContent = "MAIA 3";
    } else if (personalityEl) {
      chrome.storage.sync.get(
        {
          "option-personality": "Default",
        },
        function (opts) {
          if (
            personalityEl &&
            !ultrabulletEnabled &&
            engineSource !== "websocket"
          ) {
            personalityEl.textContent =
              ashina_t(lang, "pers" + opts["option-personality"]) ||
              opts["option-personality"];
          }
        },
      );
    }
  }
  // Tear the panel down and clear all cached refs and the toast timer.
  function removePanel() {
    if (panelEl) {
      panelEl.remove();
      panelEl = null;
      evalValueEl = null;
      depthValueEl = null;
      personalityEl = null;
      automoveToastEl = null;
      if (toastHideTimer) {
        clearTimeout(toastHideTimer);
        toastHideTimer = null;
      }
    }
  }
  // "AsinaEngineUpdate" window event (fired by the page-side engine):
  // refresh the eval/depth readout. detail = { depth, cp, mate } with cp in
  // centipawns. Maia shows ELO instead of depth, so depth is skipped there.
  function handleEngineUpdate(event) {
    if (!panelEl || !evalValueEl || !depthValueEl) {
      return;
    }
    var detail = event.detail;
    if (engineSource !== "maia") {
      depthValueEl.textContent = detail.depth;
    }
    // Eval display: mate scores render as "M<n>" (sign shown via color),
    // centipawns as pawns with an explicit "+", else an em dash; within
    // ±0.1 pawns the value counts as neutral so tiny evals don't flash.
    var evalText;
    var evalClass;
    if (detail.mate !== null) {
      evalText = "M" + Math.abs(detail.mate);
      evalClass = detail.mate > 0 ? "afp-positive" : "afp-negative";
    } else if (detail.cp !== null) {
      var pawnEval = detail.cp / 100;
      evalText = (pawnEval >= 0 ? "+" : "") + pawnEval.toFixed(1);
      evalClass =
        pawnEval > 0.1
          ? "afp-positive"
          : pawnEval < -0.1
            ? "afp-negative"
            : "afp-neutral";
    } else {
      evalText = "—";
      evalClass = "afp-neutral";
    }
    evalValueEl.textContent = evalText;
    evalValueEl.className = "afp-stat-val " + evalClass;
  }
  window.addEventListener("AsinaEngineUpdate", handleEngineUpdate);
  // No-op placeholder kept from the original: it was meant to react to the
  // "ashina-engine-connected" flag but never got a body. Left as-is to
  // preserve behavior.
  function handleEngineConnected(connected) {}
  // Read the engine-connected flag once, then keep following it via
  // storage.onChanged (other extension parts write it).
  chrome.storage.local.get(
    {
      "ashina-engine-connected": false,
    },
    function (opts) {
      handleEngineConnected(opts["ashina-engine-connected"]);
    },
  );
  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area === "local" && changes["ashina-engine-connected"]) {
      handleEngineConnected(changes["ashina-engine-connected"].newValue);
    }
  });
  // Show (create) or hide (remove) the whole panel.
  function setPanelVisible(visible) {
    if (visible) {
      createPanel();
    } else {
      removePanel();
    }
  }
  // Render the personality line: ULTRABULLET MODE / MAIA 3 / websocket
  // engine name / localized personality name (falls back to the raw name,
  // then to the localized "Default").
  function updatePersonalityLabel(personality) {
    if (!personalityEl) {
      return;
    }
    if (ultrabulletEnabled) {
      personalityEl.textContent = "ULTRABULLET MODE";
    } else if (engineSource === "maia") {
      personalityEl.textContent = "MAIA 3";
    } else if (engineSource === "websocket") {
      updateWebsocketLabel(engineWsUrl);
    } else {
      personalityEl.textContent =
        ashina_t(currentLang, "pers" + personality) ||
        personality ||
        ashina_t(currentLang, "fpDefault");
    }
  }
  // Refresh the second stat row for the active engine source: maia shows
  // the ELO value instead of depth, websocket shows the engine name, komodo
  // shows the localized personality name.
  function updateDepthLabel(isMaia) {
    var depthLabelEl = document.getElementById("afp-label-depth");
    if (!depthLabelEl || !depthValueEl || !personalityEl) {
      return;
    }
    if (ultrabulletEnabled) {
      depthLabelEl.textContent = ashina_t(currentLang, "fpDepth");
      personalityEl.textContent = "ULTRABULLET MODE";
    } else if (isMaia) {
      depthLabelEl.textContent = ashina_t(currentLang, "fpElo") || "ELO";
      depthValueEl.textContent = maiaElo;
      personalityEl.textContent = "MAIA 3";
    } else if (engineSource === "websocket") {
      depthLabelEl.textContent = ashina_t(currentLang, "fpDepth");
      updateWebsocketLabel(engineWsUrl);
    } else {
      depthLabelEl.textContent = ashina_t(currentLang, "fpDepth");
      chrome.storage.sync.get(
        {
          "option-personality": "Default",
        },
        function (opts) {
          if (
            personalityEl &&
            !ultrabulletEnabled &&
            engineSource !== "websocket"
          ) {
            personalityEl.textContent =
              ashina_t(currentLang, "pers" + opts["option-personality"]) ||
              opts["option-personality"] ||
              ashina_t(currentLang, "fpDefault");
          }
        },
      );
    }
  }
  // Personality line for websocket engines: pretty name from wsUrlLabels.
  function updateWebsocketLabel(wsUrl) {
    if (!personalityEl) {
      return;
    }
    personalityEl.textContent = wsUrlLabels[wsUrl] || "Rodent 3";
  }
  // Initial load: pull all panel-related options (defaults match the options
  // page) into the state vars, then build/hide the panel and paint the
  // engine-specific labels.
  chrome.storage.sync.get(
    {
      "option-info-panel": false,
      "option-personality": "Default",
      "option-language": "en",
      "option-automove-enabled": false,
      "option-engine-source": "komodo",
      "option-maia-elo": 1500,
      "option-url-api-stockfish":
        "wss://ProtonnDev-engine.hf.space/rodent3-default",
      "option-ultrabullet-enabled": false,
    },
    function (opts) {
      currentLang = opts["option-language"] || "en";
      automoveEnabled = !!opts["option-automove-enabled"];
      engineSource = opts["option-engine-source"] || "komodo";
      maiaElo = parseInt(opts["option-maia-elo"]) || 1500; // 1500 = default Maia ELO
      engineWsUrl =
        opts["option-url-api-stockfish"] ||
        "wss://ProtonnDev-engine.hf.space/rodent3-default";
      ultrabulletEnabled = !!opts["option-ultrabullet-enabled"];
      setPanelVisible(opts["option-info-panel"]);
      updatePersonalityLabel(opts["option-personality"]);
      if (engineSource === "maia") {
        updateDepthLabel(true);
      } else if (engineSource === "websocket") {
        updateWebsocketLabel(engineWsUrl);
      }
    },
  );
  // Update the automove flag; the toast only fires when the value actually
  // changed.
  function setAutomoveEnabled(enabled) {
    var nextValue = !!enabled;
    if (automoveEnabled === nextValue) {
      return;
    }
    automoveEnabled = nextValue;
    showAutomoveToast(nextValue);
  }
  // Page-level scripts broadcast option changes via this window event
  // (legacy BetterMint protocol); only the automove flag is consumed here.
  window.addEventListener("BetterMintUpdateOptions", function (event) {
    if (
      event.detail &&
      typeof event.detail["option-automove-enabled"] !== "undefined"
    ) {
      setAutomoveEnabled(event.detail["option-automove-enabled"]);
    }
  });
  // Messages from the options page / background: "UpdateOptions" carries
  // changed settings, "UpdateLanguage" the UI language.
  chrome.runtime.onMessage.addListener(function (message) {
    if (message && message.type === "UpdateOptions" && message.data) {
      if (typeof message.data["option-info-panel"] !== "undefined") {
        setPanelVisible(message.data["option-info-panel"]);
      }
      if (typeof message.data["option-ultrabullet-enabled"] !== "undefined") {
        ultrabulletEnabled = !!message.data["option-ultrabullet-enabled"];
        if (personalityEl) {
          updatePersonalityLabel(message.data["option-personality"]);
        }
      }
      if (typeof message.data["option-personality"] !== "undefined") {
        updatePersonalityLabel(message.data["option-personality"]);
      }
      // Engine source changed: pick up maia-elo / ws-url in the same pass,
      // then re-render the stat row. If the source stayed the same, only
      // the affected value is refreshed.
      if (typeof message.data["option-engine-source"] !== "undefined") {
        var newSource = message.data["option-engine-source"];
        var sourceChanged = engineSource !== newSource;
        engineSource = newSource;
        if (typeof message.data["option-maia-elo"] !== "undefined") {
          maiaElo = parseInt(message.data["option-maia-elo"]) || 1500; // 1500 = default Maia ELO
        }
        if (typeof message.data["option-url-api-stockfish"] !== "undefined") {
          engineWsUrl = message.data["option-url-api-stockfish"];
        }
        if (sourceChanged) {
          updateDepthLabel(engineSource === "maia");
        } else if (engineSource === "maia" && depthValueEl) {
          depthValueEl.textContent = maiaElo;
        } else if (engineSource === "websocket") {
          updateWebsocketLabel(engineWsUrl);
        }
      } else {
        if (typeof message.data["option-maia-elo"] !== "undefined") {
          maiaElo = parseInt(message.data["option-maia-elo"]) || 1500; // 1500 = default Maia ELO
          if (engineSource === "maia" && depthValueEl) {
            depthValueEl.textContent = maiaElo;
          }
        }
        if (typeof message.data["option-url-api-stockfish"] !== "undefined") {
          engineWsUrl = message.data["option-url-api-stockfish"];
          if (engineSource === "websocket") {
            updateWebsocketLabel(engineWsUrl);
          }
        }
      }
      if (typeof message.data["option-automove-enabled"] !== "undefined") {
        setAutomoveEnabled(message.data["option-automove-enabled"]);
      }
    }
    if (message.type === "UpdateLanguage" && message.lang) {
      applyLanguage(message.lang);
    }
  });
})();
