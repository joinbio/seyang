'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase, type Team, type Wig, type MetricDef, type DailyEntry } from '@/lib/supabase';
import { getMonday, getWeekDates, formatDateISO, formatDateShort, formatWeekRange, WEEKDAY_KOR } from '@/lib/date-utils';
import { exportTeamData } from '@/lib/excel-export';
import Link from 'next/link';

export default function TeamPage() {
  const params = useParams();
  const teamCode = params.code as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [wig, setWig] = useState<Wig | null>(null);
  const [metrics, setMetrics] = useState<MetricDef[]>([]);
  const [entries, setEntries] = useState<Record<string, Record<string, number | null>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [downloading, setDownloading] = useState(false);

  const today = new Date();
  const [weekOffset, setWeekOffset] = useState(0);
  const monday = (() => {
    const m = getMonday(today);
    m.setDate(m.getDate() + weekOffset * 7);
    return m;
  })();
  const weekDates = getWeekDates(monday);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: teamData, error: teamErr } = await supabase
        .from('teams')
        .select('*')
        .eq('code', teamCode)
        .single();
      if (teamErr) throw teamErr;
      setTeam(teamData);

      const { data: wigData } = await supabase
        .from('wig_master')
        .select('*')
        .eq('team_id', teamData.id)
        .eq('is_active', true)
        .maybeSingle();
      setWig(wigData);

      const { data: metricsData, error: metErr } = await supabase
        .from('metric_defs')
        .select('*')
        .eq('team_id', teamData.id)
        .eq('is_active', true)
        .order('sort_order');
      if (metErr) throw metErr;
      setMetrics(metricsData || []);

      if (metricsData && metricsData.length > 0) {
        const metricIds = metricsData.map((m) => m.id);
        const startDate = formatDateISO(weekDates[0]);
        const endDate = formatDateISO(weekDates[5]);

        const { data: entriesData, error: entErr } = await supabase
          .from('daily_entries')
          .select('*')
          .in('metric_def_id', metricIds)
          .gte('entry_date', startDate)
          .lte('entry_date', endDate);
        if (entErr) throw entErr;

        const map: Record<string, Record<string, number | null>> = {};
        for (const m of metricsData) map[m.id] = {};
        for (const e of entriesData || []) {
          if (!map[e.metric_def_id]) map[e.metric_def_id] = {};
          map[e.metric_def_id][e.entry_date] = e.value;
        }
        setEntries(map);
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

  async function handleChange(metricId: string, date: string, raw: string) {
    const val = raw === '' ? null : parseFloat(raw);

    setEntries((prev) => ({
      ...prev,
      [metricId]: { ...(prev[metricId] || {}), [date]: val },
    }));

    setSaveStatus('저장 중...');

    try {
      const { error: upErr } = await supabase
        .from('daily_entries')
        .upsert(
          { metric_def_id: metricId, entry_date: date, value: val },
          { onConflict: 'metric_def_id,entry_date' }
        );
      if (upErr) throw upErr;
      setSaveStatus(`저장됨 ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`);
    } catch (e: any) {
      setSaveStatus('⚠️ 저장 실패: ' + e.message);
    }
  }

  async function handleQuickDownload() {
    setDownloading(true);
    try {
      await exportTeamData(teamCode, { range: 'month' });
      setSaveStatus('✅ 이번 달 데이터 다운로드 완료');
    } catch (e: any) {
      setSaveStatus('⚠️ ' + e.message);
    } finally {
      setDownloading(false);
    }
  }

  function calculateAvg(metricId: string): number | null {
    const dayMap = entries[metricId] || {};
    const values = Object.values(dayMap).filter((v): v is number => v !== null && !isNaN(v as number));
    if (values.length === 0) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  function isMet(metric: MetricDef, value: number | null): boolean | null {
    if (value === null || isNaN(value)) return null;
    return metric.direction === 'le' ? value <= metric.target_value : value >= metric.target_value;
  }

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto p-4">
        <div className="text-center text-gray-500 py-20">로딩 중...</div>
      </main>
    );
  }

  if (error || !team) {
    return (
      <main className="max-w-5xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <div className="font-medium">에러: {error || '팀을 찾을 수 없습니다'}</div>
        </div>
        <Link href="/" className="inline-block mt-4 text-blue-600 hover:underline">← 홈으로</Link>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto p-3 md:p-6">
      <header className="mb-4">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">← 팀 선택</Link>
        <div className="flex items-baseline justify-between mt-2 flex-wrap gap-2">
          <h1 className="text-xl md:text-2xl font-medium">{team.name}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleQuickDownload}
              disabled={downloading}
              className="text-xs px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded hover:bg-blue-100 disabled:opacity-50"
              title="이번 달 데이터를 엑셀로 다운로드"
            >
              {downloading ? '다운로드 중...' : '📥 엑셀'}
            </button>
            <Link
              href={`/team/${teamCode}/manage`}
              className="text-xs px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 hover:border-gray-400"
            >
              ⚙️ 관리
            </Link>
            <div className="text-xs text-gray-500">{saveStatus || '\u00A0'}</div>
          </div>
        </div>
        {wig && (
          <div className="mt-2 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
            <div className="text-xs text-blue-700">팀 가중목 (WIG)</div>
            <div className="text-sm font-medium text-blue-900 mt-0.5">{wig.description}</div>
          </div>
        )}
      </header>

      <div className="bg-gray-100 rounded-md p-2 mb-3 flex items-center gap-2 text-sm flex-wrap">
        <span className="text-gray-600">주차:</span>
        <button
          onClick={() => setWeekOffset(weekOffset - 1)}
          className="px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-50 text-xs"
        >
          ◀ 전주
        </button>
        <span className="font-medium">{formatWeekRange(monday)}</span>
        <button
          onClick={() => setWeekOffset(weekOffset + 1)}
          className="px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-50 text-xs"
        >
          다음주 ▶
        </button>
        {weekOffset !== 0 && (
          <button
            onClick={() => setWeekOffset(0)}
            className="px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded hover:bg-blue-100 text-xs ml-auto"
          >
            이번주로
          </button>
        )}
      </div>

      {metrics.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <div className="text-sm text-amber-900 mb-2">아직 측정항목이 등록되지 않았습니다</div>
          <Link
            href={`/team/${teamCode}/manage`}
            className="inline-block text-sm px-4 py-2 bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 rounded"
          >
            관리 화면에서 측정항목 추가하기 →
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs text-gray-500">
                <th className="text-left py-2 pr-2 font-medium" style={{ minWidth: 130 }}>항목</th>
                <th className="text-center py-2 px-1 font-medium" style={{ minWidth: 50 }}>목표</th>
                {weekDates.map((d, i) => (
                  <th key={i} className="text-center py-2 px-1 font-medium" style={{ minWidth: 60 }}>
                    <div>{formatDateShort(d)}</div>
                    <div className="text-gray-400">{WEEKDAY_KOR[i]}</div>
                  </th>
                ))}
                <th className="text-center py-2 px-1 font-medium" style={{ minWidth: 60 }}>평균</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => {
                const avg = calculateAvg(m.id);
                const avgMet = isMet(m, avg);
                const indicatorIcon = m.indicator_type === 'lead' ? '🎯' : m.indicator_type === 'lag' ? '📊' : '';
                return (
                  <tr key={m.id} className="border-b border-gray-100">
                    <td className="py-2 pr-2 font-medium text-gray-800 text-xs md:text-sm">
                      <span className="text-xs mr-1">{indicatorIcon}</span>
                      {m.name}
                    </td>
                    <td className="py-2 px-1 text-center text-xs text-gray-500">
                      {m.target_value}{m.direction === 'le' ? '↓' : '↑'}
                    </td>
                    {weekDates.map((d) => {
                      const dateStr = formatDateISO(d);
                      const v = entries[m.id]?.[dateStr] ?? null;
                      const met = isMet(m, v);
                      const bgClass = met === null ? '' : met ? 'bg-green-50' : 'bg-red-50';
                      return (
                        <td key={dateStr} className="py-1 px-1">
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.1"
                            value={v ?? ''}
                            onChange={(e) => handleChange(m.id, dateStr, e.target.value)}
                            className={`w-full text-center text-xs md:text-sm py-1 px-1 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 ${bgClass}`}
                            placeholder="-"
                          />
                        </td>
                      );
                    })}
                    <td className={`py-2 px-1 text-center text-xs md:text-sm font-medium ${
                      avgMet === null ? 'text-gray-400' : avgMet ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {avg === null ? '-' : avg.toFixed(m.target_value >= 1000 ? 0 : 1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 text-xs text-gray-400">
        🎯 선행지표 / 📊 후행지표 — 입력하면 즉시 자동 저장됩니다
      </div>
    </main>
  );
}
