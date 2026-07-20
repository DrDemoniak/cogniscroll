'use client';
import React from 'react';
import { DailyStats } from '@/lib/types';

/**
 * StatsChart
 */
export default function StatsChart({ stats }: { stats: DailyStats[] }) {
  console.log('[STATS_CHART] Rendu');
  const maxVal = Math.max(...stats.map(s => s.lessonsCompleted), 1);
  return (
    <div className="chart-container" style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', height: '150px' }}>
      {stats.map(s => {
        const height = (s.lessonsCompleted / maxVal) * 100;
        return (
          <div key={s.date} className="chart-bar-wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
            <div className="chart-bar" style={{ height: `${height}%`, width: '100%', background: 'var(--brand-gradient, #3b82f6)', borderRadius: '4px 4px 0 0' }} title={`${s.lessonsCompleted} leçons`}></div>
            <div className="chart-label" style={{ fontSize: '0.7rem', marginTop: '4px' }}>{new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'short' })}</div>
          </div>
        );
      })}
    </div>
  );
}
