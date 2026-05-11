'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSuccess(true);
    } catch (e: any) {
      setError(e.message || '요청 실패');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-sm w-full">
        <div className="text-center mb-6">
          <h1 className="text-xl font-medium text-gray-900">비밀번호 재설정</h1>
          <p className="text-xs text-gray-500 mt-1">이메일로 재설정 링크를 보내드립니다</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5 md:p-6 shadow-sm">
          {success ? (
            <div className="text-center py-4">
              <div className="text-2xl mb-2">📧</div>
              <div className="text-sm font-medium text-gray-900 mb-2">이메일을 확인해주세요</div>
              <div className="text-xs text-gray-600 mb-4 leading-relaxed">
                <strong>{email}</strong>으로<br />
                비밀번호 재설정 링크를 보내드렸습니다.<br />
                메일함을 확인해주세요.
              </div>
              <Link 
                href="/auth/login" 
                className="inline-block text-xs text-blue-600 hover:text-blue-800 underline"
              >
                로그인 화면으로
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">가입 이메일</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@joinbio.co.kr"
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
                className="w-full bg-blue-600 text-white text-sm font-medium py-2.5 rounded hover:bg-blue-700 disabled:bg-gray-400 transition"
              >
                {loading ? '전송 중...' : '재설정 링크 받기'}
              </button>

              <div className="text-center pt-2 border-t border-gray-100">
                <Link href="/auth/login" className="text-xs text-gray-600 hover:text-gray-900 underline">
                  ← 로그인 화면으로
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
