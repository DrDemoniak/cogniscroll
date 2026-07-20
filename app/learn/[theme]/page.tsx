'use client';

/**
 * app/learn/[theme]/page.tsx
 * Page d'un thème : header, bouton "Nouvelle leçon", historique des leçons complétées.
 */

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/layout/AuthGuard';
import Navbar from '@/components/layout/Navbar';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { getLessonsByTheme } from '@/lib/firestore';
import { getThemeById } from '@/lib/themes';
import type { SavedLesson } from '@/lib/types';

export default function ThemePage({ params }: { params: Promise<{ theme: string }> }) {
  // Next.js 15 : params est une Promise
  const { theme: themeId } = use(params);
  const themeConfig = getThemeById(themeId);
  const router = useRouter();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [loading,      setLoading]      = useState(false);
  const [themeLessons, setThemeLessons] = useState<SavedLesson[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Charge les leçons déjà complétées dans ce thème
  useEffect(() => {
    async function loadHistory() {
      if (!user || !themeConfig) return;
      try {
        console.log(`[THEME] Chargement historique pour: ${themeId}`);
        const lessons = await getLessonsByTheme(user.uid, themeId);
        setThemeLessons(lessons);
      } catch (err) {
        console.error('[THEME] Erreur chargement historique:', err);
      } finally {
        setHistoryLoading(false);
      }
    }
    loadHistory();
  }, [user, themeId, themeConfig]);

  // Thème invalide
  if (!themeConfig) {
    return (
      <AuthGuard>
        <Navbar />
        <div className="page-wrapper">
          <div className="loading-overlay">
            <span style={{ fontSize: '3rem' }}>🔍</span>
            <h2>Thème introuvable</h2>
            <button className="btn btn-primary" onClick={() => router.push('/learn')}>
              Retour au catalogue
            </button>
          </div>
        </div>
      </AuthGuard>
    );
  }

  /** Génère une nouvelle leçon via l'API Gemini */
  const handleGenerateLesson = async () => {
    if (!themeConfig.suggestedTopics?.length) return;
    setLoading(true);
    console.log(`[THEME] Génération de leçon — thème: ${themeConfig.name}`);

    // Choisit un sujet aléatoire dans la liste des sujets suggérés
    const randomTopic = themeConfig.suggestedTopics[
      Math.floor(Math.random() * themeConfig.suggestedTopics.length)
    ];

    try {
      const res = await fetch('/api/generate-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme:   themeConfig.name,
          topic:   randomTopic,
          themeId: themeId,
        }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const { lesson } = await res.json();

      // Stocke la leçon dans sessionStorage pour le lecteur
      sessionStorage.setItem('currentLesson', JSON.stringify(lesson));
      sessionStorage.setItem('currentLessonId', '');
      sessionStorage.setItem('isFavorite', 'false');

      console.log('[THEME] Leçon générée:', lesson.title);
      router.push(`/learn/${themeId}/lesson`);
    } catch (err) {
      console.error('[THEME] Erreur génération:', err);
      addToast('Erreur lors de la génération. Réessaie !', 'error');
    } finally {
      setLoading(false);
    }
  };

  /** Recharge une ancienne leçon */
  const handleOpenLesson = (lesson: SavedLesson) => {
    sessionStorage.setItem('currentLesson', JSON.stringify(lesson.content));
    sessionStorage.setItem('currentLessonId', lesson.id);
    sessionStorage.setItem('isFavorite', String(lesson.isFavorite));
    router.push(`/learn/${themeId}/lesson`);
  };

  return (
    <AuthGuard>
      <Navbar />
      <div className="page-wrapper">

        {/* Overlay de chargement pendant la génération */}
        {loading && (
          <div
            className="modal-backdrop"
            style={{ zIndex: 'var(--z-modal)' }}
          >
            <div className="card card-elevated" style={{ padding: 'var(--space-10)', textAlign: 'center', maxWidth: 360 }}>
              <div className="spinner spinner-lg" style={{ margin: '0 auto var(--space-4)' }} />
              <h3>🧠 Gemini prépare ta leçon...</h3>
              <p className="text-muted" style={{ marginTop: 'var(--space-2)' }}>
                Génération d'une leçon sur {themeConfig.name}
              </p>
            </div>
          </div>
        )}

        <main className="page-content">

          {/* ── HEADER THÈME ── */}
          <div
            className="card"
            style={{
              background: themeConfig.gradient,
              border: 'none',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-10)',
              marginBottom: 'var(--space-8)',
              color: '#fff',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'relative', zIndex: 1 }}>
              <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: 'var(--space-3)' }}>
                {themeConfig.emoji}
              </span>
              <h1 style={{ color: '#fff', marginBottom: 'var(--space-2)' }}>{themeConfig.name}</h1>
              <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 'var(--space-6)', maxWidth: 480 }}>
                {themeConfig.description}
              </p>
              <button
                className="btn"
                style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', backdropFilter: 'blur(8px)' }}
                onClick={handleGenerateLesson}
                disabled={loading}
              >
                🎲 Générer une nouvelle leçon
              </button>
            </div>
          </div>

          {/* ── HISTORIQUE ── */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
              <h2>Leçons complétées</h2>
              {themeLessons.length > 0 && (
                <span className="badge badge-primary">{themeLessons.length} leçon{themeLessons.length > 1 ? 's' : ''}</span>
              )}
            </div>

            {historyLoading ? (
              <div className="loading-overlay" style={{ padding: 'var(--space-8)' }}>
                <div className="spinner" />
              </div>
            ) : themeLessons.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
                {themeLessons.map(lesson => (
                  <div
                    key={lesson.id}
                    className="card card-clickable"
                    onClick={() => handleOpenLesson(lesson)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                      {lesson.isFavorite && <span>❤️</span>}
                      <span className="badge badge-surface">{lesson.content?.difficulty || 'débutant'}</span>
                      <span className="badge badge-surface">{lesson.content?.estimatedMinutes || 3} min</span>
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
                      {lesson.content?.title || lesson.topic}
                    </h3>
                    <p className="text-muted text-sm">
                      {lesson.completedAt?.toDate
                        ? lesson.completedAt.toDate().toLocaleDateString('fr-FR')
                        : typeof lesson.completedAt === 'string'
                        ? new Date(lesson.completedAt).toLocaleDateString('fr-FR')
                        : ''}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-state-icon">🌱</span>
                <div className="empty-state-title">Aucune leçon pour l'instant</div>
                <p className="empty-state-desc">
                  Clique sur "Générer une nouvelle leçon" pour commencer ton parcours {themeConfig.name} !
                </p>
              </div>
            )}
          </section>

        </main>
      </div>
    </AuthGuard>
  );
}
