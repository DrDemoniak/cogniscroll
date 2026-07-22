'use client';

/**
 * app/flashcards/page.tsx
 * Système de flash cards automatiques basé sur les erreurs de quiz (ReviewCards).
 * Animation flip card 3D. Boutons 👍 / 👎 pour la révision espacée (SM-2).
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/layout/AuthGuard';
import Navbar from '@/components/layout/Navbar';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { getDueReviewCards, updateReviewCard, getAllReviewCards } from '@/lib/firestore';
import type { ReviewCard } from '@/lib/types';

// ── Algorithme SM-2 simplifié ──────────────────────────────────────────────
// quality: 5 = parfait, 3 = correct avec hésitation, 1 = raté
function sm2(card: ReviewCard, quality: 1 | 3 | 5): Partial<ReviewCard> {
  let { interval, easeFactor, repetitions } = card;

  if (quality >= 3) {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions += 1;
  } else {
    repetitions = 0;
    interval = 1;
  }

  // Ajuste le facteur de facilité (min 1.3)
  easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval);

  return {
    interval,
    easeFactor,
    repetitions,
    nextReviewAt: nextDate.toISOString().split('T')[0],
  };
}

export default function FlashCardsPage() {
  const { user }        = useAuth();
  const router          = useRouter();
  const { addToast }    = useToast();

  const [cards,         setCards]         = useState<ReviewCard[]>([]);
  const [currentIndex,  setCurrentIndex]  = useState(0);
  const [isFlipped,     setIsFlipped]     = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [answered,      setAnswered]      = useState(0);
  const [session,       setSession]       = useState<{ correct: number; wrong: number }>({ correct: 0, wrong: 0 });
  const [done,          setDone]          = useState(false);
  const [isPractice,    setIsPractice]    = useState(false);

  // ── Chargement des cartes dues ou pratique ────────────────────────────────
  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        let due = await getDueReviewCards(user.uid);
        
        if (due.length === 0) {
          // Si rien à réviser, on lance une pratique libre avec max 10 cartes au hasard
          const allCards = await getAllReviewCards(user.uid, 50);
          due = [...allCards].sort(() => Math.random() - 0.5).slice(0, 10);
          if (due.length > 0) {
            setIsPractice(true);
            addToast('Rien à réviser ! Lancement du mode Pratique libre', 'success');
          }
        }
        
        const shuffled = [...due].sort(() => Math.random() - 0.5);
        setCards(shuffled);
      } catch (err) {
        console.error('[FLASHCARDS] Erreur chargement:', err);
        addToast('Erreur de chargement des flash cards', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const currentCard = cards[currentIndex];

  // ── Flip ────────────────────────────────────────────────────────────────
  const handleFlip = () => {
    if (!isFlipped) setIsFlipped(true);
  };

  // ── Réponse utilisateur ─────────────────────────────────────────────────
  const handleAnswer = async (quality: 1 | 3 | 5) => {
    if (!user || !currentCard) return;

    const isCorrect = quality >= 3;
    setSession(s => ({ ...s, correct: s.correct + (isCorrect ? 1 : 0), wrong: s.wrong + (isCorrect ? 0 : 1) }));

    // Met à jour la carte avec SM-2
    const updates = sm2(currentCard, quality);
    try {
      await updateReviewCard(user.uid, currentCard.id, updates);
      console.log(`[FLASHCARDS] Carte ${currentCard.id} mise à jour: interval=${updates.interval}j`);
    } catch (err) {
      console.error('[FLASHCARDS] Erreur mise à jour carte:', err);
    }

    setAnswered(a => a + 1);

    // Passer à la suivante
    if (currentIndex + 1 >= cards.length) {
      setDone(true);
    } else {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(i => i + 1), 300);
    }
  };

  // ── Écran de fin ────────────────────────────────────────────────────────
  if (done || (cards.length === 0 && !loading)) {
    return (
      <AuthGuard>
        <Navbar />
        <div className="page-wrapper">
          <main className="page-content" style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
            {cards.length === 0 ? (
              <>
                <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>✨</div>
                <h1>Rien à réviser !</h1>
                <p className="text-muted" style={{ marginBottom: 'var(--space-8)' }}>
                  Toutes tes flash cards sont à jour. Reviens après avoir fait des quiz pour en générer de nouvelles.
                </p>
              </>
            ) : (
              <>
                <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>🎉</div>
                <h1>Session terminée !</h1>
                <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', margin: 'var(--space-6) 0' }}>
                  <div className="card" style={{ padding: 'var(--space-6)', minWidth: 120 }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--accent-green)' }}>{session.correct}</div>
                    <div className="text-muted text-sm" style={{ marginTop: 4 }}>✅ Correct</div>
                  </div>
                  <div className="card" style={{ padding: 'var(--space-6)', minWidth: 120 }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--accent-red)' }}>{session.wrong}</div>
                    <div className="text-muted text-sm" style={{ marginTop: 4 }}>❌ À revoir</div>
                  </div>
                </div>
                <p className="text-muted" style={{ marginBottom: 'var(--space-8)' }}>
                  Les cartes difficiles seront re-proposées demain selon la méthode de répétition espacée.
                </p>
              </>
            )}
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => router.push('/dashboard')}>
                🏠 Tableau de bord
              </button>
              <button className="btn btn-secondary" onClick={() => router.push('/learn')}>
                📚 Nouvelle leçon
              </button>
            </div>
          </main>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Navbar />
      <div className="page-wrapper">
        <main className="page-content" style={{ maxWidth: 600, margin: '0 auto' }}>

          {/* ── Header ── */}
          <div style={{ marginBottom: 'var(--space-8)', textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.8rem', marginBottom: 'var(--space-2)' }}>🃏 Flash Cards</h1>
            <p className="text-muted">Révision espacée — mémorise mieux, pour plus longtemps</p>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-16)' }}>
              <div className="spinner" />
            </div>
          ) : currentCard ? (
            <>
              {/* Progression */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
                <span className="text-muted text-sm">Carte {currentIndex + 1} / {cards.length}</span>
                <span className="badge badge-surface">{currentCard.theme}</span>
              </div>
              <div className="progress-bar" style={{ marginBottom: 'var(--space-8)' }}>
                <div className="progress-bar-fill" style={{ width: `${((currentIndex) / cards.length) * 100}%` }} />
              </div>

              {/* Carte flip */}
              <div className="flashcard-scene" onClick={handleFlip}>
                <div className={`flashcard-card ${isFlipped ? 'flipped' : ''}`}>
                  {/* Recto — Question */}
                  <div className="flashcard-front">
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-4)' }}>
                      Question
                    </span>
                    <p style={{ fontSize: '1.15rem', fontWeight: 600, lineHeight: 1.5, color: 'var(--text-primary)' }}>
                      {currentCard.question}
                    </p>
                    <span className="flashcard-hint">👆 Clique pour révéler la réponse</span>
                  </div>

                  {/* Verso — Réponse */}
                  <div className="flashcard-back">
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-3)' }}>
                      Réponse
                    </span>
                    <p style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: 'var(--space-3)' }}>
                      {currentCard.options[currentCard.correctIndex]}
                    </p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {currentCard.explanation}
                    </p>
                  </div>
                </div>
              </div>

              {/* Boutons de réponse — affichés uniquement après flip */}
              {isFlipped && (
                <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', marginTop: 'var(--space-8)', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-lg"
                    style={{ background: 'oklch(0.60 0.22 25 / 0.15)', border: '2px solid var(--accent-red)', color: 'var(--accent-red)', minWidth: 140 }}
                    onClick={() => handleAnswer(1)}
                  >
                    😕 Je ne savais pas
                  </button>
                  <button
                    className="btn btn-lg"
                    style={{ background: 'oklch(0.82 0.17 70 / 0.15)', border: '2px solid var(--accent-gold)', color: 'var(--accent-gold)', minWidth: 140 }}
                    onClick={() => handleAnswer(3)}
                  >
                    🤔 Presque
                  </button>
                  <button
                    className="btn btn-lg"
                    style={{ background: 'oklch(0.72 0.18 145 / 0.15)', border: '2px solid var(--accent-green)', color: 'var(--accent-green)', minWidth: 140 }}
                    onClick={() => handleAnswer(5)}
                  >
                    ✅ Je savais !
                  </button>
                </div>
              )}
            </>
          ) : null}
        </main>
      </div>
    </AuthGuard>
  );
}
