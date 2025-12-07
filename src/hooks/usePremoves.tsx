import { useState, useRef, useCallback } from "react";
import { PieceDropHandlerArgs } from "react-chessboard";
import { Chess, Square, PieceSymbol } from "chess.js";
import { toast } from "sonner";
import { isPseudoLegal } from "@/utils/pseudoLegal";
import {
  applyPremoveToFen,
  recalculatePreviewPosition,
} from "@/utils/fenHelpers";

interface PremoveWithPromotion extends PieceDropHandlerArgs {
  promotion?: PieceSymbol;
  needsPromotion?: boolean;
}

export function usePremoves(chessGame: Chess) {
  const [premoves, setPremoves] = useState<PremoveWithPromotion[]>([]);
  const premovesRef = useRef<PremoveWithPromotion[]>([]);
  const [previewPosition, setPreviewPosition] = useState<string | null>(null);
  const [isAnimatingPremoveBack, setIsAnimatingPremoveBack] = useState(false);
  const [invalidPremoveSquares, setInvalidPremoveSquares] = useState<string[]>(
    []
  );
  const [pendingPromotionPremove, setPendingPromotionPremove] = useState<{
    sourceSquare: string;
    targetSquare: string;
    piece: PieceDropHandlerArgs["piece"];
    playerColor: "white" | "black";
  } | null>(null);

  const animatePremovesBack = useCallback(() => {
    const squares = premovesRef.current.flatMap((p) =>
      [p.sourceSquare, p.targetSquare].filter(Boolean) as string[]
    );
    setInvalidPremoveSquares(squares);
    setIsAnimatingPremoveBack(true);

    setTimeout(() => {
      premovesRef.current = [];
      setPremoves([]);
      setPreviewPosition(null);
      setIsAnimatingPremoveBack(false);
      setInvalidPremoveSquares([]);
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

      // 5. Check if it's a promotion move
      const isPawn = piece.pieceType.toLowerCase().includes('p');
      const targetRank = targetSquare[1];
      const isPromotionMove = isPawn && (targetRank === '1' || targetRank === '8');

      if (isPromotionMove) {
        // Store pending promotion premove for user to choose piece
        setPendingPromotionPremove({
          sourceSquare,
          targetSquare,
          piece,
          playerColor
        });
        return true; // Return true to indicate valid premove shape
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
      const premoveData: PremoveWithPromotion = { 
        sourceSquare, 
        targetSquare, 
        piece,
        needsPromotion: false
      };
      premovesRef.current.push(premoveData);
      setPremoves([...premovesRef.current]);
      setPreviewPosition(newFen);

      return true;
    },
    [previewPosition, chessGame]
  );

  const completePremovePromotion = useCallback(
    (promotionPiece: PieceSymbol) => {
      if (!pendingPromotionPremove) return;

      const { sourceSquare, targetSquare, piece } = pendingPromotionPremove;
      const currentFen = previewPosition || chessGame.fen();

      // Apply visually with promotion - THIS NOW SHOWS THE SELECTED PIECE
      const newFen = applyPremoveToFen(
        currentFen,
        sourceSquare,
        targetSquare,
        piece,
        promotionPiece // Pass the selected piece to show it visually
      );
      if (!newFen) {
        setPendingPromotionPremove(null);
        return;
      }

      // Add to queue with promotion choice
      const premoveData: PremoveWithPromotion = { 
        sourceSquare, 
        targetSquare, 
        piece,
        promotion: promotionPiece,
        needsPromotion: true
      };
      premovesRef.current.push(premoveData);
      setPremoves([...premovesRef.current]);
      setPreviewPosition(newFen);
      setPendingPromotionPremove(null);
    },
    [pendingPromotionPremove, previewPosition, chessGame]
  );

  const cancelPremovePromotion = useCallback(() => {
    setPendingPromotionPremove(null);
  }, []);

  const executePremoves = useCallback(
    (onMoveExecuted: (moveData: { from: Square; to: Square; promotion?: PieceSymbol }) => void) => {
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

        const moveData: { from: Square; to: Square; promotion?: PieceSymbol } = {
          from: nextPremove.sourceSquare as Square,
          to: targetSquare as Square,
        };

        // Use the user's promotion choice if available
        if (nextPremove.needsPromotion && nextPremove.promotion) {
          moveData.promotion = nextPremove.promotion;
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
    setPendingPromotionPremove(null);
  }, []);

  return {
    premoves,
    previewPosition,
    isAnimatingPremoveBack,
    invalidPremoveSquares,
    pendingPromotionPremove,
    addPremove,
    executePremoves,
    clearPremoves,
    animatePremovesBack,
    completePremovePromotion,
    cancelPremovePromotion,
  };
}
