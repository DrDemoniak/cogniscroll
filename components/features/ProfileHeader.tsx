'use client';

/**
 * components/features/ProfileHeader.tsx
 * Affiche le header de profil: avatar, nom, email et date d'inscription.
 */

import React from 'react';

interface ProfileHeaderProps {
  name: string;
  email: string;
  createdAt: any; // Firestore Timestamp ou null
}

export default function ProfileHeader({ name, email, createdAt }: ProfileHeaderProps) {
  console.log('[PROFILE_HEADER] Render:', name);

  // Initiale de l'avatar
  const initial = name ? name.charAt(0).toUpperCase() : '?';

  // Formatage de la date d'inscription
  const joinDate = createdAt?.toDate
    ? createdAt.toDate().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })
    : 'Membre récent';

  return (
    <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
      {/* Avatar avec initiale */}
      <div className="avatar" style={{ margin: '0 auto var(--space-4)' }}>
        {initial}
      </div>

      {/* Infos utilisateur */}
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-1)' }}>
        {name}
      </h2>
      <p className="text-muted text-sm" style={{ marginBottom: 'var(--space-3)' }}>
        {email}
      </p>
      <span className="badge badge-surface">
        📅 Membre depuis {joinDate}
      </span>
    </div>
  );
}
