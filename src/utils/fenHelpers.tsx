import { PieceDropHandlerArgs } from "react-chessboard";

// Manually apply premove to FEN (bypassing chess.js validation) 
// Used for visual preview of premoves
export function applyPremoveToFen(
  fen: string,
  from: string,
  to: string,
  piece: PieceDropHandlerArgs["piece"]
): string | null {
  try {
    const [board, turn, castling, enPassant, halfMove, fullMove] =
      fen.split(" ");

    // Convert board string to 2D array
    const rows = board.split("/");
    const boardArray: (string | null)[][] = rows.map((row) => {
      const squares: (string | null)[] = [];
      for (const char of row) {
        if (char >= "1" && char <= "8") {
          const count = parseInt(char);
          for (let i = 0; i < count; i++) squares.push(null);
        } else {
          squares.push(char);
        }
      }
      return squares;
    });

    // Convert square notation to array indices
    const fromFile = from.charCodeAt(0) - 97;
    const fromRank = 8 - parseInt(from[1]);
    const toFile = to.charCodeAt(0) - 97;
    const toRank = 8 - parseInt(to[1]);

    // Check if source square has the piece
    const pieceAtSource = boardArray[fromRank]?.[fromFile];
    if (!pieceAtSource) return null;

    // Move the piece
    let movedPiece = pieceAtSource;

    // Auto-promote pawns that reach the last rank (for visual preview)
    const isPawn = movedPiece.toLowerCase() === 'p';
    const targetRank = to[1]; // '1' to '8'
    if (isPawn && (targetRank === '1' || targetRank === '8')) {
      // Promote to queen (same color as the pawn)
      movedPiece = movedPiece === 'P' ? 'Q' : 'q';
    }

    boardArray[toRank][toFile] = movedPiece;
    boardArray[fromRank][fromFile] = null;

    // Convert back to FEN board string
    const newBoard = boardArray
      .map((row) => {
        let rowStr = "";
        let emptyCount = 0;
        for (const square of row) {
          if (square === null) {
            emptyCount++;
          } else {
            if (emptyCount > 0) {
              rowStr += emptyCount;
              emptyCount = 0;
            }
            rowStr += square;
          }
        }
        if (emptyCount > 0) rowStr += emptyCount;
        return rowStr;
      })
      .join("/");

    // Return new FEN with same turn (premove doesn't change turn)
    return `${newBoard} ${turn} ${castling} ${enPassant} ${halfMove} ${fullMove}`;
  } catch {
    return null;
  }
}

// Recalculate preview position from remaining premoves
export function recalculatePreviewPosition(
  baseFen: string,
  remainingPremoves: PieceDropHandlerArgs[]
): string | null {
  let currentFen = baseFen;

  for (const premove of remainingPremoves) {
    const newFen = applyPremoveToFen(
      currentFen,
      premove.sourceSquare,
      premove.targetSquare as string,
      premove.piece
    );

    if (!newFen) return null;
    currentFen = newFen;
  }

  return currentFen;
}
