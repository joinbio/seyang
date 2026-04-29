'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase, type Team, type Wig, type MetricDef, type DailyEntry, type Practice } from '@/lib/supabase';
import { getMonday, getWeekDates, formatDateISO, formatWeekRange, getWeekKey } from '@/lib/date-utils';
import { calculateMetricStats, calculateStatus, STATUS_COLORS, type MetricStats } from '@/lib/stats';
import MiniLineChart from '@/components/MiniLineChart';
import ProgressBar from '@/components/ProgressBar';

export default function TeamDashboardPage() {
  const params = useParams();
  const teamCode = params.code as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [wig, setWig] = useState<Wig | null>(null);
  const [metrics, setMetrics] = useState<MetricDef[]>([]);
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [previousEntries, setPreviousEntries] = useState<DailyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const [weekOffset, setWeekOffset] = useState(0);
  const monday = (() => {
    const m = getMonday(today);
    m.setDate(m.getDate() + weekOffset * 7);
    return m;
  })();
  const weekDates = getWeekDates(monday);
  const weekKey = getWeekKey(monday);

  const previousMonday = new Date(monday);
  previousMonday.setDate(monday.getDate() - 7);
  const previousWeekDates = getWeekDates(previousMonday);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: teamData, error: teamErr } = await supabase
        .from('teams').select('*').eq('code', teamCode).single();
      if (teamErr) throw teamErr;
      setTeam(teamData);

      const [wigRes, metricsRes, practicesRes] = await Promise.all([
        supabase.from('wig_master').select('*').eq('team_id', teamData.id).eq('is_active', true).maybeSingle(),
        supabase.from('metric_defs').select('*').eq('team_id', teamData.id).eq('is_active', true).order('sort_order'),
        supabase.from('practices').select('*').eq('team_id', teamData.id).eq('week_key', weekKey).order('sort_order'),
      ]);

      setWig(wigRes.data);
      setMetrics(metricsRes.data || []);
      setPractices(practicesRes.data || []);

      if (metricsRes.data && metricsRes.data.length > 0) {
        const metricIds = metricsRes.data.map(m => m.id);
        const startDate = formatDateISO(weekDates[0]);
        const endDate = formatDateISO(weekDates[5]);
        const prevStart = formatDateISO(previousWeekDates[0]);
        const prevEnd = formatDateISO(previousWeekDates[5]);

        const [thisWeek, lastWeek] = await Promise.all([
          supabase.from('daily_entries').select('*')
            .in('metric_def_id', metricIds).gte('entry_date', startDate).lte('entry_date', endDate),
          supabase.from('daily_entries').select('*')
            .in('metric_def_id', metricIds).gte('entry_date', prevStart).lte('entry_date', prevEnd),
        ]);

        setEntries(thisWeek.data || []);
        setPreviousEntries(lastWeek.data || []);
      }
    } catch (e: any) {
      setError(e.message || '데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  }, [teamCode, weekOffset]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <main className="max-w-3xl mx-auto p-4"><div className="text-center text-gray-500 py-20">로딩 중...</div></main>;

  if (error || !team) {
    return (
      <main className="max-w-3xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">에러: {error || '팀 없음'}</div>
        <Link href="/" className="inline-block mt-4 text-blue-600 hover:underline">← 홈으로</Link>
      </main>
    );
  }

  const allStats = metrics.map(m => calculateMetricStats(m, entries, weekDates));
  const previousAllStats = metrics.map(m => calculateMetricStats(m, previousEntries, previousWeekDates));
  
  const leadStats = allStats.filter(s => s.metric.indicator_type === 'lead');
  const lagStats = allStats.filter(s => s.metric.indicator_type === 'lag');
  const generalStats = allStats.filter(s => s.metric.indicator_type === 'general');

  const greenCount = allStats.filter(s => s.status === 'green').length;
  const yellowCount = allStats.filter(s => s.status === 'yellow').length;
  const redCount = allStats.filter(s => s.status === 'red').length;
  const grayCount = allStats.filter(s => s.status === 'gray').length;

  const completedPractices = practices.filter(p => p.is_completed).length;
  const practiceProgress = practices.length > 0 ? (completedPractices / practices.length) * 100 : null;

  const wigLagStats = lagStats.length > 0 ? lagStats[0] : null;
  const wigAchievement = wigLagStats ? wigLagStats.achievementRate : null;

  return (
    <main className="max-w-3xl mx-auto p-3 md:p-6 pb-20">
      <header className="mb-4">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
          <Link href="/" className="hover:text-gray-700">홈</Link>
          <span>›</span>
          <Link href={`/team/${teamCode}`} className="hover:text-gray-700">{team.name}</Link>
          <span>›</span>
          <span className="text-gray-700">대시보드</span>
        </div>
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h1 className="text-xl md:text-2xl font-medium">{team.name} 주간 대시보드</h1>
          <div className="flex items-center gap-2">
            <Link href={`/team/${teamCode}`} className="text-xs px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
              일별 입력 →
            </Link>
            <Link href={`/team/${teamCode}/manage`} className="text-xs px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
              ⚙️ 관리
            </Link>
          </div>
        </div>
      </header>

      <div className="bg-gray-100 rounded-md p-2 mb-4 flex items-center gap-2 text-sm flex-wrap">
        <span className="text-gray-600">주차:</span>
        <button onClick={() => setWeekOffset(weekOffset - 1)} className="px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-50 text-xs">◀ 전주</button>
        <span className="font-medium">{formatWeekRange(monday)}</span>
        <button onClick={() => setWeekOffset(weekOffset + 1)} className="px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-50 text-xs">다음주 ▶</button>
        {weekOffset !== 0 && (
          <button onClick={() => setWeekOffset(0)} className="px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded hover:bg-blue-100 text-xs ml-auto">이번주로</button>
        )}
      </div>

      <section className="mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
            <div className="text-xs text-blue-700 font-medium">팀 가중목 (WIG)</div>
            {wig?.deadline_label && (
              <div className="text-xs text-blue-600">마감: {wig.deadline_label}</div>
            )}
          </div>
          {wig ? (
            <>
              <div className="text-sm font-medium text-blue-900 mb-3">{wig.description}</div>
              <ProgressBar percentage={wigAchievement} height={28} />
              <div className="flex justify-between text-xs text-blue-700 mt-2">
                <span>기준: {wig.baseline_value} {wig.unit}</span>
                <span>목표: {wig.target_value} {wig.unit}</span>
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-500">가중목이 설정되지 않았습니다</div>
          )}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-sm font-medium text-gray-700 mb-2">이번 주 측정항목 현황</h2>
        <div className="grid grid-cols-4 gap-2">
          <div className={`${STATUS_COLORS.green.bg} border ${STATUS_COLORS.green.border} rounded-lg p-3 text-center`}>
            <div className="text-2xl font-medium text-green-800">{greenCount}</div>
            <div className="text-xs text-green-700 mt-0.5">달성</div>
          </div>
          <div className={`${STATUS_COLORS.yellow.bg} border ${STATUS_COLORS.yellow.border} rounded-lg p-3 text-center`}>
            <div className="text-2xl font-medium text-amber-800">{yellowCount}</div>
            <div className="text-xs text-amber-700 mt-0.5">근접</div>
          </div>
          <div className={`${STATUS_COLORS.red.bg} border ${STATUS_COLORS.red.border} rounded-lg p-3 text-center`}>
            <div className="text-2xl font-medium text-red-800">{redCount}</div>
            <div className="text-xs text-red-700 mt-0.5">미달</div>
          </div>
          <div className={`${STATUS_COLORS.gray.bg} border ${STATUS_COLORS.gray.border} rounded-lg p-3 text-center`}>
            <div className="text-2xl font-medium text-gray-600">{grayCount}</div>
            <div className="text-xs text-gray-500 mt-0.5">데이터 없음</div>
          </div>
        </div>
      </section>

      {leadStats.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-medium text-gray-700 mb-2">🎯 선행지표</h2>
          <p className="text-xs text-gray-500 mb-2">행동 지표 — 결과를 만드는 핵심</p>
          <div className="space-y-3">
            {leadStats.map((s, idx) => (
              <MetricCard key={s.metric.id} stats={s} previousStats={previousAllStats[allStats.indexOf(s)]} />
            ))}
          </div>
        </section>
      )}

      {lagStats.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-medium text-gray-700 mb-2">📊 후행지표</h2>
          <p className="text-xs text-gray-500 mb-2">결과 지표 — 가중목과 직접 연결</p>
          <div className="space-y-3">
            {lagStats.map(s => (
              <MetricCard key={s.metric.id} stats={s} previousStats={previousAllStats[allStats.indexOf(s)]} />
            ))}
          </div>
        </section>
      )}

      {generalStats.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-medium text-gray-700 mb-2">기타 측정항목</h2>
          <div className="space-y-3">
            {generalStats.map(s => (
              <MetricCard key={s.metric.id} stats={s} previousStats={previousAllStats[allStats.indexOf(s)]} />
            ))}
          </div>
        </section>
      )}

      <section className="mb-6">
        <h2 className="text-sm font-medium text-gray-700 mb-2">이번 주 실천과제 ({weekKey})</h2>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          {practices.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-3">
              이번 주 실천과제가 없습니다.{' '}
              <Link href={`/team/${teamCode}/manage`} className="text-blue-600 hover:underline">관리에서 추가하기</Link>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-gray-600">완료율 {completedPractices}/{practices.length}건</div>
                <div className="text-xs font-medium text-gray-800">{practiceProgress?.toFixed(0)}%</div>
              </div>
              <ProgressBar percentage={practiceProgress} height={20} />
              <ul className="mt-3 space-y-1.5">
                {practices.map(p => (
                  <li key={p.id} className="flex items-start gap-2 text-xs">
                    <span className={`mt-0.5 ${p.is_completed ? 'text-green-600' : 'text-gray-300'}`}>
                      {p.is_completed ? '✓' : '○'}
                    </span>
                    <span className={`flex-1 ${p.is_completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                      {p.description}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function MetricCard({ stats, previousStats }: { stats: MetricStats; previousStats?: MetricStats }) {
  const colors = STATUS_COLORS[stats.status];
  const prevAvg = previousStats?.weekAvg ?? null;
  const currAvg = stats.weekAvg;
  
  let comparison: string | null = null;
  let comparisonColor = 'text-gray-500';
  if (prevAvg !== null && currAvg !== null) {
    const diff = currAvg - prevAvg;
    const pct = prevAvg !== 0 ? (diff / Math.abs(prevAvg)) * 100 : 0;
    if (Math.abs(pct) < 1) {
      comparison = '전주와 동일';
    } else {
      const isImproving = stats.metric.direction === 'le' ? diff < 0 : diff > 0;
      comparison = `전주 대비 ${diff > 0 ? '+' : ''}${pct.toFixed(1)}%`;
      comparisonColor = isImproving ? 'text-green-600' : 'text-red-600';
    }
  }

  const trendIcon = stats.trend === 'up' ? '↗' : stats.trend === 'down' ? '↘' : stats.trend === 'flat' ? '→' : '';

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-lg p-3 md:p-4`}>
      <div className="flex items-start justify-between mb-2 flex-wrap gap-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${colors.dot}`}></div>
            <div className="font-medium text-sm text-gray-800 truncate">{stats.metric.name}</div>
          </div>
          <div className="text-xs text-gray-600 mt-0.5">
            목표: {stats.metric.target_value} {stats.metric.unit} {stats.metric.direction === 'le' ? '이하' : '이상'}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-lg font-medium ${colors.text}`}>
            {currAvg !== null ? currAvg.toFixed(stats.metric.target_value >= 1000 ? 0 : 1) : '-'}
            {trendIcon && <span className="ml-1 text-sm">{trendIcon}</span>}
          </div>
          <div className="text-xs text-gray-500">평균 ({stats.daysWithData}/{stats.totalDays}일)</div>
        </div>
      </div>

      <div className="mt-2">
        <MiniLineChart 
          points={stats.values} 
          target={stats.metric.target_value} 
          direction={stats.metric.direction}
          unit={stats.metric.unit}
        />
      </div>

      {comparison && (
        <div className={`text-xs mt-2 ${comparisonColor}`}>
          {comparison} ({prevAvg !== null ? prevAvg.toFixed(stats.metric.target_value >= 1000 ? 0 : 1) : '-'})
        </div>
      )}
    </div>
  );
}
