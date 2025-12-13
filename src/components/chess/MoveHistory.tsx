"use client";

import React from "react";

type MoveRow = {
  moveNumber: number;
  white?: string;
  black?: string;
};

interface MoveHistoryProps {
  moves: MoveRow[];
  currentMoveIndex: number;      // half-move index
  onNavigate: (halfMoveIndex: number) => void;
}

export function MoveHistory({
  moves,
  currentMoveIndex,
  onNavigate,
}: MoveHistoryProps) {

  return (
    <>
      {/* MOVE LIST */}
      <div className="bg-white/2 rounded-lg backdrop-blur-xs border border-white/10 overflow-hidden">
        <div className="bg-white/4 px-4 py-3 grid grid-cols-3 text-base font-semibold">
          <div>White</div>
          <div className="text-center">Move</div>
          <div className="text-right">Black</div>
        </div>

        <div className="h-[180px] overflow-y-auto p-4 space-y-1.5">
          {moves.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No moves yet
            </p>
          ) : (
            moves.map((row, idx) => {
              const activeMove = Math.floor(currentMoveIndex / 2);
              const activeSide =
                currentMoveIndex % 2 === 0 ? "white" : "black";

              return (
                <div key={row.moveNumber} className="grid grid-cols-3 gap-4">
                  <MoveCell
                    active={idx === activeMove && activeSide === "white"}
                    onClick={() => onNavigate(idx * 2)}
                  >
                    {row.white}
                  </MoveCell>

                  <div className="text-center text-gray-400">
                    {row.moveNumber}
                  </div>

                  <MoveCell
                    active={idx === activeMove && activeSide === "black"}
                    align="right"
                    onClick={() =>
                      row.black && onNavigate(idx * 2 + 1)
                    }
                  >
                    {row.black}
                  </MoveCell>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

/* ---------- helpers ---------- */

function NavButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="w-14 h-12 bg-zinc-800 hover:bg-zinc-700 text-white text-xl rounded-lg
                 disabled:opacity-40 disabled:cursor-not-allowed
                 transition-colors flex items-center justify-center"
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function MoveCell({
  children,
  active,
  align = "left",
  onClick,
}: {
  children?: string;
  active?: boolean;
  align?: "left" | "right";
  onClick?: () => void;
}) {
  return (
    <div
      onClick={children ? onClick : undefined}
      className={`px-3 py-2 rounded cursor-pointer transition-colors
        ${align === "right" ? "text-right" : ""}
        ${active ? "bg-zinc-800 text-white font-bold" : "hover:bg-zinc-700"}
      `}
    >
      {children}
    </div>
  );
}
