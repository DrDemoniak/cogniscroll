'use client';
import React from 'react';

/**
 * XPCounter
 * Affiche l'expérience et la barre de progression.
 */
export default function XPCounter({ xp, level, levelName, progress, nextLevelXP }: { xp: number; level: number; levelName: string; progress: number; nextLevelXP?: number }) {
  console.log('[XP_COUNTER] Rendu XP:', xp);
  return (
    <div className="xp-display">
      <div className="level-badge">Niveau {level}: {levelName}</div>
      <div className="xp-amount">{xp} XP au total</div>
      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}></div>
      </div>
      {nextLevelXP && <div className="xp-label">Prochain niveau à {nextLevelXP} XP</div>}
    </div>
  );
}
