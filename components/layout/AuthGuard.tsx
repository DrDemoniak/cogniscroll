'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

/**
 * AuthGuard
 * Protège les routes privées. Redirige vers /auth/login si non connecté.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('[AUTH_GUARD] Check status:', { loading, uid: user?.uid });
    if (!loading && !user) {
      router.push('/auth/login');
    }
    if (!loading && user) {
      console.log('[AUTH_GUARD] Update daily activity for:', user.uid);
      // recordDailyActivity(user.uid);
    }
  }, [user, loading, router]);

  if (loading) {
    return <div style={{display:'flex', justifyContent:'center', marginTop:'5rem'}}><div className="spinner">Chargement...</div></div>;
  }

  if (!user) return null;

  return <>{children}</>;
}
