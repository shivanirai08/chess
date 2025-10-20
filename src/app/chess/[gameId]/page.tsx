"use client";

import Button from "@/components/ui/Button";
import React, { useState, useEffect, useRef } from "react";
import { Chess, Square, PieceSymbol } from "chess.js";
import {
  Chessboard,
  SquareHandlerArgs,
  defaultPieces,
  PieceDropHandlerArgs,
} from "react-chessboard";
import { useUser } from "@/context/UserContext";
import Image from "next/image";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";

export default function ChessPage() {
  const { user } = useUser();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showAnimations, setShowAnimations] = useState(true);
  const [moves, setMoves] = useState<{ moveNumber: number; white?: string; black?: string }[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(() => moves.length - 1);

  // Game setup
  const chessGameRef = useRef(new Chess("4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3 w - - 0 1"));
  const chessGame = chessGameRef.current;
  const [chessPosition, setChessPosition] = useState(chessGame.fen());
  const [moveFrom, setMoveFrom] = useState("");
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});
  const [boardSize, setBoardSize] = useState(400);
  const [promotionMove, setPromotionMove] = useState<{ from: Square; to: Square } | null>(null);

  // helper: derive gameId from URL (works client-side)
  const getGameIdFromPath = () => {
    if (typeof window === "undefined") return null;
    const parts = window.location.pathname.split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1] : null;
  };

  //Helper to get JWT token
  const getToken = () => {
    if (typeof window === "undefined") return null;
    try {
      const local = localStorage.getItem("token");
      const session = sessionStorage.getItem("token");
      return (local || session || null);
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      toast.error("Login required to connect to game");
      return;
    }

    const gameId = getGameIdFromPath();

    console.log("Connecting to socket...");
    const newSocket = io(`${process.env.NEXT_PUBLIC_WEBSOCKET_URL}`, {
      auth: { token },
    });

    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
      toast.success("Connected to game server");
      // join the game room using required event name
      if (gameId) {
        newSocket.emit("join-game", gameId);
        console.log("Emitted join-game for", gameId);
      }
    });

    newSocket.on("connect_error", (err) => {
      console.error("Socket error:", err.message);
      toast.error(`Connection error: ${err.message}`);
    });

    newSocket.on("game-state", (data) => {
      console.log("Game state received:", data);
      if (data?.fen) {
        chessGame.load(data.fen);
        setChessPosition(chessGame.fen());
      }
    });

    newSocket.on("move-made", (data) => {
      console.log("↔Move made by opponent:", data);
      try {
        // server provides move or fen -- prefer applying fen for safety
        if (data?.fen) {
          chessGame.load(data.fen);
        } else if (data?.move) {
          chessGame.move(data.move);
        }
        setChessPosition(chessGame.fen());
        updateMoves();
      } catch (e) {
        console.error("Error applying opponent move", e);
      }
    });

    newSocket.on("game-over", (data) => {
      console.log("Game Over:", data);
      alert("Game Over!");
    });

    newSocket.on("game-resigned", (data) => {
      console.log("Opponent resigned:", data);
      alert("Opponent resigned!");
    });

    newSocket.on("error", (err) => {
      console.error("❗ Server error:", err);
    });

    newSocket.on("move-error", (err) => {
      console.error("Invalid move:", err);
    });

    setSocket(newSocket);

    return () => {
      console.log("🧹 Cleaning up socket");
      newSocket.disconnect();
      newSocket.off("connect");
      newSocket.off("connect_error");
      newSocket.off("game-state");
      newSocket.off("move-made");
      newSocket.off("game-over");
      newSocket.off("game-resigned");
      newSocket.off("error");
      newSocket.off("move-error");
    };
    // intentionally only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resize board dynamically
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

  const movesContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setCurrentMoveIndex(moves.length - 1);
    const c = movesContainerRef.current;
    if (!c) return;
    requestAnimationFrame(() => c.scrollTo({ top: c.scrollHeight, behavior: "smooth" }));
  }, [moves]);

  // Get move options
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

  // safe promotion piece renderer: try defaultPieces, fallback to unicode
  const promotionPieceFallback = (p: string) => {
    const unicode: Record<string, string> = {
      q: "♕",
      r: "♖",
      b: "♗",
      n: "♘",
    };
    try {
      if (defaultPieces) {
        const key = `w${p.toUpperCase()}`;
        const piecesLookup = defaultPieces as unknown as Record<string, () => React.ReactNode>;
        const fn = piecesLookup[key];
        if (typeof fn === "function") return fn();
      }
    } catch {
      /* ignore */
    }
    return <span className="text-3xl">{unicode[p] || "?"}</span>;
  };

  // Handle square click
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

    if (foundMove.isPromotion()) {
      setPromotionMove({ from: moveFrom as Square, to: square as Square });
      setMoveFrom("");
      setOptionSquares({});
      return;
    }

    try {
      chessGame.move({ from: moveFrom, to: square });
      setChessPosition(chessGame.fen());
      updateMoves();

      // Emit move to backend using required event name
      const gameId = getGameIdFromPath();
      if (socket && gameId) {
        socket.emit("make-move", {
          gameId,
          move: { from: moveFrom, to: square },
        });
      }
    } catch {
      const hasMoveOptions = getMoveOptions(square as Square);
      setMoveFrom(hasMoveOptions ? square : "");
      return;
    }

    setMoveFrom("");
    setOptionSquares({});
  }

  // Handle drag drop
  function onPieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (currentMoveIndex !== moves.length - 1) return false;
    if (!targetSquare) return false;

    const possiblemoves = chessGame.moves({
      square: sourceSquare as Square,
      verbose: true,
    });

    const foundMove = possiblemoves.find(
      (m) => m.from === sourceSquare && m.to === targetSquare
    );

    if (!foundMove) return false;

    if (foundMove.isPromotion?.()) {
      setPromotionMove({ from: sourceSquare as Square, to: targetSquare as Square });
      return true;
    }

    try {
      chessGame.move({
        from: sourceSquare as Square,
        to: targetSquare as Square,
        promotion: "q",
      });
      setChessPosition(chessGame.fen());
      updateMoves();

      // Emit move to backend using required event name
      const gameId = getGameIdFromPath();
      if (socket && gameId) {
        socket.emit("make-move", {
          gameId,
          move: { from: sourceSquare, to: targetSquare, promotion: "q" },
        });
      }

      setMoveFrom("");
      setOptionSquares({});
      return true;
    } catch {
      return false;
    }
  }

  // Handle promotion
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

      // Emit promotion move using required event name
      const gameId = getGameIdFromPath();
      if (socket && gameId) {
        socket.emit("make-move", {
          gameId,
          move: { from: promotionMove.from, to: promotionMove.to, promotion: piece },
        });
      }
    } catch (e) {
      console.error("Promotion failed", e);
    }
    setPromotionMove(null);
  }

  // emit resign
  function resignGame() {
    const gameId = getGameIdFromPath();
    if (socket && gameId) {
      socket.emit("resign", gameId);
    }
    // keep UI unchanged: still log/resign UX handled by server events
    console.log("Resigned", gameId);
  }

  function updateMoves() {
    const history = chessGame.history();
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

  function goToMove(index: number) {
    const newGame = new Chess("4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3 w - - 0 1");
    for (let i = 0; i <= index; i++) {
      const move = moves[i];
      if (!move) break;
      if (move.white) newGame.move(move.white);
      if (i === index && !move.black) break;
      if (move.black) newGame.move(move.black);
    }
    chessGameRef.current = newGame;
    setChessPosition(newGame.fen());
    setCurrentMoveIndex(index);
  }

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
      {/* HEADER */}
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
            onClick={() => resignGame()}
            className="px-2 py-1"
          >
            Resign
          </Button>
        </div>
      </div>

      <div
        className="flex gap-2 justify-center items-start flex-col lg:flex-row"
        style={isDesktop ? { height: `${boardSize}px` } : {}}
      >
        {/* LEFT: CHESSBOARD */}
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
                    {promotionPieceFallback(p)}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Chessboard options={chessboardOptions} />
        </div>

        {/* RIGHT: SIDEBAR — SAME */}
        <div className="w-full lg:w-1/3 flex flex-col justify-between h-full px-4 lg:pb-4">
          <div className="flex flex-col gap-4">
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
                  <span>{user.username}</span>
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

            {/* Moves */}
            <div className="relative bg-zinc-900 rounded-lg text-sm">
              <p className="font-semibold mb-2 sticky top-0 bg-zinc-900 p-2 rounded-lg">
                Moves
              </p>
              <div
                className="p-2 overflow-y-auto max-h-48 lg:max-h-78"
                ref={movesContainerRef}
              >
                <table className="w-full text-left">
                  <tbody>
                    {moves.map((row, idx) => (
                      <tr
                        key={row.moveNumber}
                        className={idx === currentMoveIndex ? "bg-zinc-800" : ""}
                      >
                        <td className="pr-1 text-gray-400 px-2 py-1 rounded-l-md">
                          {row.moveNumber}.
                        </td>
                        <td className="font-bold">{row.white}</td>
                        <td className="pl-2 rounded-r-md">{row.black}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-center gap-2 mt-4 lg:mt-0 sticky bottom-0 py-2 bg-black">
            <button
              className="px-3 py-2 bg-zinc-900 text-xl md:text-2xl cursor-pointer rounded-lg disabled:opacity-40"
              onClick={() => goToMove(-1)}
              disabled={currentMoveIndex <= -1}
            >
              ⏮
            </button>
            <button
              className="px-3 py-2 bg-zinc-900 text-xl md:text-2xl cursor-pointer rounded-lg disabled:opacity-40"
              onClick={() => goToMove(Math.max(currentMoveIndex - 1, -1))}
              disabled={currentMoveIndex <= -1}
            >
              ◀
            </button>
            <button
              className="px-3 py-2 bg-zinc-900 text-xl md:text-2xl cursor-pointer rounded-lg disabled:opacity-40"
              onClick={() => goToMove(Math.min(currentMoveIndex + 1, moves.length - 1))}
              disabled={currentMoveIndex >= moves.length - 1}
            >
              ▶
            </button>
            <button
              className="px-3 py-2 bg-zinc-900 text-xl md:text-2xl cursor-pointer rounded-lg disabled:opacity-40"
              onClick={() => goToMove(moves.length - 1)}
              disabled={currentMoveIndex >= moves.length - 1}
            >
              ⏭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
