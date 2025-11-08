"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";

export default function GameSetup({ next }: { next: () => void }) {
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [selectedTime, setTime] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center text-center px-4">
      {/* Headline */}
      <p className="text-3xl md:text-4xl font-gveher font-bold mb-8">
        Choose Your Game Setup
      </p>

      <div className="space-y-8 w-full max-w-lg">
        {/* Mode Selection */}
        <div className="w-full">
          <p className="text-sm uppercase tracking-wide text-gray-400 mb-2 text-left">
            Mode
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {["Bullet", "Blitz", "Rapid"].map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setSelectedMode(mode);
                  setTime("");
                }}
                className={`p-4 rounded-xl border font-semibold transition-all cursor-pointer
                ${
                  mode === selectedMode
                    ? "bg-primary/20 shadow-lg border-primary border-2"
                    : "bg-transparent text-white border-white/30 hover:border-primary hover:bg-primary/5"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Time Selection (Animated) */}
        <div
          className={`w-full transition-all duration-500 ease-out ${
            selectedMode
              ? "opacity-100 translate-y-0 max-h-[200px]"
              : "opacity-0 -translate-y-4 max-h-0 overflow-hidden"
          }`}
        >
          {selectedMode && (
            <>
              <p className="text-sm uppercase tracking-wide text-gray-400 text-left">
                Time ({selectedMode})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {(selectedMode === "Bullet"
                  ? ["1 min", "1|1", "2|1"]
                  : selectedMode === "Blitz"
                  ? ["3 min", "3|2", "5 min"]
                  : ["10 min", "15|10", "30 min"]
                ).map((time) => (
                  <button
                    key={time}
                    onClick={() => setTime(time)}
                    className={`p-4 rounded-xl border font-semibold transition-all cursor-pointer
                    ${
                      time === selectedTime
                        ? "bg-secondary/20 shadow-lg border-secondary border-2"
                        : "bg-transparent text-white border-white/30 hover:border-secondary hover:bg-secondary/5"
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Continue Button */}
        <Button
          onClick={next}
          disabled={!selectedMode || !selectedTime}
          type="submit"
          variant="primary"
          className="w-full mt-4 md:w-md"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
