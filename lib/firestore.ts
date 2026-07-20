/**
 * lib/firestore.ts
 * Toutes les opérations de lecture/écriture Firestore pour CogniScroll.
 * Chaque fonction est documentée avec son chemin de document cible.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  arrayUnion,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  UserProfile,
  SavedLesson,
  QuizResult,
  ReviewCard,
  DailyStats,
} from './types';
import { getLevelForXP, computeStreak, getTodayString } from './gamification';

// ─────────────────────────────────────────────
// PROFIL UTILISATEUR — users/{uid}
// ─────────────────────────────────────────────

/** Crée un profil utilisateur à l'inscription */
export async function createUserProfile(
  uid: string,
  email: string,
  displayName: string
): Promise<void> {
  console.log('[FIRESTORE] Création du profil utilisateur:', uid);
  const ref = doc(db, 'users', uid);
  const profile: Omit<UserProfile, 'uid'> = {
    displayName,
    email,
    xp: 0,
    level: 1,
    streak: 0,
    lastActivityDate: '',
    totalLessonsCompleted: 0,
    dailyGoal: 2,
    dailyProgress: 0,
    settings: {
      dyslexicFont: false,
      audioSpeed: 1,
      colorTheme: 'dark',
    },
    badges: [],
    createdAt: serverTimestamp(),
    themeProgress: {},
  };
  await setDoc(ref, profile);
}

/** Récupère le profil utilisateur ou null s'il n'existe pas */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  console.log('[FIRESTORE] Lecture profil:', uid);
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() } as UserProfile;
}

/** Met à jour des champs partiels du profil */
export async function updateUserProfile(
  uid: string,
  data: Partial<UserProfile>
): Promise<void> {
  console.log('[FIRESTORE] Mise à jour profil:', uid, Object.keys(data));
  await updateDoc(doc(db, 'users', uid), data as any);
}

/**
 * Enregistre l'activité quotidienne :
 * - Mise à jour du streak
 * - Réinitialisation du compteur journalier si nouveau jour
 * - Mise à jour du niveau si l'XP a changé
 */
export async function recordDailyActivity(uid: string, profile: UserProfile): Promise<void> {
  const today = getTodayString();
  const newStreak = computeStreak(profile.lastActivityDate, profile.streak);
  const newLevel = getLevelForXP(profile.xp).level;

  // Réinitialisation du compteur si c'est un nouveau jour
  const isNewDay = profile.lastActivityDate !== today;

  const updates: Partial<UserProfile> = {
    streak: newStreak,
    lastActivityDate: today,
    level: newLevel,
    ...(isNewDay ? { dailyProgress: 0 } : {}),
  };

  console.log(`[FIRESTORE] Activité quotidienne: streak=${newStreak}, newDay=${isNewDay}`);
  await updateDoc(doc(db, 'users', uid), updates as any);
}

/** Ajoute des XP et recalcule le niveau */
export async function addXP(uid: string, amount: number): Promise<void> {
  console.log(`[FIRESTORE] +${amount} XP pour uid:`, uid);
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return;

  const currentXP = snap.data().xp || 0;
  const newXP = currentXP + amount;
  const newLevel = getLevelForXP(newXP).level;

  await updateDoc(doc(db, 'users', uid), {
    xp: newXP,
    level: newLevel,
  });
}

/** Débloque un ou plusieurs badges */
export async function unlockBadges(uid: string, badgeIds: string[]): Promise<void> {
  if (badgeIds.length === 0) return;
  console.log('[FIRESTORE] Déblocage badges:', badgeIds);
  await updateDoc(doc(db, 'users', uid), {
    badges: arrayUnion(...badgeIds),
  });
}

/** Met à jour les paramètres utilisateur */
export async function updateSettings(
  uid: string,
  settings: Partial<UserProfile['settings']>
): Promise<void> {
  console.log('[FIRESTORE] Mise à jour paramètres:', settings);
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const current = snap.data().settings || {};
  await updateDoc(ref, { settings: { ...current, ...settings } });
}

// ─────────────────────────────────────────────
// LEÇONS — users/{uid}/lessons/{lessonId}
// ─────────────────────────────────────────────

/** Sauvegarde une leçon terminée */
export async function saveLesson(
  uid: string,
  lesson: Omit<SavedLesson, 'id' | 'uid'>
): Promise<string> {
  console.log('[FIRESTORE] Sauvegarde leçon:', lesson.content.title);
  const ref = collection(db, 'users', uid, 'lessons');
  const docRef = await addDoc(ref, {
    ...lesson,
    uid,
    completedAt: serverTimestamp(),
  });

  // Mise à jour des compteurs du profil
  const themeKey = `themeProgress.${lesson.theme}`;
  await updateDoc(doc(db, 'users', uid), {
    totalLessonsCompleted: increment(1),
    dailyProgress: increment(1),
    [themeKey]: increment(1),
  });

  return docRef.id;
}

/** Récupère les dernières leçons de l'utilisateur */
export async function getRecentLessons(
  uid: string,
  maxResults = 10
): Promise<SavedLesson[]> {
  console.log('[FIRESTORE] Lecture leçons récentes:', uid);
  const q = query(
    collection(db, 'users', uid, 'lessons'),
    orderBy('completedAt', 'desc'),
    limit(maxResults)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SavedLesson);
}

/** Récupère les leçons favorites */
export async function getFavoriteLessons(uid: string): Promise<SavedLesson[]> {
  console.log('[FIRESTORE] Lecture favoris:', uid);
  const q = query(
    collection(db, 'users', uid, 'lessons'),
    where('isFavorite', '==', true),
    orderBy('completedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SavedLesson);
}

/** Toggle le statut favori d'une leçon */
export async function toggleFavorite(
  uid: string,
  lessonId: string,
  isFavorite: boolean
): Promise<void> {
  console.log('[FIRESTORE] Toggle favori:', lessonId, isFavorite);
  await updateDoc(doc(db, 'users', uid, 'lessons', lessonId), { isFavorite });
}

/** Récupère les leçons d'un thème */
export async function getLessonsByTheme(
  uid: string,
  theme: string
): Promise<SavedLesson[]> {
  const q = query(
    collection(db, 'users', uid, 'lessons'),
    where('theme', '==', theme),
    orderBy('completedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SavedLesson);
}

// ─────────────────────────────────────────────
// QUIZ — users/{uid}/quizResults/{quizId}
// ─────────────────────────────────────────────

/** Sauvegarde le résultat d'un quiz */
export async function saveQuizResult(
  uid: string,
  result: Omit<QuizResult, 'id' | 'uid'>
): Promise<string> {
  console.log('[FIRESTORE] Sauvegarde quiz:', result.lessonId, 'score:', result.score);
  const ref = collection(db, 'users', uid, 'quizResults');
  const docRef = await addDoc(ref, {
    ...result,
    uid,
    completedAt: serverTimestamp(),
  });
  return docRef.id;
}

/** Récupère les résultats de quiz récents */
export async function getRecentQuizResults(
  uid: string,
  maxResults = 20
): Promise<QuizResult[]> {
  const q = query(
    collection(db, 'users', uid, 'quizResults'),
    orderBy('completedAt', 'desc'),
    limit(maxResults)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as QuizResult);
}

// ─────────────────────────────────────────────
// RÉVISION ESPACÉE — users/{uid}/reviews/{reviewId}
// ─────────────────────────────────────────────

/** Ajoute des cartes de révision (réponses incorrectes) */
export async function addReviewCards(
  uid: string,
  cards: Omit<ReviewCard, 'id'>[]
): Promise<void> {
  console.log('[FIRESTORE] Ajout cartes révision:', cards.length);
  const ref = collection(db, 'users', uid, 'reviews');
  for (const card of cards) {
    await addDoc(ref, card);
  }
}

/** Récupère toutes les cartes de révision dues */
export async function getDueReviewCards(uid: string): Promise<ReviewCard[]> {
  const today = new Date().toISOString().split('T')[0];
  const q = query(
    collection(db, 'users', uid, 'reviews'),
    where('nextReviewAt', '<=', today),
    orderBy('nextReviewAt')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ReviewCard);
}

/** Met à jour une carte de révision après réponse */
export async function updateReviewCard(
  uid: string,
  cardId: string,
  updates: Partial<ReviewCard>
): Promise<void> {
  console.log('[FIRESTORE] MAJ carte révision:', cardId);
  await updateDoc(doc(db, 'users', uid, 'reviews', cardId), updates as any);
}

/** Supprime une carte de révision maîtrisée (intervalle > 21 jours) */
export async function deleteReviewCard(uid: string, cardId: string): Promise<void> {
  console.log('[FIRESTORE] Suppression carte maîtrisée:', cardId);
  await deleteDoc(doc(db, 'users', uid, 'reviews', cardId));
}

// ─────────────────────────────────────────────
// STATISTIQUES JOURNALIÈRES — users/{uid}/dailyStats/{date}
// ─────────────────────────────────────────────

/** Enregistre ou met à jour les stats du jour */
export async function recordDailyStats(
  uid: string,
  xpEarned: number
): Promise<void> {
  const today = getTodayString();
  const ref = doc(db, 'users', uid, 'dailyStats', today);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    await updateDoc(ref, {
      lessonsCompleted: increment(1),
      xpEarned: increment(xpEarned),
    });
  } else {
    await setDoc(ref, {
      date: today,
      lessonsCompleted: 1,
      xpEarned,
    } as DailyStats);
  }
}

/** Récupère les stats des 7 derniers jours */
export async function getWeeklyStats(uid: string): Promise<DailyStats[]> {
  const today = new Date();
  const stats: DailyStats[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const snap = await getDoc(doc(db, 'users', uid, 'dailyStats', dateStr));
    if (snap.exists()) {
      stats.push(snap.data() as DailyStats);
    } else {
      stats.push({ date: dateStr, lessonsCompleted: 0, xpEarned: 0 });
    }
  }

  return stats;
}
