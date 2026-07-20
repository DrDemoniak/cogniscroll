'use client';

/**
 * app/favorites/page.tsx
 * Page des leçons favorites.
 * Fix : accès aux champs corrects (content.title, completedAt, theme) et 
 * passage du contenu correct à sessionStorage pour le lecteur.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/layout/AuthGuard';
import Navbar from '@/components/layout/Navbar';
import { useAuth } from '@/lib/auth-context';
import { getFavoriteLessons, toggleFavorite } from '@/lib/firestore';
import { useToast } from '@/components/ui/Toast';
import type { SavedLesson } from '@/lib/types';

export default function FavoritesPage() {
  const { user } = useAuth();
  const router   = useRouter();
  const { addToast } = useToast();

  const [favorites, setFavorites] = useState<SavedLesson[]>([]);
  const [loading,   setLoading]   = useState(true);

  // ── Chargement des favoris ─────────────────────────────────────────────
  useEffect(() => {
    async function loadFavorites() {
      if (!user) return;
      console.log('[FAVORITES] Chargement des favoris pour uid:', user.uid);
      try {
        const favs = await getFavoriteLessons(user.uid);
        console.log('[FAVORITES] Favoris trouvés:', favs.length);
        setFavorites(favs);
      } catch (error) {
        console.error('[FAVORITES] Erreur chargement:', error);
        addToast('Erreur lors du chargement des favoris', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadFavorites();
  }, [user]);

  // ── Retirer un favori ──────────────────────────────────────────────────
  const handleRemove = async (e: React.MouseEvent, lesson: SavedLesson) => {
    e.stopPropagation();
    if (!user) return;
    console.log('[FAVORITES] Retrait favori:', lesson.id);
    try {
      await toggleFavorite(user.uid, lesson.id, false);
      setFavorites(prev => prev.filter(f => f.id !== lesson.id));
      addToast('💔 Retiré des favoris', 'success');
    } catch (err) {
      console.error('[FAVORITES] Erreur retrait:', err);
      addToast('Erreur lors du retrait', 'error');
    }
  };

  // ── Ouvrir une leçon favorite ──────────────────────────────────────────
  // On stocke le LessonContent (pas le SavedLesson entier) dans sessionStorage
  const handleOpenLesson = (lesson: SavedLesson) => {
    console.log('[FAVORITES] Ouverture leçon:', lesson.content?.title);
    sessionStorage.setItem('currentLesson',   JSON.stringify(lesson.content));
    sessionStorage.setItem('currentLessonId', lesson.id);
    // La leçon était déjà sauvegardée, donc on préserve le statut favori
    sessionStorage.setItem('isFavorite', 'true');
    // Navigue vers le bon thème
    router.push(`/learn/${lesson.theme}/lesson`);
  };

  // ── Format date ────────────────────────────────────────────────────────
  const formatDate = (completedAt: any): string => {
    if (!completedAt) return '';
    // Firestore Timestamp
    if (completedAt?.toDate) return completedAt.toDate().toLocaleDateString('fr-FR');
    // ISO string
    if (typeof completedAt === 'string') return new Date(completedAt).toLocaleDateString('fr-FR');
    return '';
  };

  return (
    <AuthGuard>
      <Navbar />
      <div className="page-wrapper">
        <main className="page-content">
          <div style={{ marginBottom: 'var(--space-8)' }}>
            <h1>Mes Favoris ❤️</h1>
            {!loading && (
              <p className="text-muted">
                {favorites.length} leçon{favorites.length > 1 ? 's' : ''} sauvegardée{favorites.length > 1 ? 's' : ''}
              </p>
            )}
          </div>

          {loading ? (
            <div className="loading-overlay" style={{ padding: 'var(--space-16)', position: 'relative', minHeight: 200 }}>
              <div className="spinner" />
            </div>
          ) : favorites.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-5)' }}>
              {favorites.map(fav => (
                <div
                  key={fav.id}
                  className="card card-clickable"
                  style={{ position: 'relative', padding: 'var(--space-6)' }}
                  onClick={() => handleOpenLesson(fav)}
                >
                  {/* Badge thème */}
                  <span className="badge badge-primary" style={{ marginBottom: 'var(--space-3)', display: 'inline-block' }}>
                    {fav.theme}
                  </span>

                  {/* Titre — le bon champ est content.title */}
                  <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 'var(--space-2)', paddingRight: 'var(--space-8)' }}>
                    {fav.content?.title || fav.topic || 'Leçon sans titre'}
                  </h3>

                  {/* Infos */}
                  <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
                    {fav.content?.estimatedMinutes && (
                      <span className="text-muted text-sm">⏱️ {fav.content.estimatedMinutes} min</span>
                    )}
                    {fav.content?.difficulty && (
                      <span className="text-muted text-sm">💪 {fav.content.difficulty}</span>
                    )}
                  </div>

                  {/* Date — le bon champ est completedAt */}
                  <p className="text-muted text-sm">
                    📅 {formatDate(fav.completedAt)}
                  </p>

                  {/* Bouton retrait */}
                  <button
                    style={{
                      position: 'absolute',
                      top: 'var(--space-4)',
                      right: 'var(--space-4)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      opacity: 0.5,
                      transition: 'opacity 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
                    onClick={e => handleRemove(e, fav)}
                    title="Retirer des favoris"
                  >
                    💔
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state card card-glass" style={{ padding: 'var(--space-16)', textAlign: 'center' }}>
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-title">Aucun favori</div>
              <p className="empty-state-desc">
                Lors de la lecture d'une leçon, clique sur 🤍 pour l'ajouter ici.
              </p>
              <button className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }} onClick={() => router.push('/learn')}>
                Découvrir les leçons
              </button>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
