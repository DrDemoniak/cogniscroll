'use client';

/**
 * app/dashboard/page.tsx
 * Tableau de bord principal de CogniScroll.
 * Affiche le streak, l'objectif du jour, les thèmes et les leçons récentes.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import AuthGuard from '@/components/layout/AuthGuard';
import Navbar from '@/components/layout/Navbar';
import { useToast } from '@/components/ui/Toast';
import { getRecentLessons, getDueReviewCards, unlockBadges } from '@/lib/firestore';
import { checkNewBadges, getLevelForXP, getLevelProgress, getBadgeById } from '@/lib/gamification';
import { THEMES } from '@/lib/themes';
import type { SavedLesson } from '@/lib/types';

export default function DashboardPage() {
  const { user, userProfile, refreshProfile } = useAuth();
  const { addToast } = useToast();

  const [recentLessons, setRecentLessons] = useState<SavedLesson[]>([]);
  const [dueCardsCount, setDueCardsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !userProfile) return;

    async function loadDashboardData() {
      try {
        console.log('[DASHBOARD] Chargement des données');
        setIsLoading(true);

        // Chargement parallèle des données
        const [lessons, cards] = await Promise.all([
          getRecentLessons(user!.uid, 3),
          getDueReviewCards(user!.uid),
        ]);

        setRecentLessons(lessons);
        setDueCardsCount(cards.length);

        // Vérification des nouveaux badges (attend userProfile)
        if (userProfile) {
          const newBadgeIds = checkNewBadges(userProfile);
          if (newBadgeIds.length > 0) {
            await unlockBadges(user!.uid, newBadgeIds);
            newBadgeIds.forEach(badgeId => {
              const badge = getBadgeById(badgeId);
              console.log(`[DASHBOARD] Nouveau badge : ${badgeId}`);
              addToast(`🏅 Badge débloqué : ${badge?.name || badgeId} ${badge?.emoji || ''}`, 'badge');
            });
            await refreshProfile();
          }
        }
      } catch (err) {
        console.error('[DASHBOARD] Erreur chargement:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, userProfile?.totalLessonsCompleted]);

  // Calcul de la progression XP vers le prochain niveau
  const xp = userProfile?.xp || 0;
  const level = userProfile?.level || 1;
  const levelInfo = getLevelForXP(xp);
  const { progressPercent } = getLevelProgress(xp);

  // Progression quotidienne
  const dailyProgress = userProfile?.dailyProgress || 0;
  const dailyGoal     = userProfile?.dailyGoal || 2;
  const dailyPct      = Math.min(100, Math.round((dailyProgress / dailyGoal) * 100));

  const firstName = userProfile?.displayName?.split(' ')[0] || 'Explorateur';

  return (
    <AuthGuard>
      <Navbar />
      <div className="page-wrapper">
        <main className="page-content">

          {/* ── HEADER ── */}
          <div className="page-header">
            <h1>Bonjour {firstName} ! 👋</h1>
            <p>Prêt à apprendre quelque chose de nouveau aujourd'hui ?</p>
          </div>

          {/* ── HERO : STREAK + OBJECTIF ── */}
          <div className="dashboard-hero" style={{ marginBottom: 'var(--space-8)' }}>

            {/* Streak */}
            <div className="streak-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                <span style={{ fontSize: '1.5rem' }}>🔥</span>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Série actuelle</h2>
              </div>
              <div className="streak-number">
                <span className="flame">🔥</span> {userProfile?.streak || 0}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {(userProfile?.streak || 0) > 0
                  ? `${userProfile!.streak} jour${userProfile!.streak > 1 ? 's' : ''} de suite — Continue !`
                  : "Commence ta série aujourd'hui !"}
              </p>

              {/* Barre XP */}
              <div style={{ marginTop: 'var(--space-5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
                  <span className="level-badge">Niv. {level} — {levelInfo.name}</span>
                  <span className="xp-amount">{xp} XP</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            </div>

            {/* Objectif du jour */}
            <div className="card card-elevated" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'var(--space-4)' }}>
              <div>
                <h2 style={{ fontWeight: 700, marginBottom: 'var(--space-1)' }}>🎯 Objectif du jour</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {dailyProgress >= dailyGoal
                    ? "Objectif atteint ! Tu es en feu ! 🎉"
                    : `${dailyGoal - dailyProgress} leçon${dailyGoal - dailyProgress > 1 ? 's' : ''} restante${dailyGoal - dailyProgress > 1 ? 's' : ''}`}
                </p>
              </div>

              {/* Anneau SVG objectif */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
                <svg width="80" height="80" viewBox="0 0 80 80" style={{ filter: 'drop-shadow(0 0 12px var(--primary-glow))' }}>
                  <circle cx="40" cy="40" r="32" fill="none" stroke="var(--bg-elevated)" strokeWidth="8" />
                  <circle
                    cx="40" cy="40" r="32" fill="none"
                    stroke="url(#grad)" strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 32}`}
                    strokeDashoffset={`${2 * Math.PI * 32 * (1 - dailyPct / 100)}`}
                    transform="rotate(-90 40 40)"
                    style={{ transition: 'stroke-dashoffset 800ms ease' }}
                  />
                  <defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="var(--primary)" />
                      <stop offset="100%" stopColor="var(--secondary)" />
                    </linearGradient>
                  </defs>
                  <text x="40" y="45" textAnchor="middle" fill="var(--text-primary)" fontSize="14" fontWeight="800">
                    {dailyProgress}/{dailyGoal}
                  </text>
                </svg>

                {/* Stats rapides */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {userProfile?.totalLessonsCompleted || 0}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>leçons totales</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-gold)' }}>{xp}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>XP total</div>
                  </div>
                </div>
              </div>

              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${dailyPct}%` }} />
              </div>
            </div>
          </div>

          {/* ── CTA PRINCIPALE ── */}
          <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-8)', flexWrap: 'wrap' }}>
            <Link href="/learn" className="btn btn-primary btn-lg" style={{ flex: 1, minWidth: 200 }}>
              🚀 Commencer une leçon
            </Link>
            {dueCardsCount > 0 && (
              <Link href="/reviews" className="btn btn-secondary btn-lg" style={{ flex: 1, minWidth: 200 }}>
                🧠 {dueCardsCount} révision{dueCardsCount > 1 ? 's' : ''} due{dueCardsCount > 1 ? 's' : ''}
              </Link>
            )}
          </div>

          {/* ── THÈMES ── */}
          <section style={{ marginBottom: 'var(--space-10)' }}>
            <h2 style={{ marginBottom: 'var(--space-6)' }}>Explorer les thèmes</h2>
            <div className="themes-grid">
              {THEMES.map(theme => (
                <Link
                  href={`/learn/${theme.id}`}
                  key={theme.id}
                  className="theme-card"
                  style={{ background: theme.gradient, textDecoration: 'none' }}
                >
                  <div className="theme-card-content">
                    <span className="theme-emoji">{theme.emoji}</span>
                    <div className="theme-name">{theme.name}</div>
                    <div className="theme-desc">{theme.description}</div>
                    {(userProfile?.themeProgress?.[theme.id] || 0) > 0 && (
                      <div className="theme-progress-label">
                        ✓ {userProfile!.themeProgress[theme.id]} leçon{userProfile!.themeProgress[theme.id] > 1 ? 's' : ''} complétée{userProfile!.themeProgress[theme.id] > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* ── LEÇONS RÉCENTES ── */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
              <h2>Leçons récentes</h2>
              <Link href="/favorites" className="btn btn-ghost btn-sm">Voir les favoris →</Link>
            </div>

            {isLoading ? (
              <div className="loading-overlay" style={{ padding: 'var(--space-8)' }}>
                <div className="spinner" />
                <span style={{ color: 'var(--text-muted)' }}>Chargement...</span>
              </div>
            ) : recentLessons.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
                {recentLessons.map(lesson => (
                  <div key={lesson.id} className="card card-clickable"
                    onClick={() => {
                      sessionStorage.setItem('currentLesson', JSON.stringify(lesson.content));
                      sessionStorage.setItem('currentLessonId', lesson.id);
                      sessionStorage.setItem('isFavorite', String(lesson.isFavorite));
                      window.location.href = `/learn/${lesson.theme}/lesson`;
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                      <span className="badge badge-surface">{THEMES.find(t => t.id === lesson.theme)?.emoji} {lesson.theme}</span>
                      {lesson.isFavorite && <span>❤️</span>}
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--text-primary)' }}>
                      {lesson.content?.title || lesson.topic}
                    </h3>
                    <p className="text-muted text-sm">
                      {lesson.content?.estimatedMinutes || 3} min · {lesson.content?.difficulty || 'débutant'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-state-icon">📚</span>
                <div className="empty-state-title">Aucune leçon pour l'instant</div>
                <p className="empty-state-desc">Lance ta première leçon pour commencer à apprendre !</p>
                <Link href="/learn" className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }}>
                  Explorer les thèmes
                </Link>
              </div>
            )}
          </section>

        </main>
      </div>
    </AuthGuard>
  );
}
