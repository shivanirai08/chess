"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Chess, Square, Move, PieceSymbol } from "chess.js";
import { Chessboard, PieceDropHandlerArgs, SquareHandlerArgs, PieceHandlerArgs } from "react-chessboard";
import { ArrowLeft, Bot, User } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Button from "@/components/ui/Button";
import { useBoardStyling } from "@/hooks/useBoardStyling";
import { PromotionDialog } from "@/components/chess/PromotionDialog";
import ComputerGameSetup, { GameConfig } from "@/components/layout/ComputerGameSetup";
import GameResultModal from "@/components/ui/GameResultModal";
import { useUserStore } from "@/store/useUserStore";

type StockfishMessage = {
  bestmove?: string;
  info?: string;
};

export default function ComputerGame() {
  const router = useRouter();
  const [game, setGame] = useState(new Chess());
  const [chessPosition, setChessPosition] = useState(game.fen());
  const [playerColor, setPlayerColor] = useState<"white" | "black">("white");
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white");
  const [difficulty, setDifficulty] = useState(10);
  const [gameStarted, setGameStarted] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [moves, setMoves] = useState<{ moveNumber: number; white?: string; black?: string }[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState<string>("");
  const [moveFrom, setMoveFrom] = useState("");
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});
  const [checkSquare, setCheckSquare] = useState<string | null>(null);
  const [promotionMove, setPromotionMove] = useState<{ from: Square; to: Square } | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [boardSize, setBoardSize] = useState(400);
  const [showAnimations] = useState(true);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [showSetup, setShowSetup] = useState(false);
  const [historyGame, setHistoryGame] = useState<Chess | null>(null);
  const [timeControl, setTimeControl] = useState<GameConfig["timeControl"]>("unlimited");
  const [playerTime, setPlayerTime] = useState<number>(0);
  const [computerTime, setComputerTime] = useState<number>(0);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [gameResult, setGameResult] = useState<{
    type: "win" | "loss" | "draw";
    message: string;
  } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const stockfishRef = useRef<Worker | null>(null);
  const gameRef = useRef(game);
  
  const { user } = useUserStore();

  // Get difficulty label based on skill level
  const getDifficultyLabel = (level: number): string => {
    if (level <= 2) return "Beginner (400 ELO)";
    if (level <= 6) return "Casual (800 ELO)";
    if (level <= 10) return "Intermediate (1200 ELO)";
    if (level <= 14) return "Advanced (1600 ELO)";
    if (level <= 18) return "Expert (2000 ELO)";
    return "Master (2400+ ELO)";
  };

  // Initialize Stockfish
  useEffect(() => {
    try {
      const stockfish = new Worker("/stockfish.js");
      stockfishRef.current = stockfish;

      stockfish.onmessage = (event) => {
        const message = event.data as string;

        if (message.startsWith("bestmove")) {
          const bestMove = message.split(" ")[1];
          makeComputerMove(bestMove);
        }
      };

      stockfish.onerror = (error) => {
        console.error("Stockfish error:", error);
      };

      stockfish.postMessage("uci");

      return () => {
        stockfish.terminate();
      };
    } catch (error) {
      console.error(" Failed to initialize Stockfish:", error);
    }
  }, []);

  // Check if we should show setup on mount
  useEffect(() => {
    // Only show setup if game hasn't started
    if (!gameStarted) {
      setShowSetup(true);
    }
  }, []);

  // Detect desktop/mobile
  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      
      const width = window.innerWidth - 16;
      if (width <= 700) {
        setBoardSize(Math.min(window.innerHeight, width-16, 400));
      } else if (width <= 1024) {
        setBoardSize(Math.min(window.innerHeight - 200, width - 100, 600));
      } else {
        setBoardSize(Math.min(window.innerHeight - 220, 600));
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Update gameRef when game changes
  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  // Check for checkmate/game over conditions
  useEffect(() => {
    if (!gameStarted || gameOver) return;
    
    if (game.isGameOver()) {
      checkGameStatus(game);
    }
  }, [game, gameStarted, gameOver, playerColor]);

  // Timer logic
  useEffect(() => {
    if (!gameStarted || gameOver || timeControl === "unlimited") {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      const currentTurn = game.turn();
      const isPlayerTurn = 
        (playerColor === "white" && currentTurn === "w") ||
        (playerColor === "black" && currentTurn === "b");

      if (isPlayerTurn) {
        setPlayerTime((prev) => {
          if (prev <= 0) {
            clearInterval(timerRef.current!);
            handleTimeOut("player");
            return 0;
          }
          return prev - 1;
        });
      } else {
        setComputerTime((prev) => {
          if (prev <= 0) {
            clearInterval(timerRef.current!);
            handleTimeOut("computer");
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [gameStarted, gameOver, game, playerColor, timeControl]);

  const handleTimeOut = (who: "player" | "computer") => {
    setGameOver(true);
    const message = who === "player" ? "Time out! Computer wins!" : "Time out! You win!";
    setResult(message);
    setGameResult({
      type: who === "player" ? "loss" : "win",
      message,
    });
    setIsResultModalOpen(true);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Update moves history
  const updateMovesFromHistory = useCallback((currentGame: Chess) => {
    const history = currentGame.history();
    const newMoves: { moveNumber: number; white?: string; black?: string }[] = [];
    
    for (let i = 0; i < history.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      newMoves.push({
        moveNumber,
        white: history[i],
        black: history[i + 1],
      });
    }
    
    setMoves(newMoves);
    setCurrentMoveIndex(history.length - 1);
  }, []);

  // Get king square when in check
  const getKingSquareInCheck = useCallback((chess: Chess): string | null => {
    if (!chess.inCheck()) return null;
    
    const turn = chess.turn();
    const board = chess.board();
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.type === "k" && piece.color === turn) {
          const file = String.fromCharCode(97 + col);
          const rank = (8 - row).toString();
          return file + rank;
        }
      }
    }
    return null;
  }, []);

  const startGame = useCallback((config: GameConfig) => {
    const color = config.side === "random" 
      ? (Math.random() > 0.5 ? "white" : "black")
      : config.side;
    
    const newGame = new Chess();
    setGame(newGame);
    gameRef.current = newGame;
    setChessPosition(newGame.fen());
    setPlayerColor(color);
    setBoardOrientation(color);
    setDifficulty(config.difficulty);
    setTimeControl(config.timeControl);
    
    // Set initial time based on time control
    let initialTime = 0;
    if (config.timeControl === "10min") initialTime = 600;
    else if (config.timeControl === "5min") initialTime = 300;
    else if (config.timeControl === "3min") initialTime = 180;
    
    setPlayerTime(initialTime);
    setComputerTime(initialTime);
    
    setGameStarted(true);
    setMoves([]);
    setCurrentMoveIndex(-1);
    setHistoryGame(null);
    setGameOver(false);
    setResult("");
    setThinking(false);
    setMoveFrom("");
    setOptionSquares({});
    setCheckSquare(null);
    setPromotionMove(null);
    setShowSetup(false);

    // If computer plays white, make first move
    if (color === "black") {
      setTimeout(() => requestComputerMove(newGame), 500);
    }
  }, []);

  const requestComputerMove = useCallback((currentGame: Chess) => {
    if (!stockfishRef.current) {
      console.error(" Stockfish not initialized!");
      return;
    }

    setThinking(true);
    const stockfish = stockfishRef.current;

    try {
      stockfish.postMessage("ucinewgame");
      stockfish.postMessage(`position fen ${currentGame.fen()}`);
      stockfish.postMessage(`setoption name Skill Level value ${difficulty}`);
      stockfish.postMessage("go movetime 1000");
    } catch (error) {
      console.error("Error requesting computer move:", error);
      setThinking(false);
    }
  }, [difficulty]);

  const makeComputerMove = useCallback((moveString: string) => {
    const currentGame = gameRef.current;

    if (!moveString || moveString === "(none)") {
      console.error(" Invalid move from Stockfish:", moveString);
      setThinking(false);
      return;
    }

    try {
      const from = moveString.substring(0, 2) as Square;
      const to = moveString.substring(2, 4) as Square;
      const promotion = moveString.length > 4 ? moveString[4] : undefined;

      const move = currentGame.move({
        from,
        to,
        promotion: promotion as any,
      });

      if (move) {
        setGame(currentGame);
        gameRef.current = currentGame;
        setChessPosition(currentGame.fen());
        updateMovesFromHistory(currentGame);
        
        // Update check square
        if (currentGame.inCheck()) {
          setCheckSquare(getKingSquareInCheck(currentGame));
        } else {
          setCheckSquare(null);
        }
        
        checkGameStatus(currentGame);
      } else {
        console.error("Invalid computer move");
      }
    } catch (error) {
      console.error("Error making computer move:", error);
    } finally {
      setThinking(false);
    }
  }, [updateMovesFromHistory, getKingSquareInCheck]);

  // Helper to get move options for a square
  const getMoveOptions = useCallback((square: Square) => {
    const moves = game.moves({ square, verbose: true });
    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares: Record<string, React.CSSProperties> = {};
    for (const move of moves) {
      newSquares[move.to] = {
        background:
          game.get(move.to) &&
          game.get(move.to)?.color !== game.get(square)?.color
            ? "radial-gradient(circle, rgba(197, 27, 27, 0.38) 75%, transparent 85%)"
            : "radial-gradient(circle, rgba(0,0,0,.2) 25%, transparent 25%)",
        borderRadius: "50%",
      };
    }

    newSquares[square] = { background: "rgba(255, 255, 0, 0.4)" };
    setOptionSquares(newSquares);
    return true;
  }, [game]);

  // Piece drag handler
  const canDragPiece = useCallback(({ piece }: PieceHandlerArgs): boolean => {
    if (!gameStarted || thinking || gameOver) {
      return false;
    }

    const pieceColor = piece.pieceType[0];
    return (
      (playerColor === "white" && pieceColor === "w") ||
      (playerColor === "black" && pieceColor === "b")
    );
  }, [gameStarted, thinking, gameOver, playerColor]);

  // Square click handler
  const onSquareClick = useCallback(({ square, piece }: SquareHandlerArgs): void => {
    if (!gameStarted || thinking || gameOver) {
      return;
    }

    // Don't allow moves if viewing history
    const fullHistory = game.history();
    if (currentMoveIndex < fullHistory.length - 1) {
      return;
    }

    const currentGame = gameRef.current;
    
    // Check if it's player's turn
    const isPlayerTurn =
      (playerColor === "white" && currentGame.turn() === "w") ||
      (playerColor === "black" && currentGame.turn() === "b");

    if (!isPlayerTurn) {
      return;
    }

    if (!moveFrom && piece) {
      const pieceColor = piece.pieceType[0];
      const canClick =
        (playerColor === "white" && pieceColor === "w") ||
        (playerColor === "black" && pieceColor === "b");

      if (!canClick) {
        return;
      }

      const hasMoveOptions = getMoveOptions(square as Square);
      if (hasMoveOptions) setMoveFrom(square);
      return;
    }

    const possiblemoves = currentGame.moves({
      square: moveFrom as Square,
      verbose: true,
    });
    const foundMove = possiblemoves.find((m) => m.from === moveFrom && m.to === square);

    if (!foundMove) {
      const hasMoveOptions = getMoveOptions(square as Square);
      setMoveFrom(hasMoveOptions ? square : "");
      return;
    }

    if (foundMove.flags.includes('p')) {
      setPromotionMove({ from: moveFrom as Square, to: square as Square });
      setMoveFrom("");
      setOptionSquares({});
      return;
    }

    try {
      const moveData = { from: moveFrom, to: square };
      const moveResult = currentGame.move(moveData);

      if (moveResult) {
        setGame(currentGame);
        gameRef.current = currentGame;
        setChessPosition(currentGame.fen());
        updateMovesFromHistory(currentGame);
        
        // Update check square
        if (currentGame.inCheck()) {
          setCheckSquare(getKingSquareInCheck(currentGame));
        } else {
          setCheckSquare(null);
        }
        
        checkGameStatus(currentGame);

        // Request computer move after a short delay
        setTimeout(() => {
          if (!currentGame.isGameOver()) {
            requestComputerMove(currentGame);
          }
        }, 300);
      }
    } catch (e) {
      console.error("Error making move on square click:", e);
    }

    setMoveFrom("");
    setOptionSquares({});
  }, [gameStarted, thinking, gameOver, playerColor, moveFrom, getMoveOptions, updateMovesFromHistory, getKingSquareInCheck, requestComputerMove, game, currentMoveIndex]);

  const onPieceDrop = useCallback(
    ({ sourceSquare, targetSquare, piece }: PieceDropHandlerArgs): boolean => {
      if (!gameStarted) {
        return false;
      }

      if (thinking) {
        return false;
      }

      if (gameOver) {
        return false;
      }

      // Don't allow moves if viewing history
      const fullHistory = game.history();
      if (currentMoveIndex < fullHistory.length - 1) {
        return false;
      }

      const currentGame = gameRef.current;

      // Check if it's player's turn
      const isPlayerTurn =
        (playerColor === "white" && currentGame.turn() === "w") ||
        (playerColor === "black" && currentGame.turn() === "b");

      if (!isPlayerTurn) {
        return false;
      }

      const possiblemoves = currentGame.moves({
        square: sourceSquare as Square,
        verbose: true,
      });

      const foundMove = possiblemoves.find(
        (m) => m.from === sourceSquare && m.to === targetSquare
      );

      if (!foundMove) {
        return false;
      }

      if (foundMove.flags.includes('p')) {
        setPromotionMove({ from: sourceSquare as Square, to: targetSquare as Square });
        return true;
      }

      try {
        const move = currentGame.move({
          from: sourceSquare as Square,
          to: targetSquare as Square,
          promotion: "q",
        });

        if (move) {
          setGame(currentGame);
          gameRef.current = currentGame;
          setChessPosition(currentGame.fen());
          updateMovesFromHistory(currentGame);
          
          // Update check square
          if (currentGame.inCheck()) {
            setCheckSquare(getKingSquareInCheck(currentGame));
          } else {
            setCheckSquare(null);
          }
          
          checkGameStatus(currentGame);

          // Request computer move after a short delay
          setTimeout(() => {
            if (!currentGame.isGameOver()) {
              requestComputerMove(currentGame);
            }
          }, 300);

          return true;
        } else {
          return false;
        }
      } catch (error) {
        console.error("Error making player move:", error);
        return false;
      }
    },
    [gameStarted, thinking, gameOver, playerColor, requestComputerMove, updateMovesFromHistory, getKingSquareInCheck, game, currentMoveIndex]
  );

  // Handle promotion
  const handlePromotion = useCallback((piece: PieceSymbol) => {
    if (!promotionMove) return;
    
    const currentGame = gameRef.current;
    try {
      const moveData = {
        from: promotionMove.from,
        to: promotionMove.to,
        promotion: piece,
      };

      const moveResult = currentGame.move(moveData);

      if (moveResult) {
        setGame(currentGame);
        gameRef.current = currentGame;
        setChessPosition(currentGame.fen());
        updateMovesFromHistory(currentGame);
        
        // Update check square
        if (currentGame.inCheck()) {
          setCheckSquare(getKingSquareInCheck(currentGame));
        } else {
          setCheckSquare(null);
        }
        
        checkGameStatus(currentGame);

        // Request computer move after a short delay
        setTimeout(() => {
          if (!currentGame.isGameOver()) {
            requestComputerMove(currentGame);
          }
        }, 300);
      }
    } catch (e) {
      console.error("Promotion failed", e);
    }
    setPromotionMove(null);
  }, [promotionMove, updateMovesFromHistory, getKingSquareInCheck, requestComputerMove]);

  // Dummy handlers for board styling hook
  const onSquareRightClick = useCallback(() => {
    // No premoves in computer game
  }, []);

  const checkGameStatus = (currentGame: Chess) => {
    if (currentGame.isGameOver()) {
      setGameOver(true);
      let resultText = "";
      let resultType: "win" | "loss" | "draw" = "draw";
      
      if (currentGame.isCheckmate()) {
        const winner = currentGame.turn() === "w" ? "Black" : "White";
        resultText = `Checkmate! ${winner} wins!`;
        
        // Determine if player won or lost
        if ((playerColor === "white" && winner === "White") || 
            (playerColor === "black" && winner === "Black")) {
          resultType = "win";
        } else {
          resultType = "loss";
        }
      } else if (currentGame.isDraw()) {
        resultText = "Draw!";
        resultType = "draw";
      } else if (currentGame.isStalemate()) {
        resultText = "Stalemate! Draw.";
        resultType = "draw";
      } else if (currentGame.isThreefoldRepetition()) {
        resultText = "Draw by repetition!";
        resultType = "draw";
      } else if (currentGame.isInsufficientMaterial()) {
        resultText = "Draw by insufficient material!";
        resultType = "draw";
      }
      
      setResult(resultText);
      setGameResult({
        type: resultType,
        message: resultText,
      });
      setIsResultModalOpen(true);
      
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const resetGame = () => {
    setGameStarted(false);
    setShowSetup(true);
    const newGame = new Chess();
    setGame(newGame);
    setChessPosition(newGame.fen());
    setMoves([]);
    setCurrentMoveIndex(-1);
    setHistoryGame(null);
    setGameOver(false);
    setResult("");
    setGameResult(null);
    setThinking(false);
    setMoveFrom("");
    setOptionSquares({});
    setCheckSquare(null);
    setPromotionMove(null);
    setPlayerTime(0);
    setComputerTime(0);
    
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Move navigation
  const goToMove = useCallback((moveIndex: number) => {
    const fullHistory = game.history();
    if (moveIndex < -1 || moveIndex >= fullHistory.length) return;

    setCurrentMoveIndex(moveIndex);

    // Create a new game and replay moves up to moveIndex
    const tempGame = new Chess();
    for (let i = 0; i <= moveIndex; i++) {
      try {
        tempGame.move(fullHistory[i]);
      } catch (e) {
        console.error("Error replaying move", e);
        return;
      }
    }

    setHistoryGame(tempGame);
    setChessPosition(tempGame.fen());
    setMoveFrom("");
    setOptionSquares({});
    
    // Update check square for historical position
    if (tempGame.inCheck()) {
      setCheckSquare(getKingSquareInCheck(tempGame));
    } else {
      setCheckSquare(null);
    }
  }, [game, getKingSquareInCheck]);

  // Board styling hook (without premoves for computer game)
  const { chessboardOptions } = useBoardStyling({
    optionSquares,
    premoves: [],
    isAnimatingPremoveBack: false,
    invalidPremoveSquares: [],
    previewPosition: null,
    chessPosition,
    boardOrientation,
    boardSize,
    showAnimations,
    onPieceDrop,
    onSquareClick,
    onSquareRightClick,
    canDragPiece,
    checkSquare,
  });

  if (showSetup) {
    return <ComputerGameSetup onStart={startGame} onCancel={() => router.push("/dashboard")} />;
  }

  // DESKTOP LAYOUT
  if (isDesktop) {
    return (
      <div className="h-screen text-white">
        <div className="max-w-[1400px] mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center gap-3">
              <button
            onClick={() => router.push("/dashboard")}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft size={24} />
          </button>
              <h1 className="text-lg font-semibold">You vs Computer</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={resetGame} size="small">
              New Game
            </Button></div>
          </div>

          <div className="flex gap-6 justify-center">
            {/* LEFT SECTION - Board */}
            <div className="flex flex-col items-center gap-4">
              {/* Opponent Info - Computer */}
              <div className="w-[540px] flex items-center justify-between bg-white/5 rounded-lg p-2 backdrop-blur-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center">
                    <Bot size={20} className="text-white" />
                  </div>
                  <span className="text-sm font-medium">
                    Computer ({getDifficultyLabel(difficulty)})
                  </span>
                </div>
                <span className={`text-lg font-mono px-3 py-1.5 rounded transition-all duration-300 ${
                  (playerColor === "white" && game.turn() === "b") || (playerColor === "black" && game.turn() === "w")
                    ? "bg-primary text-black font-bold shadow-lg"
                    : "bg-zinc-800"
                }`}>
                  {timeControl !== "unlimited" ? formatTime(computerTime) : (thinking ? "Thinking..." : "Ready")}
                </span>
              </div>

              {/* Chessboard */}
              <div 
                className="relative flex justify-center items-center"
                style={{ width: `${boardSize - 60}px`, height: `${boardSize - 60}px`, minWidth: `${boardSize}px`, minHeight: `${boardSize}px` }}
              >
                {promotionMove && (
                  <PromotionDialog onSelect={handlePromotion} />
                )}
                <Chessboard options={chessboardOptions} />
              </div>

              {/* Bottom Player Info - You */}
              <div className="w-[540px] flex items-center justify-between bg-white/5 rounded-lg p-2 backdrop-blur-xs">
                <div className="flex items-center gap-2.5">
                  <Image
                    src={user.avatar || "/avatar7.svg"}
                    alt={user.username || "You"}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                  <span className="text-sm font-medium">
                    {user.username || "You"} ({playerColor})
                  </span>
                </div>
                <span className={`text-lg font-mono px-3 py-1.5 rounded transition-all duration-300 ${
                  (playerColor === "white" && game.turn() === "w") || (playerColor === "black" && game.turn() === "b")
                    ? "bg-primary text-black font-bold shadow-lg"
                    : "bg-zinc-800"
                }`}>
                  {timeControl !== "unlimited" ? formatTime(playerTime) : (gameOver ? "Game Over" : "Your Turn")}
                </span>
              </div>
            </div>

            {/* RIGHT SECTION - Move History */}
            <div className="flex flex-col w-1/3">
              <div className="bg-white/2 backdrop-blur-xs border border-white/10 rounded-lg p-4 flex flex-col h-full">
                <h3 className="font-semibold mb-4 text-lg">Move History</h3>
                
                {/* Navigation Controls */}
                <div className="flex items-center justify-center gap-4 mb-4">
                  <button
                    className="w-16 h-14 bg-zinc-800 hover:bg-zinc-700 text-white text-xl rounded-lg disabled:opacity-40 transition-colors flex items-center justify-center"
                    onClick={() => goToMove(-1)}
                    disabled={currentMoveIndex <= -1 || moves.length === 0}
                    aria-label="Go to start"
                  >
                    ⏮
                  </button>
                  <button
                    className="w-16 h-14 bg-zinc-800 hover:bg-zinc-700 text-white text-xl rounded-lg disabled:opacity-40 transition-colors flex items-center justify-center"
                    onClick={() => goToMove(currentMoveIndex - 1)}
                    disabled={currentMoveIndex <= -1 || moves.length === 0}
                    aria-label="Previous move"
                  >
                    ◀
                  </button>
                  <button
                    className="w-16 h-14 bg-zinc-800 hover:bg-zinc-700 text-white text-xl rounded-lg disabled:opacity-40 transition-colors flex items-center justify-center"
                    onClick={() => goToMove(currentMoveIndex + 1)}
                    disabled={currentMoveIndex >= game.history().length - 1 || moves.length === 0}
                    aria-label="Next move"
                  >
                    ▶
                  </button>
                  <button
                    className="w-16 h-14 bg-zinc-800 hover:bg-zinc-700 text-white text-xl rounded-lg disabled:opacity-40 transition-colors flex items-center justify-center"
                    onClick={() => goToMove(game.history().length - 1)}
                    disabled={currentMoveIndex >= game.history().length - 1 || moves.length === 0}
                    aria-label="Go to end"
                  >
                    ⏭
                  </button>
                </div>

                {/* Moves Display */}
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
                  {moves.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No moves yet</p>
                  ) : (
                    <table className="w-full text-left text-sm">
                      <tbody>
                        {moves.map((row, idx) => {
                          const highlightedMove = currentMoveIndex >= 0 ? Math.floor(currentMoveIndex / 2) : -1;
                          const highlightedSide = currentMoveIndex >= 0 && currentMoveIndex % 2 === 0 ? "white" : "black";
                          
                          return (
                            <tr
                              key={row.moveNumber}
                              className={idx === highlightedMove ? "bg-zinc-800" : ""}
                            >
                              <td className="pr-1 text-gray-400 px-2 py-1 rounded-l-md">
                                {row.moveNumber}.
                              </td>
                              <td
                                className={`font-bold cursor-pointer hover:bg-zinc-700 px-2 py-1 ${
                                  idx === highlightedMove && highlightedSide === "white"
                                    ? "bg-zinc-600 text-white"
                                    : ""
                                }`}
                                onClick={() => goToMove(idx * 2)}
                              >
                                {row.white}
                              </td>
                              <td
                                className={`pl-2 rounded-r-md cursor-pointer hover:bg-zinc-700 px-2 py-1 ${
                                  idx === highlightedMove && highlightedSide === "black"
                                    ? "bg-zinc-600 text-white"
                                    : ""
                                }`}
                                onClick={() => row.black && goToMove(idx * 2 + 1)}
                              >
                                {row.black || ""}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Game Result Modal */}
        {gameResult && (
          <GameResultModal
            isOpen={isResultModalOpen}
            onClose={() => {
              setIsResultModalOpen(false);
              resetGame();
            }}
            result={gameResult.type}
            message={gameResult.message}
            ratingChange={undefined}
          />
        )}
      </div>
    );
  }

  // MOBILE LAYOUT
  return (
    <div className="min-h-screen text-white p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/dashboard')} className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <ArrowLeft size={18} className="text-white" />
            </button>
            <h1 className="text-base font-semibold">You vs Computer</h1>
          </div>
          <div className="flex gap-3">
          <Button variant="secondary" onClick={resetGame} size="small">
            New Game
          </Button>
          </div>
        </div>

        {/* Chessboard */}
        <div className="relative w-full flex justify-center items-center mb-2" style={{ maxWidth: '100vw', overflow: 'hidden' }}>
          {promotionMove && (
            <PromotionDialog onSelect={handlePromotion} />
          )}
          <Chessboard options={chessboardOptions} />
        </div>

        <div className="flex flex-wrap items-center justify-between bg-white/5 rounded-lg p-2 backdrop-blur-xs mb-3 border border-white/10">
        {/* Opponent Info - Computer */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-zinc-700 flex items-center justify-center">
              <Bot size={18} className="text-white" />
            </div>
            <span className="text-xs font-medium">Computer</span>
          </div>
          <span className={`text-sm font-mono px-2 py-1 rounded transition-all ${
            (playerColor === "white" && game.turn() === "b") || (playerColor === "black" && game.turn() === "w")
              ? "bg-primary text-black font-bold"
              : "bg-zinc-800"
          }`}>
            {timeControl !== "unlimited" ? formatTime(computerTime) : (thinking ? "Thinking..." : "Ready")}
          </span>
        </div>
        {/* Player Info - You */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Image
              src={user.avatar || "/avatar7.svg"}
              alt={user.username || "You"}
              width={36}
              height={36}
              className="rounded-full"
            />
            <span className="text-xs font-medium">{user.username || "You"} ({playerColor})</span>
          </div>
          <span className={`text-sm font-mono px-2 py-1 rounded transition-all ${
            (playerColor === "white" && game.turn() === "w") || (playerColor === "black" && game.turn() === "b")
              ? "bg-primary text-black font-bold"
              : "bg-zinc-800"
          }`}>
            {timeControl !== "unlimited" ? formatTime(playerTime) : (gameOver ? "Game Over" : "Your Turn")}
          </span>
        </div>
        </div>

        {/* Move History */}
        <div className="bg-white/2 backdrop-blur-xs border border-white/10 rounded-lg p-3">
          <h3 className="font-semibold mb-2 text-sm">Move History</h3>
          
          {/* Moves Display */}
          <div className="max-h-40 overflow-y-auto mb-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
              {moves.length === 0 ? (
                <p className="text-gray-500 text-center py-4 text-sm">No moves yet</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <tbody>
                    {moves.map((row, idx) => {
                      const highlightedMove = currentMoveIndex >= 0 ? Math.floor(currentMoveIndex / 2) : -1;
                      const highlightedSide = currentMoveIndex >= 0 && currentMoveIndex % 2 === 0 ? "white" : "black";
                      
                      return (
                        <tr
                          key={row.moveNumber}
                          className={idx === highlightedMove ? "bg-zinc-800" : ""}
                        >
                          <td className="pr-1 text-gray-400 px-2 py-1 rounded-l-md">
                            {row.moveNumber}.
                          </td>
                          <td
                            className={`font-bold cursor-pointer hover:bg-zinc-700 px-2 py-1 ${
                              idx === highlightedMove && highlightedSide === "white"
                                ? "bg-primary text-black"
                                : ""
                            }`}
                            onClick={() => goToMove(idx * 2)}
                          >
                            {row.white}
                          </td>
                          <td
                            className={`pl-2 rounded-r-md cursor-pointer hover:bg-zinc-700 px-2 py-1 ${
                              idx === highlightedMove && highlightedSide === "black"
                                ? "bg-primary text-black"
                                : ""
                            }`}
                            onClick={() => row.black && goToMove(idx * 2 + 1)}
                          >
                            {row.black || ""}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
          </div>

          {/* Navigation Controls */}
          <div className="flex justify-center gap-1.5 mt-2">
            <button
              className="px-2.5 py-1.5 bg-zinc-800 text-lg cursor-pointer rounded-lg disabled:opacity-40 hover:bg-zinc-700 transition"
              onClick={() => goToMove(-1)}
              disabled={currentMoveIndex <= -1 || moves.length === 0}
              aria-label="Go to start"
            >
              ⏮
            </button>
            <button
              className="px-2.5 py-1.5 bg-zinc-800 text-lg cursor-pointer rounded-lg disabled:opacity-40 hover:bg-zinc-700 transition"
              onClick={() => goToMove(currentMoveIndex - 1)}
              disabled={currentMoveIndex <= -1 || moves.length === 0}
              aria-label="Previous move"
            >
              ◀
            </button>
            <button
              className="px-2.5 py-1.5 bg-zinc-800 text-lg cursor-pointer rounded-lg disabled:opacity-40 hover:bg-zinc-700 transition"
              onClick={() => goToMove(currentMoveIndex + 1)}
              disabled={currentMoveIndex >= game.history().length - 1 || moves.length === 0}
              aria-label="Next move"
            >
              ▶
            </button>
            <button
              className="px-2.5 py-1.5 bg-zinc-800 text-lg cursor-pointer rounded-lg disabled:opacity-40 hover:bg-zinc-700 transition"
              onClick={() => goToMove(game.history().length - 1)}
              disabled={currentMoveIndex >= game.history().length - 1 || moves.length === 0}
              aria-label="Go to end"
            >
              ⏭
            </button>
          </div>
        </div>
        
        {/* Game Result Modal */}
        {gameResult && (
          <GameResultModal
            isOpen={isResultModalOpen}
            onClose={() => {
              setIsResultModalOpen(false);
              resetGame();
            }}
            result={gameResult.type}
            message={gameResult.message}
            ratingChange={undefined}
          />
        )}
      </div>
    </div>
  );
}
