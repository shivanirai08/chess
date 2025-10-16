"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";
import GameSetup from "@/components/layout/GameSetup";
import MatchmakingStep from "@/components/layout/Matchmakingstep";
import Button from "@/components/ui/Button";
import { toast } from "sonner";

export default function PlayPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [matchFound, setMatchFound] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [gameId, setGameId] = useState<string | null>(null);
  const [loadingMatch, setLoadingMatch] = useState(false);

  useEffect(() => {
    if (matchFound && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (countdown === 0 && gameId) {
      router.push(`/chess?gameId=${gameId}`);
    }
  }, [matchFound, countdown, router, gameId]);

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

  //matchmaking
  const startMatchmaking = async () => {
  }
 

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
            {step === 1 && <MatchmakingStep onMatchFound={() => setMatchFound(true)} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Match found overlay */}
      {matchFound && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
          <div className="flex items-center gap-8">
            <div className="flex flex-col items-center">
              <img
                src="/avatar7.svg"
                alt="You"
                width={80}
                height={80}
                className="rounded-full"
              />
              <p className="mt-2 text-xl font-semibold">You</p>
            </div>

            <span className="text-3xl font-bold">VS</span>

            <div className="flex flex-col items-center">
              <img
                src="/avatar8.svg"
                alt="Opponent"
                width={80}
                height={80}
                className="rounded-full"
              />
              <p className="mt-2 text-xl font-semibold">Opponent</p>
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
