"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Cpu, Users, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import Button from "@/components/ui/Button";

interface ComputerGameSetupProps {
  onStart: (config: GameConfig) => void;
  onCancel: () => void;
}

export interface GameConfig {
  side: "white" | "black" | "random";
  difficulty: number; // 0-20 for Stockfish skill level
  timeControl: "unlimited" | "10min" | "5min" | "3min";
}

const difficultyLevels = [
  { value: 1, label: "Beginner", elo: "400", description: "Perfect for learning", color: "#10b981" },
  { value: 5, label: "Casual", elo: "800", description: "Easy opponent", color: "#22c55e" },
  { value: 8, label: "Intermediate", elo: "1200", description: "Moderate challenge", color: "#3b82f6" },
  { value: 12, label: "Advanced", elo: "1600", description: "Strong player", color: "#f59e0b" },
  { value: 16, label: "Expert", elo: "2000", description: "Very difficult", color: "#ef4444" },
  { value: 20, label: "Master", elo: "2400+", description: "Maximum strength", color: "#a855f7" },
];

export default function ComputerGameSetup({ onStart, onCancel }: ComputerGameSetupProps) {
  const [side, setSide] = useState<"white" | "black" | "random">("random");
  const [difficulty, setDifficulty] = useState(5);
  const [timeControl, setTimeControl] = useState<GameConfig["timeControl"]>("unlimited");

  const handleStart = () => {
    onStart({ side, difficulty, timeControl });
  };

  const selectedDifficulty = difficultyLevels.find(d => d.value === difficulty) || difficultyLevels[1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/2 border border-white/10 rounded-xl p-6 max-w-md w-full backdrop-blur-xs shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Cpu size={24} className="text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Play vs Computer</h2>
              <p className="text-sm text-gray-400">Configure your game settings</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Choose Side */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-300 mb-2 block">Choose Your Side</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setSide("white")}
              className={`p-3 rounded-lg border transition-all ${
                side === "white"
                  ? "border-primary bg-primary/10 text-white"
                  : "border-white/20 hover:border-primary/50"
              }`}
            >
              <div className="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" className="w-8 h-8 mx-auto mb-1">
                  <g fill="#fff" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22.5 11.63V6M20 8h5" strokeLinejoin="miter"/>
                    <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#fff" strokeLinecap="butt" strokeLinejoin="miter"/>
                    <path d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7" fill="#fff"/>
                    <path d="M12.5 30c5.5-3 14.5-3 20 0m-20 3.5c5.5-3 14.5-3 20 0m-20 3.5c5.5-3 14.5-3 20 0"/>
                  </g>
                </svg>
                <span className="text-xs">White</span>
              </div>
            </button>
            <button
              onClick={() => setSide("black")}
              className={`p-3 rounded-lg border transition-all ${
                side === "black"
                  ? "border-primary bg-primary/10 text-white"
                  : "border-white/20 hover:border-primary/50"
              }`}
            >
              <div className="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" className="w-8 h-8 mx-auto mb-1">
                  <g fill="#000" fillRule="evenodd" stroke="#b6b6b6ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22.5 11.63V6M20 8h5" strokeLinejoin="miter"/>
                    <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#000" strokeLinecap="butt" strokeLinejoin="miter"/>
                    <path d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7" fill="#000"/>
                    <path d="M12.5 30c5.5-3 14.5-3 20 0m-20 3.5c5.5-3 14.5-3 20 0m-20 3.5c5.5-3 14.5-3 20 0" stroke="#fff"/>
                  </g>
                </svg>
                <span className="text-xs">Black</span>
              </div>
            </button>
            <button
              onClick={() => setSide("random")}
              className={`p-3 rounded-lg border transition-all ${
                side === "random"
                  ? "border-primary bg-primary/10 text-white"
                  : "border-white/20 hover:border-primary/50"
              }`}
            >
              <div className="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-1">
                  <path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z"/>
                  <path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/>
                  <path d="M4 15v-3a6 6 0 0 1 6-6h0"/>
                  <path d="M14 6h0a6 6 0 0 1 6 6v3"/>
                </svg>
                <span className="text-xs">Random</span>
              </div>
            </button>
          </div>
        </div>

        {/* Difficulty Selection */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-300 mb-2 block">
            Difficulty Level
          </label>
          
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => {
                const currentIndex = difficultyLevels.findIndex(d => d.value === difficulty);
                if (currentIndex > 0) {
                  setDifficulty(difficultyLevels[currentIndex - 1].value);
                }
              }}
              disabled={difficultyLevels.findIndex(d => d.value === difficulty) === 0}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={20} />
            </button>
            
            <div className="flex-1 text-center">
              <div className="text-lg font-bold" style={{ color: selectedDifficulty.color }}>
                {selectedDifficulty.label}
              </div>
              <div className="text-xs text-gray-400">{selectedDifficulty.elo} ELO</div>
              <div className="text-xs text-gray-500 mt-1">{selectedDifficulty.description}</div>
            </div>
            
            <button
              onClick={() => {
                const currentIndex = difficultyLevels.findIndex(d => d.value === difficulty);
                if (currentIndex < difficultyLevels.length - 1) {
                  setDifficulty(difficultyLevels[currentIndex + 1].value);
                }
              }}
              disabled={difficultyLevels.findIndex(d => d.value === difficulty) === difficultyLevels.length - 1}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max="5"
              step="1"
              value={difficultyLevels.findIndex(d => d.value === difficulty)}
              onChange={(e) => setDifficulty(difficultyLevels[parseInt(e.target.value)].value)}
              className="w-full"
              style={{
                accentColor: selectedDifficulty.color
              }}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Easiest</span>
              <span>Hardest</span>
            </div>
          </div>
        </div>

        {/* Time Control */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-300 mb-2 block">Time Control</label>
          <div className="grid grid-cols-2 gap-2">
            {(["unlimited", "10min", "5min", "3min"] as const).map((tc) => (
              <button
                key={tc}
                onClick={() => setTimeControl(tc)}
                className={`p-3 rounded-lg border transition-all ${
                  timeControl === tc
                    ? "border-secondary bg-secondary/10 text-white"
                    : "border-white/20 hover:border-secondary/50"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Clock size={16} />
                  <span className="text-sm capitalize">{tc === "unlimited" ? "No Timer" : tc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 border border-white/20 rounded-lg hover:bg-white/5 transition"
          >
            Cancel
          </button>
          <Button
            onClick={handleStart}
            variant="primary"
            className="flex-1"
          >
            Start Game
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
