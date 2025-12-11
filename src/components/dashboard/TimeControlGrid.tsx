"use client";

import { motion } from "framer-motion";
import { BulletIcon, BlitzIcon, RapidIcon } from "@/components/icons/TimeControlIcons";

interface TimeControl {
  time: string;
  icon: typeof BulletIcon | typeof BlitzIcon | typeof RapidIcon;
}

interface TimeControlGridProps {
  onSelect: (timeControl: string) => void;
}

const timeControls: TimeControl[] = [
  { time: "1 min", icon: BulletIcon },
  { time: "1|1", icon: BulletIcon },
  { time: "2|1", icon: BulletIcon },
  { time: "3 min", icon: BlitzIcon },
  { time: "3|2", icon: BlitzIcon },
  { time: "5 min", icon: BlitzIcon },
  { time: "10 min", icon: RapidIcon },
  { time: "15|10", icon: RapidIcon },
  { time: "30 min", icon: RapidIcon },
];

export function TimeControlGrid({ onSelect }: TimeControlGridProps) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-4">
      {timeControls.map((control, index) => (
        <motion.button
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 + index * 0.05 }}
          onClick={() => onSelect(control.time)}
          className="h-14 bg-white/5 backdrop-blur-xs rounded-lg hover:bg-white/10 transition-all duration-200 flex flex-col items-center justify-center gap-1 relative overflow-hidden cursor-pointer hover:border hover:border-primary group"
        >
          <div className="absolute -top-1 -right-1 sm:-right-2 opacity-10 pointer-events-none transition-all duration-200">
            <control.icon
              size={64}
              className="text-[#5d5a5a] group-hover:text-primary transition-colors duration-200"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{control.time}</span>
          </div>
        </motion.button>
      ))}
    </div>
  );
}
