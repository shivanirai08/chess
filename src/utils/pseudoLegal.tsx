import { Chess, Square } from "chess.js";

// Check if a move is pseudo-legal (follows piece movement rules, ignores check)
// Used for premove validation at creation time
export function isPseudoLegal(
  from: string,
  to: string,
  piece: string,
  board: Chess
): boolean {
  const toSquare = to as Square;

  const pieceType = piece.toLowerCase().charAt(1); // 'p', 'n', 'b', 'r', 'q', 'k'
  const pieceColor = piece.charAt(0); // 'w' or 'b'

  const fromFile = from.charCodeAt(0) - 97; // a=0, b=1, etc.
  const fromRank = parseInt(from[1]) - 1; // 1=0, 2=1, etc.
  const toFile = to.charCodeAt(0) - 97;
  const toRank = parseInt(to[1]) - 1;

  const fileDiff = Math.abs(toFile - fromFile);
  const rankDiff = Math.abs(toRank - fromRank);
  const fileDir = toFile - fromFile;
  const rankDir = toRank - fromRank;

  const targetPiece = board.get(toSquare);
  const isCapture = targetPiece && targetPiece.color !== pieceColor;
  const isEmpty = !targetPiece;

  // Helper to check if path is clear for sliding pieces
  const isPathClear = (
    fromF: number,
    fromR: number,
    toF: number,
    toR: number
  ): boolean => {
    const fStep = toF === fromF ? 0 : toF > fromF ? 1 : -1;
    const rStep = toR === fromR ? 0 : toR > fromR ? 1 : -1;

    let f = fromF + fStep;
    let r = fromR + rStep;

    while (f !== toF || r !== toR) {
      const sq = String.fromCharCode(97 + f) + (r + 1);
      if (board.get(sq as Square)) return false;
      f += fStep;
      r += rStep;
    }
    return true;
  };

  switch (pieceType) {
    case "p": // Pawn
      const direction = pieceColor === "w" ? 1 : -1;
      const startRank = pieceColor === "w" ? 1 : 6;

      // Forward move (1 square)
      if (fileDir === 0 && rankDir === direction && isEmpty) {
        return true;
      }

      // Forward move (2 squares from start)
      if (
        fileDir === 0 &&
        rankDir === 2 * direction &&
        fromRank === startRank &&
        isEmpty
      ) {
        const middleSquare =
          String.fromCharCode(97 + fromFile) + (fromRank + direction + 1);
        if (board.get(middleSquare as Square)) return false;
        return true;
      }

      // Diagonal capture
      if (fileDiff === 1 && rankDir === direction) {
        if (isCapture) return true;

        // Allow diagonal to empty square (might be en-passant later)
        const epRank = pieceColor === "w" ? 5 : 2;
        if (toRank === epRank) return true;

        return false;
      }

      return false;

    case "n": // Knight
      return (fileDiff === 2 && rankDiff === 1) || (fileDiff === 1 && rankDiff === 2);

    case "b": // Bishop
      if (fileDiff !== rankDiff) return false;
      return isPathClear(fromFile, fromRank, toFile, toRank);

    case "r": // Rook
      if (fileDiff !== 0 && rankDiff !== 0) return false;
      return isPathClear(fromFile, fromRank, toFile, toRank);

    case "q": // Queen
      if (fileDiff !== 0 && rankDiff !== 0 && fileDiff !== rankDiff) return false;
      return isPathClear(fromFile, fromRank, toFile, toRank);

    case "k": // King
      // Adjacent square
      if (fileDiff <= 1 && rankDiff <= 1 && fileDiff + rankDiff > 0) {
        return true;
      }

      // Castling shape
      if (rankDiff === 0 && fileDiff === 2) {
        const isKingside = toFile > fromFile;
        const rookFile = isKingside ? 7 : 0;
        const rookSquare =
          String.fromCharCode(97 + rookFile) + (fromRank + 1);
        const rookPiece = board.get(rookSquare as Square);

        if (
          !rookPiece ||
          rookPiece.type !== "r" ||
          rookPiece.color !== pieceColor
        ) {
          return false;
        }

        // Check path is clear
        const step = isKingside ? 1 : -1;
        for (let f = fromFile + step; f !== rookFile; f += step) {
          const sq = String.fromCharCode(97 + f) + (fromRank + 1);
          if (board.get(sq as Square)) return false;
        }

        return true;
      }

      return false;

    default:
      return false;
  }
}
