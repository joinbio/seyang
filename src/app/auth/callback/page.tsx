'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function handleCallback() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          setStatus('error');
          setMessage(error.message);
          return;
        }

        if (session) {
          setStatus('success');
          setMessage('인증이 완료되었습니다! 잠시 후 메인 화면으로 이동합니다...');
          setTimeout(() => {
            router.push('/');
            router.refresh();
          }, 1500);
        } else {
          setStatus('error');
          setMessage('인증 세션을 확인할 수 없습니다. 다시 시도해주세요.');
        }
      } catch (e: any) {
        setStatus('error');
        setMessage(e.message || '인증 처리 실패');
      }
    }

    handleCallback();
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-sm w-full">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm text-center">
          {status === 'processing' && (
            <>
              <div className="text-2xl mb-2">⏳</div>
              <div className="text-sm font-medium text-gray-900">인증 처리 중...</div>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="text-2xl mb-2">✅</div>
              <div className="text-sm font-medium text-gray-900 mb-2">인증 완료</div>
              <div className="text-xs text-gray-600">{message}</div>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="text-2xl mb-2">⚠️</div>
              <div className="text-sm font-medium text-gray-900 mb-2">인증 실패</div>
              <div className="text-xs text-red-600 mb-4">{message}</div>
              <Link href="/auth/login" className="inline-block text-xs text-blue-600 hover:text-blue-800 underline">
                로그인 화면으로
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
