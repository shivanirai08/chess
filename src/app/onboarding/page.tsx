"use client";

import { useState, useEffect, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import MatchmakingStep from "@/components/layout/Matchmakingstep";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";
import GameSetup from "@/components/layout/GameSetup";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import axios from "axios";

export default function Onboarding() {
  const router = useRouter();
  const { setUser, user, setOpponent, opponent, clearUser } = useUserStore();
  const [gameId, setGameId] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("/avatar7.svg");
  const [matchFound, setMatchFound] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [socketConnected, setSocketConnected] = useState(false);
  const avatars = [
    "/avatar1.svg",
    "/avatar2.svg",
    "/avatar3.svg",
    "/avatar4.svg",
    "/avatar5.svg",
    "/avatar6.svg",
  ];

  useEffect(() => {
    setUser({ username: "You", avatar: "/avatar7.svg", guestId: null });
  }, []);

  // Reset state when component mounts (coming back from game)
  useEffect(() => {
    console.log("Onboarding component mounted - resetting state");
    setMatchFound(false);
    setCountdown(5);
    setGameId(null);
    setStep(0);
    setSocketConnected(false);
    // Clear any existing socket connection
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  }, []);

  //**websocket connection**
  useEffect(() => {

      if(!user.guestId) {
        setSocketConnected(false);
        return;
      }
      console.log("Guest ID:", user.guestId);

      const newSocket = io(`${process.env.NEXT_PUBLIC_WEBSOCKET_URL}`, {
        auth : { guestId : user.guestId },
        transports: ["websocket", "polling"], // Prefer WebSocket, fallback to polling
      });

      // Connection events
      newSocket.on("connect", () => {
        console.log("Socket connected:", newSocket.id);
        setSocketConnected(true);
        toast.success("Connected to game server");
      });

      newSocket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
        setSocketConnected(false);
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
        setSocketConnected(false);
        if (reason === "io server disconnect") {
          // The server has forcefully disconnected
          toast.error("Disconnected from server");
        }
      });

      setSocket(newSocket);

      // Cleanup on unmount or step change
      return () => {
        console.log("Cleaning up socket");
        setSocketConnected(false);
        newSocket.off("connect");
        newSocket.off("connect_error");
        newSocket.off("matchmaking-found");
        newSocket.off("error");
        newSocket.off("disconnect");
        newSocket.disconnect();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, user.guestId]);

  // **Matchmaking-guest API call**
  const matchmaking = async () => {
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/game/matchmaking/join-guest`, {
        guestName: name,
      });
      const data = await response.data;
      clearUser();
      setUser({ username: name || "You", avatar, guestId: data.guestId });
      // Advance to step 3 immediately
      setStep(3);
    } catch (error) {
      console.error("Error fetching guest ID:", error);
      toast.error("Failed to start matchmaking");
    }
  };

  // Countdown Timer
  useEffect(() => {
    if (matchFound && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (countdown === 0 && gameId) {
      router.push(`/chess/${gameId}`);
    } else if (countdown === 0 && !gameId) {
      console.error("Countdown finished but no gameId!");
      toast.error("Failed to start game - no game ID");
      setMatchFound(false);
      setCountdown(5);
    }
  }, [matchFound, countdown, router, gameId]);

  // Question Navigation
  const next = () => {
    if (step < 3) {
      setDirection("right");
      setStep(step + 1);
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
    <div
      className="relative h-screen flex flex-col items-center justify-center overflow-hidden">

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
            disabled={step === 3}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30"
          >
            <ArrowRight />
          </button>
        </div>
      </div>

      {/* Question card */}
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
            {step === 0 && (
              <div className="flex flex-col items-center w-full">
                <p className="text-3xl md:text-4xl font-gveher font-bold mb-6 text-center">
                  {/* What&apos;s your name? */}
                  What should we call you ?
                </p>
                <div className="space-y-6 w-full md:w-md">
                  <Input
                    label="Your Name"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={true}
                  />
                  <Button
                    onClick={next}
                    disabled={!name.trim().length}
                    type="submit"
                    variant="primary"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
            {step === 1 && (
              <div className="flex flex-col items-center w-full">
                <p className="text-3xl md:text-4xl font-gveher font-bold mb-8 text-center">
                  Choose your Avatar
                </p>
                <div className="space-y-6 w-full flex flex-col items-center">
                  <div className="flex gap-4 flex-wrap justify-center mb-8">
                    {avatars.map((avatarImg, id) => {
                      return (
                        <Image
                          key={id}
                          src={avatarImg}
                          width={20}
                          height={20}
                          alt=""
                          className={`h-20 w-20 rounded-full bg-gray-800 cursor-pointer hover:ring-1 hover:ring-primary hover:scale-90 ease-in-out transform transition-all object-cover
                  ${avatar === avatarImg ? "ring-3 ring-primary" : ""}`}
                          onClick={() => setAvatar(avatarImg)}
                        ></Image>
                      );
                    })}
                  </div>
                  <Button
                    onClick={next}
                    disabled={!name.trim().length}
                    type="submit"
                    variant="primary"
                    className="md:w-md w-full"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
            {step === 2 && (
              <GameSetup next={matchmaking}  />
            )}

            {step === 3 && (
              <MatchmakingStep onMatchFound={() => setMatchFound(true)} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Player Found */}
      {matchFound && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm backdrop-filter flex flex-col items-center justify-center z-50">
          <div className="flex items-center gap-8">
            {/* You */}
            <div className="flex flex-col items-center">
              <Image
                src={avatar}
                alt="You"
                width={80}
                height={80}
                className="rounded-full"
              />
              <p className="mt-2 text-xl font-semibold">{name || "You"}</p>
            </div>

            <span className="text-3xl font-bold">VS</span>

            {/* Opponent */}
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

          {/* Countdown */}
          <p className="mt-10 text-4xl font-bold animate-pulse">
            Match starts in {countdown}...
          </p>
        </div>
      )}
    </div>
  );
}
