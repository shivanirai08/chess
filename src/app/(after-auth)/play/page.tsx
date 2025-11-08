"use client";

import { io, Socket } from "socket.io-client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";
import GameSetup from "@/components/layout/GameSetup";
import MatchmakingStep from "@/components/layout/Matchmakingstep";
import { toast } from "sonner";
import Image from "next/image";
import Cookies from "js-cookie";
import { useUserStore } from "@/store/useUserStore";

export default function PlayPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [matchFound, setMatchFound] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [gameId, setGameId] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const { user: { username } , setOpponent, opponent } = useUserStore();


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

  // Create socket connection when matchmaking starts
  useEffect(() => {
      const token = getToken();

      if (!token  ) {
        toast.error("You need to be logged in to play");
        router.push("/login");
        return;
      }
      const newSocket = io(`${process.env.NEXT_PUBLIC_WEBSOCKET_URL}`, {
        auth: { token },
      });

      // Connection events
      newSocket.on("connect", () => {
        console.log("Socket connected:", newSocket.id);
        toast.success("Connected to game server");
      });

      newSocket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
        toast.error(`Connection error: ${error.message}`);
      });

      // Game events
      newSocket.on('matchmaking-found', (data) => {
        console.log('Match found!', data.gameId);
        setGameId(data.gameId);
        console.log("Opponent data:", data.opponent);
        setOpponent(data.opponent);
        setMatchFound(true);
        toast.success("Match found!");
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

      setSocket(newSocket);

      // Cleanup on unmount or step change
      return () => {
        console.log("Cleaning up socket");
        newSocket.off("connect");
        newSocket.off("connect_error");
        newSocket.off("matchmaking-found");
        newSocket.off("error");
        newSocket.off("disconnect");
        newSocket.disconnect();
      };
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

  // Start matchmaking api call
  const startMatchmaking = async () => {
    if (!socket) {
      toast.error("Connection not established. Please try again.");
      return;
    }

    if (!socket.connected) {
      toast.error("Socket not connected. Please try again.");
      return;
    }

    try {
      // First check matchmaking status through API
      const token = getToken();
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/game/matchmaking/join`,
        {},
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

      // If direct match is found, use it
      if (data.gameId) {
        setGameId(data.gameId);
        setMatchFound(true);
        return;
      }
      toast.success("Searching for opponent...");
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        console.error("Matchmaking error:", error);
        toast.error(error.message || "Failed to start matchmaking");
      }
    }
  };

  const next = async () => {
    if (step === 0) {
      setDirection("right");
      setStep(1);
      await startMatchmaking();
    }
  };

  const prev = () => {
    if (step > 0) {
      setDirection("left");
      setStep(step - 1);
    }
  };

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
            onClick={next}
            disabled={step === 1}
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
                src="/avatar7.svg"
                alt="You"
                width={80}
                height={80}
                className="rounded-full"
              />
              <p className="mt-2 text-xl font-semibold">{username}</p>
            </div>

            <span className="text-3xl font-bold">VS</span>

            <div className="flex flex-col items-center">
              <Image
                src="/avatar8.svg"
                alt="Opponent"
                width={80}
                height={80}
                className="rounded-full"
              />
              <p className="mt-2 text-xl font-semibold">{opponent?.username || "Opponent"}</p>
            </div>
          </div>

          <p className="mt-10 text-4xl font-bold animate-pulse">
            Match starts in {countdown}...
          </p>
        </div>
      )}
    </div>
  );
}
