'use client';
import React from 'react';
import { DailyStats } from '@/lib/types';

/**
 * StatsChart
 */
export default function StatsChart({ stats }: { stats: DailyStats[] }) {
  console.log('[STATS_CHART] Rendu avec stats:', stats);

  const maxVal = Math.max(...stats.map(s => s.lessonsCompleted || 0), 3);

  // Formateur de jour lisible sans décalage UTC
  const formatDayName = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        return d.toLocaleDateString('fr-FR', { weekday: 'short' });
      }
    } catch {
      // fallback
    }
    return dateStr;
  };

  return (
    <div className="chart-container" style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', height: '160px', paddingTop: '20px' }}>
      {stats.map(s => {
        const count = s.lessonsCompleted || 0;
        const heightPercent = Math.min(100, Math.max(8, (count / maxVal) * 100));
        const dayName = formatDayName(s.date);

        return (
          <div key={s.date} className="chart-bar-wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end' }}>
            {/* Nombre au-dessus de la barre */}
            <span style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px', color: count > 0 ? 'var(--primary)' : 'transparent' }}>
              {count > 0 ? count : '0'}
            </span>

            {/* Barre visuelle */}
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end', background: 'var(--surface-secondary, #f1f5f9)', borderRadius: '6px', overflow: 'hidden' }}>
              <div
                className="chart-bar"
                style={{
                  height: count > 0 ? `${heightPercent}%` : '4px',
                  width: '100%',
                  background: count > 0 ? 'linear-gradient(180deg, var(--primary, #3b82f6), var(--secondary, #8b5cf6))' : 'var(--border, #cbd5e1)',
                  borderRadius: '4px',
                  transition: 'height 0.4s ease-in-out',
                }}
                title={`${count} leçon(s) terminée(s)`}
              />
            </div>

            {/* Label du jour */}
            <div className="chart-label" style={{ fontSize: '0.75rem', marginTop: '8px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'capitalize' }}>
              {dayName}
            </div>
          </div>
        );
      })}
    </div>
  );
}
