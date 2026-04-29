'use client';

import { useEffect, useState } from 'react';
import { supabase, type Team, type Wig } from '@/lib/supabase';
import Link from 'next/link';

type TeamWithWig = Team & { wig: Wig | null };

export default function HomePage() {
  const [teams, setTeams] = useState<TeamWithWig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTeams();
  }, []);

  async function loadTeams() {
    try {
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .order('sort_order');

      if (teamsError) throw teamsError;

      const { data: wigsData, error: wigsError } = await supabase
        .from('wig_master')
        .select('*')
        .eq('is_active', true);

      if (wigsError) throw wigsError;

      const merged: TeamWithWig[] = (teamsData || []).map((t) => ({
        ...t,
        wig: (wigsData || []).find((w) => w.team_id === t.id) || null,
      }));

      setTeams(merged);
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

  return (
    <main className="max-w-3xl mx-auto p-4 md:p-8">
      <header className="mb-6 flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-medium text-gray-900">조인그룹 가중목 시스템</h1>
          <p className="text-sm text-gray-500 mt-1">세양 안성공장 · 9개 팀</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Link href="/admin/users" className="text-gray-600 hover:text-gray-900 underline">사용자 관리</Link>
          <Link href="/admin/history" className="text-gray-600 hover:text-gray-900 underline">변경 이력</Link>
        </div>
      </header>

      <section>
        <h2 className="text-base font-medium text-gray-700 mb-3">팀 선택</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {teams.map((team) => (
            <Link
              key={team.id}
              href={`/team/${team.code}`}
              className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-sm transition"
            >
              <div className="font-medium text-gray-900">{team.name}</div>
              {team.wig && (
                <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {team.wig.description}
                </div>
              )}
            </Link>
          ))}
        </div>
      </section>

      <footer className="mt-12 text-center text-xs text-gray-400">
        v0.2 · 2026.04 · Powered by Next.js + Supabase
      </footer>
    </main>
  );
}
