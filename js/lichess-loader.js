// ─── js/lichess-loader.js · lichess.org content script (isolated world) ───
// Mirrors js/loader.js for lichess (own LICHESS_DEFAULTS copy): injects
// chess-lib.js + lichess.js into the page world, manages the Maia 3 engine
// lifecycle, stream mode, fake-title/hide-players/theme, debugger-based move
// capture relayed through js/background.js, and the WebSocket/audio bridges.
"use strict";

// Bu dosya content script olarak çalışır. Görevi:
// 1. background.js'e debugger'ı bağlamasını söylemek
// 2. background.js'ten gelen FEN mesajını almak
// 3. FEN'i page context'teki lichess.js'e iletmek
// 4. lichess.js'i page context'e inject etmek
// 5. Ayar değişikliklerini (options.js'in "UpdateOptions" broadcast'i)
//    page context'e iletmek — chess.com tarafında loader.js'in yaptığı işin
//    aynısı, aksi halde Lichess sekmesi açıkken depth/multipv/engine source
//    değiştirilirse hiçbir şey olmaz.
//
// NOT (konsol): Bu dosya CONTENT SCRIPT olarak çalışır — logları normal
// sayfa konsolunda (F12) görünür. background.js ise SERVICE WORKER'dır,
// onun logları F12'de DEĞİL, chrome://extensions -> ASHINA -> "service
// worker" linkine tıklayıp açılan ayrı konsolda görünür.


// 1. Debugger'ı bağla
chrome.runtime.sendMessage({ type: "LICHESS_ATTACH_DEBUGGER" }, (res) => {
  if (chrome.runtime.lastError) {
  } else {
  }
});

// 2. chess-lib.js (chess.js bundle) + lichess.js'i page context'e SIRAYLA inject et
// NOT: chrome.storage page context'te YOK — bu yüzden başlangıç ayarlarını
// burada (content script'te) okuyup, script tam yüklendikten SONRA bir
// CustomEvent ile page context'e iletiyoruz (UpdateOptions köprüsüyle aynı
// desen). lichess.js içinde DOĞRUDAN chrome.storage çağırmak page context'te
// "Cannot read properties of undefined (reading 'sync')" ile patlar.
//
// chess-lib.js önce yüklenmeli: lichess.js, FEN geçmişini (steps) chess.js ile
// yeniden inşa etmek için page context'te global `Chess` sınıfını kullanıyor
// (bkz. lichess.js — reconstructFen). Lichess'in kendi `steps[i].fen` alanı
// canlı oyunda bazen eksik geliyor (sıra/rok bilgisi olmadan), bu yüzden ham
// veriye güvenmek yerine chess.js ile hamle hamle replay edip gerçek FEN'i
// hesaplıyoruz — chess.com tarafında Ashina.js'in zaten yaptığı gibi.
function injectScript(src) {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL(src);
    script.onload = () => {
      script.remove();
      resolve();
    };
    script.onerror = (e) => {
      resolve(); // yine de devam et, aşağıdaki dispatch en azından denenir
    };
    (document.head || document.documentElement).insertBefore(script, null);
  });
}

// [CSP FIX — ADIM 1] MaiaEngine buraya (ISOLATED WORLD, content script)
// TAŞINDI. Sebep: worker'ın İÇİNDEKİ nested importScripts(blob:...) çağrısı
// (ONNX Runtime yükleme) main world'e (lichess.js, sayfaya <script> ile
// enjekte) enjekte edildiğinde sayfanın CSP'sini (script-src'de blob: yok)
// miras alıp bloke ediliyordu. Isolated world'ten yaratılan worker'lar
// sayfanın değil, UZANTININ kendi CSP'sini taşıyor — bu genelde blob:'u
// yasaklamıyor. Bkz. lichess-maia-csp-fix-roadmap.md.
//
// Bu adımda (ADIM 1) SADECE sınıf taşındı — yaşam döngüsü yönetimi
// (kur/kapat) henüz burada değil (ADIM 2), main world köprüsü de henüz yok
// (ADIM 3-4). lichess.js'teki initLichessEngine()'in maia dalı hâlâ eski
// (artık var olmayan) sınıfı çağırıyor olabilir — bu adım TEK BAŞINA test
// edilebilir (konsolda new MaiaEngine() ile), ADIM 2-4 tamamlanana kadar
// Lichess'te Maia seçmek geçici olarak çalışmayacaktır.
//
// urls objesi aşağıda (Promise.all().then() içinde) kurulduğunda buraya
// (loaderUrls) da atanıyor — MaiaEngine._init() event beklemeden doğrudan
// bu modül-seviyesi kopyayı okuyor (chess.com'daki meta tag / önceki
// Lichess sürümündeki ashinaUrls event'i yerine).
let loaderUrls = null;

class MaiaEngine {
  constructor() {
    this.worker = null;
    this._ready = false;
    this._pendingMap = new Map();   // id → { resolve, timeoutHandle }
    this._idCounter = 0;
    this._allMovesReversed = null;  // JSON: { "0": "e2e4", ... }
    this._inFlight = false;         // paralel duplicate istekleri önler
    this._ortFallbackTried = false; // [ort-debug FIX] ort.wasm.min.js başarısız olursa ort.min.js'i bir kez dene
    this._init();
  }

  async _init(ortUrlOverride) {

    // [CSP FIX — ADIM 1] Bu sınıf artık lichess-loader.js'te (ISOLATED WORLD,
    // content script) yaşıyor — chess.com'da __asina-engine-urls meta
    // tag'inden, sonra Lichess'te (main world'deyken) AsinaLichessInitOptions
    // event'inden okunan bu bilgi artık DOĞRUDAN erişilebilir, çünkü URL'ler
    // zaten bu dosyanın kendi içinde chrome.runtime.getURL(...) ile üretiliyor
    // (bkz. loaderUrls — üretildiği an modül seviyesinde saklanan kopya).
    if (!loaderUrls || !loaderUrls.maia3Worker) {
      return;
    }

    // 1) all_moves_reversed.json'u yükle
    try {
      const r = await fetch(loaderUrls.maia3AllMoves);
      if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
      this._allMovesReversed = await r.json();
      const entryCount = Object.keys(this._allMovesReversed).length;
      if (entryCount !== 4352) {
      }
    } catch (e) {
    }

    // 2) Worker'ı başlat
    const workerUrl = loaderUrls.maia3Worker;
    if (!workerUrl) {
      return;
    }

    // Manifest V3: doğrudan new Worker(chrome-extension://...) çalışmaz
    // → fetch → blob → Worker pattern (lichessEngine worker init'iyle aynı yöntem)
    try {
      const resp = await fetch(workerUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
      const blob    = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      this.worker   = new Worker(blobUrl);
    } catch (e) {
      return;
    }

    this.worker.onmessage = (e) => this._onMessage(e.data);
    this.worker.onerror   = (e) => console.error("[MaiaEngine/Loader] Worker onerror:", e.message, e);

    // [CSP FIX] ORT runtime'ı sayfa context'inde fetch edip METİN olarak
    // worker'a gönderiyoruz — worker `(0, eval)(ortSourceCode)` ile global
    // scope'ta çalıştırıyor (bkz. maia3-worker.js handleInit). Önceki blob
    // yöntemi (fetch → blob → blobUrl → importScripts(blobUrl)) Lichess'in
    // script-src CSP'sinde blob: bulunmadığı için sürekli engelleniyordu
    // ("Loading the script 'blob:...' violates ... script-src" hatası,
    // isolated world'e taşımak da bunu ÇÖZMEDİ — CSP document'e bağlı, JS
    // world'üne değil). Lichess'in CSP'si 'unsafe-eval'i izin veriyor,
    // eval bu boşluktan geçiyor.
    let ortSourceCode = null;
    const ortUrlToFetch = ortUrlOverride || loaderUrls.maia3OrtRuntime;
    try {
      const ortResp = await fetch(ortUrlToFetch);
      if (!ortResp.ok) throw new Error(`ORT fetch HTTP ${ortResp.status}`);
      ortSourceCode = await ortResp.text();
      // [TEŞHİS — "ort is not defined"] Bu satırlar fetch'in gerçekten doğru
      // dosyayı, tam içerikle getirip getirmediğini netleştirir. Uzunluk 0
      // veya çok küçükse (ör. bir hata sayfası HTML'i döndüyse) sorun fetch
      // aşamasında; uzunluk normal (ort.wasm.min.js genelde birkaç yüz KB -
      // birkaç MB minified) ama yine de "ort is not defined" oluyorsa sorun
      // eval aşamasında/global binding'de.
    } catch (e) {
    }

    const initMsg = {
      type:          'init',
      modelUrl:      loaderUrls.maia3Model,
      ortBaseUrl:    loaderUrls.maia3OrtBase,
      ortSourceCode: ortSourceCode, // [CSP FIX] blob URL değil, ham metin
    };
    this.worker.postMessage(initMsg);
  }

  _onMessage(msg) {
    if (msg.type === 'status') {
      if (msg.status === 'ready') {
        this._ready = true;
        window.dispatchEvent(new CustomEvent("AsinaEngineStatus", { detail: { connected: true } }));
        // [CSP FIX — ADIM 3] Bu sınıf artık isolated world'te — main world'deki
        // _lichessFireInitialAnalysisIfNeeded() fonksiyonunu DOĞRUDAN çağıramaz
        // (iki ayrı JS execution context, fonksiyon referansı paylaşılmıyor).
        // Bunun yerine main world'ün dinlediği bir CustomEvent dispatch
        // ediliyor — lichess.js kendi tarafında bunu yakalayıp aynı fonksiyonu
        // (kendi bekleyen FEN'i varsa) tetikliyor (bkz. ADIM 4).
        window.dispatchEvent(new CustomEvent("AsinaLichessMaiaReadyChanged", { detail: { ready: true } }));
      } else if (msg.status === 'loading') {
      }
      return;
    }

    if (msg.type === 'inference-result') {
      const pending = this._pendingMap.get(msg.id);
      if (!pending) {
        return;
      }
      clearTimeout(pending.timeoutHandle);
      this._pendingMap.delete(msg.id);

      // logitsMove Transferable olarak geldi → new Float32Array ile okumak gerekiyor
      const logits  = new Float32Array(msg.logitsMove);

      if (logits.length !== 4352) {
      }

      // Legal mask uygula: legalUciSet varsa sadece legal hamleler arasından seç
      const legalUciSet = pending.legalUciSet;
      let bestIdx = -1;
      let bestLogit = -Infinity;
      for (let i = 0; i < logits.length; i++) {
        const candidateModel = this._allMovesReversed?.[String(i)];
        if (!candidateModel) continue;
        // Model space → gerçek UCI (siyah için mirror)
        const candidateUci = pending.isBlack ? this._mirrorMove(candidateModel) : candidateModel;
        // Legal mask kontrolü
        if (legalUciSet && !legalUciSet.has(candidateUci)) continue;
        if (logits[i] > bestLogit) { bestLogit = logits[i]; bestIdx = i; }
      }
      // Fallback: legal set boşsa veya hiç eşleşme yoksa raw argmax
      if (bestIdx === -1) {
        for (let i = 1; i < logits.length; i++) {
          if (logits[i] > logits[0]) bestIdx = i;
        }
        if (bestIdx === -1) bestIdx = 0;
      }
      let bestMove = this._allMovesReversed?.[String(bestIdx)] ?? null;

      if (bestMove && pending.isBlack) {
        const mirrored = this._mirrorMove(bestMove);
        bestMove = mirrored;
      }

      if (!bestMove) {
      }

      this._inFlight = false;
      pending.resolve(bestMove);
      return;
    }

    if (msg.type === 'error') {

      // [ort-debug FIX] init-time hatası (id: null, worker'ın handleInit'teki
      // catch'inden geliyor) ve daha önce fallback denenmediyse: ort.wasm.min.js
      // yerine ana ort.min.js bundle'ıyla bir kez daha dene. Bu, hangi
      // dosyanın "doğru" olduğunu kesin bilmeden de kendi kendine düzelen bir
      // güvenlik ağı — ikisinden hangisi çalışırsa o kalıcı olarak kullanılır.
      if (msg.id === null && !this._ortFallbackTried) {
        this._ortFallbackTried = true;
        this._init(loaderUrls.maia3OrtRuntimeFallback);
        return;
      }

      const pending = this._pendingMap.get(msg.id);
      if (pending) {
        clearTimeout(pending.timeoutHandle);
        this._pendingMap.delete(msg.id);
        this._inFlight = false;
        pending.resolve(null);
      }
      return;
    }

    // Bilinmeyen mesaj tipi
  }

  _fenToTokens(fen) {
    // Maia3 dataset.py'den birebir türetilmiş kodlama:
    //
    // 1) Siyah oynuyorsa tahta mirror'lanır (rank flip + renk takası).
    //    chess.Board.mirror() eşdeğeri: rank sırası tersine çevrilir VE
    //    büyük/küçük harf yer değiştirir (beyaz↔siyah taş).
    // 2) PIECE kanalları HER ZAMAN sabit: BEYAZ=0-5, SİYAH=6-11.
    //    Own/opponent ayrımı YOK — renk mutlak.
    // 3) Model hamleleri de mirror space'de üretir; siyah için çıktı
    //    mirror_move() ile geri çevrilmesi gerekir (bkz. _onMessage).

    const parts      = fen.split(' ');
    const boardFen   = parts[0];
    const sideToMove = parts[1] || 'w';
    const isBlack    = sideToMove === 'b';

    // Sabit kanal haritası — renk mutlak, asla değişmez
    // P=0 N=1 B=2 R=3 Q=4 K=5 p=6 n=7 b=8 r=9 q=10 k=11
    const PIECE_IDX = { 'P':0,'N':1,'B':2,'R':3,'Q':4,'K':5,
                        'p':6,'n':7,'b':8,'r':9,'q':10,'k':11 };

    const tokens = new Float32Array(64 * 12);
    let ranks = boardFen.split('/'); // ranks[0]=rank8, ranks[7]=rank1

    if (isBlack) {
      // Rank flip: rank sırası tersine çevrilir (rank1 en üste gelir)
      ranks = ranks.slice().reverse();
      // Renk takası: büyük↔küçük harf (beyaz taşlar siyah olur, siyahlar beyaz)
      ranks = ranks.map(r => r.split('').map(ch => {
        if (ch >= 'A' && ch <= 'Z') return ch.toLowerCase();
        if (ch >= 'a' && ch <= 'z') return ch.toUpperCase();
        return ch;
      }).join(''));
    }

    for (let rankIdx = 0; rankIdx < ranks.length; rankIdx++) {
      // ranks[0] artık modelRank=7 (a1=0 convention: rank1=row0, rank8=row7)
      const modelRank = 7 - rankIdx;
      let fileIdx = 0;
      for (const ch of ranks[rankIdx]) {
        if (ch >= '1' && ch <= '8') { fileIdx += parseInt(ch); continue; }
        const idx = PIECE_IDX[ch];
        const sq  = modelRank * 8 + fileIdx;
        if (idx !== undefined) tokens[sq * 12 + idx] = 1.0;
        fileIdx++;
      }
    }
    return tokens; // Float32Array(768) — [64 * 12], history padding model içinde yapılıyor
  }

  // Maia3 utils.py mirror_move() eşdeğeri.
  // Model siyah için hamleyi "beyaz oynuyor gibi" mirror space'de üretir;
  // gerçek UCI hamlesine dönüştürmek için rank'ı 9-rank ile tersine çevir.
  _mirrorMove(uci) {
    if (!uci || uci.length < 4) return uci;
    const mirrorSq = s => s[0] + String(9 - parseInt(s[1]));
    return mirrorSq(uci.slice(0,2)) + mirrorSq(uci.slice(2,4)) + uci.slice(4);
  }

  getBestMove(fen, eloSelf = 1500, eloOppo = 1500, legalUciSet = null) {
    return new Promise((resolve) => {
      if (!this._ready || !this.worker) {
        resolve(null);
        return;
      }

      // Önceki inference henüz tamamlanmadıysa yeni istek gönderme
      if (this._inFlight) {
        resolve(null);
        return;
      }
      this._inFlight = true;

      const id             = ++this._idCounter;
      const isBlack        = (fen.split(' ')[1] || 'w') === 'b';
      const tokens         = this._fenToTokens(fen);

      const timeoutHandle  = setTimeout(() => {
        this._pendingMap.delete(id);
        this._inFlight = false;
        resolve(null);
      }, 10_000);

      this._pendingMap.set(id, { resolve, timeoutHandle, isBlack, legalUciSet });

      // Model raw ELO integer bekliyor (örn. 1500, 2600), float32 olarak gönderilir.
      // Normalizasyon model içinde interpolate_elo() tarafından yapılır (elos / 5000).
      this.worker.postMessage({
        type:      'inference',
        id,
        tokens:    Array.from(tokens),
        eloSelfs:  [eloSelf],
        eloOppos:  [eloOppo],
        batchSize: 1,
      });
    });
  }

  hardStop() {
    this._pendingMap.forEach(p => { clearTimeout(p.timeoutHandle); p.resolve(null); });
    this._pendingMap.clear();
    this._inFlight = false;
    try { this.worker?.terminate(); } catch (_) {}
    this.worker  = null;
    this._ready  = false;
    window.dispatchEvent(new CustomEvent("AsinaEngineStatus", { detail: { connected: false } }));
    // [CSP FIX — ADIM 3] ready:true ile simetrik — main world'ün
    // _lichessMaiaReady bayrağı da anında güncellensin diye.
    window.dispatchEvent(new CustomEvent("AsinaLichessMaiaReadyChanged", { detail: { ready: false } }));
  }
}

// [CSP FIX — ADIM 2] Maia instance'ının yaşam döngüsü artık burada (isolated
// world) yönetiliyor — main world'e "kur/kapat" isteği göndermeye gerek yok,
// çünkü option-engine-source broadcast'ini ZATEN ilk burası alıyor (chrome.runtime.
// onMessage), main world'e sadece relay ediyordu. Relay etmeden önce/sonra
// kendi kararımızı burada veriyoruz.
let lichessMaiaEngine = null; // [CSP FIX — ADIM 2] Artık burada yaşıyor (main world'deki eski kopyası ADIM 4'te kaldırılacak)

function ensureMaiaLifecycle(newSource) {
  if (newSource === "maia") {
    if (!lichessMaiaEngine) {
      lichessMaiaEngine = new MaiaEngine();
    }
  } else if (lichessMaiaEngine) {
    lichessMaiaEngine.hardStop();
    lichessMaiaEngine = null;
  }
}

// [CSP FIX — ADIM 3] İstek/cevap köprüsü — main world (lichess.js), Maia'dan
// hamle önerisi istediğinde artık doğrudan bir metod çağıramıyor (iki ayrı
// JS execution context), bunun yerine bir CustomEvent ile isteğini buraya
// (isolated world) gönderiyor, biz de sonucu ayrı bir CustomEvent ile geri
// gönderiyoruz. requestId, hangi cevabın hangi isteğe ait olduğunu eşleştirmek
// için (main world tarafında zaten bir zaman aşımı + Map deseni kuruluyor,
// ADIM 4).
window.addEventListener("AsinaLichessMaiaRequest", async (evt) => {
  const { requestId, fen, elo, legalUci } = evt.detail;
  if (!lichessMaiaEngine) {
    window.dispatchEvent(new CustomEvent("AsinaLichessMaiaResponse", {
      detail: { requestId, uciMove: null, error: "no-instance" }
    }));
    return;
  }
  const legalUciSet = new Set(legalUci); // main world'den düz array olarak geldi, Set'e çevir
  const uciMove = await lichessMaiaEngine.getBestMove(fen, elo, elo, legalUciSet);
  window.dispatchEvent(new CustomEvent("AsinaLichessMaiaResponse", {
    detail: { requestId, uciMove }
  }));
});


// [COACH REMOVAL — ADIM 7] Coach/Pre-Coach worker host sınıfları
// (CoachWorkerHost, PreCoachWorkerHost), yardımcı veri tabloları
// (ASHINA_COACHES, LOCALE_TO_LANG, buildAudioBase, buildCoachCmd) ve
// istek/cevap köprüsü (AsinaLichessCoachRequest/PreCoachRequest
// dinleyicileri) buradan kaldırıldı — bkz. lichess-coach-removal-roadmap.md.
// Maia (yukarıda) ve ana motor (aşağıda) bu kaldırmadan etkilenmedi.

// GERÇEKTEN kayıtlı olan key'leri döndürüyordu — kullanıcı hiç dokunmadığı
// (hiç kaydetmediği) bir ayar varsa o key hiç gelmiyordu, options.js'teki
// DEFAULTS'un ne dediği önemsiz kalıyordu (ör. option-evaluation-bar'ın
// DEFAULTS'ta true olması hiçbir işe yaramıyordu, storage'da hiç yoksa
// buraya "undefined" olarak düşüyordu). chess.com tarafındaki loader.js
// zaten chrome.storage.sync.get(DefaultExtensionOptions, ...) kullanıyor —
// bu, Chrome'un YERLEŞİK "storage'da yoksa bu default'u kullan" davranışı.
// Lichess tarafı bunu hiç yapmıyordu. Aşağıdaki LICHESS_DEFAULTS,
// options.js'teki DEFAULTS objesinin BİREBİR kopyasıdır (kasıtlı — chess.com
// tarafı da DefaultExtensionOptions'ı options.js'ten AYRI, kendi
// inputObjects'inden türetiyor; iki content script farklı context'lerde
// çalıştığı için paylaşamıyorlar). options.js'te DEFAULTS değişirse burası
// da güncellenmeli.
// ── Stream Mode köprüsü ────────────────────────────────────────────────────
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

// ── ADIM 2 (LICHESS-FAKE-TITLE-ROADMAP.md) — Fake Title enjeksiyonu ────────
// Chess.com'daki applyFakeTitle()'ın (js/loader.js) referans alınmış, Lichess'e
// uyarlanmış hâli — birebir kopya DEĞİL, DOM yapısı tamamen farklı.
//
// KAPSAM KURALI: rozet SADECE "bizim oyuncumuz olduğundan kesin emin
// olduğumuz" elemanlara eklenir. İki güven seviyesi var:
//   (a) Yapısal olarak KESİN biziz — kontrol gerekmez:
//       #user_tag (dasher), .ruser-bottom a.user-link (oyun içi alt satır)
//   (b) Kendi kullanıcı adımızla (href/data-href'teki /@/kullaniciadi veya,
//       href yoksa, düz metin) eşleşince biz oluyoruz — her eleman TEK TEK
//       kontrol edilir, sadece eşleşen enjekte edilir:
//       profil sayfası başlığı, versus ekranı, analiz sayfası, mini-game kartları
// KASITLI OLARAK DAHİL EDİLMEYENLER (emin olamadığımız / bize ait olmayan yerler):
//   - .dasher .user-link (dropdown'daki "Profil" linki — görünen metin zaten
//     kullanıcı adı değil "Profil" kelimesi, rozet eklemek anlamsız olurdu)
//   - Turnuva sıralama tablosu — herkesi listeliyor, kullanıcıdan açık talimat:
//     "turnuva sıralamasındaki herkese eklenmesin"
//   - Sohbet kutusu — sadece rakip görünüyor, biz değiliz
//   - Mesaj kutusu (inbox contact) — karşı taraf, biz değiliz
let _fakeTitleObserver         = null;
let _fakeTitleCurrentValue     = "none";
let _fakeTitleDebounceTimer    = null;
let _ownLichessUsernameRaw     = null; // ilk başarılı okumadan sonra cache'lenir

// Kendi kullanıcı adımızı #user_tag'ten okur — kendi eklediğimiz rozet
// span'ini (varsa) hariç tutarak, böylece kendi enjeksiyonumuz sonucu
// bozulmuş bir değeri asla cache'lemeyiz.
function _getOwnLichessUsername() {
  const tag = document.getElementById("user_tag");
  if (tag) {
    const clone = tag.cloneNode(true);
    clone.querySelectorAll(".ashina-fake-title-lichess").forEach(el => el.remove());
    const raw = clone.textContent.trim();
    if (raw) _ownLichessUsernameRaw = raw;
  }
  return _ownLichessUsernameRaw;
}

// el'in href/data-href'indeki /@/kullaniciadi kısmı bizim adımızla eşleşiyor mu.
function _hrefMatchesOwnUsername(el, ownName) {
  const href = el.getAttribute("href") || el.getAttribute("data-href") || "";
  const m = href.match(/\/@\/([^/?#]+)/);
  return !!m && decodeURIComponent(m[1]).toLowerCase() === ownName.toLowerCase();
}

// href olmayan yerler için (ör. mini-game kartları) düz metin karşılaştırması —
// .rating gibi kardeş/iç içe elemanları hariç tutarak sadece isim metnini alır.
function _textMatchesOwnUsername(el, ownName) {
  const clone = el.cloneNode(true);
  clone.querySelectorAll(".rating, .ashina-fake-title-lichess").forEach(n => n.remove());
  return clone.textContent.trim().toLowerCase() === ownName.toLowerCase();
}

// Tek bir elemana rozeti ekler/günceller — zaten bir .utitle varsa (nadir
// ama olası: gerçekten unvanlı hesap) üzerine yazar, yoksa yeni bir tane
// oluşturup ilk çocuk olarak ekler (gerçek lichess yapısındaki gibi).
function _injectBadgeInto(el, titleVal) {
  if (!el) return;
  const existing = el.querySelector(".utitle");
  if (existing) {
    existing.classList.add("ashina-fake-title-lichess");
    existing.textContent = titleVal + "\u00A0";
  } else {
    const badge = document.createElement("span");
    badge.className = "utitle ashina-fake-title-lichess";
    badge.textContent = titleVal + "\u00A0";
    el.prepend(badge);
  }
}

// Saf DOM enjeksiyonu — observer'dan da, dıştan da çağrılabilir.
function _injectFakeTitleLichess(titleVal) {
  try {
    // 1) Temizlik — önceki turdan kalan rozetleri kaldır (idempotent enjeksiyon)
    document.querySelectorAll(".ashina-fake-title-lichess").forEach(el => el.remove());

    if (!titleVal || titleVal === "none") return;

    // 2a) Yapısal olarak KESİN biziz — kontrolsüz enjekte
    _injectBadgeInto(document.getElementById("user_tag"), titleVal);
    _injectBadgeInto(document.querySelector(".ruser-bottom a.user-link"), titleVal);

    // 2b) Kendi adımızla eşleşenler — her biri tek tek kontrol edilir
    const ownName = _getOwnLichessUsername();
    if (!ownName) return; // kendi adımızı bilmeden karşılaştırma yapamayız

    [
      ".user-show__header .user-link",
      ".versus .user-link",
      ".player.white .user-link",
      ".player.black .user-link",
      ".analyse .user-link",
    ].forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (_hrefMatchesOwnUsername(el, ownName)) _injectBadgeInto(el, titleVal);
      });
    });

    document.querySelectorAll(".mini-game__user").forEach((el) => {
      if (_textMatchesOwnUsername(el, ownName)) _injectBadgeInto(el, titleVal);
    });
  } catch (e) {
    console.warn("[ASHINA-DBG][lichess-loader][fake-title] uygulama hatası:", e);
  }
}

// Observer tetiklendiğinde çağrılır. ÖNEMLİ: enjeksiyonun kendisi de bir DOM
// mutasyonu — observer'ı çalıştırmadan ÖNCE disconnect edip enjeksiyondan
// SONRA yeniden bağlıyoruz, yoksa kendi eklediği badge'i görüp sonsuz
// döngüye (inject → mutation → inject → ...) girerdi.
function _fakeTitleObserverTick() {
  if (!_fakeTitleObserver) return;
  _fakeTitleObserver.disconnect();
  _injectFakeTitleLichess(_fakeTitleCurrentValue);
  _fakeTitleObserver.observe(document.body, { childList: true, subtree: true });
}

// Dışarıdan (ilk yükleme + UpdateOptions) çağrılan asıl giriş noktası.
function applyFakeTitleLichess(titleVal) {
  _fakeTitleCurrentValue = titleVal;

  if (_fakeTitleObserver) {
    _fakeTitleObserver.disconnect();
    _fakeTitleObserver = null;
  }
  clearTimeout(_fakeTitleDebounceTimer);

  _injectFakeTitleLichess(titleVal);

  if (!titleVal || titleVal === "none") return; // "none" — observer'sız kal (temizlik yapıldı)

  _fakeTitleObserver = new MutationObserver(() => {
    clearTimeout(_fakeTitleDebounceTimer);
    _fakeTitleDebounceTimer = setTimeout(_fakeTitleObserverTick, 150);
  });
  _fakeTitleObserver.observe(document.body, { childList: true, subtree: true });
}

// [HIDE-PLAYERS ADIM 2] Saf CSS enjeksiyonu — chess.com'daki loader.js
// applyHidePlayersStyle()'ın Lichess'e uyarlanmış hali. DOM elemanı
// oluşturmuyor, MutationObserver gerektirmiyor: class bazlı CSS kuralları
// sayfa yeniden render olsa bile o class'a sahip her elemanı otomatik
// kapsıyor. Kapsam (roadmap Adım 1'de netleşti + sonradan 4 düzeltme/ekleme —
// sadece verilen 11 bağlam, site geneli değil):
//   1. #user_tag              — üst menü (dasher), kendi kullanıcı adımız
//   2. .dasher .user-link     — dasher açılır menü profil linki
//   3. .user-show__header .user-link — profil sayfası başlığı
//   4. .versus/.player.white/.player.black .user-link — eşleşme özeti ekranı
//   5. .ruser-top/.ruser-bottom .user-link — oyun içi üst/alt oyuncu satırı (+flair)
//   6. a.user-link:has(icon.line) — sohbet kutusu (sarmalayıcı verilmedi,
//      yapısal desenle hedefleniyor — bkz. roadmap sohbet notu)
//   7. .user-link .name        — turnuva sıralama tablosu (sadece isim,
//      .rating kardeş span olduğu için görünür kalıyor)
//   8. .msg-app__side__contact__name — özel mesajlar (inbox) kişi listesi
//   9. .mini-game__user — ana sayfa/tv "devam eden oyunlar" mini kartları,
//      hem üst hem alt oyuncu (BİLİNEN İSTİSNA — analiz sayfasıyla aynı
//      sebep: isim burada da .rating'in yanında aynı <span> içinde düz
//      metin, ayırt edici sarmalayıcı yok, bu yüzden reyting de birlikte
//      blurlanıyor)
//   10. .analyse .user-link   — analiz sayfası (BİLİNEN İSTİSNA: isim burada
//      düz metin olarak .rating'in yanında, aynı <a> içinde — ayırt edici
//      bir sarmalayıcı yok, bu yüzden parantez içi reyting de isimle
//      birlikte blurlanıyor; <good>/<bad> ise <a> dışında kardeş olduğu
//      için etkilenmiyor)
//   11. .tour__notice — turnuva sayfasında çıkan eşleştirme bildirimi
//      ("Hazır ol <kullanıcı_adı>, oyuncular eşleştiriliyor!"). BİLİNEN
//      İSTİSNA — kullanıcı adı burada da ayrı bir sarmalayıcıda değil,
//      cümle içinde düz metin olarak geçiyor (9/10 ile aynı sebep), bu
//      yüzden tüm bildirim metni blurlanıyor, sadece isim değil.
//   12. .podium .user-link — turnuva sonucu podyumu (1./2./3. sıra).
//      Kullanıcının verdiği HTML ile doğrulandı: .first/.second/.third
//      hepsi ortak .podium ebeveyninin içinde ve her biri .trophy
//      kardeşine sahip — .podium tek başına yeterince ayırt edici
//      olduğu için :has(.trophy) gibi ekstra bir koşula gerek kalmadı.
//   13. .chat__members .user-link — turnuva/oyun izleyici listesi
//      ("Spectators" başlığı altında, isimler virgülle ayrılmış).
//   14. .mchat__messages .user-link — turnuva sohbet odasındaki mesaj
//      gönderen nickleri. BİLİNEN İSTİSNA: mesaj GÖVDESİ içindeki
//      @mention linkleri (ör. "@chess7758521 lock in...") class="user-link"
//      TAŞIMIYOR (sadece href var), bu yüzden bunlar blurlanmıyor —
//      sadece mesajı GÖNDEREN'in adı (satır başındaki <a>) blurlanıyor.
//   15. .crosstable__users .user-link — iki oyuncu arası karşılıklı skor
//      (head-to-head) widget'ı, oyun sayfasında oyuncuların üstünde/altında
//      çıkıyor. Kullanıcının verdiği HTML ile doğrulandı: isimler
//      .crosstable__users içinde, skor ayrı bir kardeş (.crosstable__score)
//      olduğu için sadece isimler blurlanıyor, skor sayıları (0-0 gibi)
//      görünür kalıyor.
//   16. .hooks__list .ulink — lobi sayfasındaki "oyuna katıl" (seek/hook)
//      listesi. DİKKAT: diğer 15 bağlamın hepsi `.user-link` kullanırken
//      bu tablo FARKLI bir class (`span.ulink`) kullanıyor — Lichess'in lobi
//      bileşeni ayrı bir UI parçası. Puan/Zaman/Mod sütunları ayrı <td>
//      hücrelerinde olduğu için etkilenmiyor, sadece kullanıcı adı hücresi
//      blurlanıyor.
const LICHESS_HIDE_PLAYERS_STYLE_ID = "ashina-hide-players-style-lichess";

function applyHidePlayersStyleLichess(hide) {
  let existing = document.getElementById(LICHESS_HIDE_PLAYERS_STYLE_ID);
  if (hide) {
    if (!existing) {
      const style = document.createElement("style");
      style.id = LICHESS_HIDE_PLAYERS_STYLE_ID;
      style.textContent = `
        #user_tag,
        .dasher .user-link,
        .user-show__header .user-link,
        .versus .user-link,
        .player.white .user-link,
        .player.black .user-link,
        .ruser-top .user-link,
        .ruser-bottom .user-link,
        a.user-link:has(icon.line),
        .user-link .name,
        .msg-app__side__contact__name,
        .mini-game__user,
        .analyse .user-link,
        .tour__notice,
        .podium .user-link,
        .chat__members .user-link,
        .mchat__messages .user-link,
        .crosstable__users .user-link,
        .hooks__list .ulink {
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

const LICHESS_DEFAULTS = {
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
  "option-theme":               "ashina-red",
  // ── Coach — options.js'teki gerçek DEFAULTS ile BİREBİR AYNI değerler
  // (chess.com tarafı ile paylaşılan tek doğru kaynak budur, buradan
  // KOPYALANDI, ayrıca icat edilmedi). Bu satırlar Coach kaldırılırken
  // silinmişti, yeniden entegrasyonda unutulmuş — kök neden burasıydı:
  // bu key'ler LICHESS_DEFAULTS'ta olmadığı için chrome.storage.sync.get()
  // bunları hiç sormuyordu, opts["option-coach-enabled"] undefined geliyordu,
  // applyLichessCoachOptions da !!undefined = false yapıp "enabled: false"
  // basıyordu — kullanıcı ayarlardan hiç kapatmamış olsa bile.
  "option-coach-enabled":       true,
  "option-pre-analyze-enabled": false,
  "option-coach-move-feedback": true,
  "option-coach-accuracy":      true,
  "option-coach-voice-enabled": true,
  "option-coach-recap":         true,
  "option-coach-depth":         10,
  "option-coach-voice":         "david",
  "option-coach-locale":        "en-US",
  "option-automove-enabled":          false,
  "option-autostart-newgame":         false,
  "option-automove-min":              500,
  "option-automove-max":              3200,
  "option-automove-centerweight":     3,
  "option-flag-mode-enabled":         false,
  "option-instant-recapture":         false,
  "option-fast-simple-moves":         false,
  "option-simulate-checkmates":       false,
  "option-blunder-react":             false,
  "option-stream-mode":               false,
  "option-move-method":               "teleport",
  "option-smart-timing-profile":      "bullet",
  "option-mobile-play-btn":            false, // [BUG FIX — LICHESS-MOBILE-BUTONLAR ADIM 1] eksikti, option-mobile-premove-btn'in yanına eklendi
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

const injectDone = injectScript("js/chess-lib.js").then(() => injectScript("js/lichess.js"));

// [BUG FIX — tema değişince progress bar/panel rengi değişmiyordu]
// loader.js'teki applyThemeToPage() (chess.com) ile birebir aynı — kök
// neden: js/themes.js daha önce Lichess content_scripts'e HİÇ dahil
// değildi, bu yüzden THEMES/DEFAULT_THEME_KEY tanımsızdı ve --theme-*
// CSS değişkenleri Lichess sayfasının :root'una hiç uygulanmıyordu
// (bkz. manifest.json'daki ekleme). Bu fonksiyon şimdi o eksik uygulama
// adımını tamamlıyor.
function applyThemeToPageLichess(themeKey) {
  if (typeof THEMES === "undefined") return;
  const key = themeKey || (typeof DEFAULT_THEME_KEY !== "undefined" ? DEFAULT_THEME_KEY : "ashina-red");
  const theme = THEMES[key] || THEMES[DEFAULT_THEME_KEY];
  if (!theme) return;
  const root = document.documentElement;
  Object.keys(theme.colors).forEach(function(cssVar) {
    root.style.setProperty(cssVar, theme.colors[cssVar]);
  });
}

Promise.all([
  new Promise((resolve) => chrome.storage.sync.get(LICHESS_DEFAULTS, resolve)),
  injectDone,
]).then(([opts]) => {
  // chrome.runtime.getURL de page context'te YOK — worker/wasm/book URL'lerini
  // burada (content script'te) üretip event'e ekliyoruz.
  const urls = {
    workerKomodo: chrome.runtime.getURL("js/komodo.js"),
    workerTorch:  chrome.runtime.getURL("js/torch.js"),
    wasmKomodo:   chrome.runtime.getURL("lib/komodo.wasm"),
    wasmTorch:    chrome.runtime.getURL("lib/torch.wasm"),
    book:         chrome.runtime.getURL("book/book.bin"),
    eco:          chrome.runtime.getURL("book/eco.json"), // [ADIM 2] Book rozeti için
    // [Eval Bar ADIM 1] Saf Stockfish 18 — LichessEvalEngine bunu kullanıyor.
    // Ana motordan (komodo/torch) BAĞIMSIZ, ayrı bir worker.
    stockfish:     chrome.runtime.getURL("js/stockfish-18-single.js"),
    stockfishWasm: chrome.runtime.getURL("lib/stockfish-18-lite-single.wasm"),
    // ── Maia 3 (Lichess motor genişletme — ADIM 1) ──
    maia3Worker:     chrome.runtime.getURL("engine/maia3/maia3-worker.js"),
    maia3Model:      chrome.runtime.getURL("engine/maia3/maia3-23m_fp32.onnx"),
    maia3OrtBase:    chrome.runtime.getURL("engine/maia3/ort/"),
    maia3OrtRuntime: chrome.runtime.getURL("engine/maia3/ort/ort.wasm.min.js"),
    // [ort-debug FIX] Fallback — ort.wasm.min.js "ort is not defined" ile
    // başarısız olursa otomatik olarak ana ort.min.js bundle'ı denenir (bkz.
    // MaiaEngine._onMessage 'error' bloğu). Manifest'te ikisi de zaten
    // web_accessible_resources'ta mevcut.
    maia3OrtRuntimeFallback: chrome.runtime.getURL("engine/maia3/ort/ort.min.js"),
    maia3AllMoves:   chrome.runtime.getURL("engine/maia3/all_moves_reversed.json"),
  };
  loaderUrls = urls; // [CSP FIX — ADIM 1] MaiaEngine artık burada, event beklemeden bunu okuyor
  ensureMaiaLifecycle(opts["option-engine-source"]); // [CSP FIX — ADIM 2] ilk yükleme
  _applyStreamMode(!!opts["option-stream-mode"]); // [STREAM ADIM 1] ilk yükleme
  applyFakeTitleLichess(opts["option-fake-title"]); // [FAKE-TITLE ADIM 4] ilk yükleme
  applyHidePlayersStyleLichess(opts["option-hide-players"]); // [HIDE-PLAYERS ADIM 3] ilk yükleme
  applyThemeToPageLichess(opts["option-theme"]); // [THEME BUG FIX] ilk yükleme
  window.dispatchEvent(new CustomEvent("AsinaLichessInitOptions", { detail: { opts, urls } }));
});

// 3. background.js'ten gelen FEN geçmişini lichess.js'e ilet
// 4. options.js'ten gelen "UpdateOptions" broadcast'ini de aynı köprüyle ilet
//    (options.js chrome.tabs.query({}) ile FİLTRESİZ tüm tab'lara yayın yapıyor,
//    bu yüzden mesaj zaten Lichess tab'ına da düşüyor — sadece dinlemek gerekiyordu)
// [INFO PANEL — ADIM 3] Reload mantığı — hem chrome.runtime "ReloadEngine"
// mesajından (popup/background tetikleyicisi) hem floating.js'in DOM üzerinden
// dispatch ettiği "AsinaReloadEngine" event'inden (isolated world'te aynı
// window'u paylaştıkları için doğrudan yakalanabiliyor) çağrılabilsin diye
// ortak bir fonksiyona çıkarıldı — aynı mantığı iki yerde tekrar yazmamak için.
function performLichessEngineReload() {
  // [R tuşu / popup "Reload Engine" butonu / floating.js reload butonu] —
  // chess.com'daki AsinaReloadEngine köprüsüyle aynı işlev. Maia isolated
  // world'de yaşadığı için burada (loader.js) force-restart ediliyor: önce
  // kapat (newSource'u "maia" dışında bir şey vererek), sonra tekrar aç.
  // Diğer motorlar (komodo/torch/websocket) main world'de yaşıyor, onların
  // reload'u main world'deki reloadLichessEngine() fonksiyonunda
  // (initLichessEngine üzerinden) oluyor.
  if (lichessMaiaEngine) {
    ensureMaiaLifecycle(null);   // mevcut Maia instance'ını kapat
    ensureMaiaLifecycle("maia"); // sıfırdan yeniden kur
  }
  window.dispatchEvent(new CustomEvent("AsinaLichessReloadEngine"));
}

// floating.js (aynı isolated world'te, Adım 1'de Lichess'e de inject edildi)
// reload butonuna tıklanınca bunu dispatch ediyor — chess.com'da doğrudan
// dinleniyor, Lichess'te de aynı şekilde yakalayıp aynı reload mantığını
// tetikliyoruz.
window.addEventListener("AsinaReloadEngine", performLichessEngineReload);

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "LICHESS_HISTORY") {
    window.dispatchEvent(new CustomEvent("AsinaLichessHistory", {
      detail: { steps: msg.steps, lastMove: msg.lastMove }
    }));
  } else if (msg.type === "ReloadEngine") {
    performLichessEngineReload();
  } else if (msg.type === "UpdateOptions" && msg.data) {
    if ("option-stream-mode" in msg.data) {
      _applyStreamMode(!!msg.data["option-stream-mode"]); // [STREAM ADIM 1]
    }
    if ("option-engine-source" in msg.data) {
      // [CSP FIX — ADIM 2] Main world'e relay etmeden ÖNCE kendi kararımızı
      // veriyoruz — bu mesajı zaten ilk burası alıyor, ekstra bir round-trip
      // gerekmiyor (main world'ün ayrıca "Maia kur/kapat" isteği göndermesine
      // gerek yok).
      ensureMaiaLifecycle(msg.data["option-engine-source"]);
    }
    if ("option-fake-title" in msg.data) {
      applyFakeTitleLichess(msg.data["option-fake-title"]); // [FAKE-TITLE ADIM 4]
    }
    if ("option-theme" in msg.data) {
      applyThemeToPageLichess(msg.data["option-theme"]); // [THEME BUG FIX]
    }
    if ("option-hide-players" in msg.data) {
      applyHidePlayersStyleLichess(msg.data["option-hide-players"]); // [HIDE-PLAYERS ADIM 3]
    }
    window.dispatchEvent(new CustomEvent("AsinaLichessOptionsUpdate", {
      detail: msg.data
    }));
  }
});

// ── ADIM 3: WebSocket köprüsü — lichess.js (page context) → lichess-loader.js
// (content script) → background.js ──────────────────────────────────────────
// Lichess'in CSP'si (connect-src sadece wss://*.lichess.org) page context'ten
// açılan WebSocket'i engelliyor (bkz. roadmap ADIM 1 teyidi). background.js
// CSP'ye tabi değil, bu yüzden socket orada yaşıyor (ADIM 2) — burası sadece
// page context ile background arasında event/mesaj relay'i yapıyor
// (chess.com tarafındaki loader.js'in ASHINA_FETCH_AUDIO relay'iyle aynı felsefe).

// page context → background
window.addEventListener("AshinaWsConnect", (e) => {
  chrome.runtime.sendMessage({ type: "LICHESS_WS_CONNECT", url: e.detail.url });
});

window.addEventListener("AshinaWsSend", (e) => {
  chrome.runtime.sendMessage({ type: "LICHESS_WS_SEND", cmd: e.detail.cmd });
});

window.addEventListener("AshinaWsDisconnect", () => {
  chrome.runtime.sendMessage({ type: "LICHESS_WS_DISCONNECT" });
});

// background → page context
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "LICHESS_WS_OPEN") {
    window.dispatchEvent(new CustomEvent("AshinaWsOpen"));
  } else if (msg.type === "LICHESS_WS_MESSAGE") {
    window.dispatchEvent(new CustomEvent("AshinaWsMessage", { detail: { data: msg.data } }));
  } else if (msg.type === "LICHESS_WS_CLOSE") {
    window.dispatchEvent(new CustomEvent("AshinaWsClose"));
  } else if (msg.type === "LICHESS_WS_ERROR") {
    window.dispatchEvent(new CustomEvent("AshinaWsError"));
  }
});

// ── ADIM 5: Ses köprüsü — lichess.js (page context) → lichess-loader.js (content script) → background ──
// Lichess sayfası da text-and-audio.chess.com'a CORS nedeniyle page context'ten
// erişemiyor — chess.com tarafındaki loader.js'in AsinaFetchAudio köprüsüyle
// birebir aynı desen (background.js zaten tab'dan bağımsız çalışıyor, bu
// yüzden background.js'e dokunmaya gerek yok — roadmap ADIM 5'te belirtildiği gibi).
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

// 5. V tuşu ile hamle oynatma — page context'ten (lichess.js) gelen piksel
// koordinatlarını background.js'e ilet, o da chrome.debugger ile gerçek
// mouse sürükleme simülasyonu yapsın (chrome.debugger content script'te de
// page context'te de YOK — sadece background/service worker'da erişilebilir).
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data?.type !== "AshinaLichessDragMove") return;

  const { fromX, fromY, toX, toY, requestId } = event.data;
  chrome.runtime.sendMessage({ type: "LICHESS_DRAG_MOVE", fromX, fromY, toX, toY }, (res) => {
    // [LICHESS-MOBILE-BUTONLAR ADIM 3] Sonucu page context'e geri yansıt —
    // window.playMove()'un döndürdüğü Promise (mobil buton kilidi
    // _lichessMobilePlayBusy için) bu event'i bekliyor. requestId ile
    // eşleştiriliyor ki aynı anda birden fazla playMove() çağrısı olsa bile
    // (teoride, kilit sayesinde pratikte olmaz) doğru Promise'e gitsin.
    let detail;
    if (chrome.runtime.lastError) {
      detail = { requestId, success: false, error: chrome.runtime.lastError.message };
    } else {
      detail = { requestId, ...(res || { success: false, error: "background'dan cevap gelmedi" }) };
    }
    window.dispatchEvent(new CustomEvent("AshinaLichessDragMoveDone", { detail }));
  });
});

// ── Stream Mode: page context → background köprüsü ─────────────────────────
// lichess.js "AsinaSendStreamData" CustomEvent dispatch edince bunu yakala
// ve background.js'e ilet (loader.js'teki ile birebir aynı, sender-agnostic).
window.addEventListener("AsinaSendStreamData", function(evt) {
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

// [BUG FIX — M tuşu kalıcı değildi] loader.js'teki (chess.com) ile birebir
// aynı köprü — main world (lichess.js) chrome.storage'a doğrudan erişemiyor.
// Sadece TEK bir key/value çifti yazıyor, başka hiçbir ayara dokunmuyor.
window.addEventListener("AsinaPersistOption", function(evt) {
  if (!evt.detail || typeof evt.detail.key !== "string") return;
  try {
    chrome.storage.sync.set({ [evt.detail.key]: evt.detail.value });
  } catch (e) {
    // Extension context geçersizleştiyse (reload vb.) sessizce geç
  }
});
