"use client";

interface EloTrendData {
  days: string[];
  ratings?: number[];
  elo?: number[];
}

interface EloTrendChartProps {
  data: EloTrendData;
}

export function EloTrendChart({ data }: EloTrendChartProps) {
  const width = 600;
  const height = 180;
  const padding = 30;

  const series = data.ratings ?? data.elo ?? [];
  const safeSeries = series.length ? series : Array(data.days.length || 7).fill(300);

  const minElo = Math.min(...safeSeries) - 10;
  const maxElo = Math.max(...safeSeries) + 10;
  const range = maxElo - minElo || 1;

  const points = data.days.map((day, idx) => {
    const x = padding + (idx / Math.max(1, data.days.length - 1)) * (width - padding * 2);
    const y = height - padding - ((safeSeries[idx] - minElo) / range) * (height - padding * 2);
    return { 
      day, 
      elo: safeSeries[idx], 
      x, 
      y, 
      delta: idx > 0 ? safeSeries[idx] - safeSeries[idx - 1] : 0 
    };
  });

  const areaPath = [
    `M ${points[0].x} ${height - padding}`,
    ...points.map((p) => `L ${p.x} ${p.y}`),
    `L ${points[points.length - 1].x} ${height - padding}`,
    "Z",
  ].join(" ");

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div className="w-full h-full flex flex-col justify-end relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-[180px]"
        preserveAspectRatio="none"
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id="eloGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={areaPath} fill="url(#eloGradient)" />
        <path
          d={linePath}
          stroke="#a855f7"
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point, index) => (
          <g key={index} className="group cursor-pointer">
            <circle cx={point.x} cy={point.y} r={4} fill="#a855f7" />

            <text x={point.x} y={height - 6} fill="#a0a0a0" fontSize={16} textAnchor="middle">
              {point.day}
            </text>

            {/* Tooltip */}
            <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" style={{ zIndex: 50 }}>
              <rect x={point.x - 50} y={point.y - 70} width={100} height={60} rx={8} fill="#000" fillOpacity={0.85} />
              <text x={point.x} y={point.y - 53} fill="#fff" fontSize={14} textAnchor="middle">{point.day}</text>
              <text x={point.x} y={point.y - 34} fill="#fff" fontSize={14} textAnchor="middle">ELO: {point.elo}</text>
              <text
                x={point.x}
                y={point.y - 16}
                fill={point.delta > 0 ? "#22c55e" : point.delta < 0 ? "#ef4444" : "#9ca3af"}
                fontSize={14}
                textAnchor="middle"
              >
                {point.delta > 0 ? `+${point.delta}` : point.delta}
              </text>
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}
