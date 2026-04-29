'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase, type User, type Team, type UserRole, ROLE_LABELS } from '@/lib/supabase';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string>('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, teamsRes] = await Promise.all([
        supabase.from('users').select('*').order('name'),
        supabase.from('teams').select('*').order('sort_order'),
      ]);
      if (usersRes.error) throw usersRes.error;
      if (teamsRes.error) throw teamsRes.error;
      setUsers(usersRes.data || []);
      setTeams(teamsRes.data || []);
    } catch (e: any) {
      setError(e.message || '데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function flashSaved() {
    setSaveStatus(`저장됨 ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`);
    setTimeout(() => setSaveStatus(''), 3000);
  }

  async function addUser() {
    const factoryId = '22222222-2222-2222-2222-222222222201';
    const newUser = {
      email: `user${Date.now()}@joinbio.com`,
      name: '새 직원',
      role: 'part_leader' as UserRole,
      team_id: null,
      factory_id: factoryId,
      is_active: true,
    };
    const { data, error } = await supabase.from('users').insert(newUser).select().single();
    if (error) {
      setSaveStatus('⚠️ ' + error.message);
      return;
    }
    setUsers([...users, data].sort((a, b) => a.name.localeCompare(b.name)));
    flashSaved();
  }

  async function updateUser(id: string, field: keyof User, value: any) {
    setUsers(users.map(u => u.id === id ? { ...u, [field]: value } : u));
    setSaveStatus('저장 중...');
    const { error } = await supabase.from('users').update({ [field]: value }).eq('id', id);
    if (error) setSaveStatus('⚠️ ' + error.message);
    else flashSaved();
  }

  async function deleteUser(id: string) {
    if (!confirm('이 직원을 비활성화할까요?\n실제 삭제되지 않고 비활성 처리만 됩니다.')) return;
    const { error } = await supabase.from('users').update({ is_active: false }).eq('id', id);
    if (error) {
      setSaveStatus('⚠️ ' + error.message);
      return;
    }
    setUsers(users.map(u => u.id === id ? { ...u, is_active: false } : u));
    flashSaved();
  }

  async function reactivateUser(id: string) {
    const { error } = await supabase.from('users').update({ is_active: true }).eq('id', id);
    if (error) {
      setSaveStatus('⚠️ ' + error.message);
      return;
    }
    setUsers(users.map(u => u.id === id ? { ...u, is_active: true } : u));
    flashSaved();
  }

  if (loading) return <main className="max-w-3xl mx-auto p-4"><div className="text-center text-gray-500 py-20">로딩 중...</div></main>;

  if (error) {
    return (
      <main className="max-w-3xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">에러: {error}</div>
        <Link href="/" className="inline-block mt-4 text-blue-600 hover:underline">← 홈으로</Link>
      </main>
    );
  }

  const activeUsers = users.filter(u => u.is_active);
  const inactiveUsers = users.filter(u => !u.is_active);

  return (
    <main className="max-w-3xl mx-auto p-3 md:p-6 pb-20">
      <header className="mb-4">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
          <Link href="/" className="hover:text-gray-700">홈</Link>
          <span>›</span>
          <span className="text-gray-700">사용자 관리</span>
        </div>
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h1 className="text-xl md:text-2xl font-medium">사용자 관리</h1>
          <div className="flex items-center gap-3">
            <button onClick={addUser} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700">+ 직원 추가</button>
            <div className="text-xs text-gray-500 min-h-[1rem]">{saveStatus}</div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">담당자 지정에 사용되는 직원 목록입니다. 실제 로그인 기능은 2주차에 추가됩니다.</p>
      </header>

      <section className="mb-6">
        <h2 className="text-sm font-medium text-gray-700 mb-2">활성 직원 ({activeUsers.length}명)</h2>
        <div className="space-y-2">
          {activeUsers.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-sm text-gray-500">
              등록된 직원이 없습니다. <button onClick={addUser} className="text-blue-600 underline ml-1">추가하기</button>
            </div>
          ) : activeUsers.map(u => (
            <div key={u.id} className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 md:col-span-3">
                  <label className="block text-xs text-gray-600 mb-0.5">이름</label>
                  <input type="text" value={u.name}
                    onChange={(e) => setUsers(users.map(uu => uu.id === u.id ? { ...uu, name: e.target.value } : uu))}
                    onBlur={(e) => updateUser(u.id, 'name', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div className="col-span-12 md:col-span-4">
                  <label className="block text-xs text-gray-600 mb-0.5">이메일</label>
                  <input type="email" value={u.email}
                    onChange={(e) => setUsers(users.map(uu => uu.id === u.id ? { ...uu, email: e.target.value } : uu))}
                    onBlur={(e) => updateUser(u.id, 'email', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div className="col-span-6 md:col-span-2">
                  <label className="block text-xs text-gray-600 mb-0.5">역할</label>
                  <select value={u.role}
                    onChange={(e) => updateUser(u.id, 'role', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300">
                    {Object.entries(ROLE_LABELS).map(([role, label]) => (
                      <option key={role} value={role}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-6 md:col-span-2">
                  <label className="block text-xs text-gray-600 mb-0.5">소속팀</label>
                  <select value={u.team_id || ''}
                    onChange={(e) => updateUser(u.id, 'team_id', e.target.value || null)}
                    className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300">
                    <option value="">없음</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="col-span-12 md:col-span-1 flex justify-end">
                  <button onClick={() => deleteUser(u.id)} className="text-xs text-red-500 hover:text-red-700 px-2 py-1">비활성</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {inactiveUsers.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-gray-700 mb-2">비활성 직원 ({inactiveUsers.length}명)</h2>
          <div className="bg-gray-50 border border-gray-200 rounded-lg divide-y divide-gray-100">
            {inactiveUsers.map(u => (
              <div key={u.id} className="p-3 flex items-center justify-between text-sm">
                <div className="text-gray-500">
                  <span className="line-through">{u.name}</span> <span className="text-xs">({u.email})</span>
                </div>
                <button onClick={() => reactivateUser(u.id)} className="text-xs text-blue-600 hover:underline">재활성화</button>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
