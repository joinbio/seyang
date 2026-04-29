'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase, type Team } from '@/lib/supabase';
import { exportAllDataToExcel, exportTeamData, type ExportRange } from '@/lib/excel-export';

export default function ExportPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [range, setRange] = useState<ExportRange>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [selectedTeamCode, setSelectedTeamCode] = useState<string>('');

  useEffect(() => {
    supabase.from('teams').select('*').order('sort_order').then(({ data }) => {
      setTeams(data || []);
    });
  }, []);

  async function handleDownloadAll() {
    setDownloading(true);
    setStatus('데이터를 모으는 중...');
    try {
      const result = await exportAllDataToExcel({
        range,
        startDate: customStart || undefined,
        endDate: customEnd || undefined,
      });
      setStatus(`✅ 다운로드 완료: ${result.filename}`);
    } catch (e: any) {
      setStatus(`⚠️ 오류: ${e.message}`);
    } finally {
      setDownloading(false);
    }
  }

  async function handleDownloadTeam() {
    if (!selectedTeamCode) {
      setStatus('⚠️ 팀을 선택해주세요');
      return;
    }
    setDownloading(true);
    setStatus('팀 데이터를 모으는 중...');
    try {
      const result = await exportTeamData(selectedTeamCode, {
        range,
        startDate: customStart || undefined,
        endDate: customEnd || undefined,
      });
      setStatus(`✅ 다운로드 완료: ${result.filename}`);
    } catch (e: any) {
      setStatus(`⚠️ 오류: ${e.message}`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-3 md:p-6 pb-20">
      <header className="mb-6">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
          <Link href="/" className="hover:text-gray-700">홈</Link>
          <span>›</span>
          <span className="text-gray-700">엑셀 다운로드</span>
        </div>
        <h1 className="text-xl md:text-2xl font-medium">엑셀 데이터 다운로드</h1>
        <p className="text-xs text-gray-500 mt-1">선택한 기간의 데이터를 엑셀 파일로 받아 분석하실 수 있습니다.</p>
      </header>

      <section className="mb-6 bg-white border border-gray-200 rounded-lg p-4 md:p-5">
        <h2 className="text-sm font-medium text-gray-800 mb-3">1. 기간 선택</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
          {([
            ['week', '이번 주'],
            ['month', '이번 달'],
            ['last_month', '지난 달'],
            ['q1', '1분기 (1~3월)'],
            ['q2', '2분기 (4~6월)'],
            ['q3', '3분기 (7~9월)'],
            ['q4', '4분기 (10~12월)'],
            ['year', '올해 전체'],
            ['all', '전체 기간'],
          ] as [ExportRange, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className={`text-xs md:text-sm py-2 px-3 rounded border transition ${
                range === key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => setRange('custom')}
            className={`text-xs md:text-sm py-2 px-3 rounded border transition ${
              range === 'custom'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
            }`}
          >
            사용자 지정
          </button>
        </div>

        {range === 'custom' && (
          <div className="grid grid-cols-2 gap-2 mt-3 p-3 bg-blue-50 rounded">
            <div>
              <label className="block text-xs text-gray-600 mb-1">시작일</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">종료일</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 bg-white"
              />
            </div>
          </div>
        )}
      </section>

      <section className="mb-6 bg-white border border-gray-200 rounded-lg p-4 md:p-5">
        <h2 className="text-sm font-medium text-gray-800 mb-3">2. 다운로드 종류 선택</h2>
        
        <div className="space-y-3">
          <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
            <div className="font-medium text-blue-900 mb-1">📊 종합 보고서 (전체 9개 팀)</div>
            <div className="text-xs text-blue-700 mb-3 space-y-0.5">
              <div>• 요약 시트 (9개 팀 가중목 + 목표)</div>
              <div>• 팀별 시트 9개 (일별 데이터 + 평균/최대/최소)</div>
              <div>• 실천과제 시트</div>
              <div>• 변경이력 시트</div>
            </div>
            <button
              onClick={handleDownloadAll}
              disabled={downloading}
              className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {downloading ? '생성 중...' : '📥 전체 데이터 엑셀 다운로드'}
            </button>
          </div>

          <div className="border border-gray-200 bg-gray-50 rounded-lg p-4">
            <div className="font-medium text-gray-800 mb-2">📑 특정 팀만 다운로드</div>
            <div className="flex flex-col md:flex-row gap-2 mb-3">
              <select
                value={selectedTeamCode}
                onChange={(e) => setSelectedTeamCode(e.target.value)}
                className="text-sm border border-gray-200 rounded px-2 py-1.5 bg-white flex-1"
              >
                <option value="">팀 선택...</option>
                {teams.map(t => <option key={t.id} value={t.code}>{t.name}</option>)}
              </select>
            </div>
            <button
              onClick={handleDownloadTeam}
              disabled={downloading || !selectedTeamCode}
              className="w-full md:w-auto px-4 py-2 bg-gray-700 text-white text-sm rounded hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {downloading ? '생성 중...' : '📥 팀별 엑셀 다운로드'}
            </button>
          </div>
        </div>
      </section>

      {status && (
        <div className={`p-3 rounded-lg text-sm mb-4 ${
          status.startsWith('⚠️') ? 'bg-red-50 text-red-800 border border-red-200' :
          status.startsWith('✅') ? 'bg-green-50 text-green-800 border border-green-200' :
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          {status}
        </div>
      )}

      <div className="bg-amber-50 border-l-4 border-amber-400 p-3 text-xs text-amber-900">
        <div className="font-medium mb-1">💡 데이터 분석 활용 팁</div>
        <ul className="space-y-1 list-disc list-inside ml-1">
          <li>엑셀 피벗 테이블로 팀별/월별 평균 비교</li>
          <li>차트 기능으로 추세선 그리기</li>
          <li>여러 달 다운로드해 시즌별 패턴 분석</li>
          <li>변경이력 시트로 운영 변경의 영향도 추적</li>
        </ul>
      </div>
    </main>
  );
}
