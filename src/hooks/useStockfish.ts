import { useEffect, useRef, useState } from "react";

interface StockfishMove {
  from: string;
  to: string;
  promotion?: string;
}

export function useStockfish(skillLevel: number = 5) {
  const engineRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const moveCallbackRef = useRef<((move: StockfishMove) => void) | null>(null);

  useEffect(() => {
    const worker = new Worker("/stockfish.js");

    worker.onmessage = (event) => {
      const message = event.data;

      if (message === "uciok") {
        worker.postMessage(`setoption name Skill Level value ${skillLevel}`);
        worker.postMessage("isready");
      }

      if (message === "readyok") {
        setIsReady(true);
      }

      if (message.startsWith("bestmove")) {
        const parts = message.split(" ");
        const moveStr = parts[1];

        if (!moveStr || moveStr === "(none)") {
          setIsThinking(false);
          return;
        }

        const from = moveStr.substring(0, 2);
        const to = moveStr.substring(2, 4);
        const promotion = moveStr.length > 4 ? moveStr[4] : undefined;

        setIsThinking(false);

        if (moveCallbackRef.current) {
          const delay = Math.min(150 + skillLevel * 60, 800);
          setTimeout(() => {
            moveCallbackRef.current?.({ from, to, promotion });
          }, delay);
        }
      }
    };

    worker.postMessage("uci");
    engineRef.current = worker;

    return () => worker.terminate();
  }, [skillLevel]);

  const getBestMove = (fen: string, callback: (move: StockfishMove) => void) => {
    if (!engineRef.current || !isReady) return;

    moveCallbackRef.current = callback;
    setIsThinking(true);

    const depth = Math.floor(skillLevel / 2) + 2;

    engineRef.current.postMessage(`position fen ${fen}`);
    engineRef.current.postMessage(`go depth ${depth}`);
  };

  return {
    isReady,
    isThinking,
    getBestMove,
  };
}
