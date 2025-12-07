"use client";

import { motion } from "framer-motion";
import { IconType } from "react-icons";

interface StatsCardProps {
  icon: IconType;
  iconSize?: number;
  iconColor: string;
  iconOpacity?: string;
  iconPosition?: string;
  value: number | string;
  label: string;
  delay?: number;
}

export function StatsCard({
  icon: Icon,
  iconSize = 80,
  iconColor,
  iconOpacity = "opacity-50",
  iconPosition = "-top-1 -left-2",
  value,
  label,
  delay = 0
}: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
      className="bg-white/5 backdrop-blur-xs rounded-lg p-3 sm:p-4 flex flex-col items-end justify-center gap-1 sm:gap-2 h-20 relative overflow-hidden"
    >
      <Icon 
        size={iconSize} 
        className={`${iconColor} ${iconOpacity} absolute ${iconPosition} -z-1`}
      />
      <span className="text-2xl sm:text-3xl lg:text-4xl font-bold z-10">{value}</span>
      <span className="text-xs sm:text-sm text-[#a0a0a0] z-10">{label}</span>
    </motion.div>
  );
}
