"use client";

import React, { useState, useEffect, useRef, use } from "react";
import { Chess, Square, PieceSymbol } from "chess.js";
import {
  Chessboard,
  SquareHandlerArgs,
  PieceDropHandlerArgs,
  PieceHandlerArgs,
} from "react-chessboard";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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
import Button from "@/components/ui/Button";

type GameClockState = {
  whiteTimeRemaining: number;
  blackTimeRemaining: number;
  incrementSeconds: number;
  lastMoveAt: string;
  currentTurn: "white" | "black";
};

type RatingDelta = {
  oldRating: number;
  newRating: number;
  delta: number;
};

type RatingUpdatePayload = {
  gameId: string;
  playerColor: "white" | "black";
  self?: RatingDelta | null;
  opponent?: RatingDelta | null;
};

type ClockMetaState = {
  whiteBase: number;
  blackBase: number;
  currentTurn: "white" | "black";
  increment: number;
  lastSync: number;
  isRunning: boolean;
};

export default function ChessPage() {
  const router = useRouter();
  const { setUser, user, opponent, setOpponent } = useUserStore();
  const userId = user.id; // Extract user ID once
  const guestId = user.guestId;
  const username = user.username;

  // For guest users, use guestId as identifier
  const playerId = userId || guestId;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showAnimations] = useState(true);
  const [moves, setMoves] = useState<{ moveNumber: number; white?: string; black?: string }[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(() => moves.length - 1);
  const [gameStatus, setGameStatus] = useState<string>("active");
  const [playerColor, setPlayerColor] = useState<"white" | "black">("white");
  const playerColorRef = useRef<"white" | "black">("white");
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white");
  const chatRef = useRef<HTMLDivElement | null>(null);
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const moveRef = useRef<HTMLDivElement | null>(null);

  // Timer states
  const [whiteTime, setWhiteTime] = useState<number>(600);
  const [blackTime, setBlackTime] = useState<number>(600);
  const [clockMeta, setClockMeta] = useState<ClockMetaState>({
    whiteBase: 600,
    blackBase: 600,
    currentTurn: "white",
    increment: 0,
    lastSync: Date.now(),
    isRunning: true,
  });
  const [startingElo, setStartingElo] = useState<number | null>(user.elo ?? null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [gameResult, setGameResult] = useState<{
    type: "win" | "loss" | "draw" | "abandoned";
    message: string;
  } | null>(null);
  const [ratingChange, setRatingChange] = useState<RatingDelta | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [timeControlDisplay, setTimeControlDisplay] = useState<string>("Blitz • 3 min");

  // Dialog states
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [showDrawOffer, setShowDrawOffer] = useState(false);
  const [isDrawOffering, setIsDrawOffering] = useState(false); // true if we sent the offer
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  // Game setup
  // Game state management
  const chessGameRef = useRef(new Chess());
  const chessGame = chessGameRef.current;
  const [chessPosition, setChessPosition] = useState(chessGame.fen());
  const [initialFen, setInitialFen] = useState<string>(new Chess().fen());
  const [moveFrom, setMoveFrom] = useState("");
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});
  const [checkSquare, setCheckSquare] = useState<string | null>(null);

  // Board size state (controlled)
  const [boardSize, setBoardSize] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [promotionMove, setPromotionMove] = useState<{ from: Square; to: Square } | null>(null);
  const [isPremovePromotion, setIsPremovePromotion] = useState(false);

  // Premove management via custom hook
  const {
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
  } = usePremoves(chessGame);

  // Chat message handler
  const handleAddChatMessage = (message: Message) => {
    setChatMessages((prev) => [...prev, message]);
  };

  // Helper to format time in MM:SS format
  const formatTime = (rawSeconds: number): string => {
    const seconds = Math.max(0, Math.floor(rawSeconds));
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Helper to set game result
  const setGameResultHelper = (
    result: string,
    whitePlayerId: string,
    blackPlayerId: string,
    whitePlayerName: string,
    blackPlayerName: string
  ) => {
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
        const { game, clock } = gameData;

        // Determine player color and set board orientation
        const whiteId = String(game.whitePlayerId).trim();
        const blackId = String(game.blackPlayerId).trim();
        const currentId = String(playerId).trim();

        if (whiteId === currentId) {
          setPlayerColor("white");
          setBoardOrientation("white");
        } else if (blackId === currentId) {
          setPlayerColor("black");
          setBoardOrientation("black");
        } else {
          setPlayerColor("white");
          setBoardOrientation("white");
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

        // Set time control display
        if (game.initialTimeSeconds) {
          const minutes = Math.floor(game.initialTimeSeconds / 60);
          const increment = game.incrementSeconds || 0;
          let category = "";
          
          // Determine time control category based on initial time
          if (game.initialTimeSeconds < 180) {
            category = "Bullet";
          } else if (game.initialTimeSeconds < 600) {
            category = "Blitz";
          } else if (game.initialTimeSeconds <= 1800) {
            category = "Rapid";
          } else {
            category = "Classical";
          }
          
          setTimeControlDisplay(`${category} • ${minutes}${increment > 0 ? `+${increment}` : ''} min`);
        }

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
            avatar: opponentAvatar,
            elo: isWhite ? game.blackPlayerElo ?? null : game.whitePlayerElo ?? null
          };

          // Only set if opponent is different from current user
          if (opponentData.username !== username) {
            setOpponent(opponentData);
          }
        }

        // Sync clock from server
        syncClockFromServer(clock, game.status);

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
      if (data?.clock) {
        syncClockFromServer(data.clock, data.game?.status);
      }
    });

    newSocket.on("clock-sync", (data) => {
      if (data?.clock) {
        syncClockFromServer(data.clock, gameStatus);
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

      if (data?.gameState?.clock) {
        syncClockFromServer(data.gameState.clock, data.gameState.game.status);
      }
    });

    newSocket.on("game-over", (data) => {
      setGameStatus("completed");
      setClockMeta((prev) => ({ ...prev, isRunning: false }));

      if (data?.ratings) {
        const currentColor = playerColorRef.current;
        const selfRating = currentColor === "white" ? data.ratings.white : data.ratings.black;
        const oppRating = currentColor === "white" ? data.ratings.black : data.ratings.white;

        if (selfRating) {
          setRatingChange(selfRating);
          setUser({ elo: selfRating.newRating });
        }

        if (oppRating) {
          setOpponent({ elo: oppRating.newRating });
        }
      }

      if (data?.result) {
        const isWinner = data.winner?.userId === playerId;
        let message = "";

        if (data.reason === "TIMEOUT") {
          message = isWinner ? "You win on time!" : "You lost on time!";
        } else if (data.reason === "CHECKMATE") {
          message = isWinner ? "Checkmate! You win!" : "Checkmate! You lose!";
        } else if (data.reason === "RESIGNATION") {
          message = isWinner ? "Opponent resigned! You win!" : "You resigned";
        } else if (data.reason?.startsWith("DRAW")) {
          message = "The game ended in a draw.";
        } else {
          message = data.result === "draw" ? "The game ended in a draw." : 
                    (isWinner ? "You win!" : "You lose!");
        }

        setGameResult({
          type: data.result === "draw" ? "draw" : (isWinner ? "win" : "loss"),
          message
        });
      }
      
      setIsResultModalOpen(true);
    });

    newSocket.on("rating-updated", (data: RatingUpdatePayload) => {
      if (!data) return;
      const currentColor = playerColorRef.current;
      if (data.playerColor !== currentColor) return;

      if (data.self) {
        setRatingChange(data.self);
        setUser({ elo: data.self.newRating });
      }
      if (data.opponent) {
        setOpponent({ elo: data.opponent.newRating });
      }
    });

    newSocket.on("game-resigned", (data) => {
      setGameStatus("completed");
      setClockMeta((prev) => ({ ...prev, isRunning: false }));

      if (data?.ratings) {
        const currentColor = playerColorRef.current;
        const selfRating = currentColor === "white" ? data.ratings.white : data.ratings.black;
        const oppRating = currentColor === "white" ? data.ratings.black : data.ratings.white;

        if (selfRating) {
          setRatingChange(selfRating);
          setUser({ elo: selfRating.newRating });
        }
        if (oppRating) {
          setOpponent({ elo: oppRating.newRating });
        }
      }

      const didIResign = data?.resignedPlayerId === playerId;
      setGameResult({
        type: didIResign ? "loss" : "win",
        message: didIResign ? "You resigned from the game" : "Opponent resigned! You win!",
      });
      
      if (!didIResign) {
        toast.success("Opponent resigned! You win!");
      }
      
      setIsResultModalOpen(true);
    });

    newSocket.on("players-connected", (data) => {
      console.log("Players connected:", data);
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
      setShowDrawOffer(true);
      toast.info(`${data.from} has offered a draw`);
    });

    newSocket.on("draw-accept", (data) => {
      setShowDrawOffer(false);
      setIsDrawOffering(false);
      setGameStatus("completed");
      setClockMeta((prev) => ({ ...prev, isRunning: false }));

      if (data?.ratings) {
        const currentColor = playerColorRef.current;
        const selfRating = currentColor === "white" ? data.ratings.white : data.ratings.black;
        if (selfRating) {
          setRatingChange(selfRating);
          setUser({ elo: selfRating.newRating });
        }
      }

      setGameResult({ type: "draw", message: "Game drawn by agreement" });
      setIsResultModalOpen(true);
    });

    newSocket.on("draw-decline", () => {
      setShowDrawOffer(false);
      setIsDrawOffering(false);
    });

    newSocket.on("draw-cancel", () => {
      setShowDrawOffer(false);
      setIsDrawOffering(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      newSocket.off("connect");
      newSocket.off("connect_error");
      newSocket.off("game-state");
      newSocket.off("clock-sync");
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

  useEffect(() => {
    // When moves update, set currentMoveIndex to the live position
    // Live position = total number of half-moves (one past the last move)
    const fullHistory = chessGame.history();
    setCurrentMoveIndex(fullHistory.length);
  }, [moves, chessGame]);

  // Stop clock when game is completed
  useEffect(() => {
    if (gameStatus !== "completed") return;
    setClockMeta((prev) => (prev.isRunning ? { ...prev, isRunning: false } : prev));
  }, [gameStatus]);

  // Prevent leaving active game
  useEffect(() => {
    const isGameActive = gameStatus === "active";
    
    if (!isGameActive) return;

    const currentPath = window.location.pathname;
    let isNavigatingAway = false;

    // Handle browser close/refresh
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "You have an active game. Leaving will result in a loss. Are you sure?";
      return e.returnValue;
    };

    // Handle browser back/forward button
    const handlePopState = (e: PopStateEvent) => {
      if (isNavigatingAway) return;
      
      // User pressed back/forward, but we want to stay and show modal
      e.preventDefault();
      
      // Push current state back to history to cancel the navigation
      window.history.pushState(null, '', currentPath);
      
      // Show the modal to ask user
      setPendingNavigation(() => () => {
        isNavigatingAway = true;
        window.history.back();
      });
      setShowLeaveConfirm(true);
    };

    // Push initial state to enable popstate detection
    window.history.pushState(null, '', currentPath);

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    
    // Intercept all link clicks to show modal
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href]');
      const button = target.closest('button');
      
      // Check if clicking a navigation link or button that might navigate
      if (link || (button && (button.textContent?.includes('Dashboard') || button.textContent?.includes('Back')))) {
        e.preventDefault();
        e.stopPropagation();
        
        // Store the navigation action
        if (link) {
          const href = link.getAttribute('href');
          setPendingNavigation(() => () => router.replace(href || '/dashboard'));
        } else {
          setPendingNavigation(() => () => router.replace('/dashboard'));
        }
        
        setShowLeaveConfirm(true);
      }
    };

    document.addEventListener('click', handleLinkClick, true);
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener('click', handleLinkClick, true);
    };
  }, [gameStatus, router]);

  // Clock ticking effect with timeout detection
  useEffect(() => {
    const handleTimeout = (timedOutColor: "white" | "black") => {
      if (gameStatus !== "active") return;

      setGameStatus("completed");
      setClockMeta((prev) => ({ ...prev, isRunning: false }));

      const isWinner =
        (timedOutColor === "white" && playerColorRef.current === "black") ||
        (timedOutColor === "black" && playerColorRef.current === "white");

      setGameResult({
        type: isWinner ? "win" : "loss",
        message: isWinner ? "You win on time!" : "You lost on time!",
      });
    };

    const updateDisplay = () => {
      if (!clockMeta.isRunning) {
        setWhiteTime(clockMeta.whiteBase);
        setBlackTime(clockMeta.blackBase);
        return;
      }
      const elapsed = Math.max(0, Math.floor((Date.now() - clockMeta.lastSync) / 1000));
      let newWhiteTime = clockMeta.whiteBase;
      let newBlackTime = clockMeta.blackBase;

      if (clockMeta.currentTurn === "white") {
        newWhiteTime = Math.max(0, clockMeta.whiteBase - elapsed);
        newBlackTime = clockMeta.blackBase;
      } else {
        newBlackTime = Math.max(0, clockMeta.blackBase - elapsed);
        newWhiteTime = clockMeta.whiteBase;
      }

      setWhiteTime(newWhiteTime);
      setBlackTime(newBlackTime);

      // Check for timeout
      if (newWhiteTime === 0 && clockMeta.currentTurn === "white" && gameStatus === "active") {
        handleTimeout("white");
      } else if (newBlackTime === 0 && clockMeta.currentTurn === "black" && gameStatus === "active") {
        handleTimeout("black");
      }
    };

    updateDisplay();
    if (!clockMeta.isRunning) return;
    const intervalId = window.setInterval(updateDisplay, 100);
    return () => window.clearInterval(intervalId);
  }, [clockMeta, gameStatus, playerColorRef]);

  // Helper to sync clock from server
  const syncClockFromServer = (clock?: GameClockState, status?: string) => {
    if (!clock) return;

    const serverTime = new Date(clock.lastMoveAt).getTime();
    const now = Date.now();
    const networkDelay = Math.max(0, now - serverTime);
    const compensatedDelay = Math.min(networkDelay, 2000); // Cap at 2 seconds for network delay

    // Adjust for network delay
    const adjustedWhite = status === "active" && clock.currentTurn === "white"
      ? Math.max(0, clock.whiteTimeRemaining - Math.floor(compensatedDelay / 1000))
      : clock.whiteTimeRemaining;
    const adjustedBlack = status === "active" && clock.currentTurn === "black"
      ? Math.max(0, clock.blackTimeRemaining - Math.floor(compensatedDelay / 1000))
      : clock.blackTimeRemaining;

    setClockMeta({
      whiteBase: adjustedWhite,
      blackBase: adjustedBlack,
      currentTurn: clock.currentTurn,
      increment: clock.incrementSeconds,
      lastSync: now,
      isRunning: status === "active",
    });

    setWhiteTime(adjustedWhite);
    setBlackTime(adjustedBlack);
  };

  // Helper to advance local clock after making a move
  const advanceLocalClockAfterMove = (moverColor: "white" | "black") => {
    setClockMeta((prev) => {
      const now = Date.now();
      const elapsed = prev.currentTurn === moverColor 
        ? Math.max(0, Math.floor((now - prev.lastSync) / 1000)) 
        : 0;
      const base = moverColor === "white" ? prev.whiteBase : prev.blackBase;
      const remaining = Math.max(0, base - elapsed);
      const updated = remaining + prev.increment;
      const nextTurn = moverColor === "white" ? "black" : "white";
      
      const nextMeta: ClockMetaState = {
        whiteBase: moverColor === "white" ? updated : prev.whiteBase,
        blackBase: moverColor === "black" ? updated : prev.blackBase,
        currentTurn: nextTurn,
        increment: prev.increment,
        lastSync: now,
        isRunning: gameStatus !== "completed",
      };

      // Immediately update displayed times
      setWhiteTime(nextMeta.whiteBase);
      setBlackTime(nextMeta.blackBase);
      
      return nextMeta;
    });
  };

  // Move handling Get move options
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
    const fullHistory = chessGame.history();
    if (currentMoveIndex < fullHistory.length) {
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
    
    const fullHistory = chessGame.history();
    if (currentMoveIndex < fullHistory.length) {
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
        setChessPosition(chessGame.fen());
        updateMovesFromHistory();

        const gameId = getGameIdFromPath();
        if (gameId && socket) {
          socket.emit("make-move", { gameId, move: moveData });
        }
        advanceLocalClockAfterMove(playerColorRef.current);
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
    
    const fullHistory = chessGame.history();
    if (currentMoveIndex < fullHistory.length) {
      return false;
    }

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
        setChessPosition(chessGame.fen());
        updateMovesFromHistory();

        const gameId = getGameIdFromPath();
        if (gameId && socket) {
          socket.emit("make-move", { gameId, move: moveData });
        }

        advanceLocalClockAfterMove(playerColorRef.current);
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
  function onSquareRightClick() {
    if (premoves.length > 0) {
      animatePremovesBack();
    }
  }

  // Handle promotion for both regular moves and premoves
  async function handlePromotion(piece: PieceSymbol) {
    if (isPremovePromotion && pendingPromotionPremove) {
      // Complete premove promotion
      completePremovePromotion(piece);
      setIsPremovePromotion(false);
      return;
    }

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

        // Send promotion move to backend via WebSocket
        const gameId = getGameIdFromPath();
        if (gameId && socket) {
          socket.emit("make-move", { gameId, move: moveData });
        }
        advanceLocalClockAfterMove(playerColorRef.current);
      } else {
        toast.error("Failed to make promotion move");
      }
    } catch (e) {
      console.error("Promotion failed", e);
      toast.error("Failed to make promotion move");
    }
    setPromotionMove(null);
  }

  // Watch for pending premove promotion
  useEffect(() => {
    if (pendingPromotionPremove) {
      setIsPremovePromotion(true);
    }
  }, [pendingPromotionPremove]);

  function handleResign() {
    setShowResignConfirm(true);
  }

  async function executeResignAndLeave() {
    await executeResign();
    setShowLeaveConfirm(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  }

  async function executeResign() {
    setShowResignConfirm(false);
    const gameId = getGameIdFromPath();
    if (!gameId) return;

    if (socket && socket.connected) {
      socket.emit("resign", gameId);

      const timeout = setTimeout(async () => {
        await resignGame(gameId);
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

  // Helper to find king position when in check
  const getKingSquareInCheck = (chess: Chess): string | null => {
    if (!chess.inCheck()) return null;
    
    const turn = chess.turn();
    const board = chess.board();
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.type === 'k' && piece.color === turn) {
          const file = String.fromCharCode(97 + col); // 'a' to 'h'
          const rank = 8 - row;
          return `${file}${rank}`;
        }
      }
    }
    return null;
  };

  // Update after opponent moves or any game state change
  useEffect(() => {
    const kingSquare = getKingSquareInCheck(chessGame);
    setCheckSquare(kingSquare);
  }, [chessPosition, chessGame]);

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

  function goToMove(halfMoveIndex: number) {
    clearPremoves();
    setOptionSquares({});
    setMoveFrom("");

    // Get full move history from the main game
    const fullHistory = chessGame.history();

    // Special case: if navigating to the "live position" (after all moves)
    // This is when halfMoveIndex equals totalHalfMoves (one past the last move)
    if (halfMoveIndex >= fullHistory.length) {
      // Sync to the current live game state
      setChessPosition(chessGame.fen());
      setCurrentMoveIndex(fullHistory.length);
      
      // Update check indicator
      const kingSquare = getKingSquareInCheck(chessGame);
      setCheckSquare(kingSquare);
      return;
    }

    // For historical positions, create a temporary chess instance
    const tempChess = new Chess();
    tempChess.reset();
    tempChess.load(initialFen);

    // Apply moves up to the selected half-move index
    for (let i = 0; i <= halfMoveIndex && i < fullHistory.length; i++) {
      try {
        tempChess.move(fullHistory[i]);
      } catch (error) {
        console.error("Error replaying move:", error);
      }
    }

    // Update the display position
    setChessPosition(tempChess.fen());
    setCurrentMoveIndex(halfMoveIndex);
    
    // Update check indicator for the navigation position
    const kingSquare = getKingSquareInCheck(tempChess);
    setCheckSquare(kingSquare);
  }

  // Responsive board sizing
  // useEffect(() => {
  //   function computeBoardSize() {
  //     if (typeof window === "undefined") return;

  //     const width = window.innerWidth;
  //     const height = window.innerHeight;

  //     const isDesk = width >= 1024;
  //     setIsDesktop(isDesk);

  //     if (isDesk) {
  //       const maxBoard = 540;
  //       const availableWidth = Math.max(400, Math.min(width * 0.62, width - 520));
  //       const availableHeight = Math.max(400, height - 200);
  //       const size = Math.max(360, Math.min(maxBoard, Math.min(availableWidth, availableHeight)));
  //       setBoardSize(Math.floor(size));
  //     } else {
  //       const mobileWidth = Math.min(width - 32, height - 160);
  //       setBoardSize(Math.max(260, Math.floor(mobileWidth)));
  //     }
  //   }

  //   computeBoardSize();
  //   window.addEventListener("resize", computeBoardSize);
  //   return () => window.removeEventListener("resize", computeBoardSize);
  // }, []);

  useEffect(() => {
  function computeBoardSize() {
    if (typeof window === "undefined") return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // 🔥 Improved device detection
    const isLandscape = width > height * 1.2; 
    const isLargeWidth = width >= 1000;

    const isDeskView = isLandscape || isLargeWidth;
    setIsDesktop(isDeskView);

    if (isDeskView) {
      // DESKTOP / LANDSCAPE BEHAVIOR
      const maxBoard = 540;

      // ensure board is not taller than viewport minus UI
      const availableHeight = Math.max(400, height - 180);

      // ensure board does not overflow sidebar + padding
      const availableWidth = Math.max(380, width - 520);

      const size = Math.min(maxBoard, availableHeight, availableWidth);

      setBoardSize(Math.floor(size));
    } 
    else {
      // MOBILE / PORTRAIT
      const mobileWidth = Math.min(width - 32, height - 140);
      setBoardSize(Math.max(240, Math.floor(mobileWidth)));
    }
  }

  computeBoardSize();
  window.addEventListener("resize", computeBoardSize);
  return () => window.removeEventListener("resize", computeBoardSize);
}, []);


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
    checkSquare,
  });

  // Determine whose turn it is
  const currentTurn = chessGame.turn(); // 'w' or 'b'
  const isMyTurn =
    (playerColor === "white" && currentTurn === "w") ||
    (playerColor === "black" && currentTurn === "b");

  const handleResultModalClose = () => {
    setIsResultModalOpen(false);
    setRatingChange(null);
  };

  useEffect(() => {
    if (startingElo === null && typeof user.elo === "number") {
      setStartingElo(user.elo);
    }
  }, [startingElo, user.elo]);

  useEffect(() => {
    playerColorRef.current = playerColor;
  }, [playerColor]);

  useEffect(() => {
    if (chatRef.current) {
      setTimeout(() => {
        chatRef.current?.scrollTo({
          top: chatRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 0);
    }
  }, [chatMessages]);

  useEffect(() => {
    if (moveRef.current) {
      moveRef.current.scrollTop = moveRef.current.scrollHeight;
    }
  }, [moves, currentMoveIndex]);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="h-full lg:h-screen lg:overflow-hidden w-full flex flex-col">
      {/* MOBILE HEADER */}
      <div className="flex lg:hidden justify-between items-center pt-2 pb-3 px-4 border-white/10">
        <button onClick={() => router.replace("/")} className="text-2xl font-bold hover:text-primary transition-colors">
          Chess
        </button>
        <GameControls
          onChatToggle={() => setIsChatOpen(!isChatOpen)}
          onDrawOffer={handleDrawOffer}
          onResign={handleResign}
          gameCompleted={gameStatus === "completed"}
        />
      </div>

      {/* DESKTOP HEADER */}
      <div className="hidden lg:flex justify-between items-center pt-2 pb-3 px-4 border-white/10 overflow-hidden">
        <button onClick={() => router.replace("/")} className="absolute top-4 left-4 text-2xl font-bold hover:text-primary transition-colors">
          Chess
        </button>
      </div>

      {/* MAIN LAYOUT */}
      <div
        ref={containerRef}
        className="flex gap-6 justify-center items-center flex-col lg:flex-row px-3 lg:px-6 py-2 h-full"
        style={isDesktop ? { minHeight: `${boardSize + 160}px` } : {}}
      >
        {/* LEFT: Board + player info */}
        <div className="flex flex-col items-center justify-between lg:flex-shrink-0 h-full">
          {/* Top player info */}
            <div className="w-full flex items-center justify-between bg-white/2 rounded-lg p-2 backdrop-blur-xs">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden">
                  <img
                    src={opponent?.avatar || "/avatar8.svg"}
                    alt="opponent"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-base font-medium">
                  {opponent?.username || "Opponent"}
                </span>
              </div>
              <span className={`text-lg font-mono px-3 py-1.5 rounded transition-all duration-300 ${
                !isMyTurn ? "bg-primary text-black font-bold shadow-lg animate-pulse" : "bg-zinc-800"
              }`}>
                {formatTime(playerColor === "white" ? blackTime : whiteTime)}
              </span>
            </div>

          {/* Chessboard container: only render board when we have a positive boardSize */}
          <div
            className="flex items-center justify-center bg-transparent"
            style={{
              width: isDesktop ? `${boardSize}px` : "100%",
              height: isDesktop ? `${boardSize}px` : `${boardSize}px`,
              minWidth: isDesktop ? `${boardSize}px` : undefined,
            }}
          >
            {(promotionMove || (isPremovePromotion && pendingPromotionPremove)) && (
              <PromotionDialog onSelect={handlePromotion} />
            )}

            {/* Render Chessboard only when boardSize > 0 to avoid "Square width not found" */}
            {boardSize > 0 && (
              <div style={{ width: isDesktop ? boardSize : "100%", height: isDesktop ? boardSize : boardSize }}
                className="flex items-center justify-center">
                {/* Key ensures react-chessboard recalculates layout when boardSize changes */}
                <Chessboard key={boardSize} options={chessboardOptions} />
              </div>
            )}
          </div>


          {/* Bottom Player Info - You */}
          <div className="w-full flex items-center justify-between bg-white/2 rounded-lg p-2 backdrop-blur-xs">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden">
                <img
                  src={user?.avatar ?? "/avatar7.svg"}
                  alt="you"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-base font-medium">
                {username || "You"}
                <span className="text-gray-400 text-sm ml-1">(you)</span>
              </span>
            </div>
            <span className={`text-lg font-mono px-3 py-1.5 rounded transition-all duration-300 ${
              isMyTurn
                ? "bg-primary text-black font-bold shadow-lg animate-pulse"
                : "bg-zinc-800"
            }`}>
              {formatTime(playerColor === "white" ? whiteTime : blackTime)}
            </span>
          </div>
        </div>

        {/* RIGHT SECTION - Controls + Move History + Chat */}
        <div className="w-full lg:w-[520px] flex flex-col gap-4 h-full">
          {/* Top Controls Row */}
          <div className="hidden lg:flex items-center gap-24 flex-shrink-0">
            <span className="text-lg text-gray-200">
              {timeControlDisplay}
            </span>
            <div className="flex flex-1 gap-2 ">
              <Button
                onClick={handleDrawOffer}
                size="small"
                variant="secondary"
              >
                Offer Draw
              </Button>
              <Button
                onClick={handleResign}
                disabled={gameStatus === "completed"}
                size="small"
                variant="destructive"
              >
                Resign
              </Button>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className={`flex gap-2 flex-shrink-0 ${isDesktop ? "justify-center lg:justify-start" : "fixed bottom-4 z-10 border border-white/10 backdrop-blur-xs rounded-lg py-2 px-4 left-1/2 transform -translate-x-1/2"}`}>
            <button
              className="w-14 h-12 bg-zinc-800 hover:bg-zinc-700 cursor-pointer text-white text-xl rounded-lg disabled:opacity-40 transition-colors flex items-center justify-center"
              onClick={() => goToMove(-1)}
              disabled={currentMoveIndex <= -1 || moves.length === 0}
              aria-label="Go to start"
            >
              ⏮
            </button>
            <button
              className="w-14 h-12 bg-zinc-800 hover:bg-zinc-700  cursor-pointer text-white text-xl rounded-lg disabled:opacity-40 transition-colors flex items-center justify-center"
              onClick={() => goToMove(currentMoveIndex - 1)}
              disabled={currentMoveIndex <= -1 || moves.length === 0}
              aria-label="Previous move"
            >
              ◀
            </button>
            <button
              className="w-14 h-12 bg-zinc-800 hover:bg-zinc-700 cursor-pointer text-white text-xl rounded-lg disabled:opacity-40 transition-colors flex items-center justify-center"
              onClick={() => goToMove(currentMoveIndex + 1)}
              disabled={currentMoveIndex >= moves.reduce((total, move) => total + (move.white ? 1 : 0) + (move.black ? 1 : 0), 0) || moves.length === 0}
              aria-label="Next move"
            >
              ▶
            </button>
            <button
              className="w-14 h-12 bg-zinc-800 hover:bg-zinc-700 cursor-pointer text-white text-xl rounded-lg disabled:opacity-40 transition-colors flex items-center justify-center"
              onClick={() => goToMove(moves.reduce((total, move) => total + (move.white ? 1 : 0) + (move.black ? 1 : 0), 0))}
              disabled={currentMoveIndex >= moves.reduce((total, move) => total + (move.white ? 1 : 0) + (move.black ? 1 : 0), 0) || moves.length === 0}
              aria-label="Go to end"
            >
              ⏭
            </button>
          </div>

          {/* Move History */}
          <div className="bg-white/2 rounded-lg backdrop-blur-xs overflow-hidden border border-white/10 flex-shrink-0">
            <div className="bg-white/4 px-4 py-3">
              <div className="grid grid-cols-3 gap-4 text-base font-semibold">
                <div>White</div>
                <div className="text-center">Move</div>
                <div className="text-right">Black</div>
              </div>
            </div>
            <div className="h-[180px] overflow-y-auto p-4" ref={moveRef}>
              {moves.length === 0 ? (
                <p className="text-gray-500 text-center py-4 text-base">No moves yet</p>
              ) : (
                <div className="space-y-1.5">
                  {moves.map((row, idx) => {
                    const highlightedMove = Math.floor(currentMoveIndex / 2);
                    const highlightedSide = currentMoveIndex % 2 === 0 ? "white" : "black";
                    return (
                      <div
                        key={row.moveNumber}
                        className="grid grid-cols-3 gap-4 text-base"
                      >
                        <div
                          className={`px-3 py-2 rounded cursor-pointer hover:bg-zinc-700 transition-colors ${
                            idx === highlightedMove && highlightedSide === "white"
                              ? "bg-zinc-800 text-white font-bold"
                              : ""
                          }`}
                          onClick={() => goToMove(idx * 2)}
                        >
                          {row.white}
                        </div>
                        <div className="text-center text-gray-400 px-3 py-2">
                          {row.moveNumber}
                        </div>
                        <div
                          className={`px-3 py-2 rounded cursor-pointer text-right hover:bg-zinc-700 transition-colors ${
                            idx === highlightedMove && highlightedSide === "black"
                              ? "bg-zinc-800 text-white font-bold"
                              : ""
                          }`}
                          onClick={() => row.black && goToMove(idx * 2 + 1)}
                        >
                          {row.black}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Chat Panel*/}
          <div className="hidden lg:flex bg-white/2 rounded-lg backdrop-blur-xs overflow-hidden border border-white/10 flex-col flex-1 min-h-0">
            <div className="bg-white/4 px-4 py-3 flex items-center justify-between flex-shrink-0">
              <h3 className="font-semibold text-base">Chat</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 min-h-0" ref={chatRef}>
              {chatMessages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <p className="text-base">No messages yet</p>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"} mb-2`}>
                    <div className={`max-w-[75%] rounded-lg p-2 ${msg.sender === "me" ? "bg-slate-700 text-white rounded-br-none" : "bg-zinc-700 text-white rounded-bl-none"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold">{msg.sender === "me" ? "You" : "Opponent"}</span>
                        <span className="text-xs text-gray-400">
                          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-base">{msg.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-zinc-800 flex-shrink-0">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  id="chatInputDesktop"
                  placeholder="Chat with opponent. Start typing"
                  className="flex-1 bg-zinc-800 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary text-base placeholder:text-gray-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.currentTarget.value.trim() && socket && getGameIdFromPath()) {
                      const message = e.currentTarget.value.trim();
                      const newMessage: Message = {
                        id: `${Date.now()}-${Math.random()}`,
                        sender: "me",
                        message,
                        timestamp: new Date(),
                      };
                      handleAddChatMessage(newMessage);
                      socket.emit("chat-message", { gameId: getGameIdFromPath(), message });
                      e.currentTarget.value = "";
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.getElementById("chatInputDesktop") as HTMLInputElement;
                    if (input && input.value.trim() && socket && getGameIdFromPath()) {
                      const message = input.value.trim();
                      const newMessage: Message = {
                        id: `${Date.now()}-${Math.random()}`,
                        sender: "me",
                        message,
                        timestamp: new Date(),
                      };
                      handleAddChatMessage(newMessage);
                      socket.emit("chat-message", { gameId: getGameIdFromPath(), message });
                      input.value = "";
                    }
                  }}
                  className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

      {/* Mobile Chat Drawer (unchanged) */}
      <ChatPanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        socket={socket}
        gameId={getGameIdFromPath()}
        opponentName={opponent?.username || "Opponent"}
        messages={chatMessages}
        onAddMessage={handleAddChatMessage}
      />

      {gameResult && (
        <GameResultModal
          isOpen={isResultModalOpen}
          result={gameResult.type}
          message={gameResult.message}
          onClose={() =>{handleResultModalClose();
            redirectTimerRef.current = setTimeout(() => {
                router.replace("/dashboard");
              }, 5000);}
          }
          isGuest={!!guestId}
          ratingChange={guestId ? undefined : ratingChange ?? undefined}
        />
      )}

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

      <DrawOfferDialog
        isOpen={showDrawOffer}
        isOffering={isDrawOffering}
        opponentName={opponent?.username || "Opponent"}
        onAccept={handleAcceptDraw}
        onDecline={handleDeclineDraw}
        onCancel={handleCancelDrawOffer}
      />

      <ConfirmDialog
        isOpen={showLeaveConfirm}
        title="Leave Active Game?"
        message="You have an active game in progress. If you leave now without resigning, you may be penalized. Would you like to resign and leave?"
        confirmText="Resign and Leave"
        cancelText="Stay in Game"
        confirmVariant="destructive"
        onConfirm={executeResignAndLeave}
        onCancel={() => {
          setShowLeaveConfirm(false);
          setPendingNavigation(null);
        }}
      />

    </div>
    </div>
  );
}