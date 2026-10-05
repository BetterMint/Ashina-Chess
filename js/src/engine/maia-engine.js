// ─── engine/maia-engine.js · Maia 3 (ONNX) worker bridge for human-like moves ───
export class MaiaEngine {
  constructor() {
    this.worker = null;
    this._ready = false;
    this._pendingMap = new Map();
    this._idCounter = 0;
    this._allMovesReversed = null;
    this._inFlight = false;
    this._init();
  }
  async _init() {
    const meta = document.getElementById("__asina-engine-urls");
    if (!meta) {
      console.error("[MaiaEngine] _init — __asina-engine-urls meta tag bulunamadı! loader.js doğru çalışmıyor olabilir.");
      return;
    }
    try {
      const movesResponse = await fetch(meta.dataset.maia3AllMoves);
      if (!movesResponse.ok) {
        throw new Error("HTTP " + movesResponse.status + " " + movesResponse.statusText);
      }
      this._allMovesReversed = await movesResponse.json();
      const entryCount = Object.keys(this._allMovesReversed).length;
      if (entryCount !== 4352) {
        console.warn("[MaiaEngine] _init — all_moves_reversed entry sayısı beklenenden farklı! (" + entryCount + " !== 4352)");
      }
    } catch (error) {
      console.error("[MaiaEngine] _init — all_moves_reversed.json yüklenemedi:", error);
    }
    const workerUrl = meta.dataset.maia3Worker;
    if (!workerUrl) {
      console.error("[MaiaEngine] _init — maia3Worker URL boş! manifest.json web_accessible_resources kontrol et.");
      return;
    }
    try {
      const workerResponse = await fetch(workerUrl);
      if (!workerResponse.ok) {
        throw new Error("HTTP " + workerResponse.status + " " + workerResponse.statusText);
      }
      const workerBlob = await workerResponse.blob();
      const workerBlobUrl = URL.createObjectURL(workerBlob);
      this.worker = new Worker(workerBlobUrl);
    } catch (error) {
      console.error("[MaiaEngine] _init — Worker oluşturulamadı:", error);
      return;
    }
    this.worker.onmessage = event => this._onMessage(event.data);
    this.worker.onerror = error => console.error("[MaiaEngine] Worker onerror:", error.message, error);
    let ortRuntimeUrl = meta.dataset.maia3OrtRuntime;
    try {
      const ortResponse = await fetch(meta.dataset.maia3OrtRuntime);
      if (!ortResponse.ok) {
        throw new Error("ORT fetch HTTP " + ortResponse.status);
      }
      const ortBlob = await ortResponse.blob();
      ortRuntimeUrl = URL.createObjectURL(ortBlob);
    } catch (error) {
      console.error("[MaiaEngine] _init — ORT blob URL oluşturulamadı:", error);
    }
    const initMsg = {
      type: "init",
      modelUrl: meta.dataset.maia3Model,
      ortBaseUrl: meta.dataset.maia3OrtBase,
      ortRuntimeUrl: ortRuntimeUrl
    };
    // Hand the worker its configuration: ONNX model URL, ORT runtime base and
    // (if the runtime fetch above succeeded) a blob URL for the ORT script —
    // blob URLs bypass the page CSP that would block the extension URL.
    this.worker.postMessage(initMsg);
  }
  _onMessage(msg) {
    if (msg.type === "status") {
      if (msg.status === "ready") {
        this._ready = true;
        window.dispatchEvent(new CustomEvent("AsinaEngineStatus", {
          detail: {
            connected: true
          }
        }));
      } else if (msg.status === "loading") {}
      return;
    }
    if (msg.type === "inference-result") {
      const pending = this._pendingMap.get(msg.id);
      if (!pending) {
        console.warn("[MaiaEngine] _onMessage — inference-result için pending bulunamadı, id:", msg.id, "(timeout olmuş olabilir)");
        return;
      }
      clearTimeout(pending.timeoutHandle);
      this._pendingMap.delete(msg.id);
      const logits = new Float32Array(msg.logitsMove);
      if (logits.length !== 4352) {
        console.warn("[MaiaEngine] _onMessage — logits boyutu beklenenden farklı! (" + logits.length + " !== 4352)");
      }
      const legalUciSet = pending.legalUciSet;
      let bestIndex = -1;
      let bestLogit = -Infinity;
      for (let index = 0; index < logits.length; index++) {
        const uciMove = this._allMovesReversed?.[String(index)];
        if (!uciMove) {
          continue;
        }
        const orientedMove = pending.isBlack ? this._mirrorMove(uciMove) : uciMove;
        if (legalUciSet && !legalUciSet.has(orientedMove)) {
          continue;
        }
        if (logits[index] > bestLogit) {
          bestLogit = logits[index];
          bestIndex = index;
        }
      }
      if (bestIndex === -1) {
        console.warn("[MaiaEngine] _onMessage — legal mask eşleşmesi yok, raw argmax kullanılıyor");
        for (let index = 1; index < logits.length; index++) {
          if (logits[index] > logits[0]) {
            bestIndex = index;
          }
        }
        if (bestIndex === -1) {
          bestIndex = 0;
        }
      }
      let bestMove = this._allMovesReversed?.[String(bestIndex)] ?? null;
      if (bestMove && pending.isBlack) {
        const mirrored = this._mirrorMove(bestMove);
        bestMove = mirrored;
      }
      if (!bestMove) {
        console.warn("[MaiaEngine] _onMessage — bestMove null! all_moves_reversed'de index yok:", bestIndex);
      }
      this._inFlight = false;
      pending.resolve(bestMove);
      return;
    }
    if (msg.type === "error") {
      console.error("[MaiaEngine] _onMessage — worker hata bildirdi:", msg);
      const pending = this._pendingMap.get(msg.id);
      if (pending) {
        clearTimeout(pending.timeoutHandle);
        this._pendingMap.delete(msg.id);
        this._inFlight = false;
        pending.resolve(null);
      }
      return;
    }
    console.warn("[MaiaEngine] _onMessage — bilinmeyen mesaj tipi:", msg.type, msg);
  }
  _fenToTokens(fen) {
    const parts = fen.split(" ");
    const boardField = parts[0];
    const turn = parts[1] || "w";
    const isBlack = turn === "b";
    const PIECE_INDEX = {
      P: 0,
      N: 1,
      B: 2,
      R: 3,
      Q: 4,
      K: 5,
      p: 6,
      n: 7,
      b: 8,
      r: 9,
      q: 10,
      k: 11
    };
    const tokens = new Float32Array(768);
    let rows = boardField.split("/");
    if (isBlack) {
      rows = rows.slice().reverse();
      rows = rows.map(row => row.split("").map(ch => {
        if (ch >= "A" && ch <= "Z") {
          return ch.toLowerCase();
        }
        if (ch >= "a" && ch <= "z") {
          return ch.toUpperCase();
        }
        return ch;
      }).join(""));
    }
    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      const rankIdx = 7 - rowIdx;
      let fileIdx = 0;
      for (const ch of rows[rowIdx]) {
        if (ch >= "1" && ch <= "8") {
          fileIdx += parseInt(ch);
          continue;
        }
        const pieceIndex = PIECE_INDEX[ch];
        const squareIdx = rankIdx * 8 + fileIdx;
        if (pieceIndex !== undefined) {
          tokens[squareIdx * 12 + pieceIndex] = 1;
        }
        fileIdx++;
      }
    }
    return tokens;
  }
  _mirrorMove(uciMove) {
    if (!uciMove || uciMove.length < 4) {
      return uciMove;
    }
    const mirrorSquare = square => square[0] + String(9 - parseInt(square[1]));
    return mirrorSquare(uciMove.slice(0, 2)) + mirrorSquare(uciMove.slice(2, 4)) + uciMove.slice(4);
  }
  getBestMove(fen, selfElo = 1500, opponentElo = 1500, legalUciSet = null) {
    return new Promise(resolve => {
      if (!this._ready || !this.worker) {
        const state = {
          ready: this._ready,
          workerExists: !!this.worker
        };
        console.warn("[MaiaEngine] getBestMove — engine hazır değil.", state);
        resolve(null);
        return;
      }
      if (this._inFlight) {
        console.warn("[MaiaEngine] getBestMove — önceki inference devam ediyor, istek atlandı.");
        resolve(null);
        return;
      }
      this._inFlight = true;
      const id = ++this._idCounter;
      const isBlack = (fen.split(" ")[1] || "w") === "b";
      const tokens = this._fenToTokens(fen);
      const timeoutHandle = setTimeout(() => {
        console.error("[MaiaEngine] getBestMove — TIMEOUT! id:" + id + " 10sn içinde cevap gelmedi. Worker takılı olabilir.");
        this._pendingMap.delete(id);
        this._inFlight = false;
        resolve(null);
      }, 10000);
      const pending = {
        resolve: resolve,
        timeoutHandle: timeoutHandle,
        isBlack: isBlack,
        legalUciSet: legalUciSet
      };
      this._pendingMap.set(id, pending);
      this.worker.postMessage({
        type: "inference",
        id: id,
        tokens: Array.from(tokens),
        eloSelfs: [selfElo],
        eloOppos: [opponentElo],
        batchSize: 1
      });
    });
  }
  hardStop() {
    this._pendingMap.forEach(pending => {
      clearTimeout(pending.timeoutHandle);
      pending.resolve(null);
    });
    this._pendingMap.clear();
    this._inFlight = false;
    try {
      this.worker?.terminate();
    } catch (e) {}
    this.worker = null;
    this._ready = false;
    window.dispatchEvent(new CustomEvent("AsinaEngineStatus", {
      detail: {
        connected: false
      }
    }));
  }
}