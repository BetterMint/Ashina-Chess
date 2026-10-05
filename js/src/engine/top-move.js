// ─── engine/top-move.js · one ranked engine line (uci move + eval + depth) ───
export class TopMove {
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
}