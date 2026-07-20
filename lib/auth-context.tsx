'use client';

/**
 * lib/auth-context.tsx
 * Contexte React pour l'authentification Firebase.
 * Fournit l'utilisateur courant et les fonctions auth à toute l'app.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { auth } from './firebase';
import { createUserProfile, getUserProfile } from './firestore';
import type { UserProfile } from './types';

// ─────────────────────────────────────────────
// Types du contexte
// ─────────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// ─────────────────────────────────────────────
// Création du contexte
// ─────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Chargement du profil Firestore
  const loadProfile = async (firebaseUser: User) => {
    console.log('[AUTH] Chargement du profil Firestore pour:', firebaseUser.uid);
    try {
      const profile = await getUserProfile(firebaseUser.uid);
      setUserProfile(profile);
    } catch (err) {
      console.error('[AUTH] Erreur chargement profil:', err);
    }
  };

  // Rafraîchit le profil depuis Firestore
  const refreshProfile = async () => {
    if (user) await loadProfile(user);
  };

  // Écoute les changements d'état d'authentification Firebase
  useEffect(() => {
    console.log('[AUTH] Initialisation du listener Firebase Auth');
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await loadProfile(firebaseUser);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ── Connexion email/password ──────────────────
  const login = async (email: string, password: string) => {
    console.log('[AUTH] Tentative de connexion email:', email);
    await signInWithEmailAndPassword(auth, email, password);
  };

  // ── Inscription ───────────────────────────────
  const register = async (email: string, password: string, displayName: string) => {
    console.log('[AUTH] Inscription:', email, displayName);
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    // Création du profil Firestore
    await createUserProfile(cred.user.uid, email, displayName);
  };

  // ── Connexion Google ──────────────────────────
  const loginWithGoogle = async () => {
    console.log('[AUTH] Connexion Google');
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    // Créer le profil Firestore si c'est la première connexion
    const existing = await getUserProfile(cred.user.uid);
    if (!existing) {
      await createUserProfile(
        cred.user.uid,
        cred.user.email!,
        cred.user.displayName || 'Utilisateur'
      );
    }
  };

  // ── Déconnexion ───────────────────────────────
  const logout = async () => {
    console.log('[AUTH] Déconnexion');
    await signOut(auth);
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, userProfile, loading, login, register, loginWithGoogle, logout, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─────────────────────────────────────────────
// Hook personnalisé
// ─────────────────────────────────────────────

/**
 * useAuth — Hook pour accéder au contexte d'authentification.
 * Doit être utilisé à l'intérieur d'un <AuthProvider>.
 */
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}
