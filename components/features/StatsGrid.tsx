'use client';

/**
 * components/features/StatsGrid.tsx
 * Grille de statistiques clés de l'utilisateur (leçons, XP, streak, niveau).
 */

import React from 'react';

interface StatsGridProps {
  totalLessons: number;
  totalXP: number;
  streak: number;
  level: number;
}

export default function StatsGrid({ totalLessons, totalXP, streak, level }: StatsGridProps) {
  console.log('[STATS_GRID] Render:', { totalLessons, totalXP, streak, level });

  const stats = [
    { label: 'Leçons complétées', value: totalLessons, icon: '📚' },
    { label: 'XP total',          value: totalXP,       icon: '⚡' },
    { label: 'Streak actuel',     value: `${streak}j`,  icon: '🔥' },
    { label: 'Niveau',            value: level,          icon: '🎓' },
  ];

  return (
    <div className="stats-grid">
      {stats.map((s) => (
        <div key={s.label} className="stat-card">
          <span style={{ fontSize: '1.5rem' }}>{s.icon}</span>
          <div className="stat-value">{s.value}</div>
          <div className="stat-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
