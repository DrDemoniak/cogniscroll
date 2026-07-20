'use client';

/**
 * app/learn/[theme]/lesson/page.tsx
 * Lecteur de leçon : récupère la leçon depuis sessionStorage, gère la complétion et le passage au quiz.
 * 
 * Fix double comptage : si currentLessonId est déjà défini au chargement,
 * la leçon a déjà été sauvegardée → on skip la sauvegarde.
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '@/components/layout/AuthGuard';
import Navbar from '@/components/layout/Navbar';
import LessonReader from '@/components/features/LessonReader';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { saveLesson, addXP, unlockBadges, recordDailyStats, toggleFavorite } from '@/lib/firestore';
import { checkNewBadges, getBadgeById, XP_REWARDS } from '@/lib/gamification';
import type { LessonContent } from '@/lib/types';

export default function LessonPage() {
  const router = useRouter();
  const params = useParams<{ theme: string }>();
  const { user, userProfile, refreshProfile } = useAuth();
  const { addToast } = useToast();

  const [lessonData,  setLessonData]  = useState<LessonContent | null>(null);
  const [lessonId,    setLessonId]    = useState<string>('');
  const [isFavorite,  setIsFavorite]  = useState(false);
  // isCompleted = true dès le mount si la leçon était déjà sauvegardée (evite le double comptage)
  const [isCompleted, setIsCompleted] = useState(false);

  // ── Chargement depuis sessionStorage ──────────────────────────────────
  useEffect(() => {
    const stored    = sessionStorage.getItem('currentLesson');
    const storedId  = sessionStorage.getItem('currentLessonId') || '';
    const storedFav = sessionStorage.getItem('isFavorite') === 'true';

    if (!stored) {
      console.warn('[LESSON] Pas de leçon en session, redirection');
      router.push('/learn');
      return;
    }

    console.log('[LESSON] Leçon chargée. ID existant:', storedId || '(nouveau)');
    setLessonData(JSON.parse(stored));
    setLessonId(storedId);
    setIsFavorite(storedFav);

    // Si la leçon a déjà un ID Firestore → elle a déjà été sauvegardée
    // On la marque complétée directement pour éviter le double comptage au rechargement
    if (storedId) {
      console.log('[LESSON] Leçon déjà sauvegardée (ID trouvé), marquage isCompleted=true');
      setIsCompleted(true);
    }
  }, [router]);

  // ── Toggle favori (sauvegarde en Firestore) ────────────────────────────
  const handleFavoriteToggle = useCallback(async () => {
    if (!user || !lessonId) {
      // Pas encore sauvegardée : juste un toggle local
      setIsFavorite(f => !f);
      return;
    }
    const newValue = !isFavorite;
    setIsFavorite(newValue);
    sessionStorage.setItem('isFavorite', String(newValue));
    try {
      await toggleFavorite(user.uid, lessonId, newValue);
      addToast(newValue ? '❤️ Ajouté aux favoris' : '💔 Retiré des favoris', 'success');
      console.log('[LESSON] Favori mis à jour:', newValue);
    } catch (err) {
      console.error('[LESSON] Erreur toggle favori:', err);
      addToast('Erreur lors de la mise à jour des favoris', 'error');
      setIsFavorite(f => !f); // rollback
    }
  }, [user, lessonId, isFavorite, addToast]);

  // ── Complétion de la leçon ─────────────────────────────────────────────
  const handleLessonComplete = useCallback(async () => {
    if (!user || !lessonData || isCompleted) return;

    console.log('[LESSON] Leçon complétée, sauvegarde en cours...');
    setIsCompleted(true);

    try {
      // 1. Sauvegarde Firestore (seulement si pas déjà sauvegardée)
      const savedId = await saveLesson(user.uid, {
        theme: params.theme,
        topic: lessonData.topic,
        content: lessonData,
        isFavorite: false,
        completedAt: new Date().toISOString(),
      });
      setLessonId(savedId);
      sessionStorage.setItem('currentLessonId', savedId);
      console.log('[LESSON] Sauvegardée avec ID:', savedId);

      // 2. XP + stats quotidiennes
      await addXP(user.uid, XP_REWARDS.LESSON_READ);
      await recordDailyStats(user.uid, XP_REWARDS.LESSON_READ);

      // 3. Refresh profil puis badges
      await refreshProfile();

      if (userProfile) {
        const newBadgeIds = checkNewBadges({
          ...userProfile,
          totalLessonsCompleted: userProfile.totalLessonsCompleted + 1,
          xp: userProfile.xp + XP_REWARDS.LESSON_READ,
        });
        if (newBadgeIds.length > 0) {
          await unlockBadges(user.uid, newBadgeIds);
          newBadgeIds.forEach(id => {
            const b = getBadgeById(id);
            addToast(`🏅 Badge débloqué : ${b?.name || id} ${b?.emoji || ''}`, 'badge');
          });
        }
      }

      addToast(`⚡ +${XP_REWARDS.LESSON_READ} XP — Leçon terminée !`, 'xp');
    } catch (err) {
      console.error('[LESSON] Erreur complétion:', err);
      addToast('Erreur lors de la sauvegarde', 'error');
      setIsCompleted(false); // Permet de réessayer
    }
  }, [user, lessonData, isCompleted, params.theme, userProfile, refreshProfile, addToast]);

  // ── Passage au quiz ────────────────────────────────────────────────────
  const handleGoToQuiz = useCallback(() => {
    if (!lessonData) return;
    console.log('[LESSON] Passage au quiz');
    sessionStorage.setItem('quizLesson', JSON.stringify({
      lessonId,
      lessonTitle: lessonData.title,
      lessonSummary: lessonData.summary,
      lessonSections: lessonData.sections,
      theme: params.theme,
    }));
    router.push('/quiz');
  }, [lessonData, lessonId, params.theme, router]);

  // ── Rendu de chargement ────────────────────────────────────────────────
  if (!lessonData) {
    return (
      <div className="loading-overlay min-h-screen">
        <div className="spinner spinner-lg" />
        <span style={{ color: 'var(--text-muted)' }}>Chargement de la leçon...</span>
      </div>
    );
  }

  return (
    <AuthGuard>
      <Navbar />
      <div className="page-wrapper">
        <main className="page-content" style={{ maxWidth: 760, margin: '0 auto' }}>
          <LessonReader
            lesson={lessonData}
            lessonId={lessonId}
            isFavorite={isFavorite}
            onFavoriteToggle={handleFavoriteToggle}
            onComplete={handleLessonComplete}
          />

          {/* Bouton quiz visible après complétion */}
          {isCompleted && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8) 0' }}>
              <button className="btn btn-primary btn-lg" onClick={handleGoToQuiz}>
                🎯 Passer au Quiz
              </button>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
