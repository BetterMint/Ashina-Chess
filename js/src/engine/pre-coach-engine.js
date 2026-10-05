// ─── engine/pre-coach-engine.js · Torch worker for pre-move analysis ───
import { enumOptions, getValueConfig } from "../core.js";
export class PreCoachEngine {
  constructor() {
    this.worker = null;
    this._blobURL = null;
    this._ready = false;
    this._pendingResolve = null;
    this._pendingTimeout = null;
    const meta = document.getElementById("__asina-engine-urls");
    if (!meta) {
      console.warn("[PreCoach] meta bulunamadı");
      return;
    }
    const torchUrl = meta.dataset.torch || "";
    const torchWasmUrl = meta.dataset.torchWasm || "";
    if (!torchUrl) {
      console.warn("[PreCoach] torch URL yok");
      return;
    }
    const wasmParam = torchWasmUrl ? encodeURIComponent(torchWasmUrl) : "";
    fetch(torchUrl).then(response => response.blob()).then(blob => {
      this._blobURL = URL.createObjectURL(blob) + (wasmParam ? "#" + wasmParam : "");
      this._startWorker();
    }).catch(error => console.error("[PreCoach] fetch torch.js failed:", error));
  }
  _startWorker() {
    try {
      this.worker = new Worker(this._blobURL);
    } catch (error) {
      console.error("[PreCoach] Worker oluşturulamadı:", error);
      return;
    }
    this.worker.onmessage = event => this._onMessage(typeof event.data === "string" ? event.data : String(event.data ?? ""));
    this.worker.onerror = error => {
      console.warn("[PreCoach] Worker error — restartWorker() tetikleniyor");
      if (this._pendingResolve) {
        clearTimeout(this._pendingTimeout);
        const resolvePending = this._pendingResolve;
        this._pendingResolve = null;
        resolvePending(null);
      }
      this.restartWorker();
    };
    this.worker.postMessage("uci");
  }
  _onMessage(line) {
    if (line === "uciok" || line === "readyok") {
      if (!this._ready) {
        this._ready = true;
        this._setup();
      }
      return;
    }
    if (line.includes("ABORD")) {
      console.error("[PreCoach] Torch WASM crash — restartWorker()");
      this.restartWorker();
      return;
    }
    if (!line.startsWith("json ")) {
      return;
    }
    if (!this._pendingResolve) {
      return;
    }
    let analysis;
    try {
      analysis = JSON.parse(line.slice(5));
    } catch (error) {
      console.warn("[PreCoach] JSON parse hatası:", error);
      return;
    }
    const positions = analysis.positions || [];
    const lastPosition = positions[positions.length - 1];
    if (!lastPosition?.playedMove) {
      return;
    }
    clearTimeout(this._pendingTimeout);
    const resolvePending = this._pendingResolve;
    this._pendingResolve = null;
    const result = {
      classificationName: lastPosition.classificationName || null,
      difference: lastPosition.difference ?? null,
      fen: lastPosition.fen || null
    };
    resolvePending(result);
  }
  _setup() {
    const send = cmd => this.worker?.postMessage(cmd);
    send("setoption name UseDeclarativePositionCommand value true");
    send("setoption name WhiteElo value 3200");
    send("setoption name BlackElo value 3200");
    send("setoption name ClassificationV3 value true");
    send("setoption name SerializeEvals value true");
    send("setoption name SerializeLikeCEAC value true");
    send("setoption name HandleContinuations value true");
    const coachDepth = getValueConfig(enumOptions.CoachDepth) || 10;
    send("setoption name HandleContinuationsDepth value " + coachDepth);
    send("setoption name ServeCommandV2 value true");
    send("setoption name SpeechV3 value false");
  }
  getAnalysis(positionCmd) {
    return new Promise(resolve => {
      if (!this.worker || !this._ready) {
        console.warn("[PreCoach] Worker hazır değil");
        resolve(null);
        return;
      }
      if (this._pendingResolve) {
        clearTimeout(this._pendingTimeout);
        this._pendingResolve(null);
        this._pendingResolve = null;
      }
      this._pendingResolve = resolve;
      this._pendingTimeout = setTimeout(() => {
        if (this._pendingResolve === resolve) {
          console.warn("[PreCoach] Timeout — analiz gelmedi");
          this._pendingResolve = null;
          resolve(null);
        }
      }, 12000);
      this.worker.postMessage(positionCmd);
      this.worker.postMessage("fetch analysis");
    });
  }
  restartWorker() {
    clearTimeout(this._pendingTimeout);
    if (this._pendingResolve) {
      this._pendingResolve(null);
      this._pendingResolve = null;
    }
    this._ready = false;
    try {
      this.worker?.terminate();
    } catch (e) {}
    this.worker = null;
    if (this._blobURL) {
      this._startWorker();
    }
  }
  hardStop() {
    clearTimeout(this._pendingTimeout);
    this._pendingResolve = null;
    this._ready = false;
    try {
      this.worker?.terminate();
    } catch (e) {}
    this.worker = null;
  }
}