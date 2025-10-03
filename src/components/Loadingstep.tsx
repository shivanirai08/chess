import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import Button from "./Button";

const avatars = ["/avatar1.svg", "/avatar2.svg", "/avatar3.svg", "/avatar4.svg", "/avatar5.svg", "/avatar6.svg", "/avatar7.svg", "/avatar8.svg"];

export default function MatchmakingStep({ onMatchFound }: { onMatchFound: () => void }) {
  const [index, setIndex] = useState(0);

  // advance every 2.5s (1s pause + 1.5s slide)
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % avatars.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // grab 3 avatars: prev, current, next
  const prev = avatars[(index - 1 + avatars.length) % avatars.length];
  const current = avatars[index];
  const next = avatars[(index + 1) % avatars.length];

  return (
    <div className="flex flex-col items-center text-center">
      <p className="text-3xl md:text-4xl font-semibold mb-10">
        Searching for your next rival...
      </p>

      {/* 3 avatars visible */}
      <div className="flex items-center justify-center space-x-6">
        <motion.img
          key={prev}
          src={prev}
          className="w-16 h-16 rounded-full object-cover opacity-70"
          initial={{ x: -40, scale: 0.8, opacity: 0 }}
          animate={{ x: 0, opacity: 0.7 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
        <motion.img
          key={current}
          src={current}
          className="w-28 h-28 rounded-full border-4 border-primary shadow-lg"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
        <motion.img
          key={next}
          src={next}
          className="w-16 h-16 rounded-full object-cover opacity-70"
          initial={{ x: 40, scale: 0.8, opacity: 0 }}
          animate={{ x: 0, opacity: 0.7 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </div>

      {/* Dynamic rotating lines */}
      <RotatingLines />

      <div className="flex items-center my-4">
        <hr className="w-24 border-t border-white/20" />
        <span className="mx-2">or</span>
        <hr className="w-24 border-t border-white/20" />
      </div>
      <Button variant="secondary" className="w-full md:w-md" onClick={()=>{onMatchFound();}}>Challenge a Friend</Button>
    </div>
  );
}

// rotating lines component
function RotatingLines() {
  const lines = [
    " Matching your skills with the best rival…",
    " Looking for someone on your level…",
    " Almost there, your battle awaits…",
    " Scanning thousands of players right now…",
  ];
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLineIndex((prev) => (prev + 1) % 4);
    }, 3000); // change every 3s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-12 sm:h-6 mt-6 flex justify-center items-center overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.p
          key={lineIndex}
          className="text-primary font-medium"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {lines[lineIndex]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
