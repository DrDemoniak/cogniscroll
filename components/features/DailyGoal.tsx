'use client';
import React from 'react';

/**
 * DailyGoal
 * Anneau SVG de progression.
 */
export default function DailyGoal({ progress, goal }: { progress: number; goal: number }) {
  console.log('[DAILY_GOAL] Rendu progression:', progress, 'sur', goal);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(progress / goal, 1) * circumference);

  return (
    <div className="daily-goal-ring" style={{ position: 'relative', width: '100px', height: '100px' }}>
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e0e0e0" strokeWidth="8" />
        <circle 
          cx="50" cy="50" r={radius} 
          fill="none" stroke="var(--brand-gradient, #3b82f6)" 
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
        />
      </svg>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <strong>{progress}/{goal}</strong>
      </div>
      <div style={{textAlign: 'center', fontSize: '0.8rem', marginTop: '4px'}}>Objectif du jour</div>
    </div>
  );
}
