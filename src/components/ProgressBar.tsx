'use client';

type Props = {
  percentage: number | null;
  height?: number;
  showLabel?: boolean;
};

export default function ProgressBar({ percentage, height = 24, showLabel = true }: Props) {
  if (percentage === null || isNaN(percentage)) {
    return (
      <div className="bg-gray-100 rounded-full overflow-hidden relative" style={{ height }}>
        <div className="h-full bg-gray-200 flex items-center justify-center">
          <span className="text-xs text-gray-400">데이터 없음</span>
        </div>
      </div>
    );
  }

  const clamped = Math.max(0, Math.min(150, percentage));
  const colorClass = 
    percentage >= 100 ? 'bg-green-500' :
    percentage >= 90 ? 'bg-amber-500' :
    'bg-red-500';
  
  const textColor = 
    percentage >= 100 ? 'text-green-800' :
    percentage >= 90 ? 'text-amber-800' :
    'text-red-800';

  return (
    <div className="bg-gray-100 rounded-full overflow-hidden relative" style={{ height }}>
      <div
        className={`h-full ${colorClass} transition-all duration-500 flex items-center justify-end pr-2`}
        style={{ width: `${Math.min(100, clamped)}%` }}
      >
        {showLabel && clamped > 20 && (
          <span className="text-xs font-medium text-white">{percentage.toFixed(1)}%</span>
        )}
      </div>
      {showLabel && clamped <= 20 && (
        <div className={`absolute inset-0 flex items-center justify-start pl-2 ${textColor}`}>
          <span className="text-xs font-medium">{percentage.toFixed(1)}%</span>
        </div>
      )}
      
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-blue-700"
        style={{ left: '100%', transform: 'translateX(-1px)' }}
        title="목표 100%"
      />
    </div>
  );
}
