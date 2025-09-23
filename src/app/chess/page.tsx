"use client";

import { useState , useEffect } from "react";
import { Chessboard } from "react-chessboard";

export default function ChessPage() {
  const [showAnimations, setShowAnimations] = useState(true);

  // start position: only pawns + kings
  const [position, setPosition] = useState(
    "4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3"
  );

  const [boardSize, setBoardSize] = useState(400);

  useEffect(() => {
      function updateSize() {
        const height = window.innerHeight - 80; // adjust for padding/margins
        const width = window.innerWidth - 40;
        setBoardSize(Math.min(height, width));
      }
      updateSize();
      window.addEventListener("resize", updateSize);
      return () => window.removeEventListener("resize", updateSize);
    }, []);

  // chessboard options
  const chessboardOptions = {
    position,            // FEN string or piece map
    showAnimations,      // boolean
    id: "position",      // unique id for the board
    boardStyle: {
        borderRadius: '10px',
        boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.5)',
        border: '1px solid #000',
        margin: '20px 0',
        width: `${boardSize}px`,
        height: `${boardSize}px` // make it square
      }, // subtract padding if needed
    darkSquareStyle: {
        backgroundColor: '#b58863'
      },
    lightSquareStyle: {
        backgroundColor: 'beige'
    }
  };

  return (
    <div className="p-4 h-screen flex flex-col">
  <div className="flex-1 flex justify-center items-center">
      <Chessboard
        options={chessboardOptions}
      />
  </div>
</div>
  );
}
