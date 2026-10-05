(() => {
  // js/src/vendor/chess.js
  var exports = {};
  /**
   * @license
   * Copyright (c) 2025, Jeff Hlywa (jhlywa@gmail.com)
   * All rights reserved.
   *
   * Redistribution and use in source and binary forms, with or without
   * modification, are permitted provided that the following conditions are met:
   *
   * 1. Redistributions of source code must retain the above copyright notice,
   *    this list of conditions and the following disclaimer.
   * 2. Redistributions in binary form must reproduce the above copyright notice,
   *    this list of conditions and the following disclaimer in the documentation
   *    and/or other materials provided with the distribution.
   *
   * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
   * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
   * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
   * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
   * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
   * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
   * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
   * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
   * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
   * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
   * POSSIBILITY OF SUCH DAMAGE.
   */
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.Chess = exports.validateFen = exports.SQUARES = exports.Move = exports.DEFAULT_POSITION = exports.KING = exports.QUEEN = exports.ROOK = exports.BISHOP = exports.KNIGHT = exports.PAWN = exports.BLACK = exports.WHITE = void 0;
  exports.WHITE = "w";
  exports.BLACK = "b";
  exports.PAWN = "p";
  exports.KNIGHT = "n";
  exports.BISHOP = "b";
  exports.ROOK = "r";
  exports.QUEEN = "q";
  exports.KING = "k";
  exports.DEFAULT_POSITION = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  var Move = class {
    color;
    from;
    to;
    piece;
    captured;
    promotion;
    /**
     * @deprecated This field is deprecated and will be removed in version 2.0.0.
     * Please use move descriptor functions instead: `isCapture`, `isPromotion`,
     * `isEnPassant`, `isKingsideCastle`, `isQueensideCastle`, `isCastle`, and
     * `isBigPawn`
     */
    flags;
    san;
    lan;
    before;
    after;
    constructor(chess, internal) {
      const { color, piece, from, to, flags, captured, promotion } = internal;
      const fromAlgebraic = algebraic(from);
      const toAlgebraic = algebraic(to);
      this.color = color;
      this.piece = piece;
      this.from = fromAlgebraic;
      this.to = toAlgebraic;
      this.san = chess["_moveToSan"](internal, chess["_moves"]({ legal: true }));
      this.lan = fromAlgebraic + toAlgebraic;
      this.before = chess.fen();
      chess["_makeMove"](internal);
      this.after = chess.fen();
      chess["_undoMove"]();
      this.flags = "";
      for (const flag in BITS) {
        if (BITS[flag] & flags) {
          this.flags += FLAGS[flag];
        }
      }
      if (captured) {
        this.captured = captured;
      }
      if (promotion) {
        this.promotion = promotion;
        this.lan += promotion;
      }
    }
    isCapture() {
      return this.flags.indexOf(FLAGS["CAPTURE"]) > -1;
    }
    isPromotion() {
      return this.flags.indexOf(FLAGS["PROMOTION"]) > -1;
    }
    isEnPassant() {
      return this.flags.indexOf(FLAGS["EP_CAPTURE"]) > -1;
    }
    isKingsideCastle() {
      return this.flags.indexOf(FLAGS["KSIDE_CASTLE"]) > -1;
    }
    isQueensideCastle() {
      return this.flags.indexOf(FLAGS["QSIDE_CASTLE"]) > -1;
    }
    isBigPawn() {
      return this.flags.indexOf(FLAGS["BIG_PAWN"]) > -1;
    }
  };
  exports.Move = Move;
  var EMPTY = -1;
  var FLAGS = {
    NORMAL: "n",
    CAPTURE: "c",
    BIG_PAWN: "b",
    EP_CAPTURE: "e",
    PROMOTION: "p",
    KSIDE_CASTLE: "k",
    QSIDE_CASTLE: "q"
  };
  exports.SQUARES = [
    "a8",
    "b8",
    "c8",
    "d8",
    "e8",
    "f8",
    "g8",
    "h8",
    "a7",
    "b7",
    "c7",
    "d7",
    "e7",
    "f7",
    "g7",
    "h7",
    "a6",
    "b6",
    "c6",
    "d6",
    "e6",
    "f6",
    "g6",
    "h6",
    "a5",
    "b5",
    "c5",
    "d5",
    "e5",
    "f5",
    "g5",
    "h5",
    "a4",
    "b4",
    "c4",
    "d4",
    "e4",
    "f4",
    "g4",
    "h4",
    "a3",
    "b3",
    "c3",
    "d3",
    "e3",
    "f3",
    "g3",
    "h3",
    "a2",
    "b2",
    "c2",
    "d2",
    "e2",
    "f2",
    "g2",
    "h2",
    "a1",
    "b1",
    "c1",
    "d1",
    "e1",
    "f1",
    "g1",
    "h1"
  ];
  var BITS = {
    NORMAL: 1,
    CAPTURE: 2,
    BIG_PAWN: 4,
    EP_CAPTURE: 8,
    PROMOTION: 16,
    KSIDE_CASTLE: 32,
    QSIDE_CASTLE: 64
  };
  var Ox88 = {
    a8: 0,
    b8: 1,
    c8: 2,
    d8: 3,
    e8: 4,
    f8: 5,
    g8: 6,
    h8: 7,
    a7: 16,
    b7: 17,
    c7: 18,
    d7: 19,
    e7: 20,
    f7: 21,
    g7: 22,
    h7: 23,
    a6: 32,
    b6: 33,
    c6: 34,
    d6: 35,
    e6: 36,
    f6: 37,
    g6: 38,
    h6: 39,
    a5: 48,
    b5: 49,
    c5: 50,
    d5: 51,
    e5: 52,
    f5: 53,
    g5: 54,
    h5: 55,
    a4: 64,
    b4: 65,
    c4: 66,
    d4: 67,
    e4: 68,
    f4: 69,
    g4: 70,
    h4: 71,
    a3: 80,
    b3: 81,
    c3: 82,
    d3: 83,
    e3: 84,
    f3: 85,
    g3: 86,
    h3: 87,
    a2: 96,
    b2: 97,
    c2: 98,
    d2: 99,
    e2: 100,
    f2: 101,
    g2: 102,
    h2: 103,
    a1: 112,
    b1: 113,
    c1: 114,
    d1: 115,
    e1: 116,
    f1: 117,
    g1: 118,
    h1: 119
  };
  var PAWN_OFFSETS = {
    b: [16, 32, 17, 15],
    w: [-16, -32, -17, -15]
  };
  var PIECE_OFFSETS = {
    n: [-18, -33, -31, -14, 18, 33, 31, 14],
    b: [-17, -15, 17, 15],
    r: [-16, 1, 16, -1],
    q: [-17, -16, -15, 1, 17, 16, 15, -1],
    k: [-17, -16, -15, 1, 17, 16, 15, -1]
  };
  var ATTACKS = [
    20,
    0,
    0,
    0,
    0,
    0,
    0,
    24,
    0,
    0,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    0,
    24,
    0,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    24,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    0,
    24,
    0,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    24,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    20,
    2,
    24,
    2,
    20,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    2,
    53,
    56,
    53,
    2,
    0,
    0,
    0,
    0,
    0,
    0,
    24,
    24,
    24,
    24,
    24,
    24,
    56,
    0,
    56,
    24,
    24,
    24,
    24,
    24,
    24,
    0,
    0,
    0,
    0,
    0,
    0,
    2,
    53,
    56,
    53,
    2,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    20,
    2,
    24,
    2,
    20,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    24,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    0,
    24,
    0,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    24,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    0,
    24,
    0,
    0,
    0,
    0,
    0,
    20,
    0,
    0,
    20,
    0,
    0,
    0,
    0,
    0,
    0,
    24,
    0,
    0,
    0,
    0,
    0,
    0,
    20
  ];
  var RAYS = [
    17,
    0,
    0,
    0,
    0,
    0,
    0,
    16,
    0,
    0,
    0,
    0,
    0,
    0,
    15,
    0,
    0,
    17,
    0,
    0,
    0,
    0,
    0,
    16,
    0,
    0,
    0,
    0,
    0,
    15,
    0,
    0,
    0,
    0,
    17,
    0,
    0,
    0,
    0,
    16,
    0,
    0,
    0,
    0,
    15,
    0,
    0,
    0,
    0,
    0,
    0,
    17,
    0,
    0,
    0,
    16,
    0,
    0,
    0,
    15,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    17,
    0,
    0,
    16,
    0,
    0,
    15,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    17,
    0,
    16,
    0,
    15,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    17,
    16,
    15,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    0,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    -15,
    -16,
    -17,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    -15,
    0,
    -16,
    0,
    -17,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    -15,
    0,
    0,
    -16,
    0,
    0,
    -17,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    -15,
    0,
    0,
    0,
    -16,
    0,
    0,
    0,
    -17,
    0,
    0,
    0,
    0,
    0,
    0,
    -15,
    0,
    0,
    0,
    0,
    -16,
    0,
    0,
    0,
    0,
    -17,
    0,
    0,
    0,
    0,
    -15,
    0,
    0,
    0,
    0,
    0,
    -16,
    0,
    0,
    0,
    0,
    0,
    -17,
    0,
    0,
    -15,
    0,
    0,
    0,
    0,
    0,
    0,
    -16,
    0,
    0,
    0,
    0,
    0,
    0,
    -17
  ];
  var PIECE_MASKS = { p: 1, n: 2, b: 4, r: 8, q: 16, k: 32 };
  var SYMBOLS = "pnbrqkPNBRQK";
  var PROMOTIONS = [exports.KNIGHT, exports.BISHOP, exports.ROOK, exports.QUEEN];
  var RANK_1 = 7;
  var RANK_2 = 6;
  var RANK_7 = 1;
  var RANK_8 = 0;
  var SIDES = {
    [exports.KING]: BITS.KSIDE_CASTLE,
    [exports.QUEEN]: BITS.QSIDE_CASTLE
  };
  var ROOKS = {
    w: [
      { square: Ox88.a1, flag: BITS.QSIDE_CASTLE },
      { square: Ox88.h1, flag: BITS.KSIDE_CASTLE }
    ],
    b: [
      { square: Ox88.a8, flag: BITS.QSIDE_CASTLE },
      { square: Ox88.h8, flag: BITS.KSIDE_CASTLE }
    ]
  };
  var SECOND_RANK = { b: RANK_7, w: RANK_2 };
  var TERMINATION_MARKERS = ["1-0", "0-1", "1/2-1/2", "*"];
  function rank(square) {
    return square >> 4;
  }
  function file(square) {
    return square & 15;
  }
  function isDigit(c) {
    return "0123456789".indexOf(c) !== -1;
  }
  function algebraic(square) {
    const f = file(square);
    const r = rank(square);
    return "abcdefgh".substring(f, f + 1) + "87654321".substring(r, r + 1);
  }
  function swapColor(color) {
    return color === exports.WHITE ? exports.BLACK : exports.WHITE;
  }
  function validateFen(fen) {
    const tokens = fen.split(/\s+/);
    if (tokens.length !== 6) {
      return {
        ok: false,
        error: "Invalid FEN: must contain six space-delimited fields"
      };
    }
    const moveNumber = parseInt(tokens[5], 10);
    if (isNaN(moveNumber) || moveNumber <= 0) {
      return {
        ok: false,
        error: "Invalid FEN: move number must be a positive integer"
      };
    }
    const halfMoves = parseInt(tokens[4], 10);
    if (isNaN(halfMoves) || halfMoves < 0) {
      return {
        ok: false,
        error: "Invalid FEN: half move counter number must be a non-negative integer"
      };
    }
    if (!/^(-|[abcdefgh][36])$/.test(tokens[3])) {
      return { ok: false, error: "Invalid FEN: en-passant square is invalid" };
    }
    if (/[^kKqQ-]/.test(tokens[2])) {
      return { ok: false, error: "Invalid FEN: castling availability is invalid" };
    }
    if (!/^(w|b)$/.test(tokens[1])) {
      return { ok: false, error: "Invalid FEN: side-to-move is invalid" };
    }
    const rows = tokens[0].split("/");
    if (rows.length !== 8) {
      return {
        ok: false,
        error: "Invalid FEN: piece data does not contain 8 '/'-delimited rows"
      };
    }
    for (let i = 0; i < rows.length; i++) {
      let sumFields = 0;
      let previousWasNumber = false;
      for (let k = 0; k < rows[i].length; k++) {
        if (isDigit(rows[i][k])) {
          if (previousWasNumber) {
            return {
              ok: false,
              error: "Invalid FEN: piece data is invalid (consecutive number)"
            };
          }
          sumFields += parseInt(rows[i][k], 10);
          previousWasNumber = true;
        } else {
          if (!/^[prnbqkPRNBQK]$/.test(rows[i][k])) {
            return {
              ok: false,
              error: "Invalid FEN: piece data is invalid (invalid piece)"
            };
          }
          sumFields += 1;
          previousWasNumber = false;
        }
      }
      if (sumFields !== 8) {
        return {
          ok: false,
          error: "Invalid FEN: piece data is invalid (too many squares in rank)"
        };
      }
    }
    if (tokens[3][1] == "3" && tokens[1] == "w" || tokens[3][1] == "6" && tokens[1] == "b") {
      return { ok: false, error: "Invalid FEN: illegal en-passant square" };
    }
    const kings = [
      { color: "white", regex: /K/g },
      { color: "black", regex: /k/g }
    ];
    for (const { color, regex } of kings) {
      if (!regex.test(tokens[0])) {
        return { ok: false, error: `Invalid FEN: missing ${color} king` };
      }
      if ((tokens[0].match(regex) || []).length > 1) {
        return { ok: false, error: `Invalid FEN: too many ${color} kings` };
      }
    }
    if (Array.from(rows[0] + rows[7]).some((char) => char.toUpperCase() === "P")) {
      return {
        ok: false,
        error: "Invalid FEN: some pawns are on the edge rows"
      };
    }
    return { ok: true };
  }
  exports.validateFen = validateFen;
  function getDisambiguator(move, moves) {
    const from = move.from;
    const to = move.to;
    const piece = move.piece;
    let ambiguities = 0;
    let sameRank = 0;
    let sameFile = 0;
    for (let i = 0, len = moves.length; i < len; i++) {
      const ambigFrom = moves[i].from;
      const ambigTo = moves[i].to;
      const ambigPiece = moves[i].piece;
      if (piece === ambigPiece && from !== ambigFrom && to === ambigTo) {
        ambiguities++;
        if (rank(from) === rank(ambigFrom)) {
          sameRank++;
        }
        if (file(from) === file(ambigFrom)) {
          sameFile++;
        }
      }
    }
    if (ambiguities > 0) {
      if (sameRank > 0 && sameFile > 0) {
        return algebraic(from);
      } else if (sameFile > 0) {
        return algebraic(from).charAt(1);
      } else {
        return algebraic(from).charAt(0);
      }
    }
    return "";
  }
  function addMove(moves, color, from, to, piece, captured = void 0, flags = BITS.NORMAL) {
    const r = rank(to);
    if (piece === exports.PAWN && (r === RANK_1 || r === RANK_8)) {
      for (let i = 0; i < PROMOTIONS.length; i++) {
        const promotion = PROMOTIONS[i];
        moves.push({
          color,
          from,
          to,
          piece,
          captured,
          promotion,
          flags: flags | BITS.PROMOTION
        });
      }
    } else {
      moves.push({
        color,
        from,
        to,
        piece,
        captured,
        flags
      });
    }
  }
  function inferPieceType(san) {
    let pieceType = san.charAt(0);
    if (pieceType >= "a" && pieceType <= "h") {
      const matches = san.match(/[a-h]\d.*[a-h]\d/);
      if (matches) {
        return void 0;
      }
      return exports.PAWN;
    }
    pieceType = pieceType.toLowerCase();
    if (pieceType === "o") {
      return exports.KING;
    }
    return pieceType;
  }
  function strippedSan(move) {
    return move.replace(/=/, "").replace(/[+#]?[?!]*$/, "");
  }
  function trimFen(fen) {
    return fen.split(" ").slice(0, 4).join(" ");
  }
  var Chess = class {
    _board = new Array(128);
    _turn = exports.WHITE;
    _header = {};
    _kings = { w: EMPTY, b: EMPTY };
    _epSquare = -1;
    _halfMoves = 0;
    _moveNumber = 0;
    _history = [];
    _comments = {};
    _castling = { w: 0, b: 0 };
    // tracks number of times a position has been seen for repetition checking
    _positionCount = {};
    constructor(fen = exports.DEFAULT_POSITION) {
      this.load(fen);
    }
    clear({ preserveHeaders = false } = {}) {
      this._board = new Array(128);
      this._kings = { w: EMPTY, b: EMPTY };
      this._turn = exports.WHITE;
      this._castling = { w: 0, b: 0 };
      this._epSquare = EMPTY;
      this._halfMoves = 0;
      this._moveNumber = 1;
      this._history = [];
      this._comments = {};
      this._header = preserveHeaders ? this._header : {};
      this._positionCount = {};
      delete this._header["SetUp"];
      delete this._header["FEN"];
    }
    load(fen, { skipValidation = false, preserveHeaders = false } = {}) {
      let tokens = fen.split(/\s+/);
      if (tokens.length >= 2 && tokens.length < 6) {
        const adjustments = ["-", "-", "0", "1"];
        fen = tokens.concat(adjustments.slice(-(6 - tokens.length))).join(" ");
      }
      tokens = fen.split(/\s+/);
      if (!skipValidation) {
        const { ok, error } = validateFen(fen);
        if (!ok) {
          throw new Error(error);
        }
      }
      const position = tokens[0];
      let square = 0;
      this.clear({ preserveHeaders });
      for (let i = 0; i < position.length; i++) {
        const piece = position.charAt(i);
        if (piece === "/") {
          square += 8;
        } else if (isDigit(piece)) {
          square += parseInt(piece, 10);
        } else {
          const color = piece < "a" ? exports.WHITE : exports.BLACK;
          this._put({ type: piece.toLowerCase(), color }, algebraic(square));
          square++;
        }
      }
      this._turn = tokens[1];
      if (tokens[2].indexOf("K") > -1) {
        this._castling.w |= BITS.KSIDE_CASTLE;
      }
      if (tokens[2].indexOf("Q") > -1) {
        this._castling.w |= BITS.QSIDE_CASTLE;
      }
      if (tokens[2].indexOf("k") > -1) {
        this._castling.b |= BITS.KSIDE_CASTLE;
      }
      if (tokens[2].indexOf("q") > -1) {
        this._castling.b |= BITS.QSIDE_CASTLE;
      }
      this._epSquare = tokens[3] === "-" ? EMPTY : Ox88[tokens[3]];
      this._halfMoves = parseInt(tokens[4], 10);
      this._moveNumber = parseInt(tokens[5], 10);
      this._updateSetup(fen);
      this._incPositionCount(fen);
    }
    fen() {
      let empty = 0;
      let fen = "";
      for (let i = Ox88.a8; i <= Ox88.h1; i++) {
        if (this._board[i]) {
          if (empty > 0) {
            fen += empty;
            empty = 0;
          }
          const { color, type: piece } = this._board[i];
          fen += color === exports.WHITE ? piece.toUpperCase() : piece.toLowerCase();
        } else {
          empty++;
        }
        if (i + 1 & 136) {
          if (empty > 0) {
            fen += empty;
          }
          if (i !== Ox88.h1) {
            fen += "/";
          }
          empty = 0;
          i += 8;
        }
      }
      let castling = "";
      if (this._castling[exports.WHITE] & BITS.KSIDE_CASTLE) {
        castling += "K";
      }
      if (this._castling[exports.WHITE] & BITS.QSIDE_CASTLE) {
        castling += "Q";
      }
      if (this._castling[exports.BLACK] & BITS.KSIDE_CASTLE) {
        castling += "k";
      }
      if (this._castling[exports.BLACK] & BITS.QSIDE_CASTLE) {
        castling += "q";
      }
      castling = castling || "-";
      let epSquare = "-";
      if (this._epSquare !== EMPTY) {
        const bigPawnSquare = this._epSquare + (this._turn === exports.WHITE ? 16 : -16);
        const squares = [bigPawnSquare + 1, bigPawnSquare - 1];
        for (const square of squares) {
          if (square & 136) {
            continue;
          }
          const color = this._turn;
          if (this._board[square]?.color === color && this._board[square]?.type === exports.PAWN) {
            this._makeMove({
              color,
              from: square,
              to: this._epSquare,
              piece: exports.PAWN,
              captured: exports.PAWN,
              flags: BITS.EP_CAPTURE
            });
            const isLegal = !this._isKingAttacked(color);
            this._undoMove();
            if (isLegal) {
              epSquare = algebraic(this._epSquare);
              break;
            }
          }
        }
      }
      return [
        fen,
        this._turn,
        castling,
        epSquare,
        this._halfMoves,
        this._moveNumber
      ].join(" ");
    }
    /*
     * Called when the initial board setup is changed with put() or remove().
     * modifies the SetUp and FEN properties of the header object. If the FEN
     * is equal to the default position, the SetUp and FEN are deleted the setup
     * is only updated if history.length is zero, ie moves haven't been made.
     */
    _updateSetup(fen) {
      if (this._history.length > 0)
        return;
      if (fen !== exports.DEFAULT_POSITION) {
        this._header["SetUp"] = "1";
        this._header["FEN"] = fen;
      } else {
        delete this._header["SetUp"];
        delete this._header["FEN"];
      }
    }
    reset() {
      this.load(exports.DEFAULT_POSITION);
    }
    get(square) {
      return this._board[Ox88[square]];
    }
    put({ type, color }, square) {
      if (this._put({ type, color }, square)) {
        this._updateCastlingRights();
        this._updateEnPassantSquare();
        this._updateSetup(this.fen());
        return true;
      }
      return false;
    }
    _put({ type, color }, square) {
      if (SYMBOLS.indexOf(type.toLowerCase()) === -1) {
        return false;
      }
      if (!(square in Ox88)) {
        return false;
      }
      const sq = Ox88[square];
      if (type == exports.KING && !(this._kings[color] == EMPTY || this._kings[color] == sq)) {
        return false;
      }
      const currentPieceOnSquare = this._board[sq];
      if (currentPieceOnSquare && currentPieceOnSquare.type === exports.KING) {
        this._kings[currentPieceOnSquare.color] = EMPTY;
      }
      this._board[sq] = { type, color };
      if (type === exports.KING) {
        this._kings[color] = sq;
      }
      return true;
    }
    remove(square) {
      const piece = this.get(square);
      delete this._board[Ox88[square]];
      if (piece && piece.type === exports.KING) {
        this._kings[piece.color] = EMPTY;
      }
      this._updateCastlingRights();
      this._updateEnPassantSquare();
      this._updateSetup(this.fen());
      return piece;
    }
    _updateCastlingRights() {
      const whiteKingInPlace = this._board[Ox88.e1]?.type === exports.KING && this._board[Ox88.e1]?.color === exports.WHITE;
      const blackKingInPlace = this._board[Ox88.e8]?.type === exports.KING && this._board[Ox88.e8]?.color === exports.BLACK;
      if (!whiteKingInPlace || this._board[Ox88.a1]?.type !== exports.ROOK || this._board[Ox88.a1]?.color !== exports.WHITE) {
        this._castling.w &= ~BITS.QSIDE_CASTLE;
      }
      if (!whiteKingInPlace || this._board[Ox88.h1]?.type !== exports.ROOK || this._board[Ox88.h1]?.color !== exports.WHITE) {
        this._castling.w &= ~BITS.KSIDE_CASTLE;
      }
      if (!blackKingInPlace || this._board[Ox88.a8]?.type !== exports.ROOK || this._board[Ox88.a8]?.color !== exports.BLACK) {
        this._castling.b &= ~BITS.QSIDE_CASTLE;
      }
      if (!blackKingInPlace || this._board[Ox88.h8]?.type !== exports.ROOK || this._board[Ox88.h8]?.color !== exports.BLACK) {
        this._castling.b &= ~BITS.KSIDE_CASTLE;
      }
    }
    _updateEnPassantSquare() {
      if (this._epSquare === EMPTY) {
        return;
      }
      const startSquare = this._epSquare + (this._turn === exports.WHITE ? -16 : 16);
      const currentSquare = this._epSquare + (this._turn === exports.WHITE ? 16 : -16);
      const attackers = [currentSquare + 1, currentSquare - 1];
      if (this._board[startSquare] !== null || this._board[this._epSquare] !== null || this._board[currentSquare]?.color !== swapColor(this._turn) || this._board[currentSquare]?.type !== exports.PAWN) {
        this._epSquare = EMPTY;
        return;
      }
      const canCapture = (square) => !(square & 136) && this._board[square]?.color === this._turn && this._board[square]?.type === exports.PAWN;
      if (!attackers.some(canCapture)) {
        this._epSquare = EMPTY;
      }
    }
    _attacked(color, square, verbose) {
      const attackers = [];
      for (let i = Ox88.a8; i <= Ox88.h1; i++) {
        if (i & 136) {
          i += 7;
          continue;
        }
        if (this._board[i] === void 0 || this._board[i].color !== color) {
          continue;
        }
        const piece = this._board[i];
        const difference = i - square;
        if (difference === 0) {
          continue;
        }
        const index = difference + 119;
        if (ATTACKS[index] & PIECE_MASKS[piece.type]) {
          if (piece.type === exports.PAWN) {
            if (difference > 0 && piece.color === exports.WHITE || difference <= 0 && piece.color === exports.BLACK) {
              if (!verbose) {
                return true;
              } else {
                attackers.push(algebraic(i));
              }
            }
            continue;
          }
          if (piece.type === "n" || piece.type === "k") {
            if (!verbose) {
              return true;
            } else {
              attackers.push(algebraic(i));
              continue;
            }
          }
          const offset = RAYS[index];
          let j = i + offset;
          let blocked = false;
          while (j !== square) {
            if (this._board[j] != null) {
              blocked = true;
              break;
            }
            j += offset;
          }
          if (!blocked) {
            if (!verbose) {
              return true;
            } else {
              attackers.push(algebraic(i));
              continue;
            }
          }
        }
      }
      if (verbose) {
        return attackers;
      } else {
        return false;
      }
    }
    attackers(square, attackedBy) {
      if (!attackedBy) {
        return this._attacked(this._turn, Ox88[square], true);
      } else {
        return this._attacked(attackedBy, Ox88[square], true);
      }
    }
    _isKingAttacked(color) {
      const square = this._kings[color];
      return square === -1 ? false : this._attacked(swapColor(color), square);
    }
    isAttacked(square, attackedBy) {
      return this._attacked(attackedBy, Ox88[square]);
    }
    isCheck() {
      return this._isKingAttacked(this._turn);
    }
    inCheck() {
      return this.isCheck();
    }
    isCheckmate() {
      return this.isCheck() && this._moves().length === 0;
    }
    isStalemate() {
      return !this.isCheck() && this._moves().length === 0;
    }
    isInsufficientMaterial() {
      const pieces = {
        b: 0,
        n: 0,
        r: 0,
        q: 0,
        k: 0,
        p: 0
      };
      const bishops = [];
      let numPieces = 0;
      let squareColor = 0;
      for (let i = Ox88.a8; i <= Ox88.h1; i++) {
        squareColor = (squareColor + 1) % 2;
        if (i & 136) {
          i += 7;
          continue;
        }
        const piece = this._board[i];
        if (piece) {
          pieces[piece.type] = piece.type in pieces ? pieces[piece.type] + 1 : 1;
          if (piece.type === exports.BISHOP) {
            bishops.push(squareColor);
          }
          numPieces++;
        }
      }
      if (numPieces === 2) {
        return true;
      } else if (
        // k vs. kn .... or .... k vs. kb
        numPieces === 3 && (pieces[exports.BISHOP] === 1 || pieces[exports.KNIGHT] === 1)
      ) {
        return true;
      } else if (numPieces === pieces[exports.BISHOP] + 2) {
        let sum = 0;
        const len = bishops.length;
        for (let i = 0; i < len; i++) {
          sum += bishops[i];
        }
        if (sum === 0 || sum === len) {
          return true;
        }
      }
      return false;
    }
    isThreefoldRepetition() {
      return this._getPositionCount(this.fen()) >= 3;
    }
    isDrawByFiftyMoves() {
      return this._halfMoves >= 100;
    }
    isDraw() {
      return this.isDrawByFiftyMoves() || this.isStalemate() || this.isInsufficientMaterial() || this.isThreefoldRepetition();
    }
    isGameOver() {
      return this.isCheckmate() || this.isStalemate() || this.isDraw();
    }
    moves({ verbose = false, square = void 0, piece = void 0 } = {}) {
      const moves = this._moves({ square, piece });
      if (verbose) {
        return moves.map((move) => new Move(this, move));
      } else {
        return moves.map((move) => this._moveToSan(move, moves));
      }
    }
    _moves({ legal = true, piece = void 0, square = void 0 } = {}) {
      const forSquare = square ? square.toLowerCase() : void 0;
      const forPiece = piece?.toLowerCase();
      const moves = [];
      const us = this._turn;
      const them = swapColor(us);
      let firstSquare = Ox88.a8;
      let lastSquare = Ox88.h1;
      let singleSquare = false;
      if (forSquare) {
        if (!(forSquare in Ox88)) {
          return [];
        } else {
          firstSquare = lastSquare = Ox88[forSquare];
          singleSquare = true;
        }
      }
      for (let from = firstSquare; from <= lastSquare; from++) {
        if (from & 136) {
          from += 7;
          continue;
        }
        if (!this._board[from] || this._board[from].color === them) {
          continue;
        }
        const { type } = this._board[from];
        let to;
        if (type === exports.PAWN) {
          if (forPiece && forPiece !== type)
            continue;
          to = from + PAWN_OFFSETS[us][0];
          if (!this._board[to]) {
            addMove(moves, us, from, to, exports.PAWN);
            to = from + PAWN_OFFSETS[us][1];
            if (SECOND_RANK[us] === rank(from) && !this._board[to]) {
              addMove(moves, us, from, to, exports.PAWN, void 0, BITS.BIG_PAWN);
            }
          }
          for (let j = 2; j < 4; j++) {
            to = from + PAWN_OFFSETS[us][j];
            if (to & 136)
              continue;
            if (this._board[to]?.color === them) {
              addMove(moves, us, from, to, exports.PAWN, this._board[to].type, BITS.CAPTURE);
            } else if (to === this._epSquare) {
              addMove(moves, us, from, to, exports.PAWN, exports.PAWN, BITS.EP_CAPTURE);
            }
          }
        } else {
          if (forPiece && forPiece !== type)
            continue;
          for (let j = 0, len = PIECE_OFFSETS[type].length; j < len; j++) {
            const offset = PIECE_OFFSETS[type][j];
            to = from;
            while (true) {
              to += offset;
              if (to & 136)
                break;
              if (!this._board[to]) {
                addMove(moves, us, from, to, type);
              } else {
                if (this._board[to].color === us)
                  break;
                addMove(moves, us, from, to, type, this._board[to].type, BITS.CAPTURE);
                break;
              }
              if (type === exports.KNIGHT || type === exports.KING)
                break;
            }
          }
        }
      }
      if (forPiece === void 0 || forPiece === exports.KING) {
        if (!singleSquare || lastSquare === this._kings[us]) {
          if (this._castling[us] & BITS.KSIDE_CASTLE) {
            const castlingFrom = this._kings[us];
            const castlingTo = castlingFrom + 2;
            if (!this._board[castlingFrom + 1] && !this._board[castlingTo] && !this._attacked(them, this._kings[us]) && !this._attacked(them, castlingFrom + 1) && !this._attacked(them, castlingTo)) {
              addMove(moves, us, this._kings[us], castlingTo, exports.KING, void 0, BITS.KSIDE_CASTLE);
            }
          }
          if (this._castling[us] & BITS.QSIDE_CASTLE) {
            const castlingFrom = this._kings[us];
            const castlingTo = castlingFrom - 2;
            if (!this._board[castlingFrom - 1] && !this._board[castlingFrom - 2] && !this._board[castlingFrom - 3] && !this._attacked(them, this._kings[us]) && !this._attacked(them, castlingFrom - 1) && !this._attacked(them, castlingTo)) {
              addMove(moves, us, this._kings[us], castlingTo, exports.KING, void 0, BITS.QSIDE_CASTLE);
            }
          }
        }
      }
      if (!legal || this._kings[us] === -1) {
        return moves;
      }
      const legalMoves = [];
      for (let i = 0, len = moves.length; i < len; i++) {
        this._makeMove(moves[i]);
        if (!this._isKingAttacked(us)) {
          legalMoves.push(moves[i]);
        }
        this._undoMove();
      }
      return legalMoves;
    }
    move(move, { strict = false } = {}) {
      let moveObj = null;
      if (typeof move === "string") {
        moveObj = this._moveFromSan(move, strict);
      } else if (typeof move === "object") {
        const moves = this._moves();
        for (let i = 0, len = moves.length; i < len; i++) {
          if (move.from === algebraic(moves[i].from) && move.to === algebraic(moves[i].to) && (!("promotion" in moves[i]) || move.promotion === moves[i].promotion)) {
            moveObj = moves[i];
            break;
          }
        }
      }
      if (!moveObj) {
        if (typeof move === "string") {
          throw new Error(`Invalid move: ${move}`);
        } else {
          throw new Error(`Invalid move: ${JSON.stringify(move)}`);
        }
      }
      const prettyMove = new Move(this, moveObj);
      this._makeMove(moveObj);
      this._incPositionCount(prettyMove.after);
      return prettyMove;
    }
    _push(move) {
      this._history.push({
        move,
        kings: { b: this._kings.b, w: this._kings.w },
        turn: this._turn,
        castling: { b: this._castling.b, w: this._castling.w },
        epSquare: this._epSquare,
        halfMoves: this._halfMoves,
        moveNumber: this._moveNumber
      });
    }
    _makeMove(move) {
      const us = this._turn;
      const them = swapColor(us);
      this._push(move);
      this._board[move.to] = this._board[move.from];
      delete this._board[move.from];
      if (move.flags & BITS.EP_CAPTURE) {
        if (this._turn === exports.BLACK) {
          delete this._board[move.to - 16];
        } else {
          delete this._board[move.to + 16];
        }
      }
      if (move.promotion) {
        this._board[move.to] = { type: move.promotion, color: us };
      }
      if (this._board[move.to].type === exports.KING) {
        this._kings[us] = move.to;
        if (move.flags & BITS.KSIDE_CASTLE) {
          const castlingTo = move.to - 1;
          const castlingFrom = move.to + 1;
          this._board[castlingTo] = this._board[castlingFrom];
          delete this._board[castlingFrom];
        } else if (move.flags & BITS.QSIDE_CASTLE) {
          const castlingTo = move.to + 1;
          const castlingFrom = move.to - 2;
          this._board[castlingTo] = this._board[castlingFrom];
          delete this._board[castlingFrom];
        }
        this._castling[us] = 0;
      }
      if (this._castling[us]) {
        for (let i = 0, len = ROOKS[us].length; i < len; i++) {
          if (move.from === ROOKS[us][i].square && this._castling[us] & ROOKS[us][i].flag) {
            this._castling[us] ^= ROOKS[us][i].flag;
            break;
          }
        }
      }
      if (this._castling[them]) {
        for (let i = 0, len = ROOKS[them].length; i < len; i++) {
          if (move.to === ROOKS[them][i].square && this._castling[them] & ROOKS[them][i].flag) {
            this._castling[them] ^= ROOKS[them][i].flag;
            break;
          }
        }
      }
      if (move.flags & BITS.BIG_PAWN) {
        if (us === exports.BLACK) {
          this._epSquare = move.to - 16;
        } else {
          this._epSquare = move.to + 16;
        }
      } else {
        this._epSquare = EMPTY;
      }
      if (move.piece === exports.PAWN) {
        this._halfMoves = 0;
      } else if (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
        this._halfMoves = 0;
      } else {
        this._halfMoves++;
      }
      if (us === exports.BLACK) {
        this._moveNumber++;
      }
      this._turn = them;
    }
    undo() {
      const move = this._undoMove();
      if (move) {
        const prettyMove = new Move(this, move);
        this._decPositionCount(prettyMove.after);
        return prettyMove;
      }
      return null;
    }
    _undoMove() {
      const old = this._history.pop();
      if (old === void 0) {
        return null;
      }
      const move = old.move;
      this._kings = old.kings;
      this._turn = old.turn;
      this._castling = old.castling;
      this._epSquare = old.epSquare;
      this._halfMoves = old.halfMoves;
      this._moveNumber = old.moveNumber;
      const us = this._turn;
      const them = swapColor(us);
      this._board[move.from] = this._board[move.to];
      this._board[move.from].type = move.piece;
      delete this._board[move.to];
      if (move.captured) {
        if (move.flags & BITS.EP_CAPTURE) {
          let index;
          if (us === exports.BLACK) {
            index = move.to - 16;
          } else {
            index = move.to + 16;
          }
          this._board[index] = { type: exports.PAWN, color: them };
        } else {
          this._board[move.to] = { type: move.captured, color: them };
        }
      }
      if (move.flags & (BITS.KSIDE_CASTLE | BITS.QSIDE_CASTLE)) {
        let castlingTo, castlingFrom;
        if (move.flags & BITS.KSIDE_CASTLE) {
          castlingTo = move.to + 1;
          castlingFrom = move.to - 1;
        } else {
          castlingTo = move.to - 2;
          castlingFrom = move.to + 1;
        }
        this._board[castlingTo] = this._board[castlingFrom];
        delete this._board[castlingFrom];
      }
      return move;
    }
    pgn({ newline = "\n", maxWidth = 0 } = {}) {
      const result = [];
      let headerExists = false;
      for (const i in this._header) {
        result.push("[" + i + ' "' + this._header[i] + '"]' + newline);
        headerExists = true;
      }
      if (headerExists && this._history.length) {
        result.push(newline);
      }
      const appendComment = (moveString2) => {
        const comment = this._comments[this.fen()];
        if (typeof comment !== "undefined") {
          const delimiter = moveString2.length > 0 ? " " : "";
          moveString2 = `${moveString2}${delimiter}{${comment}}`;
        }
        return moveString2;
      };
      const reversedHistory = [];
      while (this._history.length > 0) {
        reversedHistory.push(this._undoMove());
      }
      const moves = [];
      let moveString = "";
      if (reversedHistory.length === 0) {
        moves.push(appendComment(""));
      }
      while (reversedHistory.length > 0) {
        moveString = appendComment(moveString);
        const move = reversedHistory.pop();
        if (!move) {
          break;
        }
        if (!this._history.length && move.color === "b") {
          const prefix = `${this._moveNumber}. ...`;
          moveString = moveString ? `${moveString} ${prefix}` : prefix;
        } else if (move.color === "w") {
          if (moveString.length) {
            moves.push(moveString);
          }
          moveString = this._moveNumber + ".";
        }
        moveString = moveString + " " + this._moveToSan(move, this._moves({ legal: true }));
        this._makeMove(move);
      }
      if (moveString.length) {
        moves.push(appendComment(moveString));
      }
      if (typeof this._header.Result !== "undefined") {
        moves.push(this._header.Result);
      }
      if (maxWidth === 0) {
        return result.join("") + moves.join(" ");
      }
      const strip = function() {
        if (result.length > 0 && result[result.length - 1] === " ") {
          result.pop();
          return true;
        }
        return false;
      };
      const wrapComment = function(width, move) {
        for (const token of move.split(" ")) {
          if (!token) {
            continue;
          }
          if (width + token.length > maxWidth) {
            while (strip()) {
              width--;
            }
            result.push(newline);
            width = 0;
          }
          result.push(token);
          width += token.length;
          result.push(" ");
          width++;
        }
        if (strip()) {
          width--;
        }
        return width;
      };
      let currentWidth = 0;
      for (let i = 0; i < moves.length; i++) {
        if (currentWidth + moves[i].length > maxWidth) {
          if (moves[i].includes("{")) {
            currentWidth = wrapComment(currentWidth, moves[i]);
            continue;
          }
        }
        if (currentWidth + moves[i].length > maxWidth && i !== 0) {
          if (result[result.length - 1] === " ") {
            result.pop();
          }
          result.push(newline);
          currentWidth = 0;
        } else if (i !== 0) {
          result.push(" ");
          currentWidth++;
        }
        result.push(moves[i]);
        currentWidth += moves[i].length;
      }
      return result.join("");
    }
    /*
     * @deprecated Use `setHeader` and `getHeaders` instead.
     */
    header(...args) {
      for (let i = 0; i < args.length; i += 2) {
        if (typeof args[i] === "string" && typeof args[i + 1] === "string") {
          this._header[args[i]] = args[i + 1];
        }
      }
      return this._header;
    }
    setHeader(key, value) {
      this._header[key] = value;
      return this._header;
    }
    removeHeader(key) {
      if (key in this._header) {
        delete this._header[key];
        return true;
      }
      return false;
    }
    getHeaders() {
      return this._header;
    }
    loadPgn(pgn, { strict = false, newlineChar = "\r?\n" } = {}) {
      function mask(str) {
        return str.replace(/\\/g, "\\");
      }
      function parsePgnHeader(header) {
        const headerObj = {};
        const headers2 = header.split(new RegExp(mask(newlineChar)));
        let key = "";
        let value = "";
        for (let i = 0; i < headers2.length; i++) {
          const regex = /^\s*\[\s*([A-Za-z]+)\s*"(.*)"\s*\]\s*$/;
          key = headers2[i].replace(regex, "$1");
          value = headers2[i].replace(regex, "$2");
          if (key.trim().length > 0) {
            headerObj[key] = value;
          }
        }
        return headerObj;
      }
      pgn = pgn.trim();
      const headerRegex = new RegExp("^(\\[((?:" + mask(newlineChar) + ")|.)*\\])((?:\\s*" + mask(newlineChar) + "){2}|(?:\\s*" + mask(newlineChar) + ")*$)");
      const headerRegexResults = headerRegex.exec(pgn);
      const headerString = headerRegexResults ? headerRegexResults.length >= 2 ? headerRegexResults[1] : "" : "";
      this.reset();
      const headers = parsePgnHeader(headerString);
      let fen = "";
      for (const key in headers) {
        if (key.toLowerCase() === "fen") {
          fen = headers[key];
        }
        this.header(key, headers[key]);
      }
      if (!strict) {
        if (fen) {
          this.load(fen, { preserveHeaders: true });
        }
      } else {
        if (headers["SetUp"] === "1") {
          if (!("FEN" in headers)) {
            throw new Error("Invalid PGN: FEN tag must be supplied with SetUp tag");
          }
          this.load(headers["FEN"], { preserveHeaders: true });
        }
      }
      function toHex(s) {
        return Array.from(s).map(function(c) {
          return c.charCodeAt(0) < 128 ? c.charCodeAt(0).toString(16) : encodeURIComponent(c).replace(/%/g, "").toLowerCase();
        }).join("");
      }
      function fromHex(s) {
        return s.length == 0 ? "" : decodeURIComponent("%" + (s.match(/.{1,2}/g) || []).join("%"));
      }
      const encodeComment = function(s) {
        s = s.replace(new RegExp(mask(newlineChar), "g"), " ");
        return `{${toHex(s.slice(1, s.length - 1))}}`;
      };
      const decodeComment = function(s) {
        if (s.startsWith("{") && s.endsWith("}")) {
          return fromHex(s.slice(1, s.length - 1));
        }
      };
      let ms = pgn.replace(headerString, "").replace(
        // encode comments so they don't get deleted below
        new RegExp(`({[^}]*})+?|;([^${mask(newlineChar)}]*)`, "g"),
        function(_match, bracket, semicolon) {
          return bracket !== void 0 ? encodeComment(bracket) : " " + encodeComment(`{${semicolon.slice(1)}}`);
        }
      ).replace(new RegExp(mask(newlineChar), "g"), " ");
      const ravRegex = /(\([^()]+\))+?/g;
      while (ravRegex.test(ms)) {
        ms = ms.replace(ravRegex, "");
      }
      ms = ms.replace(/\d+\.(\.\.)?/g, "");
      ms = ms.replace(/\.\.\./g, "");
      ms = ms.replace(/\$\d+/g, "");
      let moves = ms.trim().split(new RegExp(/\s+/));
      moves = moves.filter((move) => move !== "");
      let result = "";
      for (let halfMove = 0; halfMove < moves.length; halfMove++) {
        const comment = decodeComment(moves[halfMove]);
        if (comment !== void 0) {
          this._comments[this.fen()] = comment;
          continue;
        }
        const move = this._moveFromSan(moves[halfMove], strict);
        if (move == null) {
          if (TERMINATION_MARKERS.indexOf(moves[halfMove]) > -1) {
            result = moves[halfMove];
          } else {
            throw new Error(`Invalid move in PGN: ${moves[halfMove]}`);
          }
        } else {
          result = "";
          this._makeMove(move);
          this._incPositionCount(this.fen());
        }
      }
      if (result && Object.keys(this._header).length && !this._header["Result"]) {
        this.header("Result", result);
      }
    }
    /*
     * Convert a move from 0x88 coordinates to Standard Algebraic Notation
     * (SAN)
     *
     * @param {boolean} strict Use the strict SAN parser. It will throw errors
     * on overly disambiguated moves (see below):
     *
     * r1bqkbnr/ppp2ppp/2n5/1B1pP3/4P3/8/PPPP2PP/RNBQK1NR b KQkq - 2 4
     * 4. ... Nge7 is overly disambiguated because the knight on c6 is pinned
     * 4. ... Ne7 is technically the valid SAN
     */
    _moveToSan(move, moves) {
      let output = "";
      if (move.flags & BITS.KSIDE_CASTLE) {
        output = "O-O";
      } else if (move.flags & BITS.QSIDE_CASTLE) {
        output = "O-O-O";
      } else {
        if (move.piece !== exports.PAWN) {
          const disambiguator = getDisambiguator(move, moves);
          output += move.piece.toUpperCase() + disambiguator;
        }
        if (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
          if (move.piece === exports.PAWN) {
            output += algebraic(move.from)[0];
          }
          output += "x";
        }
        output += algebraic(move.to);
        if (move.promotion) {
          output += "=" + move.promotion.toUpperCase();
        }
      }
      this._makeMove(move);
      if (this.isCheck()) {
        if (this.isCheckmate()) {
          output += "#";
        } else {
          output += "+";
        }
      }
      this._undoMove();
      return output;
    }
    // convert a move from Standard Algebraic Notation (SAN) to 0x88 coordinates
    _moveFromSan(move, strict = false) {
      const cleanMove = strippedSan(move);
      let pieceType = inferPieceType(cleanMove);
      let moves = this._moves({ legal: true, piece: pieceType });
      for (let i = 0, len = moves.length; i < len; i++) {
        if (cleanMove === strippedSan(this._moveToSan(moves[i], moves))) {
          return moves[i];
        }
      }
      if (strict) {
        return null;
      }
      let piece = void 0;
      let matches = void 0;
      let from = void 0;
      let to = void 0;
      let promotion = void 0;
      let overlyDisambiguated = false;
      matches = cleanMove.match(/([pnbrqkPNBRQK])?([a-h][1-8])x?-?([a-h][1-8])([qrbnQRBN])?/);
      if (matches) {
        piece = matches[1];
        from = matches[2];
        to = matches[3];
        promotion = matches[4];
        if (from.length == 1) {
          overlyDisambiguated = true;
        }
      } else {
        matches = cleanMove.match(/([pnbrqkPNBRQK])?([a-h]?[1-8]?)x?-?([a-h][1-8])([qrbnQRBN])?/);
        if (matches) {
          piece = matches[1];
          from = matches[2];
          to = matches[3];
          promotion = matches[4];
          if (from.length == 1) {
            overlyDisambiguated = true;
          }
        }
      }
      pieceType = inferPieceType(cleanMove);
      moves = this._moves({
        legal: true,
        piece: piece ? piece : pieceType
      });
      if (!to) {
        return null;
      }
      for (let i = 0, len = moves.length; i < len; i++) {
        if (!from) {
          if (cleanMove === strippedSan(this._moveToSan(moves[i], moves)).replace("x", "")) {
            return moves[i];
          }
        } else if ((!piece || piece.toLowerCase() == moves[i].piece) && Ox88[from] == moves[i].from && Ox88[to] == moves[i].to && (!promotion || promotion.toLowerCase() == moves[i].promotion)) {
          return moves[i];
        } else if (overlyDisambiguated) {
          const square = algebraic(moves[i].from);
          if ((!piece || piece.toLowerCase() == moves[i].piece) && Ox88[to] == moves[i].to && (from == square[0] || from == square[1]) && (!promotion || promotion.toLowerCase() == moves[i].promotion)) {
            return moves[i];
          }
        }
      }
      return null;
    }
    ascii() {
      let s = "   +------------------------+\n";
      for (let i = Ox88.a8; i <= Ox88.h1; i++) {
        if (file(i) === 0) {
          s += " " + "87654321"[rank(i)] + " |";
        }
        if (this._board[i]) {
          const piece = this._board[i].type;
          const color = this._board[i].color;
          const symbol = color === exports.WHITE ? piece.toUpperCase() : piece.toLowerCase();
          s += " " + symbol + " ";
        } else {
          s += " . ";
        }
        if (i + 1 & 136) {
          s += "|\n";
          i += 8;
        }
      }
      s += "   +------------------------+\n";
      s += "     a  b  c  d  e  f  g  h";
      return s;
    }
    perft(depth) {
      const moves = this._moves({ legal: false });
      let nodes = 0;
      const color = this._turn;
      for (let i = 0, len = moves.length; i < len; i++) {
        this._makeMove(moves[i]);
        if (!this._isKingAttacked(color)) {
          if (depth - 1 > 0) {
            nodes += this.perft(depth - 1);
          } else {
            nodes++;
          }
        }
        this._undoMove();
      }
      return nodes;
    }
    turn() {
      return this._turn;
    }
    board() {
      const output = [];
      let row = [];
      for (let i = Ox88.a8; i <= Ox88.h1; i++) {
        if (this._board[i] == null) {
          row.push(null);
        } else {
          row.push({
            square: algebraic(i),
            type: this._board[i].type,
            color: this._board[i].color
          });
        }
        if (i + 1 & 136) {
          output.push(row);
          row = [];
          i += 8;
        }
      }
      return output;
    }
    squareColor(square) {
      if (square in Ox88) {
        const sq = Ox88[square];
        return (rank(sq) + file(sq)) % 2 === 0 ? "light" : "dark";
      }
      return null;
    }
    history({ verbose = false } = {}) {
      const reversedHistory = [];
      const moveHistory = [];
      while (this._history.length > 0) {
        reversedHistory.push(this._undoMove());
      }
      while (true) {
        const move = reversedHistory.pop();
        if (!move) {
          break;
        }
        if (verbose) {
          moveHistory.push(new Move(this, move));
        } else {
          moveHistory.push(this._moveToSan(move, this._moves()));
        }
        this._makeMove(move);
      }
      return moveHistory;
    }
    /*
     * Keeps track of position occurrence counts for the purpose of repetition
     * checking. All three methods (`_inc`, `_dec`, and `_get`) trim the
     * irrelevent information from the fen, initialising new positions, and
     * removing old positions from the record if their counts are reduced to 0.
     */
    _getPositionCount(fen) {
      const trimmedFen = trimFen(fen);
      return this._positionCount[trimmedFen] || 0;
    }
    _incPositionCount(fen) {
      const trimmedFen = trimFen(fen);
      if (this._positionCount[trimmedFen] === void 0) {
        this._positionCount[trimmedFen] = 0;
      }
      this._positionCount[trimmedFen] += 1;
    }
    _decPositionCount(fen) {
      const trimmedFen = trimFen(fen);
      if (this._positionCount[trimmedFen] === 1) {
        delete this._positionCount[trimmedFen];
      } else {
        this._positionCount[trimmedFen] -= 1;
      }
    }
    _pruneComments() {
      const reversedHistory = [];
      const currentComments = {};
      const copyComment = (fen) => {
        if (fen in this._comments) {
          currentComments[fen] = this._comments[fen];
        }
      };
      while (this._history.length > 0) {
        reversedHistory.push(this._undoMove());
      }
      copyComment(this.fen());
      while (true) {
        const move = reversedHistory.pop();
        if (!move) {
          break;
        }
        this._makeMove(move);
        copyComment(this.fen());
      }
      this._comments = currentComments;
    }
    getComment() {
      return this._comments[this.fen()];
    }
    setComment(comment) {
      this._comments[this.fen()] = comment.replace("{", "[").replace("}", "]");
    }
    /**
     * @deprecated Renamed to `removeComment` for consistency
     */
    deleteComment() {
      return this.removeComment();
    }
    removeComment() {
      const comment = this._comments[this.fen()];
      delete this._comments[this.fen()];
      return comment;
    }
    getComments() {
      this._pruneComments();
      return Object.keys(this._comments).map((fen) => {
        return { fen, comment: this._comments[fen] };
      });
    }
    /**
     * @deprecated Renamed to `removeComments` for consistency
     */
    deleteComments() {
      return this.removeComments();
    }
    removeComments() {
      this._pruneComments();
      return Object.keys(this._comments).map((fen) => {
        const comment = this._comments[fen];
        delete this._comments[fen];
        return { fen, comment };
      });
    }
    setCastlingRights(color, rights) {
      for (const side of [exports.KING, exports.QUEEN]) {
        if (rights[side] !== void 0) {
          if (rights[side]) {
            this._castling[color] |= SIDES[side];
          } else {
            this._castling[color] &= ~SIDES[side];
          }
        }
      }
      this._updateCastlingRights();
      const result = this.getCastlingRights(color);
      return (rights[exports.KING] === void 0 || rights[exports.KING] === result[exports.KING]) && (rights[exports.QUEEN] === void 0 || rights[exports.QUEEN] === result[exports.QUEEN]);
    }
    getCastlingRights(color) {
      return {
        [exports.KING]: (this._castling[color] & SIDES[exports.KING]) !== 0,
        [exports.QUEEN]: (this._castling[color] & SIDES[exports.QUEEN]) !== 0
      };
    }
    moveNumber() {
      return this._moveNumber;
    }
  };
  exports.Chess = Chess;
  var SQUARES = exports.SQUARES;
  var DEFAULT_POSITION = exports.DEFAULT_POSITION;
  var WHITE = exports.WHITE;
  var BLACK = exports.BLACK;
  var PAWN = exports.PAWN;
  var KNIGHT = exports.KNIGHT;
  var BISHOP = exports.BISHOP;
  var ROOK = exports.ROOK;
  var QUEEN = exports.QUEEN;
  var KING = exports.KING;

  // js/src/compat.js
  window.Chess = Chess;

  // js/src/core.js
  var __awaiter = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      if (value instanceof P) {
        return value;
      } else {
        return new P(function(resolve) {
          resolve(value);
        });
      }
    }
    return new (P ||= Promise)(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        if (result.done) {
          resolve(result.value);
        } else {
          adopt(result.value).then(fulfilled, rejected);
        }
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  var ChromeRequest = /* @__PURE__ */ function() {
    var requestId = 0;
    function getData(data) {
      var id = requestId++;
      return new Promise(function(resolve, reject) {
        function listener(evt) {
          if (evt.detail.requestId == id) {
            window.removeEventListener("BetterMintSendOptions", listener);
            resolve(evt.detail.data);
          }
        }
        window.addEventListener("BetterMintSendOptions", listener);
        const payload = {
          data,
          id
        };
        window.dispatchEvent(new CustomEvent("BetterMintGetOptions", { detail: payload }));
      });
    }
    return { getData };
  }();
  var enumOptions = {
    UrlApiStockfish: "option-url-api-stockfish",
    ApiStockfish: "option-api-stockfish",
    Depth: "option-depth",
    MultiPV: "option-multipv",
    ShowHints: "option-show-hints",
    MoveAnalysis: "option-move-analysis",
    DepthBar: "option-depth-bar",
    EvaluationBar: "option-evaluation-bar",
    DragonHash: "option-hash",
    DragonUciElo: "option-uci-elo",
    DragonPersonality: "option-personality",
    DragonLimitStrength: "option-limit-strength",
    DragonAutoSkill: "option-auto-skill",
    DragonOwnBook: "option-own-book",
    DragonChess960: "option-chess960",
    DragonBestBookLine: "option-best-book-line",
    DragonLimitBookMoves: "option-limit-book-moves",
    DragonBookMoves: "option-book-moves",
    ColorBestArrow: "option-color-best-arrow",
    ColorOtherArrow: "option-color-other-arrow",
    PredDepth: "option-pred-depth",
    HideArrows: "option-hide-arrows",
    HidePlayers: "option-hide-players",
    EngineSource: "option-engine-source",
    CoachEnabled: "option-coach-enabled",
    PreAnalyzeEnabled: "option-pre-analyze-enabled",
    CoachMoveFeedback: "option-coach-move-feedback",
    CoachAccuracy: "option-coach-accuracy",
    CoachDepth: "option-coach-depth",
    CoachVoice: "option-coach-voice",
    CoachLocale: "option-coach-locale",
    CoachVoiceEnabled: "option-coach-voice-enabled",
    CoachRecap: "option-coach-recap",
    AutoMoveEnabled: "option-automove-enabled",
    AutoMoveMin: "option-automove-min",
    AutoMoveMax: "option-automove-max",
    AutoMoveCenterWeight: "option-automove-centerweight",
    AutoStartNewGame: "option-autostart-newgame",
    FlagModeEnabled: "option-flag-mode-enabled",
    InstantRecapture: "option-instant-recapture",
    FastSimpleMoves: "option-fast-simple-moves",
    SimulateCheckmates: "option-simulate-checkmates",
    BlunderReactEnabled: "option-blunder-react",
    PremoveEnabled: "option-premove-enabled",
    AutoPremoveEnabled: "option-autopremove-enabled",
    AutoPremoveMatesEnabled: "option-autopremove-mates-enabled",
    AutoPremoveCheckingForkEnabled: "option-autopremove-checking-fork-enabled",
    MoveMethod: "option-move-method",
    SmartTimingProfile: "option-smart-timing-profile",
    CheckMoveEnabled: "option-checkmove-enabled",
    UltrabulletEnabled: "option-ultrabullet-enabled",
    UltrabulletMin: "option-ultrabullet-min",
    UltrabulletMax: "option-ultrabullet-max",
    UltrabulletPremoveChance: "option-ultrabullet-premove-chance",
    UltrabulletPremoveChainLimit: "option-ultrabullet-premove-chain-limit",
    UltrabulletCheckmoveChance: "option-ultrabullet-checkmove-chance",
    UltrabulletIgnoreCaptures: "option-ultrabullet-ignore-captures",
    UltrabulletIgnoreRecapture: "option-ultrabullet-ignore-recapture",
    UltrabulletReactToCheck: "option-ultrabullet-react-to-check",
    UltrabulletGuardQueen: "option-ultrabullet-guard-queen",
    UltrabulletFollowThroughAttack: "option-ultrabullet-follow-through-attack",
    UltrabulletFlagModeEnabled: "option-ultrabullet-flag-mode-enabled",
    UltrabulletOpeningPreference: "option-ultrabullet-opening-preference",
    UltrabulletLefongTrapChance: "option-ultrabullet-lefong-trap-chance"
  };
  var BetterMintmaster;
  var eTable = null;
  var tempOptions = {};
  ChromeRequest.getData().then(function(options) {
    tempOptions = options;
  });
  window.addEventListener("BetterMintUpdateOptions", function(evt) {
    tempOptions = Object.assign({}, tempOptions, evt.detail);
  });
  var ULTRABULLET_ENGINE_OVERRIDES = {
    "option-engine-source": "komodo",
    "option-personality": "Aggressive",
    "option-depth": 2,
    "option-multipv": 5,
    "option-pred-depth": 8,
    "option-uci-elo": 3500,
    "option-hash": 64,
    "option-limit-strength": false,
    "option-auto-skill": false,
    "option-own-book": true,
    "option-chess960": false,
    "option-best-book-line": true,
    "option-limit-book-moves": false,
    "option-book-moves": 5,
    "option-opening-white-1": "none",
    "option-opening-white-2": "none",
    "option-opening-black-1": "none",
    "option-opening-black-2": "none"
  };
  var ULTRABULLET_AUTOMOVE_OVERRIDES = {
    "option-automove-enabled": false
  };
  function getValueConfig(key) {
    const value = BetterMintmaster == void 0 ? tempOptions[key] : BetterMintmaster.options[key];
    if (key !== "option-ultrabullet-enabled") {
      const ultrabulletEnabled = BetterMintmaster == void 0 ? tempOptions["option-ultrabullet-enabled"] : BetterMintmaster.options["option-ultrabullet-enabled"];
      if (ultrabulletEnabled) {
        if (Object.prototype.hasOwnProperty.call(ULTRABULLET_ENGINE_OVERRIDES, key)) {
          return ULTRABULLET_ENGINE_OVERRIDES[key];
        }
        if (Object.prototype.hasOwnProperty.call(
          ULTRABULLET_AUTOMOVE_OVERRIDES,
          key
        )) {
          return ULTRABULLET_AUTOMOVE_OVERRIDES[key];
        }
      }
    }
    return value;
  }
  function setBetterMintmaster(master) {
    BetterMintmaster = master;
  }
  function setETable(map) {
    eTable = map;
  }

  // js/src/config/opening-book.js
  var OPENING_BOOK = {
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
  var ULTRABULLET_CHANCE_LOCK_MOVES = 4;
  var ULTRABULLET_OPENING_BOOK = {
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
  var LEFONG_TRAP_VALUE = {
    n: 3,
    b: 3,
    r: 5,
    q: 9
  };
  var LEFONG_TRAP_ATTACKER_TYPES = ["n", "b", "r"];
  var LEFONG_TRAP_PIECE_WEIGHTS = {
    q: 40,
    r: 30,
    b: 15,
    n: 15
  };

  // js/src/engine/top-move.js
  var TopMove = class {
    constructor(pvLine, depth, cp, mate) {
      this.line = pvLine.split(" ");
      this.move = this.line[0];
      this.promotion = this.move.length > 4 ? this.move.substring(4, 5) : null;
      this.from = this.move.substring(0, 2);
      this.to = this.move.substring(2, 4);
      this.cp = cp;
      this.mate = mate;
      this.depth = depth;
    }
  };

  // js/src/board/game-controller.js
  var GameController = class {
    // Wires into the chess.com board controller (`chessboard.game`) and subscribes
    // to its lifecycle events — Move, ModeChanged, RendererSet, Load and
    // UpdateOptions — so the engine, coach and eval/depth bars stay in sync with
    // whatever happens on the board.
    constructor(master, chessboard) {
      this.BetterMintmaster = master;
      this.chessboard = chessboard;
      this.controller = chessboard.game;
      this.options = this.controller.getOptions();
      this.depthBar = null;
      this.evalBar = null;
      this.evalBarFill = null;
      this.evalScore = null;
      this.evalScoreAbbreviated = null;
      this.currentMarkings = [];
      let self = this;
      const triggerCoachAnalysis = () => {
        if (!master.coach) {
          return;
        }
        if (!getValueConfig(enumOptions.CoachEnabled)) {
          return;
        }
        const fullLine = this.controller.getCurrentFullLine ? this.controller.getCurrentFullLine() : null;
        let positionCmd = "";
        if (fullLine && fullLine.length > 0) {
          const startFen = fullLine[0].beforeFen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
          const movesUci = fullLine.map((step) => step.from + step.to + (step.promotion || "")).join(" ");
          positionCmd = "position fen " + startFen + (movesUci ? " moves " + movesUci : "");
        } else {
          positionCmd = "position fen " + this.controller.getFEN();
        }
        const currentFen = this.controller.getFEN();
        master._lastCoachFen = currentFen;
        master.coach.getAnalysis(positionCmd).then((analysis) => {
          if (!analysis) {
            return;
          }
          if (master._lastCoachFen !== currentFen) {
            return;
          }
          master.lastCoachResult = analysis;
          if (getValueConfig(enumOptions.CoachMoveFeedback) && !getValueConfig(enumOptions.PreAnalyzeEnabled)) {
            master.placeMoveFeedbackSVG(analysis);
          }
          if (getValueConfig(enumOptions.CoachAccuracy)) {
            master.updateAccuracyWidget(analysis);
          } else if (master.resetAccuracyWidget) {
            master.resetAccuracyWidget();
          }
          if (getValueConfig(enumOptions.CoachVoiceEnabled)) {
            master.playCoachAudio(analysis.audioUrlHash);
          }
          if (analysis.tallies && getValueConfig(enumOptions.CoachRecap)) {
            master.updateTalliesWidget(analysis.tallies);
          }
        }).catch((error) => console.error("[CoachEngine] hata:", error));
      };
      this.buildUciPositionWithCandidate = (candidateUci) => {
        const fullLine = this.controller.getCurrentFullLine ? this.controller.getCurrentFullLine() : null;
        if (fullLine && fullLine.length > 0) {
          const startFen = fullLine[0].beforeFen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
          const movesUci = fullLine.map((step) => step.from + step.to + (step.promotion || "")).join(" ");
          const allMoves = movesUci ? movesUci + " " + candidateUci : candidateUci;
          return "position fen " + startFen + " moves " + allMoves;
        } else {
          return "position fen " + this.controller.getFEN() + " moves " + candidateUci;
        }
      };
      const attachNavButtons = () => {
        const attachButton = (selector) => {
          const button = document.querySelector(selector);
          if (!button || button._asinaNavAttached) {
            return;
          }
          button._asinaNavAttached = true;
          button.addEventListener("click", () => {
            setTimeout(() => {
              this.UpdateEngine(false);
              triggerCoachAnalysis();
            }, 80);
          });
        };
        attachButton('[data-cy="move-list-button-forward"]');
        attachButton('[data-cy="move-list-button-backward"]');
      };
      const navObserver = new MutationObserver(() => attachNavButtons());
      navObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
      attachNavButtons();
      document.addEventListener("keydown", (event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          setTimeout(() => {
            this.UpdateEngine(false);
            triggerCoachAnalysis();
          }, 80);
        }
      });
      ["MoveForward", "MoveBackward", "Seek", "ScrollMove"].forEach(
        (eventName) => {
          try {
            this.controller.on(eventName, () => {
              setTimeout(() => {
                this.UpdateEngine(false);
                triggerCoachAnalysis();
              }, 80);
            });
          } catch (e) {
          }
        }
      );
      this.controller.on("Move", (moveData) => {
        const fen = this.controller.getFEN();
        if (fen.startsWith("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR")) {
          if (master.engine.moveCounter === 0 && fen.endsWith("w KQkq")) {
            master.engine.isPreMoveSequence = true;
          }
        }
        this.UpdateEngine(false);
        triggerCoachAnalysis();
      });
      if (this.evalBar == null && getValueConfig(enumOptions.EvaluationBar)) {
        this.CreateAnalysisTools();
      }
      this.controller.on("ModeChanged", (modeEvent) => {
        if (modeEvent.data === "playing") {
          this.ResetGame();
          master.game.RefreshEvalutionBar();
          master.engine.moveCounter = 0;
          master.engine.hasShownLimitMessage = false;
          master.engine.isPreMoveSequence = true;
          master._autoStartNewGameClicked = false;
        } else if (modeEvent.data === "observing") {
        } else if (modeEvent.data === "passive-observing") {
          this._waitingForLoad = true;
        }
      });
      let rendererSetFired = false;
      this.controller.on("RendererSet", (rendererData) => {
        this.ResetGame();
        this.RefreshEvalutionBar();
        rendererSetFired = true;
      });
      setTimeout(() => {
        if (!rendererSetFired) {
          this.controller.on("ResetGame", (resetData) => {
            this.ResetGame();
            this.RefreshEvalutionBar();
          });
        }
      }, 1100);
      this.controller.on("Load", (loadData) => {
        if (this._waitingForLoad) {
          this._waitingForLoad = false;
          try {
            const fen = this.controller.getFEN();
            if (fen) {
              master.engine.stopEvaluation(() => {
                master.engine.topMoves = [];
                master.engine.send("ucinewgame");
                master.engine.UpdateOptions();
                master.engine.UpdatePosition(fen, false);
              });
            }
          } catch (e) {
          }
        }
      });
      this.controller.on("UpdateOptions", (optionsData) => {
        this.options = this.controller.getOptions();
      });
    }
    // Applies runtime option changes: creates/removes the depth and evaluation
    // bars, clears hint markings when hints/arrows are off or stream mode is
    // active, and drops the last-move effect when move analysis is disabled.
    UpdateExtensionOptions() {
      if (getValueConfig(enumOptions.EvaluationBar) && this.evalBar == null) {
        this.CreateAnalysisTools();
      } else if (!getValueConfig(enumOptions.EvaluationBar) && this.evalBar != null) {
        this.evalBar.remove();
        this.evalBar = null;
        document.body.classList.remove("with-evaluation");
      }
      if (getValueConfig(enumOptions.DepthBar) && this.depthBar == null) {
        this.CreateAnalysisTools();
      } else if (!getValueConfig(enumOptions.DepthBar) && this.depthBar != null) {
        this.depthBar.parentElement.remove();
        this.depthBar = null;
      }
      if (!getValueConfig(enumOptions.ShowHints) || getValueConfig("option-stream-mode")) {
        this.RemoveCurrentMarkings();
      }
      if (!getValueConfig(enumOptions.MoveAnalysis)) {
        let lastMove = this.controller.getLastMove();
        if (lastMove) {
          this.controller.markings.removeOne("effect|" + lastMove.to);
        }
      }
      if (getValueConfig(enumOptions.HideArrows) || getValueConfig("option-stream-mode")) {
        this.RemoveCurrentMarkings();
      }
      this.ApplyHidePlayers();
    }
    // No-op hook — the hide-players feature is intentionally empty in this build.
    ApplyHidePlayers() {
    }
    // Injects the depth bar and evaluation bar DOM next to the board. The board
    // wrapper may not exist yet when the extension boots, so a 10ms retry
    // interval polls for it and installs whichever bars are enabled once found.
    CreateAnalysisTools() {
      if (getValueConfig("option-stream-mode")) {
        return;
      }
      let waitInterval = setInterval(() => {
        let boardWrap = this.chessboard.parentElement;
        if (boardWrap == null) {
          return;
        }
        let boardOuter = boardWrap.parentElement;
        if (boardOuter == null) {
          return;
        }
        clearInterval(waitInterval);
        if (getValueConfig(enumOptions.DepthBar) && this.depthBar == null) {
          let depthBarEl = document.createElement("div");
          depthBarEl.classList.add("depthBarLayoutt");
          depthBarEl.innerHTML = '<div class="depthBarr"><span class="depthBarProgress"></span></div>';
          boardOuter.insertBefore(depthBarEl, boardWrap.nextSibling);
          this.depthBar = depthBarEl.querySelector(".depthBarProgress");
        }
        if (getValueConfig(enumOptions.EvaluationBar) && this.evalBar == null) {
          let evalBarEl = document.createElement("div");
          evalBarEl.style.flex = "1 1 auto;";
          evalBarEl.innerHTML = '\n                <div class="evaluation-bar-bar">\n                    <span class="evaluation-bar-scoreAbbreviated evaluation-bar-dark">0.0</span>\n                    <span class="evaluation-bar-score evaluation-bar-dark ">+0.00</span>\n                    <div class="evaluation-bar-fill">\n                    <div class="evaluation-bar-color evaluation-bar-black"></div>\n                    <div class="evaluation-bar-color evaluation-bar-draw"></div>\n                    <div class="evaluation-bar-color evaluation-bar-white" style="transform: translate3d(0px, 50%, 0px);"></div>\n                    </div>\n                </div>';
          let evalContainer = boardWrap.querySelector("#board-layout-evaluation");
          if (evalContainer == null) {
            evalContainer = document.createElement("div");
            evalContainer.classList.add("board-layout-evaluation");
            boardWrap.insertBefore(evalContainer, boardWrap.firstElementChild);
          }
          evalContainer.innerHTML = "";
          evalContainer.appendChild(evalBarEl);
          document.body.classList.add("with-evaluation");
          if (window.innerWidth < 960) {
            const syncHeight = () => {
              const rect = this.chessboard.getBoundingClientRect();
              if (rect.height > 0) {
                evalContainer.style.height = rect.height + "px";
              }
            };
            syncHeight();
            window.addEventListener("resize", syncHeight);
          }
          this.evalBar = evalContainer.querySelector(".evaluation-bar-bar");
          this.evalBarFill = evalContainer.querySelector(".evaluation-bar-white");
          this.evalScore = evalContainer.querySelector(".evaluation-bar-score");
          this.evalScoreAbbreviated = evalContainer.querySelector(
            ".evaluation-bar-scoreAbbreviated"
          );
        }
      }, 10);
    }
    // Rebuilds the evaluation bar — used after renderer resets so the bar is
    // re-attached to the fresh board DOM.
    RefreshEvalutionBar() {
      if (getValueConfig(enumOptions.EvaluationBar)) {
        if (this.evalBar == null) {
          this.CreateAnalysisTools();
        } else if (this.evalBar != null) {
          this.evalBar.remove();
          this.evalBar = null;
          document.body.classList.remove("with-evaluation");
          this.CreateAnalysisTools();
        }
      }
    }
    // Pushes the current board FEN into the engine; `isNewGame` tells the engine
    // to start a fresh search instead of continuing the previous one. The depth
    // bar is reset to 0 because the old search depth no longer applies.
    UpdateEngine(isNewGame) {
      let fen = this.controller.getFEN();
      this.BetterMintmaster.engine.UpdatePosition(fen, isNewGame);
      this.SetCurrentDepth(0);
    }
    // Delayed full reset: re-analyses as a new game, refreshes the eval bar and
    // resets the coach and accuracy widgets. The 300ms delay lets the board
    // finish its own reset first.
    ResetGame() {
      setTimeout(() => {
        this.UpdateEngine(true);
        BetterMintmaster.game.RefreshEvalutionBar();
        if (BetterMintmaster.coach) {
          BetterMintmaster.coach.newGame();
        }
        if (BetterMintmaster && BetterMintmaster.resetAccuracyWidget) {
          BetterMintmaster.resetAccuracyWidget();
        }
      }, 300);
    }
    // Removes every marking this controller added (the board API keys markings
    // as `type|square` or `type|fromto`), then clears the local tracking list.
    RemoveCurrentMarkings() {
      this.currentMarkings.forEach((marking) => {
        let key = marking.type + "|";
        if (marking.data.square != null) {
          key += marking.data.square;
        } else {
          key += "" + marking.data.from + marking.data.to;
        }
        this.controller.markings.removeOne(key);
      });
      this.currentMarkings = [];
    }
    // Renders engine hints on the board.
    // NOTE: the 2nd parameter (`lastTopMoves`) is currently unused in the body;
    // the 3rd parameter (`isSearching`) switches between live-search and
    // finished-search depth display (see the depth-bar percentage below).
    // Two arrow modes:
    //  - Komodo PV mode (MultiPV=1 + PredDepth + live search + Komodo engine):
    //    draws the best line as a chain of arrows, alternating best/other colors
    //    per ply and fading opacity every full move, capped by PredDepth and the
    //    engine's current depth.
    //  - Default mode: one arrow per top move — the best move in the "best"
    //    color, the rest in the "other" color with opacity fading by rank.
    // A mate score additionally marks the destination square with a
    // Winner/Resign effect. Afterwards the eval bar and stream overlays are fed
    // via the `AsinaEngineUpdate` / `AsinaSendStreamData` window events; the
    // `evalEngine.evaluate` callback orients scores by side-to-move (turn 2 =
    // black) before updating the bar.
    HintMoves(topMoves, lastTopMoves, isSearching) {
      let best = topMoves[0];
      if (getValueConfig(enumOptions.ShowHints) && !getValueConfig("option-stream-mode")) {
        this.RemoveCurrentMarkings();
        const multipv = getValueConfig(enumOptions.MultiPV) || 1;
        const predDepth = getValueConfig(enumOptions.PredDepth) || 0;
        const isKomodo = this.BetterMintmaster.engine?.engineType === "komodo";
        const showPvArrows = multipv === 1 && predDepth > 0 && isSearching && isKomodo;
        if (showPvArrows) {
          const bestColor = getValueConfig(enumOptions.ColorBestArrow) || "#FF3333";
          const otherColor = getValueConfig(enumOptions.ColorOtherArrow) || "#FECA57";
          const turn = this.controller.getFEN().split(" ")[1];
          const pvLine = best.line;
          const engineDepth = this.BetterMintmaster.engine.depth;
          const pliesToShow = Math.min(predDepth, pvLine.length, engineDepth);
          for (let ply = 0; ply < pliesToShow; ply++) {
            const uci = pvLine[ply];
            if (!uci || uci.length < 4) {
              break;
            }
            const from = uci.substring(0, 2);
            const to = uci.substring(2, 4);
            const isOwnPly = ply % 2 === 0;
            const color = isOwnPly ? bestColor : otherColor;
            const moveIdx = Math.floor(ply / 2);
            const opacity = Math.max(1 - moveIdx * 0.2, 0.2);
            const arrowData = {
              from,
              color,
              opacity,
              to
            };
            const arrowMarking = {
              data: arrowData,
              node: true,
              persistent: true,
              type: "arrow"
            };
            this.currentMarkings.push(arrowMarking);
          }
          if (best.mate != null && pliesToShow > 0) {
            const lastUci = pvLine[pliesToShow - 1];
            if (lastUci && lastUci.length >= 4) {
              this.currentMarkings.push({
                data: {
                  square: lastUci.substring(2, 4),
                  type: best.mate < 0 ? "ResignWhite" : "WinnerWhite"
                },
                node: true,
                persistent: true,
                type: "effect"
              });
            }
          }
          this.currentMarkings.reverse();
          if (!getValueConfig(enumOptions.HideArrows) && !getValueConfig("option-stream-mode")) {
            this.controller.markings.addMany(this.currentMarkings);
          }
        } else {
          topMoves.forEach((topMove, rank2) => {
            if (isSearching && topMove.depth != best.depth) {
              return;
            }
            let bestColor = getValueConfig(enumOptions.ColorBestArrow) || "#FF3333";
            let otherColor = getValueConfig(enumOptions.ColorOtherArrow) || "#FECA57";
            let color = rank2 === 0 ? bestColor : otherColor;
            let opacity = rank2 === 0 ? 1 : rank2 === 1 ? 1 : Math.max(1 - (rank2 - 1) * 0.2, 0.2);
            const arrowData = {
              from: topMove.from,
              color,
              opacity,
              to: topMove.to
            };
            const arrowMarking = {
              data: arrowData,
              node: true,
              persistent: true,
              type: "arrow"
            };
            this.currentMarkings.push(arrowMarking);
            if (topMove.mate != null) {
              this.currentMarkings.push({
                data: {
                  square: topMove.to,
                  type: topMove.mate < 0 ? "ResignWhite" : "WinnerWhite"
                },
                node: true,
                persistent: true,
                type: "effect"
              });
            }
          });
          this.currentMarkings.reverse();
          if (!getValueConfig(enumOptions.HideArrows) && !getValueConfig("option-stream-mode")) {
            this.controller.markings.addMany(this.currentMarkings);
          }
        }
      }
      if (getValueConfig(enumOptions.DepthBar) && !getValueConfig("option-stream-mode")) {
        let depthPercent = (isSearching ? best.depth : best.depth - 1) / getValueConfig(enumOptions.Depth) * 100;
        this.SetCurrentDepth(depthPercent);
      }
      if (getValueConfig(enumOptions.EvaluationBar) || getValueConfig("option-stream-mode")) {
        const fen = this.controller.getFEN();
        const evalEngine = this.BetterMintmaster?.evalEngine;
        const controller = this.controller;
        const streamMode = getValueConfig("option-stream-mode");
        if (evalEngine && fen) {
          evalEngine.evaluate(fen, (cp, mate) => {
            if (!getValueConfig(enumOptions.EvaluationBar) && !getValueConfig("option-stream-mode")) {
              return;
            }
            if (!streamMode) {
              let orientedCp2 = mate !== null ? mate : cp;
              if (controller.getTurn() == 2) {
                orientedCp2 *= -1;
              }
              this.SetEvaluation(orientedCp2, mate !== null);
            }
            if (cp !== null) {
              this.lastStockfishCp = controller.getTurn() == 2 ? -cp : cp;
              this.lastStockfishFen = fen;
            }
            const orientedCp = mate !== null ? null : controller.getTurn() == 2 ? -cp : cp;
            if (!streamMode) {
              const engineUpdate2 = {
                cp: orientedCp,
                mate,
                depth: best.depth
              };
              const updateEvent2 = {
                detail: engineUpdate2
              };
              window.dispatchEvent(
                new CustomEvent("AsinaEngineUpdate", updateEvent2)
              );
            }
            if (streamMode) {
              const streamData = {
                sfCp: orientedCp,
                sfMate: mate
              };
              const streamEvent = {
                detail: streamData
              };
              window.dispatchEvent(
                new CustomEvent("AsinaSendStreamData", streamEvent)
              );
            }
          });
        }
      }
      const engineUpdate = {
        cp: best.cp,
        mate: best.mate,
        depth: best.depth
      };
      const updateEvent = {
        detail: engineUpdate
      };
      window.dispatchEvent(new CustomEvent("AsinaEngineUpdate", updateEvent));
      if (getValueConfig("option-stream-mode")) {
        window.dispatchEvent(
          new CustomEvent("AsinaSendStreamData", {
            detail: {
              fen: this.controller.getFEN(),
              topMoves: topMoves.map((topMove) => ({
                from: topMove.from,
                to: topMove.to,
                cp: topMove.cp,
                mate: topMove.mate
              })),
              cp: best.cp,
              mate: best.mate,
              depth: best.depth,
              maxDepth: getValueConfig(enumOptions.Depth) || 20
            }
          })
        );
      }
    }
    // Updates the depth bar fill width (a percentage). 0 snaps to an empty bar
    // without the CSS transition; values above 100 are clamped.
    SetCurrentDepth(percent) {
      if (this.depthBar == null) {
        return;
      }
      let style = this.depthBar.style;
      if (percent <= 0) {
        this.depthBar.classList.add("disable-transition");
        style.width = "0%";
        this.depthBar.classList.remove("disable-transition");
      } else {
        if (percent > 100) {
          percent = 100;
        }
        style.width = percent + "%";
      }
    }
    // Updates the evaluation bar. Centipawn scores map onto a fill percentage
    // clamped to 5–95 (±5 pawns spans the whole bar); mate scores pin the bar to
    // 0/100 and render as "M<n>". The score text switches between dark/light
    // styling depending on which side the evaluation favors.
    SetEvaluation(evalValue, isMate) {
      if (this.evalBar == null) {
        return;
      }
      var fillPercent;
      var scoreText;
      var scoreAbbrev;
      if (!isMate) {
        let maxCp = 500;
        let minCp = -500;
        let pawns = evalValue / 100;
        fillPercent = 90 - (evalValue - minCp) / (maxCp - minCp) * 90 + 5;
        if (fillPercent < 5) {
          fillPercent = 5;
        } else if (fillPercent > 95) {
          fillPercent = 95;
        }
        scoreText = (evalValue >= 0 ? "+" : "") + pawns.toFixed(2);
        scoreAbbrev = Math.abs(pawns).toFixed(1);
      } else {
        fillPercent = evalValue < 0 ? 100 : 0;
        scoreText = "M" + Math.abs(evalValue).toString();
        scoreAbbrev = scoreText;
      }
      this.evalBarFill.style.transform = "translate3d(0px, " + fillPercent + "%, 0px)";
      this.evalScore.innerText = scoreText;
      this.evalScoreAbbreviated.innerText = scoreAbbrev;
      let activeClass = evalValue >= 0 ? "evaluation-bar-dark" : "evaluation-bar-light";
      let inactiveClass = evalValue >= 0 ? "evaluation-bar-light" : "evaluation-bar-dark";
      this.evalScore.classList.remove(inactiveClass);
      this.evalScoreAbbreviated.classList.remove(inactiveClass);
      this.evalScore.classList.add(activeClass);
      this.evalScoreAbbreviated.classList.add(activeClass);
    }
    // Returns the board's player-color code (1 = white, 2 = black).
    getPlayingAs() {
      if (this.options.isPlayerBlack) {
        return 2;
      } else {
        return 1;
      }
    }
    // Places a move-classification effect icon (brilliant/good/…, resolved via
    // the master's classifier) on a square during pre-analyze, remembering it so
    // clearPreAnalyzeMarkings can remove it later.
    placePreAnalyzeIcon(square, classification) {
      try {
        const effectType = this.BetterMintmaster._classificationToEffect ? this.BetterMintmaster._classificationToEffect(classification) : "Good";
        const markings = this.controller.markings;
        markings.removeOne("effect|" + square);
        const effectData = {
          square,
          type: effectType
        };
        const effectMarking = {
          data: effectData,
          node: true,
          persistent: true,
          type: "effect"
        };
        markings.addOne(effectMarking);
        this._preAnalyzeSquares = this._preAnalyzeSquares || [];
        this._preAnalyzeSquares.push(square);
      } catch (e) {
        console.warn("[PreAnalyze] placePreAnalyzeIcon hata:", e);
      }
    }
    // Removes all pre-analyze effect icons placed by placePreAnalyzeIcon.
    clearPreAnalyzeMarkings() {
      try {
        const markings = this.controller.markings;
        (this._preAnalyzeSquares || []).forEach(
          (square) => markings.removeOne("effect|" + square)
        );
        this._preAnalyzeSquares = [];
      } catch (e) {
      }
    }
  };

  // js/src/coach/coaches.js
  var ASHINA_COACHES = {
    // Coach David - default coach; Poland; multi-locale voice; legacy schema (no textId/rive/taglines).
    david: {
      voiceId: "David_coach",
      multiLocale: true,
      id: "377706c2-d0a4-11ee-b135-19f9e53c40f5",
      name: "David",
      titledName: "Coach David",
      analyticsId: "David",
      imageUrl: "https://assets-coaches.chess.com/image/coachdavid.png",
      iconUrl: "https://assets-coaches.chess.com/image/coachdavid-icon.png",
      country: {
        id: 112,
        name: "Poland",
        code: "PL"
      }
    },
    // Coach Mae - Japan; multi-locale voice; legacy schema (no textId/rive/taglines).
    mae: {
      voiceId: "Mae_coach",
      multiLocale: true,
      id: "3779595e-d0a4-11ee-a188-05b5e2276152",
      name: "Mae",
      titledName: "Coach Mae",
      analyticsId: "Mae",
      imageUrl: "https://assets-coaches.chess.com/image/coachmae.png",
      iconUrl: "https://assets-coaches.chess.com/image/coachmae-icon.png",
      country: {
        id: 78,
        name: "Japan",
        code: "JP"
      }
    },
    // Coach Dante - Canada; multi-locale voice; legacy schema (no textId/rive/taglines).
    dante: {
      voiceId: "Dante_coach",
      multiLocale: true,
      id: "37791f20-d0a4-11ee-b634-89fef0259834",
      name: "Dante",
      titledName: "Coach Dante",
      analyticsId: "Dante",
      imageUrl: "https://assets-coaches.chess.com/image/coachdante.png",
      iconUrl: "https://assets-coaches.chess.com/image/coachdante-icon.png",
      country: {
        id: 3,
        name: "Canada",
        code: "CA"
      }
    },
    // Coach Nadia - Turkiye; multi-locale voice; legacy schema (no textId/rive/taglines).
    nadia: {
      voiceId: "Nadia_coach",
      multiLocale: true,
      id: "3778e546-d0a4-11ee-803d-937400864b17",
      name: "Nadia",
      titledName: "Coach Nadia",
      analyticsId: "Nadia",
      imageUrl: "https://assets-coaches.chess.com/image/coachnadia.png",
      iconUrl: "https://assets-coaches.chess.com/image/coachnadia-icon.png",
      country: {
        id: 138,
        name: "T\xFCrkiye",
        code: "TR"
      }
    },
    // Coach Sloane - Australia; multi-locale voice; first entry with textId, Rive animations, and taglines.
    sloane: {
      voiceId: "Sloane_coach",
      multiLocale: true,
      id: "167864ce-ab73-11f0-8bbc-45df3aeaea91",
      textId: "Sloane_coach",
      name: "Sloane",
      titledName: "Coach Sloane",
      analyticsId: "Sloane",
      imageUrl: "https://assets-coaches.chess.com/image/coachsloane.png?v=6c448cfa",
      iconUrl: "https://assets-coaches.chess.com/image/coachsloane-icon.png?v=0a4c5293",
      country: {
        id: 17,
        name: "Australia",
        code: "AU"
      },
      riveAnimationUrl: "https://assets-coaches.chess.com/image/coach_sloane.riv?v=c3e13fe7",
      greetingRiveAnimationUrl: "https://assets-coaches.chess.com/image/coach_sloane_greeting.riv?v=efa3d5ef",
      taglines: [{
        text: "Hey, I\u2019m Sloane. Choose me as your coach and I\u2019ll teach you everything I know.",
        audioUrlHash: "a2b10a8003dcc3ab992476750cc6508f25bbe37c2b8b7482d682ee53af4f0fb7"
      }, {
        text: "My chess vision is up there with the greats. Ready to see what I see?",
        audioUrlHash: "d8d61000b04386e25d1650a47719c7050b62d4674430a67421588f1ce5bff93f"
      }, {
        text: "Want to build confidence while you learn? Pick me.",
        audioUrlHash: "b0f06747b5989f80ee3dda81defcceb4ea856c36ee7ea41200431d1a153238b1"
      }, {
        text: "I\u2019m ready to guide you, move by move. Pick me and let\u2019s learn some chess.",
        audioUrlHash: "04e4e3e1a7b065764d80e8b97b36b8774923bc06cca8de8fb732ce1c62c1b5f3"
      }]
    },
    // Coach Dr. Wolf - England (non-ISO "XE" country code); multi-locale voice; full Rive + taglines.
    drwolf: {
      voiceId: "Drwolf_coach",
      multiLocale: true,
      id: "167107ba-ab73-11f0-a6d9-3d00a545bfed",
      textId: "Drwolf_coach",
      name: "Dr. Wolf",
      titledName: "Coach Dr. Wolf",
      analyticsId: "DrWolf",
      imageUrl: "https://assets-coaches.chess.com/image/coachdrwolf.png?v=0f2770b3",
      iconUrl: "https://assets-coaches.chess.com/image/coachdrwolf-icon.png?v=de69116b",
      country: {
        id: 159,
        name: "England",
        code: "XE"
      },
      riveAnimationUrl: "https://assets-coaches.chess.com/image/coach_drwolf.riv?v=0584b8d3",
      greetingRiveAnimationUrl: "https://assets-coaches.chess.com/image/coach_drwolf_greeting.riv?v=55348ffd",
      taglines: [{
        text: "It would be my honor to guide you through this beautiful game.",
        audioUrlHash: "e674c460472aa128483cdd69f0e007eccdf1a41f34f53e1554875b597da87272"
      }, {
        text: "Under my tutelage, you\u2019ll see the beauty of chess like never before.",
        audioUrlHash: "541d81a406ed9af0d4a4361eea042066f2644cb9c9ff1bd283e70fece4f1bffa"
      }, {
        text: "Chess teaches us about life, and I can teach you about chess.",
        audioUrlHash: "8cd77f2338bb6911e31bd302e1a4ea8526fe496efa2632f68d2bf00c9dee7123"
      }, {
        text: "We\u2019re all students of the game. Though I\u2019d love to be your teacher.",
        audioUrlHash: "425e6a3926c49c7c0669d728b1bbb6e18b9014ccf523ba193eb044d40f418b10"
      }]
    },
    // Coach Magnus - legacy shape: numeric coachId instead of id/textId, no Rive/taglines, no isCelebrity flag; single-locale voice.
    magnus: {
      voiceId: "Magnus_coach",
      multiLocale: false,
      coachId: 49,
      name: "Magnus",
      titledName: "Coach Magnus",
      analyticsId: "Magnus",
      imageUrl: "https://assets-coaches.chess.com/image/coachmagnus.png",
      iconUrl: "https://assets-coaches.chess.com/image/coachmagnus-icon.png",
      country: {
        id: 160,
        name: "Norway",
        code: "NO"
      }
    },
    // Coach Hikaru - legacy shape like magnus (coachId, no Rive/taglines, no isCelebrity flag); single-locale voice.
    hikaru: {
      voiceId: "Hikaru_coach",
      multiLocale: false,
      coachId: 50,
      name: "Hikaru",
      titledName: "Coach Hikaru",
      analyticsId: "Hikaru",
      imageUrl: "https://assets-coaches.chess.com/image/coachhikaru.png",
      iconUrl: "https://assets-coaches.chess.com/image/coachhikaru-icon.png",
      country: {
        id: 228,
        name: "United States",
        code: "US"
      }
    },
    // Coach Levy - celebrity (GothamChess per taglines); single-locale voice; full Rive + taglines.
    levy: {
      voiceId: "Levy_coach",
      multiLocale: false,
      id: "6ddf1ca2-ff6c-11ef-baea-5dc78a000edb",
      textId: "Levy_coach",
      name: "Levy",
      titledName: "Coach Levy",
      analyticsId: "Levy",
      imageUrl: "https://assets-coaches.chess.com/image/coachlevy.png?v=9f98615d",
      iconUrl: "https://assets-coaches.chess.com/image/coachlevy-icon.png?v=19825017",
      country: {
        id: 2,
        name: "United States",
        code: "US"
      },
      isCelebrity: true,
      riveAnimationUrl: "https://assets-coaches.chess.com/image/coach_levy.riv?v=21120709",
      greetingRiveAnimationUrl: "https://assets-coaches.chess.com/image/coach_levy_greeting.riv?v=38752839",
      taglines: [{
        text: "GothamChess here! I\u2019m the internet\u2019s chess teacher, who else could you possibly pick?",
        audioUrlHash: "b36a35b100e1ad842020b45f1bbcac3421b83588423e578ad1e2ffa245d259dd"
      }, {
        text: "Choose me as your coach and I\u2019ll make you a better chess player!",
        audioUrlHash: "f0ee85ebd9cded2c4c233a4b33d0f40261987f035a4d9820f9b36a66a27e95a8"
      }, {
        text: "I\u2019m just a chill guy who can improve your chess game. Pick me!",
        audioUrlHash: "14cd9bf73b06b4a5d46d703de37a0adcda2c93ff3f2e83cd9e0cd0bee7e3ca1b"
      }, {
        text: "Levy Rozman reporting for duty. I\u2019m the best possible choice here, no clickbait.",
        audioUrlHash: "364aa165570aa0cbe4be362d0dea2c5aeb5611d0453679186f733899d36ba5d7"
      }]
    },
    // Coach Anna - Sweden; celebrity (popular chess YouTuber per taglines); full Rive + taglines.
    anna: {
      voiceId: "Anna_coach",
      multiLocale: false,
      id: "4fdf1a48-7917-11f0-83ed-d56e6dd5307c",
      textId: "Anna_coach",
      name: "Anna",
      titledName: "Coach Anna",
      analyticsId: "Anna",
      imageUrl: "https://assets-coaches.chess.com/image/coachanna.png?v=745c4e84",
      iconUrl: "https://assets-coaches.chess.com/image/coachanna-icon.png?v=ac97bcaa",
      country: {
        id: 132,
        name: "Sweden",
        code: "SE"
      },
      isCelebrity: true,
      riveAnimationUrl: "https://assets-coaches.chess.com/image/coach_anna.riv?v=4390de55",
      greetingRiveAnimationUrl: "https://assets-coaches.chess.com/image/coach_anna_greeting.riv?v=12d9fd31",
      taglines: [{
        text: "Hello from Sweden! Want to learn from one of the most popular chess YouTubers?",
        audioUrlHash: "37eb03999bac8f1688f4fd407acbbf74dc31d025b0a2e120ee76867064e11d1a"
      }, {
        text: "I\u2019m Anna, and I\u2019m here to make learning fun and easy.",
        audioUrlHash: "0178691a89ba37649fe2a13b0883b3a6d65fc6217fbe48acb4807db0558ba3d6"
      }, {
        text: "Let\u2019s have some fun learning chess together. What do you say?",
        audioUrlHash: "6f6898a63e6c7376a8d583687d6aa8a4c1dc7942f880c9bbdcf09bdbe7211d09"
      }, {
        text: "I love chess! Let me teach you how to play the best game in the world.",
        audioUrlHash: "0afcf003a459ce263ec41acc868eba1a19786581ec5fb03bad07fc66e2840880"
      }]
    },
    // Coach Judit - Hungary; celebrity; Rive fields present but empty strings (no animation assets).
    judit: {
      voiceId: "Judit_coach",
      multiLocale: false,
      id: "c4106a5e-337d-11f1-b0fb-c9f8e5a66472",
      textId: "Judit_coach",
      name: "Judit",
      titledName: "Coach Judit",
      analyticsId: "Judit",
      imageUrl: "https://assets-coaches.chess.com/image/coachjudit.png?v=4e581e71",
      iconUrl: "https://assets-coaches.chess.com/image/coachjudit-icon.png?v=0fce7644",
      country: {
        id: 67,
        name: "Hungary",
        code: "HU"
      },
      isCelebrity: true,
      riveAnimationUrl: "",
      greetingRiveAnimationUrl: "",
      taglines: [{
        text: "Chess has given me skills I use every single day. I\u2019d love to share what I\u2019ve learned.",
        audioUrlHash: "b3967aeea4041b00be777b540ac6789b88e2b15d30fbae7838fc1ea10509316e"
      }, {
        text: "Practice, perseverance, and passion. That\u2019s what chess taught me.",
        audioUrlHash: "072c05de5ff714b043ed96847c5fa95cc2ab7bf0fded278d7790ea1874d9ed5c"
      }, {
        text: "Ready to learn from the highest rated woman of all time?",
        audioUrlHash: "ded08d20246458ca53119b6d0c7342cb0cc59a7644c13e9da29c962014741cef"
      }, {
        text: "I was once the youngest grandmaster in chess history. Let me help you learn chess.",
        audioUrlHash: "2cb706410a580e8952dae5eb3523875542ccfdaf8ba2408085ccc2a652281ad0"
      }]
    },
    // Coach Vishy - India; celebrity; voiceId/textId say "Anand" while display name is "Vishy"; empty Rive URLs.
    vishy: {
      voiceId: "Anand_coach",
      multiLocale: false,
      id: "d62b1920-a0f1-11ef-ba68-b103c62ed2bc",
      textId: "Anand_coach",
      name: "Vishy",
      titledName: "Coach Vishy",
      analyticsId: "Vishy",
      imageUrl: "https://assets-coaches.chess.com/image/coachvishy.png?v=ea3d532d",
      iconUrl: "https://assets-coaches.chess.com/image/coachvishy-icon.png?v=9c622a35",
      country: {
        id: 69,
        name: "India",
        code: "IN"
      },
      isCelebrity: true,
      riveAnimationUrl: "",
      greetingRiveAnimationUrl: "",
      taglines: [{
        text: "I am Vishy Anand, the 5-time World Champion. Nice to meet you.",
        audioUrlHash: "d2689d438642593a08f47fd4835d930f6df87bcd57e0ad3415ceeb239dd48ec1"
      }, {
        text: "Pick me to take your game to the next level.",
        audioUrlHash: "e26c17c481882a068753bff37b7a5d4dde7854350e550aa9a3ac8bcf89be3afe"
      }, {
        text: "Let me help you get better at this lovely game! Take it from a World Champion.",
        audioUrlHash: "cf32d8ee814e63f65740039ca2d010e679865687b2667649b135f3f518cfedbc"
      }, {
        text: "Vishy Anand, naam to suna hi hoga.",
        audioUrlHash: "568bc7ee87aab52a130827498d9fe70e7be009329169ac62ff3dc621cbf752ea"
      }]
    },
    // Coach Botez - the Botez Sisters (analyticsId differs from entry name); full Rive + taglines.
    botez: {
      voiceId: "Botez_coach",
      multiLocale: false,
      id: "d62a2aba-a0f1-11ef-a2f0-9118eb9f958d",
      textId: "Botez_coach",
      name: "Botez",
      titledName: "Coach Botez",
      analyticsId: "Botez Sisters",
      imageUrl: "https://assets-coaches.chess.com/image/coachbotezsisters.png?v=794138d4",
      iconUrl: "https://assets-coaches.chess.com/image/coachbotezsisters-icon.png?v=8824e754",
      country: {
        id: 2,
        name: "United States",
        code: "US"
      },
      isCelebrity: true,
      riveAnimationUrl: "https://assets-coaches.chess.com/image/coach_botez.riv?v=ce5847dc",
      greetingRiveAnimationUrl: "https://assets-coaches.chess.com/image/coach_botez_greeting.riv?v=1c071485",
      taglines: [{
        text: "Recognize us from YouTube? We\u2019ll make you a better chess player!",
        audioUrlHash: "26d978719bebb2b2c0dd6c558932ce76b77aef5d5e700e8262c57a9ca28fc5a1"
      }, {
        text: "Double trouble! We can help you achieve chess glory.",
        audioUrlHash: "d9dbca669e1ecf98fdd9ca5e48c2fad9bbe44c19871d3393c0942086a571e83c"
      }, {
        text: "Want TWO chess coaches instead of one? We\u2019re the right choice.",
        audioUrlHash: "17f6652dcb38d254525c8e787589cbc1a927fb083353d954e56b32bf8854a83a"
      }, {
        text: "Alexandra and Andrea here! You\u2019d be a FOOL not to pick us!",
        audioUrlHash: "0e9bbd8c90284fce7385adf07a745c340b29d88434f6feecc73b30bc3dd35446"
      }]
    },
    // Coach Ben - US celebrity GM; empty Rive URLs.
    ben: {
      voiceId: "Ben_coach",
      multiLocale: false,
      id: "6dde8ddc-ff6c-11ef-a8d2-d5eb2eeec084",
      textId: "Ben_coach",
      name: "Ben",
      titledName: "Coach Ben",
      analyticsId: "Ben",
      imageUrl: "https://assets-coaches.chess.com/image/coachben.png?v=80369bf7",
      iconUrl: "https://assets-coaches.chess.com/image/coachben-icon.png?v=b27b2f23",
      country: {
        id: 2,
        name: "United States",
        code: "US"
      },
      isCelebrity: true,
      riveAnimationUrl: "",
      greetingRiveAnimationUrl: "",
      taglines: [{
        text: "Hey, it\u2019s Ben. You can pick me if you want, but I\u2019ll probably make fun of your blunders.",
        audioUrlHash: "f97764e9163395c49e103ebc2366ddfacfa8ae12bf56428697789e02701fdb9f"
      }, {
        text: "If you pick me, you may learn a thing or two. I am a grandmaster after all.",
        audioUrlHash: "061e36df97a1e330252c842168034958803803af2173402815622e20e8c83903"
      }, {
        text: "Trust me, you\u2019ll want me as your coach. The horsey goes diagonally, right?",
        audioUrlHash: "b4f71b3595e0ec9c992edd91c1b4a1a0a75baf08dcfbdaaab12ff3b0ef994391"
      }, {
        text: "You\u2019re thinking about picking me? Think twice, bucko.",
        audioUrlHash: "03cf87a5f7572b20ffd3661e8064a0f599595ab48b1924cf9290f1a74d4a04ae"
      }]
    },
    // Coach Canty - US celebrity (chessboxing world champ per taglines); empty Rive URLs.
    canty: {
      voiceId: "Canty_coach",
      multiLocale: false,
      id: "d62b98a0-a0f1-11ef-bf0b-b5dcb6c5161b",
      textId: "Canty_coach",
      name: "Canty",
      titledName: "Coach Canty",
      analyticsId: "Canty",
      imageUrl: "https://assets-coaches.chess.com/image/coachcanty.png?v=fe8bc7a2",
      iconUrl: "https://assets-coaches.chess.com/image/coachcanty-icon.png?v=20e7d9f0",
      country: {
        id: 2,
        name: "United States",
        code: "US"
      },
      isCelebrity: true,
      riveAnimationUrl: "",
      greetingRiveAnimationUrl: "",
      taglines: [{
        text: "Want to spar with a chessboxing world champ? I\u2019m your man.",
        audioUrlHash: "7f8c5e1531f95ff5222d02b21976659615f8fc8abd6c223483865572efb3e6f5"
      }, {
        text: "I\u2019m a titled chess player, popular streamer, and your next chess coach.",
        audioUrlHash: "61844de18c921a7c198bed711030fd991216117cc91a7db83bc987625ed5c8a2"
      }, {
        text: "BOOM! I got you with all the tips and tricks if you pick me as your coach.",
        audioUrlHash: "59a408724ab3d6732020bd5defeb94ab9005ef76d0bd0786fe04a17df7b3e8fe"
      }, {
        text: "If you pick me as your coach I\u2019ll teach you all the tactinos and gambinos that make a great player.",
        audioUrlHash: "a8d7874d422ebb0492130a3718536111ec2aee2ff61efc53cc7cc8e9c412ae66"
      }]
    },
    // Coach Ruben - Cuba; empty Rive URLs; no isCelebrity flag despite persona taglines.
    ruben: {
      voiceId: "Ruben_coach",
      multiLocale: false,
      id: "167962e8-ab73-11f0-8281-4de448a78c1a",
      textId: "Ruben_coach",
      name: "Ruben",
      titledName: "Coach Ruben",
      analyticsId: "Ruben",
      imageUrl: "https://assets-coaches.chess.com/image/coachruben.png?v=a50e65f4",
      iconUrl: "https://assets-coaches.chess.com/image/coachruben-icon.png?v=87a78d9c",
      country: {
        id: 37,
        name: "Cuba",
        code: "CU"
      },
      riveAnimationUrl: "",
      greetingRiveAnimationUrl: "",
      taglines: [{
        text: "Want to learn chess from a park hustler? Choose me.",
        audioUrlHash: "f20c93c8dd6fc31bf8d2e2ffcbedde47c407752671d2885ab28b1a8bbde07fc8"
      }, {
        text: "Stick with me, and I\u2019ll teach you a thing or two about chess and trash talking.",
        audioUrlHash: "8e2078128996e7754bfac61e72a25fba9b0f193e38d9e25c060585fd491fbfd0"
      }, {
        text: "Ready for some expert coaching? Let\u2019s do it.",
        audioUrlHash: "5015d396ed4354ce9e0811973b0499e66fa87c64f233081010b0a4ddd218a766"
      }, {
        text: "Choose me, and watch your chess rating skyrocket! It\u2019s simple.",
        audioUrlHash: "1411caad304cb3407918f0e3239a26d2db27d1faa1dba1b49d4799afb213d253"
      }]
    },
    // Coach Calvin - US; empty Rive URLs; no isCelebrity flag.
    calvin: {
      voiceId: "Calvin_coach",
      multiLocale: false,
      id: "1678e624-ab73-11f0-9644-6fc23344afd8",
      textId: "Calvin_coach",
      name: "Calvin",
      titledName: "Coach Calvin",
      analyticsId: "Calvin",
      imageUrl: "https://assets-coaches.chess.com/image/coachcalvin.png?v=2fa90df5",
      iconUrl: "https://assets-coaches.chess.com/image/coachcalvin-icon.png?v=730ed413",
      country: {
        id: 2,
        name: "United States",
        code: "US"
      },
      riveAnimationUrl: "",
      greetingRiveAnimationUrl: "",
      taglines: [{
        text: "You need an expert chess coach? Say no more.",
        audioUrlHash: "7ce3682d495ecec0536dc32f6445a6814a527d369d3872c78f7b37aa858e9731"
      }, {
        text: "I\u2019m the best chess player in my school. Ready to learn?",
        audioUrlHash: "fcb3f2e9e3f1fc2ce88b39f965088f9cfe3451da888788ecd1de162da5463fcd"
      }, {
        text: "I\u2019m the coach you want in your corner. Let\u2019s do this.",
        audioUrlHash: "0a14582301c14e9b7b56a0fb20cfce290bb21e43f5719ffdd4447db567799a23"
      }, {
        text: "Are we standing around or are we playing chess? C\u2019mon!",
        audioUrlHash: "c7d519fde47bc45b1bb9425d18bc6e581cbe7419805c3a0766d2b5c446589a47"
      }]
    },
    // Coach Tania - India; celebrity (commentator, Olympiad gold per taglines); empty Rive URLs.
    tania: {
      voiceId: "Tania_coach",
      multiLocale: false,
      id: "d62aa12a-a0f1-11ef-8c86-0b794ad057db",
      textId: "Tania_coach",
      name: "Tania",
      titledName: "Coach Tania",
      analyticsId: "Tania",
      imageUrl: "https://assets-coaches.chess.com/image/coachtania.png?v=dc1e4f9f",
      iconUrl: "https://assets-coaches.chess.com/image/coachtania-icon.png?v=271636b6",
      country: {
        id: 69,
        name: "India",
        code: "IN"
      },
      isCelebrity: true,
      riveAnimationUrl: "",
      greetingRiveAnimationUrl: "",
      taglines: [{
        text: "I\u2019ve commentated on the best in the world. Now I\u2019m here to help you play like them!",
        audioUrlHash: "91581b8ddbb50042a22d52e8702d8f3c9060c545fd20b413069c631f3114c63c"
      }, {
        text: "Want to learn chess from an Olympiad gold medalist? Pick me.",
        audioUrlHash: "92388d370eeec75aef641267e8ecc78499c4749b233dd7b52c2824b468407b21"
      }, {
        text: "Coach Tania here! I can help you become a better chess player!",
        audioUrlHash: "381a903056cac3a440df8780ca6ec4e726a5b591a8e90d42d7f37ad0eaefcc8f"
      }, {
        text: "It\u2019s Tania. You\u2019re going to want to be my student. Trust me!",
        audioUrlHash: "57cdbda82e9abe2fd695621285d67c9a7b7ab76083663f0d449c55cbd3aa4c54"
      }]
    },
    // Coach Danny - US celebrity (Chess.com Chief Chess Officer per taglines); empty Rive URLs.
    danny: {
      voiceId: "Danny_coach",
      multiLocale: false,
      id: "6dd9d7b0-ff6c-11ef-9341-ff6621b6b8b5",
      textId: "Danny_coach",
      name: "Danny",
      titledName: "Coach Danny",
      analyticsId: "Danny",
      imageUrl: "https://assets-coaches.chess.com/image/coachdanny.png?v=7fd13701",
      iconUrl: "https://assets-coaches.chess.com/image/coachdanny-icon.png?v=2fc4419f",
      country: {
        id: 2,
        name: "United States",
        code: "US"
      },
      isCelebrity: true,
      riveAnimationUrl: "",
      greetingRiveAnimationUrl: "",
      taglines: [{
        text: "Want to learn from Chess.com\u2019s Chief Chess Officer?",
        audioUrlHash: "331029009912d371cbaee9aad487a2402e3cc9ea6e08135946c66a489ad35a84"
      }, {
        text: "Have no fear, Coach Danny is here! I\u2019ll teach you everything you need to know.",
        audioUrlHash: "dabbc9e92028d617bce30a421c8fd8a14742794ac98d255a9632e37c58829016"
      }, {
        text: "Nice job finding my avatar, now click the big green button. You\u2019re so close. You can do this.",
        audioUrlHash: "7cfa01dff35858df653ae1dcc00a0cf6916affeda8eb6b7d111cfd83483c53e9"
      }, {
        text: "Improve your game with tips from me, a world-class chess commentator.",
        audioUrlHash: "e1f1f1e5bf7c885c922f5af5c883e33510ae4d18951c7c06b68491b27a38c7f9"
      }]
    }
  };

  // js/src/coach/coach-audio.js
  var LOCALE_TO_LANG = {
    "en-US": "en_US",
    "fr-FR": "fr_FR",
    "es-ES": "es_ES",
    "de-DE": "de_DE",
    "it-IT": "it_IT",
    "pt-PT": "pt_PT",
    "tr-TR": "tr_TR",
    "ru-RU": "ru_RU",
    "ar-SA": "ar_SA",
    "pl-PL": "pl_PL",
    "ko-KR": "ko_KR",
    "id-ID": "id_ID"
  };
  function buildAudioBase(coach, locale) {
    return "https://text-and-audio.chess.com/prod/released/" + coach.voiceId + "/" + locale + "/";
  }
  function buildCoachCmd(coach, locale) {
    const coachId = coach.id ?? coach.coachId ?? null;
    const textId = coach.textId || "Generic_coach";
    const coachAsset = {
      id: coachId,
      name: coach.name,
      titledName: coach.titledName,
      voiceId: coach.voiceId,
      locale: "en-US",
      textId,
      analyticsId: coach.analyticsId,
      imageUrl: coach.imageUrl,
      iconUrl: coach.iconUrl,
      country: coach.country,
      taglines: coach.taglines || [],
      i18nMeta: {
        languageIndicator: ""
      },
      riveAnimationUrl: coach.riveAnimationUrl || "",
      greetingRiveAnimationUrl: coach.greetingRiveAnimationUrl || ""
    };
    const coachJson = JSON.stringify(coachAsset);
    return "load-and-set-coach-asset text_id " + textId + " locale " + locale + ' json {"currentCoach":' + coachJson + "}";
  }

  // js/src/engine/eval-engine.js
  var EvalEngine = class {
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
        console.warn("[EvalEngine] meta bulunamad\u0131");
        return;
      }
      const stockfishUrl = meta.dataset.stockfish || "";
      const stockfishWasmUrl = meta.dataset.stockfishWasm || "";
      if (!stockfishUrl) {
        console.warn("[EvalEngine] Stockfish URL yok");
        return;
      }
      this._wasmURL = stockfishWasmUrl;
      fetch(stockfishUrl).then((response) => response.blob()).then((blob) => {
        this._blobURL = URL.createObjectURL(blob);
        this._startWorker();
      }).catch((error) => console.error("[EvalEngine] fetch stockfish.js failed:", error));
    }
    _startWorker() {
      try {
        this.worker = new Worker(this._blobURL + "#" + encodeURIComponent(this._wasmURL));
      } catch (error) {
        console.error("[EvalEngine] Worker olu\u015Fturulamad\u0131:", error);
        return;
      }
      this.worker.onmessage = (event) => {
        const line = typeof event.data === "string" ? event.data : String(event.data ?? "");
        this._onMessage(line);
      };
      this.worker.onerror = (error) => {
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
      } catch (e) {
      }
      try {
        this.worker?.terminate();
      } catch (e) {
      }
      this.worker = null;
      this._ready = false;
      this._searching = false;
    }
  };

  // js/src/engine/coach-engine.js
  var CoachEngine = class {
    constructor() {
      this.worker = null;
      this._blobURL = null;
      this._ready = false;
      this._pendingResolve = null;
      this._pendingTimeout = null;
      this._coachCmd = null;
      const meta = document.getElementById("__asina-engine-urls");
      if (!meta) {
        console.warn("[CoachEngine] meta bulunamad\u0131");
        return;
      }
      const torchUrl = meta.dataset.torch || "";
      const torchWasmUrl = meta.dataset.torchWasm || "";
      if (!torchUrl) {
        console.warn("[CoachEngine] torch URL yok");
        return;
      }
      const wasmParam = torchWasmUrl ? encodeURIComponent(torchWasmUrl) : "";
      fetch(torchUrl).then((response) => response.blob()).then((blob) => {
        this._blobURL = URL.createObjectURL(blob) + (wasmParam ? "#" + wasmParam : "");
        this._startWorker();
      }).catch((error) => console.error("[CoachEngine] fetch torch.js failed:", error));
    }
    _startWorker() {
      try {
        this.worker = new Worker(this._blobURL);
      } catch (error) {
        console.error("[CoachEngine] Worker olu\u015Fturulamad\u0131:", error);
        return;
      }
      this.worker.onmessage = (event) => this._onMessage(typeof event.data === "string" ? event.data : String(event.data ?? ""));
      this.worker.onerror = (error) => {
        console.warn("[CoachEngine] Worker error \u2014 restartWorker() tetikleniyor");
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
        console.error("[CoachEngine] Torch WASM crash \u2014 restartWorker()");
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
        console.warn("[CoachEngine] JSON parse hatas\u0131:", error);
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
        audioUrlHash,
        whiteAccuracy: analysis.CAPS?.white?.all ?? null,
        blackAccuracy: analysis.CAPS?.black?.all ?? null,
        whiteElo: analysis.reportCard?.white?.effectiveElo ?? null,
        blackElo: analysis.reportCard?.black?.effectiveElo ?? null,
        tallies: analysis.tallies || null,
        openingName: analysis.book?.name || null,
        arc: analysis.arc || null,
        pv: lastPosition.evals?.[0]?.pv || [],
        cpHistory: positions.map((position) => position.evals?.[0]?.cp ?? null)
      });
    }
    _setup() {
      const send = (cmd) => this.worker?.postMessage(cmd);
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
      return new Promise((resolve) => {
        if (!this.worker || !this._ready) {
          console.warn("[CoachEngine] Worker haz\u0131r de\u011Fil");
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
            console.warn("[CoachEngine] Timeout \u2014 analiz gelmedi");
            this._pendingResolve = null;
            resolve(null);
          }
        }, 12e3);
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
      } catch (e) {
      }
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
      } catch (e) {
      }
      this.worker = null;
    }
  };

  // js/src/engine/pre-coach-engine.js
  var PreCoachEngine = class {
    constructor() {
      this.worker = null;
      this._blobURL = null;
      this._ready = false;
      this._pendingResolve = null;
      this._pendingTimeout = null;
      const meta = document.getElementById("__asina-engine-urls");
      if (!meta) {
        console.warn("[PreCoach] meta bulunamad\u0131");
        return;
      }
      const torchUrl = meta.dataset.torch || "";
      const torchWasmUrl = meta.dataset.torchWasm || "";
      if (!torchUrl) {
        console.warn("[PreCoach] torch URL yok");
        return;
      }
      const wasmParam = torchWasmUrl ? encodeURIComponent(torchWasmUrl) : "";
      fetch(torchUrl).then((response) => response.blob()).then((blob) => {
        this._blobURL = URL.createObjectURL(blob) + (wasmParam ? "#" + wasmParam : "");
        this._startWorker();
      }).catch((error) => console.error("[PreCoach] fetch torch.js failed:", error));
    }
    _startWorker() {
      try {
        this.worker = new Worker(this._blobURL);
      } catch (error) {
        console.error("[PreCoach] Worker olu\u015Fturulamad\u0131:", error);
        return;
      }
      this.worker.onmessage = (event) => this._onMessage(typeof event.data === "string" ? event.data : String(event.data ?? ""));
      this.worker.onerror = (error) => {
        console.warn("[PreCoach] Worker error \u2014 restartWorker() tetikleniyor");
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
        console.error("[PreCoach] Torch WASM crash \u2014 restartWorker()");
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
        console.warn("[PreCoach] JSON parse hatas\u0131:", error);
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
      const send = (cmd) => this.worker?.postMessage(cmd);
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
      return new Promise((resolve) => {
        if (!this.worker || !this._ready) {
          console.warn("[PreCoach] Worker haz\u0131r de\u011Fil");
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
            console.warn("[PreCoach] Timeout \u2014 analiz gelmedi");
            this._pendingResolve = null;
            resolve(null);
          }
        }, 12e3);
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
      } catch (e) {
      }
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
      } catch (e) {
      }
      this.worker = null;
    }
  };

  // js/src/engine/maia-engine.js
  var MaiaEngine = class {
    constructor() {
      this.worker = null;
      this._ready = false;
      this._pendingMap = /* @__PURE__ */ new Map();
      this._idCounter = 0;
      this._allMovesReversed = null;
      this._inFlight = false;
      this._init();
    }
    async _init() {
      const meta = document.getElementById("__asina-engine-urls");
      if (!meta) {
        console.error("[MaiaEngine] _init \u2014 __asina-engine-urls meta tag bulunamad\u0131! loader.js do\u011Fru \xE7al\u0131\u015Fm\u0131yor olabilir.");
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
          console.warn("[MaiaEngine] _init \u2014 all_moves_reversed entry say\u0131s\u0131 beklenenden farkl\u0131! (" + entryCount + " !== 4352)");
        }
      } catch (error) {
        console.error("[MaiaEngine] _init \u2014 all_moves_reversed.json y\xFCklenemedi:", error);
      }
      const workerUrl = meta.dataset.maia3Worker;
      if (!workerUrl) {
        console.error("[MaiaEngine] _init \u2014 maia3Worker URL bo\u015F! manifest.json web_accessible_resources kontrol et.");
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
        console.error("[MaiaEngine] _init \u2014 Worker olu\u015Fturulamad\u0131:", error);
        return;
      }
      this.worker.onmessage = (event) => this._onMessage(event.data);
      this.worker.onerror = (error) => console.error("[MaiaEngine] Worker onerror:", error.message, error);
      let ortRuntimeUrl = meta.dataset.maia3OrtRuntime;
      try {
        const ortResponse = await fetch(meta.dataset.maia3OrtRuntime);
        if (!ortResponse.ok) {
          throw new Error("ORT fetch HTTP " + ortResponse.status);
        }
        const ortBlob = await ortResponse.blob();
        ortRuntimeUrl = URL.createObjectURL(ortBlob);
      } catch (error) {
        console.error("[MaiaEngine] _init \u2014 ORT blob URL olu\u015Fturulamad\u0131:", error);
      }
      const initMsg = {
        type: "init",
        modelUrl: meta.dataset.maia3Model,
        ortBaseUrl: meta.dataset.maia3OrtBase,
        ortRuntimeUrl
      };
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
        } else if (msg.status === "loading") {
        }
        return;
      }
      if (msg.type === "inference-result") {
        const pending = this._pendingMap.get(msg.id);
        if (!pending) {
          console.warn("[MaiaEngine] _onMessage \u2014 inference-result i\xE7in pending bulunamad\u0131, id:", msg.id, "(timeout olmu\u015F olabilir)");
          return;
        }
        clearTimeout(pending.timeoutHandle);
        this._pendingMap.delete(msg.id);
        const logits = new Float32Array(msg.logitsMove);
        if (logits.length !== 4352) {
          console.warn("[MaiaEngine] _onMessage \u2014 logits boyutu beklenenden farkl\u0131! (" + logits.length + " !== 4352)");
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
          console.warn("[MaiaEngine] _onMessage \u2014 legal mask e\u015Fle\u015Fmesi yok, raw argmax kullan\u0131l\u0131yor");
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
          console.warn("[MaiaEngine] _onMessage \u2014 bestMove null! all_moves_reversed'de index yok:", bestIndex);
        }
        this._inFlight = false;
        pending.resolve(bestMove);
        return;
      }
      if (msg.type === "error") {
        console.error("[MaiaEngine] _onMessage \u2014 worker hata bildirdi:", msg);
        const pending = this._pendingMap.get(msg.id);
        if (pending) {
          clearTimeout(pending.timeoutHandle);
          this._pendingMap.delete(msg.id);
          this._inFlight = false;
          pending.resolve(null);
        }
        return;
      }
      console.warn("[MaiaEngine] _onMessage \u2014 bilinmeyen mesaj tipi:", msg.type, msg);
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
        rows = rows.map((row) => row.split("").map((ch) => {
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
          if (pieceIndex !== void 0) {
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
      const mirrorSquare = (square) => square[0] + String(9 - parseInt(square[1]));
      return mirrorSquare(uciMove.slice(0, 2)) + mirrorSquare(uciMove.slice(2, 4)) + uciMove.slice(4);
    }
    getBestMove(fen, selfElo = 1500, opponentElo = 1500, legalUciSet = null) {
      return new Promise((resolve) => {
        if (!this._ready || !this.worker) {
          const state = {
            ready: this._ready,
            workerExists: !!this.worker
          };
          console.warn("[MaiaEngine] getBestMove \u2014 engine haz\u0131r de\u011Fil.", state);
          resolve(null);
          return;
        }
        if (this._inFlight) {
          console.warn("[MaiaEngine] getBestMove \u2014 \xF6nceki inference devam ediyor, istek atland\u0131.");
          resolve(null);
          return;
        }
        this._inFlight = true;
        const id = ++this._idCounter;
        const isBlack = (fen.split(" ")[1] || "w") === "b";
        const tokens = this._fenToTokens(fen);
        const timeoutHandle = setTimeout(() => {
          console.error("[MaiaEngine] getBestMove \u2014 TIMEOUT! id:" + id + " 10sn i\xE7inde cevap gelmedi. Worker tak\u0131l\u0131 olabilir.");
          this._pendingMap.delete(id);
          this._inFlight = false;
          resolve(null);
        }, 1e4);
        const pending = {
          resolve,
          timeoutHandle,
          isBlack,
          legalUciSet
        };
        this._pendingMap.set(id, pending);
        this.worker.postMessage({
          type: "inference",
          id,
          tokens: Array.from(tokens),
          eloSelfs: [selfElo],
          eloOppos: [opponentElo],
          batchSize: 1
        });
      });
    }
    hardStop() {
      this._pendingMap.forEach((pending) => {
        clearTimeout(pending.timeoutHandle);
        pending.resolve(null);
      });
      this._pendingMap.clear();
      this._inFlight = false;
      try {
        this.worker?.terminate();
      } catch (e) {
      }
      this.worker = null;
      this._ready = false;
      window.dispatchEvent(new CustomEvent("AsinaEngineStatus", {
        detail: {
          connected: false
        }
      }));
    }
  };

  // js/src/engine/stockfish-engine.js
  var top_pv_moves = [];
  var StockfishEngine = class {
    // Boot the configured engine backend. `master` is the BetterMint instance
    // (shared game/controller access). Komodo/Torch run as blob Workers, Maia is
    // delegated to its own engine class (always "ready"), and "websocket" speaks
    // UCI over a remote WebSocket. Most fields are per-game state reset in
    // MoveAndGo; the UCI option block mirrors the extension's settings panel.
    constructor(master) {
      this.BetterMintmaster = master;
      this.loaded = false;
      this.stopInFlight = false;
      this.ready = false;
      this.isEvaluating = false;
      this.isRequestedStop = false;
      this.isGameStarted = false;
      this.readyCallbacks = [];
      this.goDoneCallbacks = [];
      this.topMoves = [];
      this.lastTopMoves = [];
      this.moveCounter = 0;
      this.isPreMoveSequence = false;
      this.hasShownLimitMessage = false;
      this.isInTheory = false;
      this.lastMoveScore = null;
      this.autoMoveTimer = null;
      this.ultrabulletMoveTimer = null;
      this._flagProfileActive = false;
      this.simulateMateActive = false;
      this.lastOpponentMoves = [];
      this.opponentLastMoveScore = null;
      this.blunderReactEvalDisabled = false;
      this.lastStockfishCp = null;
      this.lastStockfishFen = null;
      this.preOpponentStockfishCp = null;
      this.lastBoardFEN = null;
      this.preOpponentFEN = null;
      this.premoveEnabled = false;
      this.pendingPremove = null;
      this.lastPonder = null;
      this._lefongTrapPending = null;
      this.premoveStreak = 0;
      this.pendingAutoPremove = false;
      this.pendingAutoPremoveMates = false;
      this.lastMoveGaveCheck = false;
      this.openingMovePlayed = false;
      this._preAnalyzeRunning = false;
      this._preAnalyzeFen = null;
      this.depth = getValueConfig(enumOptions.Depth);
      this.options = {
        MultiPV: getValueConfig(enumOptions.MultiPV),
        Hash: getValueConfig(enumOptions.DragonHash),
        "UCI Elo": getValueConfig(enumOptions.DragonUciElo),
        Personality: getValueConfig(enumOptions.DragonPersonality),
        "UCI LimitStrength": getValueConfig(enumOptions.DragonLimitStrength),
        "Auto Skill": getValueConfig(enumOptions.DragonAutoSkill),
        OwnBook: getValueConfig(enumOptions.DragonOwnBook),
        UCI_Chess960: getValueConfig(enumOptions.DragonChess960),
        "Best Book Line": getValueConfig(enumOptions.DragonBestBookLine),
        "Book Moves": getValueConfig(enumOptions.DragonLimitBookMoves) ? parseInt(getValueConfig(enumOptions.DragonBookMoves)) === 11 ? 1e3 : parseInt(getValueConfig(enumOptions.DragonBookMoves)) || 5 : 1e3
      };
      this.engineType = "komodo";
      const engineSource = getValueConfig(enumOptions.EngineSource) || "komodo";
      if (engineSource === "komodo") {
        this.engineType = "komodo";
        this.initializeWorker(
          document.getElementById("__asina-engine-urls").dataset.komodo
        );
      } else if (engineSource === "torch") {
        this.engineType = "torch";
        this.initializeWorker(
          document.getElementById("__asina-engine-urls").dataset.torch
        );
      } else if (engineSource === "maia") {
        this.engineType = "maia";
        this.ready = true;
        this.loaded = true;
        this.BetterMintmaster.onEngineLoaded();
        window.dispatchEvent(
          new CustomEvent("AsinaEngineStatus", {
            detail: {
              connected: true
            }
          })
        );
      } else {
        this.engineType = "websocket";
        this.initializeWebSocket(getValueConfig(enumOptions.UrlApiStockfish));
      }
      this.reconnectDelay = 500;
      this.maxReconnectDelay = 3e3;
      this.reconnectAttempts = 5;
    }
    // Load the engine as a Web Worker. The script is fetched and instantiated
    // from a blob URL (avoids cross-origin worker restrictions); the wasm and
    // book paths are appended after "#", which stockfish.js-style workers parse
    // out of location.hash at startup. The handshake ("uci" → uciok/readyok)
    // starts immediately; options and the current position follow once ready.
    initializeWorker(workerUrl) {
      const meta = document.getElementById("__asina-engine-urls");
      let wasmUrl = "";
      let bookUrl = "";
      if (meta) {
        if (workerUrl.includes("komodo")) {
          wasmUrl = meta.dataset.komodoWasm || "";
        } else if (workerUrl.includes("torch")) {
          wasmUrl = meta.dataset.torchWasm || "";
        }
        bookUrl = meta.dataset.book || "";
      }
      fetch(workerUrl).then((response) => response.blob()).then((blob) => {
        const encodedParams = wasmUrl ? encodeURIComponent(wasmUrl + (bookUrl ? "|" + bookUrl : "")) : "";
        const workerBlobUrl = URL.createObjectURL(blob) + (encodedParams ? "#" + encodedParams : "");
        try {
          this.stockfish = new Worker(workerBlobUrl);
          this.stockfish.onmessage = (event) => {
            const line = typeof event === "string" ? event : event.data ?? "";
            this.ProcessMessage(line);
          };
          this.stockfish.onerror = (event) => {
            console.error("Worker error:", event);
            window.dispatchEvent(
              new CustomEvent("AsinaEngineStatus", {
                detail: {
                  connected: false
                }
              })
            );
          };
          this.ready = true;
          window.dispatchEvent(
            new CustomEvent("AsinaEngineStatus", {
              detail: {
                connected: true
              }
            })
          );
          this.send("uci");
          this.onReady(() => {
            this.UpdateOptions();
            this.send("ucinewgame");
            setTimeout(() => {
              try {
                const fen = this.BetterMintmaster.game.controller.getFEN();
                if (fen) {
                  this.UpdatePosition(fen, false);
                }
              } catch (error) {
              }
            }, 500);
          });
        } catch (error) {
          console.error("Failed to construct Worker from blob:", error);
          window.dispatchEvent(
            new CustomEvent("AsinaEngineStatus", {
              detail: {
                connected: false
              }
            })
          );
          throw error;
        }
      }).catch((error) => {
        console.error("Failed to fetch worker script:", error);
        window.dispatchEvent(
          new CustomEvent("AsinaEngineStatus", {
            detail: {
              connected: false
            }
          })
        );
      });
    }
    // Alternative backend: a remote UCI server over WebSocket. Same handshake as
    // the Worker path; engine output arrives as message strings. Close/error
    // events funnel into handleDisconnect (unless a deliberate URL switch is in
    // progress — see isSwitchingWsUrl).
    initializeWebSocket(url) {
      this.wsUrl = url;
      try {
        const socket = new WebSocket(url);
        this.stockfish = socket;
        socket.addEventListener("open", () => {
          this.reconnectAttempts = 0;
          window.dispatchEvent(
            new CustomEvent("AsinaEngineStatus", {
              detail: {
                connected: true
              }
            })
          );
          this.send("uci");
          this.onReady(() => {
            this.UpdateOptions();
            this.send("ucinewgame");
            setTimeout(() => {
              try {
                const fen = this.BetterMintmaster.game.controller.getFEN();
                if (fen) {
                  this.UpdatePosition(fen, false);
                }
              } catch (error) {
              }
            }, 500);
          });
        });
        socket.addEventListener("message", (event) => {
          this.ProcessMessage(event.data);
        });
        socket.addEventListener("close", () => {
          if (this.stockfish !== socket) {
            return;
          }
          console.error("WebSocket connection closed.");
          window.dispatchEvent(
            new CustomEvent("AsinaEngineStatus", {
              detail: {
                connected: false
              }
            })
          );
          this.handleDisconnect();
        });
        socket.addEventListener("error", (event) => {
          if (this.stockfish !== socket) {
            return;
          }
          console.error("WebSocket error:", event);
          window.dispatchEvent(
            new CustomEvent("AsinaEngineStatus", {
              detail: {
                connected: false
              }
            })
          );
          this.handleDisconnect();
        });
      } catch (error) {
        console.error("Failed to load stockfish socket");
        throw error;
      }
    }
    // UCI command gate. Maia needs no UCI traffic, and commands sent before the
    // handshake completes would be lost, so anything while not ready is dropped.
    send(command) {
      if (this.engineType === "maia") {
        return;
      }
      if (!this.isReady()) {
        console.warn("Engine not ready, command dropped:", command);
        return;
      }
      if (this.engineType !== "websocket") {
        this.stockfish.postMessage(command);
      } else {
        this.stockfish.send(command);
      }
    }
    // Can the transport accept a command right now?
    isReady() {
      if (this.engineType === "maia") {
        return this.ready === true;
      }
      if (this.engineType !== "websocket") {
        return this.stockfish !== null && this.ready === true;
      }
      return this.stockfish && this.stockfish.readyState === WebSocket.OPEN;
    }
    // Start an evaluation. UCI forbids a new "go" while a search is running, so
    // the "go depth N" is chained behind stopEvaluation's stop→bestmove ack.
    // When the user caps book moves, OwnBook is switched off past that limit so
    // the engine stops playing its own opening book mid-game.
    go() {
      this.onReady(() => {
        this.stopEvaluation(() => {
          if (this.isEvaluating) {
            return;
          }
          console.assert(!this.isEvaluating, "Duplicated Stockfish go command");
          if (getValueConfig(enumOptions.DragonLimitBookMoves)) {
            const bookMovesSetting = parseInt(
              getValueConfig(enumOptions.DragonBookMoves)
            );
            const bookMoveLimit = bookMovesSetting === 11 ? Infinity : bookMovesSetting;
            try {
              const fen = this.BetterMintmaster.game.controller.getFEN();
              const fullmoveNumber = parseInt(fen.split(" ")[5]);
              const ownBook = getValueConfig(enumOptions.DragonOwnBook);
              if (ownBook) {
                if (fullmoveNumber > bookMoveLimit) {
                  this.send("setoption name OwnBook value false");
                } else {
                  this.send("setoption name OwnBook value true");
                }
              }
            } catch (error) {
            }
          }
          this.isEvaluating = true;
          this.send("go depth " + this.depth);
        });
      });
    }
    // WebSocket/worker died: mark disconnected, notify the UI, and schedule a reconnect.
    handleDisconnect() {
      this.ready = false;
      this.loaded = false;
      this.isEvaluating = false;
      if (this.engineType === "websocket") {
        if (this.isSwitchingWsUrl) {
          this.isSwitchingWsUrl = false;
          return;
        }
        this.attemptReconnect();
      }
    }
    // Reconnect loop with capped exponential backoff (used by the WebSocket backend).
    attemptReconnect() {
      if (this.reconnectAttempts < 5) {
        this.reconnectAttempts++;
        const delay = Math.min(
          this.reconnectDelay * this.reconnectAttempts,
          this.maxReconnectDelay
        );
        setTimeout(() => {
          this.initializeWebSocket(getValueConfig(enumOptions.UrlApiStockfish));
        }, delay);
      } else {
        console.error(
          "Max reconnect attempts reached. Please check the connection."
        );
      }
    }
    // Registers a callback to run once the engine finishes the UCI handshake.
    onReady(callback) {
      if (this.ready) {
        callback();
      } else {
        this.readyCallbacks.push(callback);
        this.send("isready");
      }
    }
    // Stops the running search; `callback` runs after the engine confirms with bestmove.
    stopEvaluation(callback) {
      if (this.isEvaluating) {
        if (!this.stopInFlight) {
          this.stopInFlight = true;
          this.goDoneCallbacks = [
            () => {
              this.isEvaluating = false;
              this.isRequestedStop = false;
              callback();
            }
          ];
          this.isRequestedStop = true;
          this.send("stop");
          this.stopInFlight = false;
          this.goDoneCallbacks.forEach((callback2) => callback2());
          this.goDoneCallbacks = [];
        } else {
          this.goDoneCallbacks.push(callback);
        }
      } else {
        callback();
      }
    }
    // Fired when a search completes — flushes queued ready/go callbacks.
    onStockfishResponse() {
      if (this.isRequestedStop) {
        this.isRequestedStop = false;
        this.stopInFlight = false;
        this.isEvaluating = false;
        this.executeCallbacks();
      }
    }
    // Runs and clears all queued callbacks (ready and go phases).
    executeCallbacks() {
      while (this.goDoneCallbacks.length) {
        const callback = this.goDoneCallbacks.shift();
        callback();
      }
    }
    // Sends `position fen …` (plus `ucinewgame` when newGame) to sync the engine with the board.
    UpdatePosition(fen = null, newGame = true) {
      this.onReady(() => {
        this.stopEvaluation(() => {
          if (newGame) {
            this.moveCounter = 0;
            this.hasShownLimitMessage = false;
            this.isPreMoveSequence = true;
            this.blunderReactEvalDisabled = false;
          }
          this.MoveAndGo(fen, newGame);
        });
      });
    }
    // Full per-game reset: ucinewgame, clear move counters and premove state.
    restartGame() {
      this.stopEvaluation(() => {
        this.isGameStarted = false;
        this.moveCounter = 0;
        this.isPreMoveSequence = false;
        this.send("ucinewgame");
        this.isGameStarted = true;
        this.go();
      });
    }
    // Applies option changes coming from the extension popup (arrows, automove, ultrabullet, coach…).
    UpdateExtensionOptions(options) {
      const engineSource = getValueConfig(enumOptions.EngineSource) || "komodo";
      if (engineSource !== this.engineType) {
        this.stopEvaluation(() => {
          if (this.engineType === "websocket" && this.stockfish) {
            this.stockfish.close();
          } else if (this.stockfish) {
            this.stockfish.terminate();
          }
          this.ready = false;
          this.loaded = false;
          this.stockfish = null;
          this.topMoves = [];
          this.lastTopMoves = [];
          this.isGameStarted = false;
          this.moveCounter = 0;
          if (engineSource === "komodo") {
            this.engineType = "komodo";
            this.initializeWorker(
              document.getElementById("__asina-engine-urls").dataset.komodo
            );
          } else if (engineSource === "torch") {
            this.engineType = "torch";
            this.initializeWorker(
              document.getElementById("__asina-engine-urls").dataset.torch
            );
          } else if (engineSource === "maia") {
            this.engineType = "maia";
            this.ready = true;
            this.loaded = true;
            this.BetterMintmaster.onEngineLoaded();
            window.dispatchEvent(
              new CustomEvent("AsinaEngineStatus", {
                detail: {
                  connected: true
                }
              })
            );
          } else {
            this.engineType = "websocket";
            this.initializeWebSocket(getValueConfig(enumOptions.UrlApiStockfish));
          }
        });
        return;
      }
      if (engineSource === "websocket") {
        const newWsUrl = getValueConfig(enumOptions.UrlApiStockfish);
        if (newWsUrl && newWsUrl !== this.wsUrl) {
          this.isSwitchingWsUrl = true;
          if (this.stockfish) {
            this.stockfish.close();
          }
          this.ready = false;
          this.loaded = false;
          this.stockfish = null;
          this.initializeWebSocket(newWsUrl);
          return;
        }
      }
      this.options = {
        MultiPV: getValueConfig(enumOptions.MultiPV),
        Hash: getValueConfig(enumOptions.DragonHash),
        "UCI Elo": getValueConfig(enumOptions.DragonUciElo),
        Personality: getValueConfig(enumOptions.DragonPersonality),
        "UCI LimitStrength": getValueConfig(enumOptions.DragonLimitStrength),
        "Auto Skill": getValueConfig(enumOptions.DragonAutoSkill),
        OwnBook: getValueConfig(enumOptions.DragonOwnBook),
        UCI_Chess960: getValueConfig(enumOptions.DragonChess960),
        "Best Book Line": getValueConfig(enumOptions.DragonBestBookLine),
        "Book Moves": getValueConfig(enumOptions.DragonLimitBookMoves) ? parseInt(getValueConfig(enumOptions.DragonBookMoves)) === 11 ? 1e3 : parseInt(getValueConfig(enumOptions.DragonBookMoves)) || 5 : 1e3
      };
      this.depth = getValueConfig(enumOptions.Depth);
      if (this.isReady()) {
        this.UpdateOptions();
        if (this.currentFEN) {
          this.stopEvaluation(() => {
            this.topMoves = [];
            this.send("position fen " + this.currentFEN);
            this.isEvaluating = true;
            this.send("go depth " + this.depth);
          });
        }
      }
    }
    // Pushes the UCI option set (depth, MultiPV, hash, Elo, book…) to the engine worker.
    UpdateOptions(options = null) {
      if (options === null) {
        options = this.options;
      }
      Object.keys(options).forEach((name) => {
        this.send("setoption name " + name + " value " + options[name]);
      });
    }
    // Core UCI output parser. Handles: uciok/readyok handshake, `info … score cp/mate … pv …`
    // lines (parsed into TopMove entries), `bestmove` (finalizes the search), and engine
    // book/option echoes. Drives arrows, eval, coach and auto-move downstream.
    ProcessMessage(message) {
      if (this.engineType === "websocket") {
        this.ready = false;
      }
      let line = message && typeof message === "object" && "data" in message ? message.data : message;
      if (line === "uciok") {
        this.loaded = true;
        this.BetterMintmaster.onEngineLoaded();
      } else if (line === "readyok") {
        this.ready = true;
        if (this.readyCallbacks.length > 0) {
          let callbacks = this.readyCallbacks;
          this.readyCallbacks = [];
          callbacks.forEach(function(callback) {
            callback();
          });
        }
      } else if (this.isEvaluating && line === "Load eval file success: 1") {
        this.isEvaluating = false;
        this.isRequestedStop = false;
        if (this.goDoneCallbacks.length > 0) {
          let callbacks = this.goDoneCallbacks;
          this.goDoneCallbacks = [];
          callbacks.forEach(function(callback) {
            callback();
          });
        }
      } else {
        let depthMatch = line.match(/^info .*?depth (\d+)/);
        let seldepthMatch = line.match(/^info .*?seldepth (\d+)/);
        let timeMatch = line.match(/^info .*?time (\d+)/);
        let scoreMatch = line.match(/^info .*?score (\w+) (-?\d+)/);
        let pvMatch = line.match(
          /^info .*?pv ([a-h][1-8][a-h][1-8][qrbn]?(?: [a-h][1-8][a-h][1-8][qrbn]?)*)(?: .*)?/
        );
        let multipvMatch = line.match(/^info .*?multipv (\d+)/);
        let bestmoveMatch = line.match(
          /^bestmove ([a-h][1-8][a-h][1-8][qrbn]?)(?: ponder ([a-h][1-8][a-h][1-8][qrbn]?))?/
        );
        if (depthMatch && scoreMatch && pvMatch) {
          let depth = parseInt(depthMatch[1]);
          let seldepth = seldepthMatch ? parseInt(seldepthMatch[1]) : null;
          let timeMs = timeMatch ? parseInt(timeMatch[1]) : null;
          let scoreType = scoreMatch[1];
          let scoreValue = parseInt(scoreMatch[2]);
          let multipv = multipvMatch ? parseInt(multipvMatch[1]) : 1;
          let pv = pvMatch[1];
          let cp = scoreType === "cp" ? scoreValue : null;
          let mate = scoreType === "mate" ? scoreValue : null;
          if (!this.isRequestedStop) {
            let topMove = new TopMove(pv, depth, cp, mate, multipv);
            this.onTopMoves(topMove, false);
          }
        } else if (bestmoveMatch) {
          this.isEvaluating = false;
          if (this.goDoneCallbacks.length > 0) {
            let callbacks = this.goDoneCallbacks;
            this.goDoneCallbacks = [];
            callbacks.forEach(function(callback) {
              callback();
            });
          }
          try {
            const ponderMove = bestmoveMatch[2];
            if (ponderMove && ponderMove.length >= 4) {
              const fen = this.BetterMintmaster.game.controller.getFEN();
              const sideToMove = fen ? fen.split(" ")[1] : null;
              const playingAs = this.BetterMintmaster.game.controller.getPlayingAs ? this.BetterMintmaster.game.controller.getPlayingAs() : this.BetterMintmaster.game.options.isPlayerBlack ? 2 : 1;
              const isMyTurn = playingAs === 1 && sideToMove === "w" || playingAs === 2 && sideToMove === "b";
              if (!isMyTurn) {
                const bestMate = this.topMoves.length > 0 ? this.topMoves[0].mate : null;
                this.lastPonder = {
                  from: ponderMove.substring(0, 2),
                  to: ponderMove.substring(2, 4),
                  promotion: ponderMove.length > 4 ? ponderMove.substring(4, 5) : null,
                  bestMate,
                  piece: this._getPieceAt(fen, ponderMove.substring(0, 2))
                };
                try {
                  if (getValueConfig(enumOptions.AutoMoveEnabled) && getValueConfig(enumOptions.PremoveEnabled) && getValueConfig(enumOptions.AutoPremoveEnabled)) {
                    const bestMove = bestmoveMatch[1];
                    const ponder = this.lastPonder;
                    if (bestMove && bestMove.length >= 4 && ponder) {
                      const bestMoveTo = bestMove.substring(2, 4);
                      let isOpponentPiece = false;
                      try {
                        const preFen = this.preOpponentFEN;
                        if (preFen) {
                          const board = preFen.split(" ")[0];
                          const rows = board.split("/");
                          const fileIdx = bestMoveTo.charCodeAt(0) - "a".charCodeAt(0);
                          const rankIdx = 8 - parseInt(bestMoveTo[1]);
                          let col = 0;
                          let pieceChar = null;
                          for (const ch of rows[rankIdx]) {
                            if (ch >= "1" && ch <= "8") {
                              col += parseInt(ch);
                            } else {
                              if (col === fileIdx) {
                                pieceChar = ch;
                                break;
                              }
                              col++;
                            }
                          }
                          if (pieceChar !== null) {
                            isOpponentPiece = playingAs === 1 ? pieceChar === pieceChar.toUpperCase() : pieceChar === pieceChar.toLowerCase();
                          }
                        }
                      } catch (error) {
                      }
                      if (isOpponentPiece && ponder.to === bestMoveTo) {
                        const boardEl = document.querySelector("wc-chess-board");
                        if (boardEl && boardEl.game && boardEl.game.premoves) {
                          const premoveMove = {
                            from: ponder.from,
                            to: ponder.to
                          };
                          boardEl.game.premoves.move(premoveMove);
                        } else {
                        }
                      }
                    }
                  }
                } catch (error) {
                  console.warn("[AutoPremove] Hata:", error);
                }
                try {
                  if (getValueConfig(enumOptions.AutoMoveEnabled) && getValueConfig(enumOptions.PremoveEnabled) && getValueConfig(enumOptions.AutoPremoveMatesEnabled)) {
                    const ponder = this.lastPonder;
                    const isMatePremove = ponder && ponder.bestMate === -1;
                    if (isMatePremove) {
                      const boardEl = document.querySelector("wc-chess-board");
                      if (boardEl && boardEl.game && boardEl.game.premoves) {
                        const premoveMove = {
                          from: ponder.from,
                          to: ponder.to,
                          promotion: ponder.promotion || void 0
                        };
                        boardEl.game.premoves.move(premoveMove);
                      } else {
                      }
                    }
                  }
                } catch (error) {
                  console.warn("[AutoPremoveMates] Hata:", error);
                }
                try {
                  if (getValueConfig(enumOptions.AutoMoveEnabled) && getValueConfig(enumOptions.PremoveEnabled) && getValueConfig(enumOptions.AutoPremoveCheckingForkEnabled)) {
                    const lastMove = this.BetterMintmaster.game.controller.getLastMove();
                    const ponder = this.lastPonder;
                    const playingAs2 = this.BetterMintmaster.game.controller.getPlayingAs();
                    if (this.lastMoveGaveCheck && lastMove && ponder && ponder.from === lastMove.to && this.preOpponentFEN) {
                      let isMyPiece = false;
                      try {
                        const board = this.preOpponentFEN.split(" ")[0];
                        const rows = board.split("/");
                        const fileIdx = ponder.to.charCodeAt(0) - "a".charCodeAt(0);
                        const rankIdx = 8 - parseInt(ponder.to[1]);
                        let col = 0;
                        let pieceChar = null;
                        for (const ch of rows[rankIdx]) {
                          if (ch >= "1" && ch <= "8") {
                            col += parseInt(ch);
                          } else {
                            if (col === fileIdx) {
                              pieceChar = ch;
                              break;
                            }
                            col++;
                          }
                        }
                        if (pieceChar !== null) {
                          isMyPiece = playingAs2 === 1 ? pieceChar === pieceChar.toLowerCase() : pieceChar === pieceChar.toUpperCase();
                        }
                      } catch (error) {
                      }
                      if (isMyPiece) {
                        const boardEl = document.querySelector("wc-chess-board");
                        if (boardEl && boardEl.game && boardEl.game.premoves) {
                          const premoveMove = {
                            from: ponder.from,
                            to: ponder.to,
                            promotion: ponder.promotion || void 0
                          };
                          boardEl.game.premoves.move(premoveMove);
                        }
                      }
                    }
                  }
                } catch (error) {
                }
                try {
                  const clockSeconds = this.getMyClockSeconds();
                  const premoveChance = clockSeconds <= 5 ? 0.5 : clockSeconds <= 10 ? 0.2 : 0;
                  if (getValueConfig(enumOptions.FlagModeEnabled) && getValueConfig(enumOptions.AutoMoveEnabled) && clockSeconds !== null && clockSeconds <= 10 && Math.random() < premoveChance) {
                    const ponder = this.lastPonder;
                    if (ponder && ponder.from && ponder.to) {
                      const boardEl = document.querySelector("wc-chess-board");
                      if (boardEl && boardEl.game && boardEl.game.premoves) {
                        const premoveMove = {
                          from: ponder.from,
                          to: ponder.to
                        };
                        boardEl.game.premoves.move(premoveMove);
                      } else {
                      }
                    }
                  }
                } catch (error) {
                  console.warn("[FlagMode] Random premove hatas\u0131:", error);
                }
                const bookFallbackActive = (getValueConfig(enumOptions.UltrabulletOpeningPreference) || "none") === "none" && this._lastOwnMoveWasBookFallback === true;
                try {
                  const ultrabulletFlagMode = getValueConfig(
                    enumOptions.UltrabulletFlagModeEnabled
                  );
                  const ultrabulletEnabled = getValueConfig(
                    enumOptions.UltrabulletEnabled
                  );
                  const clockSeconds = this.getMyClockSeconds();
                  if (ultrabulletFlagMode && ultrabulletEnabled && !bookFallbackActive && clockSeconds !== null && clockSeconds === 0 && Math.random() < 0.9) {
                    const ponder = this.lastPonder;
                    if (ponder && ponder.from && ponder.to) {
                      const boardEl = document.querySelector("wc-chess-board");
                      if (boardEl && boardEl.game && boardEl.game.premoves) {
                        const premoveMove = {
                          from: ponder.from,
                          to: ponder.to,
                          promotion: ponder.promotion || void 0
                        };
                        boardEl.game.premoves.move(premoveMove);
                      }
                    }
                  }
                } catch (error) {
                  console.warn("[Ultrabullet FlagMode] Premove hatas\u0131:", error);
                }
                try {
                  if (!this._lefongTrapPending && !bookFallbackActive && getValueConfig(enumOptions.UltrabulletEnabled) && this._getOwnMoveNumber(fen, playingAs) > ULTRABULLET_CHANCE_LOCK_MOVES) {
                    const premoveChancePct = parseInt(
                      getValueConfig(enumOptions.UltrabulletPremoveChance)
                    ) || 0;
                    if (premoveChancePct > 0 && Math.random() * 100 < premoveChancePct) {
                      const ponder = this.lastPonder;
                      if (ponder && ponder.from && ponder.to) {
                        const chainLimit = parseInt(
                          getValueConfig(
                            enumOptions.UltrabulletPremoveChainLimit
                          )
                        ) || 5;
                        if (this.premoveStreak >= chainLimit) {
                          this.premoveStreak = 0;
                        } else {
                          const guardQueenRisk = getValueConfig(enumOptions.UltrabulletGuardQueen) && ponder.piece && ponder.piece.toLowerCase() === "q";
                          const skipForQueenGuard = guardQueenRisk && Math.random() * 100 < 80;
                          if (!skipForQueenGuard) {
                            const boardEl = document.querySelector("wc-chess-board");
                            if (boardEl && boardEl.game && boardEl.game.premoves) {
                              const premoveMove = {
                                from: ponder.from,
                                to: ponder.to,
                                promotion: ponder.promotion || void 0
                              };
                              boardEl.game.premoves.move(premoveMove);
                            }
                            this.premoveStreak++;
                          }
                        }
                      }
                    } else {
                      this.premoveStreak = 0;
                    }
                  }
                } catch (error) {
                  console.warn(
                    "[Ultrabullet] Auto Premove Chance hatas\u0131:",
                    error
                  );
                }
              }
            }
          } catch (error) {
          }
          if (!this.isRequestedStop && bestmoveMatch[1] !== void 0) {
            const bestMove = bestmoveMatch[1];
            const matchIndex = this.topMoves.findIndex(
              (topMove) => topMove.move === bestMove
            );
            if (matchIndex < 0) {
              console.warn(
                'The engine returned the best move "' + bestMove + `" but it's not in the top move list.`
              );
              let fallbackTopMove = new TopMove(
                bestMove,
                getValueConfig(enumOptions.Depth),
                100,
                null
              );
              this._lastOwnMoveWasBookFallback = true;
              this.onTopMoves(fallbackTopMove, true);
            } else {
              this._lastOwnMoveWasBookFallback = false;
              this.onTopMoves(this.topMoves[matchIndex], true);
            }
          }
          this.isRequestedStop = false;
        }
      }
    }
    // Runs and clears the queued on-ready callbacks after the handshake completes.
    executeReadyCallbacks() {
      while (this.readyCallbacks.length > 0) {
        const callback = this.readyCallbacks.shift();
        callback();
      }
    }
    // The main per-move entry point: syncs position state, runs the opening book,
    // triggers analysis, coach, premove and ultrabullet logic for the new position.
    MoveAndGo(fen = null, newGame = true) {
      if (this.engineType === "maia") {
        const fen2 = this.BetterMintmaster.game.controller.getFEN();
        if (!fen2) {
          console.warn("[MaiaEngine] MoveAndGo \u2014 FEN al\u0131namad\u0131, atlan\u0131yor.");
          return;
        }
        const maiaElo = parseInt(getValueConfig("option-maia-elo")) || 1500;
        const sideToMove = fen2.split(" ")[1];
        const playingAs = this.BetterMintmaster.game.controller.getPlayingAs?.();
        const isMyTurn = playingAs === 1 && sideToMove === "w" || playingAs === 2 && sideToMove === "b";
        let legalMoves = null;
        let verboseMoves = [];
        try {
          const chess = new Chess(fen2);
          verboseMoves = chess.moves({
            verbose: true
          });
        } catch (error) {
          console.error(
            "[MaiaEngine] MoveAndGo \u2014 chess.js legal moves hatas\u0131:",
            error.message
          );
        }
        legalMoves = new Set(
          verboseMoves.map(
            (move) => move.from + move.to + (move.promotion ?? "")
          )
        );
        if (legalMoves.size === 0) {
          console.error(
            "[MaiaEngine] MoveAndGo \u2014 Legal hamle \xFCretilemedi! FEN:",
            fen2
          );
        }
        this.BetterMintmaster.maiaEngine.getBestMove(fen2, maiaElo, maiaElo, legalMoves).then((uciMove) => {
          if (!uciMove || uciMove.length < 4) {
            console.warn(
              "[MaiaEngine] MoveAndGo \u2014 ge\xE7ersiz/bo\u015F uciMove:",
              uciMove
            );
            return;
          }
          if (uciMove[0] === uciMove[2] && uciMove[1] === uciMove[3]) {
            console.warn(
              "[MaiaEngine] MoveAndGo \u2014 null move filtrelendi:",
              uciMove
            );
            return;
          }
          const from = uciMove.substring(0, 2);
          const to = uciMove.substring(2, 4);
          const promotion = uciMove.length === 5 ? uciMove[4] : null;
          const topMove = new TopMove(uciMove, 1, 0, null, 1);
          topMove.from = from;
          topMove.to = to;
          topMove.promotion = promotion;
          this.topMoves = [topMove];
          this.BetterMintmaster.game.HintMoves(
            [topMove],
            this.lastTopMoves,
            true
          );
          if (isMyTurn) {
            this.scheduleAutoMove();
          }
        }).catch((error) => {
          console.error(
            "[MaiaEngine] MoveAndGo \u2014 getBestMove exception:",
            error
          );
        });
        return;
      }
      let resetAndGo = () => {
        this.lastTopMoves = newGame ? [] : this.topMoves;
        this.lastMoveScore = null;
        this.opponentLastMoveScore = null;
        this.topMoves = [];
        this._preAnalyzeFen = "__RESET__";
        if (newGame) {
          this.lastPonder = null;
          this.premoveStreak = 0;
          this.pendingAutoPremove = false;
          this.pendingAutoPremoveMates = false;
          this.simulateMateActive = false;
          this.lastMoveGaveCheck = false;
          this.openingMovePlayed = false;
        }
        if (this.autoMoveTimer !== null) {
          clearTimeout(this.autoMoveTimer);
          this.autoMoveTimer = null;
        }
        if (this.ultrabulletMoveTimer !== null) {
          clearTimeout(this.ultrabulletMoveTimer);
          this.ultrabulletMoveTimer = null;
        }
        try {
          const fen2 = this.BetterMintmaster.game.controller.getFEN();
          const sideToMove = fen2 ? fen2.split(" ")[1] : null;
          const playingAs = this.BetterMintmaster.game.controller.getPlayingAs();
          const isMyTurn = playingAs === 1 && sideToMove === "w" || playingAs === 2 && sideToMove === "b";
          if (!isMyTurn) {
            this.lastOpponentMoves = [];
            this.preOpponentFEN = fen2;
            this.preOpponentStockfishCp = this.lastStockfishCp;
            try {
              const lastMove = this.BetterMintmaster.game.controller.getLastMove();
              if (lastMove && lastMove.to && fen2) {
                this.lastMoveGaveCheck = this._doesPieceGiveCheck(
                  fen2,
                  lastMove.to,
                  playingAs
                );
              } else {
                this.lastMoveGaveCheck = false;
              }
            } catch (error) {
              this.lastMoveGaveCheck = false;
            }
          }
        } catch (error) {
        }
        if (eTable != null) {
          const theoryKey = this.BetterMintmaster.game.controller.getFEN().split(" ").slice(0, 3).join(" ");
          this.isInTheory = eTable.get(theoryKey) === true;
        } else {
          this.isInTheory = false;
        }
        try {
          this.lastBoardFEN = this.BetterMintmaster.game.controller.getFEN();
        } catch (error) {
          this.lastBoardFEN = null;
        }
        if (fen != null) {
          this.currentFEN = fen;
          this.send("position fen " + fen);
        }
        this.go();
      };
      this.onReady(() => {
        if (newGame) {
          this.send("ucinewgame");
          if (getValueConfig(enumOptions.DragonLimitBookMoves) && getValueConfig(enumOptions.DragonOwnBook)) {
            this.send("setoption name OwnBook value true");
          }
          this.onReady(resetAndGo);
        } else {
          resetAndGo();
        }
      });
    }
    // Grades the move just played (ours or theirs) by comparing evals — feeds the coach.
    AnalyzeLastMove() {
      this.lastMoveScore = null;
      let lastMove = this.BetterMintmaster.game.controller.getLastMove();
      if (lastMove === void 0) {
        return;
      }
      if (this.isInTheory) {
        this.lastMoveScore = "Book";
      } else if (this.lastTopMoves.length > 0) {
        let prevTopMove = this.lastTopMoves[0];
        if (prevTopMove.from === lastMove.from && prevTopMove.to === lastMove.to) {
          this.lastMoveScore = "BestMove";
        } else {
          let currentTopMove = this.topMoves[0];
          if (prevTopMove.mate != null) {
            if (currentTopMove.mate == null) {
              this.lastMoveScore = prevTopMove.mate > 0 ? "MissedWin" : "Brilliant";
            } else {
              this.lastMoveScore = prevTopMove.mate > 0 ? "Excellent" : "ResignWhite";
            }
          } else if (currentTopMove.mate != null) {
            this.lastMoveScore = currentTopMove.mate < 0 ? "Brilliant" : "Blunder";
          } else if (currentTopMove.cp != null && prevTopMove.cp != null) {
            let cpDelta = -(currentTopMove.cp + prevTopMove.cp);
            if (cpDelta > 100) {
              this.lastMoveScore = "Brilliant";
            } else if (cpDelta > 0) {
              this.lastMoveScore = "GreatFind";
            } else if (cpDelta > -10) {
              this.lastMoveScore = "BestMove";
            } else if (cpDelta > -25) {
              this.lastMoveScore = "Excellent";
            } else if (cpDelta > -50) {
              this.lastMoveScore = "Good";
            } else if (cpDelta > -100) {
              this.lastMoveScore = "Inaccuracy";
            } else if (cpDelta > -250) {
              this.lastMoveScore = "Mistake";
            } else {
              this.lastMoveScore = "Blunder";
            }
          } else {
            console.assert(false, "Error while analyzing last move");
          }
        }
      }
      if (this.lastMoveScore != null) {
        const scoreColors = {
          Brilliant: "#1baca6",
          GreatFind: "#5c8bb0",
          BestMove: "#9eba5a",
          Excellent: "#96bc4b",
          Good: "#96af8b",
          Book: "#a88865",
          Inaccuracy: "#FECA57",
          Mistake: "#e6912c",
          Blunder: "#b33430",
          MissedWin: "#dbac16"
        };
        this.BetterMintmaster.game.controller.markings.addOne({
          data: {
            square: lastMove.to,
            type: this.lastMoveScore
          },
          node: true,
          persistent: true,
          type: "effect"
        });
      }
    }
    // Detects an opponent blunder (eval swing) and reacts when blunder-react is enabled.
    AnalyzeOpponentBlunder() {
      this.opponentLastMoveScore = null;
      let lastMove = this.BetterMintmaster.game.controller.getLastMove();
      if (lastMove === void 0) {
        return;
      }
      if (this.isInTheory) {
        this.opponentLastMoveScore = "Book";
        return;
      }
      if (this.lastTopMoves.length === 0) {
        return;
      }
      let prevTopMove = this.lastTopMoves[0];
      if (prevTopMove.from === lastMove.from && prevTopMove.to === lastMove.to) {
        this.opponentLastMoveScore = "BestMove";
      } else {
        let currentTopMove = this.topMoves[0];
        if (!currentTopMove) {
          return;
        }
        if (prevTopMove.mate != null) {
          if (currentTopMove.mate == null) {
            this.opponentLastMoveScore = prevTopMove.mate > 0 ? "MissedWin" : "Brilliant";
          } else {
            this.opponentLastMoveScore = prevTopMove.mate > 0 ? "Excellent" : "ResignWhite";
          }
        } else if (currentTopMove.mate != null) {
          this.opponentLastMoveScore = currentTopMove.mate < 0 ? "Brilliant" : "Blunder";
        } else {
          const currentCp = this.lastStockfishCp;
          const preOpponentCp = this.preOpponentStockfishCp;
          if (currentCp !== null && currentCp !== void 0 && preOpponentCp !== null && preOpponentCp !== void 0) {
            const playingAs = this.BetterMintmaster.game.controller.getPlayingAs();
            const cpDelta = playingAs === 2 ? currentCp - preOpponentCp : -(currentCp - preOpponentCp);
            if (cpDelta > 100) {
              this.opponentLastMoveScore = "Brilliant";
            } else if (cpDelta > 0) {
              this.opponentLastMoveScore = "GreatFind";
            } else if (cpDelta > -10) {
              this.opponentLastMoveScore = "BestMove";
            } else if (cpDelta > -25) {
              this.opponentLastMoveScore = "Excellent";
            } else if (cpDelta > -50) {
              this.opponentLastMoveScore = "Good";
            } else if (cpDelta > -100) {
              this.opponentLastMoveScore = "Inaccuracy";
            } else if (cpDelta > -300) {
              this.opponentLastMoveScore = "Mistake";
            } else {
              this.opponentLastMoveScore = "Blunder";
            }
          } else if (currentTopMove.cp != null && prevTopMove.cp != null) {
            let cpDelta = -(currentTopMove.cp + prevTopMove.cp);
            if (cpDelta > 100) {
              this.opponentLastMoveScore = "Brilliant";
            } else if (cpDelta > 0) {
              this.opponentLastMoveScore = "GreatFind";
            } else if (cpDelta > -10) {
              this.opponentLastMoveScore = "BestMove";
            } else if (cpDelta > -25) {
              this.opponentLastMoveScore = "Excellent";
            } else if (cpDelta > -50) {
              this.opponentLastMoveScore = "Good";
            } else if (cpDelta > -100) {
              this.opponentLastMoveScore = "Inaccuracy";
            } else if (cpDelta > -300) {
              this.opponentLastMoveScore = "Mistake";
            } else {
              this.opponentLastMoveScore = "Blunder";
            }
          }
        }
      }
    }
    // Processes queued pre-move analyses one by one (Torch pre-coach) and places icons.
    async runPreAnalyzeQueue(moves) {
      if (!getValueConfig(enumOptions.PreAnalyzeEnabled)) {
        return;
      }
      if (this._preAnalyzeRunning) {
        return;
      }
      const preCoach = this.BetterMintmaster.preCoach;
      const game = this.BetterMintmaster.game;
      if (!preCoach || !game) {
        console.warn("[PreAnalyze] preCoach veya game yok \u2014 \xE7\u0131k\u0131\u015F");
        return;
      }
      const fen = game.controller.getFEN();
      this._preAnalyzeRunning = true;
      this._preAnalyzeFen = fen;
      if (game.clearPreAnalyzeMarkings) {
        game.clearPreAnalyzeMarkings();
      }
      for (const entry of moves) {
        if (this._preAnalyzeFen !== fen) {
          break;
        }
        if (!getValueConfig(enumOptions.PreAnalyzeEnabled)) {
          break;
        }
        const move = entry.move;
        const positionUci = game.buildUciPositionWithCandidate(move);
        let waitedMs = 0;
        while (preCoach.worker && !preCoach._ready && waitedMs < 3e3) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          waitedMs += 100;
          if (this._preAnalyzeFen !== fen) {
            break;
          }
        }
        if (this._preAnalyzeFen !== fen) {
          break;
        }
        let analysis = null;
        try {
          analysis = await preCoach.getAnalysis(positionUci);
        } catch (error) {
          console.warn("[PreAnalyze] hata:", error);
        }
        if (!analysis || !analysis.classificationName) {
          continue;
        }
        if (this._preAnalyzeFen !== fen) {
          break;
        }
        if (game.placePreAnalyzeIcon) {
          game.placePreAnalyzeIcon(entry.to, analysis.classificationName);
        }
      }
      this._preAnalyzeRunning = false;
    }
    // Consumes a finished search: stores top moves, updates arrows/eval, and arms
    // auto-move / ultrabullet / premove decisions for this position.
    onTopMoves(topMove = null, isBestMove = false) {
      window.top_pv_moves = [];
      var bestMoveReady = false;
      if (topMove != null) {
        const existingIndex = this.topMoves.findIndex(
          (tm) => tm.move === topMove.move
        );
        if (isBestMove) {
          bestMoveReady = true;
          if (existingIndex === -1) {
            this.topMoves.push(topMove);
            this.SortTopMoves();
          }
          try {
            const fen = this.BetterMintmaster.game.controller.getFEN();
            const sideToMove = fen ? fen.split(" ")[1] : null;
            const playingAs = this.BetterMintmaster.game.controller.getPlayingAs();
            const isMyTurn = playingAs === 1 && sideToMove === "w" || playingAs === 2 && sideToMove === "b";
            if (!isMyTurn) {
              this.lastOpponentMoves = this.topMoves.map((tm) => ({
                from: tm.from,
                to: tm.to
              }));
            }
            const flagModeActive = getValueConfig(enumOptions.FlagModeEnabled) && this.getMyClockSeconds() !== null && this.getMyClockSeconds() <= 5;
            if (isMyTurn && getValueConfig(enumOptions.InstantRecapture) && !flagModeActive) {
              const lastMove = this.BetterMintmaster.game.controller.getLastMove();
              const topMove2 = this.topMoves[0];
              if (lastMove && topMove2) {
                const wasOpponentMove = this.lastOpponentMoves.some(
                  (tracked) => tracked.from === lastMove.from && tracked.to === lastMove.to
                );
                let isRecapture = false;
                try {
                  const preFen = this.preOpponentFEN || this.lastBoardFEN;
                  const boardPart = preFen.split(" ")[0];
                  const rows = boardPart.split("/");
                  const fileIdx = lastMove.to.charCodeAt(0) - "a".charCodeAt(0);
                  const rankIdx = 8 - parseInt(lastMove.to[1]);
                  let col = 0;
                  let pieceChar = null;
                  for (const ch of rows[rankIdx]) {
                    if (ch >= "1" && ch <= "8") {
                      col += parseInt(ch);
                    } else {
                      if (col === fileIdx) {
                        pieceChar = ch;
                        break;
                      }
                      col++;
                    }
                  }
                  if (pieceChar !== null) {
                    isRecapture = playingAs === 1 ? pieceChar === pieceChar.toUpperCase() : pieceChar === pieceChar.toLowerCase();
                  }
                } catch (error) {
                }
                const sameTarget = topMove2.to === lastMove.to;
                if (wasOpponentMove && isRecapture && sameTarget) {
                  setTimeout(() => this.playBestMove(), 0);
                }
              }
            }
          } catch (error) {
          }
        } else {
          try {
            const fen = this.BetterMintmaster.game.controller.getFEN();
            const sideToMove = fen ? fen.split(" ")[1] : null;
            const playingAs = this.BetterMintmaster.game.controller.getPlayingAs();
            const isOpponentTurn = (playingAs !== 1 || sideToMove !== "w") && (playingAs !== 2 || sideToMove !== "b");
            if (isOpponentTurn && topMove.from && topMove.to) {
              const alreadyTracked = this.lastOpponentMoves.some(
                (tracked) => tracked.from === topMove.from && tracked.to === topMove.to
              );
              if (!alreadyTracked) {
                const opponentMove = {
                  from: topMove.from,
                  to: topMove.to
                };
                this.lastOpponentMoves.push(opponentMove);
              }
            }
          } catch (error) {
          }
          if (existingIndex === -1) {
            this.topMoves.push(topMove);
            this.SortTopMoves();
          } else if (topMove.depth >= this.topMoves[existingIndex].depth) {
            this.topMoves[existingIndex] = topMove;
            this.SortTopMoves();
          }
        }
      }
      if (bestMoveReady && this.topMoves.length > 0) {
        const topMove2 = this.topMoves[0];
        const fen = this.BetterMintmaster.game.controller.getFEN();
        const sideToMove = fen.split(" ")[1];
        const playingAs = this.BetterMintmaster.game.controller.getPlayingAs();
        if (false) {
          if ((playingAs === 1 && sideToMove === "w" || playingAs === 2 && sideToMove === "b") && this.moveCounter < getValueConfig(enumOptions.MaxPreMoves) && !this.hasShownLimitMessage) {
            const legalMoves = this.BetterMintmaster.game.controller.getLegalMoves();
            const premoveMove = legalMoves.find(
              (legal) => legal.from === topMove2.from && legal.to === topMove2.to
            );
            if (premoveMove) {
              premoveMove.userGenerated = true;
              if (topMove2.promotion !== null) {
                premoveMove.promotion = topMove2.promotion;
              }
              this.moveCounter++;
              let premoveDelay = getValueConfig(enumOptions.PreMoveTime) + Math.floor(
                Math.random() * getValueConfig(enumOptions.PreMoveTimeRandom)
              ) % getValueConfig(enumOptions.PreMoveTimeRandomDiv) * getValueConfig(enumOptions.PreMoveTimeRandomMulti);
              setTimeout(() => {
                this.BetterMintmaster.game.controller.move(premoveMove);
                if (this.moveCounter >= getValueConfig(enumOptions.MaxPreMoves)) {
                  this.hasShownLimitMessage = true;
                }
              }, premoveDelay);
            }
          }
          if (topMove2.mate !== null && topMove2.mate > 0 && topMove2.mate <= getValueConfig(enumOptions.MateFinderValue)) {
            const legalMoves = this.BetterMintmaster.game.controller.getLegalMoves();
            const mateMove = legalMoves.find(
              (legal) => legal.from === topMove2.from && legal.to === topMove2.to
            );
            if (mateMove) {
              mateMove.userGenerated = true;
              if (topMove2.promotion !== null) {
                mateMove.promotion = topMove2.promotion;
              }
              this.BetterMintmaster.game.controller.move(mateMove);
            }
          }
        }
      }
      if (false) {
        const topMove2 = this.topMoves[0];
        const utterance = new SpeechSynthesisUtterance(topMove2.move);
        const voices = window.speechSynthesis.getVoices();
        const googleVoices = voices.filter(
          (voice) => voice.voiceURI.includes("Google UK English Female")
        );
        if (googleVoices.length > 0) {
          utterance.voice = googleVoices[0];
        }
        utterance.volume = 0.75;
        utterance.rate = 1;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }
      if (bestMoveReady) {
        top_pv_moves = this.topMoves.slice(0, this.options.MultiPV);
        this.BetterMintmaster.game.HintMoves(
          top_pv_moves,
          this.lastTopMoves,
          isBestMove
        );
        this.runPreAnalyzeQueue(top_pv_moves);
        if (false) {
          this.AnalyzeLastMove();
        }
        try {
          const fen = this.BetterMintmaster.game.controller.getFEN();
          const sideToMove = fen ? fen.split(" ")[1] : null;
          const playingAs = this.BetterMintmaster.game.controller.getPlayingAs();
          const isMyTurn = playingAs === 1 && sideToMove === "w" || playingAs === 2 && sideToMove === "b";
          if (isMyTurn) {
            this.AnalyzeOpponentBlunder();
          }
        } catch (error) {
        }
        this.scheduleAutoMove();
        this.scheduleUltrabulletMove();
      } else {
        if (false) {
          const accuracyMoves = this.topMoves.filter(
            (tm) => tm.accuracy !== void 0
          );
          if (accuracyMoves.length > 0) {
            accuracyMoves.sort((a, b) => b.accuracy - a.accuracy);
            const totalAccuracy = accuracyMoves.reduce(
              (cumulative2, tm) => cumulative2 + tm.accuracy,
              0
            );
            const cumulative = accuracyMoves.reduce((cumulative2, tm) => {
              const prevCumulative = cumulative2.length > 0 ? cumulative2[cumulative2.length - 1] : 0;
              const probability = tm.accuracy / totalAccuracy;
              cumulative2.push(prevCumulative + probability);
              return cumulative2;
            }, []);
            const roll = Math.random();
            let picked;
            for (let i = 0; i < cumulative.length; i++) {
              if (roll <= cumulative[i]) {
                picked = accuracyMoves[i];
                break;
              }
            }
            top_pv_moves = [
              picked,
              ...this.topMoves.filter((tm) => tm !== picked)
            ];
          } else {
            top_pv_moves = this.topMoves.slice(0, this.options.MultiPV);
          }
        }
        top_pv_moves = this.topMoves.slice(0, this.options.MultiPV);
      }
    }
    // Reads our remaining clock from the chess.com DOM (null when not found).
    getMyClockSeconds() {
      try {
        const clockEl = document.querySelector(
          ".clock-bottom .clock-time-monospace"
        );
        if (!clockEl) {
          return null;
        }
        const clockText = clockEl.textContent.trim();
        const parts = clockText.split(":");
        if (parts.length !== 2) {
          return null;
        }
        const seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
        if (isNaN(seconds)) {
          return null;
        } else {
          return seconds;
        }
      } catch (error) {
        return null;
      }
    }
    applyFlagProfile({
      depth,
      personality,
      delayMin,
      delayMax
    }) {
      if (this._flagProfileActive) {
        return;
      }
      this._flagProfileActive = true;
      this.depth = depth;
      this.send("setoption name Personality value " + personality);
    }
    // Flag mode: restores the normal engine profile after a flag-mode burst.
    restoreNormalProfile() {
      if (!this._flagProfileActive) {
        return;
      }
      this._flagProfileActive = false;
      this.depth = getValueConfig(enumOptions.Depth);
      const personality = getValueConfig(enumOptions.DragonPersonality) || "Default";
      this.send("setoption name Personality value " + personality);
    }
    // Collects the squares currently occupied by enemy pieces (capture-aware timing).
    _getOpponentSquares(fen, playingAs) {
      const squares = /* @__PURE__ */ new Set();
      try {
        const boardPart = fen.split(" ")[0];
        const rows = boardPart.split("/");
        for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
          let col = 0;
          for (const ch of rows[rankIdx]) {
            if (ch >= "1" && ch <= "8") {
              col += parseInt(ch);
            } else {
              const isOpponentPiece = playingAs === 1 ? ch === ch.toLowerCase() : ch === ch.toUpperCase();
              if (isOpponentPiece) {
                const fileChar = String.fromCharCode("a".charCodeAt(0) + col);
                const rankStr = String(8 - rankIdx);
                squares.add(fileChar + rankStr);
              }
              col++;
            }
          }
        }
      } catch (error) {
      }
      return squares;
    }
    // Counts our completed moves from the FEN move counter (gates ultrabullet chances).
    _getOwnMoveNumber(fen, playingAs) {
      try {
        const parts = fen.split(" ");
        const sideToMove = parts[1];
        const fullmoveNumber = parseInt(parts[5], 10) || 1;
        const myColor = playingAs === 1 ? "w" : "b";
        if (sideToMove === myColor) {
          return fullmoveNumber;
        }
        if (myColor === "w") {
          return fullmoveNumber + 1;
        } else {
          return fullmoveNumber;
        }
      } catch (error) {
        return 1;
      }
    }
    // Destination square of the opponent's last capture (instant-recapture target).
    _getRecaptureSquare(playingAs) {
      try {
        const lastMove = this.BetterMintmaster.game.controller.getLastMove();
        if (!lastMove || !lastMove.to) {
          return null;
        }
        const preFen = this.preOpponentFEN || this.lastBoardFEN;
        if (!preFen) {
          return null;
        }
        const boardPart = preFen.split(" ")[0];
        const rows = boardPart.split("/");
        const fileIdx = lastMove.to.charCodeAt(0) - "a".charCodeAt(0);
        const rankIdx = 8 - parseInt(lastMove.to[1]);
        let col = 0;
        let pieceChar = null;
        for (const ch of rows[rankIdx]) {
          if (ch >= "1" && ch <= "8") {
            col += parseInt(ch);
          } else {
            if (col === fileIdx) {
              pieceChar = ch;
              break;
            }
            col++;
          }
        }
        if (pieceChar === null) {
          return null;
        }
        const isOpponentPiece = playingAs === 1 ? pieceChar === pieceChar.toUpperCase() : pieceChar === pieceChar.toLowerCase();
        if (isOpponentPiece) {
          return lastMove.to;
        } else {
          return null;
        }
      } catch (error) {
        return null;
      }
    }
    // Piece char at a square from the FEN (uppercase = white, lowercase = black), or null.
    _getPieceAt(fen, square) {
      try {
        if (!fen || !square || square.length < 2) {
          return null;
        }
        const boardPart = fen.split(" ")[0];
        const rows = boardPart.split("/");
        const fileIdx = square.charCodeAt(0) - "a".charCodeAt(0);
        const rankIdx = 8 - parseInt(square[1]);
        if (rankIdx < 0 || rankIdx > 7 || !rows[rankIdx]) {
          return null;
        }
        let col = 0;
        for (const ch of rows[rankIdx]) {
          if (ch >= "1" && ch <= "8") {
            col += parseInt(ch);
          } else {
            if (col === fileIdx) {
              return ch;
            }
            col++;
          }
        }
        return null;
      } catch (error) {
        return null;
      }
    }
    // Attack detection: knight/bishop/rook/queen/pawn/king patterns over the board array.
    _squareIsAttackedBy(pieceChar, fromFile, fromRank, toFile, toRank, board) {
      try {
        const pieceType = pieceChar.toLowerCase();
        const fileDist = Math.abs(toFile - fromFile);
        const rankDist = Math.abs(toRank - fromRank);
        const pathIsClear = (destFile, destRank) => {
          const fileStep = destFile === fromFile ? 0 : destFile > fromFile ? 1 : -1;
          const rankStep = destRank === fromRank ? 0 : destRank > fromRank ? 1 : -1;
          let curFile = fromFile + fileStep;
          let curRank = fromRank + rankStep;
          while (curFile !== destFile || curRank !== destRank) {
            if (board[curRank][curFile] !== null) {
              return false;
            }
            curFile += fileStep;
            curRank += rankStep;
          }
          return true;
        };
        if (pieceType === "n") {
          return fileDist === 1 && rankDist === 2 || fileDist === 2 && rankDist === 1;
        }
        if (pieceType === "b") {
          return fileDist === rankDist && fileDist !== 0 && pathIsClear(toFile, toRank);
        }
        if (pieceType === "r") {
          return (fileDist === 0 || rankDist === 0) && fileDist + rankDist !== 0 && pathIsClear(toFile, toRank);
        }
        if (pieceType === "q") {
          return (fileDist === rankDist && fileDist !== 0 || (fileDist === 0 || rankDist === 0) && fileDist + rankDist !== 0) && pathIsClear(toFile, toRank);
        }
        if (pieceType === "p") {
          const isWhitePiece = pieceChar === pieceChar.toUpperCase();
          return rankDist === 1 && fileDist === 1 && (isWhitePiece ? toRank > fromRank : toRank < fromRank);
        }
        return false;
      } catch (error) {
        return false;
      }
    }
    // Finds valuable enemy pieces (Q/R/B/N) that can be trapped — feeds the Lefong planner.
    _getValuablePieceSquares(fen, playingAs) {
      const valuableSquares = /* @__PURE__ */ new Map();
      try {
        const boardPart = fen.split(" ")[0];
        const rows = boardPart.split("/");
        for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
          let col = 0;
          for (const ch of rows[rankIdx]) {
            if (ch >= "1" && ch <= "8") {
              col += parseInt(ch);
            } else {
              const isOpponentPiece = playingAs === 1 ? ch === ch.toLowerCase() : ch === ch.toUpperCase();
              const pieceType = ch.toLowerCase();
              if (isOpponentPiece && (pieceType === "q" || pieceType === "r" || pieceType === "b" || pieceType === "n")) {
                const fileChar = String.fromCharCode("a".charCodeAt(0) + col);
                const rankStr = String(8 - rankIdx);
                valuableSquares.set(fileChar + rankStr, pieceType);
              }
              col++;
            }
          }
        }
      } catch (error) {
      }
      return valuableSquares;
    }
    // Ultrabullet mode: plays fast premoves/traps with randomized chances; scripted
    // opening lines run first, random chances unlock after 4 own moves.
    scheduleUltrabulletMove(immediate = false) {
      if (!immediate && !getValueConfig(enumOptions.UltrabulletEnabled)) {
        return;
      }
      if (!this.topMoves || this.topMoves.length === 0) {
        return;
      }
      let fen;
      let sideToMove;
      let playingAs;
      let isMyTurn;
      try {
        fen = this.BetterMintmaster.game.controller.getFEN();
        if (!fen) {
          return;
        }
        sideToMove = fen.split(" ")[1];
        playingAs = this.BetterMintmaster.game.controller.getPlayingAs();
        isMyTurn = playingAs === 1 && sideToMove === "w" || playingAs === 2 && sideToMove === "b";
      } catch (error) {
        return;
      }
      if (!isMyTurn) {
        return;
      }
      if (this.ultrabulletMoveTimer !== null) {
        clearTimeout(this.ultrabulletMoveTimer);
        this.ultrabulletMoveTimer = null;
      }
      if (this._lefongTrapPending) {
        try {
          const pendingTrap = this._lefongTrapPending;
          const attackerPiece = this._getPieceAt(fen, pendingTrap.attackerSquare);
          const attackerIsMine = !!attackerPiece && (playingAs === 1 ? attackerPiece === attackerPiece.toUpperCase() : attackerPiece === attackerPiece.toLowerCase());
          const pieceAtTarget = this._getPieceAt(fen, pendingTrap.targetSquare);
          const targetStillThere = !!pieceAtTarget && pieceAtTarget.toLowerCase() === pendingTrap.targetPiece;
          let trapMove = null;
          if (attackerIsMine && targetStillThere) {
            const legalMoves = this.BetterMintmaster.game.controller.getLegalMoves();
            const legalTrapMove = legalMoves && legalMoves.find(
              (legal) => legal.from === pendingTrap.attackerSquare && legal.to === pendingTrap.targetSquare
            );
            if (legalTrapMove) {
              try {
                const chess = new Chess(fen);
                const legalByChess = chess.moves({
                  verbose: true
                }).some(
                  (vm) => vm.from === pendingTrap.attackerSquare && vm.to === pendingTrap.targetSquare
                );
                if (legalByChess) {
                  trapMove = legalTrapMove;
                }
              } catch (error) {
              }
            }
          }
          this._lefongTrapPending = null;
          if (trapMove) {
            const moveData = Object.assign({}, trapMove);
            moveData.userGenerated = true;
            this.BetterMintmaster.game.controller.move(moveData);
            return;
          }
        } catch (error) {
          console.warn("[Ultrabullet] Lefong Trap Follow-Up hatas\u0131:", error);
          this._lefongTrapPending = null;
        }
      }
      try {
        const openingKey = getValueConfig(enumOptions.UltrabulletOpeningPreference) || "none";
        const openingLine = ULTRABULLET_OPENING_BOOK[openingKey];
        if (openingLine) {
          const lineMoves = playingAs === 1 ? openingLine.white : openingLine.black;
          const fullmoveNumber = parseInt(fen.split(" ")[5], 10) || 1;
          const moveIndex = fullmoveNumber - 1;
          if (moveIndex >= 0 && moveIndex < lineMoves.length) {
            const bookMove = lineMoves[moveIndex];
            let isLegal = false;
            try {
              const chess = new Chess(fen);
              isLegal = chess.moves({
                verbose: true
              }).some((vm) => vm.from === bookMove.from && vm.to === bookMove.to);
            } catch (error) {
              isLegal = false;
            }
            if (isLegal) {
              this.ultrabulletMoveTimer = setTimeout(() => {
                this.ultrabulletMoveTimer = null;
                const moveData = {
                  from: bookMove.from,
                  to: bookMove.to
                };
                this._playMoveApi(moveData);
              }, 0);
              return;
            }
          } else if (openingLine.mateFollowUp && moveIndex === lineMoves.length && this.topMoves && this.topMoves.length > 0 && this.topMoves[0].mate === 1) {
            this.ultrabulletMoveTimer = setTimeout(() => {
              this.ultrabulletMoveTimer = null;
              this.playBestMove();
            }, 0);
            return;
          }
        }
      } catch (error) {
        console.warn("[Ultrabullet] Opening Preference hatas\u0131:", error);
      }
      try {
        if (getValueConfig(enumOptions.UltrabulletReactToCheck)) {
          let inCheck = false;
          try {
            const chess = new Chess(fen);
            inCheck = chess.isCheck();
          } catch (error) {
            inCheck = false;
          }
          if (inCheck) {
            const checkDelay = Math.floor(Math.random() * 401) + 400;
            this.ultrabulletMoveTimer = setTimeout(() => {
              this.ultrabulletMoveTimer = null;
              this.playBestMove();
            }, checkDelay);
            return;
          }
        }
      } catch (error) {
        console.warn("[Ultrabullet] React To Check hatas\u0131:", error);
      }
      let followThroughAttack = false;
      try {
        if (getValueConfig(enumOptions.UltrabulletFollowThroughAttack) && this.topMoves && this.topMoves.length > 0) {
          const fullLine = this.BetterMintmaster.game.controller.getCurrentFullLine ? this.BetterMintmaster.game.controller.getCurrentFullLine() : null;
          if (fullLine && fullLine.length >= 2) {
            const prevOwnMove = fullLine[fullLine.length - 2];
            const topMove = this.topMoves[0];
            if (prevOwnMove && topMove && topMove.from === prevOwnMove.to) {
              const opponentSquares = this._getOpponentSquares(fen, playingAs);
              if (opponentSquares.has(topMove.to)) {
                followThroughAttack = true;
              }
            }
          }
        }
      } catch (error) {
        console.warn("[Ultrabullet] Follow Through Attack hatas\u0131:", error);
      }
      let lefongTriggered = false;
      let lefongChoice = null;
      try {
        let inBookLine = false;
        const openingKey = getValueConfig(enumOptions.UltrabulletOpeningPreference) || "none";
        const openingLine = ULTRABULLET_OPENING_BOOK[openingKey];
        if (openingLine) {
          const lineMoves = playingAs === 1 ? openingLine.white : openingLine.black;
          const fullmoveNumber = parseInt(fen.split(" ")[5], 10) || 1;
          inBookLine = fullmoveNumber - 1 < lineMoves.length;
        }
        const ownMoveNumber = this._getOwnMoveNumber(fen, playingAs);
        if (!followThroughAttack && !inBookLine && !this._lefongTrapPending && ownMoveNumber > ULTRABULLET_CHANCE_LOCK_MOVES) {
          const lefongChancePct = parseInt(getValueConfig(enumOptions.UltrabulletLefongTrapChance)) || 0;
          if (lefongChancePct > 0) {
            const legalMoves = this.BetterMintmaster.game.controller.getLegalMoves();
            if (legalMoves && legalMoves.length > 0) {
              let legalUciSet = null;
              try {
                const chess = new Chess(fen);
                legalUciSet = new Set(
                  chess.moves({
                    verbose: true
                  }).map((vm) => vm.from + vm.to)
                );
              } catch (error) {
                legalUciSet = null;
              }
              const boardPart = fen.split(" ")[0];
              const board = [];
              for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
                board.push(new Array(8).fill(null));
              }
              let curRank = 7;
              let curCol = 0;
              for (const ch of boardPart) {
                if (ch === "/") {
                  curRank--;
                  curCol = 0;
                } else if (ch >= "1" && ch <= "8") {
                  curCol += parseInt(ch);
                } else {
                  board[curRank][curCol] = ch;
                  curCol++;
                }
              }
              const enemyKingChar = sideToMove === "w" ? "k" : "K";
              let kingFile = -1;
              let kingRank = -1;
              kingSearch: for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                  if (board[r][c] === enemyKingChar) {
                    kingRank = r;
                    kingFile = c;
                    break kingSearch;
                  }
                }
              }
              const valuableSquares = this._getValuablePieceSquares(
                fen,
                playingAs
              );
              const trapsByType = {
                q: [],
                r: [],
                b: [],
                n: []
              };
              for (const legal of legalMoves) {
                if (!legalUciSet || !legalUciSet.has(legal.from + legal.to)) {
                  continue;
                }
                const fromFile = legal.from.charCodeAt(0) - 97;
                const fromRank = parseInt(legal.from[1]) - 1;
                const attackerPiece = board[fromRank] ? board[fromRank][fromFile] : null;
                if (!attackerPiece) {
                  continue;
                }
                const attackerType = attackerPiece.toLowerCase();
                if (!LEFONG_TRAP_ATTACKER_TYPES.includes(attackerType)) {
                  continue;
                }
                const toFile = legal.to.charCodeAt(0) - 97;
                const toRank = parseInt(legal.to[1]) - 1;
                if (kingFile !== -1 && this._squareIsAttackedBy(
                  attackerPiece,
                  toFile,
                  toRank,
                  kingFile,
                  kingRank,
                  board
                )) {
                  continue;
                }
                for (const [targetSquare, targetType] of valuableSquares) {
                  if (targetSquare === legal.to) {
                    continue;
                  }
                  if (LEFONG_TRAP_VALUE[targetType] < LEFONG_TRAP_VALUE[attackerType]) {
                    continue;
                  }
                  const targetFile = targetSquare.charCodeAt(0) - 97;
                  const targetRank = parseInt(targetSquare[1]) - 1;
                  if (this._squareIsAttackedBy(
                    attackerPiece,
                    toFile,
                    toRank,
                    targetFile,
                    targetRank,
                    board
                  )) {
                    trapsByType[targetType].push({
                      move: legal,
                      targetSquare,
                      targetType
                    });
                  }
                }
              }
              const availableTypes = Object.keys(trapsByType).filter(
                (type) => trapsByType[type].length > 0
              );
              if (availableTypes.length > 0) {
                const totalWeight = availableTypes.reduce(
                  (totalWeight2, type) => totalWeight2 + LEFONG_TRAP_PIECE_WEIGHTS[type],
                  0
                );
                let roll = Math.random() * totalWeight;
                let chosenType = availableTypes[availableTypes.length - 1];
                for (const type of availableTypes) {
                  if (roll < LEFONG_TRAP_PIECE_WEIGHTS[type]) {
                    chosenType = type;
                    break;
                  }
                  roll -= LEFONG_TRAP_PIECE_WEIGHTS[type];
                }
                const typeTraps = trapsByType[chosenType];
                const chosenTrap = typeTraps[Math.floor(Math.random() * typeTraps.length)];
                if (Math.random() * 100 < lefongChancePct) {
                  lefongTriggered = true;
                  lefongChoice = chosenTrap;
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn("[Ultrabullet] Lefong Trap Trigger hatas\u0131:", error);
      }
      let checkMoveTriggered = false;
      try {
        const ownMoveNumber = this._getOwnMoveNumber(fen, playingAs);
        if (!followThroughAttack && !lefongTriggered && ownMoveNumber > ULTRABULLET_CHANCE_LOCK_MOVES) {
          const checkChancePct = parseInt(getValueConfig(enumOptions.UltrabulletCheckmoveChance)) || 0;
          if (checkChancePct > 0 && Math.random() * 100 < checkChancePct) {
            checkMoveTriggered = true;
          }
        }
      } catch (error) {
        console.warn("[Ultrabullet] Checkmove Chance hatas\u0131:", error);
      }
      let recaptureTriggered = false;
      try {
        const ownMoveNumber = this._getOwnMoveNumber(fen, playingAs);
        if (!followThroughAttack && !lefongTriggered && !checkMoveTriggered && ownMoveNumber > ULTRABULLET_CHANCE_LOCK_MOVES) {
          const recaptureSquare = this._getRecaptureSquare(playingAs);
          if (recaptureSquare && this.topMoves && this.topMoves.length > 0) {
            const topMove = this.topMoves[0];
            const isRecaptureMove = (tm) => tm.to === recaptureSquare;
            if (isRecaptureMove(topMove)) {
              recaptureTriggered = true;
              const ignoreChancePct = parseInt(
                getValueConfig(enumOptions.UltrabulletIgnoreRecapture)
              ) || 0;
              if (ignoreChancePct > 0 && Math.random() * 100 < ignoreChancePct) {
                const alternative = this.topMoves.find(
                  (tm) => !isRecaptureMove(tm)
                );
                if (alternative) {
                  this.topMoves = [
                    alternative,
                    ...this.topMoves.filter((tm) => tm !== alternative)
                  ];
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn("[Ultrabullet] Ignore Recapture hatas\u0131:", error);
      }
      try {
        const ownMoveNumber = this._getOwnMoveNumber(fen, playingAs);
        if (!followThroughAttack && !lefongTriggered && !checkMoveTriggered && !recaptureTriggered && ownMoveNumber > ULTRABULLET_CHANCE_LOCK_MOVES) {
          const ignoreCapturesPct = parseInt(getValueConfig(enumOptions.UltrabulletIgnoreCaptures)) || 0;
          if (ignoreCapturesPct > 0 && this.topMoves && this.topMoves.length > 0) {
            const lastMove = this.BetterMintmaster.game.controller.getLastMove();
            if (lastMove && lastMove.to) {
              const isOpponentMove = !this.lastOpponentMoves.some(
                (tracked) => tracked.from === lastMove.from && tracked.to === lastMove.to
              );
              if (isOpponentMove) {
                const captureSquare = lastMove.to;
                const targetsCaptureSquare = (tm) => tm.to === captureSquare;
                const topMove = this.topMoves[0];
                if (targetsCaptureSquare(topMove) && Math.random() * 100 < ignoreCapturesPct) {
                  const alternative = this.topMoves.find(
                    (tm) => !targetsCaptureSquare(tm)
                  );
                  if (alternative) {
                    this.topMoves = [
                      alternative,
                      ...this.topMoves.filter((tm) => tm !== alternative)
                    ];
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn("[Ultrabullet] Overlook Blunders hatas\u0131:", error);
      }
      let moveDelay;
      try {
        const noOpeningPref = (getValueConfig(enumOptions.UltrabulletOpeningPreference) || "none") === "none";
        if (noOpeningPref) {
          if (this._lastOwnMoveWasBookFallback === true) {
            moveDelay = Math.floor(Math.random() * 201) + 100;
          } else {
            const ownMoveNumber = this._getOwnMoveNumber(fen, playingAs);
            if (ownMoveNumber <= 10 && this.topMoves && this.topMoves.length > 0) {
              const opponentSquares = this._getOpponentSquares(fen, playingAs);
              const attacksOpponent = opponentSquares.has(this.topMoves[0].to);
              moveDelay = attacksOpponent ? Math.floor(Math.random() * 301) + 200 : Math.floor(Math.random() * 201) + 100;
            }
          }
        }
      } catch (error) {
        console.warn("[Ultrabullet OpeningBook] Move Timing hatas\u0131:", error);
        moveDelay = void 0;
      }
      try {
        const flagModeEnabled = getValueConfig(
          enumOptions.UltrabulletFlagModeEnabled
        );
        const clockSeconds = this.getMyClockSeconds();
        const clockAtZero = flagModeEnabled && clockSeconds !== null && clockSeconds === 0;
        if (clockAtZero && this.topMoves && this.topMoves.length > 0) {
          const opponentSquares = this._getOpponentSquares(fen, playingAs);
          const attacksOpponent = opponentSquares.has(this.topMoves[0].to);
          const [delayMin, delayMax] = attacksOpponent ? [100, 300] : [0, 200];
          moveDelay = Math.floor(Math.random() * (delayMax - delayMin + 1)) + delayMin;
        }
      } catch (error) {
        console.warn("[Ultrabullet FlagMode] Move Timing hatas\u0131:", error);
        moveDelay = void 0;
      }
      if (moveDelay === void 0) {
        const minDelay = parseInt(getValueConfig(enumOptions.UltrabulletMin)) || 0;
        const maxDelay = parseInt(getValueConfig(enumOptions.UltrabulletMax)) || 0;
        moveDelay = minDelay >= maxDelay ? minDelay : Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
      }
      if (immediate) {
        moveDelay = 0;
      }
      this.ultrabulletMoveTimer = setTimeout(() => {
        this.ultrabulletMoveTimer = null;
        if (lefongTriggered && lefongChoice) {
          try {
            const fen2 = this.BetterMintmaster.game.controller.getFEN();
            const legalMoves = this.BetterMintmaster.game.controller.getLegalMoves();
            const legalTrapMove = legalMoves && legalMoves.find(
              (legal) => legal.from === lefongChoice.move.from && legal.to === lefongChoice.move.to
            );
            let legalByChess = false;
            if (legalTrapMove && fen2) {
              try {
                const chess = new Chess(fen2);
                legalByChess = chess.moves({
                  verbose: true
                }).some(
                  (vm) => vm.from === lefongChoice.move.from && vm.to === lefongChoice.move.to
                );
              } catch (error) {
                legalByChess = false;
              }
            }
            if (legalByChess) {
              const pendingTrap = {
                attackerSquare: lefongChoice.move.to,
                targetSquare: lefongChoice.targetSquare,
                targetPiece: lefongChoice.targetType
              };
              this._lefongTrapPending = pendingTrap;
              const moveData = Object.assign({}, legalTrapMove);
              moveData.userGenerated = true;
              this.BetterMintmaster.game.controller.move(moveData);
            } else {
              this.playBestMove();
            }
          } catch (error) {
            console.warn(
              "[Ultrabullet] Lefong Trap Trigger oynama hatas\u0131:",
              error
            );
            this.playBestMove();
          }
        } else if (checkMoveTriggered) {
          const played = this.playCheckMove();
          if (!played) {
            this.playBestMove();
          }
        } else {
          this.playBestMove();
        }
      }, moveDelay);
    }
    // Schedules the auto-move with a humanized delay (Box-Muller noise around the
    // min/max midpoint, shaped by the center-weight setting; flag/simulate branches).
    scheduleAutoMove() {
      if (!getValueConfig(enumOptions.AutoMoveEnabled)) {
        return;
      }
      if (!this.topMoves || this.topMoves.length === 0) {
        return;
      }
      try {
        const fen = this.BetterMintmaster.game.controller.getFEN();
        if (!fen) {
          return;
        }
        const sideToMove = fen.split(" ")[1];
        const playingAs = this.BetterMintmaster.game.controller.getPlayingAs();
        const isMyTurn = playingAs === 1 && sideToMove === "w" || playingAs === 2 && sideToMove === "b";
        if (!isMyTurn) {
          return;
        }
      } catch (error) {
        return;
      }
      if (this.autoMoveTimer !== null) {
        clearTimeout(this.autoMoveTimer);
        this.autoMoveTimer = null;
      }
      const TIMING_PROFILES = {
        bullet: {
          flagCriticalNormal: [0, 300],
          flagCriticalCapture: [500, 800],
          flagOnFlagNormal: [0, 500],
          flagOnFlagCapture: [500, 800],
          fastSimple: [0, 600],
          mateFirst: [3500, 5e3],
          mateFirstFlag: [1500, 2500],
          mateCont: [0, 500],
          blunderReact: [3500, 5500]
        },
        blitz: {
          flagCriticalNormal: [0, 300],
          flagCriticalCapture: [500, 800],
          flagOnFlagNormal: [0, 500],
          flagOnFlagCapture: [500, 800],
          fastSimple: [0, 900],
          mateFirst: [5500, 10500],
          mateFirstFlag: [1500, 2500],
          mateCont: [0, 800],
          blunderReact: [3500, 8500]
        }
      };
      const profileName = getValueConfig(enumOptions.SmartTimingProfile) || "bullet";
      const profile = TIMING_PROFILES[profileName] || TIMING_PROFILES.bullet;
      const blunderReactEnabled = getValueConfig(enumOptions.BlunderReactEnabled);
      if (blunderReactEnabled && getValueConfig(enumOptions.AutoMoveEnabled)) {
        const flagModeEnabled2 = getValueConfig(enumOptions.FlagModeEnabled);
        const clockSeconds2 = this.getMyClockSeconds();
        const flagCritical = flagModeEnabled2 && clockSeconds2 !== null && clockSeconds2 <= 10;
        const currentCp = this.lastStockfishCp !== null ? this.lastStockfishCp : this.topMoves[0]?.cp;
        if (currentCp !== void 0 && currentCp !== null && Math.abs(currentCp) >= 1100) {
          this.blunderReactEvalDisabled = true;
        }
        if (!flagCritical && !this.blunderReactEvalDisabled) {
          const lastScore = this.opponentLastMoveScore;
          if (lastScore === "Blunder") {
            const minDelay = profile.blunderReact[0];
            const maxDelay = profile.blunderReact[1];
            const blunderDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
            this.autoMoveTimer = setTimeout(() => {
              this.autoMoveTimer = null;
              this.playBestMove();
            }, blunderDelay);
            return;
          }
        } else {
        }
      }
      const simulateMateEnabled = getValueConfig(enumOptions.SimulateCheckmates);
      if (simulateMateEnabled && getValueConfig(enumOptions.AutoMoveEnabled)) {
        const topMove = this.topMoves[0];
        const mateIn = topMove?.mate;
        const flagModeEnabled2 = getValueConfig(enumOptions.FlagModeEnabled);
        const clockSeconds2 = this.getMyClockSeconds();
        const flagCritical = flagModeEnabled2 && clockSeconds2 !== null && clockSeconds2 <= 10;
        if (mateIn !== null && mateIn >= 2 && mateIn <= 3) {
          let mateDelay;
          if (!this.simulateMateActive) {
            this.simulateMateActive = true;
            const minDelay = flagCritical ? profile.mateFirstFlag[0] : profile.mateFirst[0];
            const maxDelay = flagCritical ? profile.mateFirstFlag[1] : profile.mateFirst[1];
            mateDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
          } else if (mateIn < 2 || mateIn > 3) {
            this.simulateMateActive = false;
          } else {
            mateDelay = Math.floor(Math.random() * (profile.mateCont[1] + 1));
          }
          this.autoMoveTimer = setTimeout(() => {
            this.autoMoveTimer = null;
            this.playBestMove();
          }, mateDelay);
          return;
        } else if (mateIn === null || mateIn <= 0) {
          if (this.simulateMateActive) {
            if (mateIn !== null) {
              this.simulateMateActive = false;
            } else {
              const pauseDelay = Math.floor(Math.random() * 501);
              this.autoMoveTimer = setTimeout(() => {
                this.autoMoveTimer = null;
                this.playBestMove();
              }, pauseDelay);
              return;
            }
          }
        }
      }
      const fastSimpleEnabled = getValueConfig(enumOptions.FastSimpleMoves);
      if (fastSimpleEnabled && this.topMoves && this.topMoves.length > 0) {
        const bestMoveUci = this.topMoves[0].move || "";
        const isCastling = ["e1g1", "e1c1", "e8g8", "e8c8"].includes(bestMoveUci);
        const isPromotion = bestMoveUci.length === 5;
        if (isCastling || isPromotion) {
          const fastDelay = Math.floor(
            Math.random() * (profile.fastSimple[1] - profile.fastSimple[0] + 1)
          ) + profile.fastSimple[0];
          this.autoMoveTimer = setTimeout(() => {
            this.autoMoveTimer = null;
            this.playBestMove();
          }, fastDelay);
          return;
        }
      }
      const flagModeEnabled = getValueConfig(enumOptions.FlagModeEnabled);
      let autoMoveDelay;
      const clockSeconds = this.getMyClockSeconds();
      if (flagModeEnabled && clockSeconds !== null && clockSeconds <= 5) {
        const flagProfile = {
          depth: 3,
          personality: "Beginner",
          delayMin: profile.flagCriticalNormal[0],
          delayMax: profile.flagCriticalNormal[1]
        };
        this.applyFlagProfile(flagProfile);
        autoMoveDelay = Math.floor(
          Math.random() * (profile.flagCriticalNormal[1] - profile.flagCriticalNormal[0] + 1)
        ) + profile.flagCriticalNormal[0];
        try {
          const fen = this.BetterMintmaster.game.controller.getFEN();
          if (fen && this.topMoves && this.topMoves.length > 0) {
            const playingAs = this.BetterMintmaster.game.controller.getPlayingAs();
            const boardPart = fen.split(" ")[0];
            const rows = boardPart.split("/");
            const opponentSquares = /* @__PURE__ */ new Set();
            for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
              let col = 0;
              for (const ch of rows[rankIdx]) {
                if (ch >= "1" && ch <= "8") {
                  col += parseInt(ch);
                } else {
                  const isOpponentPiece = playingAs === 1 ? ch === ch.toLowerCase() : ch === ch.toUpperCase();
                  if (isOpponentPiece) {
                    const fileChar = String.fromCharCode("a".charCodeAt(0) + col);
                    const rankStr = String(8 - rankIdx);
                    opponentSquares.add(fileChar + rankStr);
                  }
                  col++;
                }
              }
            }
            const targetsOpponent = (tm) => opponentSquares.has(tm.to);
            const topMove = this.topMoves[0];
            if (targetsOpponent(topMove) && Math.random() < 0.5) {
              const alternative = this.topMoves.find(
                (tm) => !targetsOpponent(tm)
              );
              if (alternative) {
                const originalOrder = this.topMoves;
                this.topMoves = [
                  alternative,
                  ...originalOrder.filter((tm) => tm !== alternative)
                ];
                const restoreTimer = setTimeout(() => {
                  this.topMoves = originalOrder;
                }, 1e3);
              } else {
              }
            }
          }
        } catch (error) {
          console.warn("[FlagMode] Capture s\u0131n\u0131r\u0131 hatas\u0131:", error);
        }
        try {
          if (this.topMoves && this.topMoves.length > 0) {
            const fen = this.BetterMintmaster.game.controller.getFEN();
            if (fen) {
              const playingAs = this.BetterMintmaster.game.controller.getPlayingAs();
              const boardPart = fen.split(" ")[0];
              const rows = boardPart.split("/");
              const opponentSquares = /* @__PURE__ */ new Set();
              for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
                let col = 0;
                for (const ch of rows[rankIdx]) {
                  if (ch >= "1" && ch <= "8") {
                    col += parseInt(ch);
                  } else {
                    const isOpponentPiece = playingAs === 1 ? ch === ch.toLowerCase() : ch === ch.toUpperCase();
                    if (isOpponentPiece) {
                      const fileChar = String.fromCharCode(
                        "a".charCodeAt(0) + col
                      );
                      const rankStr = String(8 - rankIdx);
                      opponentSquares.add(fileChar + rankStr);
                    }
                    col++;
                  }
                }
              }
              if (opponentSquares.has(this.topMoves[0].to)) {
                autoMoveDelay = Math.floor(
                  Math.random() * (profile.flagCriticalCapture[1] - profile.flagCriticalCapture[0] + 1)
                ) + profile.flagCriticalCapture[0];
              }
            }
          }
        } catch (error) {
          console.warn("[FlagMode] Capture delay hatas\u0131 (5s):", error);
        }
      } else if (flagModeEnabled && clockSeconds !== null && clockSeconds <= 10) {
        const flagProfile = {
          depth: 3,
          personality: "Human",
          delayMin: profile.flagOnFlagNormal[0],
          delayMax: profile.flagOnFlagNormal[1]
        };
        this.applyFlagProfile(flagProfile);
        let isCapture = false;
        try {
          const fen = this.BetterMintmaster.game.controller.getFEN();
          if (fen && this.topMoves && this.topMoves.length > 0) {
            const playingAs = this.BetterMintmaster.game.controller.getPlayingAs();
            const boardPart = fen.split(" ")[0];
            const rows = boardPart.split("/");
            const opponentSquares = /* @__PURE__ */ new Set();
            for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
              let col = 0;
              for (const ch of rows[rankIdx]) {
                if (ch >= "1" && ch <= "8") {
                  col += parseInt(ch);
                } else {
                  const isOpponentPiece = playingAs === 1 ? ch === ch.toLowerCase() : ch === ch.toUpperCase();
                  if (isOpponentPiece) {
                    const fileChar = String.fromCharCode("a".charCodeAt(0) + col);
                    const rankStr = String(8 - rankIdx);
                    opponentSquares.add(fileChar + rankStr);
                  }
                  col++;
                }
              }
            }
            isCapture = opponentSquares.has(this.topMoves[0].to);
          }
        } catch (error) {
          console.warn("[FlagMode] Capture kontrol hatas\u0131 (10s):", error);
        }
        if (isCapture) {
          autoMoveDelay = Math.floor(
            Math.random() * (profile.flagOnFlagCapture[1] - profile.flagOnFlagCapture[0] + 1)
          ) + profile.flagOnFlagCapture[0];
        } else {
          autoMoveDelay = Math.floor(
            Math.random() * (profile.flagOnFlagNormal[1] - profile.flagOnFlagNormal[0] + 1)
          ) + profile.flagOnFlagNormal[0];
        }
      } else if (fastSimpleEnabled && this.isInTheory) {
        this.restoreNormalProfile();
        autoMoveDelay = Math.floor(
          Math.random() * (profile.fastSimple[1] - profile.fastSimple[0] + 1)
        ) + profile.fastSimple[0];
      } else {
        this.restoreNormalProfile();
        const minDelay = parseInt(getValueConfig(enumOptions.AutoMoveMin)) || 0;
        const maxDelay = parseInt(getValueConfig(enumOptions.AutoMoveMax)) || 0;
        if (minDelay >= maxDelay) {
          autoMoveDelay = minDelay;
        } else {
          const centerWeight = parseInt(getValueConfig(enumOptions.AutoMoveCenterWeight)) || 1;
          if (centerWeight <= 1) {
            autoMoveDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
          } else {
            const mean = (minDelay + maxDelay) / 2;
            const sigma = (maxDelay - minDelay) / (2 + centerWeight * 1.2);
            let u;
            let v;
            let s;
            do {
              u = Math.random() * 2 - 1;
              v = Math.random() * 2 - 1;
              s = u * u + v * v;
            } while (s >= 1 || s === 0);
            autoMoveDelay = Math.round(
              mean + u * Math.sqrt(Math.log(s) * -2 / s) * sigma
            );
            autoMoveDelay = Math.max(minDelay, Math.min(maxDelay, autoMoveDelay));
          }
        }
      }
      this.autoMoveTimer = setTimeout(() => {
        this.autoMoveTimer = null;
        this.playBestMove();
      }, autoMoveDelay);
    }
    // Converts an algebraic square to pixel coordinates on the chess.com board.
    squareToPixel(square, boardEl) {
      const fileIdx = square.charCodeAt(0) - 97;
      const rankIdx = parseInt(square[1]) - 1;
      const rect = boardEl.getBoundingClientRect();
      const squareSize = rect.width / 8;
      const flipped = boardEl.classList.contains("flipped");
      const visualFile = flipped ? 7 - fileIdx : fileIdx;
      const visualRank = flipped ? rankIdx : 7 - rankIdx;
      const pixel = {
        x: rect.left + visualFile * squareSize + squareSize / 2,
        y: rect.top + visualRank * squareSize + squareSize / 2
      };
      return pixel;
    }
    // Dispatches a synthetic pointer event at page coordinates (move input fallback).
    firePointer(target, type, clientX, clientY) {
      const eventInit = {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY,
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true
      };
      target.dispatchEvent(new PointerEvent(type, eventInit));
    }
    // Plays a move by simulating mouse press/move/release on the board squares.
    playMoveByClick(from, to, promotion) {
      if (promotion) {
        return false;
      }
      const boardEl = document.querySelector("wc-chess-board");
      if (!boardEl) {
        console.error(
          "[Asina][playMoveByClick] wc-chess-board elementi bulunamad\u0131!"
        );
        return false;
      }
      const fromPixel = this.squareToPixel(from, boardEl);
      const toPixel = this.squareToPixel(to, boardEl);
      const clickDelay = Math.floor(Math.random() * 31) + 10;
      this.firePointer(boardEl, "pointerdown", fromPixel.x, fromPixel.y);
      this.firePointer(boardEl, "pointerup", fromPixel.x, fromPixel.y);
      return new Promise((resolve) => {
        setTimeout(() => {
          this.firePointer(boardEl, "pointerdown", toPixel.x, toPixel.y);
          this.firePointer(boardEl, "pointerup", toPixel.x, toPixel.y);
          resolve(true);
        }, clickDelay);
      });
    }
    // Plays the engine's best move: picks the input method (site API or synthetic
    // click), applies promotion, and records the move for premove/flag logic.
    playBestMove() {
      try {
        try {
          if (!this.openingMovePlayed) {
            const fen2 = this.BetterMintmaster.game.controller.getFEN();
            if (fen2) {
              const fenParts = fen2.split(" ");
              const sideToMove2 = fenParts[1];
              const fullmoveNumber = parseInt(fenParts[5], 10);
              const playingAs2 = this.BetterMintmaster.game.controller.getPlayingAs();
              if (sideToMove2 === "w" && fullmoveNumber === 1 && playingAs2 === 1) {
                const whitePref1 = getValueConfig("option-opening-white-1") || "none";
                const whitePref2 = getValueConfig("option-opening-white-2") || "none";
                let chosenOpening = null;
                if (whitePref1 !== "none" && OPENING_BOOK.white[whitePref1]) {
                  chosenOpening = whitePref1;
                } else if (whitePref2 !== "none" && OPENING_BOOK.white[whitePref2]) {
                  chosenOpening = whitePref2;
                }
                if (chosenOpening) {
                  const openingEntry = OPENING_BOOK.white[chosenOpening];
                  const moveData = {
                    from: openingEntry.from,
                    to: openingEntry.to
                  };
                  this._playMoveApi(moveData);
                  this.openingMovePlayed = true;
                  return;
                } else {
                }
              } else if (sideToMove2 === "b" && fullmoveNumber === 1 && playingAs2 === 2) {
                let firstOpponentMove = null;
                try {
                  const fullLine = this.BetterMintmaster.game.controller.getCurrentFullLine ? this.BetterMintmaster.game.controller.getCurrentFullLine() : null;
                  if (fullLine && fullLine.length > 0 && fullLine[0] && fullLine[0].from && fullLine[0].to) {
                    firstOpponentMove = fullLine[0].from + fullLine[0].to;
                  } else {
                    console.log(
                      "[OpeningPref] getCurrentFullLine() bo\u015F veya null, conditional kontrol atlan\u0131yor"
                    );
                  }
                } catch (error) {
                  console.error(
                    "[OpeningPref] HATA: getCurrentFullLine eri\u015Filemedi \u2192",
                    error
                  );
                }
                const blackPref1 = getValueConfig("option-opening-black-1") || "none";
                const blackPref2 = getValueConfig("option-opening-black-2") || "none";
                const resolveOpening = (openingName) => {
                  if (openingName === "none" || !OPENING_BOOK.black[openingName]) {
                    return null;
                  }
                  const openingEntry = OPENING_BOOK.black[openingName];
                  if (openingEntry.type === "unconditional") {
                    return openingEntry;
                  }
                  if (openingEntry.type === "conditional") {
                    if (!firstOpponentMove) {
                      return null;
                    }
                    const triggerMatches = firstOpponentMove === openingEntry.trigger;
                    if (triggerMatches) {
                      return openingEntry;
                    } else {
                      return null;
                    }
                  }
                  return null;
                };
                let chosenOpening = resolveOpening(blackPref1);
                if (!chosenOpening && blackPref2 !== "none") {
                  chosenOpening = resolveOpening(blackPref2);
                }
                if (chosenOpening) {
                  const moveData = {
                    from: chosenOpening.from,
                    to: chosenOpening.to
                  };
                  this._playMoveApi(moveData);
                  this.openingMovePlayed = true;
                  return;
                } else {
                }
              }
            }
          }
        } catch (error) {
          console.error("[OpeningPref] HATA: intercept ba\u015Far\u0131s\u0131z \u2192", error);
        }
        if (!this.topMoves || this.topMoves.length === 0) {
          return;
        }
        const topMove = this.topMoves[0];
        if (!topMove || !topMove.from || !topMove.to) {
          return;
        }
        const fen = this.BetterMintmaster.game.controller.getFEN();
        if (!fen) {
          return;
        }
        const sideToMove = fen.split(" ")[1];
        const playingAs = this.BetterMintmaster.game.controller.getPlayingAs();
        const isMyTurn = playingAs === 1 && sideToMove === "w" || playingAs === 2 && sideToMove === "b";
        if (!isMyTurn) {
          return;
        }
        const moveMethod = getValueConfig(enumOptions.MoveMethod);
        if (moveMethod === "clicksim") {
          if (topMove.promotion) {
            this._playMoveApi(topMove);
          } else {
            this.playMoveByClick(
              topMove.from,
              topMove.to,
              topMove.promotion
            ).catch(() => this._playMoveApi(topMove));
          }
        } else {
          this._playMoveApi(topMove);
        }
      } catch (error) {
        console.error("[Asina] playBestMove error:", error);
      }
    }
    // Plays a move through chess.com's own page API (the safe, non-synthetic path).
    _playMoveApi(moveData) {
      try {
        const legalMoves = this.BetterMintmaster.game.controller.getLegalMoves();
        if (!legalMoves || legalMoves.length === 0) {
          return;
        }
        const legalMove = legalMoves.find(
          (legal) => legal.from === moveData.from && legal.to === moveData.to
        );
        if (!legalMove) {
          console.warn(
            "[Asina][_playMoveApi] moveData bulunamad\u0131: " + moveData.from + "\u2192" + moveData.to
          );
          return;
        }
        legalMove.userGenerated = true;
        if (moveData.promotion) {
          legalMove.promotion = moveData.promotion;
        }
        this.BetterMintmaster.game.controller.move(legalMove);
      } catch (error) {
        console.error("[Asina] _playMoveApi error:", error);
      }
    }
    // Tests whether the piece at a square attacks the enemy king (check-move play).
    _doesPieceGiveCheck(fen, square, playingAs) {
      try {
        const boardPart = fen.split(" ")[0];
        const board = [];
        for (let rankIdx2 = 0; rankIdx2 < 8; rankIdx2++) {
          board.push(new Array(8).fill(null));
        }
        let curRank = 7;
        let curCol = 0;
        for (const ch of boardPart) {
          if (ch === "/") {
            curRank--;
            curCol = 0;
          } else if (ch >= "1" && ch <= "8") {
            curCol += parseInt(ch);
          } else {
            board[curRank][curCol] = ch;
            curCol++;
          }
        }
        const fileIdx = square.charCodeAt(0) - "a".charCodeAt(0);
        const rankIdx = parseInt(square[1]) - 1;
        const pieceChar = board[rankIdx][fileIdx];
        if (!pieceChar) {
          return false;
        }
        const enemyKingChar = playingAs === 1 ? "k" : "K";
        let kingFile = -1;
        let kingRank = -1;
        kingSearch: for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            if (board[r][c] === enemyKingChar) {
              kingRank = r;
              kingFile = c;
              break kingSearch;
            }
          }
        }
        if (kingFile === -1) {
          return false;
        }
        const pathIsClear = (fromFile, fromRank, toFile, toRank) => {
          const fileStep = toFile === fromFile ? 0 : toFile > fromFile ? 1 : -1;
          const rankStep = toRank === fromRank ? 0 : toRank > fromRank ? 1 : -1;
          let curFile = fromFile + fileStep;
          let curRank2 = fromRank + rankStep;
          while (curFile !== toFile || curRank2 !== toRank) {
            if (board[curRank2][curFile] !== null) {
              return false;
            }
            curFile += fileStep;
            curRank2 += rankStep;
          }
          return true;
        };
        const pieceType = pieceChar.toLowerCase();
        const fileDist = Math.abs(fileIdx - kingFile);
        const rankDist = Math.abs(rankIdx - kingRank);
        if (pieceType === "n") {
          return fileDist === 1 && rankDist === 2 || fileDist === 2 && rankDist === 1;
        }
        if (pieceType === "b") {
          return fileDist === rankDist && fileDist !== 0 && pathIsClear(fileIdx, rankIdx, kingFile, kingRank);
        }
        if (pieceType === "r") {
          return (fileDist === 0 || rankDist === 0) && fileDist + rankDist !== 0 && pathIsClear(fileIdx, rankIdx, kingFile, kingRank);
        }
        if (pieceType === "q") {
          const diagonal = fileDist === rankDist && fileDist !== 0;
          const straight = (fileDist === 0 || rankDist === 0) && fileDist + rankDist !== 0;
          return (diagonal || straight) && pathIsClear(fileIdx, rankIdx, kingFile, kingRank);
        }
        if (pieceType === "p") {
          if (playingAs === 1) {
            return rankDist === 1 && fileDist === 1 && kingRank > rankIdx;
          } else {
            return rankDist === 1 && fileDist === 1 && kingRank < rankIdx;
          }
        }
        return false;
      } catch (error) {
        return false;
      }
    }
    // Plays the pending Lefong-trap move: offers bait, punishes greedy captures
    // (planned by _getValuablePieceSquares + LICHESS/ULTRABULLET trap data).
    playLefongTrap() {
      try {
        const fen = this.BetterMintmaster.game.controller.getFEN();
        if (!fen) {
          return false;
        }
        const sideToMove = fen.split(" ")[1];
        const playingAs = this.BetterMintmaster.game.controller.getPlayingAs();
        const isMyTurn = playingAs === 1 && sideToMove === "w" || playingAs === 2 && sideToMove === "b";
        if (!isMyTurn) {
          return false;
        }
        if (this._lefongTrapPending) {
          const pendingTrap2 = this._lefongTrapPending;
          const attackerPiece = this._getPieceAt(fen, pendingTrap2.attackerSquare);
          const attackerIsMine = !!attackerPiece && (playingAs === 1 ? attackerPiece === attackerPiece.toUpperCase() : attackerPiece === attackerPiece.toLowerCase());
          const pieceAtTarget = this._getPieceAt(fen, pendingTrap2.targetSquare);
          const targetStillThere = !!pieceAtTarget && pieceAtTarget.toLowerCase() === pendingTrap2.targetPiece;
          let trapMove = null;
          if (attackerIsMine && targetStillThere) {
            const legalMoves2 = this.BetterMintmaster.game.controller.getLegalMoves();
            const legalTrapMove = legalMoves2 && legalMoves2.find(
              (legal) => legal.from === pendingTrap2.attackerSquare && legal.to === pendingTrap2.targetSquare
            );
            if (legalTrapMove) {
              try {
                const chess = new Chess(fen);
                const legalByChess = chess.moves({
                  verbose: true
                }).some(
                  (vm) => vm.from === pendingTrap2.attackerSquare && vm.to === pendingTrap2.targetSquare
                );
                if (legalByChess) {
                  trapMove = legalTrapMove;
                }
              } catch (error) {
              }
            }
          }
          this._lefongTrapPending = null;
          if (trapMove) {
            const moveData2 = Object.assign({}, trapMove);
            moveData2.userGenerated = true;
            this.BetterMintmaster.game.controller.move(moveData2);
            return true;
          }
        }
        const legalMoves = this.BetterMintmaster.game.controller.getLegalMoves();
        if (!legalMoves || legalMoves.length === 0) {
          return false;
        }
        let legalUciSet = null;
        try {
          const chess = new Chess(fen);
          legalUciSet = new Set(
            chess.moves({
              verbose: true
            }).map((vm) => vm.from + vm.to)
          );
        } catch (error) {
          legalUciSet = null;
        }
        if (!legalUciSet) {
          return false;
        }
        const boardPart = fen.split(" ")[0];
        const board = [];
        for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
          board.push(new Array(8).fill(null));
        }
        let curRank = 7;
        let curCol = 0;
        for (const ch of boardPart) {
          if (ch === "/") {
            curRank--;
            curCol = 0;
          } else if (ch >= "1" && ch <= "8") {
            curCol += parseInt(ch);
          } else {
            board[curRank][curCol] = ch;
            curCol++;
          }
        }
        const enemyKingChar = sideToMove === "w" ? "k" : "K";
        let kingFile = -1;
        let kingRank = -1;
        kingSearch: for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            if (board[r][c] === enemyKingChar) {
              kingRank = r;
              kingFile = c;
              break kingSearch;
            }
          }
        }
        const valuableSquares = this._getValuablePieceSquares(fen, playingAs);
        const trapsByType = {
          q: [],
          r: [],
          b: [],
          n: []
        };
        for (const legal of legalMoves) {
          if (!legalUciSet.has(legal.from + legal.to)) {
            continue;
          }
          const fromFile = legal.from.charCodeAt(0) - 97;
          const fromRank = parseInt(legal.from[1]) - 1;
          const attackerPiece = board[fromRank] ? board[fromRank][fromFile] : null;
          if (!attackerPiece) {
            continue;
          }
          const attackerType = attackerPiece.toLowerCase();
          if (!LEFONG_TRAP_ATTACKER_TYPES.includes(attackerType)) {
            continue;
          }
          const toFile = legal.to.charCodeAt(0) - 97;
          const toRank = parseInt(legal.to[1]) - 1;
          if (kingFile !== -1 && this._squareIsAttackedBy(
            attackerPiece,
            toFile,
            toRank,
            kingFile,
            kingRank,
            board
          )) {
            continue;
          }
          for (const [targetSquare, targetType] of valuableSquares) {
            if (targetSquare === legal.to) {
              continue;
            }
            if (LEFONG_TRAP_VALUE[targetType] < LEFONG_TRAP_VALUE[attackerType]) {
              continue;
            }
            const targetFile = targetSquare.charCodeAt(0) - 97;
            const targetRank = parseInt(targetSquare[1]) - 1;
            if (this._squareIsAttackedBy(
              attackerPiece,
              toFile,
              toRank,
              targetFile,
              targetRank,
              board
            )) {
              trapsByType[targetType].push({
                move: legal,
                targetSquare,
                targetType
              });
            }
          }
        }
        const availableTypes = Object.keys(trapsByType).filter(
          (type) => trapsByType[type].length > 0
        );
        if (availableTypes.length === 0) {
          return false;
        }
        const totalWeight = availableTypes.reduce(
          (totalWeight2, type) => totalWeight2 + LEFONG_TRAP_PIECE_WEIGHTS[type],
          0
        );
        let roll = Math.random() * totalWeight;
        let chosenType = availableTypes[availableTypes.length - 1];
        for (const type of availableTypes) {
          if (roll < LEFONG_TRAP_PIECE_WEIGHTS[type]) {
            chosenType = type;
            break;
          }
          roll -= LEFONG_TRAP_PIECE_WEIGHTS[type];
        }
        const typeTraps = trapsByType[chosenType];
        const chosenTrap = typeTraps[Math.floor(Math.random() * typeTraps.length)];
        const moveData = Object.assign({}, chosenTrap.move);
        moveData.userGenerated = true;
        const pendingTrap = {
          attackerSquare: chosenTrap.move.to,
          targetSquare: chosenTrap.targetSquare,
          targetPiece: chosenTrap.targetType
        };
        this._lefongTrapPending = pendingTrap;
        this.BetterMintmaster.game.controller.move(moveData);
        return true;
      } catch (error) {
        console.error("[Asina] playLefongTrap error:", error);
        return false;
      }
    }
    // Plays the best move that gives check (keyboard shortcut action).
    playCheckMove() {
      try {
        if (!getValueConfig(enumOptions.CheckMoveEnabled)) {
          return false;
        }
        const fen = this.BetterMintmaster.game.controller.getFEN();
        if (!fen) {
          return false;
        }
        const sideToMove = fen.split(" ")[1];
        const playingAs = this.BetterMintmaster.game.controller.getPlayingAs();
        const isMyTurn = playingAs === 1 && sideToMove === "w" || playingAs === 2 && sideToMove === "b";
        if (!isMyTurn) {
          return false;
        }
        const boardPart = fen.split(" ")[0];
        const board = [];
        for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
          board.push(new Array(8).fill(null));
        }
        let curRank = 7;
        let curCol = 0;
        for (let ch of boardPart) {
          if (ch === "/") {
            curRank--;
            curCol = 0;
          } else if (ch >= "1" && ch <= "8") {
            curCol += parseInt(ch);
          } else {
            board[curRank][curCol] = ch;
            curCol++;
          }
        }
        const enemyKingChar = sideToMove === "w" ? "k" : "K";
        let kingFile = -1;
        let kingRank = -1;
        kingSearch: for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            if (board[r][c] === enemyKingChar) {
              kingRank = r;
              kingFile = c;
              break kingSearch;
            }
          }
        }
        if (kingFile === -1) {
          return false;
        }
        const pathIsClear = (fromFile, fromRank, toFile, toRank) => {
          const fileStep = toFile === fromFile ? 0 : toFile > fromFile ? 1 : -1;
          const rankStep = toRank === fromRank ? 0 : toRank > fromRank ? 1 : -1;
          let curFile = fromFile + fileStep;
          let curRank2 = fromRank + rankStep;
          while (curFile !== toFile || curRank2 !== toRank) {
            if (board[curRank2][curFile] !== null) {
              return false;
            }
            curFile += fileStep;
            curRank2 += rankStep;
          }
          return true;
        };
        const legalMoves = this.BetterMintmaster.game.controller.getLegalMoves();
        if (!legalMoves || legalMoves.length === 0) {
          return false;
        }
        let checkingMoves = legalMoves.filter((legal) => {
          const toFile = legal.to.charCodeAt(0) - 97;
          const toRank = parseInt(legal.to[1]) - 1;
          const fileDist = Math.abs(toFile - kingFile);
          const rankDist = Math.abs(toRank - kingRank);
          const fromFile = legal.from.charCodeAt(0) - 97;
          const fromRank = parseInt(legal.from[1]) - 1;
          const pieceChar = board[fromRank][fromFile];
          if (!pieceChar) {
            return false;
          }
          const pieceType = pieceChar.toLowerCase();
          let givesCheck = false;
          if (pieceType === "n") {
            givesCheck = fileDist === 1 && rankDist === 2 || fileDist === 2 && rankDist === 1;
          } else if (pieceType === "b") {
            givesCheck = fileDist === rankDist && fileDist !== 0 && pathIsClear(toFile, toRank, kingFile, kingRank);
          } else if (pieceType === "r") {
            givesCheck = (fileDist === 0 || rankDist === 0) && fileDist + rankDist !== 0 && pathIsClear(toFile, toRank, kingFile, kingRank);
          } else if (pieceType === "q") {
            const diagonal = fileDist === rankDist && fileDist !== 0;
            const straight = (fileDist === 0 || rankDist === 0) && fileDist + rankDist !== 0;
            givesCheck = (diagonal || straight) && pathIsClear(toFile, toRank, kingFile, kingRank);
          } else if (pieceType === "p") {
            givesCheck = sideToMove === "w" ? rankDist === 1 && fileDist === 1 && toRank > fromRank : rankDist === 1 && fileDist === 1 && toRank < fromRank;
          }
          if (givesCheck) {
            legal._checkPiece = pieceType;
          }
          return givesCheck;
        });
        if (checkingMoves.length === 0) {
          return false;
        }
        if (getValueConfig(enumOptions.UltrabulletGuardQueen)) {
          checkingMoves = checkingMoves.filter((m) => m._checkPiece !== "q");
          if (checkingMoves.length === 0) {
            return false;
          }
        }
        const CHECK_PIECE_ORDER = {
          p: 1,
          n: 2,
          b: 3,
          r: 4,
          q: 5
        };
        checkingMoves.sort(
          (a, b) => CHECK_PIECE_ORDER[a._checkPiece] - CHECK_PIECE_ORDER[b._checkPiece]
        );
        const chosenMove = checkingMoves[0];
        chosenMove.userGenerated = true;
        this.BetterMintmaster.game.controller.move(chosenMove);
        return true;
      } catch (error) {
        console.error("[Asina] playCheckMove error:", error);
        return false;
      }
    }
    // Sorts the collected engine lines by eval (mate first, then cp) for ranking.
    SortTopMoves() {
      this.topMoves.sort(function(a, b) {
        if (a.mate !== null && b.mate === null) {
          if (a.mate < 0) {
            return 1;
          } else {
            return -1;
          }
        }
        if (a.mate === null && b.mate !== null) {
          if (b.mate > 0) {
            return 1;
          } else {
            return -1;
          }
        }
        if (a.mate === null && b.mate === null) {
          if (a.depth === b.depth) {
            if (a.cp === b.cp) {
              return 0;
            }
            if (a.cp > b.cp) {
              return -1;
            } else {
              return 1;
            }
          }
          if (a.depth > b.depth) {
            return -1;
          } else {
            return 1;
          }
        }
        if (a.mate < 0 && b.mate < 0) {
          if (a.line.length === b.line.length) {
            return 0;
          }
          if (a.line.length < b.line.length) {
            return 1;
          } else {
            return -1;
          }
        }
        if (a.mate > 0 && b.mate > 0) {
          if (a.line.length === b.line.length) {
            return 0;
          }
          if (a.line.length > b.line.length) {
            return 1;
          } else {
            return -1;
          }
        }
        if (a.mate < b.mate) {
          return 1;
        } else {
          return -1;
        }
      });
    }
  };

  // js/src/coach/classification.js
  var CLASSIFICATION_ICONS = {
    brilliant: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 18 19"><g id="Brilliant"><path class="icon-shadow" opacity="0.3" d="M9,.5a9,9,0,1,0,9,9A9,9,0,0,0,9,.5Z"></path><path class="icon-background" fill="#26c2a3" d="M9,0a9,9,0,1,0,9,9A9,9,0,0,0,9,0Z"></path><g class="icon-component-shadow" opacity="0.2"><path d="M12.57,14.6a.51.51,0,0,1,0,.13.44.44,0,0,1-.08.11l-.11.08-.13,0h-2l-.13,0L10,14.84A.41.41,0,0,1,10,14.6V12.7a.32.32,0,0,1,.09-.23.39.39,0,0,1,.1-.08l.13,0h2a.31.31,0,0,1,.24.1.39.39,0,0,1,.08.1.51.51,0,0,1,0,.13Zm-.12-3.93a.17.17,0,0,1,0,.12.41.41,0,0,1-.07.11.4.4,0,0,1-.23.08H10.35a.31.31,0,0,1-.34-.31L9.86,3.9A.36.36,0,0,1,10,3.66a.23.23,0,0,1,.11-.08.27.27,0,0,1,.13,0H12.3a.32.32,0,0,1,.25.1.36.36,0,0,1,.09.24Z"></path><path d="M8.07,14.6a.51.51,0,0,1,0,.13.44.44,0,0,1-.08.11l-.11.08-.13,0h-2l-.13,0-.11-.08a.41.41,0,0,1-.08-.24V12.7a.27.27,0,0,1,0-.13.36.36,0,0,1,.07-.1.39.39,0,0,1,.1-.08l.13,0h2a.31.31,0,0,1,.24.1.39.39,0,0,1,.08.1.51.51,0,0,1,0,.13ZM8,10.67a.17.17,0,0,1,0,.12.41.41,0,0,1-.07.11.4.4,0,0,1-.23.08H5.85a.31.31,0,0,1-.34-.31L5.36,3.9a.36.36,0,0,1,.09-.24.23.23,0,0,1,.11-.08.27.27,0,0,1,.13,0H7.8a.35.35,0,0,1,.25.1.36.36,0,0,1,.09.24Z"></path></g><g><path class="icon-component" fill="#fff" d="M12.57,14.1a.51.51,0,0,1,0,.13.44.44,0,0,1-.08.11l-.11.08-.13,0h-2l-.13,0L10,14.34A.41.41,0,0,1,10,14.1V12.2A.32.32,0,0,1,10,12a.39.39,0,0,1,.1-.08l.13,0h2a.31.31,0,0,1,.24.1.39.39,0,0,1,.08.1.51.51,0,0,1,0,.13Zm-.12-3.93a.17.17,0,0,1,0,.12.41.41,0,0,1-.07.11.4.4,0,0,1-.23.08H10.35a.31.31,0,0,1-.34-.31L9.86,3.4A.36.36,0,0,1,10,3.16a.23.23,0,0,1,.11-.08.27.27,0,0,1,.13,0H12.3a.32.32,0,0,1,.25.1.36.36,0,0,1,.09.24Z"></path><path class="icon-component" fill="#fff" d="M8.07,14.1a.51.51,0,0,1,0,.13.44.44,0,0,1-.08.11l-.11.08-.13,0h-2l-.13,0-.11-.08a.41.41,0,0,1-.08-.24V12.2a.27.27,0,0,1,0-.13.36.36,0,0,1,.07-.1.39.39,0,0,1,.1-.08l.13,0h2A.31.31,0,0,1,8,12a.39.39,0,0,1,.08.1.51.51,0,0,1,0,.13ZM8,10.17a.17.17,0,0,1,0,.12.41.41,0,0,1-.07.11.4.4,0,0,1-.23.08H5.85a.31.31,0,0,1-.34-.31L5.36,3.4a.36.36,0,0,1,.09-.24.23.23,0,0,1,.11-.08.27.27,0,0,1,.13,0H7.8a.35.35,0,0,1,.25.1.36.36,0,0,1,.09.24Z"></path></g></g></svg>',
    greatFind: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 18 19"><g id="great_find"><path class="icon-shadow" opacity="0.3" d="M9,.5a9,9,0,1,0,9,9A9,9,0,0,0,9,.5Z"></path><path class="icon-background" fill="#749BBF" d="M9,0a9,9,0,1,0,9,9A9,9,0,0,0,9,0Z"></path><g><g class="icon-component-shadow" opacity="0.2"><path d="M10.32,14.6a.27.27,0,0,1,0,.13.44.44,0,0,1-.08.11l-.11.08-.13,0H8l-.13,0-.11-.08a.41.41,0,0,1-.08-.24V12.7a.27.27,0,0,1,0-.13.36.36,0,0,1,.07-.1.39.39,0,0,1,.1-.08l.13,0h2a.31.31,0,0,1,.24.1.39.39,0,0,1,.08.1.51.51,0,0,1,0,.13Zm-.12-3.93a.17.17,0,0,1,0,.12.41.41,0,0,1-.07.11.4.4,0,0,1-.23.08H8.1a.31.31,0,0,1-.34-.31L7.61,3.9a.36.36,0,0,1,.09-.24.23.23,0,0,1,.11-.08.27.27,0,0,1,.13,0h2.11a.32.32,0,0,1,.25.1.36.36,0,0,1,.09.24Z"></path></g><path class="icon-component" fill="#fff" d="M10.32,14.1a.27.27,0,0,1,0,.13.44.44,0,0,1-.08.11l-.11.08-.13,0H8l-.13,0-.11-.08a.41.41,0,0,1-.08-.24V12.2a.27.27,0,0,1,0-.13.36.36,0,0,1,.07-.1.39.39,0,0,1,.1-.08l.13,0h2a.31.31,0,0,1,.24.1.39.39,0,0,1,.08.1.51.51,0,0,1,0,.13Zm-.12-3.93a.17.17,0,0,1,0,.12.41.41,0,0,1-.07.11.4.4,0,0,1-.23.08H8.1a.31.31,0,0,1-.34-.31L7.61,3.4a.36.36,0,0,1,.09-.24.23.23,0,0,1,.11-.08.27.27,0,0,1,.13,0h2.11a.32.32,0,0,1,.25.1.36.36,0,0,1,.09.24Z"></path></g></g></svg>',
    best: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 18 19"><g id="best"><path class="icon-shadow" opacity="0.3" d="M9,.5a9,9,0,1,0,9,9A9,9,0,0,0,9,.5Z"></path><path class="icon-background" fill="#81B64C" d="M9,0a9,9,0,1,0,9,9A9,9,0,0,0,9,0Z"></path><path class="icon-component-shadow" opacity="0.2" d="M9,3.43a.5.5,0,0,0-.27.08.46.46,0,0,0-.17.22L7.24,7.17l-3.68.19a.52.52,0,0,0-.26.1.53.53,0,0,0-.16.23.45.45,0,0,0,0,.28.44.44,0,0,0,.15.23l2.86,2.32-1,3.56a.45.45,0,0,0,0,.28.46.46,0,0,0,.17.22.41.41,0,0,0,.26.09.43.43,0,0,0,.27-.08l3.09-2,3.09,2a.46.46,0,0,0,.53,0,.46.46,0,0,0,.17-.22.53.53,0,0,0,0-.28l-1-3.56L14.71,8.2A.44.44,0,0,0,14.86,8a.45.45,0,0,0,0-.28.53.53,0,0,0-.16-.23.52.52,0,0,0-.26-.1l-3.68-.2L9.44,3.73a.46.46,0,0,0-.17-.22A.5.5,0,0,0,9,3.43Z"></path><path class="icon-component" fill="#fff" d="M9,2.93A.5.5,0,0,0,8.73,3a.46.46,0,0,0-.17.22L7.24,6.67l-3.68.19A.52.52,0,0,0,3.3,7a.53.53,0,0,0-.16.23.45.45,0,0,0,0,.28.44.44,0,0,0,.15.23L6.15,10l-1,3.56a.45.45,0,0,0,0,.28.46.46,0,0,0,.17.22.41.41,0,0,0,.26.09.43.43,0,0,0,.27-.08l3.09-2,3.09,2a.46.46,0,0,0,.53,0,.46.46,0,0,0,.17-.22.53.53,0,0,0,0-.28l-1-3.56L14.71,7.7a.44.44,0,0,0,.15-.23.45.45,0,0,0,0-.28A.53.53,0,0,0,14.7,7a.52.52,0,0,0-.26-.1l-3.68-.2L9.44,3.23A.46.46,0,0,0,9.27,3,.5.5,0,0,0,9,2.93Z"></path></g></svg>',
    excellent: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 18 19"><g id="excellent"><g><path class="icon-shadow" opacity="0.3" d="M9,.5a9,9,0,1,0,9,9A9,9,0,0,0,9,.5Z"></path><path class="icon-background" fill="#81B64C" d="M9,0a9,9,0,1,0,9,9A9,9,0,0,0,9,0Z"></path></g><g class="icon-component-shadow" opacity="0.2"><path d="M13.79,11.34c0-.2.4-.53.4-.94S14,9.72,14,9.58a2.06,2.06,0,0,0,.18-.83,1,1,0,0,0-.3-.69,1.13,1.13,0,0,0-.55-.2,10.29,10.29,0,0,1-2.07,0c-.37-.23,0-1.18.18-1.7S11.9,4,10.62,3.7c-.69-.17-.66.37-.78.9-.05.21-.09.43-.13.57A5,5,0,0,1,7.05,8.23a1.57,1.57,0,0,1-.42.18v4.94A7.23,7.23,0,0,1,8,13.53c.52.12.91.25,1.44.33A11.11,11.11,0,0,0,11,14a6.65,6.65,0,0,0,1.18,0,1.09,1.09,0,0,0,1-.59.66.66,0,0,0,.06-.2,1.63,1.63,0,0,1,.07-.3c.13-.28.37-.3.5-.68S13.74,11.53,13.79,11.34Z"></path><path d="M5.49,8.09H4.31a.5.5,0,0,0-.5.5v4.56a.5.5,0,0,0,.5.5H5.49a.5.5,0,0,0,.5-.5V8.59A.5.5,0,0,0,5.49,8.09Z"></path></g><g><path class="icon-component" fill="#fff" d="M13.79,10.84c0-.2.4-.53.4-.94S14,9.22,14,9.08a2.06,2.06,0,0,0,.18-.83,1,1,0,0,0-.3-.69,1.13,1.13,0,0,0-.55-.2,10.29,10.29,0,0,1-2.07,0c-.37-.23,0-1.18.18-1.7s.51-2.12-.77-2.43c-.69-.17-.66.37-.78.9-.05.21-.09.43-.13.57A5,5,0,0,1,7.05,7.73a1.57,1.57,0,0,1-.42.18v4.94A7.23,7.23,0,0,1,8,13c.52.12.91.25,1.44.33a11.11,11.11,0,0,0,1.62.16,6.65,6.65,0,0,0,1.18,0,1.09,1.09,0,0,0,1-.59.66.66,0,0,0,.06-.2,1.63,1.63,0,0,1,.07-.3c.13-.28.37-.3.5-.68S13.74,11,13.79,10.84Z"></path><path class="icon-component" fill="#fff" d="M5.49,7.59H4.31a.5.5,0,0,0-.5.5v4.56a.5.5,0,0,0,.5.5H5.49a.5.5,0,0,0,.5-.5V8.09A.5.5,0,0,0,5.49,7.59Z"></path></g></g></svg>',
    good: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 18 19"><g id="good"><g><path class="icon-shadow" opacity="0.3" d="M9,.5a9,9,0,1,0,9,9A9,9,0,0,0,9,.5Z"></path><path class="icon-background" fill="#95b776" d="M9,0a9,9,0,1,0,9,9A9,9,0,0,0,9,0Z"></path></g><g><path class="icon-component-shadow" opacity="0.2" d="M15.11,6.81,9.45,12.47,7.79,14.13a.39.39,0,0,1-.28.11.39.39,0,0,1-.27-.11L2.89,9.78a.39.39,0,0,1-.11-.28.39.39,0,0,1,.11-.27L4.28,7.85a.34.34,0,0,1,.12-.09l.15,0a.37.37,0,0,1,.15,0,.38.38,0,0,1,.13.09l2.69,2.68,5.65-5.65a.38.38,0,0,1,.13-.09.37.37,0,0,1,.15,0,.4.4,0,0,1,.15,0,.34.34,0,0,1,.12.09l1.39,1.38a.41.41,0,0,1,.08.13.33.33,0,0,1,0,.15.4.4,0,0,1,0,.15A.5.5,0,0,1,15.11,6.81Z"></path><path class="icon-component" fill="#fff" d="M15.11,6.31,9.45,12,7.79,13.63a.39.39,0,0,1-.28.11.39.39,0,0,1-.27-.11L2.89,9.28A.39.39,0,0,1,2.78,9a.39.39,0,0,1,.11-.27L4.28,7.35a.34.34,0,0,1,.12-.09l.15,0a.37.37,0,0,1,.15,0,.38.38,0,0,1,.13.09L7.52,10l5.65-5.65a.38.38,0,0,1,.13-.09.37.37,0,0,1,.15,0,.4.4,0,0,1,.15,0,.34.34,0,0,1,.12.09l1.39,1.38a.41.41,0,0,1,.08.13.33.33,0,0,1,0,.15.4.4,0,0,1,0,.15A.5.5,0,0,1,15.11,6.31Z"></path></g></g></svg>',
    book: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 18 19"><g id="book"><path class="icon-shadow" opacity="0.3" d="M9,.5a9,9,0,1,0,9,9A9,9,0,0,0,9,.5Z"></path><path class="icon-background" fill="#D5A47D" d="M9,0a9,9,0,1,0,9,9A9,9,0,0,0,9,0Z"></path><g><path class="icon-component-shadow" opacity="0.3" isolation="isolate" d="M8.45,5.9c-1-.75-2.51-1.09-4.83-1.09H2.54v8.71H3.62a8.16,8.16,0,0,1,4.83,1.17Z"></path><path class="icon-component-shadow" opacity="0.3" isolation="isolate" d="M9.54,14.69a8.14,8.14,0,0,1,4.84-1.17h1.08V4.81H14.38c-2.31,0-3.81.34-4.84,1.09Z"></path><path class="icon-component" fill="#fff" d="M8.45,5.4c-1-.75-2.51-1.09-4.83-1.09H3V13h.58a8.09,8.09,0,0,1,4.83,1.17Z"></path><path class="icon-component" fill="#fff" d="M9.54,14.19A8.14,8.14,0,0,1,14.38,13H15V4.31h-.58c-2.31,0-3.81.34-4.84,1.09Z"></path></g></g></svg>',
    inaccuracy: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 18 19"><g id="inaccuracy"><path class="icon-shadow" opacity="0.3" d="M9,.5a9,9,0,1,0,9,9A9,9,0,0,0,9,.5Z"></path><path class="icon-background" fill="#F7C631" d="M9,0a9,9,0,1,0,9,9A9,9,0,0,0,9,0Z"></path><g class="icon-component-shadow" opacity="0.2"><path d="M13.66,14.8a.28.28,0,0,1,0,.13.23.23,0,0,1-.08.11.28.28,0,0,1-.11.08l-.12,0h-2l-.13,0a.27.27,0,0,1-.1-.08A.36.36,0,0,1,11,14.8V12.9a.59.59,0,0,1,0-.13.36.36,0,0,1,.07-.1l.1-.08.13,0h2a.33.33,0,0,1,.23.1.39.39,0,0,1,.08.1.28.28,0,0,1,0,.13Zm-.12-3.93a.31.31,0,0,1,0,.13.3.3,0,0,1-.07.1.3.3,0,0,1-.23.08H11.43a.31.31,0,0,1-.34-.31L10.94,4.1A.5.5,0,0,1,11,3.86l.11-.08.13,0h2.11a.35.35,0,0,1,.26.1.41.41,0,0,1,.08.24Z"></path><path d="M7.65,14.82a.27.27,0,0,1,0,.12.26.26,0,0,1-.07.11l-.1.07-.13,0H5.43a.25.25,0,0,1-.12,0,.27.27,0,0,1-.1-.08.31.31,0,0,1-.09-.22V13a.36.36,0,0,1,.09-.23l.1-.07.12,0H7.32a.32.32,0,0,1,.23.09.3.3,0,0,1,.07.1.28.28,0,0,1,0,.13Zm2.2-7.17a3.1,3.1,0,0,1-.36.73A5.58,5.58,0,0,1,9,9a4.85,4.85,0,0,1-.52.49,8,8,0,0,0-.65.63,1,1,0,0,0-.27.7V11a.21.21,0,0,1,0,.12.17.17,0,0,1-.06.1.23.23,0,0,1-.1.07l-.12,0H5.53a.21.21,0,0,1-.12,0,.18.18,0,0,1-.1-.07.2.2,0,0,1-.08-.1.37.37,0,0,1,0-.12v-.35a2.68,2.68,0,0,1,.13-.84,2.91,2.91,0,0,1,.33-.66,3.38,3.38,0,0,1,.45-.55c.16-.15.33-.29.49-.42a7.84,7.84,0,0,0,.65-.64,1,1,0,0,0,.25-.67.77.77,0,0,0-.07-.34.67.67,0,0,0-.23-.27A1.16,1.16,0,0,0,6.49,6,1.61,1.61,0,0,0,6,6.11a3,3,0,0,0-.41.18,1.75,1.75,0,0,0-.29.18l-.11.09A.5.5,0,0,1,5,6.62a.31.31,0,0,1-.21-.13l-1-1.21a.3.3,0,0,1,0-.4A1.36,1.36,0,0,1,4,4.68a3.07,3.07,0,0,1,.56-.38,5.49,5.49,0,0,1,.9-.37,3.69,3.69,0,0,1,1.19-.17,3.92,3.92,0,0,1,2.3.75,2.85,2.85,0,0,1,.77.92A2.82,2.82,0,0,1,10,6.71,3,3,0,0,1,9.85,7.65Z"></path></g><g><path class="icon-component" fill="#fff" d="M13.66,14.3a.28.28,0,0,1,0,.13.23.23,0,0,1-.08.11.28.28,0,0,1-.11.08l-.12,0h-2l-.13,0a.27.27,0,0,1-.1-.08A.36.36,0,0,1,11,14.3V12.4a.59.59,0,0,1,0-.13.36.36,0,0,1,.07-.1l.1-.08.13,0h2a.33.33,0,0,1,.23.1.39.39,0,0,1,.08.1.28.28,0,0,1,0,.13Zm-.12-3.93a.31.31,0,0,1,0,.13.3.3,0,0,1-.07.1.3.3,0,0,1-.23.08H11.43a.31.31,0,0,1-.34-.31L10.94,3.6A.5.5,0,0,1,11,3.36l.11-.08.13,0h2.11a.35.35,0,0,1,.26.1.41.41,0,0,1,.08.24Z"></path><path class="icon-component" fill="#fff" d="M7.65,14.32a.27.27,0,0,1,0,.12.26.26,0,0,1-.07.11l-.1.07-.13,0H5.43a.25.25,0,0,1-.12,0,.27.27,0,0,1-.1-.08.31.31,0,0,1-.09-.22V12.49a.36.36,0,0,1,.09-.23l.1-.07.12,0H7.32a.32.32,0,0,1,.23.09.3.3,0,0,1,.07.1.28.28,0,0,1,0,.13Zm2.2-7.17a3.1,3.1,0,0,1-.36.73,5.58,5.58,0,0,1-.49.6A4.85,4.85,0,0,1,8.48,9a8,8,0,0,0-.65.63,1,1,0,0,0-.27.7v.22a.21.21,0,0,1,0,.12.17.17,0,0,1-.06.1.23.23,0,0,1-.1.07l-.12,0H5.53a.21.21,0,0,1-.12,0,.18.18,0,0,1-.1-.07.2.2,0,0,1-.08-.1.37.37,0,0,1,0-.12v-.35a2.68,2.68,0,0,1,.13-.84,2.91,2.91,0,0,1,.33-.66,3.38,3.38,0,0,1,.45-.55c.16-.15.33-.29.49-.42a7.84,7.84,0,0,0,.65-.64,1,1,0,0,0,.25-.67.77.77,0,0,0-.07-.34.67.67,0,0,0-.23-.27,1.16,1.16,0,0,0-.72-.24A1.61,1.61,0,0,0,6,5.61a3,3,0,0,0-.41.18A1.75,1.75,0,0,0,5.3,6l-.11.09A.5.5,0,0,1,5,6.12.31.31,0,0,1,4.74,6l-1-1.21a.3.3,0,0,1,0-.4A1.36,1.36,0,0,1,4,4.18a3.07,3.07,0,0,1,.56-.38,5.49,5.49,0,0,1,.9-.37,3.69,3.69,0,0,1,1.19-.17A3.92,3.92,0,0,1,8.93,4a2.85,2.85,0,0,1,.77.92A2.82,2.82,0,0,1,10,6.21,3,3,0,0,1,9.85,7.15Z"></path></g></g></svg>',
    mistake: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 18 19"><g id="mistake"><g><path class="icon-shadow" opacity="0.3" d="M9,.5a9,9,0,1,0,9,9A9,9,0,0,0,9,.5Z"></path><path class="icon-background" fill="#FFA459" d="M9,0a9,9,0,1,0,9,9A9,9,0,0,0,9,0Z"></path></g><g><g class="icon-component-shadow" opacity="0.2"><path d="M9.92,15a.27.27,0,0,1,0,.12.41.41,0,0,1-.07.11.32.32,0,0,1-.23.09H7.7a.25.25,0,0,1-.12,0,.27.27,0,0,1-.1-.08A.31.31,0,0,1,7.39,15V13.19A.32.32,0,0,1,7.48,13l.1-.07.12,0H9.59a.32.32,0,0,1,.23.09.61.61,0,0,1,.07.1.28.28,0,0,1,0,.13Zm2.2-7.17a3.1,3.1,0,0,1-.36.73,5.58,5.58,0,0,1-.49.6,6,6,0,0,1-.52.49,8,8,0,0,0-.65.63,1,1,0,0,0-.27.7v.22a.24.24,0,0,1,0,.12.17.17,0,0,1-.06.1.3.3,0,0,1-.1.07l-.12,0H7.79l-.12,0a.3.3,0,0,1-.1-.07.26.26,0,0,1-.07-.1.37.37,0,0,1,0-.12v-.35A2.42,2.42,0,0,1,7.61,10a2.55,2.55,0,0,1,.33-.66,3.38,3.38,0,0,1,.45-.55c.16-.15.33-.29.49-.42a7.73,7.73,0,0,0,.64-.64,1,1,0,0,0,.26-.67.77.77,0,0,0-.07-.34.75.75,0,0,0-.23-.27,1.16,1.16,0,0,0-.72-.24,1.61,1.61,0,0,0-.49.07,3,3,0,0,0-.41.18,1.41,1.41,0,0,0-.29.18l-.11.09a.5.5,0,0,1-.24.06A.31.31,0,0,1,7,6.69L6,5.48a.29.29,0,0,1,0-.4,1.36,1.36,0,0,1,.21-.2,3.07,3.07,0,0,1,.56-.38,5.38,5.38,0,0,1,.89-.37A3.75,3.75,0,0,1,8.9,4a4.07,4.07,0,0,1,1.2.19,4,4,0,0,1,1.09.56,2.76,2.76,0,0,1,.78.92,2.82,2.82,0,0,1,.28,1.28A3,3,0,0,1,12.12,7.85Z"></path></g><path class="icon-component" fill="#fff" d="M9.92,14.52a.27.27,0,0,1,0,.12.41.41,0,0,1-.07.11.32.32,0,0,1-.23.09H7.7a.25.25,0,0,1-.12,0,.27.27,0,0,1-.1-.08.31.31,0,0,1-.09-.22V12.69a.32.32,0,0,1,.09-.23l.1-.07.12,0H9.59a.32.32,0,0,1,.23.09.61.61,0,0,1,.07.1.28.28,0,0,1,0,.13Zm2.2-7.17a3.1,3.1,0,0,1-.36.73,5.58,5.58,0,0,1-.49.6,6,6,0,0,1-.52.49,8,8,0,0,0-.65.63,1,1,0,0,0-.27.7v.22a.24.24,0,0,1,0,.12.17.17,0,0,1-.06.1.3.3,0,0,1-.1.07l-.12,0H7.79l-.12,0a.3.3,0,0,1-.1-.07.26.26,0,0,1-.07-.1.37.37,0,0,1,0-.12v-.35a2.42,2.42,0,0,1,.13-.84,2.55,2.55,0,0,1,.33-.66,3.38,3.38,0,0,1,.45-.55c.16-.15.33-.29.49-.42a7.73,7.73,0,0,0,.64-.64,1,1,0,0,0,.26-.67.77.77,0,0,0-.07-.34A.75.75,0,0,0,9.48,6a1.16,1.16,0,0,0-.72-.24,1.61,1.61,0,0,0-.49.07A3,3,0,0,0,7.86,6a1.41,1.41,0,0,0-.29.18l-.11.09a.5.5,0,0,1-.24.06A.31.31,0,0,1,7,6.19L6,5a.29.29,0,0,1,0-.4,1.36,1.36,0,0,1,.21-.2A3.07,3.07,0,0,1,6.81,4a5.38,5.38,0,0,1,.89-.37,3.75,3.75,0,0,1,1.2-.17,4.07,4.07,0,0,1,1.2.19,4,4,0,0,1,1.09.56,2.76,2.76,0,0,1,.78.92,2.82,2.82,0,0,1,.28,1.28A3,3,0,0,1,12.12,7.35Z"></path></g></g></svg>',
    miss: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 18 19"><defs><style>.cls-1{fill:#f1f2f2;}.cls-2{fill:#FF7769;}.cls-3{opacity:.2;}.cls-4{opacity:.3;}</style></defs><g id="incorrect"><path class="cls-4" d="M9,.5C4.03,.5,0,4.53,0,9.5s4.03,9,9,9,9-4.03,9-9S13.97,.5,9,.5Z"></path><path class="cls-2" d="M9,0C4.03,0,0,4.03,0,9s4.03,9,9,9,9-4.03,9-9S13.97,0,9,0Z"></path><g class="cls-3"><path d="M13.99,12.51s.06,.08,.08,.13c.02,.05,.03,.1,.03,.15s-.01,.1-.03,.15c-.02,.05-.05,.09-.08,.13l-1.37,1.37s-.08,.06-.13,.08c-.05,.02-.1,.03-.15,.03s-.1-.01-.15-.03c-.05-.02-.09-.05-.13-.08l-3.06-3.06-3.06,3.06s-.08,.06-.13,.08c-.05,.02-.1,.03-.15,.03s-.1-.01-.15-.03c-.05-.02-.09-.05-.13-.08l-1.37-1.37c-.07-.07-.11-.17-.11-.28s.04-.2,.11-.28l3.06-3.06-3.06-3.06c-.07-.07-.11-.17-.11-.28s.04-.2,.11-.28l1.37-1.37c.07-.07,.17-.11,.28-.11s.2,.04,.28,.11l3.06,3.06,3.06-3.06c.07-.07,.17-.11,.28-.11s.2,.04,.28,.11l1.37,1.37s.06,.08,.08,.13c.02,.05,.03,.1,.03,.15s-.01,.1-.03,.15c-.02,.05-.05,.09-.08,.13l-3.06,3.06,3.06,3.06Z"></path></g><path class="cls-1" d="M13.99,12.01s.06,.08,.08,.13c.02,.05,.03,.1,.03,.15s-.01,.1-.03,.15c-.02,.05-.05,.09-.08,.13l-1.37,1.37s-.08,.06-.13,.08c-.05,.02-.1,.03-.15,.03s-.1-.01-.15-.03c-.05-.02-.09-.05-.13-.08l-3.06-3.06-3.06,3.06s-.08,.06-.13,.08c-.05,.02-.1,.03-.15,.03s-.1-.01-.15-.03c-.05-.02-.09-.05-.13-.08l-1.37-1.37c-.07-.07-.11-.17-.11-.28s.04-.2,.11-.28l3.06-3.06-3.06-3.06c-.07-.07-.11-.17-.11-.28s.04-.2,.11-.28l1.37-1.37c.07-.07,.17-.11,.28-.11s.2,.04,.28,.11l3.06,3.06,3.06-3.06c.07-.07,.17-.11,.28-.11s.2,.04,.28,.11l1.37,1.37s.06,.08,.08,.13c.02,.05,.03,.1,.03,.15s-.01,.1-.03,.15c-.02,.05-.05,.09-.08,.13l-3.06,3.06,3.06,3.06Z"></path></g></svg>',
    blunder: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 18 19"><g id="blunder"><path class="icon-shadow" opacity="0.3" d="M9,.5a9,9,0,1,0,9,9A9,9,0,0,0,9,.5Z"></path><path class="icon-background" fill="#FA412D" d="M9,0a9,9,0,1,0,9,9A9,9,0,0,0,9,0Z"></path><g class="icon-component-shadow" opacity="0.2"><path d="M14.74,5.45A2.58,2.58,0,0,0,14,4.54,3.76,3.76,0,0,0,12.89,4a4.07,4.07,0,0,0-1.2-.19A3.92,3.92,0,0,0,10.51,4a5.87,5.87,0,0,0-.9.37,3,3,0,0,0-.32.2,3.46,3.46,0,0,1,.42.63,3.29,3.29,0,0,1,.36,1.47.31.31,0,0,0,.19-.06l.11-.08a2.9,2.9,0,0,1,.29-.19,3.89,3.89,0,0,1,.41-.17,1.55,1.55,0,0,1,.48-.07,1.1,1.1,0,0,1,.72.24.72.72,0,0,1,.23.26.8.8,0,0,1,.07.34,1,1,0,0,1-.25.67,7.71,7.71,0,0,1-.65.63,6.2,6.2,0,0,0-.48.43,2.93,2.93,0,0,0-.45.54,2.55,2.55,0,0,0-.33.66,2.62,2.62,0,0,0-.13.83V11a.24.24,0,0,0,0,.12.35.35,0,0,0,.17.17l.12,0h1.71l.12,0a.23.23,0,0,0,.1-.07.21.21,0,0,0,.06-.1.27.27,0,0,0,0-.12V10.8a1,1,0,0,1,.26-.7q.27-.28.66-.63A5.79,5.79,0,0,0,14.05,9a4.51,4.51,0,0,0,.48-.6,2.56,2.56,0,0,0,.36-.72,2.81,2.81,0,0,0,.14-1A2.66,2.66,0,0,0,14.74,5.45Z"></path><path d="M12.38,12.65H10.5l-.12,0a.34.34,0,0,0-.18.29v1.82a.36.36,0,0,0,.08.23.23.23,0,0,0,.1.07l.12,0h1.88a.24.24,0,0,0,.12,0,.26.26,0,0,0,.11-.07.36.36,0,0,0,.07-.1.28.28,0,0,0,0-.13V13a.27.27,0,0,0,0-.12.61.61,0,0,0-.07-.1A.32.32,0,0,0,12.38,12.65Z"></path><path d="M6.79,12.65H4.91l-.12,0a.34.34,0,0,0-.18.29v1.82a.36.36,0,0,0,.08.23.23.23,0,0,0,.1.07l.12,0H6.79a.24.24,0,0,0,.12,0A.26.26,0,0,0,7,15a.36.36,0,0,0,.07-.1.28.28,0,0,0,0-.13V13a.27.27,0,0,0,0-.12.61.61,0,0,0-.07-.1A.32.32,0,0,0,6.79,12.65Z"></path><path d="M8.39,4.54A3.76,3.76,0,0,0,7.3,4a4.07,4.07,0,0,0-1.2-.19A3.92,3.92,0,0,0,4.92,4a5.87,5.87,0,0,0-.9.37,3.37,3.37,0,0,0-.55.38l-.21.19a.32.32,0,0,0,0,.41l1,1.2a.26.26,0,0,0,.2.12.48.48,0,0,0,.24-.06l.11-.08a2.9,2.9,0,0,1,.29-.19l.4-.17A1.66,1.66,0,0,1,6,6.06a1.1,1.1,0,0,1,.72.24.72.72,0,0,1,.23.26A.77.77,0,0,1,7,6.9a1,1,0,0,1-.26.67,7.6,7.6,0,0,1-.64.63,6.28,6.28,0,0,0-.49.43,2.93,2.93,0,0,0-.45.54,2.72,2.72,0,0,0-.33.66,2.62,2.62,0,0,0-.13.83V11a.43.43,0,0,0,0,.12.39.39,0,0,0,.08.1.18.18,0,0,0,.1.07.21.21,0,0,0,.12,0H6.72l.12,0a.23.23,0,0,0,.1-.07.36.36,0,0,0,.07-.1A.5.5,0,0,0,7,11V10.8a1,1,0,0,1,.27-.7A8,8,0,0,1,8,9.47c.18-.15.35-.31.52-.48A7,7,0,0,0,9,8.39a3.23,3.23,0,0,0,.36-.72,3.07,3.07,0,0,0,.13-1,2.66,2.66,0,0,0-.29-1.27A2.58,2.58,0,0,0,8.39,4.54Z"></path></g><g><path class="icon-component" fill="#fff" d="M14.74,5A2.58,2.58,0,0,0,14,4a3.76,3.76,0,0,0-1.09-.56,4.07,4.07,0,0,0-1.2-.19,3.92,3.92,0,0,0-1.18.17,5.87,5.87,0,0,0-.9.37,3,3,0,0,0-.32.2,3.46,3.46,0,0,1,.42.63,3.29,3.29,0,0,1,.36,1.47.31.31,0,0,0,.19-.06L10.37,6a2.9,2.9,0,0,1,.29-.19,3.89,3.89,0,0,1,.41-.17,1.55,1.55,0,0,1,.48-.07,1.1,1.1,0,0,1,.72.24.72.72,0,0,1,.23.26.8.8,0,0,1,.07.34,1,1,0,0,1-.25.67,7.71,7.71,0,0,1-.65.63,6.2,6.2,0,0,0-.48.43,2.93,2.93,0,0,0-.45.54,2.55,2.55,0,0,0-.33.66,2.62,2.62,0,0,0-.13.83v.35a.24.24,0,0,0,0,.12.35.35,0,0,0,.17.17l.12,0h1.71l.12,0a.23.23,0,0,0,.1-.07.21.21,0,0,0,.06-.1.27.27,0,0,0,0-.12V10.3a1,1,0,0,1,.26-.7q.27-.28.66-.63a5.79,5.79,0,0,0,.51-.48,4.51,4.51,0,0,0,.48-.6,2.56,2.56,0,0,0,.36-.72,2.81,2.81,0,0,0,.14-1A2.66,2.66,0,0,0,14.74,5Z"></path><path class="icon-component" fill="#fff" d="M12.38,12.15H10.5l-.12,0a.34.34,0,0,0-.18.29v1.82a.36.36,0,0,0,.08.23.23.23,0,0,0,.1.07l.12,0h1.88a.24.24,0,0,0,.12,0,.26.26,0,0,0,.11-.07.36.36,0,0,0,.07-.1.28.28,0,0,0,0-.13V12.46a.27.27,0,0,0,0-.12.61.61,0,0,0-.07-.1A.32.32,0,0,0,12.38,12.15Z"></path><path class="icon-component" fill="#fff" d="M6.79,12.15H4.91l-.12,0a.34.34,0,0,0-.18.29v1.82a.36.36,0,0,0,.08.23.23.23,0,0,0,.1.07l.12,0H6.79a.24.24,0,0,0,.12,0A.26.26,0,0,0,7,14.51a.36.36,0,0,0,.07-.1.28.28,0,0,0,0-.13V12.46a.27.27,0,0,0,0-.12.61.61,0,0,0-.07-.1A.32.32,0,0,0,6.79,12.15Z"></path><path class="icon-component" fill="#fff" d="M8.39,4A3.76,3.76,0,0,0,7.3,3.48a4.07,4.07,0,0,0-1.2-.19,3.92,3.92,0,0,0-1.18.17,5.87,5.87,0,0,0-.9.37,3.37,3.37,0,0,0-.55.38l-.21.19a.32.32,0,0,0,0,.41l1,1.2a.26.26,0,0,0,.2.12.48.48,0,0,0,.24-.06L4.78,6a2.9,2.9,0,0,1,.29-.19l.4-.17A1.66,1.66,0,0,1,6,5.56a1.1,1.1,0,0,1,.72.24.72.72,0,0,1,.23.26A.77.77,0,0,1,7,6.4a1,1,0,0,1-.26.67,7.6,7.6,0,0,1-.64.63,6.28,6.28,0,0,0-.49.43,2.93,2.93,0,0,0-.45.54,2.72,2.72,0,0,0-.33.66,2.62,2.62,0,0,0-.13.83v.35a.43.43,0,0,0,0,.12.39.39,0,0,0,.08.1.18.18,0,0,0,.1.07.21.21,0,0,0,.12,0H6.72l.12,0a.23.23,0,0,0,.1-.07.36.36,0,0,0,.07-.1.5.5,0,0,0,0-.12V10.3a1,1,0,0,1,.27-.7A8,8,0,0,1,8,9c.18-.15.35-.31.52-.48A7,7,0,0,0,9,7.89a3.23,3.23,0,0,0,.36-.72,3.07,3.07,0,0,0,.13-1A2.66,2.66,0,0,0,9.15,5,2.58,2.58,0,0,0,8.39,4Z"></path></g></g></svg>'
  };
  var CL_BRILLIANT = {
    key: "brilliant",
    label: "Brilliant",
    whiteKey: "white_brilliant",
    blackKey: "black_brilliant"
  };
  var CL_GREAT_FIND = {
    key: "greatFind",
    label: "Great",
    whiteKey: "white_greatFind",
    blackKey: "black_greatFind"
  };
  var CL_BEST = {
    key: "best",
    label: "Best",
    whiteKey: "white_best",
    blackKey: "black_best"
  };
  var CL_EXCELLENT = {
    key: "excellent",
    label: "Excellent",
    whiteKey: "white_excellent",
    blackKey: "black_excellent"
  };
  var CL_GOOD = {
    key: "good",
    label: "Good",
    whiteKey: "white_good",
    blackKey: "black_good"
  };
  var CL_BOOK = {
    key: "book",
    label: "Book",
    whiteKey: "white_book",
    blackKey: "black_book"
  };
  var CL_INACCURACY = {
    key: "inaccuracy",
    label: "Inaccuracy",
    whiteKey: "white_inaccuracy",
    blackKey: "black_inaccuracy"
  };
  var CL_MISTAKE = {
    key: "mistake",
    label: "Mistake",
    whiteKey: "white_mistake",
    blackKey: "black_mistake"
  };
  var CL_MISS = {
    key: "miss",
    label: "Miss",
    whiteKey: "white_miss",
    blackKey: "black_miss"
  };
  var CL_BLUNDER = {
    key: "blunder",
    label: "Blunder",
    whiteKey: "white_blunder",
    blackKey: "black_blunder"
  };

  // js/src/better-mint.js
  var BetterMint = class {
    /**
     * @param {Element} chessboard the chess.com board element (`wc-chess-board`)
     *   passed on to GameController for move input and markings.
     * @param {object} options live options map (enumOptions keys → values);
     *   replaced wholesale on every "BetterMintUpdateOptions" event.
     */
    constructor(chessboard, options) {
      this.options = options;
      this.game = new GameController(this, chessboard);
      this.engine = new StockfishEngine(this);
      this.coach = new CoachEngine();
      this.coachAudio = new Audio();
      this._lastCoachFen = null;
      this.lastCoachResult = null;
      this._audioCtx = null;
      this.maiaEngine = new MaiaEngine();
      this.preCoach = new PreCoachEngine();
      this.evalEngine = new EvalEngine();
      this._audioSource = null;
      window.addEventListener(
        "BetterMintUpdateOptions",
        (event) => {
          this.options = event.detail;
          this.game.UpdateExtensionOptions();
          this.engine.UpdateExtensionOptions(this.options);
          if (!this.options[enumOptions.AutoMoveEnabled] && this.engine.autoMoveTimer !== null) {
            clearTimeout(this.engine.autoMoveTimer);
            this.engine.autoMoveTimer = null;
          }
          if (this.options[enumOptions.AutoMoveEnabled] && this.engine.topMoves?.length > 0) {
            this.engine.scheduleAutoMove();
          }
          if (!this.options[enumOptions.UltrabulletEnabled] && this.engine.ultrabulletMoveTimer !== null) {
            clearTimeout(this.engine.ultrabulletMoveTimer);
            this.engine.ultrabulletMoveTimer = null;
          }
          if (this.options[enumOptions.UltrabulletEnabled] && this.engine.topMoves?.length > 0) {
            this.engine.scheduleUltrabulletMove();
          }
          if (this.coach) {
            this.coach.restartWorker();
          }
          if (this.preCoach) {
            this.preCoach.restartWorker();
          }
          if (!this.options["option-premove-enabled"]) {
            this.engine.lastPonder = null;
          }
          if (!this.options[enumOptions.AutoMoveEnabled] || !this.options[enumOptions.PremoveEnabled]) {
            this.engine.pendingAutoPremove = false;
            this.engine.pendingAutoPremoveMates = false;
            this.engine.lastMoveGaveCheck = false;
          }
          if (!this.options[enumOptions.AutoPremoveEnabled]) {
            this.engine.pendingAutoPremove = false;
          }
          if (!this.options[enumOptions.AutoPremoveMatesEnabled]) {
            this.engine.pendingAutoPremoveMates = false;
          }
          if (!this.options[enumOptions.AutoPremoveCheckingForkEnabled]) {
            this.engine.lastMoveGaveCheck = false;
          }
          if (typeof this.options["option-mobile-play-btn"] !== "undefined") {
            this.applyMobilePlayBtn(!!this.options["option-mobile-play-btn"]);
          }
          if (typeof this.options["option-mobile-premove-btn"] !== "undefined") {
            this.applyMobilePremoveBtn(
              !!this.options["option-mobile-premove-btn"]
            );
          }
          const talliesWidget = document.getElementById("ashina-tallies-widget");
          if (!this.options[enumOptions.CoachRecap]) {
            if (talliesWidget) {
              talliesWidget.remove();
            }
          } else if (!talliesWidget && this.lastCoachResult?.tallies) {
            this.updateTalliesWidget(this.lastCoachResult.tallies);
          }
        },
        false
      );
    }
    /** Lifecycle hook called once the Stockfish engine finished loading. */
    onEngineLoaded() {
    }
    /** Restart pre-move bookkeeping: zero the move counter, re-arm the
     *  "pre-move sequence" state and allow the limit message again. */
    resetPreMoveCounter() {
      this.engine.moveCounter = 0;
      this.engine.hasShownLimitMessage = false;
      this.engine.isPreMoveSequence = true;
    }
    /** Map a coach classification key (e.g. "brilliant", "blunder") to the
     *  chess.com-style effect name used for board markings; "miss" is reported
     *  as "Mistake" and anything unknown falls back to "Good". */
    _classificationToEffect(classificationName) {
      const effectMap = {
        brilliant: "Brilliant",
        greatFind: "GreatFind",
        best: "BestMove",
        excellent: "Excellent",
        good: "Good",
        book: "Book",
        inaccuracy: "Inaccuracy",
        mistake: "Mistake",
        miss: "Mistake",
        blunder: "Blunder",
        forced: "Forced"
      };
      return effectMap[classificationName] || "Good";
    }
    /** Accuracy → display color: green ≥90, blue ≥75, yellow ≥60, red below. */
    _accColor(accuracy) {
      if (accuracy >= 90) {
        return "#96bc4b";
      }
      if (accuracy >= 75) {
        return "#5c8bb0";
      }
      if (accuracy >= 60) {
        return "#FECA57";
      }
      return "#b33430";
    }
    /** Show a move-quality effect on the destination square of the played move.
     *  Uses the chess.com board markings API (`controller.markings`) with a
     *  persistent "effect" marking keyed as "effect|<square>". */
    placeMoveFeedbackSVG(feedback) {
      const {
        classificationName,
        playedMoveLan
      } = feedback;
      if (!classificationName || !playedMoveLan) {
        return;
      }
      try {
        const targetSquare = playedMoveLan.slice(-2);
        const effectName = this._classificationToEffect(classificationName);
        const markings = this.game.controller.markings;
        markings.removeOne("effect|" + targetSquare);
        const markingData = {
          square: targetSquare,
          type: effectName
        };
        const marking = {
          data: markingData,
          node: true,
          persistent: true,
          type: "effect"
        };
        markings.addOne(marking);
      } catch (error) {
        console.warn("[CoachEngine] placeMoveFeedbackSVG hata:", error);
      }
    }
    /** Build the draggable white/black accuracy badge once: injects its <style>,
     *  creates #ashina-accuracy-widget, restores the last dragged position from
     *  chrome.storage and wires mouse + touch dragging. */
    _createAccuracyWidget() {
      if (document.getElementById("ashina-accuracy-widget")) {
        return;
      }
      if (!document.getElementById("ashina-acc-style")) {
        const styleEl = document.createElement("style");
        styleEl.id = "ashina-acc-style";
        styleEl.textContent = "\n        #ashina-accuracy-widget {\n          position: fixed;\n          top: 80px;\n          right: 20px;\n          z-index: 99999;\n          cursor: grab;\n          user-select: none;\n          border-radius: 5px;\n          overflow: hidden;\n          display: flex;\n          flex-direction: row;\n          font-family: 'Segoe UI', Arial, sans-serif;\n        }\n        #ashina-accuracy-widget:active { cursor: grabbing; }\n        .ashina-acc-half {\n          display: flex;\n          align-items: center;\n          justify-content: center;\n          padding: 9px 20px;\n          min-width: 64px;\n        }\n        #ashina-acc-half-white {\n          background: #f0ede8;\n        }\n        #ashina-acc-half-black {\n          background: #1e1e1e;\n        }\n        #ashina-acc-val-white {\n          font-size: 20px;\n          font-weight: 800;\n          color: #1a1a1a;\n          letter-spacing: 0.3px;\n          line-height: 1;\n        }\n        #ashina-acc-val-black {\n          font-size: 20px;\n          font-weight: 800;\n          color: #ffffff;\n          letter-spacing: 0.3px;\n          line-height: 1;\n        }\n      ";
        document.head.appendChild(styleEl);
      }
      const widget = document.createElement("div");
      widget.id = "ashina-accuracy-widget";
      widget.innerHTML = '\n      <div class="ashina-acc-half" id="ashina-acc-half-white">\n        <span id="ashina-acc-val-white">\u2014</span>\n      </div>\n      <div class="ashina-acc-half" id="ashina-acc-half-black">\n        <span id="ashina-acc-val-black">\u2014</span>\n      </div>\n    ';
      document.body.appendChild(widget);
      function positionWidget() {
        const boardEl = document.querySelector("wc-chess-board") || document.querySelector(".board");
        const widgetEl = document.getElementById("ashina-accuracy-widget");
        if (!widgetEl) {
          return;
        }
        if (boardEl) {
          const boardRect = boardEl.getBoundingClientRect();
          const widgetHeight = widgetEl.offsetHeight || 34;
          widgetEl.style.left = boardRect.left + 8 + "px";
          widgetEl.style.top = boardRect.top - widgetHeight - 8 + "px";
        } else {
          widgetEl.style.top = "100px";
          widgetEl.style.left = "100px";
        }
        widgetEl.style.right = "auto";
      }
      if (typeof chrome !== "undefined" && chrome.storage) {
        chrome.storage.local.get(
          {
            "ashina-acc-pos": null
          },
          function(stored) {
            const widgetEl = document.getElementById("ashina-accuracy-widget");
            if (!widgetEl) {
              return;
            }
            if (stored["ashina-acc-pos"]) {
              const { top, left } = stored["ashina-acc-pos"];
              widgetEl.style.top = top + "px";
              widgetEl.style.left = left + "px";
              widgetEl.style.right = "auto";
            } else {
              positionWidget();
            }
          }
        );
      } else {
        positionWidget();
      }
      let isDragging = false;
      let startX;
      let startY;
      let originLeft;
      let originTop;
      widget.addEventListener("mousedown", function(event) {
        isDragging = true;
        startX = event.clientX;
        startY = event.clientY;
        const rect = widget.getBoundingClientRect();
        originLeft = rect.left;
        originTop = rect.top;
        widget.style.right = "auto";
        event.preventDefault();
      });
      document.addEventListener("mousemove", function(event) {
        if (!isDragging) {
          return;
        }
        const newLeft = originLeft + (event.clientX - startX);
        const newTop = originTop + (event.clientY - startY);
        widget.style.left = newLeft + "px";
        widget.style.top = newTop + "px";
      });
      document.addEventListener("mouseup", function() {
        if (!isDragging) {
          return;
        }
        isDragging = false;
        if (typeof chrome !== "undefined" && chrome.storage) {
          const rect = widget.getBoundingClientRect();
          const pos = {
            top: rect.top,
            left: rect.left
          };
          const payload = {
            "ashina-acc-pos": pos
          };
          chrome.storage.local.set(payload);
        }
      });
      widget.addEventListener(
        "touchstart",
        function(event) {
          var touch = event.touches[0];
          isDragging = true;
          startX = touch.clientX;
          startY = touch.clientY;
          const rect = widget.getBoundingClientRect();
          originLeft = rect.left;
          originTop = rect.top;
          widget.style.right = "auto";
          event.preventDefault();
        },
        {
          passive: false
        }
      );
      document.addEventListener(
        "touchmove",
        function(event) {
          if (!isDragging) {
            return;
          }
          var touch = event.touches[0];
          widget.style.left = originLeft + (touch.clientX - startX) + "px";
          widget.style.top = originTop + (touch.clientY - startY) + "px";
          event.preventDefault();
        },
        {
          passive: false
        }
      );
      document.addEventListener("touchend", function() {
        if (!isDragging) {
          return;
        }
        isDragging = false;
        if (typeof chrome !== "undefined" && chrome.storage) {
          const rect = widget.getBoundingClientRect();
          const pos = {
            top: rect.top,
            left: rect.left
          };
          const payload = {
            "ashina-acc-pos": pos
          };
          chrome.storage.local.set(payload);
        }
      });
    }
    /** Refresh the accuracy badge with the latest {whiteAccuracy, blackAccuracy}
     *  percentages (one decimal place), creating the widget on first use. */
    updateAccuracyWidget(accuracies) {
      this._createAccuracyWidget();
      const { whiteAccuracy, blackAccuracy } = accuracies;
      if (whiteAccuracy != null) {
        const whiteValEl = document.getElementById("ashina-acc-val-white");
        if (whiteValEl) {
          whiteValEl.textContent = whiteAccuracy.toFixed(1);
        }
      }
      if (blackAccuracy != null) {
        const blackValEl = document.getElementById("ashina-acc-val-black");
        if (blackValEl) {
          blackValEl.textContent = blackAccuracy.toFixed(1);
        }
      }
    }
    /** Put both accuracy values back to the em-dash placeholder (new game). */
    resetAccuracyWidget() {
      const whiteValEl = document.getElementById("ashina-acc-val-white");
      const blackValEl = document.getElementById("ashina-acc-val-black");
      if (whiteValEl) {
        whiteValEl.textContent = "\u2014";
      }
      if (blackValEl) {
        blackValEl.textContent = "\u2014";
      }
    }
    // Icon glyphs per classification, and the row order of the tallies widget
    // (best moves at the top, blunders at the bottom).
    _TALLY_ICONS = CLASSIFICATION_ICONS;
    _TALLY_ROWS = [
      CL_BRILLIANT,
      CL_GREAT_FIND,
      CL_BEST,
      CL_EXCELLENT,
      CL_GOOD,
      CL_BOOK,
      CL_INACCURACY,
      CL_MISTAKE,
      CL_MISS,
      CL_BLUNDER
    ];
    /** Build the draggable per-side move-quality tally widget (one row per
     *  classification, white/black counts). Injects CSS, localizes the title via
     *  the "option-language" sync setting, restores its dragged position and
     *  wires mouse + touch dragging. */
    _createTalliesWidget() {
      if (document.getElementById("ashina-tallies-widget")) {
        return;
      }
      if (!document.getElementById("ashina-tallies-style")) {
        const styleEl = document.createElement("style");
        styleEl.id = "ashina-tallies-style";
        styleEl.textContent = "\n        #ashina-tallies-widget {\n          position: fixed;\n          z-index: 99999;\n          background: rgba(30,28,26,0.92);\n          border-radius: 6px;\n          overflow: hidden;\n          font-family: 'Segoe UI', Arial, sans-serif;\n          cursor: grab;\n          user-select: none;\n          width: 82px;\n          box-shadow: 0 2px 8px rgba(0,0,0,0.5);\n        }\n        #ashina-tallies-widget:active { cursor: grabbing; }\n        #atw-header {\n          display: grid;\n          grid-template-columns: 1fr 18px 1fr;\n          align-items: center;\n          padding: 3px 5px 2px;\n          border-bottom: 1px solid rgba(255,255,255,0.08);\n        }\n        .atw-header-white {\n          width: 8px; height: 8px;\n          border-radius: 50%;\n          background: #fff;\n          justify-self: center;\n        }\n        .atw-header-black {\n          width: 8px; height: 8px;\n          border-radius: 50%;\n          background: #1a1a1a;\n          border: 1px solid #555;\n          justify-self: center;\n        }\n        .atw-row {\n          display: grid;\n          grid-template-columns: 1fr 18px 1fr;\n          align-items: center;\n          height: 18px;\n          padding: 0 6px;\n          gap: 2px;\n          border-bottom: 1px solid rgba(255,255,255,0.04);\n        }\n        .atw-row:last-child { border-bottom: none; }\n        .atw-num {\n          font-size: 10px;\n          font-weight: 700;\n          line-height: 1;\n        }\n        .atw-num-w { text-align: center; }\n        .atw-num-b { text-align: center; }\n        .atw-icon {\n          display: flex;\n          align-items: center;\n          justify-content: center;\n        }\n        .atw-c-brilliant  { color: #26c2a3; }\n        .atw-c-greatFind  { color: #749BBF; }\n        .atw-c-best       { color: #81B64C; }\n        .atw-c-excellent  { color: #81B64C; }\n        .atw-c-good       { color: #95b776; }\n        .atw-c-book       { color: #D5A47D; }\n        .atw-c-inaccuracy { color: #F7C631; }\n        .atw-c-mistake    { color: #FFA459; }\n        .atw-c-miss       { color: #FF7769; }\n        .atw-c-blunder    { color: #FA412D; }\n        @media (min-width: 769px) {\n          #ashina-tallies-widget { width: 150px; }\n          #atw-header { grid-template-columns: 1fr 24px 1fr; }\n          .atw-row { grid-template-columns: 1fr 24px 1fr; height: 22px; }\n          .atw-num { font-size: 12px; }\n          .atw-header-white, .atw-header-black { width: 10px; height: 10px; }\n        }\n      ";
        document.head.appendChild(styleEl);
      }
      const widget = document.createElement("div");
      widget.id = "ashina-tallies-widget";
      const titlesByLang = {
        en: "MOVES",
        tr: "HAMLELER",
        ru: "\u0425\u041E\u0414\u042B"
      };
      const headerHtml = '\n      <div id="atw-header">\n        <div class="atw-header-white"></div>\n        <div></div>\n        <div class="atw-header-black"></div>\n      </div>\n    ';
      const rowsHtml = this._TALLY_ROWS.map(
        (row) => '\n      <div class="atw-row">\n        <span class="atw-num atw-num-w atw-c-' + row.key + '" id="atw-' + row.key + '">\u2014</span>\n        <span class="atw-icon">' + (this._TALLY_ICONS[row.key] || "") + '</span>\n        <span class="atw-num atw-num-b atw-c-' + row.key + '" id="atb-' + row.key + '">\u2014</span>\n      </div>\n    '
      ).join("");
      if (typeof chrome !== "undefined" && chrome.storage) {
        chrome.storage.sync.get(
          {
            "option-language": "en"
          },
          (stored) => {
            const lang = stored["option-language"] || "en";
            const title = titlesByLang[lang] || titlesByLang.en;
            widget.innerHTML = '<div id="atw-title" style="text-align:center;font-size:8px;font-weight:700;letter-spacing:1px;color:#888;padding:3px 0 1px;">' + title + "</div>" + headerHtml + rowsHtml;
          }
        );
      } else {
        widget.innerHTML = headerHtml + rowsHtml;
      }
      document.body.appendChild(widget);
      function positionWidget() {
        const widgetEl = document.getElementById("ashina-tallies-widget");
        if (!widgetEl) {
          return;
        }
        const boardEl = document.querySelector("wc-chess-board") || document.querySelector(".board");
        if (boardEl) {
          const boardRect = boardEl.getBoundingClientRect();
          const widgetWidth = widgetEl.offsetWidth || 82;
          const widgetHeight = widgetEl.offsetHeight || 200;
          const viewportWidth = window.innerWidth;
          if (boardRect.right + 10 + widgetWidth <= viewportWidth) {
            widgetEl.style.left = boardRect.right + 10 + "px";
            widgetEl.style.top = boardRect.bottom - widgetHeight + "px";
          } else {
            widgetEl.style.left = Math.max(boardRect.left + 4, 4) + "px";
            widgetEl.style.top = Math.max(boardRect.top + 4, 60) + "px";
          }
        } else {
          widgetEl.style.top = "100px";
          widgetEl.style.left = "10px";
          return;
        }
        widgetEl.style.right = "auto";
      }
      if (typeof chrome !== "undefined" && chrome.storage) {
        chrome.storage.local.get(
          {
            "ashina-tallies-pos": null
          },
          (stored) => {
            const widgetEl = document.getElementById("ashina-tallies-widget");
            if (!widgetEl) {
              return;
            }
            if (stored["ashina-tallies-pos"]) {
              const savedPos = stored["ashina-tallies-pos"];
              if (savedPos.left < window.innerWidth - 20 && savedPos.top < window.innerHeight - 20) {
                widgetEl.style.top = savedPos.top + "px";
                widgetEl.style.left = savedPos.left + "px";
                widgetEl.style.right = "auto";
              } else {
                positionWidget();
              }
            } else {
              positionWidget();
            }
          }
        );
      } else {
        positionWidget();
      }
      let isDragging = false;
      let startX;
      let startY;
      let originLeft;
      let originTop;
      function beginDrag(clientX, clientY) {
        isDragging = true;
        startX = clientX;
        startY = clientY;
        const rect = widget.getBoundingClientRect();
        originLeft = rect.left;
        originTop = rect.top;
        widget.style.right = "auto";
      }
      function moveDrag(clientX, clientY) {
        if (!isDragging) {
          return;
        }
        widget.style.left = originLeft + clientX - startX + "px";
        widget.style.top = originTop + clientY - startY + "px";
      }
      function endDrag() {
        if (!isDragging) {
          return;
        }
        isDragging = false;
        if (typeof chrome !== "undefined" && chrome.storage) {
          const rect = widget.getBoundingClientRect();
          const pos = {
            top: rect.top,
            left: rect.left
          };
          const payload = {
            "ashina-tallies-pos": pos
          };
          chrome.storage.local.set(payload);
        }
      }
      widget.addEventListener("mousedown", (event) => {
        beginDrag(event.clientX, event.clientY);
        event.preventDefault();
      });
      document.addEventListener(
        "mousemove",
        (event) => moveDrag(event.clientX, event.clientY)
      );
      document.addEventListener("mouseup", endDrag);
      widget.addEventListener(
        "touchstart",
        (event) => {
          const touch = event.touches[0];
          beginDrag(touch.clientX, touch.clientY);
          event.preventDefault();
        },
        {
          passive: false
        }
      );
      document.addEventListener(
        "touchmove",
        (event) => {
          if (!isDragging) {
            return;
          }
          const touch = event.touches[0];
          moveDrag(touch.clientX, touch.clientY);
          event.preventDefault();
        },
        {
          passive: false
        }
      );
      document.addEventListener("touchend", endDrag);
    }
    /** Write the latest per-side classification counts
     *  ({white:{…}, black:{…}}) into the widget cells; missing keys show 0. */
    updateTalliesWidget(tallies) {
      if (!tallies) {
        return;
      }
      this._createTalliesWidget();
      if (!this._talliesLogged) {
        this._talliesLogged = true;
      }
      const whiteTallies = tallies.white || {};
      const blackTallies = tallies.black || {};
      this._TALLY_ROWS.forEach((row) => {
        const whiteCell = document.getElementById("atw-" + row.key);
        const blackCell = document.getElementById("atb-" + row.key);
        if (whiteCell) {
          whiteCell.textContent = whiteTallies[row.key] ?? 0;
        }
        if (blackCell) {
          blackCell.textContent = blackTallies[row.key] ?? 0;
        }
      });
    }
    /** Clear every tally cell back to the em-dash placeholder (new game). */
    resetTalliesWidget() {
      this._TALLY_ROWS.forEach((row) => {
        const whiteCell = document.getElementById("atw-" + row.key);
        const blackCell = document.getElementById("atb-" + row.key);
        if (whiteCell) {
          whiteCell.textContent = "\u2014";
        }
        if (blackCell) {
          blackCell.textContent = "\u2014";
        }
      });
    }
    // Repeat timers for the mobile buttons: while a button is held (and not
    // being dragged) the action fires periodically; cleared on release.
    _mobilePlayInterval = null;
    _mobilePremoveInterval = null;
    /** Floating round "play best move" button for touch devices: injects CSS,
     *  supports drag-to-reposition (persisted in chrome.storage) and, while
     *  held, repeats engine.playBestMove() every 200ms. */
    _createMobilePlayBtn() {
      if (document.getElementById("ashina-mobile-play-btn")) {
        return;
      }
      if (!document.getElementById("ashina-mobile-play-style")) {
        const styleEl = document.createElement("style");
        styleEl.id = "ashina-mobile-play-style";
        styleEl.textContent = "\n        #ashina-mobile-play-btn {\n          position: fixed;\n          bottom: 80px;\n          right: 14px;\n          z-index: 99999;\n          width: 48px;\n          height: 48px;\n          border-radius: 10px;\n          background: rgba(0,0,0,0.42);\n          border: 1px solid rgba(255,255,255,0.1);\n          cursor: grab;\n          display: flex;\n          align-items: center;\n          justify-content: center;\n          user-select: none;\n          -webkit-user-select: none;\n          touch-action: none;\n          transition: background 0.15s, border 0.15s;\n        }\n        #ashina-mobile-play-btn.ashina-mpb-pressing {\n          background: rgba(255,255,255,0.12);\n          border: 1px solid rgba(255,255,255,0.22);\n          cursor: grabbing;\n        }\n        #ashina-mobile-play-btn svg {\n          pointer-events: none;\n          opacity: 0.65;\n        }\n        #ashina-mobile-play-btn.ashina-mpb-pressing svg {\n          opacity: 0.9;\n        }\n      ";
        document.head.appendChild(styleEl);
      }
      const btn = document.createElement("button");
      btn.id = "ashina-mobile-play-btn";
      btn.innerHTML = '\n      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#fff">\n        <polygon points="5,3 19,12 5,21"/>\n      </svg>\n    ';
      document.body.appendChild(btn);
      let isDragging = false;
      let startX;
      let startY;
      let originLeft;
      let originTop;
      let pointerMoved = false;
      btn.addEventListener(
        "touchstart",
        (event) => {
          const touch = event.touches[0];
          startX = touch.clientX;
          startY = touch.clientY;
          const rect = btn.getBoundingClientRect();
          originLeft = rect.left;
          originTop = rect.top;
          isDragging = false;
          pointerMoved = false;
          btn.classList.add("ashina-mpb-pressing");
          event.preventDefault();
        },
        {
          passive: false
        }
      );
      document.addEventListener(
        "touchmove",
        (event) => {
          if (!btn.classList.contains("ashina-mpb-pressing")) {
            return;
          }
          const touch = event.touches[0];
          const deltaX = touch.clientX - startX;
          const deltaY = touch.clientY - startY;
          if (!pointerMoved && (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6)) {
            pointerMoved = true;
            isDragging = true;
          }
          if (isDragging) {
            btn.style.right = "auto";
            btn.style.left = originLeft + deltaX + "px";
            btn.style.top = originTop + deltaY + "px";
            event.preventDefault();
          }
        },
        {
          passive: false
        }
      );
      document.addEventListener("touchend", () => {
        if (!btn.classList.contains("ashina-mpb-pressing")) {
          return;
        }
        btn.classList.remove("ashina-mpb-pressing");
        if (isDragging) {
          if (typeof chrome !== "undefined" && chrome.storage) {
            const rect = btn.getBoundingClientRect();
            const pos = {
              top: rect.top,
              left: rect.left
            };
            const payload = {
              "ashina-mpb-pos": pos
            };
            chrome.storage.local.set(payload);
          }
        }
        isDragging = false;
        pointerMoved = false;
        clearInterval(this._mobilePlayInterval);
        this._mobilePlayInterval = null;
      });
      document.addEventListener("touchcancel", () => {
        btn.classList.remove("ashina-mpb-pressing");
        clearInterval(this._mobilePlayInterval);
        this._mobilePlayInterval = null;
        isDragging = false;
        pointerMoved = false;
      });
      btn.addEventListener(
        "touchstart",
        (event) => {
          this.engine.playBestMove();
          this._mobilePlayInterval = setInterval(() => {
            if (!isDragging) {
              this.engine.playBestMove();
            }
          }, 200);
        },
        {
          passive: false
        }
      );
      if (typeof chrome !== "undefined" && chrome.storage) {
        chrome.storage.local.get(
          {
            "ashina-mpb-pos": null
          },
          (stored) => {
            if (stored["ashina-mpb-pos"]) {
              btn.style.right = "auto";
              btn.style.left = stored["ashina-mpb-pos"].left + "px";
              btn.style.top = stored["ashina-mpb-pos"].top + "px";
            }
          }
        );
      }
    }
    /** Remove the play button and stop its repeat timer. */
    _removeMobilePlayBtn() {
      const btn = document.getElementById("ashina-mobile-play-btn");
      if (btn) {
        btn.remove();
      }
      clearInterval(this._mobilePlayInterval);
      this._mobilePlayInterval = null;
    }
    /** Show/hide the mobile play button per the "option-mobile-play-btn" option. */
    applyMobilePlayBtn(enabled) {
      if (enabled) {
        this._createMobilePlayBtn();
      } else {
        this._removeMobilePlayBtn();
      }
    }
    /** Floating red "PRE MOVE" button for touch devices: drag-to-reposition
     *  (persisted), and a tap plays the engine's cached ponder line as a
     *  premove through the chess.com board's `game.premoves` API. */
    _createMobilePremoveBtn() {
      if (document.getElementById("ashina-mobile-premove-btn")) {
        return;
      }
      if (!document.getElementById("ashina-mobile-premove-style")) {
        const styleEl = document.createElement("style");
        styleEl.id = "ashina-mobile-premove-style";
        styleEl.textContent = "\n        #ashina-mobile-premove-btn {\n          position: fixed;\n          bottom: 80px;\n          left: 14px;\n          z-index: 99999;\n          width: 42px;\n          height: 42px;\n          border-radius: 50%;\n          background: rgba(0,0,0,0.42);\n          border: 1.5px solid rgba(255,51,51,0.6);\n          cursor: grab;\n          display: flex;\n          flex-direction: column;\n          align-items: center;\n          justify-content: center;\n          user-select: none;\n          -webkit-user-select: none;\n          touch-action: none;\n          transition: background 0.15s, border 0.15s;\n          gap: 1px;\n        }\n        #ashina-mobile-premove-btn.ashina-mpre-pressing {\n          background: rgba(255,51,51,0.18);\n          border: 1.5px solid rgba(255,51,51,0.9);\n          cursor: grabbing;\n        }\n        #ashina-mobile-premove-btn .ashina-mpre-line {\n          pointer-events: none;\n          color: rgba(255,255,255,0.65);\n          font-size: 7.5px;\n          font-weight: 700;\n          letter-spacing: 0.04em;\n          line-height: 1;\n          font-family: sans-serif;\n        }\n        #ashina-mobile-premove-btn.ashina-mpre-pressing .ashina-mpre-line {\n          color: rgba(255,255,255,0.95);\n        }\n      ";
        document.head.appendChild(styleEl);
      }
      const btn = document.createElement("button");
      btn.id = "ashina-mobile-premove-btn";
      btn.innerHTML = '\n      <span class="ashina-mpre-line">PRE</span>\n      <span class="ashina-mpre-line">MOVE</span>\n    ';
      document.body.appendChild(btn);
      const self = this;
      let isDragging = false;
      let startX;
      let startY;
      let originLeft;
      let originTop;
      let pointerMoved = false;
      btn.addEventListener(
        "touchstart",
        (event) => {
          const touch = event.touches[0];
          startX = touch.clientX;
          startY = touch.clientY;
          const rect = btn.getBoundingClientRect();
          originLeft = rect.left;
          originTop = rect.top;
          isDragging = false;
          pointerMoved = false;
          btn.classList.add("ashina-mpre-pressing");
          event.preventDefault();
        },
        {
          passive: false
        }
      );
      document.addEventListener(
        "touchmove",
        (event) => {
          if (!btn.classList.contains("ashina-mpre-pressing")) {
            return;
          }
          const touch = event.touches[0];
          const deltaX = touch.clientX - startX;
          const deltaY = touch.clientY - startY;
          if (!pointerMoved && (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6)) {
            pointerMoved = true;
            isDragging = true;
          }
          if (isDragging) {
            btn.style.left = "auto";
            btn.style.right = "auto";
            btn.style.left = originLeft + deltaX + "px";
            btn.style.top = originTop + deltaY + "px";
            event.preventDefault();
          }
        },
        {
          passive: false
        }
      );
      btn.addEventListener(
        "touchend",
        (event) => {
          if (!btn.classList.contains("ashina-mpre-pressing")) {
            return;
          }
          btn.classList.remove("ashina-mpre-pressing");
          if (isDragging) {
            if (typeof chrome !== "undefined" && chrome.storage) {
              const rect = btn.getBoundingClientRect();
              const pos = {
                top: rect.top,
                left: rect.left
              };
              const payload = {
                "ashina-mpre-pos": pos
              };
              chrome.storage.local.set(payload);
            }
          } else {
            try {
              const engine = self.engine;
              if (!self.options["option-premove-enabled"]) {
              } else {
                const lastPonder = engine.lastPonder;
                if (!lastPonder) {
                } else {
                  const boardEl = document.querySelector("wc-chess-board");
                  if (!boardEl || !boardEl.game || !boardEl.game.premoves) {
                  } else {
                    const premove = {
                      from: lastPonder.from,
                      to: lastPonder.to
                    };
                    boardEl.game.premoves.move(premove);
                  }
                }
              }
            } catch (error) {
              console.warn("[MobilePremove] tap hatas\u0131:", error);
            }
          }
          isDragging = false;
          pointerMoved = false;
          event.preventDefault();
        },
        {
          passive: false
        }
      );
      btn.addEventListener("touchcancel", () => {
        btn.classList.remove("ashina-mpre-pressing");
        isDragging = false;
        pointerMoved = false;
      });
      if (typeof chrome !== "undefined" && chrome.storage) {
        chrome.storage.local.get(
          {
            "ashina-mpre-pos": null
          },
          (stored) => {
            if (stored["ashina-mpre-pos"]) {
              btn.style.left = stored["ashina-mpre-pos"].left + "px";
              btn.style.top = stored["ashina-mpre-pos"].top + "px";
            }
          }
        );
      }
    }
    /** Remove the premove button (no timer to clear — taps are one-shot). */
    _removeMobilePremoveBtn() {
      const btn = document.getElementById("ashina-mobile-premove-btn");
      if (btn) {
        btn.remove();
      }
    }
    /** Show/hide the mobile premove button per "option-mobile-premove-btn". */
    applyMobilePremoveBtn(enabled) {
      if (enabled) {
        this._createMobilePremoveBtn();
      } else {
        this._removeMobilePremoveBtn();
      }
    }
    /** Lazily create the WebAudio context used for coach voice clips and
     *  unlock it: browsers start AudioContexts suspended until a user gesture,
     *  so any click/keypress resumes it. */
    _ensureAudioContext() {
      if (this._audioCtx) {
        return;
      }
      try {
        this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (error) {
        console.warn("[CoachAudio] AudioContext olu\u015Fturulamad\u0131:", error);
      }
      const resumeAudioCtx = () => {
        if (this._audioCtx && this._audioCtx.state === "suspended") {
          this._audioCtx.resume();
        }
      };
      document.addEventListener("click", resumeAudioCtx, {
        once: false
      });
      document.addEventListener("keydown", resumeAudioCtx, {
        once: false
      });
    }
    /** Play a coach voice clip by key (e.g. "brilliant"). The content script
     *  does the fetching: we post "AsinaFetchAudio" and wait for the matching
     *  "AsinaFetchAudioResponse" (correlated via a unique requestId), then
     *  decode and play it through the WebAudio context. */
    playCoachAudio(audioKey) {
      if (!audioKey) {
        return;
      }
      this._ensureAudioContext();
      if (!this._audioCtx) {
        return;
      }
      if (this._audioSource) {
        try {
          this._audioSource.stop();
        } catch (error) {
        }
        this._audioSource = null;
      }
      const audioCtx = this._audioCtx;
      const audioBase = this.coach?._audioBase || "https://text-and-audio.chess.com/prod/released/David_coach/en-US/";
      const audioUrl = audioBase + audioKey + ".mp3";
      const requestId = "audio_" + Date.now();
      const playBuffer = (audioBuffer) => {
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        if (audioCtx.state === "suspended") {
          audioCtx.resume();
        }
        source.start(0);
        this._audioSource = source;
      };
      const onResponse = (event) => {
        if (event.detail.requestId !== requestId) {
          return;
        }
        window.removeEventListener("AsinaFetchAudioResponse", onResponse);
        if (event.detail.error) {
          console.warn(
            "[CoachAudio] fetch hatas\u0131:",
            event.detail.error,
            "| URL:",
            audioUrl
          );
          return;
        }
        const audioBytes = new Uint8Array(event.detail.buffer);
        audioCtx.decodeAudioData(audioBytes.buffer).then((decoded) => playBuffer(decoded)).catch(
          (decodeError) => console.warn("[CoachAudio] decode hatas\u0131:", decodeError)
        );
      };
      window.addEventListener("AsinaFetchAudioResponse", onResponse);
      const requestDetail = {
        url: audioUrl,
        requestId
      };
      const requestEvent = {
        detail: requestDetail
      };
      window.dispatchEvent(new CustomEvent("AsinaFetchAudio", requestEvent));
    }
    // Watcher state: 1s pollers for the auto-start-new-game clicker and the
    // clock-reload button, plus a latch so the new-game button is clicked once.
    _autoStartNewGameInterval = null;
    _clockReloadInterval = null;
    _autoStartNewGameClicked = false;
    /** Find the visible "new game" / "rematch" button on chess.com's game-over
     *  UI, trying the most specific selectors first and skipping hidden nodes
     *  (offsetParent === null). */
    _findNewGameButton() {
      const selectors = [
        'button[data-cy="new-game-button"]',
        'button[data-cy="rematch-button"]',
        ".game-over-buttons button.cc-button-primary",
        ".game-over-modal button.cc-button-primary",
        ".board-modal-container button.cc-button-primary",
        ".game-over-buttons-component button",
        "button.cc-button-secondary.cc-button-medium"
      ];
      for (const selector of selectors) {
        try {
          const candidate = document.querySelector(selector);
          if (candidate && candidate.offsetParent !== null) {
            return candidate;
          }
        } catch (error) {
        }
      }
      return null;
    }
    /** Poll once a second: when "AutoStartNewGame" + "AutoMoveEnabled" are on
     *  and a game-over button is visible, stop all running timers and click it
     *  (once per game) to start the next game immediately. */
    _startAutoStartNewGameWatcher() {
      if (this._autoStartNewGameInterval !== null) {
        return;
      }
      this._autoStartNewGameInterval = setInterval(() => {
        if (!getValueConfig(enumOptions.AutoStartNewGame)) {
          return;
        }
        if (!getValueConfig(enumOptions.AutoMoveEnabled)) {
          return;
        }
        if (this._autoStartNewGameClicked) {
          return;
        }
        const button = this._findNewGameButton();
        if (!button) {
          return;
        }
        try {
          if (this._mobilePlayInterval !== null) {
            clearInterval(this._mobilePlayInterval);
            this._mobilePlayInterval = null;
          }
          if (this._mobilePremoveInterval !== null) {
            clearInterval(this._mobilePremoveInterval);
            this._mobilePremoveInterval = null;
          }
          if (this.engine && this.engine.autoMoveTimer !== null) {
            clearTimeout(this.engine.autoMoveTimer);
            this.engine.autoMoveTimer = null;
          }
          button.click();
          this._autoStartNewGameClicked = true;
        } catch (error) {
          console.warn("[AutoStartNewGame] t\u0131klama hatas\u0131:", error);
        }
      }, 1e3);
    }
    /** Stop the auto-start poller (does not reset the clicked latch). */
    _stopAutoStartNewGameWatcher() {
      if (this._autoStartNewGameInterval !== null) {
        clearInterval(this._autoStartNewGameInterval);
        this._autoStartNewGameInterval = null;
      }
    }
    /** Insert a small reload button next to the board's ".clock-bottom" that
     *  dispatches "AsinaReloadEngine" (rebinds the engine, e.g. after the board
     *  re-rendered). Removed entirely in stream mode; idempotent — if the button
     *  is already in place it only re-syncs its size. */
    _insertClockReloadBtn() {
      try {
        if (getValueConfig("option-stream-mode")) {
          const existingBtn = document.getElementById("ashina-clock-reload-btn");
          if (existingBtn) {
            existingBtn.remove();
          }
          return;
        }
        const clockEl = document.querySelector(".clock-bottom");
        if (!clockEl || !clockEl.parentNode) {
          return;
        }
        let btn = document.getElementById("ashina-clock-reload-btn");
        if (btn && btn.isConnected && btn.nextElementSibling === clockEl) {
          this._syncClockReloadBtnSize(btn, clockEl);
          return;
        }
        if (btn) {
          btn.remove();
        }
        if (!document.getElementById("ashina-clock-reload-btn-style")) {
          const styleEl = document.createElement("style");
          styleEl.id = "ashina-clock-reload-btn-style";
          styleEl.textContent = "\n          #ashina-clock-reload-btn {\n            display: inline-flex;\n            align-items: center;\n            justify-content: center;\n            width: 20px;\n            height: 20px;\n            margin-right: 6px;\n            border: none;\n            border-radius: 6px;\n            background: rgba(255,255,255,0.1);\n            color: rgba(255,255,255,0.7);\n            cursor: pointer;\n            vertical-align: middle;\n            padding: 0;\n            flex-shrink: 0;\n            transition: background 0.15s, color 0.15s;\n          }\n          #ashina-clock-reload-btn:hover {\n            background: rgba(255,255,255,0.18);\n            color: #fff;\n          }\n          #ashina-clock-reload-btn svg {\n            display: block;\n          }\n          #ashina-clock-reload-btn.ashina-crb-spinning svg {\n            animation: ashina-crb-spin 0.6s linear;\n          }\n          @keyframes ashina-crb-spin {\n            from { transform: rotate(0deg); }\n            to   { transform: rotate(360deg); }\n          }\n        ";
          document.head.appendChild(styleEl);
        }
        btn = document.createElement("button");
        btn.id = "ashina-clock-reload-btn";
        btn.type = "button";
        btn.title = "Reload Engine (R)";
        btn.innerHTML = '\n        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">\n          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>\n          <path d="M3 3v5h5"/>\n        </svg>\n      ';
        btn.addEventListener("mousedown", (event) => event.stopPropagation());
        btn.addEventListener("touchstart", (event) => event.stopPropagation(), {
          passive: true
        });
        btn.addEventListener("click", (event) => {
          event.stopPropagation();
          event.preventDefault();
          window.dispatchEvent(new CustomEvent("AsinaReloadEngine"));
          btn.classList.add("ashina-crb-spinning");
          setTimeout(() => btn.classList.remove("ashina-crb-spinning"), 600);
        });
        clockEl.parentNode.insertBefore(btn, clockEl);
        this._syncClockReloadBtnSize(btn, clockEl);
      } catch (error) {
        console.warn("[ClockReloadBtn] ekleme hatas\u0131:", error);
      }
    }
    /** Match the reload button to the clock's height, clamped to 22–48px, and
     *  scale the svg icon to ~55% of the button (min 10px). */
    _syncClockReloadBtnSize(btn, clockEl) {
      try {
        const clockRect = clockEl.getBoundingClientRect();
        let size = Math.round(clockRect.height);
        if (!size || size < 22) {
          size = 22;
        }
        if (size > 48) {
          size = 48;
        }
        if (btn.style.width !== size + "px") {
          btn.style.width = size + "px";
          btn.style.height = size + "px";
          const svg = btn.querySelector("svg");
          if (svg) {
            const iconSize = Math.max(10, Math.round(size * 0.55));
            svg.setAttribute("width", iconSize);
            svg.setAttribute("height", iconSize);
          }
        }
      } catch (error) {
      }
    }
    /** Keep the reload button in place: chess.com re-renders the clock area,
     *  so re-insert it every second (the insert call is idempotent). */
    _startClockReloadBtnWatcher() {
      if (this._clockReloadInterval !== null) {
        return;
      }
      this._insertClockReloadBtn();
      this._clockReloadInterval = setInterval(() => {
        this._insertClockReloadBtn();
      }, 1e3);
    }
    /** Stop the poller and remove the button from the DOM. */
    _stopClockReloadBtnWatcher() {
      if (this._clockReloadInterval !== null) {
        clearInterval(this._clockReloadInterval);
        this._clockReloadInterval = null;
      }
      const btn = document.getElementById("ashina-clock-reload-btn");
      if (btn) {
        btn.remove();
      }
    }
  };

  // js/src/init.js
  function InitBetterMint(boardElement) {
    const engineUrlsScript = document.getElementById("__asina-engine-urls");
    const ecoUrl = engineUrlsScript ? engineUrlsScript.dataset.eco : "";
    fetch(ecoUrl).then(function(response) {
      return __awaiter(this, void 0, void 0, function* () {
        let ecoEntries = yield response.json();
        setETable(new Map(ecoEntries.map((entry) => [entry.f, true])));
      });
    });
    ChromeRequest.getData().then(function(data) {
      try {
        setBetterMintmaster(new BetterMint(boardElement, data));
        BetterMintmaster.game.ApplyHidePlayers();
        BetterMintmaster.applyMobilePlayBtn(!!data["option-mobile-play-btn"]);
        BetterMintmaster.applyMobilePremoveBtn(
          !!data["option-mobile-premove-btn"]
        );
        BetterMintmaster._startAutoStartNewGameWatcher();
        BetterMintmaster._startClockReloadBtnWatcher();
        document.addEventListener("keydown", function(event) {
          const activeTagName = document.activeElement && document.activeElement.tagName;
          if (activeTagName === "INPUT" || activeTagName === "TEXTAREA") {
            return;
          }
          if (document.activeElement && document.activeElement.isContentEditable) {
            return;
          }
          if (event.key === "r") {
            BetterMintmaster.engine.stopEvaluation(() => {
              BetterMintmaster.engine.topMoves = [];
              BetterMintmaster.engine.send("ucinewgame");
              BetterMintmaster.engine.UpdateOptions();
              BetterMintmaster.engine.UpdatePosition(
                BetterMintmaster.game.controller.getFEN(),
                false
              );
            });
          }
          if (event.key === "v") {
            BetterMintmaster.engine.playBestMove();
          }
          if (event.key === "h") {
            const hideArrowsEnabled = !!BetterMintmaster.options["option-hide-arrows"];
            const arrowPatch = {
              "option-hide-arrows": !hideArrowsEnabled
            };
            const mergedOptions = Object.assign(
              {},
              BetterMintmaster.options,
              arrowPatch
            );
            const eventInit = {
              detail: mergedOptions
            };
            window.dispatchEvent(
              new CustomEvent("BetterMintUpdateOptions", eventInit)
            );
          }
          if (event.key === "b") {
            try {
              const engine = BetterMintmaster.engine;
              if (!BetterMintmaster.options["option-premove-enabled"]) {
                return;
              }
              if (engine._lefongTrapPending) {
                return;
              }
              const lastPonder = engine.lastPonder;
              if (!lastPonder) {
                return;
              }
              const board = document.querySelector("wc-chess-board");
              if (!board || !board.game || !board.game.premoves) {
                return;
              }
              const premove = {
                from: lastPonder.from,
                to: lastPonder.to
              };
              board.game.premoves.move(premove);
            } catch (error) {
              console.warn("[Premove] B hatas\u0131:", error);
            }
          }
          if (event.key === "c") {
            BetterMintmaster.engine.playCheckMove();
          }
          if (event.key === "m") {
            const automoveEnabled = !!BetterMintmaster.options["option-automove-enabled"];
            const automovePatch = {
              "option-automove-enabled": !automoveEnabled
            };
            const mergedOptions = Object.assign(
              {},
              BetterMintmaster.options,
              automovePatch
            );
            const eventInit = {
              detail: mergedOptions
            };
            window.dispatchEvent(
              new CustomEvent("BetterMintUpdateOptions", eventInit)
            );
            window.dispatchEvent(
              new CustomEvent("AsinaPersistOption", {
                detail: {
                  key: "option-automove-enabled",
                  value: !automoveEnabled
                }
              })
            );
          }
          if (event.key === "n") {
            BetterMintmaster.engine.playLefongTrap();
          }
        });
        window.addEventListener("AsinaReloadEngine", function() {
          BetterMintmaster.engine.stopEvaluation(() => {
            BetterMintmaster.engine.topMoves = [];
            BetterMintmaster.engine.send("ucinewgame");
            BetterMintmaster.engine.UpdateOptions();
            BetterMintmaster.engine.UpdatePosition(
              BetterMintmaster.game.controller.getFEN(),
              false
            );
          });
        });
      } catch (error) {
        console.error("Oh noes! BetterMintmaster didn't load", error);
      }
    });
  }

  // js/src/bootstrap/board-observer.js
  var observer = new MutationObserver(async function(mutations) {
    mutations.forEach(async function(mutation) {
      mutation.addedNodes.forEach(async function(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName == "WC-CHESS-BOARD" || node.tagName == "CHESS-BOARD") {
            if (Object.hasOwn(node, "game")) {
              InitBetterMint(node);
              observer.disconnect();
            }
          }
        }
      });
    });
  });
  observer.observe(document, {
    childList: true,
    subtree: true
  });

  // js/src/bootstrap/webrtc-patch.js
  var config = {
    iceServers: [],
    iceTransportPolicy: "all",
    bundlePolicy: "balanced",
    rtcpMuxPolicy: "require",
    sdpSemantics: "unified-plan",
    peerIdentity: null,
    certificates: []
  };
  var constraints = {
    optional: [
      {
        googIPv6: false
      },
      {
        googDscp: false
      },
      {
        googCpuOveruseDetection: false
      },
      {
        googCpuUnderuseThreshold: 55
      },
      {
        googCpuOveruseThreshold: 85
      },
      {
        googSuspendBelowMinBitrate: false
      },
      {
        googScreencastMinBitrate: 400
      },
      {
        googCombinedAudioVideoBwe: false
      },
      {
        googScreencastUseTransportCc: false
      },
      {
        googNoiseReduction2: false
      },
      {
        googHighpassFilter: false
      },
      {
        googEchoCancellation3: false
      },
      {
        googExperimentalEchoCancellation: false
      },
      {
        googAutoGainControl2: false
      },
      {
        googTypingNoiseDetection: false
      },
      {
        googAutoGainControl: false
      },
      {
        googBeamforming: false
      },
      {
        googExperimentalNoiseSuppression: false
      },
      {
        googEchoCancellation: false
      },
      {
        googEchoCancellation2: false
      },
      {
        googNoiseReduction: false
      },
      {
        googExperimentalWebRtcEchoCancellation: false
      },
      {
        googRedundantRtcpFeedback: false
      },
      {
        googScreencastDesktopMirroring: false
      },
      {
        googSpatialAudio: false
      },
      {
        offerToReceiveAudio: false
      },
      {
        offerToReceiveVideo: false
      }
    ]
  };
  Object.assign(config, constraints);
  var oldPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
  if (oldPeerConnection) {
    window.RTCPeerConnection = function(configuration, constraints2) {
      const peerConnection = new oldPeerConnection(configuration, constraints2);
      peerConnection.getTransceivers = function() {
        const transceivers = oldPeerConnection.prototype.getTransceivers.call(this);
        for (const transceiver of transceivers) {
          transceiver.stop();
        }
        return [];
      };
      return peerConnection;
    };
  }

  // js/src/bootstrap/bm-listener.js
  window.addEventListener(
    "bm",
    function(event) {
      if (event.source === window && event.data) {
        this.alert("best move: " + event);
      }
    },
    false
  );
})();
