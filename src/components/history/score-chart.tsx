interface ScoreChartProps {
  points: { percent: number; label: string }[];
}

const WIDTH = 600;
const HEIGHT = 160;
const PADDING = 24;

export function ScoreChart({ points }: ScoreChartProps) {
  if (points.length < 2) {
    return (
      <p className="text-sm text-muted">
        Termine au moins deux sessions pour voir ta courbe de progression.
      </p>
    );
  }

  const innerWidth = WIDTH - PADDING * 2;
  const innerHeight = HEIGHT - PADDING * 2;
  const stepX = innerWidth / (points.length - 1);

  const coords = points.map((p, i) => ({
    x: PADDING + i * stepX,
    y: PADDING + innerHeight * (1 - p.percent / 100),
  }));

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  const areaPath = `${path} L${coords[coords.length - 1].x},${HEIGHT - PADDING} L${coords[0].x},${HEIGHT - PADDING} Z`;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Courbe de progression du score">
      <defs>
        <linearGradient id="scoreArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="scoreLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>

      {[0, 50, 100].map((v) => (
        <line
          key={v}
          x1={PADDING}
          x2={WIDTH - PADDING}
          y1={PADDING + innerHeight * (1 - v / 100)}
          y2={PADDING + innerHeight * (1 - v / 100)}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={1}
        />
      ))}

      <path d={areaPath} fill="url(#scoreArea)" />
      <path d={path} fill="none" stroke="url(#scoreLine)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={3} fill="#c4b5fd" />
      ))}
    </svg>
  );
}
