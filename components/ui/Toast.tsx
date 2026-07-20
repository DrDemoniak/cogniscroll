'use client';

/**
 * components/ui/Toast.tsx
 * Système de notifications toast global pour CogniScroll.
 * Fournit un Context + hook useToast() pour afficher des messages depuis n'importe quelle page.
 */

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

// Types de toast supportés
export type ToastType = 'success' | 'error' | 'xp' | 'badge';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  /** Affiche un toast. @param message - texte à afficher. @param type - style du toast. */
  addToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Icône selon le type de toast
const TOAST_ICONS: Record<ToastType, string> = {
  success: '✅',
  error:   '❌',
  xp:      '⚡',
  badge:   '🏅',
};

/**
 * ToastProvider — Enveloppe l'application et rend les toasts disponibles globalement.
 * Doit être placé dans app/layout.tsx, à l'intérieur de AuthProvider.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now();
    console.log(`[TOAST] Affichage: [${type}] ${message}`);
    setToasts(prev => [...prev, { id, message, type }]);
    // Auto-dismiss après 3.5s
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Container des toasts — positionné en bas à droite */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`toast toast-${toast.type}`}
            role="alert"
            aria-live="polite"
          >
            <span style={{ fontSize: '1.1rem' }}>{TOAST_ICONS[toast.type]}</span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * useToast — Hook pour afficher des notifications depuis n'importe quel composant.
 * @example addToast('+15 XP gagnés !', 'xp')
 */
export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('[TOAST] useToast doit être utilisé dans <ToastProvider>');
  return ctx;
}
