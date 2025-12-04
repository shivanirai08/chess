import { useState, useRef, useCallback } from "react";
import { PieceDropHandlerArgs } from "react-chessboard";
import { Chess, Square } from "chess.js";
import { toast } from "sonner";
import { isPseudoLegal } from "@/utils/pseudoLegal";
import {
  applyPremoveToFen,
  recalculatePreviewPosition,
} from "@/utils/fenHelpers";

export function usePremoves(chessGame: Chess) {
  const [premoves, setPremoves] = useState<PieceDropHandlerArgs[]>([]);
  const premovesRef = useRef<PieceDropHandlerArgs[]>([]);
  const [previewPosition, setPreviewPosition] = useState<string | null>(null);
  const [isAnimatingPremoveBack, setIsAnimatingPremoveBack] = useState(false);
  const [invalidPremoveSquares, setInvalidPremoveSquares] = useState<string[]>(
    []
  );

  const animatePremovesBack = useCallback(() => {
    const invalidSquares = premovesRef.current
      .flatMap((p) => [p.sourceSquare, p.targetSquare])
      .filter((square): square is string => square !== null);
    setInvalidPremoveSquares(invalidSquares);

    setIsAnimatingPremoveBack(true);
    setPreviewPosition(null);

    setTimeout(() => {
      premovesRef.current = [];
      setPremoves([]);
      setInvalidPremoveSquares([]);
      setIsAnimatingPremoveBack(false);
    }, 500);
  }, []);

  const addPremove = useCallback(
    (
      sourceSquare: string,
      targetSquare: string,
      piece: PieceDropHandlerArgs["piece"],
      playerColor: "white" | "black"
    ): boolean => {
      const currentFen = previewPosition || chessGame.fen();
      const testBoard = new Chess(currentFen);

      // 1. Piece must exist at source
      const pieceAtSource = testBoard.get(sourceSquare as Square);
      if (!pieceAtSource) {
        toast.error("Invalid premove - no piece there");
        return false;
      }

      // 2. Piece must belong to player
      const pieceColor = piece.pieceType[0];
      if (pieceAtSource.color !== pieceColor) {
        toast.error("Invalid premove - not your piece");
        return false;
      }

      // 3. Target must not have own piece
      const targetPiece = testBoard.get(targetSquare as Square);
      if (targetPiece && targetPiece.color === pieceColor) {
        toast.error("Invalid premove - can't capture own piece");
        return false;
      }

      // 4. PSEUDO-LEGAL CHECK
      if (!isPseudoLegal(sourceSquare, targetSquare, piece.pieceType, testBoard)) {
        toast.error("Invalid premove - illegal piece movement");
        return false;
      }

      // Apply visually
      const newFen = applyPremoveToFen(
        currentFen,
        sourceSquare,
        targetSquare,
        piece
      );
      if (!newFen) return false;

      // Add to queue
      premovesRef.current.push({ sourceSquare, targetSquare, piece });
      setPremoves([...premovesRef.current]);
      setPreviewPosition(newFen);

      return true;
    },
    [previewPosition, chessGame]
  );

  const executePremoves = useCallback(
    (onMoveExecuted: (moveData: { from: Square; to: Square; promotion?: "q" }) => void) => {
      if (premovesRef.current.length === 0) {
        setPreviewPosition(null);
        setPremoves([]);
        return;
      }

      const nextPremove = premovesRef.current[0];

      // Check if piece still exists
      const pieceAtSource = chessGame.get(nextPremove.sourceSquare as Square);
      if (!pieceAtSource) {
        premovesRef.current.shift();
        setPremoves([...premovesRef.current]);
        animatePremovesBack();
        toast.info("Premove canceled - piece was captured");
        setPreviewPosition(null);
        return;
      }

      // Get legal moves
      const legalMoves = chessGame.moves({ verbose: true });
      const foundMove = legalMoves.find(
        (m) =>
          m.from === nextPremove.sourceSquare && m.to === nextPremove.targetSquare
      );

      if (foundMove) {
        // Execute premove
        const targetSquare = nextPremove.targetSquare;
        if (!targetSquare) {
          premovesRef.current.shift();
          setPremoves([...premovesRef.current]);
          animatePremovesBack();
          toast.info("Premove canceled - invalid target");
          setPreviewPosition(null);
          return;
        }

        const isPawn = nextPremove.piece.pieceType.toLowerCase().includes("p");
        const targetRank = targetSquare[1];
        const isPromotion = isPawn && (targetRank === "8" || targetRank === "1");

        const moveData: { from: Square; to: Square; promotion?: "q" } = {
          from: nextPremove.sourceSquare as Square,
          to: targetSquare as Square,
        };

        if (isPromotion) {
          moveData.promotion = "q";
        }

        const premoveResult = chessGame.move(moveData);
        if (premoveResult) {
          premovesRef.current.shift();
          setPremoves([...premovesRef.current]);

          // Recalculate preview
          if (premovesRef.current.length > 0) {
            const newPreview = recalculatePreviewPosition(
              chessGame.fen(),
              premovesRef.current
            );
            setPreviewPosition(newPreview);
          } else {
            setPreviewPosition(null);
          }

          onMoveExecuted(moveData);
        } else {
          premovesRef.current.shift();
          setPremoves([...premovesRef.current]);
          animatePremovesBack();
          toast.error("Premove failed");
        }
      } else {
        // Invalid
        premovesRef.current.shift();
        setPremoves([...premovesRef.current]);
        animatePremovesBack();
        toast.info("Premove canceled - no longer legal");
        setPreviewPosition(null);
      }
    },
    [chessGame, animatePremovesBack]
  );

  const clearPremoves = useCallback(() => {
    premovesRef.current = [];
    setPremoves([]);
    setPreviewPosition(null);
  }, []);

  return {
    premoves,
    previewPosition,
    isAnimatingPremoveBack,
    invalidPremoveSquares,
    addPremove,
    executePremoves,
    clearPremoves,
    animatePremovesBack,
  };
}
