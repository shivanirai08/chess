"use client";

import { motion } from "framer-motion";
import { Trophy, X, CircleEqual } from "lucide-react";
import { toast } from "sonner";

interface GameCardProps {
  game: {
    gameId: string;
    username: string;
    rating: number | null;
    playerColor: "white" | "black";
    result: string;
    moves: number;
    date: string;
  };
  index: number;
  delay?: number;
}

export function GameCard({ game, index, delay = 0.3 }: GameCardProps) {
  const getResultIcon = () => {
    if (game.result === "win") {
      return <Trophy size={18} className="text-[#10b981]" />;
    } else if (game.result === "loss") {
      return <X size={18} className="text-[#ef4444]" />;
    } else {
      return <CircleEqual size={18} className="text-[#a0a0a0]" />;
    }
  };

  const getBorderColor = () => {
    if (game.result === "win") return "border-[#10b981] hover:bg-[#1a3a2a]";
    if (game.result === "loss") return "border-[#ef4444] hover:bg-[#3a1a1a]";
    return "hover:bg-[#2a2a2a]";
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: delay + index * 0.05 }}
      className={`rounded-lg py-3 px-3 flex items-center justify-between cursor-pointer transition-all duration-200 border ${getBorderColor()}`}
      onClick={() => toast.info("Game review coming soon...")}
    >
      <div className="flex items-center gap-3">
        {getResultIcon()}
        <div className="flex flex-col">
          <span className="text-sm font-bold">{game.username}</span>
          <span className="text-xs text-[#a0a0a0]">
            {game.playerColor} • {game.moves} moves
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end">
        <span className="text-xs capitalize font-medium">{game.result}</span>
        <span className="text-[10px] text-[#a0a0a0]">{game.date}</span>
      </div>
    </motion.div>
  );
}
