import { useRef, useEffect } from "react";

interface Move {
  moveNumber: number;
  white?: string;
  black?: string;
}

interface MoveHistoryProps {
  moves: Move[];
  currentMoveIndex: number;
  onNavigate: (index: number) => void;
}

export function MoveHistory({
  moves,
  currentMoveIndex,
  onNavigate,
}: MoveHistoryProps) {
  const movesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = movesContainerRef.current;
    if (!container) return;
    requestAnimationFrame(() =>
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" })
    );
  }, [moves]);

  // Convert half-move index to display highlighting
  const getHighlightedMove = () => {
    if (currentMoveIndex < 0) return -1;
    return Math.floor(currentMoveIndex / 2);
  };

  const getHighlightedSide = () => {
    if (currentMoveIndex < 0) return null;
    return currentMoveIndex % 2 === 0 ? "white" : "black";
  };

  const highlightedMove = getHighlightedMove();
  const highlightedSide = getHighlightedSide();

  // Calculate total half-moves for navigation
  const totalHalfMoves = moves.reduce((total, move) => {
    return total + (move.white ? 1 : 0) + (move.black ? 1 : 0);
  }, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Moves List */}
      <div className="relative bg-zinc-900 rounded-lg text-sm">
        <p className="font-semibold mb-2 sticky top-0 bg-zinc-900 p-2 rounded-lg">
          Moves
        </p>
        <div
          className="p-2 overflow-y-auto max-h-48 lg:max-h-78"
          ref={movesContainerRef}
        >
          {moves.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No moves yet</p>
          ) : (
            <table className="w-full text-left">
              <tbody>
                {moves.map((row, idx) => (
                  <tr
                    key={row.moveNumber}
                    className={idx === highlightedMove ? "bg-zinc-800" : ""}
                  >
                    <td className="pr-1 text-gray-400 px-2 py-1 rounded-l-md">
                      {row.moveNumber}.
                    </td>
                    <td
                      className={`font-bold cursor-pointer hover:bg-zinc-700 px-2 py-1 ${
                        idx === highlightedMove && highlightedSide === "white"
                          ? "bg-primary text-black"
                          : ""
                      }`}
                      onClick={() => onNavigate(idx * 2)}
                    >
                      {row.white}
                    </td>
                    <td
                      className={`pl-2 rounded-r-md cursor-pointer hover:bg-zinc-700 px-2 py-1 ${
                        idx === highlightedMove && highlightedSide === "black"
                          ? "bg-primary text-black"
                          : ""
                      }`}
                      onClick={() => row.black && onNavigate(idx * 2 + 1)}
                    >
                      {row.black}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Navigation Controls - Only show on mobile */}
      <div className="flex lg:hidden justify-center gap-2 sticky bottom-0 py-2 bg-black">
        <button
          className="px-3 py-2 bg-zinc-900 text-xl md:text-2xl cursor-pointer rounded-lg disabled:opacity-40 hover:bg-zinc-800 transition"
          onClick={() => onNavigate(-1)}
          disabled={currentMoveIndex <= -1 || totalHalfMoves === 0}
          aria-label="Go to start"
          title="Go to start"
        >
          ⏮
        </button>
        <button
          className="px-3 py-2 bg-zinc-900 text-xl md:text-2xl cursor-pointer rounded-lg disabled:opacity-40 hover:bg-zinc-800 transition"
          onClick={() => onNavigate(currentMoveIndex - 1)}
          disabled={currentMoveIndex <= -1 || totalHalfMoves === 0}
          aria-label="Previous move"
          title="Previous half-move"
        >
          ◀
        </button>
        <button
          className="px-3 py-2 bg-zinc-900 text-xl md:text-2xl cursor-pointer rounded-lg disabled:opacity-40 hover:bg-zinc-800 transition"
          onClick={() => onNavigate(currentMoveIndex + 1)}
          disabled={currentMoveIndex >= totalHalfMoves || totalHalfMoves === 0}
          aria-label="Next move"
          title="Next half-move"
        >
          ▶
        </button>
        <button
          className="px-3 py-2 bg-zinc-900 text-xl md:text-2xl cursor-pointer rounded-lg disabled:opacity-40 hover:bg-zinc-800 transition"
          onClick={() => onNavigate(totalHalfMoves)}
          disabled={currentMoveIndex >= totalHalfMoves || totalHalfMoves === 0}
          aria-label="Go to end"
          title="Go to current position"
        >
          ⏭
        </button>
      </div>
    </div>
  );
}
