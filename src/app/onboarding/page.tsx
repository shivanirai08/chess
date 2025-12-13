"use client";

import { useState, useEffect } from "react";
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
import { getRandomAvatar, getAvatarUrl } from "@/utils/avatar";

export default function Onboarding() {
  const router = useRouter();
  const { setUser, user, setOpponent, opponent, clearUser } = useUserStore();
  const [gameId, setGameId] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [name, setName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("guestName") || "";
    }
    return "ab";
  });
  const [avatar, setAvatar] = useState(() => {
    if (typeof window !== "undefined") {
      const storedAvatar = localStorage.getItem("guestAvatar");
      return storedAvatar || getAvatarUrl(getRandomAvatar());
    }
    return getAvatarUrl(getRandomAvatar());
  });
  const [matchFound, setMatchFound] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [socketConnected, setSocketConnected] = useState(false);
  const [connectingSocket, setConnectingSocket] = useState(false);
  const [timeControl, setTimeControl] = useState<string>("");
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const avatars = [
    "/avatar1.svg",
    "/avatar2.svg",
    "/avatar3.svg",
    "/avatar4.svg",
    "/avatar5.svg",
    "/avatar6.svg",
    "/avatar7.svg",
    "/avatar8.svg",
  ];

  useEffect(() => {
    setUser({ username: "You", avatar: "/avatar7.svg", guestId: null });
  }, [setUser]);

  useEffect(() => {
    setMatchFound(false);
    setCountdown(5);
    setGameId(null);
    setStep(0);
    setSocketConnected(false);
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const connectSocket = (guestId: string) => {
    setConnectingSocket(true);

    const newSocket = io(`${process.env.NEXT_PUBLIC_WEBSOCKET_URL}`, {
      auth: { guestId },
      transports: ["websocket", "polling"],
    });

    newSocket.on("connect", () => {
      setSocketId(newSocket.id ?? null);
      setSocketConnected(true);
      setConnectingSocket(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setSocketConnected(false);
      setConnectingSocket(false);
      toast.error("Connection failed. Please try again.");
    });

    newSocket.on('matchmaking-found', (data) => {
      setGameId(data.gameId);
      const opponentData = {
        ...data.opponent,
        elo: data.opponent?.elo ?? null,
        avatar: data.opponent.avatar ? getAvatarUrl(data.opponent.avatar) : getAvatarUrl(getRandomAvatar())
      };
      setOpponent(opponentData);
      setMatchFound(true);
    });

    // Add listener for matchmaking timeout
    newSocket.on("matchmaking-timeout", (data) => {
      console.log("Matchmaking timeout received from server:", data);
      setIsMatchmaking(false);
      setShowTimeoutModal(true);
      setConnectingSocket(false);
      // Remove local countdown timer logic
    });

    newSocket.on("error", (error: { message: string }) => {
      console.error("Socket error:", error);
      toast.error(error.message);
    });

    newSocket.on("disconnect", (reason) => {
      setSocketConnected(false);
      if (reason === "io server disconnect") {
        toast.error("Disconnected from server");
      }
    });

    setSocket(newSocket);
  };

  const handleAvatarNext = async () => {
    try {
      // Extract just the filename (e.g., "avatar1.svg" from "/avatar1.svg")
      const avatarFilename = avatar.startsWith('/') ? avatar.substring(1) : avatar;

      const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/game/guest/register`, {
        guestName: name,
        avatar: avatarFilename,
      });
      const { guestId } = response.data;

      clearUser();
      setUser({ username: name || "You", avatar, guestId });

      connectSocket(guestId);

      next();
    } catch (error) {
      console.error("Guest registration error:", error);
      toast.error("Failed to register. Please try again.");
    }
  };

  const matchmaking = async () => {
    if (!socketConnected || !socketId) {
      toast.error("Please wait for connection to game server...");
      return;
    }

    if (!user.guestId) {
      toast.error("Guest ID not found. Please go back and try again.");
      return;
    }

    if (!timeControl) {
      toast.error("Time control not selected. Please go back and select a time control.");
      return;
    }

    try {
      // Extract just the filename (e.g., "avatar1.svg" from "/avatar1.svg")
      const avatarFilename = avatar.startsWith('/') ? avatar.substring(1) : avatar;

      await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/game/matchmaking/join-guest`, {
        guestId: user.guestId,
        socketId: socketId,
        guestName: name,
        avatar: avatarFilename,
        timeControl,
      });

      setStep(3);
    } catch (error) {
      console.error("Matchmaking error:", error);
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        toast.error(error.response.data.message || "Socket not connected");
      } else {
        toast.error("Failed to start matchmaking");
      }
    }
  };

  // Start matchmaking when step changes to 3 and timeControl is set
  useEffect(() => {
    if (step === 3 && timeControl && socketConnected && !matchFound) {
      matchmaking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, timeControl, socketConnected]);

  // Track waiting time and show timeout modal after 3 minutes
  useEffect(() => {
    if (step === 3 && !matchFound) {
      let waitingTime = 0;
      const interval = setInterval(() => {
        waitingTime += 1;
        if (waitingTime >= 180) { // 3 minutes = 180 seconds
          clearInterval(interval);
          setShowTimeoutModal(true);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [step, matchFound]);

  useEffect(() => {
    if (matchFound && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (countdown === 0 && gameId) {
      router.push(`/chess/${gameId}`);
    } else if (countdown === 0 && !gameId) {
      toast.error("Failed to start game - no game ID");
      setMatchFound(false);
      setCountdown(5);
    }
  }, [matchFound, countdown, router, gameId]);

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
          <button onClick={() => router.push("/")} className="text-2xl font-bold hover:text-primary transition-colors">
            Chess
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={prev}
            disabled={step === 0}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
          >
            <ArrowLeft />
          </button>
          <button
            onClick={next}
            disabled={
              step === 3 ||
              (step === 0 && name.trim().length === 0) ||
              (step === 1 && (name.trim().length === 0 || connectingSocket))
            }
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
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
                  What should we call you ?
                </p>
                <div className="space-y-6 w-full md:w-md">
                  <Input
                    label="Your Name"
                    id="name"
                    value={name}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setName(newName);
                      localStorage.setItem("guestName", newName);
                    }}
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
                          onClick={() => {
                            setAvatar(avatarImg);
                            localStorage.setItem("guestAvatar", avatarImg);
                          }}
                        ></Image>
                      );
                    })}
                  </div>
                  <Button
                    onClick={handleAvatarNext}
                    disabled={!name.trim().length || connectingSocket}
                    type="submit"
                    variant="primary"
                    className="md:w-md w-full"
                  >
                    {connectingSocket ? "Connecting..." : "Next"}
                  </Button>
                  {connectingSocket && (
                    <p className="text-sm text-gray-400">Connecting to game server...</p>
                  )}
                  {socketConnected && (
                    <p className="text-sm text-green-400">✓ Connected to game server</p>
                  )}
                </div>
              </div>
            )}
            {step === 2 && (
              <GameSetup next={(selectedTimeControl: string) => {
                setTimeControl(selectedTimeControl);
                setStep(3);
              }}  />
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
                src={opponent?.avatar || "/avatar8.svg"}
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
                  setStep(2);
                }}
                className="flex-1 px-6 py-3 bg-primary text-black rounded-lg font-semibold hover:bg-primary/90 transition"
              >
                Choose Different Time
              </button>
              <button
                onClick={() => {
                  setShowTimeoutModal(false);
                  router.push("/");
                }}
                className="flex-1 px-6 py-3 bg-zinc-800 rounded-lg font-semibold hover:bg-zinc-700 transition"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
