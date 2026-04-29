import type { MetricDef, DailyEntry, Wig } from './supabase';

export type StatusLevel = 'green' | 'yellow' | 'red' | 'gray';

export type MetricStats = {
  metric: MetricDef;
  values: { date: string; value: number | null }[];
  latestValue: number | null;
  weekAvg: number | null;
  achievementRate: number | null;
  status: StatusLevel;
  trend: 'up' | 'down' | 'flat' | null;
  daysWithData: number;
  totalDays: number;
};

export function calculateMetricStats(
  metric: MetricDef,
  entries: DailyEntry[],
  weekDates: Date[]
): MetricStats {
  const dateStrings = weekDates.map(d => formatDateISO(d));
  const valuesByDate: Record<string, number | null> = {};
  
  for (const e of entries) {
    if (e.metric_def_id === metric.id) {
      valuesByDate[e.entry_date] = e.value;
    }
  }
  
  const values = dateStrings.map(d => ({ date: d, value: valuesByDate[d] ?? null }));
  const numericValues = values
    .map(v => v.value)
    .filter((v): v is number => v !== null && !isNaN(v));
  
  const latestValue = numericValues.length > 0 ? numericValues[numericValues.length - 1] : null;
  const weekAvg = numericValues.length > 0
    ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length
    : null;

  const achievementRate = weekAvg !== null
    ? metric.direction === 'le'
      ? metric.target_value > 0
        ? Math.min(200, (metric.target_value / Math.max(weekAvg, 0.001)) * 100)
        : 100
      : metric.target_value > 0
        ? (weekAvg / metric.target_value) * 100
        : 0
    : null;

  const status = calculateStatus(weekAvg, metric);
  
  let trend: 'up' | 'down' | 'flat' | null = null;
  if (numericValues.length >= 2) {
    const firstHalf = numericValues.slice(0, Math.floor(numericValues.length / 2));
    const secondHalf = numericValues.slice(Math.floor(numericValues.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const diff = secondAvg - firstAvg;
    const threshold = Math.abs(firstAvg) * 0.05;
    if (diff > threshold) trend = 'up';
    else if (diff < -threshold) trend = 'down';
    else trend = 'flat';
  }

  return {
    metric,
    values,
    latestValue,
    weekAvg,
    achievementRate,
    status,
    trend,
    daysWithData: numericValues.length,
    totalDays: weekDates.length,
  };
}

export function calculateStatus(value: number | null, metric: MetricDef): StatusLevel {
  if (value === null || isNaN(value)) return 'gray';
  
  if (metric.direction === 'le') {
    if (value <= metric.target_value) return 'green';
    if (value <= metric.target_value * 1.1) return 'yellow';
    return 'red';
  } else {
    if (value >= metric.target_value) return 'green';
    if (value >= metric.target_value * 0.9) return 'yellow';
    return 'red';
  }
}

export type TeamSummary = {
  teamId: string;
  teamName: string;
  teamCode: string;
  wig: Wig | null;
  totalMetrics: number;
  greenCount: number;
  yellowCount: number;
  redCount: number;
  grayCount: number;
  overallStatus: StatusLevel;
  wigAchievement: number | null;
  hasUnenteredToday: boolean;
};

export function calculateTeamSummary(
  team: { id: string; name: string; code: string },
  wig: Wig | null,
  metrics: MetricDef[],
  entries: DailyEntry[],
  weekDates: Date[],
  todayStr: string
): TeamSummary {
  let green = 0, yellow = 0, red = 0, gray = 0;
  let hasTodayData = false;

  for (const m of metrics) {
    const stats = calculateMetricStats(m, entries, weekDates);
    if (stats.status === 'green') green++;
    else if (stats.status === 'yellow') yellow++;
    else if (stats.status === 'red') red++;
    else gray++;

    const todayValue = entries.find(e => e.metric_def_id === m.id && e.entry_date === todayStr);
    if (todayValue && todayValue.value !== null) hasTodayData = true;
  }

  let overallStatus: StatusLevel = 'gray';
  if (metrics.length > 0) {
    if (red > 0) overallStatus = 'red';
    else if (yellow > 0) overallStatus = 'yellow';
    else if (green > 0) overallStatus = 'green';
  }

  let wigAchievement: number | null = null;
  if (wig && wig.baseline_value !== null && wig.target_value !== null) {
    const lagMetric = metrics.find(m => m.indicator_type === 'lag');
    if (lagMetric) {
      const stats = calculateMetricStats(lagMetric, entries, weekDates);
      wigAchievement = stats.achievementRate;
    }
  }

  return {
    teamId: team.id,
    teamName: team.name,
    teamCode: team.code,
    wig,
    totalMetrics: metrics.length,
    greenCount: green,
    yellowCount: yellow,
    redCount: red,
    grayCount: gray,
    overallStatus,
    wigAchievement,
    hasUnenteredToday: !hasTodayData && metrics.length > 0,
  };
}

export const STATUS_COLORS: Record<StatusLevel, { bg: string; border: string; text: string; dot: string; label: string }> = {
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', dot: 'bg-green-500', label: '달성' },
  yellow: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', dot: 'bg-amber-500', label: '근접' },
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', dot: 'bg-red-500', label: '미달' },
  gray: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-500', dot: 'bg-gray-300', label: '데이터 없음' },
};

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
