'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/layout/AuthGuard';
import { useAuth } from '@/lib/auth-context';
import { getDueReviewCards, updateReviewCard, addXP } from '@/lib/firestore';
import QuizEngine from '@/components/features/QuizEngine';
import { useToast } from '@/components/ui/Toast';

/**
 * Page de Révision Espacée (Spaced Repetition)
 */
export default function ReviewsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();

  const [reviewCards, setReviewCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [xpGained, setXpGained] = useState(0);

  useEffect(() => {
    async function loadDueCards() {
      if (!user) return;
      console.log('[REVIEWS] Chargement des cartes de révision dues');
      try {
        const cards = await getDueReviewCards(user.uid);
        // Formatage des cartes pour s'adapter à QuizEngine
        const formattedQuestions = cards.map(c => ({
          id: c.id,
          question: c.question,
          options: c.options,
          correctIndex: c.correctIndex,
          explanation: c.explanation,
          // on garde la ref SM-2
          sm2Data: { interval: c.interval, repetition: c.repetitions, easeFactor: c.easeFactor }
        }));
        setReviewCards(formattedQuestions);
      } catch (error) {
        console.error('[REVIEWS] Erreur', error);
      } finally {
        setLoading(false);
      }
    }
    loadDueCards();
  }, [user]);

  const handleReviewComplete = async (score: number, wrongAnswers: any[]) => {
    if (!user) return;
    console.log('[REVIEWS] Session terminée, score:', score);
    
    let localXp = 0;
    
    try {
      const wrongIds = new Set(wrongAnswers.map(w => w.id));
      const promises = reviewCards.map((card) => {
        const isCorrect = !wrongIds.has(card.id);
        if (isCorrect) localXp += 3; // +3 XP par bonne réponse de révision
        
        // Simule une mise à jour des paramètres SM-2
        const updates = { 
          easeFactor: isCorrect ? 2.6 : 2.0,
          repetitions: isCorrect ? card.repetitions + 1 : 0
        };
        return updateReviewCard(user.uid, card.id, updates);
      });
      
      await Promise.all(promises);
      
      if (localXp > 0) {
        await addXP(user.uid, localXp);
      }
      
      setXpGained(localXp);
      setCompleted(true);
      addToast(`Révisions terminées ! +${localXp} XP`, 'success');
      
    } catch (error) {
      console.error('[REVIEWS] Erreur lors de la maj SM-2', error);
      addToast("Erreur lors de la sauvegarde", 'error');
    }
  };

  if (loading) {
    return <div className="spinner-lg mt-20 mx-auto"></div>;
  }

  return (
    <AuthGuard>
      <div className="page-wrapper bg-gray-50">
        <main className="page-content container max-w-2xl py-8">
          
          {!completed ? (
            <>
              <div className="mb-6 text-center">
                <h1 className="text-3xl font-bold">Révisions du jour 🧠</h1>
                <p className="text-gray-600">{reviewCards.length} cartes à réviser</p>
              </div>
              
              {reviewCards.length > 0 ? (
                <QuizEngine questions={reviewCards} onComplete={handleReviewComplete} theme="Révision" />
              ) : (
                <div className="card card-glass p-12 text-center mt-12">
                  <div className="text-6xl mb-4">✨</div>
                  <h2 className="text-2xl font-bold mb-2">Tout est à jour !</h2>
                  <p className="text-gray-600 mb-6">Tu n'as aucune carte à réviser pour le moment.</p>
                  <button className="btn btn-primary" onClick={() => router.push('/dashboard')}>
                    Retour au Dashboard
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="card card-elevated p-8 text-center mt-12">
              <h1 className="text-3xl font-bold mb-4">Excellent travail ! 🎉</h1>
              <p className="text-xl mb-6">Tes circuits neuronaux sont renforcés.</p>
              <div className="text-4xl font-bold text-yellow-500 mb-8">+{xpGained} XP</div>
              <button className="btn btn-primary btn-lg" onClick={() => router.push('/dashboard')}>
                Continuer l'aventure
              </button>
            </div>
          )}

        </main>
      </div>
    </AuthGuard>
  );
}
