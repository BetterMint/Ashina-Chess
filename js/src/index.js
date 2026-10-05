// ─── index.js · bundle entry point ───
// Import order preserves the original monolith's execution order:
// vendor library → shared core → config → board → coach data → engines →
// master orchestrator → init → bootstrap side effects.
import "./compat.js";
import "./core.js";
import "./config/opening-book.js";
import "./engine/top-move.js";
import "./board/game-controller.js";
import "./coach/coaches.js";
import "./coach/coach-audio.js";
import "./engine/eval-engine.js";
import "./engine/coach-engine.js";
import "./engine/pre-coach-engine.js";
import "./engine/maia-engine.js";
import "./engine/stockfish-engine.js";
import "./coach/classification.js";
import "./better-mint.js";
import "./init.js";
import "./bootstrap/board-observer.js";
import "./bootstrap/webrtc-patch.js";
import "./bootstrap/bm-listener.js";
