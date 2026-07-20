/**
 * lib/spaced-repetition.ts
 * Algorithme SM-2 simplifié pour la révision espacée.
 *
 * L'algorithme SM-2 (SuperMemo 2) adapte l'intervalle de répétition
 * selon la qualité de la réponse : une bonne réponse repousse la prochaine
 * révision, une mauvaise la rapproche.
 */

import type { ReviewCard } from './types';

// Qualité de la réponse (0-5 dans SM-2 original, simplifié ici en 3 valeurs)
export type ResponseQuality = 'forgot' | 'hard' | 'easy';

// Facteur d'aisance initial (défaut SM-2 = 2.5)
const INITIAL_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;

/**
 * Applique l'algorithme SM-2 pour calculer le prochain intervalle.
 *
 * @param card - Carte de révision actuelle
 * @param quality - Qualité de la réponse de l'utilisateur
 * @returns Carte mise à jour avec le nouvel intervalle et la prochaine date
 */
export function updateCardAfterReview(
  card: ReviewCard,
  quality: ResponseQuality
): ReviewCard {
  // [LOG][SM-2] Calcul du prochain intervalle
  console.log(`[SM-2] Carte "${card.question.slice(0, 30)}..." - qualité: ${quality}`);

  let { interval, easeFactor, repetitions } = card;

  if (quality === 'forgot') {
    // Oubli : on remet à 0
    interval = 1;
    repetitions = 0;
    easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.2);
  } else {
    // Réponse correcte (difficile ou facile)
    repetitions += 1;

    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }

    // Ajustement du facteur selon la difficulté
    if (quality === 'hard') {
      easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.15);
    } else {
      // 'easy' : on augmente légèrement le facteur
      easeFactor = Math.min(3.0, easeFactor + 0.1);
    }
  }

  // Calcul de la prochaine date de révision
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);
  const nextReviewAt = nextReview.toISOString().split('T')[0];

  console.log(`[SM-2] Nouvel intervalle: ${interval}j, prochain: ${nextReviewAt}`);

  return {
    ...card,
    interval,
    easeFactor,
    repetitions,
    nextReviewAt,
  };
}

/**
 * Crée une nouvelle carte de révision depuis une question de quiz ratée.
 */
export function createReviewCard(
  uid: string,
  lessonId: string,
  theme: string,
  question: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }
): Omit<ReviewCard, 'id'> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return {
    uid,
    lessonId,
    theme,
    question: question.question,
    options: question.options,
    correctIndex: question.correctIndex,
    explanation: question.explanation,
    nextReviewAt: tomorrow.toISOString().split('T')[0],
    interval: 1,
    easeFactor: INITIAL_EASE_FACTOR,
    repetitions: 0,
  };
}

/**
 * Filtre les cartes dues pour révision (nextReviewAt <= aujourd'hui).
 */
export function getDueCards(cards: ReviewCard[]): ReviewCard[] {
  const today = new Date().toISOString().split('T')[0];
  return cards.filter((c) => c.nextReviewAt <= today);
}
