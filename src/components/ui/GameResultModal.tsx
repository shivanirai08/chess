"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
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

  const getResultColor = () => {
    switch (result) {
      case "win":
        return "text-emerald-400";
      case "loss":
        return "text-red-400";
      case "draw":
        return "text-blue-400";
      case "abandoned":
        return "text-orange-400";
      default:
        return "text-slate-400";
    }
  };

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900/95 rounded-lg p-6 max-w-md w-full border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.6)] relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <h2 className={`text-3xl font-bold text-center mb-3 pr-8 ${getResultColor()}`}>
          {getTitle()}
        </h2>

        {/* Message */}
        <p className="text-center text-gray-300 mb-6">
          {message}
        </p>

        {/* Login Prompt for Guests */}
        {showLoginPrompt && isGuest && (
          <div className="mb-6 p-4 bg-zinc-800/50 rounded-lg border border-white/10">
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
          <div className="flex gap-3">
            <Button
              onClick={handleBack}
              variant="primary"
              className="flex-1"
            >
              {isGuest ? "Play Another Match" : "Back to Dashboard"}
            </Button>
            <Button
              onClick={handleReview}
              variant="secondary"
              className="flex-1"
            >
              Review Game
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
