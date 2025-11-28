"use client";

import Button from "@/components/ui/Button";
import React, { useState, useEffect, useRef } from "react";
import { Chess, Square, PieceSymbol } from "chess.js";
import {
  Chessboard,
  SquareHandlerArgs,
  defaultPieces,
  PieceDropHandlerArgs,
  PieceHandlerArgs,
} from "react-chessboard";
import Image from "next/image";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import Cookies from "js-cookie";
import { useUserStore } from "@/store/useUserStore";
import GameResultModal from "@/components/ui/GameResultModal";
import ChatPanel, { Message } from "@/components/ui/ChatPanel";

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

  // Game setup
  const chessGameRef = useRef(new Chess());
  const chessGame = chessGameRef.current;
  const [chessPosition, setChessPosition] = useState(chessGame.fen());
  const [initialFen, setInitialFen] = useState<string>(new Chess().fen());
  const [moveFrom, setMoveFrom] = useState("");
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});
  const [boardSize, setBoardSize] = useState(400);
  const [promotionMove, setPromotionMove] = useState<{ from: Square; to: Square } | null>(null);

  // Premove state management
  const [premoves, setPremoves] = useState<PieceDropHandlerArgs[]>([]);
  const premovesRef = useRef<PieceDropHandlerArgs[]>([]);
  const [previewPosition, setPreviewPosition] = useState<string | null>(null);
  const [isAnimatingPremoveBack, setIsAnimatingPremoveBack] = useState(false);
  const [invalidPremoveSquares, setInvalidPremoveSquares] = useState<string[]>([]);

  // Helper functions
  const getGameIdFromPath = () => {
    if (typeof window === "undefined") return null;
    const parts = window.location.pathname.split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1] : null;
  };

  const getToken = () => {
    if (typeof window === "undefined") return null;
    try {
      return Cookies.get("auth-token") || null;
    } catch {
      return null;
    }
  };

  // API Helper Functions
  const fetchGameState = async (gameId: string) => {
    const token = getToken();
    if (!token && !guestId) {
      toast.error("Authentication required");
      return null;
    }

    try {
      let response;
      if(token){ response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/game/${gameId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });}else if(guestId){
         response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/game/${gameId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      }
      if (!response?.ok) {
        if (response?.status === 404) {
          toast.error("Game not found");
        } else {
          toast.error("Failed to fetch game state");
        }
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching game state:", error);
      toast.error("Network error while fetching game");
      return null;
    }
  };


  const resignGame = async (gameId: string) => {
    const token = getToken();
    if (!token) {
      toast.error("Authentication required");
      return null;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/game/${gameId}/resign`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 400) {
          toast.error("Cannot resign from this game");
        } else if (response.status === 404) {
          toast.error("Game not found");
        } else {
          toast.error("Failed to resign");
        }
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error resigning:", error);
      toast.error("Network error while resigning");
      return null;
    }
  };

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
      const gameData = await fetchGameState(gameId);
      if (gameData && gameData.game) {
        const { game } = gameData;

        console.log("Game data received:", game);
        console.log("Current playerId:", playerId);

        // Determine player color and set board orientation
        if (game.whitePlayerId === playerId) {
          setPlayerColor("white");
          setBoardOrientation("white");
          console.log("Player is WHITE, board orientation: white");
        } else if (game.blackPlayerId === playerId) {
          setPlayerColor("black");
          setBoardOrientation("black");
          console.log("Player is BLACK, board orientation: black");
        }

        // Reset chess game to starting position
        const startingFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
        chessGame.reset();
        setInitialFen(startingFen);

        // Load moves from API if available
        if (game.moves && Array.isArray(game.moves) && game.moves.length > 0) {
          console.log("Loading moves from API:", game.moves);

          // Apply each move from the API
          for (const move of game.moves) {
            try {
              chessGame.move(move);
            } catch (error) {
              console.error("Error applying move:", move, error);
            }
          }

          // Update position and moves display
          setChessPosition(chessGame.fen());
          updateMovesFromHistory();
        } else if (game.fen) {
          // Fallback: load FEN directly if no moves array
          console.log("Loading FEN directly:", game.fen);
          try {
            chessGame.load(game.fen);
            setChessPosition(chessGame.fen());
            updateMovesFromHistory();
          } catch (error) {
            console.error("Error loading FEN:", error);
          }
        } else {
          // New game, no moves yet
          setChessPosition(chessGame.fen());
        }

        // Set game status
        setGameStatus(game.status);

        // **SINGLE PLACE TO SET OPPONENT**
        if (game.whitePlayerName && game.blackPlayerName) {
          const isWhite = game.whitePlayerId === playerId;
          const opponentData = {
            username: isWhite ? game.blackPlayerName : game.whitePlayerName,
            userId: isWhite ? game.blackPlayerId : game.whitePlayerId,
            isGuest: game.isGuestGame || false,
            avatar: isWhite ? "/avatar8.svg" : "/avatar7.svg" // You can add avatar logic here
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
  }, [playerId, username]); // Added dependencies

  // Socket connection
  useEffect(() => {
    const token = getToken();
    if (!token && !guestId) {
      toast.error("Authentication required for game");
      return;
    }

    const gameId = getGameIdFromPath();
    if (!gameId) return;

    console.log("Connecting to socket...");
    let newSocket: Socket;
    if(token){ 
      newSocket = io(`${process.env.NEXT_PUBLIC_WEBSOCKET_URL}`, {
      auth: { token },
      transports: ["websocket", "polling"], // Prefer WebSocket, fallback to polling
    });}
    else {
      newSocket = io(`${process.env.NEXT_PUBLIC_WEBSOCKET_URL}`, {
      auth: { guestId : guestId },
      transports: ["websocket", "polling"], // Prefer WebSocket, fallback to polling
    });}

    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
      console.log("Joining game room:", gameId);
      newSocket.emit("join-game", gameId);
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
        updateMovesFromHistory();
      }
      if (data?.status) {
        setGameStatus(data.status);
      }
    });

    newSocket.on("move-made", (data) => {
      console.log("Move received:", {
        dataPlayer: data?.player,
        username,
        guestId,
        isOwnMove: data?.player === username || data?.player === guestId
      });
      if(data?.player === username || data?.player === guestId) {
        console.log("Ignoring own move");
        return; // Ignore your own move
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

        // PREMOVE EXECUTION - strict validation at execution time (per chess.com spec)
        if (premovesRef.current.length > 0) {
          const nextPremove = premovesRef.current[0];

          console.log("Attempting to execute premove:", {
            from: nextPremove.sourceSquare,
            to: nextPremove.targetSquare,
            piece: nextPremove.piece.pieceType,
            currentFen: chessGame.fen()
          });

          // Check if piece still exists at source square
          const pieceAtSource = chessGame.get(nextPremove.sourceSquare as Square);

          if (!pieceAtSource) {
            console.log("Premove discarded: piece no longer exists at source");
            premovesRef.current.shift();
            setPremoves([...premovesRef.current]);
            animatePremovesBack();
            toast.info("Premove canceled - piece was captured");
            setPreviewPosition(null);
            return;
          }

          // Get ALL legal moves for the current position
          const legalMoves = chessGame.moves({ verbose: true });

          // Check if this exact move (from->to) is in the legal moves
          const foundMove = legalMoves.find(
            (m) => m.from === nextPremove.sourceSquare && m.to === nextPremove.targetSquare
          );

          if (foundMove) {
            // PREMOVE IS LEGAL - execute it
            // Guard against a missing targetSquare (can be null)
            const targetSquare = nextPremove.targetSquare;
            if (!targetSquare) {
              console.log("Premove discarded: missing target square", {
                source: nextPremove.sourceSquare,
                target: nextPremove.targetSquare
              });
              premovesRef.current.shift();
              setPremoves([...premovesRef.current]);
              animatePremovesBack();
              toast.info("Premove canceled - invalid target");
              setPreviewPosition(null);
            } else {
              const isPawn = nextPremove.piece.pieceType.toLowerCase().includes('p');
              const targetRank = targetSquare[1];
              const isPromotion = isPawn && (targetRank === '8' || targetRank === '1');

              const moveData: any = {
                from: nextPremove.sourceSquare as Square,
                to: targetSquare as Square,
              };

              // Only add promotion for actual promotion moves (auto-queen per spec)
              if (isPromotion) {
                moveData.promotion = "q";
              }

              const premoveResult = chessGame.move(moveData);

              if (premoveResult) {
                console.log("Premove executed successfully:", moveData);

                // Remove executed premove from queue
                premovesRef.current.shift();
                setPremoves([...premovesRef.current]);

                // Update board to actual position
                setChessPosition(chessGame.fen());
                updateMovesFromHistory();

                // If there are remaining premoves, recalculate preview; otherwise clear it
                if (premovesRef.current.length > 0) {
                  const newPreview = recalculatePreviewPosition(
                    chessGame.fen(),
                    premovesRef.current
                  );
                  setPreviewPosition(newPreview);
                } else {
                  setPreviewPosition(null);
                }

                // Send premove to server
                const gameId = getGameIdFromPath();
                if (gameId && newSocket) {
                  newSocket.emit("make-move", { gameId, move: moveData });
                }
              } else {
                // This shouldn't happen if foundMove exists, but handle it
                console.log("Premove execution failed unexpectedly");
                premovesRef.current.shift();
                setPremoves([...premovesRef.current]);
                animatePremovesBack();
                toast.error("Premove failed");
              }
            }
          } else {
            // PREMOVE IS ILLEGAL - discard it (per chess.com spec)
            console.log("Premove discarded: illegal in current position", {
              attempted: `${nextPremove.sourceSquare}->${nextPremove.targetSquare}`,
              legalFromSource: legalMoves
                .filter(m => m.from === nextPremove.sourceSquare)
                .map(m => `${m.from}->${m.to}`)
            });

            premovesRef.current.shift();
            setPremoves([...premovesRef.current]);
            animatePremovesBack();
            toast.info("Premove canceled - no longer legal");
            setPreviewPosition(null);
          }
        } else {
          // No premoves, clear preview to show opponent's move
          setPreviewPosition(null);
          setPremoves([]);
        }
      } catch (e) {
        console.error("Error applying opponent move", e);
        toast.error("Failed to apply opponent's move");
      }
    });

    newSocket.on("game-over", (data) => {
      console.log("Game Over:", data);
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
        // Fallback if backend doesn't send resignedPlayerId
        // This assumes the resign event is only sent to the opponent
        setGameResult({
          type: "win",
          message: "Opponent resigned! You win!",
        });
        toast.success("Opponent resigned! You win!");
      }
      setIsResultModalOpen(true);
    });

    newSocket.on("players-connected", (data) => {
      console.log("Players connected status:", data);
      if (data?.playersConnected) {
        toast.success("Both players connected");
      }
    });

    newSocket.on("error", (err) => {
      console.error("Server error:", err);
      toast.error(err.message || "Server error occurred");
    });

    newSocket.on("move-error", (err) => {
      console.error("Invalid move:", err);
      toast.error(err.message || "Invalid move");
    });

    newSocket.on("chat-message", (data) => {
      console.log("Chat message received:", data);
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

    setSocket(newSocket);

    return () => {
      console.log("Cleaning up socket");
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
  }, [playerId, username]); // Added dependencies

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
        console.log("Square click move rejected:", { from: moveFrom, to: square });
        toast.error("Invalid move");
        const hasMoveOptions = getMoveOptions(square as Square);
        setMoveFrom(hasMoveOptions ? square : "");
        return;
      }
    } catch (e) {
      console.log("Square click move error:", e, { from: moveFrom, to: square });
      toast.error("Invalid move");
      const hasMoveOptions = getMoveOptions(square as Square);
      setMoveFrom(hasMoveOptions ? square : "");
      return;
    }

    setMoveFrom("");
    setOptionSquares({});
  }

  // Helper to manually apply premove to FEN (bypassing chess.js validation)
  function applyPremoveToFen(fen: string, from: string, to: string, piece: PieceDropHandlerArgs['piece']): string | null {
    try {
      const [board, turn, castling, enPassant, halfMove, fullMove] = fen.split(' ');

      // Convert board string to 2D array
      const rows = board.split('/');
      const boardArray: (string | null)[][] = rows.map(row => {
        const squares: (string | null)[] = [];
        for (const char of row) {
          if (char >= '1' && char <= '8') {
            // Empty squares
            const count = parseInt(char);
            for (let i = 0; i < count; i++) squares.push(null);
          } else {
            // Piece
            squares.push(char);
          }
        }
        return squares;
      });

      // Convert square notation to array indices
      const fromFile = from.charCodeAt(0) - 97; // 'a' = 0, 'b' = 1, etc.
      const fromRank = 8 - parseInt(from[1]); // '8' = 0, '7' = 1, etc.
      const toFile = to.charCodeAt(0) - 97;
      const toRank = 8 - parseInt(to[1]);

      // Check if source square has the piece
      const pieceAtSource = boardArray[fromRank]?.[fromFile];
      if (!pieceAtSource) return null;

      // Move the piece
      boardArray[toRank][toFile] = pieceAtSource;
      boardArray[fromRank][fromFile] = null;

      // Convert back to FEN board string
      const newBoard = boardArray.map(row => {
        let rowStr = '';
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
      }).join('/');

      // Return new FEN with same turn (premove doesn't change turn)
      return `${newBoard} ${turn} ${castling} ${enPassant} ${halfMove} ${fullMove}`;
    } catch {
      return null;
    }
  }

  // Check if a move is pseudo-legal (follows piece movement rules, ignores check)
  function isPseudoLegal(from: string, to: string, piece: string, board: Chess): boolean {
    const fromSquare = from as Square;
    const toSquare = to as Square;

    console.log("isPseudoLegal called:", { from, to, piece });

    const pieceType = piece.toLowerCase().charAt(1); // 'p', 'n', 'b', 'r', 'q', 'k'
    const pieceColor = piece.charAt(0); // 'w' or 'b'

    console.log("Extracted:", { pieceType, pieceColor });

    const fromFile = from.charCodeAt(0) - 97; // a=0, b=1, etc.
    const fromRank = parseInt(from[1]) - 1; // 1=0, 2=1, etc.
    const toFile = to.charCodeAt(0) - 97;
    const toRank = parseInt(to[1]) - 1;

    const fileDiff = Math.abs(toFile - fromFile);
    const rankDiff = Math.abs(toRank - fromRank);
    const fileDir = toFile - fromFile;
    const rankDir = toRank - fromRank;

    const targetPiece = board.get(toSquare);
    const isCapture = targetPiece && targetPiece.color !== pieceColor;
    const isEmpty = !targetPiece;

    console.log("Move analysis:", {
      fromFile, fromRank, toFile, toRank,
      fileDiff, rankDiff, fileDir, rankDir,
      targetPiece: targetPiece?.type,
      isCapture, isEmpty
    });

    // Helper to check if path is clear for sliding pieces
    const isPathClear = (fromF: number, fromR: number, toF: number, toR: number): boolean => {
      const fStep = toF === fromF ? 0 : (toF > fromF ? 1 : -1);
      const rStep = toR === fromR ? 0 : (toR > fromR ? 1 : -1);

      let f = fromF + fStep;
      let r = fromR + rStep;

      while (f !== toF || r !== toR) {
        const sq = String.fromCharCode(97 + f) + (r + 1);
        if (board.get(sq as Square)) return false;
        f += fStep;
        r += rStep;
      }
      return true;
    };

    switch (pieceType) {
      case 'p': // Pawn
        const direction = pieceColor === 'w' ? 1 : -1;
        const startRank = pieceColor === 'w' ? 1 : 6;

        console.log("Pawn validation:", { direction, startRank, fileDir, rankDir });

        // Forward move (1 square)
        if (fileDir === 0 && rankDir === direction && isEmpty) {
          console.log("✅ Pawn: 1-square forward");
          return true;
        }

        // Forward move (2 squares from start)
        if (fileDir === 0 && rankDir === 2 * direction && fromRank === startRank && isEmpty) {
          const middleSquare = String.fromCharCode(97 + fromFile) + (fromRank + direction + 1);
          console.log("Checking 2-square forward, middle:", middleSquare);
          if (board.get(middleSquare as Square)) {
            console.log("❌ Pawn: path blocked");
            return false;
          }
          console.log("✅ Pawn: 2-square forward");
          return true;
        }

        // Diagonal capture
        if (fileDiff === 1 && rankDir === direction) {
          // Allow if there's a piece to capture OR if it's en-passant square shape
          // (en-passant legality checked at execution, but shape allowed now)
          if (isCapture) {
            console.log("✅ Pawn: diagonal capture");
            return true;
          }

          // Allow diagonal move to empty square (might be en-passant later)
          const epRank = pieceColor === 'w' ? 5 : 2; // 6th rank for white, 3rd for black
          if (toRank === epRank) {
            console.log("✅ Pawn: en-passant shape");
            return true;
          }

          console.log("❌ Pawn: diagonal to empty (not ep rank)");
          return false;
        }

        console.log("❌ Pawn: no rule matched");
        return false;

      case 'n': // Knight
        const isValidKnight = (fileDiff === 2 && rankDiff === 1) || (fileDiff === 1 && rankDiff === 2);
        console.log(isValidKnight ? "✅ Knight: valid L-shape" : "❌ Knight: invalid L-shape");
        return isValidKnight;

      case 'b': // Bishop
        if (fileDiff !== rankDiff) {
          console.log("❌ Bishop: not diagonal");
          return false;
        }
        const bishopClear = isPathClear(fromFile, fromRank, toFile, toRank);
        console.log(bishopClear ? "✅ Bishop: diagonal path clear" : "❌ Bishop: path blocked");
        return bishopClear;

      case 'r': // Rook
        if (fileDiff !== 0 && rankDiff !== 0) {
          console.log("❌ Rook: not straight");
          return false;
        }
        const rookClear = isPathClear(fromFile, fromRank, toFile, toRank);
        console.log(rookClear ? "✅ Rook: straight path clear" : "❌ Rook: path blocked");
        return rookClear;

      case 'q': // Queen
        if (fileDiff !== 0 && rankDiff !== 0 && fileDiff !== rankDiff) {
          console.log("❌ Queen: not straight or diagonal");
          return false;
        }
        const queenClear = isPathClear(fromFile, fromRank, toFile, toRank);
        console.log(queenClear ? "✅ Queen: path clear" : "❌ Queen: path blocked");
        return queenClear;

      case 'k': // King
        // Adjacent square
        if (fileDiff <= 1 && rankDiff <= 1 && (fileDiff + rankDiff > 0)) {
          console.log("✅ King: adjacent square");
          return true;
        }

        // Castling shape (king moves 2 squares horizontally)
        if (rankDiff === 0 && fileDiff === 2) {
          console.log("Checking castling...");
          // Check if pieces are in castling positions
          const isKingside = toFile > fromFile;
          const rookFile = isKingside ? 7 : 0;
          const rookSquare = String.fromCharCode(97 + rookFile) + (fromRank + 1);
          const rookPiece = board.get(rookSquare as Square);

          // Check rook exists
          if (!rookPiece || rookPiece.type !== 'r' || rookPiece.color !== pieceColor) {
            console.log("❌ King: castling - rook not in position");
            return false;
          }

          // Check path is clear
          const step = isKingside ? 1 : -1;
          for (let f = fromFile + step; f !== rookFile; f += step) {
            const sq = String.fromCharCode(97 + f) + (fromRank + 1);
            if (board.get(sq as Square)) {
              console.log("❌ King: castling - path blocked");
              return false;
            }
          }

          console.log("✅ King: castling shape valid");
          return true;
        }

        console.log("❌ King: move too far");
        return false;

      default:
        console.log("❌ Unknown piece type:", pieceType);
        return false;
    }
  }

  // Helper to recalculate preview position from remaining premoves
  function recalculatePreviewPosition(baseFen: string, remainingPremoves: PieceDropHandlerArgs[]): string | null {
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

  // Helper to smoothly animate premoves back when they become invalid
  function animatePremovesBack() {
    // Mark all premove squares as invalid for visual feedback
    const invalidSquares = premovesRef.current.flatMap(p => [p.sourceSquare, p.targetSquare]).filter((square): square is string => square !== null);
    setInvalidPremoveSquares(invalidSquares);

    // Start animation state
    setIsAnimatingPremoveBack(true);

    // Clear preview to trigger slide-back animation
    setPreviewPosition(null);

    // After animation completes (500ms for smooth slide), clear premoves and reset states
    setTimeout(() => {
      premovesRef.current = [];
      setPremoves([]);
      setInvalidPremoveSquares([]);
      setIsAnimatingPremoveBack(false);
    }, 500); // Increased from 200ms to 500ms for smoother, more visible animation
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
    if (isPlayerTurn && premovesRef.current.length > 0) {
      console.log("Clearing stale premoves - it's now player's turn");
      premovesRef.current = [];
      setPremoves([]);
      setPreviewPosition(null);
    }

    // Check if this is a premove (piece isn't the color of the current player's turn)
    const pieceColor = piece.pieceType[0]; // 'w' or 'b'

    console.log("Move attempt:", {
      from: sourceSquare,
      to: targetSquare,
      piece: piece.pieceType,
      currentTurn,
      playerColor,
      isPlayerTurn,
      pieceColor,
      isPremove: currentTurn !== pieceColor,
      hasPreview: !!previewPosition,
      premoveCount: premovesRef.current.length
    });

    if (currentTurn !== pieceColor) {
      // PREMOVE CREATION - opponent's turn, player is queuing moves
      // Only allow premoves for the player's own pieces
      const canPremove =
        (playerColor === "white" && pieceColor === "w") ||
        (playerColor === "black" && pieceColor === "b");

      if (!canPremove) {
        return false;
      }

      // PSEUDO-LEGAL VALIDATION AT CREATION TIME (per chess.com spec)
      // Check: piece movement rules, path clearance, pawn rules
      // Do NOT check: king safety, pins, future board state
      // Validation happens at EXECUTION time for full legality

      const currentFen = previewPosition || chessGame.fen();
      const testBoard = new Chess(currentFen);

      // 1. Piece must exist at source square
      const pieceAtSource = testBoard.get(sourceSquare as Square);

      if (!pieceAtSource) {
        console.log("Premove blocked: no piece at source square");
        toast.error("Invalid premove - no piece there");
        return false;
      }

      // 2. Piece must belong to player
      if (pieceAtSource.color !== pieceColor) {
        console.log("Premove blocked: wrong color piece");
        toast.error("Invalid premove - not your piece");
        return false;
      }

      // 3. Target square must not have player's own piece
      const targetPiece = testBoard.get(targetSquare as Square);
      if (targetPiece && targetPiece.color === pieceColor) {
        console.log("Premove blocked: can't capture own piece");
        toast.error("Invalid premove - can't capture own piece");
        return false;
      }

      // 4. PSEUDO-LEGAL CHECK: movement must follow piece rules
      if (!isPseudoLegal(sourceSquare, targetSquare, piece.pieceType, testBoard)) {
        console.log("Premove blocked: violates piece movement rules", {
          piece: piece.pieceType,
          from: sourceSquare,
          to: targetSquare
        });
        toast.error("Invalid premove - illegal piece movement");
        return false;
      }

      // Apply premove visually to preview
      const newFen = applyPremoveToFen(currentFen, sourceSquare, targetSquare, piece);

      if (!newFen) {
        console.log("Premove rejected: couldn't apply to FEN");
        return false;
      }

      console.log("✅ Premove accepted (pseudo-legal, will validate full legality at execution):", {
        from: sourceSquare,
        to: targetSquare,
        piece: piece.pieceType
      });

      // Add to premoves queue
      premovesRef.current.push({
        sourceSquare,
        targetSquare,
        piece
      });
      setPremoves([...premovesRef.current]);

      // Update preview to show the piece at new position
      setPreviewPosition(newFen);
      return true;
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
      console.log("Move rejected:", {
        from: sourceSquare,
        to: targetSquare,
        piece: piece.pieceType,
        possibleMoves: possiblemoves.map(m => `${m.from}-${m.to}`),
        currentFen: chessGame.fen()
      });
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

  // Clear premoves on right click with smooth animation
  function onSquareRightClick() {
    if (premovesRef.current.length > 0) {
      // Use the smooth animation function to slide pieces back
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

  // Handle resign
  async function handleResign() {
    const gameId = getGameIdFromPath();
    if (!gameId) return;

    // Only emit via WebSocket (backend socket handler will handle everything)
    if (socket && socket.connected) {
      socket.emit("resign", gameId);
    } else {
      toast.error("Not connected to game server");
    }
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
          console.error("Error replaying white move:", move.white, error);
        }
      }
      if (i === index && !move.black) break;
      if (move.black) {
        try {
          newGame.move(move.black);
        } catch (error) {
          console.error("Error replaying black move:", move.black, error);
        }
      }
    }
    chessGameRef.current = newGame;
    setChessPosition(newGame.fen());
    setCurrentMoveIndex(index);
  }

  // Combine option squares with premove highlights
  const combinedSquareStyles: Record<string, React.CSSProperties> = { ...optionSquares };

  // Add highlights for premoves with different colors for each (like chess.com)
  const premoveColors = [
    'rgba(255, 0, 0, 0.6)',     // Red for first premove
    'rgba(255, 100, 0, 0.6)',   // Orange for second
    'rgba(255, 170, 0, 0.6)',   // Yellow-orange for third
    'rgba(255, 200, 0, 0.6)',   // Yellow for fourth
  ];

  // If animating premove back (invalid), show red flash on affected squares
  if (isAnimatingPremoveBack) {
    for (const square of invalidPremoveSquares) {
      combinedSquareStyles[square] = {
        backgroundColor: 'rgba(255, 50, 50, 0.7)',
        boxShadow: '0 0 20px rgba(255, 0, 0, 0.8) inset',
        transition: 'all 0.5s ease-out'
      };
    }
  } else {
    // Normal premove highlights when not animating back
    for (let i = 0; i < premoves.length; i++) {
      const premove = premoves[i];
      if (premove.targetSquare) {
        const color = premoveColors[i % premoveColors.length];
        combinedSquareStyles[premove.targetSquare] = {
          backgroundColor: color
        };
      }
    }
  }

  // Create arrows for premoves with different colors
  const premoveArrows: [string, string | null, string][] = premoves.map((premove, i) => [
    premove.sourceSquare,
    premove.targetSquare,
    premoveColors[i % premoveColors.length]
  ]);

  const chessboardOptions = {
    position: previewPosition || chessPosition, // Use preview if premoves exist
    onPieceDrop,
    onSquareClick,
    onSquareRightClick,
    canDragPiece,
    boardOrientation: boardOrientation,
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
        <div className="flex gap-2">
          <Button
            size="small"
            variant="secondary"
            onClick={() => setIsChatOpen(!isChatOpen)}
          >
            Chat
          </Button>
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
            onClick={handleResign}
            className="px-2 py-1"
            disabled={gameStatus === "completed"}
          >
            Resign
          </Button>
        </div>
      </div>

      <div
        className="flex gap-2 justify-center items-start flex-col lg:flex-row relative"
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

        {/* RIGHT: SIDEBAR */}
        <div className="w-full lg:w-1/3 flex flex-col justify-between h-full px-4 lg:pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center p-1 sm:p-3 rounded-lg">
              <div className="flex justify-between items-center gap-2 sm:gap-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="sm:h-16 sm:w-16 h-12 w-12">
                    <Image
                      src={user?.avatar ?? "/avatar7.svg"}
                      alt="me"
                      width={20}
                      height={20}
                      className="rounded-full sm:h-16 sm:w-16 h-12 w-12"
                    />
                  </div>
                  <span>{username} <span className="text-gray-400 text-sm">(you)</span></span>
                </div>
                <span
                  className={`px-2 py-1 rounded transition-all duration-300 ${
                    isMyTurn
                      ? "bg-primary text-white font-bold shadow-lg shadow-primary/50 animate-pulse"
                      : "bg-zinc-900"
                  }`}
                >
                  08:05
                </span>
              </div>

              <div className="flex justify-center text-gray-400">vs</div>

              <div className="flex justify-between items-center sm:gap-4 gap-2">
                <span
                  className={`px-2 py-1 rounded transition-all duration-300 ${
                    !isMyTurn
                      ? "bg-primary text-white font-bold shadow-lg shadow-primary/50 animate-pulse"
                      : "bg-zinc-900"
                  }`}
                >
                  08:05
                </span>
                <div className="flex flex-col items-center gap-2">
                  <div className="sm:h-16 sm:w-16 h-12 w-12">
                    <Image
                      src={opponent?.avatar || "/avatar8.svg"}
                      alt="opponent"
                      width={20}
                      height={20}
                      className="rounded-full sm:h-16 sm:w-16 h-12 w-12"
                    />
                  </div>
                  <span>{opponent?.username || "Opponent"}</span>
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
    </div>
  );
}
