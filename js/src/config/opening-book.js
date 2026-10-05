// ─── config/opening-book.js · hardcoded opening preferences & trap data ───
//
// Pure data module — no logic, just lookup tables. The sole consumer is
// engine/stockfish-engine.js, which imports all six exports below:
//
//   OPENING_BOOK
//     First-move preferences behind the "Opening Preference" options in the
//     extension settings (option-opening-white-1/2 and option-opening-black-1/2).
//     Split into a `white` section (the move the engine opens with as White:
//     center / english / larsen / reti) and a `black` section (the reply the
//     engine plays as Black: modern / caro / scandinavian / sicilian / pirc /
//     french / indian / englund). See the "unconditional vs conditional"
//     explanation above the `black` section.
//
//   ULTRABULLET_CHANCE_LOCK_MOVES
//     Number of own opening moves (4) that are "locked" out of the random
//     ultrabullet chance behaviors. The engine only rolls its random chances
//     (premove, Lefong trap, check-move, ignore-recapture, ignore-captures)
//     once the own move number exceeds this value, giving the scripted
//     ULTRABULLET_OPENING_BOOK lines room to play out first.
//
//   ULTRABULLET_OPENING_BOOK
//     Scripted 3-move trap lines used in ultrabullet mode, keyed by trap name
//     ("knight-sac", "scholars-mate", "bishop-sac"). Each trap has a separate
//     `white` and `black` move list. See the block comment above it for the
//     line shape and the mateFollowUp flag.
//
//   LEFONG_TRAP_VALUE / LEFONG_TRAP_ATTACKER_TYPES / LEFONG_TRAP_PIECE_WEIGHTS
//     Scoring data for the Lefong trap feature, which punishes early
//     …Ng4??-style piece grabs by offering a piece and letting the greedy
//     capturer walk into a loss. See the comments above each constant.
const OPENING_BOOK = {
  // ── White openings ──────────────────────────────────────────────────────
  // All White entries are "unconditional": the engine plays the stored move
  // as its very first move, no matter what (it moves first anyway).
  // `from`/`to` are plain square names, matching a chess.js verbose move.
  white: {
    // "Center" — King's-pawn opening: 1. e2-e4.
    center: {
      type: "unconditional",
      from: "e2",
      to: "e4"
    },
    // English Opening: 1. c2-c4.
    english: {
      type: "unconditional",
      from: "c2",
      to: "c4"
    },
    // Larsen's Opening: 1. b2-b3.
    larsen: {
      type: "unconditional",
      from: "b2",
      to: "b3"
    },
    // Réti Opening: 1. Ng1-f3.
    reti: {
      type: "unconditional",
      from: "g1",
      to: "f3"
    }
  },
  // ── Black replies ───────────────────────────────────────────────────────
  // Entry types:
  //   "unconditional" — play the stored `from`/`to` move as Black's first
  //     move no matter what White opened with.
  //   "conditional" — only play the stored move if the `trigger` matches
  //     White's actual first move. The trigger is the from+to squares of the
  //     opponent's move concatenated, e.g. "e2e4" means "White played
  //     e2-e4". If the trigger does not match, the engine falls back to
  //     normal engine play (the consumer compares the trigger with `===`
  //     against the opponent's last move).
  black: {
    // Modern Defense setup: ...g7-g6 regardless of White's first move.
    modern: {
      type: "unconditional",
      from: "g7",
      to: "g6"
    },
    // Caro-Kann Defense: ...c7-c6, only against 1. e4 ("e2e4").
    caro: {
      type: "conditional",
      trigger: "e2e4",
      from: "c7",
      to: "c6"
    },
    // Scandinavian Defense: ...d7-d5, only against 1. e4.
    scandinavian: {
      type: "conditional",
      trigger: "e2e4",
      from: "d7",
      to: "d5"
    },
    // Sicilian Defense: ...c7-c5, only against 1. e4.
    sicilian: {
      type: "conditional",
      trigger: "e2e4",
      from: "c7",
      to: "c5"
    },
    // Pirc Defense: ...d7-d6, only against 1. e4.
    pirc: {
      type: "conditional",
      trigger: "e2e4",
      from: "d7",
      to: "d6"
    },
    // French Defense: ...e7-e6, only against 1. e4.
    french: {
      type: "conditional",
      trigger: "e2e4",
      from: "e7",
      to: "e6"
    },
    // King's-Indian-style setup: ...g7-g6, only against 1. d4 ("d2d4").
    indian: {
      type: "conditional",
      trigger: "d2d4",
      from: "g7",
      to: "g6"
    },
    // Englund Gambit: ...e7-e5, only against 1. d4.
    englund: {
      type: "conditional",
      trigger: "d2d4",
      from: "e7",
      to: "e5"
    }
  }
};
// Own moves 1-4 are "locked": the random ultrabullet chance behaviors in
// engine/stockfish-engine.js (premove chance, Lefong trap chance, check-move
// chance, ignore-recapture, ignore-captures) only start rolling once the
// engine's own move number is greater than this value. This guarantees the
// scripted ULTRABULLET_OPENING_BOOK lines get to play out before the random
// chances can interfere.
const ULTRABULLET_CHANCE_LOCK_MOVES = 4;
// Scripted 3-move trap lines for ultrabullet mode, keyed by the trap names
// offered in the ultrabullet "Opening Preference" option. Each trap holds a
// separate `white` and `black` move list (the engine picks the list matching
// its color). Line shape:
//   - Each list is an ordered array of {from, to} moves, one per own move:
//     index 0 is played on the engine's 1st move, index 1 on its 2nd, etc.
//   - The consumer only plays a scripted move if it is still legal in the
//     live position, so the lines tolerate opponent deviations (they simply
//     stop early rather than blunder).
//   - mateFollowUp (optional): when the scripted list is exhausted, if the
//     engine's top move is an immediate mate-in-1, play it instantly instead
//     of thinking — used to finish the Scholar's Mate pattern without giving
//     the opponent time to react.
const ULTRABULLET_OPENING_BOOK = {
  // Knight raid: the knight hops deep into the enemy camp aiming at the
  // royal-fork squares (Nb1-c3-b5-c7+ forking king/rook on e8/a8; mirrored
  // ...Nb8-c6-b4-c2+ for White's king/rook on e1/a1).
  "knight-sac": {
    white: [{
      from: "b1",
      to: "c3"
    }, {
      from: "c3",
      to: "b5"
    }, {
      from: "b5",
      to: "c7"
    }],
    black: [{
      from: "b8",
      to: "c6"
    }, {
      from: "c6",
      to: "b4"
    }, {
      from: "b4",
      to: "c2"
    }]
  },
  // Scholar's Mate pattern: 1. e4, 2. Qd1-f3, 3. Bf1-c4 — queen and bishop
  // both eye the f7/f2 square. mateFollowUp: true lets the engine instantly
  // deliver the available mate-in-1 on its next turn.
  "scholars-mate": {
    white: [{
      from: "e2",
      to: "e4"
    }, {
      from: "d1",
      to: "f3"
    }, {
      from: "f1",
      to: "c4"
    }],
    black: [{
      from: "e7",
      to: "e6"
    }, {
      from: "d8",
      to: "f6"
    }, {
      from: "f8",
      to: "c5"
    }],
    mateFollowUp: true
  },
  // Bishop raid on the enemy queen: after a center pawn push, the bishop
  // flies out and captures the undefended queen on its starting square
  // (Bc1-g5xd8 for White; mirrored ...Bc8-g4xd1 for Black).
  "bishop-sac": {
    white: [{
      from: "d2",
      to: "d4"
    }, {
      from: "c1",
      to: "g5"
    }, {
      from: "g5",
      to: "d8"
    }],
    black: [{
      from: "d7",
      to: "d5"
    }, {
      from: "c8",
      to: "g4"
    }, {
      from: "g4",
      to: "d1"
    }]
  }
};
// ── Lefong trap scoring data ────────────────────────────────────────────────
// The Lefong feature punishes greedy early piece grabs (…Ng4??-style): the
// engine offers a piece, and if the opponent's capturer is itself vulnerable,
// the grab loses material for the opponent. These three constants feed the
// trap evaluation in engine/stockfish-engine.js.
// Standard piece values in pawns for the trapped-piece calculation. The
// engine compares the value of the bait piece it offers against the enemy
// piece that could capture it: the trap is only considered when the enemy
// piece is worth AT LEAST as much as the bait (so the grabbing piece is the
// one that ends up trapped/lost). No "p" (pawn) entry — pawns are never bait
// or counted victims in this check.
const LEFONG_TRAP_VALUE = {
  n: 3,
  b: 3,
  r: 5,
  q: 9
};
// The piece types (lowercase SAN letters) the engine is willing to play as
// the "attacker" — i.e. the bait piece that can be lost to the grab: knight,
// bishop and rook. The queen is deliberately excluded; she is never offered.
const LEFONG_TRAP_ATTACKER_TYPES = ["n", "b", "r"];
// Relative weights for the weighted-random pick of which trap to attempt
// when several victim piece types are available: keyed by the ENEMY (victim)
// piece type, so trapping an enemy queen is attempted most often (40), then
// a rook (30), with bishop and knight equally rare (15 each).
const LEFONG_TRAP_PIECE_WEIGHTS = {
  q: 40,
  r: 30,
  b: 15,
  n: 15
};

export {
  OPENING_BOOK,
  ULTRABULLET_CHANCE_LOCK_MOVES,
  ULTRABULLET_OPENING_BOOK,
  LEFONG_TRAP_VALUE,
  LEFONG_TRAP_ATTACKER_TYPES,
  LEFONG_TRAP_PIECE_WEIGHTS,
};
