'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ROLE_LABELS } from '@/lib/supabase';

export default function UserMenu() {
  const { authUser, dbUser, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!authUser) return null;

  const displayName = dbUser?.name || authUser.email?.split('@')[0] || '사용자';
  const roleLabel = dbUser ? ROLE_LABELS[dbUser.role] : '미지정';

  async function handleSignOut() {
    await signOut();
    router.push('/auth/login');
    router.refresh();
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-gray-700 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100 transition"
      >
        <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-[10px] font-medium">
          {displayName.charAt(0)}
        </div>
        <span className="font-medium">{displayName}</span>
        <span className="text-gray-400">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-3 border-b border-gray-100">
            <div className="text-sm font-medium text-gray-900">{displayName}</div>
            <div className="text-[11px] text-gray-500 mt-0.5 truncate">{authUser.email}</div>
            <div className="text-[11px] text-blue-700 mt-1 inline-block bg-blue-50 px-1.5 py-0.5 rounded">{roleLabel}</div>
          </div>
          <div className="p-1">
            <button
              onClick={handleSignOut}
              className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded"
            >
              로그아웃
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
