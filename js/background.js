// ─── js/background.js · MV3 service worker ───
// Keepalive alarm, stream-proof window management (storage.session), coach
// audio CORS proxy fetch, lichess CDP debugger attach (breakpoint on the move
// handler) + drag-move dispatch, and the WebSocket bridge for js/lichess.js.
// Turkish comments preserved from the original.
// ASHINA Background Service Worker
// chess.com COEP/CORS nedeniyle page context'ten fetch edilemeyen
// ses dosyalarını buradan fetch edip content script'e gönderiyoruz.

// MV3 SW'yi aktif tut — her 25sn'de ping
chrome.alarms.create("keepalive", { periodInMinutes: 0.4 });
chrome.alarms.onAlarm.addListener(() => { /* SW'yi uyanık tut */ });

// ── Stream Mode: pencere yönetimi ──
// NEDEN storage.session: MV3 SW uyku moduna geçince in-memory değişkenler sıfırlanır.
// streamWindowId bir sonraki mesajda null görünür → forwardToStreamWindow hiç çalışmaz.
// chrome.storage.session SW restart'larında korunur, sekme kapanınca temizlenir.

const SESSION_KEY = "ashina_stream_window_id";

async function getStreamWindowId() {
  const data = await chrome.storage.session.get(SESSION_KEY);
  return data[SESSION_KEY] ?? null;
}

async function setStreamWindowId(id) {
  if (id === null) {
    await chrome.storage.session.remove(SESSION_KEY);
  } else {
    await chrome.storage.session.set({ [SESSION_KEY]: id });
  }
}

// NEDEN kilit gerekiyor: STREAM MODE açılışı iki ayrı yoldan tetiklenebiliyor
// (options.js'den doğrudan + her açık chess.com sekmesindeki loader.js'den
// UpdateOptions yayını üzerinden dolaylı). Bu mesajlar neredeyse aynı anda
// gelirse, ikisi de getStreamWindowId()'i "pencere yok" olarak okuyup
// chrome.windows.create()'i iki kez çalıştırabiliyordu (race condition).
// _openStreamPromise, aynı anda gelen tüm çağrıları tek bir çalışan
// işleme bağlayarak bunu engeller.
let _openStreamPromise = null;

async function openStreamWindow() {
  if (_openStreamPromise) {
    // Zaten devam eden bir açma işlemi var — ona "kuyruklan", yenisini başlatma.
    return _openStreamPromise;
  }

  _openStreamPromise = (async () => {
    const existing = await getStreamWindowId();
    if (existing !== null) {
      try {
        await chrome.windows.update(existing, { focused: true });
        return;
      } catch {
        // Pencere artık yok, temizle ve yeniden aç
        await setStreamWindowId(null);
      }
    }

    const win = await chrome.windows.create({
      url: chrome.runtime.getURL("html/stream.html"),
      type: "popup",
      width: 520,
      height: 640
    });

    if (!win) return;
    await setStreamWindowId(win.id);

    // Pencere kapatılırsa storage'ı temizle
    function onRemoved(wId) {
      if (wId === win.id) {
        setStreamWindowId(null);
        chrome.windows.onRemoved.removeListener(onRemoved);
      }
    }
    chrome.windows.onRemoved.addListener(onRemoved);
  })();

  try {
    await _openStreamPromise;
  } finally {
    _openStreamPromise = null;
  }
}

async function closeStreamWindow() {
  const id = await getStreamWindowId();
  if (id === null) return;
  try {
    await chrome.windows.remove(id);
  } catch { /* zaten kapalı */ }
  await setStreamWindowId(null);
}

async function forwardToStreamWindow(msg) {
  const id = await getStreamWindowId();
  if (id === null) return;

  try {
    const win = await chrome.windows.get(id, { populate: true });
    const tab = win?.tabs?.[0];
    if (!tab) return;
    chrome.tabs.sendMessage(tab.id, msg, () => {
      if (chrome.runtime.lastError) { /* stream penceresi henüz yüklenmiyor olabilir */ }
    });
  } catch {
    // Pencere artık yok
    await setStreamWindowId(null);
  }
}

// ── Lichess Debugger Attach (Faz 1) ──
// Lichess sayfasında hamle event'ini yakalamak için CDP debugger kullanılıyor.
// chrome.debugger.onEvent GLOBAL bir event — chess.com tab'larında da (varsa
// başka debugger kullanımı) tetiklenebilir, bu yüzden lichessAttachedTabs
// Set'i ile filtreleniyor. Listener BİR KEZ, modül seviyesinde kaydediliyor —
// LICHESS_ATTACH_DEBUGGER mesajı her geldiğinde (sekme yenilenince tekrar
// tetiklenir) yeniden addListener çağrılırsa aynı event'ler birden fazla kez
// işlenmeye başlar; bunu önlemek için kayıt burada, mesaj handler'ının
// DIŞINDA.
// ── Lichess WebSocket Köprüsü ──────────────────────────────────────────────
// lichess.js page context'ten doğrudan WebSocket açamıyor — Lichess'in CSP'si
// (connect-src sadece wss://*.lichess.org) bunu engelliyor (bkz. roadmap ADIM 1
// teyidi). background.js (service worker) CSP'ye tabi DEĞİL, bu yüzden socket
// burada yaşıyor; page context sadece komut gönderip mesaj event'i alıyor.
let _lichessWsSocket   = null; // aktif WebSocket
let _lichessWsTabId    = null; // hangi tab'a mesaj gönderileceği
let _lichessWsUrl      = null; // aktif URL (referans/log amaçlı)
let _lichessWsReady    = false;

function lichessBgWsConnect(tabId, url) {
  // Varsa eski bağlantıyı kapat — motor tekrar hızlıca değiştirilmiş olabilir
  if (_lichessWsSocket) {
    try { _lichessWsSocket.close(); } catch (e) {}
    _lichessWsSocket = null;
    _lichessWsReady  = false;
  }

  _lichessWsTabId = tabId;
  _lichessWsUrl   = url;

  console.log("[ASHINA-DBG][bg][ws] bağlanılıyor:", url, "tabId:", tabId);

  let socket;
  try {
    socket = new WebSocket(url);
  } catch (e) {
    console.error("[ASHINA-DBG][bg][ws] new WebSocket() exception:", e);
    chrome.tabs.sendMessage(tabId, { type: "LICHESS_WS_ERROR" });
    return;
  }
  _lichessWsSocket = socket;

  socket.onopen = () => {
    if (_lichessWsSocket !== socket) return; // stale-event koruması
    _lichessWsReady = true;
    console.log("[ASHINA-DBG][bg][ws] onopen — tabId:", tabId, "url:", url);
    chrome.tabs.sendMessage(tabId, { type: "LICHESS_WS_OPEN" });
  };

  socket.onmessage = (event) => {
    if (_lichessWsSocket !== socket) return;
    chrome.tabs.sendMessage(tabId, { type: "LICHESS_WS_MESSAGE", data: event.data });
  };

  socket.onclose = () => {
    if (_lichessWsSocket !== socket) return;
    _lichessWsReady = false;
    console.log("[ASHINA-DBG][bg][ws] onclose — tabId:", tabId);
    chrome.tabs.sendMessage(tabId, { type: "LICHESS_WS_CLOSE" });
  };

  socket.onerror = (err) => {
    if (_lichessWsSocket !== socket) return;
    console.error("[ASHINA-DBG][bg][ws] onerror:", err);
    chrome.tabs.sendMessage(tabId, { type: "LICHESS_WS_ERROR" });
  };
}


const LICHESS_TARGET_SIG    = "this.onMove=(e,t,s)=>{s||this.enpassant(e,t)";
const LICHESS_BREAK_SEARCH  = "s||";
const lichessAttachedTabs   = new Set();
const lichessBreakpointIds  = new Map(); // tabId -> breakpointId (sadece kendi breakpoint'imizi işlemek için)
const lichessSafetyTimers   = new Map(); // tabId -> timeoutId (paused'da takılırsa zorla resume)

function lichessForceResume(source) {
  console.log("[ASHINA-DBG][bg] resume çağrılıyor, tabId:", source.tabId);
  chrome.debugger.sendCommand(source, "Debugger.resume", {}, () => {
    if (chrome.runtime.lastError) {
      console.log("[ASHINA-DBG][bg] resume hatası (muhtemelen zaten resume/detach olmuş):", chrome.runtime.lastError.message);
    } else {
      console.log("[ASHINA-DBG][bg] resume başarılı, tabId:", source.tabId);
    }
  });
}

async function lichessTrySetBreakpoint(tabId, url) {
  console.log("[ASHINA-DBG][bg] lichessTrySetBreakpoint deneniyor:", url);
  try {
    const code = await fetch(url).then(r => r.text());
    console.log("[ASHINA-DBG][bg] fetch OK, kod uzunluğu:", code.length, "url:", url);
    const tIdx = code.indexOf(LICHESS_TARGET_SIG);
    if (tIdx === -1) {
      console.log("[ASHINA-DBG][bg] imza bulunamadı bu dosyada:", url);
      return false;
    }
    console.log("[ASHINA-DBG][bg] ✅ imza BULUNDU, index:", tIdx, "url:", url);

    const idx    = tIdx + LICHESS_TARGET_SIG.indexOf(LICHESS_BREAK_SEARCH);
    const before = code.slice(0, idx);
    const lines  = before.split("\n");
    const lineNumber   = lines.length - 1;
    const columnNumber = lines.at(-1).length;
    console.log("[ASHINA-DBG][bg] breakpoint konumu -> line:", lineNumber, "column:", columnNumber);

    const bpRes = await chrome.debugger.sendCommand({ tabId },
      "Debugger.setBreakpointByUrl",
      { url, lineNumber, columnNumber }
    );
    console.log("[ASHINA-DBG][bg] setBreakpointByUrl sonucu:", JSON.stringify(bpRes));
    if (bpRes && bpRes.breakpointId) {
      lichessBreakpointIds.set(tabId, bpRes.breakpointId);
      console.log("[ASHINA-DBG][bg] ✅ breakpoint KAYDEDİLDİ, id:", bpRes.breakpointId, "tabId:", tabId);
      return true;
    }
    console.log("[ASHINA-DBG][bg] ⚠️ setBreakpointByUrl başarısız — breakpointId dönmedi");
    return false;
  } catch (err) {
    console.log("[ASHINA-DBG][bg] ❌ lichessTrySetBreakpoint hata:", url, err?.message || err);
    return false;
  }
}

chrome.debugger.onEvent.addListener(async (source, method, params) => {
  if (!lichessAttachedTabs.has(source.tabId)) return; // sadece bizim attach ettiğimiz tab'lar

  if (method === "Debugger.scriptParsed" && params.url) {
    console.log("[ASHINA-DBG][bg] Debugger.scriptParsed:", params.url);
    await lichessTrySetBreakpoint(source.tabId, params.url);
  }

  if (method === "Debugger.paused") {
    console.log("[ASHINA-DBG][bg] 🛑 Debugger.paused geldi. hitBreakpoints:", JSON.stringify(params.hitBreakpoints), "callFrames var mı:", !!params.callFrames?.length);

    // Güvenlik ağı — herhangi bir sebeple (ör. service worker'ın awaits
    // arasında askıya alınması) normal akış resume'a ulaşamazsa, sayfa
    // sonsuza dek asılı kalıp Chrome'un DevTools'u kendiliğinden açmasına
    // yol açmasın diye 750ms sonra zorla resume et. Normal akış zaten
    // resume ettiyse bu ikinci çağrı zararsız bir no-op olur.
    const safetyTimer = setTimeout(() => {
      console.log("[ASHINA-DBG][bg] ⏱️ GÜVENLİK AĞI TETİKLENDİ — normal akış 750ms'de resume etmedi!");
      lichessForceResume(source);
    }, 750);
    lichessSafetyTimers.set(source.tabId, safetyTimer);

    // Sadece BİZİM breakpoint'imize denk geldiyse işle — başka bir sebeple
    // (stale breakpoint, lichess'in kendi debugger; ifadesi vb.) pause
    // olduysa hiçbir şey evaluate etmeden anında resume et.
    const ownBreakpointId = lichessBreakpointIds.get(source.tabId);
    const isOwnBreakpoint = params.hitBreakpoints && ownBreakpointId &&
      params.hitBreakpoints.includes(ownBreakpointId);
    console.log("[ASHINA-DBG][bg] ownBreakpointId:", ownBreakpointId, "isOwnBreakpoint:", isOwnBreakpoint);

    if (!isOwnBreakpoint || !params.callFrames?.length) {
      console.log("[ASHINA-DBG][bg] bizim breakpoint değil (veya callFrame yok) — direkt resume");
      clearTimeout(safetyTimer);
      lichessSafetyTimers.delete(source.tabId);
      lichessForceResume(source);
      return;
    }

    try {
      const callFrameId = params.callFrames[0].callFrameId;
      console.log("[ASHINA-DBG][bg] evaluate başlıyor, callFrameId:", callFrameId);

      const stepsRes = await chrome.debugger.sendCommand(source,
        "Debugger.evaluateOnCallFrame",
        { callFrameId, expression: "this.data.steps", returnByValue: true }
      );
      console.log("[ASHINA-DBG][bg] stepsRes:", JSON.stringify(stepsRes).slice(0, 500));

      const moveRes = await chrome.debugger.sendCommand(source,
        "Debugger.evaluateOnCallFrame",
        { callFrameId, expression: "({ e, t })", returnByValue: true }
      );
      console.log("[ASHINA-DBG][bg] moveRes:", JSON.stringify(moveRes).slice(0, 500));

      const steps   = stepsRes.result?.value || [];
      const { e: from, t: to } = moveRes.result.value;
      console.log("[ASHINA-DBG][bg] ✅ hamle çözüldü:", from, "->", to, "| steps sayısı:", steps.length);

      // FEN geçmişini chess.js ile reconstruct et
      // (chess.js Ashina.js içine inline gömülü — background'da yok)
      // Bu yüzden ham steps'i content script'e gönder, orada işle
      chrome.tabs.sendMessage(source.tabId, {
        type: "LICHESS_HISTORY",
        steps,
        lastMove: from + to,
      }, () => {
        if (chrome.runtime.lastError) {
          console.log("[ASHINA-DBG][bg] ❌ LICHESS_HISTORY content script'e ULAŞMADI:", chrome.runtime.lastError.message);
        } else {
          console.log("[ASHINA-DBG][bg] ✅ LICHESS_HISTORY content script'e gönderildi");
        }
      });
    } catch (err) {
      console.log("[ASHINA-DBG][bg] ❌ evaluate/parse aşamasında hata:", err?.message || err);
    } finally {
      console.log("[ASHINA-DBG][bg] finally -> resume ediliyor");
      clearTimeout(safetyTimer);
      lichessSafetyTimers.delete(source.tabId);
      lichessForceResume(source);
    }
  }
});

// Debugger koparsa (sekme kapandı, DevTools elle açıldı vb.) takip setinden düş
chrome.debugger.onDetach.addListener((source) => {
  console.log("[ASHINA-DBG][bg] onDetach — tabId:", source.tabId);
  lichessAttachedTabs.delete(source.tabId);
  lichessBreakpointIds.delete(source.tabId);
  const t = lichessSafetyTimers.get(source.tabId);
  if (t) { clearTimeout(t); lichessSafetyTimers.delete(source.tabId); }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'ASHINA_FETCH_AUDIO') {
    fetch(msg.url)
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.arrayBuffer();
      })
      .then(buffer => {
        sendResponse({ buffer: Array.from(new Uint8Array(buffer)) });
      })
      .catch(err => sendResponse({ error: err.message }));
    return true; // async response
  }

  if (msg.type === 'ASHINA_STREAM_OPEN') {
    openStreamWindow();
    return;
  }

  if (msg.type === 'ASHINA_STREAM_CLOSE') {
    closeStreamWindow();
    return;
  }

  if (msg.type === 'ASHINA_STREAM_DATA') {
    forwardToStreamWindow(msg);
    return;
  }

  if (msg.type === 'LICHESS_ATTACH_DEBUGGER') {
    const tabId = sender.tab?.id;
    console.log("[ASHINA-DBG][bg] LICHESS_ATTACH_DEBUGGER mesajı geldi, tabId:", tabId, "sender.tab.url:", sender.tab?.url);
    if (!tabId) { console.log("[ASHINA-DBG][bg] ❌ tabId yok, çıkılıyor"); return; }

    // Her istekte önce detach — SPA içi yeniden inject'lerde eski
    // session'dan kalma breakpoint/state birikmesini önler (ChessHv3 ile
    // aynı desen). detach hata verirse (zaten bağlı değildi) yok sayılır.
    chrome.debugger.detach({ tabId }, () => {
      if (chrome.runtime.lastError) {
        console.log("[ASHINA-DBG][bg] detach (zaten bağlı değildi, normal):", chrome.runtime.lastError.message);
      } else {
        console.log("[ASHINA-DBG][bg] detach OK (eski session varsa temizlendi)");
      }

      chrome.debugger.attach({ tabId }, "1.3", async () => {
        if (chrome.runtime.lastError) {
          console.warn("[ASHINA-DBG][bg] ❌ attach FAILED:", chrome.runtime.lastError.message);
          return;
        }
        console.log("[ASHINA-DBG][bg] ✅ attach OK, tabId:", tabId);
        lichessAttachedTabs.add(tabId);
        lichessBreakpointIds.delete(tabId); // eski ID'yi temizle, yeni session'da yeniden bulunacak
        await chrome.debugger.sendCommand({ tabId }, "Debugger.enable");
        console.log("[ASHINA-DBG][bg] Debugger.enable gönderildi");

        // Sayfadaki mevcut script'leri tara
        const result = await chrome.scripting.executeScript({
          target: { tabId },
          func: () => [...document.scripts].map(s => s.src).filter(Boolean),
        });
        const urls = result[0]?.result || [];
        console.log("[ASHINA-DBG][bg] sayfada bulunan script sayısı:", urls.length, urls);
        let bpFound = false;
        for (const url of urls) {
          if (await lichessTrySetBreakpoint(tabId, url)) { bpFound = true; break; }
        }
        console.log(bpFound
          ? "[ASHINA-DBG][bg] ✅ İLK TARAMADA breakpoint kondu"
          : "[ASHINA-DBG][bg] ⚠️ İlk taramada imza bulunamadı — Debugger.scriptParsed ile sonradan yüklenen script'lerde aranmaya devam edecek");
      });
    });

    sendResponse({ success: true });
    return true;
  }

  if (msg.type === 'LICHESS_DRAG_MOVE') {
    const tabId = sender.tab?.id;
    if (!tabId) { sendResponse({ success: false, error: "no tabId" }); return; }

    const { fromX, fromY, toX, toY } = msg;
    console.log("[ASHINA-TIMING][bg] L) LICHESS_DRAG_MOVE ALINDI @", performance.now().toFixed(0), fromX, fromY, "->", toX, toY);

    const sendMouseEvent = (params) => new Promise((resolve, reject) => {
      chrome.debugger.sendCommand({ tabId }, "Input.dispatchMouseEvent", params, () => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve();
      });
    });

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    (async () => {
      try {
        // [BUG FIX — TEK DOKUNUŞTA HAMLE ÇALIŞMIYOR] Kök neden: mousePressed →
        // mouseMoved(x10) → mouseReleased olayları öncesi HİÇ gecikme yoktu.
        // Chessground mousedown anında kendi document-level mousemove/mouseup
        // dinleyicilerini kuruyor; olaylar bu kadar hızlı art arda dispatch
        // edilince tarayıcı bu dinleyicileri kaydetmeden sonraki mouseMoved
        // olayları işleniyor ve sürükleme hiç başlamamış sayılıyor — hamle
        // sessizce kayboluyor. Kritik olan TEK gecikme mousePressed sonrasıdır
        // (chessground'un listener kurması için). Adım arası ve release öncesi
        // gecikmeler sadece güvenlik payı — hıza dokunmadan minimuma indirildi.
        // [HIZ GÜNCELLEMESİ] İlk versiyon (40/12×10/30 ≈ 190ms ekstra) güvenilir
        // ama gözle fark edilir derecede yavaştı. Adım sayısı ve gecikmeler
        // aşağıya çekildi (~25/5×6/10 ≈ 65ms ekstra) — güvenilirlik testte
        // korundu, algılanan gecikme ~3 kat azaldı.
        await sendMouseEvent({ type: "mousePressed", x: fromX, y: fromY, button: "left", clickCount: 1 });
        await sleep(25); // chessground'un mousedown handler'ı + listener kurulumu için zaman tanı

        const steps = 6;
        for (let i = 1; i <= steps; i++) {
          const x = fromX + (toX - fromX) * (i / steps);
          const y = fromY + (toY - fromY) * (i / steps);
          await sendMouseEvent({ type: "mouseMoved", x, y, button: "left" });
          await sleep(5); // adımlar arasına minimal render/olay-döngüsü boşluğu
        }

        await sleep(10); // son konumdan release'e geçmeden önce minimal bekleme
        await sendMouseEvent({ type: "mouseReleased", x: toX, y: toY, button: "left", clickCount: 1 });

        console.log("[ASHINA-DBG][bg] ✅ LICHESS_DRAG_MOVE tamamlandı:", fromX, fromY, "->", toX, toY);
        console.log("[ASHINA-TIMING][bg] M) LICHESS_DRAG_MOVE TAMAMLANDI (sendResponse) @", performance.now().toFixed(0));
        sendResponse({ success: true });
      } catch (err) {
        console.log("[ASHINA-DBG][bg] ❌ LICHESS_DRAG_MOVE hata:", err?.message || err);
        sendResponse({ success: false, error: err?.message || String(err) });
      }
    })();

    return true; // async response
  }

  if (msg.type === 'LICHESS_WS_CONNECT') {
    lichessBgWsConnect(sender.tab.id, msg.url);
    sendResponse({ success: true });
    return true;
  }

  if (msg.type === 'LICHESS_WS_SEND') {
    if (_lichessWsSocket && _lichessWsSocket.readyState === WebSocket.OPEN) {
      _lichessWsSocket.send(msg.cmd);
    } else {
      console.warn("[ASHINA-DBG][bg][ws] LICHESS_WS_SEND — socket hazır değil, komut atlandı:", msg.cmd);
    }
    return false;
  }

  if (msg.type === 'LICHESS_WS_DISCONNECT') {
    if (_lichessWsSocket) {
      try { _lichessWsSocket.close(); } catch (e) {}
      _lichessWsSocket = null;
      _lichessWsReady  = false;
    }
    return false;
  }
});
