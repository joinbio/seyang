'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { authUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !authUser) {
      router.replace('/auth/login');
    }
  }, [authUser, loading, router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">로딩 중...</div>
      </main>
    );
  }

  if (!authUser) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">로그인 페이지로 이동 중...</div>
      </main>
    );
  }

  return <>{children}</>;
}
