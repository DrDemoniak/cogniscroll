'use client';

import AuthGuard from '@/components/layout/AuthGuard';
import { THEMES } from '@/lib/themes';
import Link from 'next/link';

/**
 * Catalogue des thèmes d'apprentissage
 */
export default function LearnCatalogPage() {
  console.log('[LEARN] Affichage du catalogue des thèmes');

  return (
    <AuthGuard>
      <div className="page-wrapper">
        <main className="page-content container">
          <div className="page-header mb-8">
            <h1 className="text-3xl font-bold">Que veux-tu apprendre aujourd'hui ? 📚</h1>
            <p className="text-gray-600 mt-2">Choisis un thème pour générer une nouvelle leçon sur-mesure.</p>
          </div>

          <div className="themes-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {THEMES.map(theme => (
              <Link href={`/learn/${theme.id}`} key={theme.id} className="theme-card card card-elevated card-clickable p-6 flex flex-col items-center text-center transition-transform hover:scale-105">
                <div className="text-5xl mb-4">{theme.emoji}</div>
                <h2 className="text-xl font-bold mb-2">{theme.name}</h2>
                <p className="text-sm text-gray-500">{theme.description || 'Explore ce domaine captivant.'}</p>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
