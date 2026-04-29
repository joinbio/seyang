'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase, type ChangeLogEntry, type Team } from '@/lib/supabase';
import { summarizeChange, formatRelativeTime } from '@/lib/change-log-utils';

export default function HistoryPage() {
  const [logs, setLogs] = useState<ChangeLogEntry[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTeamId, setFilterTeamId] = useState<string>('');
  const [filterEntityType, setFilterEntityType] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('change_log').select('*').order('created_at', { ascending: false }).limit(200);
      if (filterTeamId) query = query.eq('team_id', filterTeamId);
      if (filterEntityType) query = query.eq('entity_type', filterEntityType);
      if (filterAction) query = query.eq('action', filterAction);

      const [logsRes, teamsRes] = await Promise.all([
        query,
        supabase.from('teams').select('*').order('sort_order'),
      ]);
      if (logsRes.error) throw logsRes.error;
      if (teamsRes.error) throw teamsRes.error;
      setLogs(logsRes.data || []);
      setTeams(teamsRes.data || []);
    } catch (e: any) {
      setError(e.message || '데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  }, [filterTeamId, filterEntityType, filterAction]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function getTeamName(teamId: string | null): string {
    if (!teamId) return '-';
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : '알수없음';
  }

  if (error) {
    return (
      <main className="max-w-3xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">에러: {error}</div>
        <Link href="/" className="inline-block mt-4 text-blue-600 hover:underline">← 홈으로</Link>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto p-3 md:p-6 pb-20">
      <header className="mb-4">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
          <Link href="/" className="hover:text-gray-700">홈</Link>
          <span>›</span>
          <span className="text-gray-700">전체 변경 이력</span>
        </div>
        <h1 className="text-xl md:text-2xl font-medium">전체 변경 이력</h1>
        <p className="text-xs text-gray-500 mt-1">모든 가중목/측정항목/실천과제 변경이 자동 기록됩니다 (최대 200건)</p>
      </header>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 grid grid-cols-1 md:grid-cols-3 gap-2">
        <div>
          <label className="block text-xs text-gray-600 mb-0.5">팀</label>
          <select value={filterTeamId} onChange={(e) => setFilterTeamId(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 bg-white">
            <option value="">전체</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-0.5">대상</label>
          <select value={filterEntityType} onChange={(e) => setFilterEntityType(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 bg-white">
            <option value="">전체</option>
            <option value="wig">가중목</option>
            <option value="metric">측정항목</option>
            <option value="practice">실천과제</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-0.5">작업</label>
          <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 bg-white">
            <option value="">전체</option>
            <option value="create">추가</option>
            <option value="update">수정</option>
            <option value="delete">삭제</option>
          </select>
        </div>
      </div>

      <div className="text-xs text-gray-500 mb-2">총 {logs.length}건 {loading ? '(로딩 중...)' : ''}</div>

      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            {loading ? '로딩 중...' : '해당하는 변경 이력이 없습니다'}
          </div>
        ) : logs.map(log => {
          const summary = summarizeChange(log);
          const actionColor =
            log.action === 'create' ? 'text-green-700 bg-green-50' :
            log.action === 'delete' ? 'text-red-700 bg-red-50' :
            'text-blue-700 bg-blue-50';
          return (
            <div key={log.id} className="p-3">
              <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${actionColor}`}>
                    {summary.actionLabel}
                  </span>
                  <span className="text-xs font-medium text-gray-800">{summary.entityLabel}</span>
                  {log.team_id && (
                    <span className="text-[10px] text-gray-500 px-1.5 py-0.5 bg-gray-100 rounded">
                      {getTeamName(log.team_id)}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-gray-400">
                  {formatRelativeTime(log.created_at)} · {new Date(log.created_at).toLocaleString('ko-KR')}
                </span>
              </div>
              <ul className="text-xs text-gray-600 space-y-0.5 pl-2">
                {summary.details.map((d, i) => <li key={i}>• {d}</li>)}
              </ul>
            </div>
          );
        })}
      </div>

      {logs.length >= 200 && (
        <div className="text-xs text-gray-500 mt-3 text-center">
          최근 200건만 표시됩니다. 필터를 사용해 좁혀보세요.
        </div>
      )}
    </main>
  );
}
