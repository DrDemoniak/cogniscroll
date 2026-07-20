/**
 * lib/gamification.ts
 * Système de gamification : XP, niveaux, badges et streaks.
 * Centralise toutes les règles de progression de CogniScroll.
 */

import type { BadgeDefinition, LevelDefinition, UserProfile } from './types';

// ─────────────────────────────────────────────
// CONSTANTES XP
// ─────────────────────────────────────────────

export const XP_REWARDS = {
  LESSON_READ: 15,          // leçon lue jusqu'au bout
  QUIZ_COMPLETE: 10,        // quiz terminé (peu importe le score)
  QUIZ_CORRECT_ANSWER: 5,   // par bonne réponse au quiz
  QUIZ_PERFECT: 20,         // bonus quiz 100%
  REVIEW_CORRECT: 3,        // révision espacée réussie
  STREAK_BONUS: 5,          // bonus par jour de streak (× streak count)
} as const;

// ─────────────────────────────────────────────
// NIVEAUX (20 niveaux)
// ─────────────────────────────────────────────

export const LEVELS: LevelDefinition[] = [
  { level: 1,  name: 'Novice',         xpRequired: 0     },
  { level: 2,  name: 'Curieux',        xpRequired: 50    },
  { level: 3,  name: 'Apprenti',       xpRequired: 130   },
  { level: 4,  name: 'Élève',          xpRequired: 250   },
  { level: 5,  name: 'Étudiant',       xpRequired: 420   },
  { level: 6,  name: 'Chercheur',      xpRequired: 650   },
  { level: 7,  name: 'Analyste',       xpRequired: 950   },
  { level: 8,  name: 'Expert',         xpRequired: 1350  },
  { level: 9,  name: 'Maître',         xpRequired: 1900  },
  { level: 10, name: 'Érudit',         xpRequired: 2650  },
  { level: 11, name: 'Savant',         xpRequired: 3600  },
  { level: 12, name: 'Intellectuel',   xpRequired: 4850  },
  { level: 13, name: 'Philosophe',     xpRequired: 6500  },
  { level: 14, name: 'Penseur',        xpRequired: 8700  },
  { level: 15, name: 'Visionnaire',    xpRequired: 11500 },
  { level: 16, name: 'Lumière',        xpRequired: 15000 },
  { level: 17, name: 'Oracle',         xpRequired: 19500 },
  { level: 18, name: 'Sage',           xpRequired: 25000 },
  { level: 19, name: 'Grand Sage',     xpRequired: 32000 },
  { level: 20, name: 'Omniscient',     xpRequired: 40000 },
];

/** Retourne la définition du niveau actuel pour un montant d'XP */
export function getLevelForXP(xp: number): LevelDefinition {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.xpRequired) current = lvl;
    else break;
  }
  return current;
}

/** Retourne le niveau suivant (ou undefined si niveau max) */
export function getNextLevel(currentLevel: number): LevelDefinition | undefined {
  return LEVELS.find((l) => l.level === currentLevel + 1);
}

/** Calcule le pourcentage de progression vers le prochain niveau */
export function getLevelProgress(xp: number): { progressPercent: number; xpInLevel: number; xpNeeded: number } {
  const current = getLevelForXP(xp);
  const next = getNextLevel(current.level);
  if (!next) return { progressPercent: 100, xpInLevel: 0, xpNeeded: 0 };

  const xpInLevel = xp - current.xpRequired;
  const xpNeeded = next.xpRequired - current.xpRequired;
  const progressPercent = Math.min(Math.round((xpInLevel / xpNeeded) * 100), 100);
  return { progressPercent, xpInLevel, xpNeeded };
}

// ─────────────────────────────────────────────
// BADGES (20 badges)
// ─────────────────────────────────────────────

export const BADGES: BadgeDefinition[] = [
  // Premiers pas
  { id: 'first_lesson',     name: 'Première Graine',   emoji: '🌱', rarity: 'commun',    description: 'Terminer ta 1ère leçon' },
  { id: 'first_quiz',       name: 'Premier Test',      emoji: '✏️',  rarity: 'commun',    description: 'Compléter ton 1er quiz' },
  { id: 'first_favorite',   name: 'Coup de Cœur',      emoji: '❤️',  rarity: 'commun',    description: 'Ajouter une leçon aux favoris' },

  // Streaks
  { id: 'streak_3',         name: 'En Feu',            emoji: '🔥', rarity: 'commun',    description: '3 jours de streak' },
  { id: 'streak_7',         name: 'Semaine Parfaite',  emoji: '⚡', rarity: 'rare',      description: '7 jours de streak' },
  { id: 'streak_30',        name: 'Diamant',           emoji: '💎', rarity: 'épique',    description: '30 jours de streak' },
  { id: 'streak_100',       name: 'Centurion',         emoji: '🏆', rarity: 'légendaire',description: '100 jours de streak' },

  // Quantité de leçons
  { id: 'lessons_10',       name: 'Lecteur Assidu',    emoji: '📚', rarity: 'commun',    description: '10 leçons terminées' },
  { id: 'lessons_50',       name: 'Rat de Bibliothèque',emoji: '🐀',rarity: 'rare',      description: '50 leçons terminées' },
  { id: 'lessons_100',      name: 'Encyclopédiste',    emoji: '📰', rarity: 'épique',    description: '100 leçons terminées' },

  // Quiz
  { id: 'quiz_perfect_5',   name: 'Perfectionniste',   emoji: '🎯', rarity: 'rare',      description: '5 quiz avec 100%' },
  { id: 'quiz_master',      name: 'Maître du Quiz',    emoji: '🏅', rarity: 'épique',    description: '20 quiz avec score parfait' },

  // Exploration des thèmes
  { id: 'explore_all',      name: 'Globe-Trotter',     emoji: '🌍', rarity: 'rare',      description: 'Explorer les 8 thématiques' },
  { id: 'theme_master',     name: 'Spécialiste',       emoji: '🎓', rarity: 'épique',    description: '10 leçons dans un même thème' },

  // XP
  { id: 'xp_1000',          name: 'Millionnaire',      emoji: '💰', rarity: 'commun',    description: 'Atteindre 1000 XP' },
  { id: 'xp_10000',         name: 'Grand Investisseur',emoji: '🤑', rarity: 'rare',      description: 'Atteindre 10000 XP' },

  // Speed
  { id: 'speed_3_day',      name: 'Éclair',            emoji: '⚡', rarity: 'commun',    description: '3 leçons en une journée' },

  // Révision
  { id: 'first_review',     name: 'Mémoire d\'Éléphant',emoji: '🐘',rarity: 'commun',    description: 'Compléter ta 1ère révision' },

  // Niveaux
  { id: 'level_10',         name: 'Érudit',            emoji: '🔮', rarity: 'rare',      description: 'Atteindre le niveau 10' },
  { id: 'level_20',         name: 'Omniscient',        emoji: '👁️', rarity: 'légendaire',description: 'Atteindre le niveau maximum (20)' },
];

/** Retourne la définition d'un badge par son ID */
export function getBadgeById(id: string): BadgeDefinition | undefined {
  return BADGES.find((b) => b.id === id);
}

/**
 * Vérifie quels nouveaux badges l'utilisateur a débloqué.
 * @returns tableau des IDs de badges nouvellement obtenus
 */
export function checkNewBadges(profile: UserProfile): string[] {
  const newBadges: string[] = [];
  const earned = profile.badges || [];

  const check = (id: string, condition: boolean) => {
    if (condition && !earned.includes(id)) newBadges.push(id);
  };

  // Premiers pas
  check('first_lesson',   profile.totalLessonsCompleted >= 1);
  check('first_favorite', (profile as any).hasFavorite === true); // flag temporaire

  // Streaks
  check('streak_3',   profile.streak >= 3);
  check('streak_7',   profile.streak >= 7);
  check('streak_30',  profile.streak >= 30);
  check('streak_100', profile.streak >= 100);

  // Leçons
  check('lessons_10',  profile.totalLessonsCompleted >= 10);
  check('lessons_50',  profile.totalLessonsCompleted >= 50);
  check('lessons_100', profile.totalLessonsCompleted >= 100);

  // Exploration tous les thèmes
  const exploredThemes = Object.values(profile.themeProgress || {}).filter((v) => v > 0).length;
  check('explore_all', exploredThemes >= 8);

  // Maître d'un thème
  const maxThemeProgress = Math.max(0, ...Object.values(profile.themeProgress || {}));
  check('theme_master', maxThemeProgress >= 10);

  // XP
  check('xp_1000',  profile.xp >= 1000);
  check('xp_10000', profile.xp >= 10000);

  // Speed (3 leçons par jour)
  check('speed_3_day', profile.dailyProgress >= 3);

  // Niveaux
  check('level_10', profile.level >= 10);
  check('level_20', profile.level >= 20);

  return newBadges;
}

// ─────────────────────────────────────────────
// STREAK
// ─────────────────────────────────────────────

/** Retourne la date du jour au format YYYY-MM-DD */
export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/** Retourne la date d'hier au format YYYY-MM-DD */
export function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

/**
 * Calcule le nouveau streak en fonction de la dernière activité.
 * - Même jour : streak inchangé
 * - Hier : streak + 1
 * - Avant hier ou plus : reset à 1
 */
export function computeStreak(lastActivityDate: string, currentStreak: number): number {
  const today = getTodayString();
  const yesterday = getYesterdayString();

  if (lastActivityDate === today) return currentStreak;
  if (lastActivityDate === yesterday) return currentStreak + 1;
  return 1; // streak brisé
}

// ─────────────────────────────────────────────
// CALCUL DES ÉTOILES
// ─────────────────────────────────────────────

/**
 * Calcule les étoiles obtenues selon le score du quiz.
 * 1★ = ≥50%, 2★ = ≥75%, 3★ = 100%
 */
export function computeStars(score: number, total: number): number {
  const ratio = score / total;
  if (ratio === 1) return 3;
  if (ratio >= 0.75) return 2;
  if (ratio >= 0.5) return 1;
  return 0;
}

/**
 * Calcule le total de XP gagné après un quiz.
 */
export function computeQuizXP(score: number, total: number): number {
  let xp = XP_REWARDS.QUIZ_COMPLETE;
  xp += score * XP_REWARDS.QUIZ_CORRECT_ANSWER;
  if (score === total) xp += XP_REWARDS.QUIZ_PERFECT;
  return xp;
}
