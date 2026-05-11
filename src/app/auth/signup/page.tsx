'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { isEmailAllowed, ALLOWED_DOMAINS } from '@/lib/auth-context';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isEmailAllowed(email)) {
      setError(`회원가입은 ${ALLOWED_DOMAINS.map(d => '@' + d).join(' 또는 ')} 이메일만 가능합니다.`);
      return;
    }

    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (name.trim().length < 2) {
      setError('이름을 2자 이상 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered') || signUpError.message.includes('already exists')) {
          setError('이미 가입된 이메일입니다. 로그인 해주세요.');
        } else if (signUpError.message.includes('rate limit')) {
          setError('잠시 후 다시 시도해주세요. (요청 빈도 초과)');
        } else {
          setError(signUpError.message);
        }
        return;
      }

      if (data.user && !data.session) {
        setSuccess('회원가입이 완료되었습니다! 이메일을 확인하여 인증을 완료해주세요.');
      } else if (data.session) {
        setSuccess('회원가입 완료! 잠시 후 메인 화면으로 이동합니다.');
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 1500);
      }
    } catch (e: any) {
      setError(e.message || '회원가입 실패');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-sm w-full">
        <div className="text-center mb-6">
          <h1 className="text-xl font-medium text-gray-900">회원가입</h1>
          <p className="text-xs text-gray-500 mt-1">조인그룹 가중목 시스템</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5 md:p-6 shadow-sm">
          <div className="bg-blue-50 border border-blue-200 rounded p-2.5 mb-4 text-xs text-blue-800">
            <div className="font-medium mb-0.5">📌 가입 가능 이메일</div>
            <ul className="space-y-0.5 ml-1">
              {ALLOWED_DOMAINS.map(d => <li key={d}>• @{d}</li>)}
            </ul>
          </div>

          <form onSubmit={handleSignup} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="홍길동"
                className="w-full text-sm border border-gray-300 rounded px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">회사 이메일</label>
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
              <label className="block text-xs text-gray-600 mb-1">비밀번호 (8자 이상)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="••••••••"
                className="w-full text-sm border border-gray-300 rounded px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">비밀번호 확인</label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                minLength={8}
                placeholder="••••••••"
                className="w-full text-sm border border-gray-300 rounded px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded p-2.5">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-800 text-xs rounded p-2.5">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !!success}
              className="w-full bg-blue-600 text-white text-sm font-medium py-2.5 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {loading ? '가입 중...' : '가입하기'}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-gray-100 text-center text-xs text-gray-500">
            이미 계정이 있으신가요?{' '}
            <Link href="/auth/login" className="text-blue-600 hover:text-blue-800 underline">로그인</Link>
          </div>
        </div>

        <div className="text-center mt-4 text-[11px] text-gray-400">
          가입 후 관리자가 역할/팀을 지정합니다
        </div>
      </div>
    </main>
  );
}
