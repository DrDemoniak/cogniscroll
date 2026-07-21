'use client';

/**
 * components/layout/AuthGuard.tsx
 * Protège les routes privées et applique les paramètres utilisateur (thème, police)
 * à chaque chargement de page, depuis le profil Firestore.
 */

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  // ── Redirection si non connecté ──────────────────────────────────────────
  useEffect(() => {
    console.log('[AUTH_GUARD] Check:', { loading, uid: user?.uid });
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  // ── Application des paramètres utilisateur à chaque chargement ───────────
  // C'est ici que le thème et la police sont appliqués de façon persistante
  // (même après un rechargement de page sur n'importe quelle route protégée)
  useEffect(() => {
    if (!userProfile?.settings) return;

    const { colorTheme, dyslexicFont } = userProfile.settings;

    // Mode clair / sombre
    if (colorTheme === 'light') {
      document.body.classList.add('light-mode');
      console.log('[AUTH_GUARD] Mode clair appliqué');
    } else {
      document.body.classList.remove('light-mode');
      console.log('[AUTH_GUARD] Mode sombre appliqué');
    }

    // Police dyslexie
    if (dyslexicFont) {
      document.body.classList.add('dyslexic-mode');
      console.log('[AUTH_GUARD] Police dyslexie activée');
    } else {
      document.body.classList.remove('dyslexic-mode');
    }
  }, [userProfile?.settings]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
