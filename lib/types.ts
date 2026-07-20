/**
 * lib/types.ts
 * Définitions TypeScript partagées dans toute l'application CogniScroll.
 */

// ─────────────────────────────────────────────
// Profil utilisateur (stocké dans Firestore)
// ─────────────────────────────────────────────

export interface UserSettings {
  dyslexicFont: boolean;       // active la police OpenDyslexic
  audioSpeed: number;           // 0.75 | 1 | 1.25 | 1.5 | 2
  colorTheme: 'dark' | 'light';
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  xp: number;
  level: number;
  streak: number;
  lastActivityDate: string;      // 'YYYY-MM-DD' — pour le calcul de streak
  totalLessonsCompleted: number;
  dailyGoal: number;             // 1, 2, 3 ou 5
  dailyProgress: number;         // remis à 0 chaque jour
  settings: UserSettings;
  badges: string[];              // tableau d'IDs de badges débloqués
  createdAt: any;                // Firestore Timestamp
  themeProgress: Record<string, number>; // { 'histoire': 5, 'science': 2, ... }
}

// ─────────────────────────────────────────────
// Leçons (générées par Gemini)
// ─────────────────────────────────────────────

export interface LessonSection {
  title: string;
  content: string;
  keyPoints: string[];
}

export interface LessonContent {
  title: string;
  theme: string;
  topic: string;
  estimatedMinutes: number;
  difficulty: 'débutant' | 'intermédiaire' | 'avancé';
  sections: LessonSection[];
  didYouKnow: string;
  summary: string;
}

/** Leçon sauvegardée dans Firestore sous users/{uid}/lessons/{id} */
export interface SavedLesson {
  id: string;
  uid: string;
  theme: string;
  topic: string;
  content: LessonContent;
  completedAt: any;   // Firestore Timestamp
  isFavorite: boolean;
}

// ─────────────────────────────────────────────
// Quiz
// ─────────────────────────────────────────────

export interface QuizQuestion {
  question: string;
  options: string[];    // 4 options
  correctIndex: number; // index de la bonne réponse (0-3)
  explanation: string;  // explication affichée en cas d'erreur
}

export interface QuizSession {
  lessonId: string;
  lessonTitle: string;
  theme: string;
  questions: QuizQuestion[];
}

export interface QuizResult {
  id: string;
  uid: string;
  lessonId: string;
  lessonTitle: string;
  theme: string;
  score: number;         // nombre de bonnes réponses
  totalQuestions: number;
  stars: number;         // 1 (≥50%) | 2 (≥75%) | 3 (100%)
  completedAt: any;      // Firestore Timestamp
}

// ─────────────────────────────────────────────
// Révision espacée (SM-2)
// ─────────────────────────────────────────────

/** Carte de révision différée sauvegardée dans Firestore */
export interface ReviewCard {
  id: string;
  uid: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  theme: string;
  lessonId: string;
  nextReviewAt: string;  // ISO date string
  interval: number;      // jours avant la prochaine révision
  easeFactor: number;    // facteur d'aisance SM-2 (défaut: 2.5)
  repetitions: number;   // nombre de fois révisée avec succès
}

// ─────────────────────────────────────────────
// Thématiques
// ─────────────────────────────────────────────

export interface Theme {
  id: string;
  name: string;
  emoji: string;
  colorVar: string;     // variable CSS ex: '--theme-films'
  gradient: string;     // gradient CSS
  description: string;
  suggestedTopics: string[];
}

// ─────────────────────────────────────────────
// Gamification
// ─────────────────────────────────────────────

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  emoji: string;
  rarity: 'commun' | 'rare' | 'épique' | 'légendaire';
}

export interface LevelDefinition {
  level: number;
  name: string;
  xpRequired: number;  // XP total pour atteindre ce niveau
}

// ─────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────

export interface DailyStats {
  date: string;          // 'YYYY-MM-DD'
  lessonsCompleted: number;
  xpEarned: number;
}
