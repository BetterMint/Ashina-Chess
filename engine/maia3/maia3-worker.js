// maia3-worker.js
// Mint.js MaiaEngine'den gelen mesajları işler.
//
// Gelen mesajlar:
//   { type: 'init', modelUrl, ortBaseUrl, ortRuntimeUrl }
//   { type: 'inference', id, tokens, eloSelfs, eloOppos, batchSize }
//
// Giden mesajlar:
//   { type: 'status', status: 'loading', progress }
//   { type: 'status', status: 'ready' }
//   { type: 'inference-result', id, logitsMove: ArrayBuffer }
//   { type: 'error', id, message }
//
// NOT: ortRuntimeUrl Mint.js tarafından blob URL olarak gönderilir.
// Blob worker → blob URL arası cross-origin kısıtlaması yoktur.

const TAG = '[Maia3-Worker]';

let session = null;

self.onmessage = async (e) => {
  const msg = e.data;

  if (msg.type === 'init') {
    await handleInit(msg);
    return;
  }

  if (msg.type === 'inference') {
    await handleInference(msg);
    return;
  }

  console.warn(`${TAG} Bilinmeyen mesaj tipi:`, msg.type);
};

async function handleInit({ modelUrl, ortBaseUrl, ortRuntimeUrl, ortSourceCode }) {
  try {
    self.postMessage({ type: 'status', status: 'loading', progress: 0 });

    // 1) ORT runtime'ı yükle.
    // [CSP FIX] İki yol var:
    //   a) ortSourceCode geldiyse (Lichess gibi script-src'de blob: OLMAYAN ama
    //      'unsafe-eval' İZİNLİ sitelerde) — kaynak METİN olarak gelir, indirect
    //      eval ile GLOBAL scope'ta çalıştırılır. Indirect eval ((0, eval)(...))
    //      spec gereği kodu global scope'ta değerlendirir — üst seviye `var`/
    //      fonksiyon tanımları importScripts'teki gibi self.X olarak erişilebilir
    //      olur (ORT'un UMD sarmalayıcısı self.ort = {...} atamasını böylece
    //      normal şekilde yapabilir).
    //   b) ortRuntimeUrl geldiyse (chess.com gibi script-src'de blob: İZİNLİ
    //      sitelerde, ESKİ/MEVCUT yöntem) — importScripts ile yüklenir,
    //      DEĞİŞTİRİLMEDİ, chess.com tarafı bu koddan hiç etkilenmiyor.
    // [KÖK NEDEN BULUNDU — "ort is not defined"] ONNX Runtime Web'in minified
    // bundle'ı "use strict"; ile başlıyor (modern webpack/rollup çıktısı
    // standardı). STRICT-MODE indirect eval'da top-level `var` bildirimleri
    // GLOBAL SCOPE'A SIZMAZ — eval kendi izole scope'unda kalır. Yani
    // dosyanın içindeki `var ort = {...}` eval bitince dışarıdan görünmüyordu
    // (hem ort.wasm.min.js hem ort.min.js AYNI şekilde başarısız oldu —
    // "yanlış dosya" değil, bu scope izolasyonu sorunuydu).
    //
    // ÇÖZÜM: dosyanın SONUNDA bir CommonJS-interop satırı var:
    //   typeof exports=="object"&&typeof module=="object"&&(module.exports=ort);
    // Eval'dan ÖNCE global'e (self üzerinde) sahte bir `module`/`exports`
    // objesi koyuyoruz. Bu satır çalışınca (module VE exports typeof
    // "object" olduğu için koşul sağlanır) ORT'un kendi `ort` objesini
    // BİZİM module.exports'umuza yazar. Bu, eval'ın KENDİ değişken
    // bildirimlerine değil, ÖNCEDEN VAR OLAN bir global objenin İÇİNE
    // property atamaya dayanıyor — strict mode bunu ENGELLEMEZ (scope leak
    // değil, sıradan property assignment).
    console.log(`${TAG} [ort-debug] ortSourceCode var mı:`, !!ortSourceCode, "uzunluk:", ortSourceCode ? ortSourceCode.length : 0, "| ortRuntimeUrl:", ortRuntimeUrl);
    if (ortSourceCode) {
      self.module  = { exports: {} };
      self.exports = self.module.exports;
      (0, eval)(ortSourceCode);
      console.log(`${TAG} [ort-debug] eval sonrası (strict-mode var leak denemesi) — typeof ort:`, typeof ort, "| typeof self.ort:", typeof self.ort, "| module.exports key sayısı:", Object.keys(self.module.exports || {}).length);
      if (typeof self.ort === 'undefined') {
        if (self.module.exports && Object.keys(self.module.exports).length > 0) {
          self.ort = self.module.exports;
          console.log(`${TAG} [ort-debug] ✅ CJS-interop yakalaması başarılı — self.ort artık module.exports'tan geliyor, key sayısı:`, Object.keys(self.ort).length);
        } else {
          console.error(`${TAG} [ort-debug] ❌ CJS-interop yakalaması da başarısız — module.exports boş. ORT bundle'ının export mekanizması beklenenden farklı olabilir.`);
        }
      }
      // Temizlik — global'i kirletmeyelim (ort artık self.ort'ta güvenli)
      delete self.module;
      delete self.exports;
    } else {
      importScripts(ortRuntimeUrl);
      console.log(`${TAG} [ort-debug] importScripts sonrası — typeof ort:`, typeof ort, "| typeof self.ort:", typeof self.ort);
    }

    // [KÖK NEDEN #2 — "no available backend found ... Failed to fetch"]
    // ONNX Runtime Web v1.19.0+'dan itibaren TEK build dağıtılıyor:
    // ort-wasm-simd-threaded.wasm/.mjs (non-threaded varyantlar tamamen
    // kaldırıldı — resmi dokümantasyon: "ONNX Runtime Web is dropping support
    // for non-SIMD and non-threaded builds ... since v1.19.0"). Yani dosya adı
    // sorun değildi. Asıl sorun: bu build varsayılan olarak ÇOKLU-THREAD
    // çalışmayı dener, bunun için KENDİ İÇİNDE ek bir Worker daha spawn eder
    // (nested worker). Bizim worker zaten bir blob: URL'den türetilmiş
    // (extension kaynağından) ve Lichess.org muhtemelen cross-origin-isolated
    // DEĞİL (COOP/COEP header'ları yok → self.crossOriginIsolated=false →
    // SharedArrayBuffer yok) — bu şartlar altında iç worker/fetch mekanizması
    // tıkanıyor ve "Failed to fetch" ile başarısız oluyor.
    // ÇÖZÜM (resmi ONNX Runtime dokümantasyonunun önerdiği standart yöntem):
    // numThreads=1 ile threading'i tamamen KAPAT — tüm çalışma MEVCUT worker
    // içinde, tek thread'de yürür, hiçbir nested worker/import() denenmez.
    ort.env.wasm.numThreads = 1;
    // proxy: true ise ORT, inference'ı ayrı bir "proxy worker"a devretmeye
    // çalışır (yine nested worker spawn) — false ile tamamen mevcut worker
    // context'inde tutuyoruz.
    ort.env.wasm.proxy = false;
    console.log(`${TAG} [ort-debug] numThreads=1, proxy=false ayarlandı (nested worker spawn'ı önlemek için)`);

    // 2) WASM path ayarla
    ort.env.wasm.wasmPaths = ortBaseUrl;

    self.postMessage({ type: 'status', status: 'loading', progress: 30 });

    // 3) Model fetch
    const resp = await fetch(modelUrl);
    if (!resp.ok) throw new Error(`Model fetch HTTP ${resp.status}`);
    const modelBuf = await resp.arrayBuffer();

    self.postMessage({ type: 'status', status: 'loading', progress: 70 });

    // 4) ONNX session oluştur
    session = await ort.InferenceSession.create(modelBuf, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'basic',
    });

    self.postMessage({ type: 'status', status: 'ready' });

  } catch (err) {
    console.error(`${TAG} init HATA:`, err.message);
    self.postMessage({ type: 'error', id: null, message: err.message });
  }
}

async function handleInference({ id, tokens, eloSelfs, eloOppos, batchSize }) {
  if (!session) {
    console.error(`${TAG} inference çağrıldı ama session yok! id: ${id}`);
    self.postMessage({ type: 'error', id, message: 'Session hazır değil' });
    return;
  }

  try {
    const B = batchSize ?? 1;

    const tokenFlat     = new Float32Array(tokens);
    const tokenTensor   = new ort.Tensor('float32', tokenFlat, [B, 64, 12]);
    const selfEloTensor = new ort.Tensor('float32', new Float32Array(eloSelfs), [B]);
    const oppoEloTensor = new ort.Tensor('float32', new Float32Array(eloOppos), [B]);
    const output = await session.run({
      tokens:   tokenTensor,
      elo_self: selfEloTensor,
      elo_oppo: oppoEloTensor,
    });

    const logitsMove = new Float32Array(output['logits_move'].data);

    const buf = logitsMove.buffer.slice(0);
    self.postMessage({ type: 'inference-result', id, logitsMove: buf }, [buf]);

  } catch (err) {
    console.error(`${TAG} inference HATA id:${id}:`, err.message);
    self.postMessage({ type: 'error', id, message: err.message });
  }
}
