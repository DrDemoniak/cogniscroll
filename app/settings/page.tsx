'use client';

/**
 * app/settings/page.tsx
 * Page de paramètres utilisateur : objectif quotidien, accessibilité, audio, apparence.
 */

import { useState, useEffect } from 'react';
import AuthGuard from '@/components/layout/AuthGuard';
import Navbar from '@/components/layout/Navbar';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { updateSettings, updateUserProfile } from '@/lib/firestore';

export default function SettingsPage() {
  const { user, userProfile, refreshProfile, logout } = useAuth();
  const { addToast } = useToast();

  const [dailyGoal,   setDailyGoal]   = useState(2);
  const [dyslexicFont,setDyslexicFont]= useState(false);
  const [audioSpeed,  setAudioSpeed]  = useState(1);
  const [darkMode,    setDarkMode]    = useState(true);
  const [isSaving,    setIsSaving]    = useState(false);

  // Initialise les valeurs depuis le profil chargé
  useEffect(() => {
    if (userProfile) {
      setDailyGoal(userProfile.dailyGoal || 2);
      setDyslexicFont(userProfile.settings?.dyslexicFont || false);
      setAudioSpeed(userProfile.settings?.audioSpeed || 1);
      setDarkMode(userProfile.settings?.colorTheme !== 'light');
    }
  }, [userProfile]);

  // Applique la police dyslexie au body
  useEffect(() => {
    document.body.classList.toggle('dyslexic-mode', dyslexicFont);
  }, [dyslexicFont]);

  // Applique le mode couleur au body
  useEffect(() => {
    document.body.classList.toggle('light-mode', !darkMode);
  }, [darkMode]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    console.log('[SETTINGS] Sauvegarde:', { dailyGoal, dyslexicFont, audioSpeed, darkMode });

    try {
      await updateSettings(user.uid, {
        dyslexicFont,
        audioSpeed,
        colorTheme: darkMode ? 'dark' : 'light',
      });
      await updateUserProfile(user.uid, { dailyGoal });
      await refreshProfile();
      addToast('Paramètres sauvegardés ✓', 'success');
    } catch (err) {
      console.error('[SETTINGS] Erreur sauvegarde:', err);
      addToast('Erreur lors de la sauvegarde', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetData = () => {
    const ok = window.confirm(
      'Cette action est irréversible. Toutes tes données de progression seront supprimées. Continuer ?'
    );
    if (ok) {
      console.warn('[SETTINGS] Réinitialisation demandée');
      addToast('Fonctionnalité bientôt disponible', 'error');
    }
  };

  return (
    <AuthGuard>
      <Navbar />
      <div className="page-wrapper">
        <main className="page-content" style={{ maxWidth: 640, margin: '0 auto' }}>

          <div className="page-header">
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              ⚙️ Paramètres
            </h1>
          </div>

          {/* ── Objectif quotidien ── */}
          <div className="settings-section">
            <div className="settings-section-title">Objectif quotidien</div>
            <div className="settings-item">
              <div>
                <strong>Leçons par jour</strong>
                <p className="text-sm text-muted">Combien de leçons souhaites-tu faire chaque jour ?</p>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {[1, 2, 3, 5].map((g) => (
                  <button
                    key={g}
                    className={`btn btn-sm ${dailyGoal === g ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setDailyGoal(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Accessibilité ── */}
          <div className="settings-section">
            <div className="settings-section-title">Accessibilité</div>
            <div className="settings-item">
              <div>
                <strong>Police adaptée (dyslexie)</strong>
                <p className="text-sm text-muted">Active la police OpenDyslexic pour un meilleur confort de lecture.</p>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={dyslexicFont}
                  onChange={(e) => setDyslexicFont(e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>

          {/* ── Audio ── */}
          <div className="settings-section">
            <div className="settings-section-title">Audio</div>
            <div className="settings-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
              <div>
                <strong>Vitesse de lecture audio</strong>
                <p className="text-sm text-muted">Ajuste la vitesse de synthèse vocale pour les leçons.</p>
              </div>
              <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <input
                  type="range"
                  min={0.75} max={2} step={0.25}
                  value={audioSpeed}
                  onChange={(e) => setAudioSpeed(parseFloat(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span className="badge badge-primary" style={{ minWidth: 48, justifyContent: 'center' }}>
                  {audioSpeed}×
                </span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                {[0.75, 1, 1.25, 1.5, 2].map((s) => (
                  <button
                    key={s}
                    className={`btn btn-sm ${audioSpeed === s ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setAudioSpeed(s)}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Apparence ── */}
          <div className="settings-section">
            <div className="settings-section-title">Apparence</div>
            <div className="settings-item">
              <div>
                <strong>Mode sombre</strong>
                <p className="text-sm text-muted">Bascule entre l'interface sombre et claire.</p>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={darkMode}
                  onChange={(e) => setDarkMode(e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>

          {/* ── Compte & Zone de danger ── */}
          <div className="settings-section">
            <div className="settings-section-title" style={{ color: 'var(--accent-red)' }}>Compte & Données</div>
            <div className="settings-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={logout}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                🚪 Se déconnecter
              </button>
            </div>
            <div className="settings-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
              <p className="text-sm text-muted">
                La réinitialisation supprimera définitivement ta progression (XP, badges, leçons).
              </p>
              <button className="btn btn-danger btn-sm" onClick={handleResetData} style={{ width: '100%', justifyContent: 'center' }}>
                🗑️ Réinitialiser ma progression
              </button>
            </div>
          </div>

          {/* ── Bouton sauvegarder ── */}
          <div style={{ position: 'sticky', bottom: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end', paddingTop: 'var(--space-4)' }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Sauvegarde...</>
              ) : (
                '💾 Enregistrer les modifications'
              )}
            </button>
          </div>

        </main>
      </div>
    </AuthGuard>
  );
}
