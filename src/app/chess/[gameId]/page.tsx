"use client";

import React, { useState, useEffect, useRef } from "react";
import { Chess, Square, PieceSymbol } from "chess.js";
import {
  Chessboard,
  SquareHandlerArgs,
  PieceDropHandlerArgs,
  PieceHandlerArgs,
} from "react-chessboard";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { useUserStore } from "@/store/useUserStore";
import GameResultModal from "@/components/ui/GameResultModal";
import ChatPanel, { Message } from "@/components/ui/ChatPanel";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DrawOfferDialog } from "@/components/ui/DrawOfferDialog";

// New modular components
import { PlayerInfo } from "@/components/chess/PlayerInfo";
import { MoveHistory } from "@/components/chess/MoveHistory";
import { GameControls } from "@/components/chess/GameControls";
import { PromotionDialog } from "@/components/chess/PromotionDialog";

// Hooks
import { usePremoves } from "@/hooks/usePremoves";
import { useBoardStyling } from "@/hooks/useBoardStyling";

// Services
import {
  getToken,
  fetchGameState,
  resignGame,
  getGameIdFromPath,
} from "@/services/gameApi";

// Utils
import { getRandomAvatar, getAvatarUrl } from "@/utils/avatar";

export default function ChessPage() {
  const { setUser, user, opponent, setOpponent } = useUserStore();
  const userId = user.id; // Extract user ID once
  const guestId = user.guestId;
  const username = user.username;

  // For guest users, use guestId as identifier
  const playerId = userId || guestId;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showAnimations, setShowAnimations] = useState(true);
  const [moves, setMoves] = useState<{ moveNumber: number; white?: string; black?: string }[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(() => moves.length - 1);
  const [gameStatus, setGameStatus] = useState<string>("active");
  const [playerColor, setPlayerColor] = useState<"white" | "black">("white");
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white");
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [gameResult, setGameResult] = useState<{
    type: "win" | "loss" | "draw" | "abandoned";
    message: string;
    } | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);

  // Dialog states
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [showDrawOffer, setShowDrawOffer] = useState(false);
  const [isDrawOffering, setIsDrawOffering] = useState(false); // true if we sent the offer
  const [drawOfferFrom, setDrawOfferFrom] = useState<string>(""); // who sent the draw offer

  // Game setup
  // Game state management
  const chessGameRef = useRef(new Chess());
  const chessGame = chessGameRef.current;
  const [chessPosition, setChessPosition] = useState(chessGame.fen());
  const [initialFen, setInitialFen] = useState<string>(new Chess().fen());
  const [moveFrom, setMoveFrom] = useState("");
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});
  const [boardSize, setBoardSize] = useState(400);
  const [promotionMove, setPromotionMove] = useState<{ from: Square; to: Square } | null>(null);

  // Premove management via custom hook
  const {
    premoves,
    previewPosition,
    isAnimatingPremoveBack,
    invalidPremoveSquares,
    addPremove,
    executePremoves,
    clearPremoves,
    animatePremovesBack,
  } = usePremoves(chessGame);

  // Chat message handler
  const handleAddChatMessage = (message: Message) => {
    setChatMessages((prev) => [...prev, message]);
  };

  // Helper to set game result
  const setGameResultHelper = (result: string, whitePlayerId: string, blackPlayerId: string, whitePlayerName: string, blackPlayerName: string) => {
    if (result === "white_wins") {
      const isWinner = whitePlayerId === playerId;
      setGameResult({
        type: isWinner ? "win" : "loss",
        message: isWinner ? "You win!" : `${whitePlayerName} wins!`,
      });
    } else if (result === "black_wins") {
      const isWinner = blackPlayerId === playerId;
      setGameResult({
        type: isWinner ? "win" : "loss",
        message: isWinner ? "You win!" : `${blackPlayerName} wins!`,
      });
    } else if (result === "draw") {
      setGameResult({ type: "draw", message: "It's a draw!" });
    } else if (result === "abandoned") {
      setGameResult({ type: "abandoned", message: "Game Abandoned" });
    }
    // Clear guestId only for guest users
    if (guestId) {
      setUser({ ...user, guestId: null });
    }
  };

  // Fetch initial game state
  useEffect(() => {
    const gameId = getGameIdFromPath();
    if (!gameId || !playerId) return;

    const loadGameState = async () => {
      const gameData = await fetchGameState(gameId, guestId ?? undefined);
      if (gameData && gameData.game) {
        const { game } = gameData;

        // Determine player color and set board orientation
        const whiteId = String(game.whitePlayerId);
        const blackId = String(game.blackPlayerId);
        const currentId = String(playerId);

        if (whiteId === currentId) {
          setPlayerColor("white");
          setBoardOrientation("white");
        } else if (blackId === currentId) {
          setPlayerColor("black");
          setBoardOrientation("black");
        }

        // Reset chess game to starting position
        const startingFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
        chessGame.reset();
        setInitialFen(startingFen);

        // Load moves from API if available
        if (game.moves && Array.isArray(game.moves) && game.moves.length > 0) {
          // Apply each move from the API
          for (const move of game.moves) {
            try {
              chessGame.move(move);
            } catch (error) {
              console.error("Error applying move from API:", error);
              // Skip invalid moves
            }
          }

          // Update position and moves display
          setChessPosition(chessGame.fen());
          updateMovesFromHistory();
        } else if (game.fen) {
          // Fallback: load FEN directly if no moves array
          try {
            chessGame.load(game.fen);
            setChessPosition(chessGame.fen());
            updateMovesFromHistory();
          } catch (error) {
            console.error("Error loading FEN from API:", error);
            // Invalid FEN, use default position
          }
        } else {
          // New game, no moves yet
          setChessPosition(chessGame.fen());
        }

        // Set game status
        setGameStatus(game.status);

        // Set opponent data
        if (game.whitePlayerName && game.blackPlayerName) {
          const isWhite = game.whitePlayerId === playerId;

          // Get avatar from API response or use fallback
          let opponentAvatar;
          if (isWhite) {
            opponentAvatar = game.blackPlayerAvatar ? getAvatarUrl(game.blackPlayerAvatar) : getAvatarUrl(getRandomAvatar());
          } else {
            opponentAvatar = game.whitePlayerAvatar ? getAvatarUrl(game.whitePlayerAvatar) : getAvatarUrl(getRandomAvatar());
          }

          const opponentData = {
            username: isWhite ? game.blackPlayerName : game.whitePlayerName,
            userId: isWhite ? game.blackPlayerId : game.whitePlayerId,
            isGuest: game.isGuestGame || false,
            avatar: opponentAvatar
          };

          // Only set if opponent is different from current user
          if (opponentData.username !== username) {
            setOpponent(opponentData);
          }
        }

        // Show game status if game is over
        if (game.status === "completed" && game.result) {
          setGameResultHelper(
            game.result,
            game.whitePlayerId,
            game.blackPlayerId,
            game.whitePlayerName,
            game.blackPlayerName
          );
          // Clear guestId only for guest users
          if (guestId) {
            setUser({ ...user, guestId: null });
          }
          setIsResultModalOpen(true);
        }
      }
    };

    loadGameState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, username]);

  // Socket event listeners
  useEffect(() => {
    const token = getToken();
    if (!token && !guestId) {
      toast.error("Authentication required for game");
      return;
    }

    const gameId = getGameIdFromPath();
    if (!gameId) return;

    let newSocket: Socket;
    if(token){
      newSocket = io(`${process.env.NEXT_PUBLIC_WEBSOCKET_URL}`, {
      auth: { token },
      transports: ["websocket", "polling"],
    });}
    else {
      newSocket = io(`${process.env.NEXT_PUBLIC_WEBSOCKET_URL}`, {
      auth: { guestId : guestId },
      transports: ["websocket", "polling"],
    });}

    newSocket.on("connect", () => {
      newSocket.emit("join-game", gameId);
    });

    newSocket.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
      toast.error(`Connection error: ${err.message}`);
    });

    newSocket.on("game-state", (data) => {
      if (data?.fen) {
        chessGame.load(data.fen);
        setChessPosition(chessGame.fen());
        updateMovesFromHistory();
      }
      if (data?.status) {
        setGameStatus(data.status);
      }
    });

    newSocket.on("move-made", (data) => {
      if(data?.player === username || data?.player === guestId) {
        return;
      }
      try {
        // Apply opponent's move to actual board
        if (data?.move) {
          const moveResult = chessGame.move(data.move);
          if (moveResult) {
            const newFen = chessGame.fen();
            setChessPosition(newFen);
          }
        }
        updateMovesFromHistory();

        // Execute premoves using the hook
        executePremoves((moveData) => {
          // Update board display
          setChessPosition(chessGame.fen());
          updateMovesFromHistory();

          // Send premove to server
          const gameId = getGameIdFromPath();
          if (gameId && newSocket) {
            newSocket.emit("make-move", { gameId, move: moveData });
          }
        });
      } catch (e) {
        console.error("Error applying opponent move", e);
        toast.error("Failed to apply opponent's move");
      }
    });

    newSocket.on("game-over", (data) => {
      setGameStatus("completed");

      if (data?.result) {
      if (data.result == "white_wins"){
        const isWinner = data.winner === playerId;
        setGameResult({
          type: isWinner ? "win" : "loss",
          message: isWinner ? "Checkmate! You win!" : "Checkmate! You lose!",
        });
      } else if (data.result == "black_wins"){
        const isWinner = data.winner === playerId;
        setGameResult({
          type: isWinner ? "win" : "loss",
          message: isWinner ? "Checkmate! You win!" : "Checkmate! You lose!",
        });
      } else {
        setGameResult({ type: "draw", message: "The game ended in a draw." });
      }
    }
      setIsResultModalOpen(true);
    });

    newSocket.on("game-resigned", (data) => {
      setGameStatus("completed");

      // Check if the data contains information about who resigned
      if (data?.resignedPlayerId) {
        const didIResign = data.resignedPlayerId === playerId;
        setGameResult({
          type: didIResign ? "loss" : "win",
          message: didIResign ? "You resigned from the game" : "Opponent resigned! You win!",
        });
        if (!didIResign) {
          toast.success("Opponent resigned! You win!");
        }
      } else {
        // Fallback if backend doesn't send resignedPlayerId, assumes the resign event is only sent to the opponent
        setGameResult({
          type: "win",
          message: "Opponent resigned! You win!",
        });
        toast.success("Opponent resigned! You win!");
      }
      setIsResultModalOpen(true);
    });

    newSocket.on("players-connected", (data) => {
      if (data?.playersConnected) {
        toast.success("Both players connected");
      }
    });

    newSocket.on("error", (err) => {
      console.error("Socket error:", err);
      toast.error(err.message || "Server error occurred");
    });

    newSocket.on("move-error", (err) => {
      console.error("Move error:", err);
      toast.error(err.message || "Invalid move");
    });

    newSocket.on("chat-message", (data) => {
      if (data?.message) {
        const newMessage: Message = {
          id: `${Date.now()}-${Math.random()}`,
          sender: "opponent",
          message: data.message,
          timestamp: new Date(),
        };
        handleAddChatMessage(newMessage);

        // Show toast notification if chat is closed
        if (!isChatOpen) {
          toast.info(`${opponent?.username || "Opponent"}: ${data.message}`, {
            duration: 3000,
          });
        }
      }
    });

    newSocket.on("draw-offer", (data) => {
      setIsDrawOffering(false);
      setDrawOfferFrom(data.from);
      setShowDrawOffer(true);
      toast.info(`${data.from} has offered a draw`);
    });

    newSocket.on("draw-accept", () => {
      setShowDrawOffer(false);
      setIsDrawOffering(false);
      setGameResult({ type: "draw", message: "Game drawn by agreement" });
      setGameStatus("completed");
      setIsResultModalOpen(true);
    });

    newSocket.on("draw-decline", () => {
      setShowDrawOffer(false);
      setIsDrawOffering(false);
      toast.info("Draw offer declined");
    });

    newSocket.on("draw-cancel", () => {
      setShowDrawOffer(false);
      setIsDrawOffering(false);
      toast.info("Draw offer was canceled");
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      newSocket.off("connect");
      newSocket.off("connect_error");
      newSocket.off("game-state");
      newSocket.off("move-made");
      newSocket.off("game-over");
      newSocket.off("game-resigned");
      newSocket.off("players-connected");
      newSocket.off("error");
      newSocket.off("move-error");
      newSocket.off("chat-message");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, username]);

  // Resize board dynamically
  useEffect(() => {
    function updateSize() {
      if (typeof window === "undefined") return;
      setIsDesktop(window.innerWidth >= 1024);
      const width = window.innerWidth - 16;

      if (window.innerWidth <= 700) {
        setBoardSize(width);
      } else if( window.innerWidth <= 1024){
        
      }
      else{
        const height = window.innerHeight - 90;
        const width = window.innerWidth - 40;
        setBoardSize(Math.min(height, width));
      }
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    setCurrentMoveIndex(moves.length - 1);
  }, [moves]);

  // Move handling
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

  // UI event handlers
  // Restrict piece dragging based on player color
  function canDragPiece({ piece }: PieceHandlerArgs): boolean {
    // Can't drag pieces if game is over
    if (gameStatus === "completed") {
      return false;
    }

    // Can't drag pieces when reviewing history
    if (currentMoveIndex !== moves.length - 1) {
      return false;
    }

    // Allow dragging pieces of the player's color (for both regular moves and premoves)
    const pieceColor = piece.pieceType[0]; // 'w' or 'b'
    return (
      (playerColor === "white" && pieceColor === "w") ||
      (playerColor === "black" && pieceColor === "b")
    );
  }

  // Handle square click
  function onSquareClick({ square, piece }: SquareHandlerArgs): void {
    if (gameStatus === "completed") {
      return;
    }
    if (currentMoveIndex !== moves.length - 1) return;

    // Check if it's the player's turn
    const currentTurn = chessGame.turn();
    const isPlayerTurn =
      (playerColor === "white" && currentTurn === "w") ||
      (playerColor === "black" && currentTurn === "b");

    if (!isPlayerTurn) {
      return;
    }

    if (!moveFrom && piece) {
      // Only allow clicking on own pieces
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
      const moveData = { from: moveFrom, to: square };
      const moveResult = chessGame.move(moveData);

      if (moveResult) {
        // Move was successful, update UI
        setChessPosition(chessGame.fen());
        updateMovesFromHistory();

        const gameId = getGameIdFromPath();
        if (gameId && socket) {
          // Use WebSocket only for real-time updates
          socket.emit("make-move", { gameId, move: moveData });
        }
      } else {
        toast.error("Invalid move");
        const hasMoveOptions = getMoveOptions(square as Square);
        setMoveFrom(hasMoveOptions ? square : "");
        return;
      }
    } catch (e) {
      console.error("Error making move on square click:", e);
      toast.error("Invalid move");
      const hasMoveOptions = getMoveOptions(square as Square);
      setMoveFrom(hasMoveOptions ? square : "");
      return;
    }

    setMoveFrom("");
    setOptionSquares({});
  }

  // Handle drag drop
  function onPieceDrop({ sourceSquare, targetSquare, piece }: PieceDropHandlerArgs): boolean {
    if (gameStatus === "completed") {
      return false;
    }
    if (currentMoveIndex !== moves.length - 1) return false;
    if (!targetSquare || sourceSquare === targetSquare) return false;

    // Check if it's the player's turn
    const currentTurn = chessGame.turn();
    const isPlayerTurn =
      (playerColor === "white" && currentTurn === "w") ||
      (playerColor === "black" && currentTurn === "b");

    // Clear any stale premoves if it's now the player's turn
    if (isPlayerTurn && premoves.length > 0) {
      clearPremoves();
    }

    const pieceColor = piece.pieceType[0];

    if (currentTurn !== pieceColor) {
      // Only allow premoves for the player's own pieces
      const canPremove =
        (playerColor === "white" && pieceColor === "w") ||
        (playerColor === "black" && pieceColor === "b");

      if (!canPremove) {
        return false;
      }

      return addPremove(sourceSquare, targetSquare, piece, playerColor);
    }

    if (!isPlayerTurn) {
      return false;
    }

    const possiblemoves = chessGame.moves({
      square: sourceSquare as Square,
      verbose: true,
    });

    const foundMove = possiblemoves.find(
      (m) => m.from === sourceSquare && m.to === targetSquare
    );

    if (!foundMove) {
      toast.error("Invalid move");
      return false;
    }

    if (foundMove.isPromotion?.()) {
      setPromotionMove({ from: sourceSquare as Square, to: targetSquare as Square });
      return true;
    }

    try {
      const moveData = {
        from: sourceSquare as Square,
        to: targetSquare as Square,
        promotion: "q" as const,
      };

      const moveResult = chessGame.move(moveData);

      if (moveResult) {
        // Move was successful
        setChessPosition(chessGame.fen());
        updateMovesFromHistory();

        const gameId = getGameIdFromPath();
        if (gameId && socket) {
          socket.emit("make-move", { gameId, move: moveData });
        }

        setMoveFrom("");
        setOptionSquares({});
        return true;
      } else {
        toast.error("Invalid move");
        return false;
      }
    } catch {
      toast.error("Invalid move");
      return false;
    }
  }

  // Premove handling
  // Clear premoves on right click with smooth animation
  function onSquareRightClick(_args: SquareHandlerArgs) {
    if (premoves.length > 0) {
      animatePremovesBack();
    }
  }

  // Handle promotion
  async function handlePromotion(piece: PieceSymbol) {
    if (!promotionMove) return;
    try {
      const moveData = {
        from: promotionMove.from,
        to: promotionMove.to,
        promotion: piece,
      };

      const moveResult = chessGame.move(moveData);

      if (moveResult) {
        // Promotion successful
        setChessPosition(chessGame.fen());
        updateMovesFromHistory();

        // Send promotion move to backend via both WebSocket and API
        const gameId = getGameIdFromPath();
        if (gameId && socket) {
          socket.emit("make-move", { gameId, move: moveData });
        }
      } else {
        toast.error("Failed to make promotion move");
      }
    } catch (e) {
      console.error("Promotion failed", e);
      toast.error("Failed to make promotion move");
    }
    setPromotionMove(null);
  }

  function handleResign() {
    setShowResignConfirm(true);
  }

  async function executeResign() {
    setShowResignConfirm(false);
    const gameId = getGameIdFromPath();
    if (!gameId) return;

    if (socket && socket.connected) {
      socket.emit("resign", gameId);

      const timeout = setTimeout(async () => {
        const result = await resignGame(gameId);
      }, 3000);

      const resignListener = () => {
        clearTimeout(timeout);
        socket.off("game-resigned", resignListener);
      };

      socket.once("game-resigned", resignListener);
    } else {
      const result = await resignGame(gameId);
      if (result) {
        toast.success("Game resigned");
      }
    }
  }

  function handleDrawOffer() {
    const gameId = getGameIdFromPath();
    if (!gameId || !socket) return;

    setIsDrawOffering(true);
    setShowDrawOffer(true);

    socket.emit("draw-offer", { gameId, from: username || guestId });
    toast.info("Draw offer sent");
  }

  function handleAcceptDraw() {
    const gameId = getGameIdFromPath();
    if (!gameId || !socket) return;

    socket.emit("draw-accept", { gameId });
    setShowDrawOffer(false);
    toast.success("Draw accepted");
  }

  function handleDeclineDraw() {
    const gameId = getGameIdFromPath();
    if (!gameId || !socket) return;

    socket.emit("draw-decline", { gameId });
    setShowDrawOffer(false);
    setIsDrawOffering(false);
    toast.info("Draw declined");
  }

  function handleCancelDrawOffer() {
    const gameId = getGameIdFromPath();
    if (!gameId || !socket) return;

    socket.emit("draw-cancel", { gameId });
    setShowDrawOffer(false);
    setIsDrawOffering(false);
    toast.info("Draw offer canceled");
  }

  function updateMovesFromHistory() {
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
    const newGame = new Chess();
    newGame.load(initialFen);

    for (let i = 0; i <= index; i++) {
      const move = moves[i];
      if (!move) break;
      if (move.white) {
        try {
          newGame.move(move.white);
        } catch (error) {
          console.error("Error replaying white move:", error);
          // Skip invalid move
        }
      }
      if (i === index && !move.black) break;
      if (move.black) {
        try {
          newGame.move(move.black);
        } catch (error) {
          console.error("Error replaying black move:", error);
          // Skip invalid move
        }
      }
    }
    chessGameRef.current = newGame;
    setChessPosition(newGame.fen());
    setCurrentMoveIndex(index);
  }

  // Board styling and configuration
  const { chessboardOptions } = useBoardStyling({
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
  });

  // Determine whose turn it is
  const currentTurn = chessGame.turn(); // 'w' or 'b'
  const isMyTurn =
    (playerColor === "white" && currentTurn === "w") ||
    (playerColor === "black" && currentTurn === "b");

  return (
    <div className="h-full lg:h-screen w-full flex flex-col">
      {/* HEADER */}
      <div className="flex justify-between items-center pt-2 pb-3 px-4 border-white/10">
        <h1 className="text-2xl font-bold">Chess</h1>
        <GameControls
          onChatToggle={() => setIsChatOpen(!isChatOpen)}
          onDrawOffer={handleDrawOffer}
          onResign={handleResign}
          gameCompleted={gameStatus === "completed"}
        />
      </div>

      <div
        className="flex gap-2 justify-center items-start flex-col lg:flex-row relative"
        style={isDesktop ? { height: `${boardSize}px` } : {}}
      >
        {/* LEFT: CHESSBOARD */}
        <div className="relative flex justify-center items-center w-full lg:w-auto h-full">
          {promotionMove && <PromotionDialog onSelect={handlePromotion} />}
          <Chessboard options={chessboardOptions} />
        </div>

        {/* RIGHT: SIDEBAR */}
        <div className="w-full lg:w-1/3 flex flex-col justify-between h-full px-4 lg:pb-4">
          <div className="flex flex-col gap-4">
            {/* Player Info Section */}
            <div className="flex justify-between items-center p-1 sm:p-3 rounded-lg">
              <PlayerInfo
                username={username || "You"}
                avatar={user?.avatar ?? "/avatar7.svg"}
                isCurrentPlayer={true}
                isMyTurn={isMyTurn}
              />
              <div className="flex justify-center text-gray-400">vs</div>
              <PlayerInfo
                username={opponent?.username || "Opponent"}
                avatar={opponent?.avatar || "/avatar8.svg"}
                isCurrentPlayer={false}
                isMyTurn={!isMyTurn}
              />
            </div>

          </div>

          <MoveHistory
            moves={moves}
            currentMoveIndex={currentMoveIndex}
            onNavigate={goToMove}
          />
        </div>

        {/* CHAT PANEL */}
        <ChatPanel
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          socket={socket}
          gameId={getGameIdFromPath()}
          opponentName={opponent?.username || "Opponent"}
          messages={chatMessages}
          onAddMessage={handleAddChatMessage}
        />
      </div>
      {gameResult && (
        <GameResultModal
          isOpen={isResultModalOpen}
          result={gameResult.type}
          message={gameResult.message}
          onClose={() => setIsResultModalOpen(false)}
          isGuest={!!guestId}
        />
      )}

      {/* Resign Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showResignConfirm}
        title="Resign Game"
        message="Are you sure you want to resign? This will end the game and you will lose."
        confirmText="Resign"
        cancelText="Cancel"
        confirmVariant="destructive"
        onConfirm={executeResign}
        onCancel={() => setShowResignConfirm(false)}
      />

      {/* Draw Offer Dialog */}
      <DrawOfferDialog
        isOpen={showDrawOffer}
        isOffering={isDrawOffering}
        opponentName={opponent?.username || "Opponent"}
        onAccept={handleAcceptDraw}
        onDecline={handleDeclineDraw}
        onCancel={handleCancelDrawOffer}
      />
    </div>
  );
}