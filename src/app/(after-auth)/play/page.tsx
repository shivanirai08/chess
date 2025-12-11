"use client";

import { io, Socket } from "socket.io-client";
import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import GameSetup from "@/components/layout/GameSetup";
import MatchmakingStep from "@/components/layout/Matchmakingstep";
import { toast } from "sonner";
import Image from "next/image";
import Cookies from "js-cookie";
import { useUserStore } from "@/store/useUserStore";
import { getRandomAvatar, getAvatarUrl } from "@/utils/avatar";

function PlayPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [matchFound, setMatchFound] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [gameId, setGameId] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [timeControl, setTimeControl] = useState<string>("");
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [isStartingFromDashboard, setIsStartingFromDashboard] = useState(false);
  const [pendingMatchmaking, setPendingMatchmaking] = useState(false);
  const [isMatchmaking, setIsMatchmaking] = useState(false); // Add this state
  const { user: { username, avatar: userAvatar, elo: userElo }, setOpponent, opponent } = useUserStore();


  // Get token from cookies
  const getToken = () => {
    if (typeof window === "undefined") return null;
    try {
      return Cookies.get("auth-token") || null;
    } catch (e) {
      console.error("Error parsing user data:", e);
      return null;
    }
  };

  //Create socket connection when matchmaking starts
  useEffect(() => {
      const token = getToken();

      if (!token  ) {
        toast.error("You need to be logged in to play");
        router.push("/login");
        return;
      }
      const newSocket = io(`${process.env.NEXT_PUBLIC_WEBSOCKET_URL}`, {
        auth: { token },
        transports: ["websocket", "polling"], // Prefer WebSocket, fallback to polling
      });

      // Connection events
      newSocket.on("connect", () => {
        console.log("Socket connected:", newSocket.id);
        setSocket(newSocket);
        
        if (pendingMatchmaking) {
          console.log("Socket connected, triggering pending matchmaking");
          setPendingMatchmaking(false);
        }
      });

      newSocket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
        toast.error("Connection failed. Please try again.");
        setPendingMatchmaking(false);
      });

      newSocket.once('matchmaking-found', (data) => {
        console.log('Match found!', data.gameId);
        setGameId(data.gameId);
        setCountdown(5);
        setIsMatchmaking(false); // Stop matchmaking state
        console.log("Opponent data:", data.opponent);
        const opponentData = {
          ...data.opponent,
          elo: data.opponent?.elo ?? null,
          avatar: data.opponent?.avatar ? getAvatarUrl(data.opponent.avatar) : getAvatarUrl(getRandomAvatar())
        };
        const opponentElo = typeof data.opponent?.elo === "number" ? data.opponent.elo : undefined;
        setOpponent(opponentData);
        setMatchFound(true);
      });

      // Add listener for matchmaking timeout
      newSocket.on("matchmaking-timeout", (data) => {
        console.log("Matchmaking timeout received from server:", data);
        setIsMatchmaking(false);
        setShowTimeoutModal(true);
      });

      newSocket.on("error", (error: { message: string }) => {
        console.error("Socket error:", error);
        toast.error(error.message);
      });

      newSocket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
        if (reason === "io server disconnect") {
          // The server has forcefully disconnected
          toast.error("Disconnected from server");
        }
      });

      // Don't set socket here, set it in connect event
      // setSocket(newSocket);

      // Cleanup on unmount or step change
      return () => {
        console.log("Cleaning up socket");
        newSocket.off("connect");
        newSocket.off("connect_error");
        newSocket.off("matchmaking-found");
        newSocket.off("matchmaking-timeout"); // Add cleanup
        newSocket.off("error");
        newSocket.off("disconnect");
        newSocket.disconnect();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Countdown Timer
  useEffect(() => {
    if (matchFound && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
    if (countdown === 0 && gameId) {
      router.push(`/chess/${gameId}`);
    }
  }, [matchFound, countdown, router, gameId]);

  //Start matchmaking api call
  const startMatchmaking = async () => {
    if (!socket) {
      toast.error("Connection not established. Please try again.");
      return;
    }

    if (!socket.connected) {
      toast.error("Socket not connected. Please try again.");
      return;
    }

    if (!timeControl) {
      toast.error("Time control not selected. Please go back and select a time control.");
      return;
    }

    setIsMatchmaking(true); // Set matchmaking state

    try {
      const token = getToken();
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/game/matchmaking/join`,
        { timeControl },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.data;

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.gameId) {
        setGameId(data.gameId);
        setMatchFound(true);
        setIsMatchmaking(false);
        return;
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error("Matchmaking error:", error);
        toast.error("Failed to start matchmaking");
      }
      setIsMatchmaking(false);
    }
  };

  const next = async (selectedTimeControl?: string) => {
    if (step === 0 && selectedTimeControl) {
      setTimeControl(selectedTimeControl);
      setDirection("right");
      setStep(1);
    }
  };

  // Check for query parameters from dashboard shortcut
  useEffect(() => {
    const timeControlParam = searchParams.get("timeControl");
    const autoStart = searchParams.get("autoStart");

    if (timeControlParam && autoStart === "true") {
      console.log("Starting matchmaking from dashboard with time control:", timeControlParam);
      setTimeControl(timeControlParam);
      setIsStartingFromDashboard(true);
      setDirection("right");
      setStep(1);
      setPendingMatchmaking(true); // Mark that we need to start matchmaking once socket connects
      
      // Clean up URL
      router.replace("/play", { scroll: false });
    }
  }, [searchParams, router]);

  // Start matchmaking when socket is ready and conditions are met
  useEffect(() => {
    if (step === 1 && timeControl && socket?.connected) {
      console.log("Starting matchmaking with time control:", timeControl);
      startMatchmaking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, timeControl, socket?.connected]);

  const prev = () => {
    if (step > 0) {
      // Don't allow going back if started from dashboard
      if (isStartingFromDashboard && step === 1) {
        router.push("/dashboard");
        return;
      }
      setDirection("left");
      setStep(step - 1);
    }
  };

  const renderElo = (elo?: number | null) => (typeof elo === "number" ? `ELO ${elo}` : "ELO —");

  const variants = {
    enter: (dir: "left" | "right") => ({
      x: dir === "right" ? 100 : -100,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (dir: "left" | "right") => ({
      x: dir === "right" ? -100 : 100,
      opacity: 0,
    }),
  };

  return (
    <div className="relative h-screen flex flex-col items-center justify-center overflow-hidden text-white">
      {/* Top bar */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold">Chess</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={prev}
            disabled={step === 0}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30"
          >
            <ArrowLeft />
          </button>
          <button
            onClick={() => next()}
            disabled={step === 1 || !timeControl}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30"
          >
            <ArrowRight />
          </button>
        </div>
      </div>

      {/* Steps container */}
      <div className="relative z-10 w-full md:w-2xl flex justify-center items-center px-6">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.5 }}
            className="w-full"
          >
            {step === 0 && <GameSetup next={next} />}
            {step === 1 && (
              <MatchmakingStep onMatchFound={() => setMatchFound(true)} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Match found overlay */}
      {matchFound && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
          <div className="flex items-center gap-8">
            <div className="flex flex-col items-center">
              <Image
                src={opponent?.avatar || "/avatar8.svg"}
                alt="Opponent"
                width={80}
                height={80}
                className="rounded-full"
              />
              <p className="mt-2 text-xl font-semibold">{opponent?.username || "Opponent"}</p>
              <p className="text-sm text-gray-400">{renderElo((opponent?.elo ?? null) as number | null)}</p>
            </div>

            <span className="text-3xl font-bold">VS</span>

            <div className="flex flex-col items-center">
              <Image
                src={userAvatar || "/avatar1.svg"}
                alt="You"
                width={80}
                height={80}
                className="rounded-full"
              />
              <p className="mt-2 text-xl font-semibold">{username}</p>
              <p className="text-sm text-gray-400">{renderElo(userElo)}</p>
            </div>
          </div>

          {timeControl && (
            <p className="mt-4 text-lg text-gray-300">
              Time Control: {timeControl}
            </p>
          )}

          <p className="mt-10 text-4xl font-bold animate-pulse">
            Match starts in {countdown}...
          </p>
        </div>
      )}

      {/* Timeout modal */}
      {showTimeoutModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-xl p-8 max-w-md text-center">
            <h2 className="text-2xl font-bold mb-4">No Opponent Found</h2>
            <p className="text-gray-400 mb-6">
              We couldn&apos;t find an opponent with the selected time control ({timeControl}).
              Try selecting a different time control for better matchmaking.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowTimeoutModal(false);
                  setStep(0);
                }}
                className="flex-1 px-6 py-3 bg-primary text-black rounded-lg font-semibold hover:bg-primary/90 transition"
              >
                Choose Different Time
              </button>
              <button
                onClick={() => {
                  setShowTimeoutModal(false);
                  router.push("/dashboard");
                }}
                className="flex-1 px-6 py-3 bg-zinc-800 rounded-lg font-semibold hover:bg-zinc-700 transition"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={
      <div className="relative h-screen flex flex-col items-center justify-center overflow-hidden text-white">
        <div className="text-xl">Loading...</div>
      </div>
    }>
      <PlayPageContent />
    </Suspense>
  );
}
