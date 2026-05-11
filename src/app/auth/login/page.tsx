'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('이메일 또는 비밀번호가 올바르지 않습니다.');
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('이메일 인증이 필요합니다. 이메일을 확인해주세요.');
        } else {
          setError(signInError.message);
        }
        return;
      }

      router.push('/');
      router.refresh();
    } catch (e: any) {
      setError(e.message || '로그인 실패');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-sm w-full">
        <div className="text-center mb-6">
          <h1 className="text-xl font-medium text-gray-900">조인그룹 가중목 시스템</h1>
          <p className="text-xs text-gray-500 mt-1">로그인하여 시작하세요</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5 md:p-6 shadow-sm">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@joinbio.co.kr"
                className="w-full text-sm border border-gray-300 rounded px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full text-sm border border-gray-300 rounded px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded p-2.5">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white text-sm font-medium py-2.5 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-gray-100 text-center space-y-2">
            <Link href="/auth/forgot-password" className="text-xs text-gray-600 hover:text-gray-900 underline">
              비밀번호를 잊으셨나요?
            </Link>
            <div className="text-xs text-gray-500">
              계정이 없으신가요? <Link href="/auth/signup" className="text-blue-600 hover:text-blue-800 underline">회원가입</Link>
            </div>
          </div>
        </div>

        <div className="text-center mt-4 text-[11px] text-gray-400">
          @joinbio.co.kr / @seyangfarm.co.kr 이메일만 가입 가능합니다
        </div>
      </div>
    </main>
  );
}
