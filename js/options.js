// ─── js/options.js · options popup page script (html/options.html) ───
// Defines DEFAULTS, wires the slider/checkbox/select UI, broadcasts
// RestoreOptions / OnOptionsChange (UpdateOptions) to all tabs, handles
// language switching (i18n) and config import/export. Turkish comments
// preserved from the original.
"use strict";

const CHECKMARK_SVG = '<svg viewBox="0 0 10 10" width="10" height="10"><polyline points="1.5,5 4,7.5 8.5,2.5" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const CHECKBOX_KEYS = [
  "option-evaluation-bar",
  "option-depth-bar",
  "option-info-panel",
  "option-limit-strength",
  "option-auto-skill",
  "option-own-book",
  "option-chess960",
  "option-best-book-line",
  "option-limit-book-moves",
  "option-hide-arrows",
  "option-hide-players",
  "option-coach-enabled",
  "option-pre-analyze-enabled",
  "option-coach-move-feedback",
  "option-coach-accuracy",
  "option-coach-voice-enabled",
  "option-coach-recap",
  "option-automove-enabled",
  "option-autostart-newgame",
  "option-flag-mode-enabled",
  "option-instant-recapture",
  "option-fast-simple-moves",
  "option-simulate-checkmates",
  "option-blunder-react",          // ← YENİ
  "option-stream-mode",            // ← STREAM MODE
  "option-mobile-play-btn",
  "option-mobile-premove-btn",
  "option-premove-enabled",
  "option-autopremove-enabled",
  "option-autopremove-mates-enabled",
  "option-autopremove-checking-fork-enabled",
  "option-checkmove-enabled",
  "option-ultrabullet-enabled",           // ← ULTRABULLET MOD
  "option-ultrabullet-react-to-check",    // ← ULTRABULLET MOD
  "option-ultrabullet-follow-through-attack", // ← ULTRABULLET MOD
  "option-ultrabullet-guard-queen",       // ← ULTRABULLET MOD
  "option-ultrabullet-flag-mode-enabled", // ← ULTRABULLET MOD (FLAG MODE)
];

const SLIDER_KEYS = [
  "option-depth",
  "option-multipv",
  "option-pred-depth",
  "option-uci-elo",
  "option-hash",
  "option-book-moves",
  "option-coach-depth",
  "option-coach-voice",
  "option-automove-min",
  "option-automove-max",
  "option-automove-centerweight",
  "option-ultrabullet-min",               // ← ULTRABULLET MOD
  "option-ultrabullet-max",               // ← ULTRABULLET MOD
  "option-ultrabullet-premove-chance",    // ← ULTRABULLET MOD
  "option-ultrabullet-premove-chain-limit", // ← ULTRABULLET MOD
  "option-ultrabullet-checkmove-chance",  // ← ULTRABULLET MOD
  "option-ultrabullet-lefong-trap-chance", // ← ULTRABULLET MOD
  "option-ultrabullet-ignore-captures",   // ← ULTRABULLET MOD
  "option-ultrabullet-ignore-recapture",  // ← ULTRABULLET MOD
];

const DEFAULTS = {
  "option-color-best-arrow":  "#FF3333",
  "option-color-other-arrow": "#FECA57",
  "option-url-api-stockfish": "wss://ProtonnDev-engine.hf.space/rodent3-default",
  "option-api-stockfish":     true,
  "option-show-hints":        true,
  "option-move-analysis":     false,
  "option-evaluation-bar":    true,
  "option-depth-bar":         true,
  "option-info-panel":        false,
  "option-depth":             6,
  "option-multipv":           5,
  "option-pred-depth":        6,
  "option-uci-elo":           3500,
  "option-hash":              64,
  "option-personality":       "Human",
  "option-limit-strength":    false,
  "option-auto-skill":        false,
  "option-own-book":          true,
  "option-chess960":          false,
  "option-best-book-line":    true,
  "option-limit-book-moves":  false,
  "option-book-moves":        5,
  "option-hide-arrows":        false,
  "option-hide-players":       false,
  "option-fake-title":         "none",
  "option-engine-source":      "komodo",
  "option-maia-elo":           1500,
  "option-language":           "en",
  "option-theme":               (typeof DEFAULT_THEME_KEY !== "undefined" ? DEFAULT_THEME_KEY : "ashina-red"),
  "option-coach-enabled":      true,
  "option-pre-analyze-enabled": false,
  "option-coach-move-feedback": true,
  "option-coach-accuracy":     true,
  "option-coach-voice-enabled":  true,
  "option-coach-recap":        true,
  "option-coach-depth":        10,
  "option-coach-voice":        "david",
  "option-coach-locale":       "en-US",  // ADIM 5a: YENİ
  "option-automove-enabled":          false,
  "option-autostart-newgame":         false,
  "option-automove-min":              500,
  "option-automove-max":              3200,
  "option-automove-centerweight":     3,
  "option-flag-mode-enabled":         false,
  "option-instant-recapture":         false,
  "option-fast-simple-moves":         false,
  "option-simulate-checkmates":       false,
  "option-blunder-react":             false,   // ← YENİ
  "option-stream-mode":               false,   // ← STREAM MODE
  "option-move-method":               "teleport",
  "option-smart-timing-profile":      "bullet", // ← YENİ
  "option-mobile-play-btn":            false,
  "option-mobile-premove-btn":         false,
  "option-premove-enabled":           false,
  "option-autopremove-enabled":              false,
  "option-autopremove-mates-enabled":        false,
  "option-autopremove-checking-fork-enabled": false,
  "option-checkmove-enabled":         false,
  "option-opening-white-1":           "none",
  "option-opening-white-2":           "none",
  "option-opening-black-1":           "none",
  "option-opening-black-2":           "none",
  // ── ULTRABULLET MOD ──
  "option-ultrabullet-enabled":            false,
  "option-ultrabullet-min":                300,
  "option-ultrabullet-max":                800,
  "option-ultrabullet-premove-chance":     40,
  "option-ultrabullet-premove-chain-limit": 3,
  "option-ultrabullet-checkmove-chance":   20,
  "option-ultrabullet-lefong-trap-chance": 30,
  "option-ultrabullet-ignore-captures":    80,
  "option-ultrabullet-ignore-recapture":   50,
  "option-ultrabullet-react-to-check":     true,
  "option-ultrabullet-follow-through-attack": true,
  "option-ultrabullet-guard-queen":        false,
  "option-ultrabullet-flag-mode-enabled":  true,
  "option-ultrabullet-opening-preference": "none",
};

/* ── Config Import / Export — sadece bu key'ler dahil edilir ──
   NOT: Bu liste DEFAULTS'tan bilerek ayrı tutulur. Export bu key'lerin
   DIŞINDAKİ hiçbir ayarı yazmaz; Import ise yalnızca gönderilen ve bu
   listede bulunan key'leri günceller, geri kalan tüm ayarlar
   chrome.storage.sync'te ne ise o şekilde kalır (kısmi güncelleme). */
const IMPORT_EXPORT_KEYS = [
  // Engine sayfası (opening preference hariç)
  "option-engine-source",
  "option-depth",
  "option-multipv",
  "option-pred-depth",
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
  // Maia3 (backend = maia3 seçiliyken kullanılan config)
  "option-maia-elo",
  // Rodent (backend = rodent seçiliyken kullanılan config)
  "option-url-api-stockfish",
  // Automove sayfası (checkmove ve move-method hariç)
  "option-automove-enabled",
  "option-autostart-newgame",
  "option-automove-min",
  "option-automove-max",
  "option-automove-centerweight",
  "option-smart-timing-profile",
  "option-fast-simple-moves",
  "option-simulate-checkmates",
  "option-blunder-react",
  "option-flag-mode-enabled",
  "option-instant-recapture",
  "option-premove-enabled",
  "option-autopremove-enabled",
  "option-autopremove-mates-enabled",
  "option-autopremove-checking-fork-enabled",
  // Ultrabullet Mod
  "option-ultrabullet-enabled",
  "option-ultrabullet-min",
  "option-ultrabullet-max",
  "option-ultrabullet-premove-chance",
  "option-ultrabullet-premove-chain-limit",
  "option-ultrabullet-checkmove-chance",
  "option-ultrabullet-lefong-trap-chance",  "option-ultrabullet-ignore-captures",
  "option-ultrabullet-ignore-recapture",
  "option-ultrabullet-react-to-check",
  "option-ultrabullet-follow-through-attack",
  "option-ultrabullet-guard-queen",
  "option-ultrabullet-flag-mode-enabled",
  "option-ultrabullet-opening-preference",
];

// Hash slider: sadece 2'nin kuvvetleri
const HASH_VALUES = [64, 128, 256, 512, 1024];
function hashIndexToMB(index) { return HASH_VALUES[Math.min(index, HASH_VALUES.length - 1)]; }
function hashMBToIndex(mb) {
  const idx = HASH_VALUES.indexOf(parseInt(mb));
  return idx === -1 ? 0 : idx;
}

/* ── UI helpers ── */
function setCheckboxUI(key, value) {
  const box = document.getElementById("box-" + key);
  if (!box) return;
  if (value) {
    box.classList.remove("off");
    box.innerHTML = CHECKMARK_SVG;
  } else {
    box.classList.add("off");
    box.innerHTML = "";
  }
}

// [BUG FIX — M tuşu UI'da yansımıyordu] M tuşu artık main world'den
// chrome.storage.sync'e doğrudan yazıyor (bkz. loader.js/lichess-loader.js
// "AsinaPersistOption" köprüsü) — chrome.storage.sync.set() her zaman
// chrome.storage.onChanged'i TÜM context'lerde (bu popup dahil) tetikler.
// Popup açıkken M'ye basılırsa, checkbox'ın da anında güncellenmesi için.
// Sadece CHECKBOX_KEYS'teki (bilinen checkbox) key'ler için çalışır — diğer
// (slider/dropdown) ayarlara dokunmaz, mevcut click-handler'daki (satır
// ~1155-1168) yan etkilerle aynı küçük seti tetikler.
chrome.storage.onChanged.addListener(function(changes, area) {
  if (area !== "sync") return;
  for (const key in changes) {
    if (!CHECKBOX_KEYS.includes(key)) continue;
    const box = document.getElementById("box-" + key);
    if (!box) continue; // popup'ta bu tab/eleman şu an render edilmemiş olabilir
    setCheckboxUI(key, !!changes[key].newValue);
    if (key === "option-coach-enabled" || key === "option-pre-analyze-enabled") updateCoachSubOptionsState();
    if (key === "option-automove-enabled") updateAutoMoveSubOptionsState();
    if (key === "option-automove-enabled" || key === "option-premove-enabled") updateAutoPremoveSubOptionsState();
    if (key === "option-limit-strength") updateEloSliderState();
    if (key === "option-limit-book-moves") updateBookMovesSliderState();
    if (key === "option-ultrabullet-enabled") updateUltrabulletLockState();
  }
});

function getThemeAccentColor() {
  var v = getComputedStyle(document.documentElement).getPropertyValue("--theme-accent");
  return v ? v.trim() : "#FF3333";
}

function setSliderBackground(el) {
  const pct = ((el.value - el.min) / (el.max - el.min)) * 100;
  el.style.background = `linear-gradient(90deg, ${getThemeAccentColor()} ${pct}%, #333 ${pct}%)`;
}

/* ── Tab switching ── */
function switchTab(tab) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("tab-" + tab).classList.add("active");
  document.getElementById("page-" + tab).classList.add("active");
}

/* ── Read current values from UI ── */
function readOptions() {
  const opts = Object.assign({}, DEFAULTS);

  const themeSel = document.getElementById("theme-select");
  if (themeSel) opts["option-theme"] = themeSel.value;

  CHECKBOX_KEYS.forEach(key => {
    const box = document.getElementById("box-" + key);
    if (box) opts[key] = !box.classList.contains("off");
  });

  SLIDER_KEYS.forEach(key => {
    const el = document.getElementById(key);
    if (!el) return;
    if (key === "option-hash") {
      opts[key] = hashIndexToMB(parseInt(el.value));
    } else {
      opts[key] = parseInt(el.value);
    }
  });

  const pers = document.getElementById("option-personality");
  if (pers) opts["option-personality"] = pers.value;

  const engineSource = document.getElementById("option-engine-source");
  if (engineSource) opts["option-engine-source"] = engineSource.value;

  const urlApiStockfish = document.getElementById("option-url-api-stockfish");
  if (urlApiStockfish) opts["option-url-api-stockfish"] = urlApiStockfish.value;

  const coachVoiceSel = document.getElementById("option-coach-voice");
  if (coachVoiceSel) opts["option-coach-voice"] = coachVoiceSel.value;

  const fakeTitleSel = document.getElementById("option-fake-title");
  if (fakeTitleSel) opts["option-fake-title"] = fakeTitleSel.value;

  const moveMethodSel = document.getElementById("option-move-method");
  if (moveMethodSel) opts["option-move-method"] = moveMethodSel.value;

  const moveMethodActive = document.querySelector(".move-method-pill.active");
  if (moveMethodActive) opts["option-move-method"] = moveMethodActive.dataset.value;

  const smartTimingProfileSel = document.getElementById("select-smart-timing-profile");
  if (smartTimingProfileSel) opts["option-smart-timing-profile"] = smartTimingProfileSel.value;

  const coachLocaleSel = document.getElementById("option-coach-locale"); // ADIM 5b: YENİ
  if (coachLocaleSel) opts["option-coach-locale"] = coachLocaleSel.value; // ADIM 5b: YENİ

  const maiaEloEl = document.getElementById("option-maia-elo");
  if (maiaEloEl) opts["option-maia-elo"] = parseInt(maiaEloEl.value);


  const bestColor = document.getElementById("option-color-best-arrow");
  if (bestColor) opts["option-color-best-arrow"] = bestColor.value;

  const otherColor = document.getElementById("option-color-other-arrow");
  if (otherColor) opts["option-color-other-arrow"] = otherColor.value;

  const openingWhite1 = document.getElementById("opening-white-1");
  if (openingWhite1) opts["option-opening-white-1"] = openingWhite1.value;

  const openingWhite2 = document.getElementById("opening-white-2");
  if (openingWhite2) opts["option-opening-white-2"] = openingWhite2.value;

  const openingBlack1 = document.getElementById("opening-black-1");
  if (openingBlack1) opts["option-opening-black-1"] = openingBlack1.value;

  const openingBlack2 = document.getElementById("opening-black-2");
  if (openingBlack2) opts["option-opening-black-2"] = openingBlack2.value;

  const ultrabulletOpeningPref = document.getElementById("option-ultrabullet-opening-preference");
  if (ultrabulletOpeningPref) opts["option-ultrabullet-opening-preference"] = ultrabulletOpeningPref.value;

  return opts;
}

/* ── Engine source UI toggle ── */
function applyEngineSourceUI(source) {
  const komodo    = document.getElementById("komodo-options");
  const maia      = document.getElementById("maia-options");
  const websocket = document.getElementById("websocket-options");
  if (!komodo || !maia) return;

  komodo.style.display    = (source === "komodo")    ? "" : "none";
  maia.style.display      = (source === "maia")       ? "" : "none";
  if (websocket) websocket.style.display = (source === "websocket") ? "" : "none";

  // Maia3 seçiliyken Smart Timing ve Premove gruplarını gizle
  const isMaia = (source === "maia");
  const smartTimingSection = document.getElementById("smart-timing-section");
  const premoveSection     = document.getElementById("premove-section");
  if (smartTimingSection) smartTimingSection.style.display = isMaia ? "none" : "";
  if (premoveSection)     premoveSection.style.display     = isMaia ? "none" : "";
}

/* ── Save & broadcast ── */
function OnOptionsChange(changedKey) {
  const opts = readOptions();
  chrome.storage.sync.set(opts);

  chrome.tabs.query({}, function(tabs) {
    tabs.forEach(function(tab) {
      chrome.tabs.sendMessage(tab.id, { type: "UpdateOptions", data: opts }).catch(() => {});
    });
  });
}


/* ── Coach sub-options state ── */
// ── ADIM 9: EN-only koçta Language dropdown'u kilitle ──────────────────────
function updateLocaleDropdownState() {
  const coachKey  = document.getElementById("option-coach-voice")?.value || "david";
  const localeSel = document.getElementById("option-coach-locale");
  if (!localeSel) return;

  const MULTI_LOCALE_COACHES = new Set(["david", "mae", "dante", "nadia", "sloane", "drwolf"]);
  const isMulti = MULTI_LOCALE_COACHES.has(coachKey);

  localeSel.disabled      = !isMulti;
  localeSel.style.opacity = isMulti ? "1" : "0.4";
  localeSel.style.cursor  = isMulti ? "pointer" : "not-allowed";
  localeSel.title         = isMulti ? "" : "This coach only supports English";

  if (!isMulti && localeSel.value !== "en-US") {
    localeSel.value = "en-US";
    OnOptionsChange("option-coach-locale");
  }
}

function updateBookMovesSliderState() {
  const box = document.getElementById("box-option-limit-book-moves");
  const slider = document.getElementById("book-moves-slider");
  if (!box || !slider) return;
  const isOn = !box.classList.contains("off");
  slider.style.display = isOn ? "" : "none";
}

function updateCoachSubOptionsState() {
  const box = document.getElementById("box-option-coach-enabled");
  if (!box) return;
  const coachEnabled = !box.classList.contains("off");
  const subOpts       = document.getElementById("coach-sub-options");
  const depthSlider   = document.getElementById("coach-depth-slider");
  const voiceToggle   = document.getElementById("item-option-coach-voice-enabled");
  const voiceSelector = document.getElementById("coach-voice-selector");
  const localeSelector= document.getElementById("coach-locale-selector");
  const opacity = coachEnabled ? "1" : "0.50";
  const pointer = coachEnabled ? "" : "none";
  if (subOpts)        { subOpts.style.opacity = opacity; subOpts.style.pointerEvents = pointer; }
  // Depth slider pre-analyze tarafından da kullanıldığı için ayrı kontrol
  const preAnalyzeBox = document.getElementById("box-option-pre-analyze-enabled");
  const preAnalyzeOn  = preAnalyzeBox && !preAnalyzeBox.classList.contains("off");
  const depthOpacity  = (coachEnabled || preAnalyzeOn) ? "1" : "0.50";
  if (depthSlider)    depthSlider.style.opacity    = depthOpacity;
  if (voiceToggle)    voiceToggle.style.opacity    = opacity;
  if (voiceSelector)  voiceSelector.style.opacity  = opacity;
  if (localeSelector) localeSelector.style.opacity = opacity;
  // Move Feedback: pre-analyze açıkken kilitli (her zaman açık olmalı)
  const moveFeedbackItem = document.getElementById("item-option-coach-move-feedback");
  if (moveFeedbackItem) {
    if (preAnalyzeOn) {
      moveFeedbackItem.style.opacity      = "0.50";
      moveFeedbackItem.style.pointerEvents = "none";
      setCheckboxUI("option-coach-move-feedback", true); // zorla açık
    } else {
      moveFeedbackItem.style.opacity      = coachEnabled ? "1" : "0.50";
      moveFeedbackItem.style.pointerEvents = coachEnabled ? "" : "none";
    }
  }
}

/* ── Pre-Analyze / Live Analyze artık bağımsız — mutual exclusion yok ── */

/* ── AutoMove sub-options state ── */
function updateAutoMoveSubOptionsState() {
  const box = document.getElementById("box-option-automove-enabled");
  if (!box) return;
  const autoMoveOn = !box.classList.contains("off");
  // Sadece timing slider'larını karart, smart timing grubuna dokunma
  const timingEls = [
    document.getElementById("automove-timing-slider"),
    document.getElementById("automove-centerweight-slider"),
    document.getElementById("item-option-autostart-newgame"),
  ];
  timingEls.forEach(el => {
    if (!el) return;
    el.style.opacity       = autoMoveOn ? "1" : "0.40";
    el.style.pointerEvents = autoMoveOn ? ""  : "none";
  });

  // Smart timing ayarları (instant recapture hariç) automove kapalıyken kilitlenir
  const smartTimingEls = [
    document.getElementById("item-option-fast-simple-moves"),
    document.getElementById("item-option-simulate-checkmates"),
    document.getElementById("item-option-blunder-react"),        // ← YENİ
    document.getElementById("item-option-flag-mode-enabled"),
  ];
  smartTimingEls.forEach(el => {
    if (!el) return;
    el.style.opacity       = autoMoveOn ? "1"    : "0.40";
    el.style.pointerEvents = autoMoveOn ? "auto" : "none";
  });
}

/* ── Opening Preference UI state (gizle / disabled) ── */
function updateOpeningPrefUIState(color) {
  const first  = document.getElementById("opening-" + color + "-1");
  const second = document.getElementById("opening-" + color + "-2");
  if (!first || !second) return;

  // 1st "none" → 2nd gizle
  const secondItem = second.closest(".select-item");
  if (secondItem) {
    secondItem.style.display = (first.value === "none") ? "none" : "";
  }

  // 1st/2nd çakışma → disabled
  Array.from(second.options).forEach(opt => {
    opt.disabled = (opt.value !== "none" && opt.value === first.value);
  });
  if (second.value === first.value && first.value !== "none") {
    second.value = "none";
  }
}

function initOpeningPrefUI() {
  ["white", "black"].forEach(color => {
    const first = document.getElementById("opening-" + color + "-1");
    if (first) {
      first.addEventListener("change", () => updateOpeningPrefUIState(color));
    }
    updateOpeningPrefUIState(color);
  });
}


/* ── Limit Strength → Engine Elo slider göster/gizle ── */
function updateEloSliderState() {
  const box = document.getElementById("box-option-limit-strength");
  if (!box) return;
  const limitOn = !box.classList.contains("off");
  const eloSlider = document.getElementById("option-uci-elo");
  const eloItem = eloSlider ? eloSlider.closest(".slider-item") : null;
  if (eloItem) eloItem.style.display = limitOn ? "" : "none";
}

function updateAutoPremoveSubOptionsState() {
  const autoMoveBox = document.getElementById("box-option-automove-enabled");
  const premoveBox  = document.getElementById("box-option-premove-enabled");
  if (!autoMoveBox || !premoveBox) return;
  const enabled = !autoMoveBox.classList.contains("off") && !premoveBox.classList.contains("off");

  // trades toggle
  const el = document.getElementById("item-option-autopremove-enabled");
  if (el) {
    el.style.opacity       = enabled ? "1"    : "0.40";
    el.style.pointerEvents = enabled ? "auto" : "none";
  }

  // mates toggle — aynı bağımlılık kuralı (AutoMove + Premove)
  const elMates = document.getElementById("item-option-autopremove-mates-enabled");
  if (elMates) {
    elMates.style.opacity       = enabled ? "1"    : "0.40";
    elMates.style.pointerEvents = enabled ? "auto" : "none";
  }

  // checking fork toggle — aynı bağımlılık kuralı (AutoMove + Premove)
  const elCheckingFork = document.getElementById("item-option-autopremove-checking-fork-enabled");
  if (elCheckingFork) {
    elCheckingFork.style.opacity       = enabled ? "1"    : "0.40";
    elCheckingFork.style.pointerEvents = enabled ? "auto" : "none";
  }
}

/* ── ULTRABULLET MOD — Görsel Kilit Mekanizması ──
   Roadmap Bölüm 3: Ultrabullet açıkken AUTOMOVE (sub-options + Check Move,
   Move Method HARİÇ) ve ENGINE sayfalarının tamamı kilitlenir (opacity +
   pointer-events). ENGINE sayfası ayrıca Bölüm 3.2'deki zorlanmış/varsayılan
   değerleri GÖRSEL olarak gösterir — storage'daki gerçek değerler hiçbir
   zaman değiştirilmez, sadece runtime'da ekranda override edilir.
   Ultrabullet kapanınca kilit kalkar ve ENGINE sayfasına gerçek storage
   değerleri geri yüklenir. */
function forceSliderDisplay(key, value, formatFn) {
  const el = document.getElementById(key);
  if (!el) return;
  el.value = value;
  setSliderBackground(el);
  const valEl = document.getElementById("val-" + key);
  if (valEl) valEl.textContent = formatFn ? formatFn(value) : value;
}

function updateUltrabulletLockState() {
  const box = document.getElementById("box-option-ultrabullet-enabled");
  if (!box) return;
  const on = !box.classList.contains("off");

  // ── 3.1 AUTOMOVE sayfası kilidi (Move Method kapsam dışı) ──
  const automoveLockEls = [
    document.getElementById("item-option-automove-enabled"),
    document.getElementById("automove-sub-options"),
  ];
  automoveLockEls.forEach(el => {
    if (!el) return;
    el.style.opacity       = on ? "0.40" : "1";
    el.style.pointerEvents = on ? "none" : "";
  });

  // ── 3.2 ENGINE sayfası kilidi ──
  const enginePage = document.getElementById("page-engine");
  if (enginePage) {
    enginePage.style.opacity       = on ? "0.40" : "1";
    enginePage.style.pointerEvents = on ? "none" : "";
  }

  if (on) {
    // Görsel zorlama — storage'a DOKUNULMAZ, sadece ekran
    const engineSourceEl = document.getElementById("option-engine-source");
    if (engineSourceEl) { engineSourceEl.value = "komodo"; applyEngineSourceUI("komodo"); }

    const personalityEl = document.getElementById("option-personality");
    if (personalityEl) personalityEl.value = "Aggressive"; // DEFAULTS'tan farklı, özel zorlama

    forceSliderDisplay("option-depth", 3); // DEFAULTS'tan farklı, özel zorlama
    forceSliderDisplay("option-multipv", DEFAULTS["option-multipv"]);
    forceSliderDisplay("option-pred-depth", DEFAULTS["option-pred-depth"],
      v => parseInt(v) === 0 ? "OFF" : v);
    forceSliderDisplay("option-uci-elo", DEFAULTS["option-uci-elo"]);
    const hashIdx = hashMBToIndex(DEFAULTS["option-hash"]);
    forceSliderDisplay("option-hash", hashIdx, () => hashIndexToMB(hashIdx) + " MB");
    forceSliderDisplay("option-book-moves", DEFAULTS["option-book-moves"],
      v => parseInt(v) === 11 ? "∞" : v);

    setCheckboxUI("option-limit-strength",   DEFAULTS["option-limit-strength"]);
    setCheckboxUI("option-auto-skill",       DEFAULTS["option-auto-skill"]);
    setCheckboxUI("option-own-book",         DEFAULTS["option-own-book"]);
    setCheckboxUI("option-chess960",         DEFAULTS["option-chess960"]);
    setCheckboxUI("option-best-book-line",   DEFAULTS["option-best-book-line"]);
    setCheckboxUI("option-limit-book-moves", DEFAULTS["option-limit-book-moves"]);

    ["opening-white-1", "opening-white-2", "opening-black-1", "opening-black-2"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "none";
    });

    updateEloSliderState();
    updateBookMovesSliderState();
  } else {
    // Kapandı — ENGINE sayfasının gerçek (storage'daki) değerlerini geri yükle
    chrome.storage.sync.get(DEFAULTS, function(opts) {
      const engineSourceEl = document.getElementById("option-engine-source");
      if (engineSourceEl) {
        const savedSource = opts["option-engine-source"] || "komodo";
        engineSourceEl.value = (savedSource === "torch") ? "komodo" : savedSource;
        applyEngineSourceUI(engineSourceEl.value);
      }

      const personalityEl = document.getElementById("option-personality");
      if (personalityEl) personalityEl.value = opts["option-personality"] || "Default";

      forceSliderDisplay("option-depth", opts["option-depth"]);
      forceSliderDisplay("option-multipv", opts["option-multipv"]);
      forceSliderDisplay("option-pred-depth", opts["option-pred-depth"],
        v => parseInt(v) === 0 ? "OFF" : v);
      forceSliderDisplay("option-uci-elo", opts["option-uci-elo"]);
      const hashIdx = hashMBToIndex(opts["option-hash"]);
      forceSliderDisplay("option-hash", hashIdx, () => hashIndexToMB(hashIdx) + " MB");
      forceSliderDisplay("option-book-moves", opts["option-book-moves"],
        v => parseInt(v) === 11 ? "∞" : v);

      setCheckboxUI("option-limit-strength",   opts["option-limit-strength"]);
      setCheckboxUI("option-auto-skill",       opts["option-auto-skill"]);
      setCheckboxUI("option-own-book",         opts["option-own-book"]);
      setCheckboxUI("option-chess960",         opts["option-chess960"]);
      setCheckboxUI("option-best-book-line",   opts["option-best-book-line"]);
      setCheckboxUI("option-limit-book-moves", opts["option-limit-book-moves"]);

      const w1 = document.getElementById("opening-white-1");
      if (w1) w1.value = opts["option-opening-white-1"] || "none";
      const w2 = document.getElementById("opening-white-2");
      if (w2) w2.value = opts["option-opening-white-2"] || "none";
      const b1 = document.getElementById("opening-black-1");
      if (b1) b1.value = opts["option-opening-black-1"] || "none";
      const b2 = document.getElementById("opening-black-2");
      if (b2) b2.value = opts["option-opening-black-2"] || "none";

      updateEloSliderState();
      updateBookMovesSliderState();
    });
  }
}

/* ── AutoMove timing display ── */
function updateAutoMoveTimingDisplay() {
  const minEl = document.getElementById("option-automove-min");
  const maxEl = document.getElementById("option-automove-max");
  const valEl = document.getElementById("val-option-automove-timing");
  const track = document.getElementById("dual-slider-track");
  if (!minEl || !maxEl) return;
  const min = parseInt(minEl.value);
  const max = parseInt(maxEl.value);
  const range = 10000;
  const minPct = (min / range) * 100;
  const maxPct = (max / range) * 100;
  if (track) {
    track.style.background =
      `linear-gradient(90deg, #1a1a1a ${minPct}%, ${getThemeAccentColor()} ${minPct}%, ${getThemeAccentColor()} ${maxPct}%, #1a1a1a ${maxPct}%)`;
  }
  function msToSec(ms) { return (ms / 1000).toFixed(1) + "s"; }
  if (valEl) valEl.textContent = msToSec(min) + " – " + msToSec(max);
}

/* ── Ultrabullet Mod timing display (Move Timing dual slider, 0-1.5s varsayılan) ── */
function updateUltrabulletTimingDisplay() {
  const minEl = document.getElementById("option-ultrabullet-min");
  const maxEl = document.getElementById("option-ultrabullet-max");
  const valEl = document.getElementById("val-option-ultrabullet-timing");
  const track = document.getElementById("ultrabullet-dual-slider-track");
  if (!minEl || !maxEl) return;
  const min = parseInt(minEl.value);
  const max = parseInt(maxEl.value);
  const range = 2000;
  const minPct = (min / range) * 100;
  const maxPct = (max / range) * 100;
  if (track) {
    track.style.background =
      `linear-gradient(90deg, #1a1a1a ${minPct}%, ${getThemeAccentColor()} ${minPct}%, ${getThemeAccentColor()} ${maxPct}%, #1a1a1a ${maxPct}%)`;
  }
  function msToSec(ms) { return (ms / 1000).toFixed(1) + "s"; }
  if (valEl) valEl.textContent = msToSec(min) + " – " + msToSec(max);
}

/* ── AutoMove center weight display ── */
const CW_LABELS = ["UNIFORM", "LOW", "MEDIUM", "HIGH", "MAX"];

function updateAutoMoveCenterWeightDisplay() {
  const el = document.getElementById("option-automove-centerweight");
  const valEl = document.getElementById("val-option-automove-centerweight");
  const hist = document.getElementById("automove-mini-hist");
  if (!el) return;
  setSliderBackground(el);
  const cw = parseInt(el.value);

  // i18n'den etiket al, yoksa İngilizce fallback
  const lang = (typeof ASHINA_I18N !== "undefined")
    ? (document.documentElement.lang || "en")
    : "en";
  const labelKey = "cwLabel" + cw;
  const label = (typeof ashina_t === "function") ? ashina_t(lang, labelKey) : CW_LABELS[cw - 1];
  if (valEl) valEl.textContent = label;

  if (!hist) return;
  const minV = parseInt(document.getElementById("option-automove-min").value) || 0;
  const maxV = parseInt(document.getElementById("option-automove-max").value) || 3200;
  const NBARS = 10;
  const range = maxV - minV || 1;
  const center = (minV + maxV) / 2;
  const std = range / (2 + cw * 1.2);
  const bars = [];
  for (let i = 0; i < NBARS; i++) {
    const mid = minV + (i + 0.5) * range / NBARS;
    const g = Math.exp(-0.5 * Math.pow((mid - center) / std, 2));
    const t = (cw - 1) / 4;
    bars.push((1 - t) + g * t);
  }
  const maxBar = Math.max(...bars);
  hist.innerHTML = bars.map(b => {
    const h = Math.round((b / maxBar) * 100);
    return `<div class="mini-hist-bar" style="height:${h}%"></div>`;
  }).join("");
}


function applyTheme(themeKey) {
  if (typeof THEMES === "undefined") return;
  var theme = THEMES[themeKey] || THEMES[DEFAULT_THEME_KEY];
  if (!theme) return;

  var root = document.documentElement;
  Object.keys(theme.colors).forEach(function(cssVar) {
    root.style.setProperty(cssVar, theme.colors[cssVar]);
  });

  // Tema dropdown'unu güncelle
  var themeSelect = document.getElementById("theme-select");
  if (themeSelect) themeSelect.value = themeKey;

  // Slider'lar (komodo/maia3/websocket fark etmeksizin tüm .custom-slider
  // elemanları) rengi inline style ile çizdiği için CSS değişkeni tek
  // başına yetmez — tema değişince hepsini yeniden çiziyoruz.
  document.querySelectorAll("input.custom-slider:not(.dual-slider)").forEach(function(el) {
    setSliderBackground(el);
  });
  updateAutoMoveTimingDisplay();
  updateUltrabulletTimingDisplay();
}

function applyLanguage(lang) {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach(function(el) {
    var key = el.getAttribute("data-i18n");
    el.textContent = ashina_t(lang, key);
  });
  document.querySelectorAll("[data-i18n-tip]").forEach(function(el) {
    var key = el.getAttribute("data-i18n-tip");
    el.textContent = ashina_t(lang, key);
  });
  updateAutoMoveCenterWeightDisplay();

  // Personality <select> option metinlerini çevir
  var persMap = {
    "Default":    "persDefault",
    "Aggressive": "persAggressive",
    "Defensive":  "persDefensive",
    "Active":     "persActive",
    "Positional": "persPositional",
    "Endgame":    "persEndgame",
    "Beginner":   "persBeginner",
    "Human":      "persHuman",
  };
  var pers = document.getElementById("option-personality");
  if (pers) {
    Array.from(pers.options).forEach(function(opt) {
      var key = persMap[opt.value];
      if (key) opt.text = ashina_t(lang, key);
    });
  }

  // Ultrabullet Opening Preference <select> option metinlerini çevir
  var ultrabulletOpeningMap = {
    "none":           "openingNone",
    "knight-sac":     "ultrabulletOpeningKnightSac",
    "scholars-mate":  "ultrabulletOpeningScholarsMate",
    "bishop-sac":     "ultrabulletOpeningAttackQueen",
  };
  var ultrabulletOpeningSel = document.getElementById("option-ultrabullet-opening-preference");
  if (ultrabulletOpeningSel) {
    Array.from(ultrabulletOpeningSel.options).forEach(function(opt) {
      var key = ultrabulletOpeningMap[opt.value];
      if (key) opt.text = ashina_t(lang, key);
    });
  }

  // Engine tab Opening Preference <select> option metinlerini çevir (NONE)
  var engineOpeningNoneMap = { "none": "openingNone" };
  ["opening-white-1", "opening-white-2", "opening-black-1", "opening-black-2"].forEach(function(id) {
    var sel = document.getElementById(id);
    if (!sel) return;
    Array.from(sel.options).forEach(function(opt) {
      var key = engineOpeningNoneMap[opt.value];
      if (key) opt.text = ashina_t(lang, key);
    });
  });

  // Title <select> option metnini çevir (None)
  var fakeTitleMap = { "none": "fakeTitleNone" };
  var fakeTitleSelEl = document.getElementById("option-fake-title");
  if (fakeTitleSelEl) {
    Array.from(fakeTitleSelEl.options).forEach(function(opt) {
      var key = fakeTitleMap[opt.value];
      if (key) opt.text = ashina_t(lang, key);
    });
  }

  // Theme <select> option metinlerini çevir
  var themeMap = {
    "ashina-red":     "themeAshinaRed",
    "chesscom-green": "themeChesscomGreen",
    "pink":           "themePink",
    "yellow":         "themeYellow",
  };
  var themeSelEl = document.getElementById("theme-select");
  if (themeSelEl) {
    Array.from(themeSelEl.options).forEach(function(opt) {
      var key = themeMap[opt.value];
      if (key) opt.text = ashina_t(lang, key);
    });
  }

  // data-i18n-title özellikli elementlerin title niteliğini çevir
  document.querySelectorAll("[data-i18n-title]").forEach(function(el) {
    var key = el.getAttribute("data-i18n-title");
    el.title = ashina_t(lang, key);
  });

  // Dil dropdown'unu güncelle
  var langSelect = document.getElementById("lang-select");
  if (langSelect) langSelect.value = lang;

  // Tüm sekmelere dil değişikliğini yayınla
  chrome.tabs.query({}, function(tabs) {
    tabs.forEach(function(tab) {
      chrome.tabs.sendMessage(tab.id, { type: "UpdateLanguage", lang: lang }).catch(function(){});
    });
  });
}

/* ── Restore from storage ── */
function RestoreOptions() {
  chrome.storage.sync.get(DEFAULTS, function(opts) {
    SLIDER_KEYS.forEach(key => {
      const el = document.getElementById(key);
      const valEl = document.getElementById("val-" + key);
      if (!el) return;
      if (key === "option-hash") {
        el.value = hashMBToIndex(opts[key]);
        setSliderBackground(el);
        if (valEl) valEl.textContent = hashIndexToMB(el.value) + " MB";
      } else if (key === "option-pred-depth") {
        el.value = opts[key];
        setSliderBackground(el);
        if (valEl) valEl.textContent = parseInt(opts[key]) === 0 ? "OFF" : opts[key];
      } else if (key === "option-book-moves") {
        el.value = opts[key];
        setSliderBackground(el);
        if (valEl) valEl.textContent = parseInt(opts[key]) === 11 ? "∞" : opts[key];
      } else if (key === "option-automove-min" || key === "option-automove-max") {
        el.value = opts[key];
      } else if (key === "option-ultrabullet-min" || key === "option-ultrabullet-max") {
        el.value = opts[key];
      } else if (key === "option-ultrabullet-premove-chance" || key === "option-ultrabullet-checkmove-chance" || key === "option-ultrabullet-ignore-captures" || key === "option-ultrabullet-ignore-recapture" || key === "option-ultrabullet-lefong-trap-chance") {
        el.value = opts[key];
        setSliderBackground(el);
        if (valEl) valEl.textContent = opts[key] + "%";
      } else {
        el.value = opts[key];
        setSliderBackground(el);
        if (valEl) valEl.textContent = opts[key];
      }
    });
    updateAutoMoveTimingDisplay();
    updateAutoMoveCenterWeightDisplay();
    updateUltrabulletTimingDisplay();

    const pers = document.getElementById("option-personality");
    if (pers) pers.value = opts["option-personality"] || "Default";

    const coachVoiceEl = document.getElementById("option-coach-voice");
    if (coachVoiceEl) coachVoiceEl.value = opts["option-coach-voice"] || "david";

    const fakeTitleEl = document.getElementById("option-fake-title");
    if (fakeTitleEl) fakeTitleEl.value = opts["option-fake-title"] || "none";

    const moveMethodEl = document.getElementById("option-move-method");
    if (moveMethodEl) moveMethodEl.value = opts["option-move-method"] || "teleport";

    const savedMethod = opts["option-move-method"] || "teleport";
    document.querySelectorAll(".move-method-pill").forEach(function(pill) {
      pill.classList.toggle("active", pill.dataset.value === savedMethod);
    });

    const smartTimingProfileEl = document.getElementById("select-smart-timing-profile");
    if (smartTimingProfileEl) smartTimingProfileEl.value = opts["option-smart-timing-profile"] || "bullet";

    const coachLocaleEl = document.getElementById("option-coach-locale"); // ADIM 5c: YENİ
    if (coachLocaleEl) coachLocaleEl.value = opts["option-coach-locale"] || "en-US"; // ADIM 5c: YENİ
    updateLocaleDropdownState(); // ADIM 9: sayfa yüklenince doğru state'i uygula
    const maiaEloLoadEl = document.getElementById("option-maia-elo");
    if (maiaEloLoadEl && opts["option-maia-elo"]) maiaEloLoadEl.value = opts["option-maia-elo"];


    const bestColorEl = document.getElementById("option-color-best-arrow");
    if (bestColorEl) {
      bestColorEl.value = opts["option-color-best-arrow"] || "#FF3333";
      document.getElementById("swatch-best-arrow").style.background = bestColorEl.value;
    }
    const otherColorEl = document.getElementById("option-color-other-arrow");
    if (otherColorEl) {
      otherColorEl.value = opts["option-color-other-arrow"] || "#FECA57";
      document.getElementById("swatch-other-arrow").style.background = otherColorEl.value;
    }

    const engineSourceEl = document.getElementById("option-engine-source");
    if (engineSourceEl) {
      const savedSource = opts["option-engine-source"] || "komodo";
      // Torch henüz UI'da seçilebilir değil — fallback komodo. WebSocket artık seçilebilir.
      engineSourceEl.value = (savedSource === "torch") ? "komodo" : savedSource;
      applyEngineSourceUI(engineSourceEl.value);
    }

    const urlApiStockfishEl = document.getElementById("option-url-api-stockfish");
    const websocketNoticeEl = document.getElementById("websocket-migration-notice");
    if (urlApiStockfishEl) {
      const savedUrl = opts["option-url-api-stockfish"] || DEFAULTS["option-url-api-stockfish"];
      const validUrls = Array.from(urlApiStockfishEl.options).map(o => o.value);
      if (validUrls.includes(savedUrl)) {
        urlApiStockfishEl.value = savedUrl;
        if (websocketNoticeEl) websocketNoticeEl.style.display = "none";
      } else {
        // Kayıtlı değer artık preset listesinde yok (eski manuel/özel URL) — varsayılana düş.
        urlApiStockfishEl.value = DEFAULTS["option-url-api-stockfish"];
        if (websocketNoticeEl) websocketNoticeEl.style.display = "";
        chrome.storage.sync.set({ "option-url-api-stockfish": DEFAULTS["option-url-api-stockfish"] });
      }
    }

    CHECKBOX_KEYS.forEach(key => setCheckboxUI(key, opts[key]));

    const openingWhite1El = document.getElementById("opening-white-1");
    if (openingWhite1El) openingWhite1El.value = opts["option-opening-white-1"] || "none";
    const openingWhite2El = document.getElementById("opening-white-2");
    if (openingWhite2El) openingWhite2El.value = opts["option-opening-white-2"] || "none";
    const openingBlack1El = document.getElementById("opening-black-1");
    if (openingBlack1El) openingBlack1El.value = opts["option-opening-black-1"] || "none";
    const openingBlack2El = document.getElementById("opening-black-2");
    if (openingBlack2El) openingBlack2El.value = opts["option-opening-black-2"] || "none";
    console.log("[OpeningPref] Options yüklendi: white-1=" + opts["option-opening-white-1"] +
      ", white-2=" + opts["option-opening-white-2"] +
      ", black-1=" + opts["option-opening-black-1"] +
      ", black-2=" + opts["option-opening-black-2"]);
    initOpeningPrefUI();

    const ultrabulletOpeningPrefEl = document.getElementById("option-ultrabullet-opening-preference");
    if (ultrabulletOpeningPrefEl) ultrabulletOpeningPrefEl.value = opts["option-ultrabullet-opening-preference"] || "none";

    // Apply language
    applyLanguage(opts["option-language"] || "en");

    // Apply theme
    applyTheme(opts["option-theme"] || (typeof DEFAULT_THEME_KEY !== "undefined" ? DEFAULT_THEME_KEY : "ashina-red"));

    // Sync coach sub-option dim state
    updateCoachSubOptionsState();

    // Sync automove sub-option dim state
    updateAutoMoveSubOptionsState();
    // Sync autopremove sub-option dim state
    updateAutoPremoveSubOptionsState();
    // Sync engine elo slider visibility (Limit Strength'e bağlı)
    updateEloSliderState();
    // Sync book moves slider visibility
    updateBookMovesSliderState();
    // Sync Ultrabullet Mod lock state (AUTOMOVE + ENGINE kilidi)
    updateUltrabulletLockState();
  });
}

/* ── Config Backup: EXPORT ──
   Sadece IMPORT_EXPORT_KEYS içindeki key'leri storage'dan okuyup
   JSON olarak export textarea'sına yazar. */
function exportConfig() {
  const outputEl = document.getElementById("backupExportOutput");
  if (!outputEl) return;
  chrome.storage.sync.get(IMPORT_EXPORT_KEYS, function(opts) {
    const result = {};
    IMPORT_EXPORT_KEYS.forEach(key => {
      result[key] = (opts[key] !== undefined) ? opts[key] : DEFAULTS[key];
    });
    outputEl.value = JSON.stringify(result, null, 2);
  });
}

/* ── Config Backup: IMPORT ──
   1) JSON parse eder.
   2) Sadece IMPORT_EXPORT_KEYS içinde olan key'leri filtreler.
   3) Önce DOM'u günceller (slider/checkbox/select + görsel yan etkiler).
   4) Sonra SADECE filtrelenmiş key'leri chrome.storage.sync'e yazar.
   OnOptionsChange()/readOptions() bilerek KULLANILMAZ — onlar DEFAULTS +
   DOM'un tamamını okuyup geri yazar, bu da listeye dahil olmayan
   ayarlara dokunma riski taşır. Burada storage yazımı dar kapsamlı tutulur. */
function importConfig() {
  const inputEl = document.getElementById("backupImportInput");
  const feedbackEl = document.getElementById("backupFeedback");
  if (!inputEl || !feedbackEl) return;

  const raw = inputEl.value.trim();
  if (!raw) {
    feedbackEl.textContent = "⚠ Paste a JSON config first.";
    feedbackEl.className = "backup-feedback error";
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    feedbackEl.textContent = "✗ Invalid JSON. Please check your config.";
    feedbackEl.className = "backup-feedback error";
    return;
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    feedbackEl.textContent = "✗ Invalid JSON. Please check your config.";
    feedbackEl.className = "backup-feedback error";
    return;
  }

  // Sadece izinli key'leri filtrele — listeye dahil olmayanlar yok sayılır
  const toApply = {};
  IMPORT_EXPORT_KEYS.forEach(key => {
    if (Object.prototype.hasOwnProperty.call(parsed, key)) {
      toApply[key] = parsed[key];
    }
  });

  if (Object.keys(toApply).length === 0) {
    feedbackEl.textContent = "⚠ No recognized settings found in this JSON.";
    feedbackEl.className = "backup-feedback error";
    return;
  }

  // ── DOM'u güncelle ──
  Object.entries(toApply).forEach(([key, value]) => {
    if (CHECKBOX_KEYS.includes(key)) {
      setCheckboxUI(key, !!value);
      return;
    }

    if (SLIDER_KEYS.includes(key)) {
      const el = document.getElementById(key);
      const valEl = document.getElementById("val-" + key);
      if (!el) return;

      if (key === "option-hash") {
        el.value = hashMBToIndex(value);
        setSliderBackground(el);
        if (valEl) valEl.textContent = hashIndexToMB(el.value) + " MB";
      } else if (key === "option-pred-depth") {
        el.value = value;
        setSliderBackground(el);
        if (valEl) valEl.textContent = parseInt(value) === 0 ? "OFF" : value;
      } else if (key === "option-book-moves") {
        el.value = value;
        setSliderBackground(el);
        if (valEl) valEl.textContent = parseInt(value) === 11 ? "∞" : value;
      } else if (key === "option-automove-min" || key === "option-automove-max") {
        el.value = value;
      } else if (key === "option-ultrabullet-min" || key === "option-ultrabullet-max") {
        el.value = value;
      } else if (key === "option-ultrabullet-premove-chance" || key === "option-ultrabullet-checkmove-chance" || key === "option-ultrabullet-ignore-captures" || key === "option-ultrabullet-ignore-recapture" || key === "option-ultrabullet-lefong-trap-chance") {
        el.value = value;
        setSliderBackground(el);
        if (valEl) valEl.textContent = value + "%";
      } else {
        el.value = value;
        setSliderBackground(el);
        if (valEl) valEl.textContent = value;
      }
      return;
    }

    if (key === "option-personality") {
      const el = document.getElementById("option-personality");
      if (el) el.value = value;
      return;
    }

    if (key === "option-smart-timing-profile") {
      const el = document.getElementById("select-smart-timing-profile");
      if (el) el.value = value;
      return;
    }

    if (key === "option-ultrabullet-opening-preference") {
      const el = document.getElementById("option-ultrabullet-opening-preference");
      if (el) el.value = value;
      return;
    }

    if (key === "option-engine-source") {
      const el = document.getElementById("option-engine-source");
      if (el) el.value = value;
      applyEngineSourceUI(value);
      return;
    }

    if (key === "option-maia-elo") {
      const el = document.getElementById("option-maia-elo");
      if (el) el.value = value;
      return;
    }

    if (key === "option-url-api-stockfish") {
      const el = document.getElementById("option-url-api-stockfish");
      if (el) el.value = value;
      return;
    }
  });

  // ── Görsel yan etkileri senkronize et ──
  updateAutoMoveTimingDisplay();
  updateAutoMoveCenterWeightDisplay();
  updateUltrabulletTimingDisplay();
  updateEloSliderState();
  updateAutoMoveSubOptionsState();
  updateAutoPremoveSubOptionsState();
  updateBookMovesSliderState();

  // ── Sadece import edilen key'leri storage'a yaz (dar kapsamlı) ──
  // NOT: Burada bilerek chrome.tabs.sendMessage ile canlı yayın YAPILMAZ.
  // Mevcut "UpdateOptions" mesajı Ashina.js içinde engine.UpdateOptions(options)
  // çağırıyor ve bu nesnedeki HER key'i "setoption name X value Y" olarak
  // motora yolluyor. Kısmi (sadece import edilen key'leri içeren) bir nesne
  // göndermek motoru eksik/yanlış ayarlarla bırakabilir. Bu yüzden import
  // sadece storage'ı günceller; açık sekmeler güncel ayarı bir sonraki
  // sayfa yenilemesinde veya "Reload Engine" butonuyla alır.
  chrome.storage.sync.set(toApply, function() {
    feedbackEl.textContent = "✓ Config loaded successfully! Reload the page.";
    feedbackEl.className = "backup-feedback success";
  });
}

/* ── Init ── */
document.addEventListener("DOMContentLoaded", function() {

  // Tab clicks
  document.getElementById("tab-visuals").addEventListener("click", () => switchTab("visuals"));
  document.getElementById("tab-engine").addEventListener("click", () => switchTab("engine"));
  document.getElementById("tab-coach").addEventListener("click", () => switchTab("coach"));
  document.getElementById("tab-automove").addEventListener("click", () => switchTab("automove"));

  // Checkbox clicks
  CHECKBOX_KEYS.forEach(key => {
    const item = document.getElementById("item-" + key);
    if (!item) return;
    item.addEventListener("click", function() {
      const box = document.getElementById("box-" + key);
      const newVal = box.classList.contains("off");
      setCheckboxUI(key, newVal);
      OnOptionsChange(key);
      if (key === "option-coach-enabled" || key === "option-pre-analyze-enabled") updateCoachSubOptionsState();
      if (key === "option-automove-enabled") updateAutoMoveSubOptionsState();
      if (key === "option-automove-enabled" || key === "option-premove-enabled") updateAutoPremoveSubOptionsState();
      if (key === "option-limit-strength") updateEloSliderState();
      if (key === "option-limit-book-moves") updateBookMovesSliderState();
      if (key === "option-ultrabullet-enabled") updateUltrabulletLockState();
      if (key === "option-stream-mode") {
        const isOn = !document.getElementById("box-option-stream-mode").classList.contains("off");
        chrome.runtime.sendMessage({ type: isOn ? "ASHINA_STREAM_OPEN" : "ASHINA_STREAM_CLOSE" });
      }
    });
  });

  SLIDER_KEYS.forEach(key => {
    const el = document.getElementById(key);
    const valEl = document.getElementById("val-" + key);
    if (!el) return;
    el.addEventListener("input", function() {
      if (key === "option-automove-min") {
        const maxEl = document.getElementById("option-automove-max");
        if (maxEl && parseInt(el.value) > parseInt(maxEl.value)) {
          el.value = maxEl.value;
        }
        updateAutoMoveTimingDisplay();
        updateAutoMoveCenterWeightDisplay();
      } else if (key === "option-automove-max") {
        const minEl = document.getElementById("option-automove-min");
        if (minEl && parseInt(el.value) < parseInt(minEl.value)) {
          el.value = minEl.value;
        }
        updateAutoMoveTimingDisplay();
        updateAutoMoveCenterWeightDisplay();
      } else if (key === "option-automove-centerweight") {
        updateAutoMoveCenterWeightDisplay();
      } else if (key === "option-ultrabullet-min") {
        const maxEl = document.getElementById("option-ultrabullet-max");
        if (maxEl && parseInt(el.value) > parseInt(maxEl.value)) {
          el.value = maxEl.value;
        }
        updateUltrabulletTimingDisplay();
      } else if (key === "option-ultrabullet-max") {
        const minEl = document.getElementById("option-ultrabullet-min");
        if (minEl && parseInt(el.value) < parseInt(minEl.value)) {
          el.value = minEl.value;
        }
        updateUltrabulletTimingDisplay();
      } else if (key === "option-ultrabullet-premove-chance" || key === "option-ultrabullet-checkmove-chance" || key === "option-ultrabullet-ignore-captures" || key === "option-ultrabullet-ignore-recapture" || key === "option-ultrabullet-lefong-trap-chance") {
        setSliderBackground(el);
        if (valEl) valEl.textContent = el.value + "%";
      } else {
        setSliderBackground(el);
        if (key === "option-hash") {
          if (valEl) valEl.textContent = hashIndexToMB(el.value) + " MB";
        } else if (key === "option-pred-depth") {
          if (valEl) valEl.textContent = parseInt(el.value) === 0 ? "OFF" : el.value;
        } else if (key === "option-book-moves") {
          if (valEl) valEl.textContent = parseInt(el.value) === 11 ? "∞" : el.value;
        } else {
          if (valEl) valEl.textContent = el.value;
        }
      }
      OnOptionsChange(key);
    });
  });

  // Personality select
  const pers = document.getElementById("option-personality");
  if (pers) pers.addEventListener("change", () => OnOptionsChange("option-personality"));

  // Coach voice select
  const coachVoice = document.getElementById("option-coach-voice");
  if (coachVoice) coachVoice.addEventListener("change", () => {
    updateLocaleDropdownState();          // ADIM 9: dropdown'u önce güncelle
    OnOptionsChange("option-coach-voice");
  });

  // Coach locale select — ADIM 5d: YENİ
  const coachLocale = document.getElementById("option-coach-locale");
  if (coachLocale) coachLocale.addEventListener("change", () => OnOptionsChange("option-coach-locale"));

  // Fake title select
  const fakeTitle = document.getElementById("option-fake-title");
  if (fakeTitle) fakeTitle.addEventListener("change", () => OnOptionsChange("option-fake-title"));

  // Smart timing profile select
  const smartTimingProfile = document.getElementById("select-smart-timing-profile");
  if (smartTimingProfile) smartTimingProfile.addEventListener("change", () => OnOptionsChange("option-smart-timing-profile"));

  // Opening preference selects
  [
    ["opening-white-1", "option-opening-white-1"],
    ["opening-white-2", "option-opening-white-2"],
    ["opening-black-1", "option-opening-black-1"],
    ["opening-black-2", "option-opening-black-2"],
  ].forEach(([elId, storageKey]) => {
    const el = document.getElementById(elId);
    if (!el) return;
    el.addEventListener("change", () => {
      console.log("[OpeningPref] Dropdown değişti: " + storageKey + " → " + el.value);
      OnOptionsChange(storageKey);
      console.log("[OpeningPref] Storage'a kaydedildi: " + storageKey + " = " + el.value);
    });
  });

  // Ultrabullet Mod — Opening Preference select
  const ultrabulletOpeningPrefSel = document.getElementById("option-ultrabullet-opening-preference");
  if (ultrabulletOpeningPrefSel) ultrabulletOpeningPrefSel.addEventListener("change", () => OnOptionsChange("option-ultrabullet-opening-preference"));

  // Palette button → open overlay
  const discordBtn = document.getElementById("btn-discord");
  if (discordBtn) {
    discordBtn.addEventListener("click", function() {
      chrome.tabs.create({ url: "https://discord.gg/PkwP5uN42A" });
    });
  }

  // Settings overlay (Language + Arrow Colors)
  const settingsBtn      = document.getElementById("btn-settings");
  const settingsOverlay  = document.getElementById("settings-overlay");
  const settingsCloseBtn = document.getElementById("btn-settings-overlay-close");

  if (settingsBtn && settingsOverlay) {
    settingsBtn.addEventListener("click", function() {
      settingsOverlay.classList.toggle("hidden");
    });
  }
  if (settingsCloseBtn && settingsOverlay) {
    settingsCloseBtn.addEventListener("click", function() {
      settingsOverlay.classList.add("hidden");
    });
  }

  // Config Backup — Export button
  const btnBackupExport = document.getElementById("btnBackupExport");
  if (btnBackupExport) {
    btnBackupExport.addEventListener("click", function() {
      exportConfig();
    });
  }

  // Config Backup — Download as file
  const btnBackupDownload = document.getElementById("btnBackupDownload");
  if (btnBackupDownload) {
    btnBackupDownload.addEventListener("click", function() {
      const outputEl = document.getElementById("backupExportOutput");
      if (!outputEl || !outputEl.value) return;
      const blob = new Blob([outputEl.value], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ashina-config.json";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // Config Backup — Copy to clipboard
  const btnBackupCopy = document.getElementById("btnBackupCopy");
  if (btnBackupCopy) {
    btnBackupCopy.addEventListener("click", function() {
      const outputEl = document.getElementById("backupExportOutput");
      if (!outputEl || !outputEl.value) return;
      navigator.clipboard.writeText(outputEl.value).then(function() {
        const original = btnBackupCopy.textContent;
        btnBackupCopy.textContent = "✓ COPIED!";
        setTimeout(function() { btnBackupCopy.textContent = original; }, 1500);
      });
    });
  }

  // Config Backup — Import button
  const btnBackupImport = document.getElementById("btnBackupImport");
  if (btnBackupImport) {
    btnBackupImport.addEventListener("click", function() {
      importConfig();
    });
  }

  // Language selection — dropdown
  var langSelectEl = document.getElementById("lang-select");
  if (langSelectEl) {
    langSelectEl.addEventListener("change", function() {
      var lang = langSelectEl.value;
      chrome.storage.sync.set({ "option-language": lang });
      applyLanguage(lang);
    });
  }

  // Theme selection — dropdown
  var themeSelectEl = document.getElementById("theme-select");
  if (themeSelectEl) {
    themeSelectEl.addEventListener("change", function() {
      var themeKey = themeSelectEl.value;
      chrome.storage.sync.set({ "option-theme": themeKey });
      applyTheme(themeKey);
      // Açık chess.com sekmelerine de anında bildir (depth bar / floating panel
      // sayfa yenilenmeden güncellensin — önceden sadece storage'a yazılıp
      // sayfa yenilenene kadar eski renkte kalıyordu).
      chrome.tabs.query({}, function(tabs) {
        tabs.forEach(function(tab) {
          chrome.tabs.sendMessage(tab.id, { type: "UpdateOptions", data: { "option-theme": themeKey } }).catch(() => {});
        });
      });
    });
  }

  // Info overlay
  const infoBtn         = document.getElementById("btn-info");
  const infoOverlay     = document.getElementById("info-overlay");
  const infoCloseBtn    = document.getElementById("btn-info-overlay-close");
  if (infoBtn && infoOverlay) {
    infoBtn.addEventListener("click", function() {
      infoOverlay.classList.toggle("hidden");
    });
  }
  if (infoCloseBtn && infoOverlay) {
    infoCloseBtn.addEventListener("click", function() {
      infoOverlay.classList.add("hidden");
    });
  }

  // Arrow color pickers
  ["best-arrow", "other-arrow"].forEach(function(key) {
    const swatch = document.getElementById("swatch-" + key);
    const input  = document.getElementById("option-color-" + key);
    if (!swatch || !input) return;
    swatch.addEventListener("click", function() { input.click(); });
    // input: sadece swatch önizlemesini güncelle (kayıt yok)
    input.addEventListener("input", function() {
      swatch.style.background = input.value;
    });
    // change: renk seçimi tamamlandığında kaydet
    input.addEventListener("change", function() {
      swatch.style.background = input.value;
      OnOptionsChange();
    });
  });

  // Reset to defaults
  const resetBtn = document.getElementById("btn-reset-colors");
  if (resetBtn) {
    resetBtn.addEventListener("click", function() {
      const defaults = { "best-arrow": "#FF3333", "other-arrow": "#FECA57" };
      Object.keys(defaults).forEach(function(key) {
        const input  = document.getElementById("option-color-" + key);
        const swatch = document.getElementById("swatch-" + key);
        if (input)  input.value = defaults[key];
        if (swatch) swatch.style.background = defaults[key];
      });
      OnOptionsChange();
    });
  }

  // Engine source select
  const engineSourceSel = document.getElementById("option-engine-source");
  if (engineSourceSel) {
    engineSourceSel.addEventListener("change", function() {
      applyEngineSourceUI(this.value);
      OnOptionsChange();
    });
  }

  // WebSocket engine select — seçim değişir değişmez (input gibi her karakterde değil) kaydet
  const urlApiStockfishSel = document.getElementById("option-url-api-stockfish");
  if (urlApiStockfishSel) {
    urlApiStockfishSel.addEventListener("change", function() {
      const websocketNoticeEl = document.getElementById("websocket-migration-notice");
      if (websocketNoticeEl) websocketNoticeEl.style.display = "none";
      OnOptionsChange();
    });
  }

  const maiaEloSel = document.getElementById("option-maia-elo");
  if (maiaEloSel) {
    maiaEloSel.addEventListener("change", function() {
      OnOptionsChange();
    });
  }

  const moveMethodSel = document.getElementById("option-move-method");
  if (moveMethodSel) {
    moveMethodSel.addEventListener("change", function() {
      OnOptionsChange("option-move-method");
    });
  }

  document.querySelectorAll(".move-method-pill").forEach(function(pill) {
    pill.addEventListener("click", function() {
      document.querySelectorAll(".move-method-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      OnOptionsChange("option-move-method");
    });
  });

  // Reload engine button (same as pressing R)
  const reloadBtn = document.getElementById("btn-reload-engine");
  if (reloadBtn) {
    reloadBtn.addEventListener("click", function() {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { type: "ReloadEngine" }).catch(() => {});
        }
      });
      reloadBtn.classList.add("spinning");
      setTimeout(() => reloadBtn.classList.remove("spinning"), 600);
    });
  }

  // Restore saved values
  RestoreOptions();

  // ── Info tooltip taşma düzeltmesi ──────────────────────────────────
  // Tooltip varsayılan olarak butona ortalanır (CSS: left:50%; translateX(-50%)).
  // Panelin sol/sağ kenarına yakın butonlarda bu taşmaya sebep olabildiği için,
  // hover anında gerçek konumu ölçüp gerekirse yatayda kaydırıyoruz.
  document.querySelectorAll(".info-btn").forEach(function(btn) {
    const tip = btn.querySelector(".info-tooltip");
    if (!tip) return;
    btn.addEventListener("mouseenter", function() {
      tip.style.transform = "translateX(-50%)";
      const margin = 6;
      const rect = tip.getBoundingClientRect();
      let shift = 0;
      if (rect.left < margin) {
        shift = margin - rect.left;
      } else if (rect.right > window.innerWidth - margin) {
        shift = (window.innerWidth - margin) - rect.right;
      }
      if (shift !== 0) {
        tip.style.transform = "translateX(calc(-50% + " + shift + "px))";
      }
    });
  });

});
