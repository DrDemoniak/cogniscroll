'use client';
import React from 'react';

import { BADGES } from '@/lib/gamification';

/**
 * BadgeCollection
 */
export default function BadgeCollection({ earnedBadges }: { earnedBadges: string[] }) {
  console.log('[BADGE_COLLECTION] Badges gagnés:', earnedBadges);
  return (
    <div className="badges-grid">
      {BADGES.map(badge => {
        const earned = earnedBadges.includes(badge.id);
        return (
          <div key={badge.id} className={`badge-item ${earned ? 'earned' : 'locked'} badge-rarity-${badge.rarity}`}>
            <div style={{ fontSize: '2rem', filter: earned ? 'none' : 'grayscale(100%)' }}>{badge.emoji}</div>
            <h4>{badge.name}</h4>
            <p style={{fontSize: '0.8rem'}}>{badge.description}</p>
          </div>
        );
      })}
    </div>
  );
}
