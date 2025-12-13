"use client";

import { motion } from "framer-motion";
import { TbTargetArrow } from "react-icons/tb";
import { FaChess, FaFire } from "react-icons/fa";

interface KeyMetricsSectionProps {
  elo: number;
  gamesCount: number;
  currentStreak: number;
  longestStreak: number;
  type: 'win'| 'loss' | 'draw' | null | undefined;
}

export function KeyMetricsSection({
  elo,
  gamesCount,
  currentStreak,
  longestStreak,
  type
}: KeyMetricsSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="rounded-xl"
    >
      <div className="grid grid-cols-3 gap-3 mb-2">
        {/* ELO */}
        <div className="bg-white/5 backdrop-blur-xs rounded-lg p-3 sm:p-4 flex flex-col items-end justify-center gap-1 sm:gap-2 h-20 relative overflow-hidden">
          <TbTargetArrow
            size={90}
            className="text-[#a855f7] opacity-30 sm:opacity-50 absolute -top-1 -left-2 -z-1"
          />
          <span className="text-4xl font-bold">{elo}</span>
          <span className="text-xs text-gray-200 sm:text-sm">ELO</span>
        </div>

        {/* Games */}
        <div className="bg-white/5 backdrop-blur-xs rounded-lg p-3 sm:p-4 flex flex-col items-end justify-center gap-1 sm:gap-2 relative h-20 overflow-hidden">
          <FaChess
            size={80}
            className="text-primary opacity-30 sm:opacity-50 absolute top-0 left-0 -z-1"
          />
          <span className="text-4xl font-bold">{gamesCount}</span>
          <span className="text-xs text-gray-200 sm:text-sm">Games</span>
        </div>

        {/* Streak */}
        <div className="bg-white/5 backdrop-blur-xs rounded-lg p-3 sm:p-4 flex flex-col items-end justify-center gap-1 h-20 relative overflow-hidden">
          <FaFire
            size={80}
            className={`${ type === "win" ? "text-green-500" : type === "loss" ? "text-red-500" : "text-gray-500" }  opacity-30 sm:opacity-50 absolute -top-0 -left-2 -z-1`}
          />
          <span className="text-4xl font-bold">{longestStreak}</span>
          <span className="text-xs text-gray-200 sm:text-sm">
            {/* Longest: {longestStreak} */}
            {type ? `Longest ${type.charAt(0).toUpperCase() + type.slice(1)} Streak` : 'Longest Streak'}
          </span>
        </div>
      </div>
    </motion.section>
  );
}
