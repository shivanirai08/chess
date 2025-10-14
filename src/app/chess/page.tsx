"use client";

import Button from "@/components/ui/Button";
import { useState, useEffect, useRef } from "react";
import { Chess, Square, PieceSymbol } from "chess.js";
import {
  Chessboard,
  SquareHandlerArgs,
  defaultPieces,
  PieceDropHandlerArgs,
} from "react-chessboard";
import { useUser } from "@/context/UserContext";
import Image from "next/image";

export default function ChessPage() {
  const { user } = useUser();
  const [isDesktop, setIsDesktop] = useState(false);
  const [showAnimations, setShowAnimations] = useState(true);
  const [moves, setMoves] = useState<{ moveNumber: number; white?: string; black?: string }[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(()=>moves.length -1);

  // Initial game setup
  const chessGameRef = useRef(
    new Chess("4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3 w - - 0 1")
  );
  const chessGame = chessGameRef.current;

  const [chessPosition, setChessPosition] = useState(chessGame.fen());
  const [moveFrom, setMoveFrom] = useState("");
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});
  const [boardSize, setBoardSize] = useState(400);
  const [promotionMove, setPromotionMove] = useState<{from: Square; to: Square;} | null>(null);

  // resize board dynamically
  useEffect(() => {
    function updateSize() {
      if (typeof window === "undefined") return;
      setIsDesktop(window.innerWidth >= 1024);
      const width = window.innerWidth - 16;

      if (window.innerWidth <= 1024) {
        setBoardSize(width);
      } else {
        const height = window.innerHeight - 90;
        const width = window.innerWidth - 40;
        setBoardSize(Math.min(height, width));
      }
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Scroll to end of moves list
  const movesContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setCurrentMoveIndex(moves.length - 1); // always point to the latest move
    const c = movesContainerRef.current;
    if (!c) return;   // wait for layout, then scroll
    requestAnimationFrame(() => {
        c.scrollTo({ top: c.scrollHeight, behavior: "smooth" });
    });
  }, [moves]);

  // Highlight available moves
  function getMoveOptions(square: Square) {
    const moves = chessGame.moves({ square, verbose: true });
    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares: Record<string, React.CSSProperties> = {};
    for (const move of moves) {
      newSquares[move.to] = {
        background:
          chessGame.get(move.to) &&
          chessGame.get(move.to)?.color !== chessGame.get(square)?.color
            ? "radial-gradient(circle, rgba(197, 27, 27, 0.38) 75%, transparent 85%)"
            : "radial-gradient(circle, rgba(0,0,0,.2) 25%, transparent 25%)",
        borderRadius: "50%",
      };
    }

    newSquares[square] = { background: "rgba(255, 255, 0, 0.4)" };
    setOptionSquares(newSquares);
    return true;
  }

  // Click-to-move with promotion check
  function onSquareClick({ square, piece }: SquareHandlerArgs) {
    if (currentMoveIndex !== moves.length - 1) return;
    if (!moveFrom && piece) {
      const hasMoveOptions = getMoveOptions(square as Square);
      if (hasMoveOptions) setMoveFrom(square);
      return;
    }

    const possiblemoves = chessGame.moves({
      square: moveFrom as Square,
      verbose: true,
    });
    const foundMove = possiblemoves.find((m) => m.from === moveFrom && m.to === square);

    if (!foundMove) {
      const hasMoveOptions = getMoveOptions(square as Square);
      setMoveFrom(hasMoveOptions ? square : "");
      return;
    }

    // If it's a promotion move (pawn reaching last rank)
    if (foundMove.isPromotion()) {
      setPromotionMove({ from: moveFrom as Square, to: square as Square });
      setMoveFrom("");
      setOptionSquares({});
      return;
    }

    // Normal move
    try {
      chessGame.move({ from: moveFrom, to: square });
      setChessPosition(chessGame.fen());
      updateMoves();
    } catch {
      const hasMoveOptions = getMoveOptions(square as Square);
      setMoveFrom(hasMoveOptions ? square : "");
      return;
    }

    setMoveFrom("");
    setOptionSquares({});
  }

  // Handle piece drop (drag-and-drop)
  function onPieceDrop({ sourceSquare, targetSquare}: PieceDropHandlerArgs): boolean {
    if (currentMoveIndex !== moves.length - 1) return false;
    if (!targetSquare) return false;

    // get all verbose moves from the source square
    const possiblemoves = chessGame.moves({
      square: sourceSquare as Square,
      verbose: true,
    });

    // find exact move matching drop target
    const foundMove = possiblemoves.find(
      (m) => m.from === sourceSquare && m.to === targetSquare
    );

    if (!foundMove) return false;

    // promotion move (verbose move object provides helper)
    if (foundMove.isPromotion?.()) {
      setPromotionMove({
        from: sourceSquare as Square,
        to: targetSquare as Square,
      });
      // return true to accept the drop visually the actual move will be applied after player picks promotion piece
      return true;
    }

    // normal non-promotion move
    try {
      chessGame.move({
        from: sourceSquare as Square,
        to: targetSquare as Square,
        promotion: "q",
      });
      setChessPosition(chessGame.fen());
      updateMoves();
      setMoveFrom("");
      setOptionSquares({});
      return true;
    } catch {
      return false;
    }
  }

  // Handle promotion selection
  function handlePromotion(piece: PieceSymbol) {
    if (!promotionMove) return;
    try {
      chessGame.move({
        from: promotionMove.from,
        to: promotionMove.to,
        promotion: piece,
      });
      setChessPosition(chessGame.fen());
      updateMoves();
    } catch (e) {
      console.error("Promotion failed", e);
    }
    setPromotionMove(null);
  }

  //Handle move history
  function updateMoves() {
  const history = chessGame.history(); // ["d4", "d5", "f4", ...]
  const formatted: { moveNumber: number; white?: string; black?: string }[] = [];
  for (let i = 0; i < history.length; i += 2) {
    formatted.push({
      moveNumber: i / 2 + 1,
      white: history[i],
      black: history[i + 1],
    });
  }
  setMoves(formatted);
  }

  //Handle go to move
  function goToMove(index: number) {
      const newGame = new Chess("4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3 w - - 0 1"); // starting position
    
      for (let i = 0; i <= index; i++) {
        const move = moves[i];
        if (!move) break;
    
        // move.white
        if (move.white) {
          newGame.move(move.white);
        }
        // move.black
        if (i === index && !move.black) break; // last move might be white only
        if (move.black) {
          newGame.move(move.black);
        }
      }
    
      chessGameRef.current = newGame;
      setChessPosition(newGame.fen());
      setCurrentMoveIndex(index);
  }


  // ♟ Chessboard options
  const chessboardOptions = {
    position: chessPosition,
    onPieceDrop,
    onSquareClick,
    squareStyles: optionSquares,
    id: "click-to-move",
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

  return (
    <div className="h-full lg:h-screen w-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center pt-2 pb-3 px-4 border-white/10">
        <h1 className="text-2xl font-bold">Chess</h1>
        <div className="flex gap-2">
          <Button
            size="small"
            variant="secondary"
            onClick={() => setShowAnimations(!showAnimations)}
          >
            Draw
          </Button>
          <Button
            size="small"
            variant="destructive"
            onClick={() => console.log("Resign")}
            className="px-2 py-1"
          >
            Resign
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div
        className="flex gap-2 justify-center items-start flex-col lg:flex-row"
        style={isDesktop ? { height: `${boardSize}px` } : {}}
      >
        {/* Left: Chessboard */}
        <div className="relative flex justify-center items-center w-full lg:w-auto h-full">
          {promotionMove && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-black/80 backdrop-blur-md p-4 rounded shadow-lg flex gap-2">
                {(["q", "r", "b", "n"] as PieceSymbol[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePromotion(p)}
                    className="w-20 h-20 sm:w-24 sm:h-24 bg-zinc-800 hover:bg-zinc-700 rounded flex items-center justify-center"
                  >
                    {defaultPieces[
                      `w${p.toUpperCase()}` as keyof typeof defaultPieces
                    ]()}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Chessboard options={chessboardOptions} />
        </div>

        {/* Right: Sidebar */}
        <div className="w-full lg:w-1/3 flex flex-col justify-between h-full px-4 lg:pb-4">
          <div className="flex flex-col gap-4">
            {/* Player Info */}
            <div className="flex justify-between items-center p-1 sm:p-3 rounded-lg">
              <div className="flex justify-between items-center gap-2 sm:gap-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="sm:h-16 sm:w-16 h-12 w-12">
                    <Image
                      src={user.avatar}
                      alt="mee"
                      width={20}
                      height={20}
                      className="rounded-full sm:h-16 sm:w-16 h-12 w-12"
                    />
                  </div>
                  <span>{user.name}</span>
                </div>
                <span className="px-2 py-1 bg-zinc-900 rounded">08:05</span>
              </div>

              <div className="flex justify-center text-gray-400">vs</div>

              <div className="flex justify-between items-center sm:gap-4 gap-2">
                <span className="px-2 py-1 bg-zinc-900 rounded">08:05</span>
                <div className="flex flex-col items-center gap-2">
                  <div className="sm:h-16 sm:w-16 h-12 w-12">
                    <Image
                      src="/avatar8.svg"
                      alt="opponent"
                      width={20}
                      height={20}
                      className="rounded-full sm:h-16 sm:w-16 h-12 w-12"
                    />
                  </div>
                  <span>Opponent</span>
                </div>
              </div>
            </div>

            {/* Moves list */}
            <div className="relative bg-zinc-900 rounded-lg text-sm">
              <p className="font-semibold mb-2 sticky top-0 bg-zinc-900 p-2 rounded-lg">
                Moves
              </p>
              <div className="p-2 overflow-y-auto max-h-48 lg:max-h-78" ref={movesContainerRef}>
                <table className="w-full text-left">
                  <tbody >
                    {moves.map((row, idx) => (
                      <tr key={row.moveNumber} className={idx === currentMoveIndex ? 'bg-zinc-800' : ''}>
                        <td className="pr-1 text-gray-400 px-2 py-1 rounded-l-md">{row.moveNumber}.</td>
                        <td className="font-bold">{row.white}</td>
                        <td className="pl-2 rounded-r-md">{row.black}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-center gap-2 mt-4 lg:mt-0 sticky bottom-0 py-2 bg-black">
              <button
                className="px-3 py-2 bg-zinc-900 text-xl md:text-2xl cursor-pointer rounded-lg disabled:opacity-40"
                onClick={() => goToMove(-1)}
                disabled={currentMoveIndex <= -1}
              >⏮</button>
              <button
                className="px-3 py-2 bg-zinc-900 text-xl md:text-2xl cursor-pointer rounded-lg disabled:opacity-40"
                onClick={() => goToMove(Math.max(currentMoveIndex - 1, -1))}
                disabled={currentMoveIndex <= -1}
              >◀</button>
              <button
                className="px-3 py-2 bg-zinc-900 text-xl md:text-2xl cursor-pointer rounded-lg disabled:opacity-40"
                onClick={() => goToMove(Math.min(currentMoveIndex + 1, moves.length - 1))}
                disabled={currentMoveIndex >= moves.length - 1}
              >▶</button>
              <button
                className="px-3 py-2 bg-zinc-900 text-xl md:text-2xl cursor-pointer rounded-lg disabled:opacity-40"
                onClick={() => goToMove(moves.length - 1)}
                disabled={currentMoveIndex >= moves.length - 1}
              >⏭</button>
          </div>
        </div>
      </div>
    </div>
  );
}
