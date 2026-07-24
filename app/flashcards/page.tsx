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
import { getDueReviewCards, updateReviewCard, getAllReviewCards, getRecentLessons, addReviewCards, addXP } from '@/lib/firestore';
import type { ReviewCard } from '@/lib/types';

// ── Algorithme SM-2 simplifié ──────────────────────────────────────────────
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

  const [cards,         setCards]         = useState<(ReviewCard & { isGenerated?: boolean })[]>([]);
  const [currentIndex,  setCurrentIndex]  = useState(0);
  const [isFlipped,     setIsFlipped]     = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [session,       setSession]       = useState<{ correct: number; wrong: number }>({ correct: 0, wrong: 0 });
  const [done,          setDone]          = useState(false);
  const [xpEarned,      setXpEarned]      = useState(0);

  // ── Chargement des cartes dues + génération dynamique ────────────────────
  useEffect(() => {
    async function load() {
      if (!user) return;
      console.log('[FLASHCARDS] Chargement des cartes pour:', user.uid);
      try {
        const due = await getDueReviewCards(user.uid);
        const recentLessons = await getRecentLessons(user.uid, 8);

        let dynamicCards: (ReviewCard & { isGenerated?: boolean })[] = [];

        if (recentLessons.length > 0) {
          console.log('[FLASHCARDS] Génération de cartes dynamiques pour', recentLessons.length, 'leçons récentes');
          try {
            const res = await fetch('/api/generate-flashcards', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ recentLessons }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data.flashcards && Array.isArray(data.flashcards)) {
                dynamicCards = data.flashcards.map((fc: any, i: number) => ({
                  id: `gen_${Date.now()}_${i}`,
                  uid: user.uid,
                  question: fc.question,
                  options: fc.options || [fc.answer, 'Option B', 'Option C', 'Option D'],
                  correctIndex: fc.correctIndex || 0,
                  explanation: fc.explanation || fc.answer,
                  theme: fc.theme || 'Général',
                  lessonId: fc.lessonTitle || 'recent',
                  nextReviewAt: new Date().toISOString().split('T')[0],
                  interval: 1,
                  easeFactor: 2.5,
                  repetitions: 0,
                  isGenerated: true,
                }));
              }
            }
          } catch (genErr) {
            console.error('[FLASHCARDS] Erreur lors de la génération dynamique:', genErr);
          }
        }

        // Fusionne les cartes dues et les cartes dynamiques (en évitant les doublons)
        const combined = [...due, ...dynamicCards];

        if (combined.length === 0) {
          // Secours si aucune leçon n'existe encore
          const allCards = await getAllReviewCards(user.uid, 10);
          setCards(allCards);
        } else {
          // Mélange aléatoire
          const shuffled = [...combined].sort(() => Math.random() - 0.5);
          setCards(shuffled);
        }
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

    if (isCorrect) {
      setXpEarned(x => x + 3);
    }

    try {
      if (!currentCard.isGenerated) {
        // Carte existante : mise à jour SM-2 dans Firestore
        const updates = sm2(currentCard, quality);
        await updateReviewCard(user.uid, currentCard.id, updates);
      } else if (quality === 1) {
        // Carte dynamique non maîtrisée : enregistrement en base de données pour répétition SM-2 !
        console.log('[FLASHCARDS] Carte dynamique non maîtrisée -> ajout aux révisions SM-2');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        await addReviewCards(user.uid, [{
          uid: user.uid,
          question: currentCard.question,
          options: currentCard.options,
          correctIndex: currentCard.correctIndex,
          explanation: currentCard.explanation,
          theme: currentCard.theme,
          lessonId: currentCard.lessonId,
          nextReviewAt: tomorrow.toISOString().split('T')[0],
          interval: 1,
          easeFactor: 2.5,
          repetitions: 0,
        }]);
      }
    } catch (err) {
      console.error('[FLASHCARDS] Erreur traitement réponse:', err);
    }

    // Passer à la suivante
    if (currentIndex + 1 >= cards.length) {
      if (xpEarned + (isCorrect ? 3 : 0) > 0) {
        addXP(user.uid, xpEarned + (isCorrect ? 3 : 0)).catch(console.error);
      }
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
