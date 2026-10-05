// ─── js/loader.js · chess.com content script (isolated world) ───
// Owns the chess.com default options map, injects js/Ashina.js into the page
// world, and bridges chrome.storage ↔ page via BetterMintGetOptions /
// BetterMintSendOptions / AsinaPersistOption. Also writes the
// __asina-engine-urls meta tag and applies hide-players / fake-title /
// stream-mode / theme. Turkish comments preserved from the original.
"use strict";

let inputObjects = {
  "option-url-api-stockfish": { default_value: "wss://ProtonnDev-engine.hf.space/rodent3-default" },
  "option-api-stockfish":     { default_value: true },
  "option-show-hints":        { default_value: true },
  "option-move-analysis":     { default_value: false },
  "option-evaluation-bar":    { default_value: true },
  "option-depth-bar":         { default_value: true },
  "option-info-panel":        { default_value: false },
  "option-depth":             { default_value: 8 },
  "option-multipv":           { default_value: 5 },
  "option-pred-depth":         { default_value: 8 },
  "option-uci-elo":           { default_value: 3500 },
  "option-hash":              { default_value: 64 },
  "option-personality":       { default_value: "Default" },
  "option-limit-strength":    { default_value: false },
  "option-auto-skill":        { default_value: false },
  "option-own-book":          { default_value: true },
  "option-chess960":          { default_value: false },
  "option-best-book-line":    { default_value: true  },   // options.js ile eşleştirildi
  "option-limit-book-moves":  { default_value: false },   // EKLENDİ — Book Moves sınırı
  "option-book-moves":        { default_value: 5     },   // EKLENDİ — Book Moves slider (1-11)
  "option-hide-arrows":       { default_value: false },   // EKLENDİ
  "option-hide-players":      { default_value: false },
  "option-fake-title":        { default_value: "none" },
  "option-engine-source":     { default_value: "komodo" },
  "option-maia-elo":           { default_value: 1500 },        // EKLENDİ — Maia ELO fix (storage.sync.get default listesinde yoktu)
  "option-coach-enabled":     { default_value: true    },  // Coach ana switch — [FIX] false idi, options.js'teki gerçek default (true) ile çelişiyordu; ilk yüklemede storage boşken bu değer kullanılıyor, CoachEnabled false okunduğu için triggerCoachAnalysis() en baştan return ediyordu (move feedback/accuracy/tallies/ses — hepsi bloklanıyordu), kullanıcı popup'ta toggle'a dokunup true'yu storage'a kalıcı yazana kadar
  "option-pre-analyze-enabled": { default_value: false },  // Pre-Analyze
  "option-coach-move-feedback": { default_value: true  },  // Tahtada ikon
  "option-coach-accuracy":    { default_value: true    },  // Accuracy widget
  "option-coach-depth":       { default_value: 10      },  // HandleContinuationsDepth (1-20)
  "option-coach-voice":       { default_value: "david" },  // Koç sesi seçimi
  "option-coach-locale":      { default_value: "en-US" },  // ADIM 4: Koç dil seçimi
  "option-coach-voice-enabled": { default_value: true    },  // Koç sesi toggle
  "option-coach-recap":         { default_value: true    },  // Tallies recap widget — [FIX] false idi, options.js'teki default (true) ile çelişiyordu
  "option-automove-enabled":          { default_value: false },
  "option-autostart-newgame":         { default_value: false },
  "option-automove-min":              { default_value: 500   },  // options.js ile eşleştirildi
  "option-automove-max":              { default_value: 3200  },  // options.js ile eşleştirildi
  "option-automove-centerweight":     { default_value: 3     },  // EKLENDİ
  "option-flag-mode-enabled":         { default_value: false },  // EKLENDİ
  "option-instant-recapture":         { default_value: false },
  "option-fast-simple-moves":         { default_value: false },  // EKLENDİ
  "option-simulate-checkmates":       { default_value: false },  // EKLENDİ
  "option-mobile-play-btn":           { default_value: false },
  "option-mobile-premove-btn":         { default_value: false },
  "option-premove-enabled":           { default_value: false },  // EKLENDİ — premove fix
  "option-autopremove-enabled":       { default_value: false },  // EKLENDİ — autopremove fix
  "option-autopremove-mates-enabled": { default_value: false },  // EKLENDİ — autopremove mates fix
  "option-checkmove-enabled":          { default_value: false },
  "option-blunder-react":              { default_value: false },  // EKLENDİ — blunderreact fix
  "option-move-method":                { default_value: "teleport" },  // EKLENDİ — move method
  "option-smart-timing-profile":       { default_value: "bullet" },   // EKLENDİ — smart timing profili
  "option-stream-mode":                { default_value: false },       // EKLENDİ — stream mode (oklar ayrı pencerede)
  "option-opening-white-1":            { default_value: "none" },      // EKLENDİ — Opening Preference
  "option-opening-white-2":            { default_value: "none" },      // EKLENDİ — Opening Preference
  "option-opening-black-1":            { default_value: "none" },      // EKLENDİ — Opening Preference
  "option-opening-black-2":            { default_value: "none" },      // EKLENDİ — Opening Preference
  "option-color-best-arrow":           { default_value: "#FF3333" },   // EKLENDİ — Ok rengi (en iyi)
  "option-color-other-arrow":          { default_value: "#FECA57" },   // EKLENDİ — Ok rengi (diğer)
  "option-theme":                      { default_value: (typeof DEFAULT_THEME_KEY !== "undefined" ? DEFAULT_THEME_KEY : "ashina-red") }, // EKLENDİ — sayfa içi (depth bar / floating panel) tema rengi
  // ── ULTRABULLET MOD — EKLENDİ: bu anahtarlar eksikti, sayfa yenilenince
  // (yeniden inject'te) chrome.storage.sync.get() bunları hiç çekmiyordu,
  // bu yüzden Ultrabullet Mod toggle açık olsa bile motor tarafında
  // undefined/false görünüyordu; kullanıcı toggle'ı elle kapatıp açana
  // kadar düzelmiyordu (options.js'in UpdateOptions broadcast'i geldiğinde
  // düzeliyordu, ama sayfa yenilenince tekrar bozuluyordu).
  "option-ultrabullet-enabled":              { default_value: false },
  "option-ultrabullet-min":                  { default_value: 0     },
  "option-ultrabullet-max":                  { default_value: 1500  },
  "option-ultrabullet-premove-chance":       { default_value: 50    },
  "option-ultrabullet-premove-chain-limit":  { default_value: 3     },
  "option-ultrabullet-checkmove-chance":     { default_value: 50    },
  "option-ultrabullet-ignore-captures":      { default_value: 50    },
  "option-ultrabullet-ignore-recapture":     { default_value: 50    },
  "option-ultrabullet-react-to-check":       { default_value: true  },
  "option-ultrabullet-follow-through-attack":{ default_value: true  },
  "option-ultrabullet-guard-queen":          { default_value: false },
  "option-ultrabullet-flag-mode-enabled":    { default_value: true  },
  "option-ultrabullet-opening-preference":   { default_value: "none"},
};

let DefaultExtensionOptions = {};
for (let key in inputObjects) {
  DefaultExtensionOptions[key] = inputObjects[key].default_value;
}

function injectScript(file) {
  let script = document.createElement("script");
  script.src = chrome.runtime.getURL(file);
  let doc = document.head || document.documentElement;
  doc.insertBefore(script, doc.firstElementChild);
  script.onload = function() { script.remove(); };
}

const HIDE_PLAYERS_STYLE_ID = "ashina-hide-players-style";
const FAKE_TITLE_ID = "ashina-fake-title";
let fakeTitleObserver = null;

// ── Tema rengini sayfa köküne uygula (depth bar / floating panel bu değişkenleri okur) ──
// options.html sadece kendi :root'unu boyar; chess.com sayfasına enjekte
// edilen depthbar.css / floating.css / stream.css bu fonksiyon sayesinde
// aynı --theme-* değişkenlerini görür.
function applyThemeToPage(themeKey) {
  if (typeof THEMES === "undefined") return;
  const key = themeKey || (typeof DEFAULT_THEME_KEY !== "undefined" ? DEFAULT_THEME_KEY : "ashina-red");
  const theme = THEMES[key] || THEMES[DEFAULT_THEME_KEY];
  if (!theme) return;
  const root = document.documentElement;
  Object.keys(theme.colors).forEach(function(cssVar) {
    root.style.setProperty(cssVar, theme.colors[cssVar]);
  });
}

function applyFakeTitle(titleVal) {
  // Varsa tüm eski badge'leri kaldır
  document.querySelectorAll(".ashina-fake-title").forEach(el => el.remove());

  // Observer'ı sıfırla
  if (fakeTitleObserver) {
    fakeTitleObserver.disconnect();
    fakeTitleObserver = null;
  }

  if (!titleVal || titleVal === "none") return;

  function injectAll() {
    // 1) OYUN TAHTASI — alt oyuncu (her zaman biz)
    const bottomPlayer = document.querySelector(
      "#board-layout-player-bottom .cc-user-block-component"
    );
    if (bottomPlayer && !bottomPlayer.querySelector(".ashina-fake-title")) {
      const existing = bottomPlayer.querySelector(".cc-user-title-component");
      if (existing) {
        existing.classList.add("ashina-fake-title");
        existing.textContent = titleVal;
      } else {
        const badge = document.createElement("div");
        badge.className = "cc-user-title-component cc-text-x-small-bold ashina-fake-title";
        badge.textContent = titleVal;
        bottomPlayer.prepend(badge);
      }
    }

    // 2) USER POPOVER — kullanıcı adına tıklayınca çıkan kart
    const popoverBlock = document.querySelector(
      ".user-popover-tagline.cc-user-block-component"
    );
    if (popoverBlock && !popoverBlock.querySelector(".ashina-fake-title")) {
      const existing = popoverBlock.querySelector(".cc-user-title-component");
      if (existing) {
        existing.classList.add("ashina-fake-title");
        existing.textContent = titleVal;
      } else {
        const badge = document.createElement("div");
        badge.className = "cc-user-title-component cc-text-x-small-bold ashina-fake-title";
        badge.textContent = titleVal;
        popoverBlock.prepend(badge);
      }
    }

    // 3) PROFİL SAYFASI — sadece kendi profilimizde (data-can-edit-flair="1")
    const isOwnProfile = document.querySelector('[data-can-edit-flair="1"]');
    const profileBlock = document.querySelector(".profile-card-user-block");
    if (isOwnProfile && profileBlock && !profileBlock.querySelector(".ashina-fake-title")) {
      const existing = profileBlock.querySelector(".profile-card-chesstitle");
      if (existing) {
        existing.classList.add("ashina-fake-title");
        existing.textContent = titleVal;
      } else {
        const badge = document.createElement("a");
        badge.className = "profile-card-chesstitle ashina-fake-title";
        badge.textContent = titleVal;
        const h1 = profileBlock.querySelector("h1.profile-card-username");
        if (h1) profileBlock.insertBefore(badge, h1);
      }
    }

    // 4) OYUN GEÇMİŞİ — URL'den kendi username'ini tespit et
    // chess.com/member/facab/games veya /stats gibi sayfalarda URL'de isim geçer
    const urlMatch = window.location.pathname.match(/\/member\/([^\/]+)/i);
    const isOwnArchive = urlMatch && isOwnProfile; // hem /member/X sayfasında hem de kendi profilimiz
    if (isOwnArchive) {
      document.querySelectorAll(".cc-user-block-component:not(.ashina-injected)").forEach(block => {
        const usernameEl = block.querySelector(
          "[data-test-element='user-tagline-username']"
        );
        if (!usernameEl) return;

        // URL'deki isimle eşleşen blokları bul
        if (usernameEl.textContent.trim().toLowerCase() !== urlMatch[1].toLowerCase()) return;

        block.classList.add("ashina-injected");
        if (!block.querySelector(".ashina-fake-title")) {
          const existing = block.querySelector(".cc-user-title-component");
          if (existing) {
            existing.classList.add("ashina-fake-title");
            existing.textContent = titleVal;
          } else {
            const badge = document.createElement("div");
            badge.className = "cc-user-title-component cc-text-x-small-bold ashina-fake-title";
            badge.textContent = titleVal;
            block.prepend(badge);
          }
        }
      });
    }
  }

  // Hemen dene
  injectAll();

  // DOM değişimlerini izle
  let debounceTimer = null;
  fakeTitleObserver = new MutationObserver(function() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(injectAll, 150);
  });

  function startObserve() {
    if (document.body) {
      fakeTitleObserver.observe(document.body, { childList: true, subtree: true });
    } else {
      document.addEventListener("DOMContentLoaded", function() {
        fakeTitleObserver.observe(document.body, { childList: true, subtree: true });
        injectAll();
      });
    }
  }
  startObserve();
}

function applyHidePlayersStyle(hide) {
  let existing = document.getElementById(HIDE_PLAYERS_STYLE_ID);
  if (hide) {
    if (!existing) {
      const style = document.createElement("style");
      style.id = HIDE_PLAYERS_STYLE_ID;
      style.textContent = `
        .cc-user-username-component[data-test-element="user-tagline-username"] {
          filter: blur(6px) !important;
          user-select: none !important;
        }
        img[data-cy="avatar"],
        .cc-avatar-component:has(img[data-cy="avatar"]) {
          filter: blur(6px) !important;
        }
        h1.profile-card-username {
          filter: blur(6px) !important;
          user-select: none !important;
        }
        .profile-header-avatar-component img {
          filter: blur(6px) !important;
        }
        .cc-avatar-component img.cc-avatar-img {
          filter: blur(6px) !important;
        }
        h2.sidebar-link-text {
          filter: blur(6px) !important;
          user-select: none !important;
        }
        .game-start-message-component.moves-tab-rating-info-ratingInfo {
          filter: blur(6px) !important;
          user-select: none !important;
        }
        a.home-username-link {
          filter: blur(6px) !important;
          user-select: none !important;
        }
      `;
      document.head.appendChild(style);
    }
  } else {
    if (existing) existing.remove();
  }
}

// ── Stream Mode: pencere aç/kapat yönetimi ──
// opts değeri storage'dan gelir; UpdateOptions mesajında anlık değer takip edilir.
let opts = {}; // modül seviyesinde tanımlandı (FIX: onMessage listener'ı bunu görebilsin)
let _streamModeActive = false;

function _applyStreamMode(enabled) {
  if (enabled === _streamModeActive) return;
  _streamModeActive = enabled;
  if (enabled) {
    chrome.runtime.sendMessage({ type: "ASHINA_STREAM_OPEN" });
  } else {
    chrome.runtime.sendMessage({ type: "ASHINA_STREAM_CLOSE" });
  }
}

// [BUG FIX — M tuşu kalıcı değildi] Main world (Ashina.js) chrome.storage'a
// doğrudan erişemiyor — bu köprü, main world'den gelen "şunu storage'a yaz"
// isteğini karşılıyor. Sadece TEK bir key/value çifti yazıyor (M tuşunun
// kendi state'i), başka hiçbir ayara dokunmuyor — mevcut tam-nesne
// OnOptionsChange() akışıyla karışmıyor.
window.addEventListener("AsinaPersistOption", function(evt) {
  if (!evt.detail || typeof evt.detail.key !== "string") return;
  try {
    chrome.storage.sync.set({ [evt.detail.key]: evt.detail.value });
  } catch (e) {
    // Extension context geçersizleştiyse (reload vb.) sessizce geç
  }
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (!request) return;
  if (request.type === "ReloadEngine") {
    window.dispatchEvent(new CustomEvent("AsinaReloadEngine"));
  } else if (request.type === "UpdateOptions" && request.data) {
    Object.assign(opts, request.data); // opts yerel değişkenini güncelle (BetterMintGetOptions için)
    window.dispatchEvent(new CustomEvent("BetterMintUpdateOptions", { detail: request.data }));
    applyHidePlayersStyle(request.data["option-hide-players"]);
    applyFakeTitle(request.data["option-fake-title"]);
    _applyStreamMode(!!request.data["option-stream-mode"]);
    if (typeof request.data["option-theme"] !== "undefined") applyThemeToPage(request.data["option-theme"]);
  } else if (request.type === "UpdateLanguage") {
    // Sadece floating.js yakalar, Ashina.js'e iletilmez
  } else if (request.data !== "popout") {
    if (request.data) Object.assign(opts, request.data); // opts yerel değişkenini güncelle
    window.dispatchEvent(new CustomEvent("BetterMintUpdateOptions", { detail: request.data }));
    if (request.data) applyHidePlayersStyle(request.data["option-hide-players"]);
    if (request.data) applyFakeTitle(request.data["option-fake-title"]);
    if (request.data) _applyStreamMode(!!request.data["option-stream-mode"]);
    if (request.data && typeof request.data["option-theme"] !== "undefined") applyThemeToPage(request.data["option-theme"]);
  } else {
    window.postMessage("popout");
  }
});

// Options'ı önce çek, sonra Ashina.js'i inject et
chrome.storage.sync.get(DefaultExtensionOptions, function(storedOpts) {
  opts = storedOpts; // FIX: modül seviyesindeki opts'u doldur (önceden parametre adı çakışıyordu)
  applyHidePlayersStyle(opts["option-hide-players"]);
  applyFakeTitle(opts["option-fake-title"]);
  _applyStreamMode(!!opts["option-stream-mode"]);
  applyThemeToPage(opts["option-theme"]);

  // BetterMintGetOptions geldiğinde anında cevap ver (race condition yok)
  window.addEventListener("BetterMintGetOptions", function(evt) {
    let request = evt.detail;
    let response = { requestId: request.id, data: opts };
    window.dispatchEvent(new CustomEvent("BetterMintSendOptions", { detail: response }));
  });

  // chrome.runtime.getURL sadece extension context'inde çalışır.
  // Ashina.js page context'inde çalıştığı için URL'leri DOM'a meta tag olarak yazıyoruz.
  // Meta tag'ler her iki context tarafından da DOM üzerinden okunabilir.
  const metaEngineURLs = document.createElement("meta");
  metaEngineURLs.id = "__asina-engine-urls";
  metaEngineURLs.dataset.komodo     = chrome.runtime.getURL("js/komodo.js");
  metaEngineURLs.dataset.torch      = chrome.runtime.getURL("js/torch.js");
  metaEngineURLs.dataset.komodoWasm = chrome.runtime.getURL("lib/komodo.wasm");
  metaEngineURLs.dataset.torchWasm  = chrome.runtime.getURL("lib/torch.wasm");
  metaEngineURLs.dataset.stockfish     = chrome.runtime.getURL("js/stockfish-18-single.js");
  metaEngineURLs.dataset.stockfishWasm = chrome.runtime.getURL("lib/stockfish-18-lite-single.wasm");
  metaEngineURLs.dataset.book       = chrome.runtime.getURL("book/book.bin");
  metaEngineURLs.dataset.eco        = chrome.runtime.getURL("book/eco.json");
  metaEngineURLs.dataset.maia3Worker     = chrome.runtime.getURL("engine/maia3/maia3-worker.js");
  metaEngineURLs.dataset.maia3Model      = chrome.runtime.getURL("engine/maia3/maia3-23m_fp32.onnx");
  metaEngineURLs.dataset.maia3OrtBase    = chrome.runtime.getURL("engine/maia3/ort/");
  metaEngineURLs.dataset.maia3OrtRuntime = chrome.runtime.getURL("engine/maia3/ort/ort.wasm.min.js");
  metaEngineURLs.dataset.maia3AllMoves   = chrome.runtime.getURL("engine/maia3/all_moves_reversed.json");
  (document.head || document.documentElement).appendChild(metaEngineURLs);

  // Şimdi inject et — chess.js Ashina.js içine inline gömülü
  injectScript("js/Ashina.js");
});

// Engine bağlantı durumunu storage'a yaz — floating.js ve popup okur
window.addEventListener("AsinaEngineStatus", function(evt) {
  chrome.storage.local.set({ "ashina-engine-connected": evt.detail.connected });
});

// ── Ses köprüsü: Ashina.js (page context) → loader.js (content script) → background ──
// Ashina.js CORS nedeniyle text-and-audio.chess.com'a erişemiyor.
// Background service worker CORS kısıtlamasına tabi değil.
window.addEventListener("AsinaFetchAudio", function(evt) {
  const { url, requestId } = evt.detail;

  // MV3 SW 5dk sonra uyuyor — callback hiç gelmeyebilir.
  // Timeout ile güvenli fallback: 8sn içinde cevap gelmezse hata döndür.
  let settled = false;
  const fallback = setTimeout(function() {
    if (settled) return;
    settled = true;
    window.dispatchEvent(new CustomEvent("AsinaFetchAudioResponse", {
      detail: { requestId, error: "SW timeout — no response" }
    }));
  }, 8000);

  try {
    chrome.runtime.sendMessage({ type: "ASHINA_FETCH_AUDIO", url }, function(response) {
      if (settled) return;
      settled = true;
      clearTimeout(fallback);
      const detail = (response && typeof response === "object")
        ? { requestId, ...response }
        : { requestId, error: "SW no response" };
      window.dispatchEvent(new CustomEvent("AsinaFetchAudioResponse", { detail }));
    });
  } catch(e) {
    if (!settled) {
      settled = true;
      clearTimeout(fallback);
      window.dispatchEvent(new CustomEvent("AsinaFetchAudioResponse", {
        detail: { requestId, error: "sendMessage failed: " + e.message }
      }));
    }
  }
});

// ── Stream Data köprüsü: Ashina.js (page context) → loader.js (content script) → background ──
// Ashina.js page context'te çalıştığı için chrome.runtime.sendMessage kullanamaz.
// AsinaFetchAudio ile birebir aynı köprü pattern'i: CustomEvent → chrome.runtime.sendMessage
window.addEventListener("AsinaSendStreamData", function(evt) {
  // Stream mode kapalıysa (toggle kapatıldıktan sonra gelen gecikmeli event'ler) gönderme
  if (!evt.detail) return;
  try {
    chrome.runtime.sendMessage({
      type: "ASHINA_STREAM_DATA",
      ...evt.detail
    });
  } catch(e) {
    // Extension context geçersizleştiyse (reload vb.) sessizce geç
  }
});
