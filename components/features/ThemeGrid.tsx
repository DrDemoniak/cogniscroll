'use client';
import React from 'react';
// import { THEMES } from '@/lib/themes';

// MOCK LOCAL SI LE FICHIER N'EXISTE PAS ENCORE
const THEMES = [
  { id: 'tech', name: 'Technologie', emoji: '💻', description: 'IA, web...', gradient: 'linear-gradient(45deg, #10b981, #3b82f6)' }
];

/**
 * ThemeGrid
 * Grille de thématiques.
 */
export default function ThemeGrid({ onThemeSelect, themeProgress = {} }: { onThemeSelect: (id: string) => void; themeProgress?: Record<string, number> }) {
  console.log('[THEME_GRID] Affichage des thèmes');
  return (
    <div className="themes-grid">
      {THEMES.map(theme => (
        <div 
          key={theme.id} 
          className="theme-card" 
          style={{ background: theme.gradient, color: 'white', padding: '1rem', borderRadius: '8px', cursor: 'pointer' }}
          onClick={() => onThemeSelect(theme.id)}
        >
          <div style={{ fontSize: '2rem' }}>{theme.emoji}</div>
          <h3>{theme.name}</h3>
          <p>{theme.description}</p>
          <div style={{fontSize: '0.8rem', marginTop: '0.5rem'}}>Leçons : {themeProgress[theme.id] || 0}</div>
        </div>
      ))}
    </div>
  );
}
