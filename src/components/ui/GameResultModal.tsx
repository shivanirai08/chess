"use client";

import { useRouter } from "next/navigation";
import { X} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import { useState } from "react";

type GameResult = "win" | "loss" | "draw" | "abandoned";

interface GameResultModalProps {
  isOpen: boolean;
  result: GameResult;
  message: string;
  onClose: () => void;
  isGuest?: boolean;
}

export default function GameResultModal({
  isOpen,
  result,
  message,
  onClose,
  isGuest = false,
}: GameResultModalProps) {
  const router = useRouter();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const getAccent = () => {
    switch (result) {
      case "win":
        return { color: "text-emerald-400", glow: "from-emerald-500/30" };
      case "loss":
        return { color: "text-red-400", glow: "from-red-500/30" };
      case "draw":
        return { color: "text-blue-400", glow: "from-blue-500/30" };
      case "abandoned":
        return { color: "text-orange-400", glow: "from-orange-500/30" };
      default:
        return { color: "text-slate-400", glow: "from-slate-400/30" };
    }
  };

  const accent = getAccent();

  const getTitle = () => {
    switch (result) {
      case "win":
        return "Victory";
      case "loss":
        return "Defeat";
      case "draw":
        return "Draw";
      case "abandoned":
        return "Game Abandoned";
      default:
        return "Game Over";
    }
  };

  const handleBack = () => {
    onClose();
    if (isGuest) {
      router.push("/onboarding");
    } else {
      router.push("/dashboard");
    }
  };

  const handleReview = () => {
    if (isGuest) {
      setShowLoginPrompt(true);
    } else {
      onClose();
      // Stay on the page to review the game
    }
  };

  const handleLogin = () => {
    router.push("/login");
  };

  const handleSignup = () => {
    router.push("/signup");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          {/* Background Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gradient-to-b from-[#050510]/90 via-[#0a0a18]/90 to-[#050510]/90 backdrop-blur-md pointer-events-auto"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 180, damping: 18 }}
            className="relative z-10 w-full max-w-md pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Outer Glow */}
            <div
              className={`relative rounded-3xl p-[2px] bg-gradient-to-br ${accent.glow} via-transparent to-transparent`}
            >
              {/* Inner Glass Card */}
              <div className="relative bg-[#0b0f1a]/80 backdrop-blur-sm border border-white/10 rounded-3xl p-8 shadow-[0_0_40px_rgba(0,0,0,0.6)]">
                {/* Decorative glow orb */}
                <div
                  className={`absolute -top-24 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-gradient-to-b ${accent.glow} via-transparent to-transparent opacity-25 blur-3xl pointer-events-none`}
                ></div>

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-white/50 hover:text-white transition"
                >
                  <X className="w-6 h-6" />
                </button>


                {/* Title */}
                <h2
                  className={`text-4xl font-semibold text-center mb-3 ${accent.color} tracking-wide`}
                >
                  {getTitle()}
                </h2>

                {/* Message */}
                <p className="text-center text-gray-300 text-lg leading-relaxed">
                  {message}
                </p>

                {/* Login Prompt for Guests */}
                {showLoginPrompt && isGuest && (
                  <div className="mt-6 p-4 bg-zinc-900/50 rounded-lg border border-white/10 relative z-10">
                    <p className="text-sm text-gray-300 mb-4 text-center">
                      Sign up or log in to access full game review, save your games, and track your progress!
                    </p>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleSignup}
                        variant="primary"
                        className="flex-1"
                      >
                        Sign Up
                      </Button>
                      <Button
                        onClick={handleLogin}
                        variant="secondary"
                        className="flex-1"
                      >
                        Log In
                      </Button>
                    </div>
                  </div>
                )}

                {/* Buttons */}
                {!showLoginPrompt && (
                  <div className="mt-8 flex gap-4 relative z-10">
                    <Button
                      onClick={handleBack}
                      variant="primary"
                    >
                      {isGuest ? "Play Another Match" : "Back to Dashboard"}
                    </Button>
                    <Button
                      onClick={handleReview}
                      variant="secondary"
                    >
                      Review Game
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
