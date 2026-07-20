'use client';

/**
 * app/learn/[theme]/lesson/page.tsx
 * Lecteur de leçon : récupère la leçon depuis sessionStorage, gère la complétion et le passage au quiz.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '@/components/layout/AuthGuard';
import Navbar from '@/components/layout/Navbar';
import LessonReader from '@/components/features/LessonReader';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { saveLesson, addXP, unlockBadges, recordDailyStats } from '@/lib/firestore';
import { checkNewBadges, getBadgeById, XP_REWARDS } from '@/lib/gamification';
import type { LessonContent } from '@/lib/types';

export default function LessonPage() {
  const router = useRouter();
  const params = useParams<{ theme: string }>();
  const { user, userProfile, refreshProfile } = useAuth();
  const { addToast } = useToast();

  const [lessonData, setLessonData] = useState<LessonContent | null>(null);
  const [lessonId,   setLessonId]   = useState<string>('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Charge la leçon depuis sessionStorage au montage
  useEffect(() => {
    const stored = sessionStorage.getItem('currentLesson');
    const storedId = sessionStorage.getItem('currentLessonId') || '';
    const storedFav = sessionStorage.getItem('isFavorite') === 'true';

    if (stored) {
      console.log('[LESSON] Leçon chargée depuis sessionStorage');
      setLessonData(JSON.parse(stored));
      setLessonId(storedId);
      setIsFavorite(storedFav);
    } else {
      console.warn('[LESSON] Pas de leçon en session, redirection');
      router.push('/learn');
    }
  }, [router]);

  /** Appelé quand l'utilisateur atteint la fin de la leçon */
  const handleLessonComplete = async () => {
    if (!user || !lessonData || isCompleted) return;

    console.log('[LESSON] Leçon complétée, sauvegarde en cours...');
    setIsCompleted(true);

    try {
      // 1. Sauvegarde Firestore
      const savedId = await saveLesson(user.uid, {
        theme: params.theme,
        topic: lessonData.topic,
        content: lessonData,
        isFavorite: false,
        completedAt: new Date().toISOString(),
      });
      setLessonId(savedId);
      sessionStorage.setItem('currentLessonId', savedId);

      // 2. Attribution XP lecture
      await addXP(user.uid, XP_REWARDS.LESSON_READ);
      await recordDailyStats(user.uid, XP_REWARDS.LESSON_READ);

      // 3. Mise à jour profil puis vérification badges
      await refreshProfile();

      // 4. Vérification des nouveaux badges (nécessite le profil à jour)
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
    }
  };

  /** Passe au quiz en stockant les données de la leçon */
  const handleGoToQuiz = () => {
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
  };

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
            onFavoriteToggle={() => setIsFavorite(f => !f)}
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
