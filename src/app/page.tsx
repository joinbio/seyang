'use client';

import { useEffect, useState } from 'react';
import { supabase, type Team, type Wig, type MetricDef, type DailyEntry } from '@/lib/supabase';
import { getMonday, getWeekDates, formatDateISO } from '@/lib/date-utils';
import { calculateTeamSummary, STATUS_COLORS, type TeamSummary } from '@/lib/stats';
import Link from 'next/link';

export default function HomePage() {
  const [summaries, setSummaries] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const today = new Date();
      const monday = getMonday(today);
      const weekDates = getWeekDates(monday);
      const todayStr = formatDateISO(today);

      const [teamsRes, wigsRes, metricsRes] = await Promise.all([
        supabase.from('teams').select('*').order('sort_order'),
        supabase.from('wig_master').select('*').eq('is_active', true),
        supabase.from('metric_defs').select('*').eq('is_active', true),
      ]);

      if (teamsRes.error) throw teamsRes.error;
      const teams = teamsRes.data || [];
      const wigs = wigsRes.data || [];
      const metrics = metricsRes.data || [];

      const allMetricIds = metrics.map(m => m.id);
      let entries: DailyEntry[] = [];
      if (allMetricIds.length > 0) {
        const { data } = await supabase
          .from('daily_entries')
          .select('*')
          .in('metric_def_id', allMetricIds)
          .gte('entry_date', formatDateISO(weekDates[0]))
          .lte('entry_date', formatDateISO(weekDates[5]));
        entries = data || [];
      }

      const sums = teams.map(team => {
        const teamMetrics = metrics.filter(m => m.team_id === team.id);
        const teamWig = wigs.find(w => w.team_id === team.id) || null;
        const teamEntries = entries.filter(e => teamMetrics.some(m => m.id === e.metric_def_id));
        return calculateTeamSummary(team, teamWig, teamMetrics, teamEntries, weekDates, todayStr);
      });

      setSummaries(sums);
    } catch (e: any) {
      setError(e.message || '데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto p-4 md:p-8">
        <div className="text-center text-gray-500 py-20">로딩 중...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-3xl mx-auto p-4 md:p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <div className="font-medium mb-2">데이터베이스 연결 오류</div>
          <div className="text-sm">{error}</div>
        </div>
      </main>
    );
  }

  const greenCount = summaries.filter(s => s.overallStatus === 'green').length;
  const yellowCount = summaries.filter(s => s.overallStatus === 'yellow').length;
  const redCount = summaries.filter(s => s.overallStatus === 'red').length;

  return (
    <main className="max-w-3xl mx-auto p-4 md:p-8">
      <header className="mb-6 flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-medium text-gray-900">조인그룹 가중목 시스템</h1>
          <p className="text-sm text-gray-500 mt-1">세양 안성공장 · 9개 팀</p>
        </div>
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <Link href="/factory" className="text-blue-600 hover:text-blue-800 font-medium">📊 공장 대시보드</Link>
          <Link href="/admin/export" className="text-blue-600 hover:text-blue-800 font-medium">📥 엑셀</Link>
          <Link href="/admin/users" className="text-gray-600 hover:text-gray-900 underline">사용자 관리</Link>
          <Link href="/admin/history" className="text-gray-600 hover:text-gray-900 underline">변경 이력</Link>
        </div>
      </header>

      <section className="mb-5">
        <Link href="/factory" className="block bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 hover:shadow-sm transition">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-xs text-blue-700 font-medium mb-0.5">오늘의 공장 현황</div>
              <div className="text-sm text-blue-900">9개 팀 종합 신호등</div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                <span className="font-medium text-green-700">{greenCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 bg-amber-500 rounded-full"></div>
                <span className="font-medium text-amber-700">{yellowCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                <span className="font-medium text-red-700">{redCount}</span>
              </div>
              <span className="text-blue-600 ml-2">→</span>
            </div>
          </div>
        </Link>
      </section>

      <section>
        <h2 className="text-base font-medium text-gray-700 mb-3">팀 선택</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {summaries.map((s) => {
            const colors = STATUS_COLORS[s.overallStatus];
            return (
              <Link
                key={s.teamId}
                href={`/team/${s.teamCode}`}
                className={`block bg-white border ${colors.border} rounded-lg p-4 hover:shadow-sm transition relative`}
              >
                <div className="flex items-start gap-2">
                  <div className={`w-2 h-2 rounded-full ${colors.dot} mt-1.5 flex-shrink-0`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="font-medium text-gray-900">{s.teamName}</div>
                      {s.hasUnenteredToday && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">오늘 미입력</span>
                      )}
                    </div>
                    {s.wig && (
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {s.wig.description}
                      </div>
                    )}
                    {s.totalMetrics > 0 && (
                      <div className="flex items-center gap-2 mt-2 text-[11px]">
                        {s.greenCount > 0 && <span className="text-green-700">달성 {s.greenCount}</span>}
                        {s.yellowCount > 0 && <span className="text-amber-700">근접 {s.yellowCount}</span>}
                        {s.redCount > 0 && <span className="text-red-700">미달 {s.redCount}</span>}
                        {s.wigAchievement !== null && (
                          <span className={`ml-auto font-medium ${colors.text}`}>
                            {s.wigAchievement.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <footer className="mt-12 text-center text-xs text-gray-400">
        v0.4 · 2026.04 · Powered by Next.js + Supabase
      </footer>
    </main>
  );
}
