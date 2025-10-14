"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import MatchmakingStep from "@/components/layout/Matchmakingstep";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";

export default function Onboarding() {
  const router = useRouter();
  const { setUser } = useUser();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("/avatar7.svg");
  const [matchFound, setMatchFound] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [selectedTime, setTime] = useState<string | null>(null);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const avatars = [
    "/avatar1.svg",
    "/avatar2.svg",
    "/avatar3.svg",
    "/avatar4.svg",
    "/avatar5.svg",
    "/avatar6.svg",
  ];

  // Countdown Timer
  useEffect(() => {
    if (matchFound && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (countdown === 0) {
      router.push("/chess");
    }
  }, [matchFound, countdown, router]);

  // Question Navigation
  const next = () => {
    if (step == 2){
      setUser({ name: name || "You", avatar });
    }
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
      className="relative h-screen flex flex-col items-center justify-center overflow-hidden">

      {/* Top bar */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold">Chess</span>
        </div>
        <div className="flex items-center gap-3">
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
      </div>

      {/* Question card */}
      <div className="relative z-10 w-full md:w-2xl flex justify-center items-center px-6">
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
              <div className="flex flex-col items-center w-full">
                <p className="text-3xl md:text-4xl font-gveher font-bold mb-6 text-center">
                  {/* What&apos;s your name? */}
                  What should we call you ?
                </p>
                <div className="space-y-6 w-full md:w-md">
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
                <p className="text-3xl md:text-4xl font-gveher font-bold mb-8 text-center">
                  Choose your Avatar
                </p>
                <div className="space-y-6 w-full flex flex-col items-center">
                  <div className="flex gap-4 flex-wrap justify-center mb-8">
                    {avatars.map((avatarImg, id) => {
                      return (
                        <Image
                          key={id}
                          src={avatarImg}
                          width={20}
                          height={20}
                          alt=""
                          className={`h-20 w-20 rounded-full bg-gray-800 cursor-pointer hover:ring-1 hover:ring-primary hover:scale-90 ease-in-out transform transition-all object-cover
                  ${avatar === avatarImg ? "ring-3 ring-primary" : ""}`}
                          onClick={() => setAvatar(avatarImg)}
                        ></Image>
                      );
                    })}
                  </div>
                  <Button
                    onClick={next}
                    disabled={!name.trim().length}
                    type="submit"
                    variant="primary"
                    className="md:w-md w-full"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="flex flex-col items-center text-center px-4">
                {/* Headline */}
                <p className="text-3xl md:text-4xl font-gveher font-bold mb-8">
                  Choose Your Game Setup
                </p>

                <div className="space-y-8 w-full max-w-lg">
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
                          className={`p-4 rounded-xl border font-semibold transition-all 
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

                  {selectedMode && (
                    <div className="w-full">
                      <p className="text-sm uppercase tracking-wide text-gray-400 mb-2 text-left">
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
                            className={`p-4 rounded-xl border font-semibold transition-all
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
                    </div>
                  )}

                  {/* Continue Button */}
                  <Button
                    onClick={next}
                    disabled={!selectedMode || !selectedTime}
                    type="submit"
                    variant="primary"
                    className="w-full mt-6 md:w-md"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <MatchmakingStep onMatchFound={() => setMatchFound(true)} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Player Found */}
      {matchFound && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm backdrop-filter flex flex-col items-center justify-center z-50">
          <div className="flex items-center gap-8">
            {/* You */}
            <div className="flex flex-col items-center">
              <Image
                src={avatar}
                alt="You"
                width={80}
                height={80}
                className="rounded-full"
              />
              <p className="mt-2 text-xl font-semibold">{name || "You"}</p>
            </div>

            <span className="text-3xl font-bold">VS</span>

            {/* Opponent */}
            <div className="flex flex-col items-center">
              <Image
                src="/avatar8.svg"
                alt="Opponent"
                width={80}
                height={80}
                className="rounded-full"
              />
              <p className="mt-2 text-xl font-semibold">Opponent</p>
            </div>
          </div>

          {/* Countdown */}
          <p className="mt-10 text-4xl font-bold animate-pulse">
            Match starts in {countdown}...
          </p>
        </div>
      )}
    </div>
  );
}
