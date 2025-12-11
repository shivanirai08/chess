"use client";

import { useEffect, useRef, useState } from "react";

interface GameBreakdownChartProps {
  data: { 
    days: string[]; 
    wins: number[]; 
    losses: number[]; 
    draws: number[] 
  };
}

export function GameBreakdownChart({ data }: GameBreakdownChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 300, height: 150 });

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect) {
          setDimensions({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const { width, height } = dimensions;
  const padding = 30;
  const maxValue = Math.max(...data.wins, ...data.losses, ...data.draws, 1);
  const MIN_BAR = 3;

  const barWidth = Math.max(width / 50, 8);
  const innerGap = barWidth * 0.6;
  const groupSpacing = width / data.days.length;

  const COLORS = {
    wins: "#4ade80",
    draws: "#cbd5e1",
    losses: "#f87171",
  };

  const scaleY = (v: number) => height - padding - (v / maxValue) * (height - padding * 2);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: "visible" }}>
        {data.days.map((day, i) => {
          const centerX = i * groupSpacing + groupSpacing / 2;
          const wins = data.wins[i];
          const draws = data.draws[i];
          const losses = data.losses[i];

          const tallestValue = Math.max(wins, draws, losses);
          const tooltipY = Math.max(10, scaleY(tallestValue) - 55);

          const winsHeight = Math.max(MIN_BAR, height - padding - scaleY(wins));
          const drawsHeight = Math.max(MIN_BAR, height - padding - scaleY(draws));
          const lossesHeight = Math.max(MIN_BAR, height - padding - scaleY(losses));

          const winsY = height - padding - winsHeight;
          const drawsY = height - padding - drawsHeight;
          const lossesY = height - padding - lossesHeight;

          return (
            <g key={i} className="group cursor-pointer">
              <rect x={centerX - barWidth - innerGap} y={winsY} width={barWidth} height={winsHeight} rx={4} fill={COLORS.wins} />
              <rect x={centerX} y={drawsY} width={barWidth} height={drawsHeight} rx={4} fill={COLORS.draws} />
              <rect x={centerX + barWidth + innerGap} y={lossesY} width={barWidth} height={lossesHeight} rx={4} fill={COLORS.losses} />

              <text x={centerX} y={height - padding + 20} fill="#a0a0a0" fontSize={14} textAnchor="middle">{day}</text>

              <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ zIndex: 50 }}>
                <rect x={centerX - 50} y={tooltipY} width={100} height={80} rx={8} fill="#000" fillOpacity={0.85} />
                <text x={centerX} y={tooltipY + 20} fill="#fff" fontSize={16} textAnchor="middle">{day}</text>
                <text x={centerX} y={tooltipY + 38} fill={COLORS.wins} fontSize={14} textAnchor="middle">Wins: {wins}</text>
                <text x={centerX} y={tooltipY + 53} fill={COLORS.draws} fontSize={14} textAnchor="middle">Draws: {draws}</text>
                <text x={centerX} y={tooltipY + 68} fill={COLORS.losses} fontSize={14} textAnchor="middle">Losses: {losses}</text>
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
