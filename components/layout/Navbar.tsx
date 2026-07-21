'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

/**
 * Navbar component
 * Barre de navigation globale.
 */
export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  console.log('[NAVBAR] Render, pathname:', pathname);

  if (!user) return null;

  const initial = user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U';

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-brand">
          <Link href="/dashboard">CogniScroll</Link>
        </div>
        <div className="navbar-links">
          <Link href="/dashboard" className={`navbar-link ${pathname === '/dashboard' ? 'active' : ''}`}>Dashboard</Link>
          <Link href="/learn"     className={`navbar-link ${pathname?.startsWith('/learn') ? 'active' : ''}`}>Apprendre</Link>
          <Link href="/history"   className={`navbar-link ${pathname === '/history' ? 'active' : ''}`}>Historique</Link>
          <Link href="/favorites" className={`navbar-link ${pathname === '/favorites' ? 'active' : ''}`}>Favoris</Link>
          <Link href="/profile"   className={`navbar-link ${pathname === '/profile' ? 'active' : ''}`}>Profil</Link>
        </div>
        <div className="navbar-actions">
          <div className="user-avatar" title={user.email || undefined}>{initial}</div>
          <button onClick={logout} className="btn btn-outline btn-sm">Déconnexion</button>
        </div>
      </div>
    </nav>
  );
}
