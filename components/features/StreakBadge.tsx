'use client';
import React from 'react';

/**
 * StreakBadge
 * Affiche la suite de jours d'activité.
 */
export default function StreakBadge({ streak }: { streak: number }) {
  console.log('[STREAK_BADGE] Rendu pour streak:', streak);
  return (
    <div className="streak-card">
      <div className="flame">🔥</div>
      <div className="streak-number">{streak}</div>
      <div>jour(s) de suite</div>
    </div>
  );
}
