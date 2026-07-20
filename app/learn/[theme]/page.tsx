'use client';

/**
 * app/learn/[theme]/page.tsx
 * Page d'un thème avec :
 * - Modale de sélection de sujet (liste infinie + saisie libre)
 * - Roadmap visuelle des leçons (style jeu mobile)
 */

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/layout/AuthGuard';
import Navbar from '@/components/layout/Navbar';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { getLessonsByTheme } from '@/lib/firestore';
import { getThemeById } from '@/lib/themes';
import type { SavedLesson } from '@/lib/types';

// ─────────────────────────────────────────────
// Modale de sélection de sujet
// ─────────────────────────────────────────────
function TopicModal({
  topics,
  themeName,
  onSelect,
  onClose,
}: {
  topics: string[];
  themeName: string;
  onSelect: (topic: string) => void;
  onClose: () => void;
}) {
  const [customTopic, setCustomTopic] = useState('');
  const [search,      setSearch]      = useState('');

  const filtered = topics.filter(t =>
    t.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="modal-backdrop"
      style={{ zIndex: 'var(--z-modal)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="card card-elevated"
        style={{ width: '90%', maxWidth: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}
      >
        {/* Header modale */}
        <div style={{ padding: 'var(--space-6)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>🎯 Choisir un sujet</h2>
            <button
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              style={{ fontSize: '1.2rem', padding: 'var(--space-1)' }}
            >
              ✕
            </button>
          </div>
          {/* Recherche */}
          <input
            type="text"
            className="form-input"
            placeholder="🔍 Rechercher ou taper un sujet libre..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {/* Liste scrollable */}
        <div style={{ overflowY: 'auto', flex: 1, padding: 'var(--space-4)' }}>
          {/* Sujets suggérés */}
          {filtered.length > 0 && (
            <>
              <p className="text-muted text-sm" style={{ marginBottom: 'var(--space-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>
                Sujets suggérés ({filtered.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {filtered.map(topic => (
                  <button
                    key={topic}
                    className="btn btn-ghost"
                    style={{ textAlign: 'left', justifyContent: 'flex-start', padding: 'var(--space-3) var(--space-4)' }}
                    onClick={() => onSelect(topic)}
                  >
                    📖 {topic}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Sujet libre */}
          {search && !filtered.includes(search) && (
            <div style={{ marginTop: 'var(--space-5)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border)' }}>
              <p className="text-muted text-sm" style={{ marginBottom: 'var(--space-3)' }}>
                Sujet personnalisé :
              </p>
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => onSelect(search)}
              >
                ✨ Générer une leçon sur « {search} »
              </button>
            </div>
          )}

          {/* Aucun résultat */}
          {filtered.length === 0 && !search && (
            <p className="text-muted text-sm text-center" style={{ padding: 'var(--space-8)' }}>
              Tape un sujet dans la recherche
            </p>
          )}
        </div>

        {/* Footer : surprise */}
        <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--border)' }}>
          <button
            className="btn btn-secondary"
            style={{ width: '100%' }}
            onClick={() => {
              const random = topics[Math.floor(Math.random() * topics.length)];
              onSelect(random);
            }}
          >
            🎲 Sujet aléatoire dans {themeName}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Nœud de la roadmap
// ─────────────────────────────────────────────
function RoadmapNode({
  index,
  lesson,
  isNext,
  isGhost,
  onGenerate,
}: {
  index: number;
  lesson?: SavedLesson;
  isNext?: boolean;
  isGhost?: boolean;
  onGenerate?: () => void;
}) {
  const router = useRouter();

  const handleClick = () => {
    if (!lesson) return;
    sessionStorage.setItem('currentLesson',   JSON.stringify(lesson.content));
    sessionStorage.setItem('currentLessonId', lesson.id);
    sessionStorage.setItem('isFavorite',      String(lesson.isFavorite));
    router.push(`/learn/${lesson.theme}/lesson`);
  };

  // ── Nœud complété ────────────────────────────────────────────
  if (lesson) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', position: 'relative' }}>
        {/* Cercle complété */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--success, #22c55e), #16a34a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 0 0 4px rgba(34, 197, 94, 0.2)',
            fontSize: '1.3rem',
          }}
        >
          ✅
        </div>
        {/* Card leçon */}
        <div
          className="card card-clickable"
          style={{ flex: 1, padding: 'var(--space-4)', cursor: 'pointer' }}
          onClick={handleClick}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
            <span className="badge badge-surface" style={{ fontSize: '0.7rem' }}>Niveau {index + 1}</span>
            {lesson.isFavorite && <span>❤️</span>}
          </div>
          <p style={{ fontWeight: 600, margin: 0, fontSize: '0.95rem' }}>
            {lesson.content?.title || lesson.topic}
          </p>
          <p className="text-muted" style={{ margin: 0, fontSize: '0.8rem', marginTop: 4 }}>
            {lesson.content?.difficulty} · {lesson.content?.estimatedMinutes} min
          </p>
        </div>
      </div>
    );
  }

  // ── Prochain nœud (bouton générer) ───────────────────────────
  if (isNext) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        {/* Cercle pulsant */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 0 0 4px rgba(99, 102, 241, 0.3), 0 0 20px rgba(99, 102, 241, 0.4)',
            animation: 'pulse 2s ease-in-out infinite',
            fontSize: '1.2rem',
          }}
        >
          🚀
        </div>
        {/* Bouton générer */}
        <button
          className="btn btn-primary"
          style={{ flex: 1, justifyContent: 'center', padding: 'var(--space-4)', fontSize: '1rem' }}
          onClick={onGenerate}
        >
          + Générer le niveau {index + 1}
        </button>
      </div>
    );
  }

  // ── Nœud fantôme (futur) ─────────────────────────────────────
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', opacity: 0.35 }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: '2px dashed var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: '1.1rem',
        }}
      >
        🔒
      </div>
      <div
        className="card"
        style={{ flex: 1, padding: 'var(--space-4)', background: 'var(--surface-secondary)' }}
      >
        <span className="badge badge-surface" style={{ fontSize: '0.7rem', marginBottom: 4, display: 'inline-block' }}>Niveau {index + 1}</span>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>À débloquer...</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Page principale
// ─────────────────────────────────────────────
export default function ThemePage({ params }: { params: Promise<{ theme: string }> }) {
  const { theme: themeId } = use(params);
  const themeConfig = getThemeById(themeId);
  const router  = useRouter();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [loading,        setLoading]        = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [themeLessons,   setThemeLessons]   = useState<SavedLesson[]>([]);
  const [showModal,      setShowModal]      = useState(false);

  // Charge l'historique des leçons du thème
  useEffect(() => {
    async function loadHistory() {
      if (!user || !themeConfig) return;
      try {
        console.log(`[THEME] Chargement historique: ${themeId}`);
        const lessons = await getLessonsByTheme(user.uid, themeId);
        setThemeLessons(lessons);
      } catch (err) {
        console.error('[THEME] Erreur historique:', err);
      } finally {
        setHistoryLoading(false);
      }
    }
    loadHistory();
  }, [user, themeId, themeConfig]);

  // Thème invalide
  if (!themeConfig) {
    return (
      <AuthGuard>
        <Navbar />
        <div className="page-wrapper">
          <div className="loading-overlay">
            <span style={{ fontSize: '3rem' }}>🔍</span>
            <h2>Thème introuvable</h2>
            <button className="btn btn-primary" onClick={() => router.push('/learn')}>
              Retour au catalogue
            </button>
          </div>
        </div>
      </AuthGuard>
    );
  }

  // Génère une leçon sur le sujet choisi
  const generateLesson = useCallback(async (topic: string) => {
    setShowModal(false);
    setLoading(true);
    console.log(`[THEME] Génération — thème: ${themeConfig.name}, sujet: ${topic}`);

    try {
      const res = await fetch('/api/generate-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme:   themeConfig.name,
          topic,
          themeId,
        }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const { lesson } = await res.json();

      sessionStorage.setItem('currentLesson',   JSON.stringify(lesson));
      sessionStorage.setItem('currentLessonId', '');
      sessionStorage.setItem('isFavorite',      'false');

      console.log('[THEME] Leçon générée:', lesson.title);
      router.push(`/learn/${themeId}/lesson`);
    } catch (err) {
      console.error('[THEME] Erreur génération:', err);
      addToast('Erreur lors de la génération. Réessaie !', 'error');
    } finally {
      setLoading(false);
    }
  }, [themeConfig, themeId, router, addToast]);

  // ── Roadmap : leçons complétées + prochain nœud + 3 fantômes ──
  const completedCount = themeLessons.length;
  const roadmapNodes   = [
    ...themeLessons,           // leçons réelles
    null,                      // prochain nœud (générer)
    null, null, null,          // 3 fantômes
  ];

  return (
    <AuthGuard>
      <Navbar />
      <div className="page-wrapper">

        {/* Modale sélection sujet */}
        {showModal && (
          <TopicModal
            topics={themeConfig.suggestedTopics || []}
            themeName={themeConfig.name}
            onSelect={generateLesson}
            onClose={() => setShowModal(false)}
          />
        )}

        {/* Overlay de génération */}
        {loading && (
          <div className="modal-backdrop" style={{ zIndex: 'var(--z-modal)' }}>
            <div className="card card-elevated" style={{ padding: 'var(--space-10)', textAlign: 'center', maxWidth: 340 }}>
              <div className="spinner spinner-lg" style={{ margin: '0 auto var(--space-4)' }} />
              <h3>🧠 Gemini prépare ta leçon...</h3>
              <p className="text-muted" style={{ marginTop: 'var(--space-2)' }}>
                Cela prend environ 5-10 secondes
              </p>
            </div>
          </div>
        )}

        <main className="page-content">

          {/* ── Header thème ── */}
          <div
            className="card"
            style={{
              background: themeConfig.gradient,
              border: 'none',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-10)',
              marginBottom: 'var(--space-8)',
              color: '#fff',
            }}
          >
            <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: 'var(--space-3)' }}>
              {themeConfig.emoji}
            </span>
            <h1 style={{ color: '#fff', marginBottom: 'var(--space-2)' }}>{themeConfig.name}</h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 'var(--space-6)', maxWidth: 480 }}>
              {themeConfig.description}
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <button
                className="btn"
                style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', backdropFilter: 'blur(8px)' }}
                onClick={() => setShowModal(true)}
                disabled={loading}
              >
                🎯 Choisir un sujet
              </button>
              <button
                className="btn"
                style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
                onClick={() => {
                  const random = themeConfig.suggestedTopics[Math.floor(Math.random() * themeConfig.suggestedTopics.length)];
                  generateLesson(random);
                }}
                disabled={loading}
              >
                🎲 Sujet aléatoire
              </button>
            </div>
          </div>

          {/* ── Roadmap ── */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
              <h2>Ton parcours</h2>
              <span className="badge badge-primary">{completedCount} niveau{completedCount > 1 ? 'x' : ''} complété{completedCount > 1 ? 's' : ''}</span>
            </div>

            {historyLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
                <div className="spinner" />
              </div>
            ) : (
              <div style={{ position: 'relative', maxWidth: 600 }}>

                {/* Ligne verticale de connexion */}
                <div
                  style={{
                    position: 'absolute',
                    left: 27,
                    top: 28,
                    width: 2,
                    height: `calc(100% - 28px)`,
                    background: 'linear-gradient(to bottom, var(--success, #22c55e), var(--border))',
                    zIndex: 0,
                  }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', position: 'relative', zIndex: 1 }}>
                  {roadmapNodes.map((node, i) => {
                    if (node !== null) {
                      // Leçon complétée
                      return <RoadmapNode key={(node as SavedLesson).id} index={i} lesson={node as SavedLesson} />;
                    }
                    // Le premier null = prochain nœud à générer
                    if (i === completedCount) {
                      return (
                        <RoadmapNode
                          key={`next-${i}`}
                          index={i}
                          isNext
                          onGenerate={() => setShowModal(true)}
                        />
                      );
                    }
                    // Les autres = fantômes
                    return <RoadmapNode key={`ghost-${i}`} index={i} isGhost />;
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Animation pulse dans global.css */}
          <style>{`
            @keyframes pulse {
              0%, 100% { box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.3), 0 0 20px rgba(99, 102, 241, 0.4); }
              50%       { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0.15), 0 0 30px rgba(99, 102, 241, 0.6); }
            }
          `}</style>

        </main>
      </div>
    </AuthGuard>
  );
}
