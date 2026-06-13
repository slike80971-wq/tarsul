/**
 * Tarsul - تراسل | Main Page Router
 */
'use client';

import { useEffect, useState, useRef, useMemo, useTransition } from 'react';
import { useAuthStore } from '@/store/auth-store';
import AuthPage from '@/components/auth/auth-page';
import ChatLayout from '@/components/chat/chat-layout';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  const checkDoneRef = useRef(false);
  const [, startTransition] = useTransition();

  // One-time session verification after zustand hydration
  useEffect(() => {
    if (!hasHydrated || checkDoneRef.current) return;
    checkDoneRef.current = true;

    if (!isAuthenticated || !token) {
      startTransition(() => {
        setSessionValid(false);
        setInitialCheckDone(true);
      });
      return;
    }

    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) logout();
        startTransition(() => {
          setSessionValid(r.ok);
          setInitialCheckDone(true);
        });
      })
      .catch(() => {
        logout();
        startTransition(() => {
          setSessionValid(false);
          setInitialCheckDone(true);
        });
      });
  }, [hasHydrated, isAuthenticated, token, logout]);

  const view = useMemo<'loading' | 'auth' | 'chat'>(() => {
    if (!initialCheckDone) return 'loading';
    if (sessionValid) return 'chat';
    if (isAuthenticated && token && !sessionValid) return 'chat';
    return 'auth';
  }, [initialCheckDone, sessionValid, isAuthenticated, token]);

  if (view === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <p className="text-gray-500 text-sm">جاري تحميل تراسل...</p>
        </div>
      </div>
    );
  }

  if (view === 'auth') return <AuthPage />;
  return <ChatLayout />;
}