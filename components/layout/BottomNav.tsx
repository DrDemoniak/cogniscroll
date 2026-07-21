'use client';

/**
 * components/layout/BottomNav.tsx
 * Barre de navigation fixe en bas pour mobile (< 768px).
 * 5 onglets : Accueil | Bibliothèque | + (Nouvelle leçon) | Quiz espacé | Profil
 */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();
  const router   = useRouter();

  /** Vérifie si un chemin est actif (correspondance exacte ou préfixe) */
  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname?.startsWith(href);
  };

  return (
    <nav className="bottom-nav">
      {/* Accueil */}
      <Link href="/dashboard" className={`bottom-nav-item ${isActive('/dashboard') ? 'active' : ''}`}>
        <span className="bottom-nav-icon">🏠</span>
        <span className="bottom-nav-label">Accueil</span>
      </Link>

      {/* Bibliothèque / Historique */}
      <Link href="/history" className={`bottom-nav-item ${isActive('/history') ? 'active' : ''}`}>
        <span className="bottom-nav-icon">📚</span>
        <span className="bottom-nav-label">Biblio</span>
      </Link>

      {/* Bouton + central (Nouvelle leçon) */}
      <button
        className="bottom-nav-plus"
        onClick={() => router.push('/learn')}
        aria-label="Nouvelle leçon"
      >
        <span style={{ fontSize: '1.6rem', lineHeight: 1, color: '#fff' }}>＋</span>
      </button>

      {/* Quiz espacé */}
      <Link href="/reviews" className={`bottom-nav-item ${isActive('/reviews') ? 'active' : ''}`}>
        <span className="bottom-nav-icon">🧠</span>
        <span className="bottom-nav-label">Quiz</span>
      </Link>

      {/* Profil */}
      <Link href="/profile" className={`bottom-nav-item ${isActive('/profile') ? 'active' : ''}`}>
        <span className="bottom-nav-icon">👤</span>
        <span className="bottom-nav-label">Profil</span>
      </Link>
    </nav>
  );
}
