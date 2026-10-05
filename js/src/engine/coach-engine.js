// ─── engine/coach-engine.js · Torch worker that grades the user's moves ───
import { enumOptions, getValueConfig } from "../core.js";
import { ASHINA_COACHES } from "../coach/coaches.js";
import { LOCALE_TO_LANG, buildAudioBase, buildCoachCmd } from "../coach/coach-audio.js";
export class CoachEngine {
  constructor() {
    this.worker = null;
    this._blobURL = null;
    this._ready = false;
    this._pendingResolve = null;
    this._pendingTimeout = null;
    this._coachCmd = null;
    const meta = document.getElementById("__asina-engine-urls");
    if (!meta) {
      console.warn("[CoachEngine] meta bulunamadı");
      return;
    }
    const torchUrl = meta.dataset.torch || "";
    const torchWasmUrl = meta.dataset.torchWasm || "";
    if (!torchUrl) {
      console.warn("[CoachEngine] torch URL yok");
      return;
    }
    const wasmParam = torchWasmUrl ? encodeURIComponent(torchWasmUrl) : "";
    fetch(torchUrl).then(response => response.blob()).then(blob => {
      this._blobURL = URL.createObjectURL(blob) + (wasmParam ? "#" + wasmParam : "");
      this._startWorker();
    }).catch(error => console.error("[CoachEngine] fetch torch.js failed:", error));
  }
  _startWorker() {
    try {
      this.worker = new Worker(this._blobURL);
    } catch (error) {
      console.error("[CoachEngine] Worker oluşturulamadı:", error);
      return;
    }
    this.worker.onmessage = event => this._onMessage(typeof event.data === "string" ? event.data : String(event.data ?? ""));
    this.worker.onerror = error => {
      console.warn("[CoachEngine] Worker error — restartWorker() tetikleniyor");
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
      console.error("[CoachEngine] Torch WASM crash — restartWorker()");
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
      console.warn("[CoachEngine] JSON parse hatası:", error);
      return;
    }
    const positions = analysis.positions || [];
    const lastPosition = positions[positions.length - 1];
    if (!lastPosition?.playedMove) {
      return;
    }
    const speech = lastPosition.playedMove?.speech;
    const audioUrlHash = speech && typeof speech === "object" && !Array.isArray(speech) ? speech.audioUrlHash : Array.isArray(speech) ? speech?.[0]?.audioUrlHash : null;
    clearTimeout(this._pendingTimeout);
    const resolvePending = this._pendingResolve;
    this._pendingResolve = null;
    resolvePending({
      classificationName: lastPosition.classificationName || null,
      caps2: lastPosition.caps2 ?? null,
      difference: lastPosition.difference ?? null,
      fen: lastPosition.fen || null,
      playedMoveLan: lastPosition.playedMove?.moveLan || null,
      bestMoveLan: lastPosition.bestMove?.moveLan || null,
      audioUrlHash: audioUrlHash,
      whiteAccuracy: analysis.CAPS?.white?.all ?? null,
      blackAccuracy: analysis.CAPS?.black?.all ?? null,
      whiteElo: analysis.reportCard?.white?.effectiveElo ?? null,
      blackElo: analysis.reportCard?.black?.effectiveElo ?? null,
      tallies: analysis.tallies || null,
      openingName: analysis.book?.name || null,
      arc: analysis.arc || null,
      pv: lastPosition.evals?.[0]?.pv || [],
      cpHistory: positions.map(position => position.evals?.[0]?.cp ?? null)
    });
  }
  _setup() {
    const send = cmd => this.worker?.postMessage(cmd);
    send("setoption name UseDeclarativePositionCommand value true");
    send("setoption name WhiteElo value 3200");
    send("setoption name BlackElo value 3200");
    send("setoption name ClassificationV3 value true");
    send("setoption name SerializeSpeechDetails value true");
    send("setoption name SerializeEvals value true");
    send("setoption name SerializeLikeCEAC value true");
    send("setoption name HandleContinuations value true");
    const coachDepth = getValueConfig(enumOptions.CoachDepth) || 10;
    send("setoption name HandleContinuationsDepth value " + coachDepth);
    send("setoption name ServeCommandV2 value true");
    send("setoption name SpeechV3 value true");
    send("setoption name BotChatPrioritizePlayerMove value true");
    const coachKey = getValueConfig(enumOptions.CoachVoice) || "david";
    const coach = ASHINA_COACHES[coachKey] || ASHINA_COACHES.david;
    const locale = coach.multiLocale ? getValueConfig(enumOptions.CoachLocale) || "en-US" : "en-US";
    const lang = LOCALE_TO_LANG[locale] || "en_US";
    this._coachCmd = buildCoachCmd(coach, locale);
    send(this._coachCmd);
    send("setoption name Language value " + lang);
    this._audioBase = buildAudioBase(coach, locale);
  }
  getAnalysis(positionCmd) {
    return new Promise(resolve => {
      if (!this.worker || !this._ready) {
        console.warn("[CoachEngine] Worker hazır değil");
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
          console.warn("[CoachEngine] Timeout — analiz gelmedi");
          this._pendingResolve = null;
          resolve(null);
        }
      }, 12000);
      this.worker.postMessage(positionCmd);
      if (this._coachCmd) {
        this.worker.postMessage(this._coachCmd);
      }
      this.worker.postMessage("fetch analysis");
    });
  }
  newGame() {
    if (this._pendingResolve) {
      clearTimeout(this._pendingTimeout);
      this._pendingResolve(null);
      this._pendingResolve = null;
    }
  }
  restartWorker() {
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