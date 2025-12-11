import { PieceDropHandlerArgs } from "react-chessboard";
import { PieceSymbol } from "chess.js";

// Manually apply premove to FEN (bypassing chess.js validation) 
// Used for visual preview of premoves
export function applyPremoveToFen(
  fen: string,
  from: string,
  to: string,
  _piece: PieceDropHandlerArgs["piece"],
  promotionPiece?: PieceSymbol // Add promotion parameter
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

    // Determine the piece to place at destination
    let movedPiece = pieceAtSource;
    
    // If promotion piece is provided, use it
    if (promotionPiece) {
      const isWhite = pieceAtSource === pieceAtSource.toUpperCase();
      movedPiece = isWhite ? promotionPiece.toUpperCase() : promotionPiece.toLowerCase();
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
  remainingPremoves: Array<PieceDropHandlerArgs & { promotion?: PieceSymbol; needsPromotion?: boolean }>
): string | null {
  let currentFen = baseFen;

  for (const premove of remainingPremoves) {
    const newFen = applyPremoveToFen(
      currentFen,
      premove.sourceSquare,
      premove.targetSquare as string,
      premove.piece,
      premove.promotion // Pass promotion piece if available
    );

    if (!newFen) return null;
    currentFen = newFen;
  }

  return currentFen;
}
