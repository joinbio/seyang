'use client';

type Point = { date: string; value: number | null };

type Props = {
  points: Point[];
  target: number;
  direction: 'ge' | 'le';
  height?: number;
  unit?: string;
};

export default function MiniLineChart({ points, target, direction, height = 80, unit = '' }: Props) {
  const validPoints = points.filter(p => p.value !== null) as { date: string; value: number }[];
  
  if (validPoints.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-xs text-gray-400 bg-gray-50 rounded">
        데이터 없음
      </div>
    );
  }

  const values = validPoints.map(p => p.value);
  const allValues = [...values, target];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;
  const padding = range * 0.1;
  const yMin = min - padding;
  const yMax = max + padding;
  const yRange = yMax - yMin || 1;

  const width = 280;
  const chartHeight = height - 20;
  const xStep = points.length > 1 ? width / (points.length - 1) : width / 2;

  const targetY = chartHeight - ((target - yMin) / yRange) * chartHeight;

  const linePath = points
    .map((p, i) => {
      const x = i * xStep;
      if (p.value === null) return null;
      const y = chartHeight - ((p.value - yMin) / yRange) * chartHeight;
      return `${x},${y}`;
    })
    .filter(Boolean);

  const segments: string[][] = [];
  let currentSeg: string[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.value === null) {
      if (currentSeg.length > 0) {
        segments.push(currentSeg);
        currentSeg = [];
      }
    } else {
      const x = i * xStep;
      const y = chartHeight - ((p.value - yMin) / yRange) * chartHeight;
      currentSeg.push(`${x},${y}`);
    }
  }
  if (currentSeg.length > 0) segments.push(currentSeg);

  return (
    <div className="relative" style={{ height }}>
      <svg width="100%" height={chartHeight} viewBox={`0 0 ${width} ${chartHeight}`} preserveAspectRatio="none" className="overflow-visible">
        <line
          x1={0}
          y1={targetY}
          x2={width}
          y2={targetY}
          stroke="#3B82F6"
          strokeWidth="1"
          strokeDasharray="4,3"
          opacity="0.6"
        />
        
        {segments.map((seg, idx) => (
          <polyline
            key={idx}
            points={seg.join(' ')}
            fill="none"
            stroke="#1F3864"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        
        {points.map((p, i) => {
          if (p.value === null) return null;
          const x = i * xStep;
          const y = chartHeight - ((p.value - yMin) / yRange) * chartHeight;
          const met = direction === 'le' ? p.value <= target : p.value >= target;
          const color = met ? '#22C55E' : '#EF4444';
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="3" fill={color} stroke="white" strokeWidth="1.5" />
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-0.5">
        {points.map((p, i) => {
          const date = new Date(p.date);
          const day = date.getDate();
          const weekday = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
          return (
            <div key={i} className="flex flex-col items-center">
              <span>{day}</span>
              <span className="text-gray-300">{weekday}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
