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
          <table className="w-full text-left">
            <tbody>
              {moves.map((row, idx) => (
                <tr
                  key={row.moveNumber}
                  className={idx === currentMoveIndex ? "bg-zinc-800" : ""}
                >
                  <td className="pr-1 text-gray-400 px-2 py-1 rounded-l-md">
                    {row.moveNumber}.
                  </td>
                  <td className="font-bold">{row.white}</td>
                  <td className="pl-2 rounded-r-md">{row.black}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex justify-center gap-2 sticky bottom-0 py-2 bg-black">
        <button
          className="px-3 py-2 bg-zinc-900 text-xl md:text-2xl cursor-pointer rounded-lg disabled:opacity-40"
          onClick={() => onNavigate(-1)}
          disabled={currentMoveIndex <= -1}
          aria-label="Go to start"
        >
          ⏮
        </button>
        <button
          className="px-3 py-2 bg-zinc-900 text-xl md:text-2xl cursor-pointer rounded-lg disabled:opacity-40"
          onClick={() => onNavigate(Math.max(currentMoveIndex - 1, -1))}
          disabled={currentMoveIndex <= -1}
          aria-label="Previous move"
        >
          ◀
        </button>
        <button
          className="px-3 py-2 bg-zinc-900 text-xl md:text-2xl cursor-pointer rounded-lg disabled:opacity-40"
          onClick={() => onNavigate(Math.min(currentMoveIndex + 1, moves.length - 1))}
          disabled={currentMoveIndex >= moves.length - 1}
          aria-label="Next move"
        >
          ▶
        </button>
        <button
          className="px-3 py-2 bg-zinc-900 text-xl md:text-2xl cursor-pointer rounded-lg disabled:opacity-40"
          onClick={() => onNavigate(moves.length - 1)}
          disabled={currentMoveIndex >= moves.length - 1}
          aria-label="Go to end"
        >
          ⏭
        </button>
      </div>
    </div>
  );
}
