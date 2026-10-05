// ─── engine/eval-engine.js · lightweight Stockfish worker for the eval bar ───
export class EvalEngine {
  constructor() {
    this.worker = null;
    this._ready = false;
    this._blobURL = null;
    this._wasmURL = null;
    this._pendingFen = null;
    this._searching = false;
    this._depth = 12;
    this._onResult = null;
    const meta = document.getElementById("__asina-engine-urls");
    if (!meta) {
      console.warn("[EvalEngine] meta bulunamadı");
      return;
    }
    const stockfishUrl = meta.dataset.stockfish || "";
    const stockfishWasmUrl = meta.dataset.stockfishWasm || "";
    if (!stockfishUrl) {
      console.warn("[EvalEngine] Stockfish URL yok");
      return;
    }
    this._wasmURL = stockfishWasmUrl;
    fetch(stockfishUrl).then(response => response.blob()).then(blob => {
      this._blobURL = URL.createObjectURL(blob);
      this._startWorker();
    }).catch(error => console.error("[EvalEngine] fetch stockfish.js failed:", error));
  }
  _startWorker() {
    try {
      this.worker = new Worker(this._blobURL + "#" + encodeURIComponent(this._wasmURL));
    } catch (error) {
      console.error("[EvalEngine] Worker oluşturulamadı:", error);
      return;
    }
    this.worker.onmessage = event => {
      const line = typeof event.data === "string" ? event.data : String(event.data ?? "");
      this._onMessage(line);
    };
    this.worker.onerror = error => {
      console.warn("[EvalEngine] Worker error:", error);
      this._searching = false;
    };
    this.worker.postMessage("uci");
  }
  _onMessage(line) {
    if (line === "uciok" || line === "readyok") {
      if (!this._ready) {
        this._ready = true;
        if (this._pendingFen) {
          const pendingFen = this._pendingFen;
          this._pendingFen = null;
          this._analyze(pendingFen);
        }
      }
      return;
    }
    if (line.startsWith("info") && line.includes("score cp")) {
      const cpMatch = line.match(/score cp (-?\d+)/);
      if (cpMatch) {
        const cp = parseInt(cpMatch[1]);
        if (this._onResult) {
          this._onResult(cp, null);
        }
      }
      return;
    }
    if (line.startsWith("info") && line.includes("score mate")) {
      const mateMatch = line.match(/score mate (-?\d+)/);
      if (mateMatch) {
        const mate = parseInt(mateMatch[1]);
        if (this._onResult) {
          this._onResult(null, mate);
        }
      }
      return;
    }
    if (line.startsWith("bestmove")) {
      this._searching = false;
      if (this._pendingFen) {
        const pendingFen = this._pendingFen;
        this._pendingFen = null;
        this._analyze(pendingFen);
      }
    }
  }
  _analyze(fen) {
    if (!this.worker || !this._ready) {
      return;
    }
    this._searching = true;
    this.worker.postMessage("stop");
    this.worker.postMessage("position fen " + fen);
    this.worker.postMessage("go depth " + this._depth);
  }
  evaluate(fen, onResult) {
    this._onResult = onResult;
    if (!this._ready) {
      this._pendingFen = fen;
      return;
    }
    if (this._searching) {
      this._pendingFen = fen;
      this.worker.postMessage("stop");
      return;
    }
    this._analyze(fen);
  }
  destroy() {
    try {
      this.worker?.postMessage("quit");
    } catch (e) {}
    try {
      this.worker?.terminate();
    } catch (e) {}
    this.worker = null;
    this._ready = false;
    this._searching = false;
  }
}