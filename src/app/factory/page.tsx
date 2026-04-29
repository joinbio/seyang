'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase, type Team, type Wig, type MetricDef, type DailyEntry } from '@/lib/supabase';
import { getMonday, getWeekDates, formatDateISO, formatWeekRange } from '@/lib/date-utils';
import { calculateTeamSummary, STATUS_COLORS, type TeamSummary } from '@/lib/stats';
import ProgressBar from '@/components/ProgressBar';

export default function FactoryDashboardPage() {
  const [summaries, setSummaries] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const monday = getMonday(today);
  const weekDates = getWeekDates(monday);
  const todayStr = formatDateISO(today);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [teamsRes, wigsRes, metricsRes] = await Promise.all([
        supabase.from('teams').select('*').order('sort_order'),
        supabase.from('wig_master').select('*').eq('is_active', true),
        supabase.from('metric_defs').select('*').eq('is_active', true).order('sort_order'),
      ]);
      
      if (teamsRes.error) throw teamsRes.error;
      const teams = teamsRes.data || [];
      const wigs = wigsRes.data || [];
      const metrics = metricsRes.data || [];

      const allMetricIds = metrics.map(m => m.id);
      let entries: DailyEntry[] = [];
      
      if (allMetricIds.length > 0) {
        const { data: entriesData } = await supabase
          .from('daily_entries')
          .select('*')
          .in('metric_def_id', allMetricIds)
          .gte('entry_date', formatDateISO(weekDates[0]))
          .lte('entry_date', formatDateISO(weekDates[5]));
        entries = entriesData || [];
      }

      const sums = teams.map(team => {
        const teamMetrics = metrics.filter(m => m.team_id === team.id);
        const teamWig = wigs.find(w => w.team_id === team.id) || null;
        const teamEntries = entries.filter(e => teamMetrics.some(m => m.id === e.metric_def_id));
        return calculateTeamSummary(team, teamWig, teamMetrics, teamEntries, weekDates, todayStr);
      });

      const sorted = [...sums].sort((a, b) => {
        const order = { red: 0, yellow: 1, gray: 2, green: 3 };
        return order[a.overallStatus] - order[b.overallStatus];
      });

      setSummaries(sorted);
    } catch (e: any) {
      setError(e.message || '데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <main className="max-w-3xl mx-auto p-4"><div className="text-center text-gray-500 py-20">로딩 중...</div></main>;

  if (error) {
    return (
      <main className="max-w-3xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">에러: {error}</div>
        <Link href="/" className="inline-block mt-4 text-blue-600 hover:underline">← 홈으로</Link>
      </main>
    );
  }

  const greenTeams = summaries.filter(s => s.overallStatus === 'green').length;
  const yellowTeams = summaries.filter(s => s.overallStatus === 'yellow').length;
  const redTeams = summaries.filter(s => s.overallStatus === 'red').length;
  const grayTeams = summaries.filter(s => s.overallStatus === 'gray').length;
  
  const unenteredTeams = summaries.filter(s => s.hasUnenteredToday);

  return (
    <main className="max-w-3xl mx-auto p-3 md:p-6 pb-20">
      <header className="mb-4">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
          <Link href="/" className="hover:text-gray-700">홈</Link>
          <span>›</span>
          <span className="text-gray-700">공장 종합 대시보드</span>
        </div>
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl md:text-2xl font-medium">세양 안성공장 종합 대시보드</h1>
            <p className="text-xs text-gray-500 mt-0.5">9개 팀 가중목 현황 — {formatWeekRange(monday)}</p>
          </div>
          <div className="text-xs text-gray-500">
            {today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
          </div>
        </div>
      </header>

      <section className="mb-6">
        <div className="grid grid-cols-4 gap-2">
          <div className={`${STATUS_COLORS.green.bg} border ${STATUS_COLORS.green.border} rounded-lg p-3 md:p-4 text-center`}>
            <div className="text-2xl md:text-3xl font-medium text-green-800">{greenTeams}</div>
            <div className="text-xs text-green-700 mt-1">달성</div>
          </div>
          <div className={`${STATUS_COLORS.yellow.bg} border ${STATUS_COLORS.yellow.border} rounded-lg p-3 md:p-4 text-center`}>
            <div className="text-2xl md:text-3xl font-medium text-amber-800">{yellowTeams}</div>
            <div className="text-xs text-amber-700 mt-1">근접</div>
          </div>
          <div className={`${STATUS_COLORS.red.bg} border ${STATUS_COLORS.red.border} rounded-lg p-3 md:p-4 text-center`}>
            <div className="text-2xl md:text-3xl font-medium text-red-800">{redTeams}</div>
            <div className="text-xs text-red-700 mt-1">미달</div>
          </div>
          <div className={`${STATUS_COLORS.gray.bg} border ${STATUS_COLORS.gray.border} rounded-lg p-3 md:p-4 text-center`}>
            <div className="text-2xl md:text-3xl font-medium text-gray-600">{grayTeams}</div>
            <div className="text-xs text-gray-500 mt-1">데이터 없음</div>
          </div>
        </div>
      </section>

      {unenteredTeams.length > 0 && (
        <section className="mb-6">
          <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded">
            <div className="text-xs text-amber-900 font-medium mb-1">⚠️ 오늘 입력 안 한 팀: {unenteredTeams.length}개</div>
            <div className="text-xs text-amber-800">
              {unenteredTeams.map(s => s.teamName).join(', ')}
            </div>
          </div>
        </section>
      )}

      <section className="mb-6">
        <h2 className="text-sm font-medium text-gray-700 mb-2">팀별 현황 (위험순 정렬)</h2>
        <div className="space-y-2">
          {summaries.map(s => {
            const colors = STATUS_COLORS[s.overallStatus];
            return (
              <Link
                key={s.teamId}
                href={`/team/${s.teamCode}/dashboard`}
                className={`block ${colors.bg} border ${colors.border} rounded-lg p-3 md:p-4 hover:shadow-sm transition`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <div className={`w-3 h-3 rounded-full ${colors.dot}`}></div>
                      <span className="font-medium text-gray-900">{s.teamName}</span>
                      {s.hasUnenteredToday && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">오늘 미입력</span>
                      )}
                    </div>
                    {s.wig && (
                      <div className="text-xs text-gray-600 line-clamp-1 mb-2">{s.wig.description}</div>
                    )}
                    <div className="flex items-center gap-3 text-xs flex-wrap">
                      {s.greenCount > 0 && <span className="text-green-700">달성 {s.greenCount}</span>}
                      {s.yellowCount > 0 && <span className="text-amber-700">근접 {s.yellowCount}</span>}
                      {s.redCount > 0 && <span className="text-red-700">미달 {s.redCount}</span>}
                      {s.grayCount > 0 && <span className="text-gray-500">미입력 {s.grayCount}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {s.wigAchievement !== null && (
                      <>
                        <div className={`text-lg font-medium ${colors.text}`}>
                          {s.wigAchievement.toFixed(0)}%
                        </div>
                        <div className="text-[10px] text-gray-500">가중목 달성률</div>
                      </>
                    )}
                  </div>
                </div>
                {s.wigAchievement !== null && (
                  <div className="mt-2">
                    <ProgressBar percentage={s.wigAchievement} height={8} showLabel={false} />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded text-xs text-blue-900">
        <div className="font-medium mb-1">💡 사용 안내</div>
        <ul className="space-y-1 list-disc list-inside ml-1">
          <li>위험순(빨강 → 노랑 → 회색 → 초록)으로 자동 정렬됩니다</li>
          <li>각 팀 카드를 클릭하면 해당 팀 주간 대시보드로 이동</li>
          <li>"오늘 미입력" 라벨이 있는 팀은 입력 독려 필요</li>
        </ul>
      </section>
    </main>
  );
}
