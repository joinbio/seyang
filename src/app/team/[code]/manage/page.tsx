'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase, type Team, type Wig, type MetricDef, type Practice, type IndicatorType } from '@/lib/supabase';
import { getMonday, getWeekKey } from '@/lib/date-utils';

export default function ManagePage() {
  const params = useParams();
  const teamCode = params.code as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [wig, setWig] = useState<Wig | null>(null);
  const [metrics, setMetrics] = useState<MetricDef[]>([]);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string>('');

  const today = new Date();
  const weekKey = getWeekKey(getMonday(today));

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

      const { data: metricsData } = await supabase
        .from('metric_defs')
        .select('*')
        .eq('team_id', teamData.id)
        .eq('is_active', true)
        .order('sort_order');
      setMetrics(metricsData || []);

      const { data: practicesData } = await supabase
        .from('practices')
        .select('*')
        .eq('team_id', teamData.id)
        .eq('week_key', weekKey)
        .order('sort_order');
      setPractices(practicesData || []);
    } catch (e: any) {
      setError(e.message || '데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  }, [teamCode, weekKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function flashSaved() {
    setSaveStatus(`저장됨 ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`);
    setTimeout(() => setSaveStatus(''), 3000);
  }

  async function updateWig(field: keyof Wig, value: any) {
    if (!wig) return;
    const updated = { ...wig, [field]: value };
    setWig(updated);
    setSaveStatus('저장 중...');
    const { error } = await supabase.from('wig_master').update({ [field]: value }).eq('id', wig.id);
    if (error) setSaveStatus('⚠️ ' + error.message);
    else flashSaved();
  }

  async function addMetric(type: IndicatorType) {
    if (!team) return;
    const newMetric = {
      team_id: team.id,
      name: '새 측정항목',
      unit: '',
      target_value: 0,
      direction: 'ge' as const,
      indicator_type: type,
      is_lead_indicator: type === 'lead',
      sort_order: metrics.length + 1,
      is_active: true,
    };
    const { data, error } = await supabase.from('metric_defs').insert(newMetric).select().single();
    if (error) {
      setSaveStatus('⚠️ ' + error.message);
      return;
    }
    setMetrics([...metrics, data]);
    flashSaved();
  }

  async function updateMetric(id: string, field: keyof MetricDef, value: any) {
    setMetrics(metrics.map(m => m.id === id ? { ...m, [field]: value } : m));
    setSaveStatus('저장 중...');
    const { error } = await supabase.from('metric_defs').update({ [field]: value }).eq('id', id);
    if (error) setSaveStatus('⚠️ ' + error.message);
    else flashSaved();
  }

  async function deleteMetric(id: string) {
    if (!confirm('이 측정항목을 삭제할까요?\n과거 입력 데이터도 함께 삭제됩니다.')) return;
    const { error } = await supabase.from('metric_defs').update({ is_active: false }).eq('id', id);
    if (error) {
      setSaveStatus('⚠️ ' + error.message);
      return;
    }
    setMetrics(metrics.filter(m => m.id !== id));
    flashSaved();
  }

  async function addPractice() {
    if (!team) return;
    const newPractice = {
      team_id: team.id,
      description: '새 실천과제',
      week_key: weekKey,
      is_completed: false,
      sort_order: practices.length + 1,
    };
    const { data, error } = await supabase.from('practices').insert(newPractice).select().single();
    if (error) {
      setSaveStatus('⚠️ ' + error.message);
      return;
    }
    setPractices([...practices, data]);
    flashSaved();
  }

  async function updatePractice(id: string, field: keyof Practice, value: any) {
    setPractices(practices.map(p => p.id === id ? { ...p, [field]: value } : p));
    setSaveStatus('저장 중...');
    const { error } = await supabase.from('practices').update({ [field]: value }).eq('id', id);
    if (error) setSaveStatus('⚠️ ' + error.message);
    else flashSaved();
  }

  async function deletePractice(id: string) {
    if (!confirm('이 실천과제를 삭제할까요?')) return;
    const { error } = await supabase.from('practices').delete().eq('id', id);
    if (error) {
      setSaveStatus('⚠️ ' + error.message);
      return;
    }
    setPractices(practices.filter(p => p.id !== id));
    flashSaved();
  }

  if (loading) {
    return <main className="max-w-3xl mx-auto p-4"><div className="text-center text-gray-500 py-20">로딩 중...</div></main>;
  }

  if (error || !team) {
    return (
      <main className="max-w-3xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">에러: {error || '팀 없음'}</div>
        <Link href="/" className="inline-block mt-4 text-blue-600 hover:underline">← 홈으로</Link>
      </main>
    );
  }

  const leadMetrics = metrics.filter(m => m.indicator_type === 'lead');
  const lagMetrics = metrics.filter(m => m.indicator_type === 'lag');
  const generalMetrics = metrics.filter(m => m.indicator_type === 'general');

  return (
    <main className="max-w-3xl mx-auto p-3 md:p-6 pb-20">
      <header className="mb-4">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
          <Link href="/" className="hover:text-gray-700">홈</Link>
          <span>›</span>
          <Link href={`/team/${teamCode}`} className="hover:text-gray-700">{team.name}</Link>
          <span>›</span>
          <span className="text-gray-700">관리</span>
        </div>
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h1 className="text-xl md:text-2xl font-medium">{team.name} 가중목 관리</h1>
          <div className="text-xs text-gray-500 min-h-[1rem]">{saveStatus}</div>
        </div>
      </header>

      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-gray-700">팀 가중목 (WIG)</h2>
        </div>
        {wig ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4 space-y-3">
            <div>
              <label className="block text-xs text-blue-700 mb-1">가중목 설명</label>
              <textarea
                value={wig.description}
                onChange={(e) => setWig({ ...wig, description: e.target.value })}
                onBlur={(e) => updateWig('description', e.target.value)}
                className="w-full text-sm border border-blue-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-blue-700 mb-1">기준값(현재)</label>
                <input
                  type="number"
                  step="0.01"
                  value={wig.baseline_value ?? ''}
                  onChange={(e) => setWig({ ...wig, baseline_value: e.target.value === '' ? null : parseFloat(e.target.value) })}
                  onBlur={(e) => updateWig('baseline_value', e.target.value === '' ? null : parseFloat(e.target.value))}
                  className="w-full text-sm border border-blue-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs text-blue-700 mb-1">목표값</label>
                <input
                  type="number"
                  step="0.01"
                  value={wig.target_value}
                  onChange={(e) => setWig({ ...wig, target_value: parseFloat(e.target.value) || 0 })}
                  onBlur={(e) => updateWig('target_value', parseFloat(e.target.value) || 0)}
                  className="w-full text-sm border border-blue-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs text-blue-700 mb-1">단위</label>
                <input
                  type="text"
                  value={wig.unit}
                  onChange={(e) => setWig({ ...wig, unit: e.target.value })}
                  onBlur={(e) => updateWig('unit', e.target.value)}
                  className="w-full text-sm border border-blue-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs text-blue-700 mb-1">방향</label>
                <select
                  value={wig.direction}
                  onChange={(e) => updateWig('direction', e.target.value)}
                  className="w-full text-sm border border-blue-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="ge">↑ 이상 (높을수록 좋음)</option>
                  <option value="le">↓ 이하 (낮을수록 좋음)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-blue-700 mb-1">마감일</label>
                <input
                  type="date"
                  value={wig.deadline ?? ''}
                  onChange={(e) => setWig({ ...wig, deadline: e.target.value || null })}
                  onBlur={(e) => updateWig('deadline', e.target.value || null)}
                  className="w-full text-sm border border-blue-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs text-blue-700 mb-1">마감 라벨</label>
                <input
                  type="text"
                  placeholder="예: 5월말"
                  value={wig.deadline_label ?? ''}
                  onChange={(e) => setWig({ ...wig, deadline_label: e.target.value || null })}
                  onBlur={(e) => updateWig('deadline_label', e.target.value || null)}
                  className="w-full text-sm border border-blue-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-500">
            가중목이 아직 설정되지 않았습니다.
          </div>
        )}
      </section>

      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-gray-700">선행지표 (Lead Indicators)</h2>
          <button onClick={() => addMetric('lead')} className="text-xs px-2.5 py-1 bg-white border border-orange-300 text-orange-700 rounded hover:bg-orange-50">+ 추가</button>
        </div>
        <p className="text-xs text-gray-500 mb-2">결과를 만드는 행동 지표 — 매일 영향을 줄 수 있는 항목</p>
        <MetricList metrics={leadMetrics} onUpdate={updateMetric} onDelete={deleteMetric} colorClass="bg-orange-50 border-orange-200" />
      </section>

      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-gray-700">후행지표 (Lag Indicators)</h2>
          <button onClick={() => addMetric('lag')} className="text-xs px-2.5 py-1 bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50">+ 추가</button>
        </div>
        <p className="text-xs text-gray-500 mb-2">최종 결과 지표 — 가중목과 직접 연결되는 결과치</p>
        <MetricList metrics={lagMetrics} onUpdate={updateMetric} onDelete={deleteMetric} colorClass="bg-blue-50 border-blue-200" />
      </section>

      {generalMetrics.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-gray-700">기타 측정항목</h2>
            <button onClick={() => addMetric('general')} className="text-xs px-2.5 py-1 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50">+ 추가</button>
          </div>
          <MetricList metrics={generalMetrics} onUpdate={updateMetric} onDelete={deleteMetric} colorClass="bg-gray-50 border-gray-200" />
        </section>
      )}

      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-gray-700">이번 주 실천과제 ({weekKey})</h2>
          <button onClick={addPractice} className="text-xs px-2.5 py-1 bg-white border border-purple-300 text-purple-700 rounded hover:bg-purple-50">+ 추가</button>
        </div>
        <div className="space-y-2">
          {practices.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-sm text-gray-500">
              이번 주 실천과제가 없습니다. <button onClick={addPractice} className="text-purple-600 underline ml-1">추가하기</button>
            </div>
          ) : practices.map(p => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-start gap-2">
              <input
                type="checkbox"
                checked={p.is_completed}
                onChange={(e) => updatePractice(p.id, 'is_completed', e.target.checked)}
                className="mt-1 w-4 h-4 cursor-pointer"
              />
              <textarea
                value={p.description}
                onChange={(e) => setPractices(practices.map(pp => pp.id === p.id ? { ...pp, description: e.target.value } : pp))}
                onBlur={(e) => updatePractice(p.id, 'description', e.target.value)}
                className={`flex-1 text-sm border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-purple-300 rounded px-1 ${p.is_completed ? 'line-through text-gray-400' : 'text-gray-800'}`}
                rows={2}
              />
              <button onClick={() => deletePractice(p.id)} className="text-xs text-red-500 hover:text-red-700 px-1">삭제</button>
            </div>
          ))}
        </div>
      </section>

      <div className="bg-amber-50 border-l-4 border-amber-400 p-3 text-xs text-amber-900">
        <div className="font-medium mb-1">자동 저장 안내</div>
        <div>입력 칸을 벗어나는 순간 자동으로 저장됩니다. 우측 상단의 "저장됨" 메시지로 확인하세요.</div>
      </div>
    </main>
  );
}

function MetricList({
  metrics,
  onUpdate,
  onDelete,
  colorClass,
}: {
  metrics: MetricDef[];
  onUpdate: (id: string, field: keyof MetricDef, value: any) => void;
  onDelete: (id: string) => void;
  colorClass: string;
}) {
  if (metrics.length === 0) {
    return <div className="text-xs text-gray-400 py-3 text-center bg-gray-50 rounded border border-gray-100">아직 등록된 항목이 없습니다</div>;
  }

  return (
    <div className="space-y-2">
      {metrics.map(m => (
        <div key={m.id} className={`${colorClass} border rounded-lg p-3`}>
          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-12 md:col-span-5">
              <label className="block text-xs text-gray-600 mb-0.5">항목명</label>
              <input
                type="text"
                value={m.name}
                onChange={(e) => onUpdate(m.id, 'name', e.target.value)}
                onBlur={(e) => onUpdate(m.id, 'name', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div className="col-span-4 md:col-span-2">
              <label className="block text-xs text-gray-600 mb-0.5">단위</label>
              <input
                type="text"
                value={m.unit}
                onChange={(e) => onUpdate(m.id, 'unit', e.target.value)}
                onBlur={(e) => onUpdate(m.id, 'unit', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div className="col-span-4 md:col-span-2">
              <label className="block text-xs text-gray-600 mb-0.5">목표</label>
              <input
                type="number"
                step="0.01"
                value={m.target_value}
                onChange={(e) => onUpdate(m.id, 'target_value', parseFloat(e.target.value) || 0)}
                onBlur={(e) => onUpdate(m.id, 'target_value', parseFloat(e.target.value) || 0)}
                className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div className="col-span-4 md:col-span-2">
              <label className="block text-xs text-gray-600 mb-0.5">방향</label>
              <select
                value={m.direction}
                onChange={(e) => onUpdate(m.id, 'direction', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="ge">↑</option>
                <option value="le">↓</option>
              </select>
            </div>
            <div className="col-span-12 md:col-span-1 flex justify-end md:justify-center">
              <button onClick={() => onDelete(m.id)} className="text-xs text-red-500 hover:text-red-700 px-2 py-1">삭제</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
