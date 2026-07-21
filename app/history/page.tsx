'use client';

/**
 * app/history/page.tsx
 * Historique complet de toutes les leçons terminées par l'utilisateur.
 * Filtrable par thème, triable par date.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/layout/AuthGuard';
import Navbar from '@/components/layout/Navbar';
import { useAuth } from '@/lib/auth-context';
import { getRecentLessons } from '@/lib/firestore';
import { getThemeById } from '@/lib/themes';
import type { SavedLesson } from '@/lib/types';

export default function HistoryPage() {
  const { user } = useAuth();
  const router   = useRouter();

  const [lessons,       setLessons]       = useState<SavedLesson[]>([]);
  const [filtered,      setFiltered]      = useState<SavedLesson[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [themeFilter,   setThemeFilter]   = useState('all');
  const [sortOrder,     setSortOrder]     = useState<'desc' | 'asc'>('desc');

  // ── Chargement de tout l'historique ──────────────────────────────────────
  useEffect(() => {
    async function load() {
      if (!user) return;
      console.log('[HISTORY] Chargement historique complet pour:', user.uid);
      try {
        // On récupère les 200 dernières leçons (max raisonnable)
        const all = await getRecentLessons(user.uid, 200);
        // Tri par date décroissante
        const sorted = all.sort((a, b) => {
          const aDate = a.completedAt?.toDate ? a.completedAt.toDate() : new Date(a.completedAt || 0);
          const bDate = b.completedAt?.toDate ? b.completedAt.toDate() : new Date(b.completedAt || 0);
          return bDate.getTime() - aDate.getTime();
        });
        setLessons(sorted);
        setFiltered(sorted);
        console.log('[HISTORY] Leçons chargées:', sorted.length);
      } catch (err) {
        console.error('[HISTORY] Erreur chargement:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  // ── Filtrage + tri ────────────────────────────────────────────────────────
  useEffect(() => {
    let result = [...lessons];
    if (themeFilter !== 'all') {
      result = result.filter(l => l.theme === themeFilter);
    }
    result.sort((a, b) => {
      const aDate = a.completedAt?.toDate ? a.completedAt.toDate() : new Date(a.completedAt || 0);
      const bDate = b.completedAt?.toDate ? b.completedAt.toDate() : new Date(b.completedAt || 0);
      return sortOrder === 'desc'
        ? bDate.getTime() - aDate.getTime()
        : aDate.getTime() - bDate.getTime();
    });
    setFiltered(result);
  }, [themeFilter, sortOrder, lessons]);

  // ── Thèmes uniques pour le filtre ────────────────────────────────────────
  const uniqueThemes = Array.from(new Set(lessons.map(l => l.theme))).filter(Boolean);

  // ── Format date ──────────────────────────────────────────────────────────
  const formatDate = (completedAt: any): string => {
    if (!completedAt) return '';
    if (completedAt?.toDate) return completedAt.toDate().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    if (typeof completedAt === 'string') return new Date(completedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    return '';
  };

  // ── Ouvrir une leçon ─────────────────────────────────────────────────────
  const handleOpen = (lesson: SavedLesson) => {
    sessionStorage.setItem('currentLesson',   JSON.stringify(lesson.content));
    sessionStorage.setItem('currentLessonId', lesson.id);
    sessionStorage.setItem('isFavorite',      String(lesson.isFavorite));
    router.push(`/learn/${lesson.theme}/lesson`);
  };

  return (
    <AuthGuard>
      <Navbar />
      <div className="page-wrapper">
        <main className="page-content">

          {/* ── Header ── */}
          <div style={{ marginBottom: 'var(--space-8)' }}>
            <h1>📚 Historique des leçons</h1>
            {!loading && (
              <p className="text-muted">{filtered.length} leçon{filtered.length > 1 ? 's' : ''} trouvée{filtered.length > 1 ? 's' : ''}</p>
            )}
          </div>

          {/* ── Filtres ── */}
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-6)', padding: 'var(--space-4)', background: 'var(--surface-secondary)', borderRadius: 'var(--radius-lg)' }}>
            {/* Filtre thème */}
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', flex: 1 }}>
              <button
                className={`btn btn-sm ${themeFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setThemeFilter('all')}
              >
                Tous
              </button>
              {uniqueThemes.map(theme => {
                const tc = getThemeById(theme);
                return (
                  <button
                    key={theme}
                    className={`btn btn-sm ${themeFilter === theme ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setThemeFilter(theme)}
                  >
                    {tc?.emoji || '📖'} {tc?.name || theme}
                  </button>
                );
              })}
            </div>
            {/* Tri */}
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
              title="Changer l'ordre"
            >
              {sortOrder === 'desc' ? '↓ Plus récent' : '↑ Plus ancien'}
            </button>
          </div>

          {/* ── Liste ── */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-16)' }}>
              <div className="spinner" />
            </div>
          ) : filtered.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {filtered.map((lesson, i) => {
                const tc = getThemeById(lesson.theme);
                return (
                  <div
                    key={lesson.id}
                    className="card card-clickable"
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-4)' }}
                    onClick={() => handleOpen(lesson)}
                  >
                    {/* Numéro + emoji thème */}
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: tc?.gradient || 'var(--surface-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.3rem',
                      flexShrink: 0,
                    }}>
                      {tc?.emoji || '📖'}
                    </div>

                    {/* Infos */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-1)', flexWrap: 'wrap' }}>
                        <span className="badge badge-surface" style={{ fontSize: '0.7rem' }}>{tc?.name || lesson.theme}</span>
                        {lesson.content?.difficulty && <span className="badge badge-surface" style={{ fontSize: '0.7rem' }}>💪 {lesson.content.difficulty}</span>}
                        {lesson.content?.estimatedMinutes && <span className="badge badge-surface" style={{ fontSize: '0.7rem' }}>⏱️ {lesson.content.estimatedMinutes} min</span>}
                        {lesson.isFavorite && <span style={{ fontSize: '0.8rem' }}>❤️</span>}
                      </div>
                      <p style={{ fontWeight: 600, margin: 0, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {lesson.content?.title || lesson.topic}
                      </p>
                      <p className="text-muted" style={{ margin: 0, fontSize: '0.8rem', marginTop: 2 }}>
                        {formatDate(lesson.completedAt)}
                      </p>
                    </div>

                    {/* Flèche */}
                    <span style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>›</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state card card-glass" style={{ padding: 'var(--space-16)', textAlign: 'center' }}>
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-title">Aucune leçon trouvée</div>
              <p className="empty-state-desc">
                {themeFilter !== 'all' ? 'Aucune leçon pour ce thème.' : 'Tu n\'as pas encore fait de leçon.'}
              </p>
              <button className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }} onClick={() => router.push('/learn')}>
                Commencer à apprendre
              </button>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
