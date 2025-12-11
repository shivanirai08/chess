"use client";

import { motion } from "framer-motion";

interface PerformanceCardProps {
  type: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  played: number;
  wins: number;
  winRate: number;
  color: string;
  index: number;
}

export function PerformanceCard({
  type,
  icon: Icon,
  played,
  wins,
  winRate,
  color,
  index
}: PerformanceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.2 + index * 0.05 }}
      className="bg-white/5 backdrop-blur-xs rounded-lg p-3 sm:p-4 transition-all duration-300 relative overflow-hidden"
    >
      <div className="flex items-center gap-2 mb-2 sm:mb-3">
        <Icon size={16} style={{ color }} />
        <span className="text-sm sm:text-base font-medium">{type}</span>
      </div>

      <div className="flex items-end justify-between mb-2">
        <div className="flex flex-col">
          <span className="text-[10px] sm:text-xs text-[#a0a0a0]">Played</span>
          <span className="text-lg sm:text-xl font-bold" style={{ color }}>
            {played}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] sm:text-xs text-[#a0a0a0]">Wins</span>
          <span className="text-sm sm:text-base text-[#a0a0a0]">{wins}</span>
        </div>
      </div>

      <div className="h-1 bg-[#1a1a1a] rounded-full overflow-visible relative group cursor-pointer">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${winRate}%` }}
          transition={{ duration: 1, delay: 0.4 + index * 0.1, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(to right, ${color}, ${color}dd)`,
          }}
        />
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none z-10">
          Win Rate: {winRate}%
        </div>
      </div>
    </motion.div>
  );
}
