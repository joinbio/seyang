'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, type User as DbUser } from '@/lib/supabase';
import type { User as AuthUser, Session } from '@supabase/supabase-js';

type AuthContextValue = {
  authUser: AuthUser | null;
  dbUser: DbUser | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshDbUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  authUser: null,
  dbUser: null,
  session: null,
  loading: true,
  signOut: async () => {},
  refreshDbUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadDbUser(userId: string) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    setDbUser(data);
  }

  async function refreshDbUser() {
    if (authUser) {
      await loadDbUser(authUser.id);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthUser(session?.user ?? null);
      if (session?.user) {
        loadDbUser(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthUser(session?.user ?? null);
      if (session?.user) {
        loadDbUser(session.user.id);
      } else {
        setDbUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setAuthUser(null);
    setDbUser(null);
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ authUser, dbUser, session, loading, signOut, refreshDbUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export const ALLOWED_DOMAINS = ['joinbio.co.kr', 'seyangfarm.co.kr'];

export function isEmailAllowed(email: string): boolean {
  const lower = email.toLowerCase().trim();
  return ALLOWED_DOMAINS.some(domain => lower.endsWith('@' + domain));
}
