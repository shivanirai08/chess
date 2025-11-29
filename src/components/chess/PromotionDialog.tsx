import { PieceSymbol } from "chess.js";
import { defaultPieces } from "react-chessboard";

interface PromotionDialogProps {
  onSelect: (piece: PieceSymbol) => void;
}

export function PromotionDialog({ onSelect }: PromotionDialogProps) {
  const promotionPieceFallback = (p: string) => {
    const unicode: Record<string, string> = {
      q: "♕",
      r: "♖",
      b: "♗",
      n: "♘",
    };
    try {
      if (defaultPieces) {
        const key = `w${p.toUpperCase()}`;
        const piecesLookup = defaultPieces as unknown as Record<
          string,
          () => React.ReactNode
        >;
        const fn = piecesLookup[key];
        if (typeof fn === "function") return fn();
      }
    } catch {
      /* ignore */
    }
    return <span className="text-3xl">{unicode[p] || "?"}</span>;
  };

  return (
    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-black/80 backdrop-blur-md p-4 rounded shadow-lg flex gap-2">
        {(["q", "r", "b", "n"] as PieceSymbol[]).map((p) => (
          <button
            key={p}
            onClick={() => onSelect(p)}
            className="w-20 h-20 sm:w-24 sm:h-24 bg-zinc-800 hover:bg-zinc-700 rounded flex items-center justify-center transition-colors"
            aria-label={`Promote to ${p === "q" ? "Queen" : p === "r" ? "Rook" : p === "b" ? "Bishop" : "Knight"}`}
          >
            {promotionPieceFallback(p)}
          </button>
        ))}
      </div>
    </div>
  );
}
