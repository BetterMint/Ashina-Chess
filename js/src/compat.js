// ─── compat.js · exposes chess.js as window.Chess ───
// The original bundle set window.Chess from its inlined chess.js module.
// Keeping that global preserves parity for anything (page scripts, devtools
// snippets) that may rely on it.
import { Chess } from "./vendor/chess.js";

window.Chess = Chess;
