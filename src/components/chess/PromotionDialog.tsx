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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-zinc-900/95 rounded-lg p-6 border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.6)]">
        <h2 className="text-xl font-bold mb-4 text-center">Promote Pawn</h2>
        <div className="flex gap-3">
          {(["q", "r", "b", "n"] as PieceSymbol[]).map((p) => (
            <button
              key={p}
              onClick={() => onSelect(p)}
              className="w-20 h-20 sm:w-24 sm:h-24 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-lg flex items-center justify-center transition-all hover:scale-105 hover:border-white/30"
              aria-label={`Promote to ${p === "q" ? "Queen" : p === "r" ? "Rook" : p === "b" ? "Bishop" : "Knight"}`}
            >
              {promotionPieceFallback(p)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
