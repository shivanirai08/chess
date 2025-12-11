import React, { useMemo } from "react";
import {
  PieceDropHandlerArgs,
  SquareHandlerArgs,
  PieceHandlerArgs,
} from "react-chessboard";

interface UseBoardStylingParams {
  optionSquares: Record<string, React.CSSProperties>;
  premoves: PieceDropHandlerArgs[];
  isAnimatingPremoveBack: boolean;
  invalidPremoveSquares: string[];
  previewPosition: string | null;
  chessPosition: string;
  boardOrientation: "white" | "black";
  boardSize: number;
  showAnimations: boolean;
  onPieceDrop: (args: PieceDropHandlerArgs) => boolean;
  onSquareClick: (args: SquareHandlerArgs) => void;
  onSquareRightClick: (args: SquareHandlerArgs) => void;
  canDragPiece: (args: PieceHandlerArgs) => boolean;
  checkSquare?: string | null; // Add this
}

//Custom hook for managing chessboard styling and configuration
export function useBoardStyling(params: UseBoardStylingParams) {
  const {
    optionSquares,
    premoves,
    isAnimatingPremoveBack,
    invalidPremoveSquares,
    previewPosition,
    chessPosition,
    boardOrientation,
    boardSize,
    showAnimations,
    onPieceDrop,
    onSquareClick,
    onSquareRightClick,
    canDragPiece,
    checkSquare, // Add this
  } = params;

  const chessboardOptions = useMemo(() => {
    // Combine option squares with premove highlights
    const combinedSquareStyles: Record<string, React.CSSProperties> = {
      ...optionSquares,
    };

    // Add highlights for premoves with different colors for each (like chess.com)
    const premoveColors = [
      "rgba(255, 0, 0, 0.6)", // Red for first premove
      "rgba(255, 100, 0, 0.6)", // Orange for second
      "rgba(255, 170, 0, 0.6)", // Yellow-orange for third
      "rgba(255, 200, 0, 0.6)", // Yellow for fourth
    ];

    // If animating premove back (invalid), show red flash on affected squares
    if (isAnimatingPremoveBack) {
      for (const square of invalidPremoveSquares) {
        combinedSquareStyles[square] = {
          backgroundColor: "rgba(255, 50, 50, 0.7)",
          boxShadow: "0 0 20px rgba(255, 0, 0, 0.8) inset",
          transition: "all 0.5s ease-out",
        };
      }
    } else {
      // Normal premove highlights when not animating back
      for (let i = 0; i < premoves.length; i++) {
        const premove = premoves[i];
        if (premove.targetSquare) {
          const color = premoveColors[i % premoveColors.length];
          combinedSquareStyles[premove.targetSquare] = {
            backgroundColor: color,
          };
        }
      }
    }

    // Create arrows for premoves with different colors
    const premoveArrows: [string, string | null, string][] = premoves.map(
      (premove, i) => [
        premove.sourceSquare,
        premove.targetSquare,
        premoveColors[i % premoveColors.length],
      ]
    );

    // Add check square highlighting (red glow)
    if (checkSquare) {
      combinedSquareStyles[checkSquare] = {
        background:
          "radial-gradient(circle, rgba(255, 0, 0, 0.5) 40%, rgba(255, 0, 0, 0.3) 70%, transparent 100%)",
        boxShadow: "inset 0 0 20px rgba(255, 0, 0, 0.6)",
      };
    }

    return {
      position: previewPosition || chessPosition, // Use preview if premoves exist
      onPieceDrop,
      onSquareClick,
      onSquareRightClick,
      canDragPiece,
      boardOrientation,
      squareStyles: combinedSquareStyles,
      customArrows: premoveArrows,
      id: "multiplayer-chess",
      showAnimations,
      boardStyle: {
        borderRadius: "10px",
        boxShadow: "0 0 10px 0 rgba(0, 0, 0, 0.5)",
        border: "1px solid #000",
        margin: "20px 0",
        width: `${boardSize}px`,
        height: `${boardSize}px`,
      },
      darkSquareStyle: { backgroundColor: "#b58863" },
      lightSquareStyle: { backgroundColor: "beige" },
    };
  }, [
    optionSquares,
    premoves,
    isAnimatingPremoveBack,
    invalidPremoveSquares,
    previewPosition,
    chessPosition,
    boardOrientation,
    boardSize,
    showAnimations,
    onPieceDrop,
    onSquareClick,
    onSquareRightClick,
    canDragPiece,
    checkSquare,
  ]);

  return { chessboardOptions };
}
