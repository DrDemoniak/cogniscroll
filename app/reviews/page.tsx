'use client';

/**
 * app/reviews/page.tsx
 * Hub de Révisions : offre le choix entre Quiz de révision dynamique et Flash Cards SM-2.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/layout/AuthGuard';
import Navbar from '@/components/layout/Navbar';
import { useAuth } from '@/lib/auth-context';
import { getRecentLessons, addXP, recordDailyStats, saveQuizResult } from '@/lib/firestore';
import QuizEngine from '@/components/features/QuizEngine';
import { useToast } from '@/components/ui/Toast';
import { computeQuizXP } from '@/lib/gamification';

export default function ReviewsPage() {
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();

  const [mode, setMode] = useState<'select' | 'quiz'>('select');
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [recentCount, setRecentCount] = useState(0);

  // ── Lancer un Quiz de Révision Dynamique ──────────────────────────────────
  const startDynamicQuiz = async () => {
    if (!user) return;
    setLoadingQuiz(true);
    console.log('[REVIEWS] Chargement des leçons récentes pour le quiz de révision...');
    try {
      const recent = await getRecentLessons(user.uid, 8);
      setRecentCount(recent.length);

      if (recent.length === 0) {
        addToast('Fais au moins une leçon avant de lancer un quiz de révision !', 'error');
        setLoadingQuiz(false);
        return;
      }

      // Appelle l'API generate-quiz avec les leçons récentes
      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recentLessons: recent }),
      });

      if (!res.ok) throw new Error('Erreur lors de la génération');

      const data = await res.json();
      if (data.quiz?.questions) {
        setQuizQuestions(data.quiz.questions);
        setMode('quiz');
        console.log('[REVIEWS] Quiz de révision prêt avec', data.quiz.questions.length, 'questions');
      } else {
        throw new Error('Questions invalides');
      }
    } catch (err) {
      console.error('[REVIEWS] Erreur génération quiz révision:', err);
      addToast('Impossible de générer le quiz de révision. Réessaie !', 'error');
    } finally {
      setLoadingQuiz(false);
    }
  };

  // ── Fin du Quiz de Révision ────────────────────────────────────────────────
  const handleQuizComplete = async (score: number, wrongAnswers: any[]) => {
    if (!user) return;
    console.log('[REVIEWS] Quiz de révision terminé avec le score:', score);
    const xp = computeQuizXP(score, quizQuestions.length);

    try {
      await saveQuizResult(user.uid, {
        lessonId: 'revision_mixte',
        lessonTitle: `Quiz Révision (${recentCount} leçons)`,
        theme: 'Révision Mixte',
        score,
        totalQuestions: quizQuestions.length,
        stars: score === quizQuestions.length ? 3 : score >= quizQuestions.length / 2 ? 2 : 1,
        completedAt: new Date().toISOString(),
      });

      await addXP(user.uid, xp);
      await recordDailyStats(user.uid, xp);
      await refreshProfile();

      addToast(`🎉 Quiz de révision validé ! +${xp} XP`, 'xp');
      setMode('select');
    } catch (err) {
      console.error('[REVIEWS] Erreur sauvegarde quiz révision:', err);
      addToast('Erreur lors de la sauvegarde du score', 'error');
    }
  };

  return (
    <AuthGuard>
      <Navbar />
      <div className="page-wrapper">
        <main className="page-content container max-w-4xl py-8">

          {mode === 'select' ? (
            <div>
              {/* En-tête */}
              <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
                <h1 style={{ fontSize: '2.2rem', marginBottom: 'var(--space-2)' }}>🧠 Espace Révisions</h1>
                <p className="text-muted" style={{ fontSize: '1.1rem' }}>
                  Choisis ta méthode préférée pour ancrer tes connaissances dans le temps.
                </p>
              </div>

              {/* Grille des 2 options */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-6)' }}>

                {/* Option 1 : Quiz de Révision Dynamique */}
                <div
                  className="card card-glass card-clickable"
                  style={{ padding: 'var(--space-8)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative' }}
                  onClick={startDynamicQuiz}
                >
                  <div style={{ fontSize: '3.5rem', marginBottom: 'var(--space-4)' }}>🎯</div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Quiz de Révision</h2>
                  <p className="text-muted" style={{ lineHeight: 1.6, marginBottom: 'var(--space-6)', flex: 1 }}>
                    Un QCM sur-mesure s'adaptant à tes **dernières leçons effectuées** (ADN, Histoire, Sciences...).
                  </p>
                  <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loadingQuiz}>
                    {loadingQuiz ? '⏳ Génération du quiz...' : '🚀 Lancer le Quiz'}
                  </button>
                </div>

                {/* Option 2 : Flash Cards */}
                <div
                  className="card card-glass card-clickable"
                  style={{ padding: 'var(--space-8)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
                  onClick={() => router.push('/flashcards')}
                >
                  <div style={{ fontSize: '3.5rem', marginBottom: 'var(--space-4)' }}>🃏</div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Flash Cards</h2>
                  <p className="text-muted" style={{ lineHeight: 1.6, marginBottom: 'var(--space-6)', flex: 1 }}>
                    Répétition espacée (SM-2) avec cartes 3D interactives pour une mémorisation à long terme.
                  </p>
                  <button className="btn btn-secondary btn-lg" style={{ width: '100%' }}>
                    ⚡ Réviser en Flash Cards
                  </button>
                </div>

              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <button className="btn btn-ghost" onClick={() => setMode('select')}>
                  ← Retour au choix
                </button>
                <h2>Quiz de Révision Dynamique</h2>
              </div>

              {quizQuestions.length > 0 && (
                <QuizEngine
                  questions={quizQuestions}
                  onComplete={handleQuizComplete}
                  theme="Révision Mixte"
                />
              )}
            </div>
          )}

        </main>
      </div>
    </AuthGuard>
  );
}
