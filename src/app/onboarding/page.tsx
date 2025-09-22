"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Input from "@/components/Input";
import Button from "@/components/Button";
import MatchmakingStep from "@/components/Loadingstep";
import Image from "next/image";

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(1);
  const [mode, setMode] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [selectedTime, setTime] = useState<string | null>(null);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const avatars = ["/avatar1.svg", "/avatar2.svg", "/avatar3.svg", "/avatar4.svg", "/avatar5.svg", "/avatar6.svg"];


  // ----- Question Navigation -----
  const next = () => {
    if (step < 3) {
      setDirection("right");
      setStep(step + 1);
    }
  };
  const prev = () => {
    if (step > 0) {
      setDirection("left");
      setStep(step - 1);
    }
  };

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
    <div
      className="relative min-h-screen bg-fixed bg-cover bg-center bg-no-repeat text-white flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundImage: "url('/bg.svg')" }}
    >
      {/* Dark gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/20 to-black/50 pointer-events-none" />

      {/* Top-right navigation */}
      <div className="absolute top-6 right-6 flex gap-3 z-20">
        <button
          onClick={prev}
          disabled={step === 0}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30"
        >
          <ArrowLeft />
        </button>
        <button
          onClick={next}
          disabled={step === 3}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30"
        >
          <ArrowRight />
        </button>
      </div>

      {/* Question card */}
      <div className="relative z-10 w-full max-w-2xl flex justify-center items-center px-6">
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
            {step === 0 && (
              <div className="flex flex-col items-center">
                <p className="text-3xl md:text-4xl font-semibold mb-6">
                  What's your name?
                </p>
                <div className="space-y-6 w-md">
                  <Input
                    label="Your Name"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={true}
                  />
                  <Button
                    onClick={next}
                    disabled={!name.trim().length}
                    type="submit"
                    variant="primary"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
            {step === 1 && (
              <div className="flex flex-col items-center w-full">
                <p className="text-3xl md:text-4xl font-semibold mb-6">
                  Choose your Avatar
                </p>
                <div className="space-y-6 w-full flex flex-col items-center">
                  <div className="flex gap-4 ">
                    {avatars.map((avatar,id) => { return ( <Image key={id} src={avatar} width={20} height={20} alt="" className="h-20 w-20 rounded-full bg-gray-800"></Image>)})}
                  </div>
                  <Button
                    onClick={next}
                    disabled={!name.trim().length}
                    type="submit"
                    variant="primary"
                    className="w-md"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="flex flex-col items-center text-center">
                {/* Headline */}
                <p className="text-3xl md:text-4xl font-semibold mb-2">
                  Select your Mode
                </p>
                <p className="text-gray-400 mb-8 max-w-md">
                  Choose a mode and then select the time control you’d like to
                  play with.
                </p>

                <div className="space-y-8 w-full max-w-lg">
                  {/* Step 1: Choose Mode */}
                  <div>
                    <p className="text-lg font-medium mb-3">
                      Step 1: Pick a Mode
                    </p>
                    <div className="grid grid-cols-3 gap-4">
                      {["Bullet", "Blitz", "Rapid"].map((mode) => (
                        <button
                          key={mode}
                          onClick={() => {
                            setMode(mode);
                            setSelectedMode(mode);
                            setTime(""); // reset time when mode changes
                          }}
                          className={`p-4 rounded-xl border font-semibold transition-all 
                ${
                  mode === selectedMode
                    ? "bg-primary text-black shadow-lg border-primary"
                    : "bg-transparent text-white border-white/30 hover:border-primary hover:bg-primary/10"
                }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 2: Choose Time */}
                  {selectedMode && (
                    <div>
                      <p className="text-lg font-medium mb-3">
                        Step 2: Select Time ({selectedMode})
                      </p>
                      <div className="grid grid-cols-3 gap-4">
                        {(selectedMode === "Bullet"
                          ? ["1 min", "2|1", "3 min"]
                          : selectedMode === "Blitz"
                          ? ["3|2", "5 min", "5|3"]
                          : ["10 min", "15|10", "30 min"]
                        ).map((time) => (
                          <button
                            key={time}
                            onClick={() => setTime(time)}
                            className={`p-4 rounded-xl border font-semibold transition-all
                  ${
                    time === selectedTime
                      ? "bg-secondary text-black shadow-lg border-secondary"
                      : "bg-transparent text-white border-white/30 hover:border-secondary hover:bg-secondary/10"
                  }`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Continue Button */}
                  <Button
                    onClick={next}
                    disabled={!selectedMode || !selectedTime}
                    type="submit"
                    variant="primary"
                    className="w-full mt-6"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <MatchmakingStep />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
