'use client';

/**
 * app/quiz/page.tsx
 * Page du moteur de quiz : charge les questions depuis l'API Gemini, gère les résultats, XP et révision espacée.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/layout/AuthGuard';
import Navbar from '@/components/layout/Navbar';
import QuizEngine from '@/components/features/QuizEngine';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import {
  saveQuizResult,
  addXP,
  addReviewCards,
  recordDailyStats,
  unlockBadges,
} from '@/lib/firestore';
import { checkNewBadges, computeQuizXP, computeStars, getBadgeById } from '@/lib/gamification';
import type { QuizQuestion } from '@/lib/types';

export default function QuizPage() {
  const router = useRouter();
  const { user, userProfile, refreshProfile } = useAuth();
  const { addToast } = useToast();

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [quizMeta,  setQuizMeta]  = useState<{ lessonId: string; theme: string } | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [summary,   setSummary]   = useState<{ score: number; total: number; xpEarned: number; stars: number } | null>(null);

  // Charge et génère le quiz depuis les données de session
  useEffect(() => {
    async function loadQuiz() {
      const raw = sessionStorage.getItem('quizLesson');
      if (!raw) {
        console.warn('[QUIZ] Pas de données de leçon en session, retour dashboard');
        router.push('/dashboard');
        return;
      }

      const { lessonId, lessonTitle, lessonSummary, lessonSections, theme } = JSON.parse(raw);
      setQuizMeta({ lessonId, theme });

      console.log('[QUIZ] Génération du quiz pour:', lessonTitle);
      try {
        const res = await fetch('/api/generate-quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonTitle, lessonSummary, lessonSections }),
        });

        if (!res.ok) throw new Error('Erreur API quiz');
        const data = await res.json();
        setQuestions(data.quiz.questions);
      } catch (err) {
        console.error('[QUIZ] Erreur génération:', err);
        setError('Impossible de générer le quiz. Réessaie plus tard.');
      } finally {
        setLoading(false);
      }
    }

    loadQuiz();
  }, [router]);

  /** Appelé par QuizEngine quand toutes les questions sont répondues */
  const handleQuizComplete = async (score: number, wrongAnswers: QuizQuestion[]) => {
    if (!user || !quizMeta) return;
    console.log(`[QUIZ] Terminé — score: ${score}/${questions.length}`);

    try {
      const total    = questions.length;
      const xpEarned = computeQuizXP(score, total);
      const stars    = computeStars(score, total);

      // 1. Sauvegarde du résultat
      await saveQuizResult(user.uid, {
        lessonId: quizMeta.lessonId,
        lessonTitle: sessionStorage.getItem('quizLesson')
          ? JSON.parse(sessionStorage.getItem('quizLesson')!).lessonTitle
          : 'Leçon',
        theme: quizMeta.theme,
        score,
        totalQuestions: total,
        stars,
        completedAt: new Date().toISOString(),
      });

      // 2. XP
      await addXP(user.uid, xpEarned);
      await recordDailyStats(user.uid, xpEarned);

      // 3. Cartes de révision espacée pour les mauvaises réponses
      if (wrongAnswers.length > 0) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        await addReviewCards(
          user.uid,
          wrongAnswers.map(q => ({
            uid: user.uid,
            question: q.question,
            options: q.options,
            correctIndex: q.correctIndex,
            explanation: q.explanation,
            theme: quizMeta.theme,
            lessonId: quizMeta.lessonId,
            nextReviewAt: tomorrow.toISOString().split('T')[0],
            interval: 1,
            easeFactor: 2.5,
            repetitions: 0,
          }))
        );
        console.log(`[QUIZ] ${wrongAnswers.length} cartes de révision créées`);
      }

      // 4. Vérification des nouveaux badges
      await refreshProfile();
      if (userProfile) {
        const newBadgeIds = checkNewBadges({
          ...userProfile,
          xp: userProfile.xp + xpEarned,
        });
        if (newBadgeIds.length > 0) {
          await unlockBadges(user.uid, newBadgeIds);
          newBadgeIds.forEach(id => {
            const b = getBadgeById(id);
            addToast(`🏅 ${b?.name || id} ${b?.emoji || ''}`, 'badge');
          });
        }
      }

      // 5. Toast XP
      addToast(`⚡ +${xpEarned} XP — ${score}/${total} bonnes réponses`, 'xp');

      setSummary({ score, total, xpEarned, stars });
    } catch (err) {
      console.error('[QUIZ] Erreur sauvegarde:', err);
      addToast('Erreur de sauvegarde des résultats', 'error');
    }
  };

  // États de chargement / erreur
  if (loading) {
    return (
      <AuthGuard>
        <Navbar />
        <div className="loading-overlay min-h-screen">
          <div className="spinner spinner-lg" />
          <p style={{ color: 'var(--text-muted)' }}>Gemini prépare ton quiz...</p>
        </div>
      </AuthGuard>
    );
  }

  if (error) {
    return (
      <AuthGuard>
        <Navbar />
        <div className="loading-overlay min-h-screen">
          <span style={{ fontSize: '3rem' }}>😕</span>
          <p style={{ color: 'var(--accent-red)' }}>{error}</p>
          <button className="btn btn-primary" onClick={() => router.push('/learn')}>
            Retour au catalogue
          </button>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Navbar />
      <div className="page-wrapper">
        <main className="page-content" style={{ maxWidth: 680, margin: '0 auto' }}>

          {!summary ? (
            <QuizEngine
              questions={questions}
              onComplete={handleQuizComplete}
              theme={quizMeta?.theme || ''}
            />
          ) : (
            /* Écran de résultats */
            <div className="quiz-result-card card card-elevated" style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
              <div className="quiz-stars">
                {Array.from({ length: 3 }).map((_, i) => (
                  <span key={i} style={{ opacity: i < summary.stars ? 1 : 0.25 }}>⭐</span>
                ))}
              </div>
              <h1 style={{ marginBottom: 'var(--space-4)' }}>Quiz terminé ! 🎉</h1>
              <div style={{ fontSize: '3rem', fontWeight: 900, marginBottom: 'var(--space-4)', fontFamily: 'var(--font-heading)' }}>
                {summary.score} <span style={{ color: 'var(--text-muted)', fontSize: '2rem' }}>/ {summary.total}</span>
              </div>
              <div className="badge badge-gold" style={{ fontSize: '1rem', padding: '0.5rem 1.2rem', margin: '0 auto var(--space-6)' }}>
                ⚡ +{summary.xpEarned} XP gagnés
              </div>
              <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-8)' }}>
                {summary.score === summary.total
                  ? 'Parfait ! Tu maîtrises ce sujet !'
                  : summary.score >= summary.total / 2
                  ? 'Bon travail ! Quelques révisions te perfectionneront.'
                  : "Continue à t'entraîner, tu vas y arriver !"}
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-primary btn-lg" onClick={() => router.push('/dashboard')}>
                  🏠 Tableau de bord
                </button>
                <button className="btn btn-secondary" onClick={() => router.push('/learn')}>
                  📚 Nouvelle leçon
                </button>
                {summary.score < summary.total && (
                  <button className="btn btn-ghost" onClick={() => router.push('/reviews')}>
                    🧠 Réviser maintenant
                  </button>
                )}
              </div>
            </div>
          )}

        </main>
      </div>
    </AuthGuard>
  );
}
