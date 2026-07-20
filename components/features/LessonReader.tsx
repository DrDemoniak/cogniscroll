'use client';

/**
 * components/features/LessonReader.tsx
 * Lecteur de fiche de connaissance avec :
 * - Barre de progression de lecture (scroll-driven)
 * - Toggle favori
 * - Audio via Google Cloud TTS (bouton Play/Stop)
 * - Bouton "Passer au Quiz"
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LessonContent } from '@/lib/types';

interface LessonReaderProps {
  lesson: LessonContent;
  lessonId: string;
  isFavorite: boolean;
  onFavoriteToggle: () => void;
  onComplete: () => void;
}

export default function LessonReader({
  lesson,
  lessonId,
  isFavorite,
  onFavoriteToggle,
  onComplete,
}: LessonReaderProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isPlaying,      setIsPlaying]      = useState(false);
  const [audioLoading,   setAudioLoading]   = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ── Barre de progression au scroll ──────────────────────────────────────
  useEffect(() => {
    console.log('[LESSON_READER] Mount, lessonId:', lessonId);

    const handleScroll = () => {
      const scrollPx    = document.documentElement.scrollTop;
      const winHeightPx = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (winHeightPx > 0) setScrollProgress((scrollPx / winHeightPx) * 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lessonId]);

  // ── Cleanup audio au démontage du composant ──────────────────────────────
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  // ── Synthèse vocale via Google Cloud TTS ────────────────────────────────
  const handleAudioToggle = useCallback(async () => {
    // STOP si déjà en train de jouer
    if (isPlaying && audioRef.current) {
      console.log('[LESSON_READER] Stop audio');
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    // Si un audio existe déjà (mis en pause), reprendre
    if (audioRef.current && audioRef.current.src && !isPlaying) {
      console.log('[LESSON_READER] Reprise audio');
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }

    // Sinon, générer l'audio via l'API TTS
    setAudioLoading(true);
    console.log('[LESSON_READER] Génération audio TTS...');

    // On concatène tout le texte de la leçon
    const text = [
      lesson.title + '.',
      ...lesson.sections.flatMap(s => [s.title + '.', s.content]),
      'Le saviez-vous ? ' + lesson.didYouKnow,
      'En résumé : ' + lesson.summary,
    ].join(' ');

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error(`TTS error: ${res.status}`);

      const { audioContent } = await res.json();

      // Décode le base64 en blob audio MP3
      const byteChars   = atob(audioContent);
      const byteNumbers = Array.from(byteChars).map(c => c.charCodeAt(0));
      const byteArray   = new Uint8Array(byteNumbers);
      const blob        = new Blob([byteArray], { type: 'audio/mp3' });
      const url         = URL.createObjectURL(blob);

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        console.log('[LESSON_READER] Audio terminé');
        setIsPlaying(false);
      };

      audio.onerror = () => {
        console.error('[LESSON_READER] Erreur lecture audio');
        setIsPlaying(false);
      };

      await audio.play();
      setIsPlaying(true);
      console.log('[LESSON_READER] Lecture audio démarrée');
    } catch (err) {
      console.error('[LESSON_READER] Erreur TTS:', err);
      alert('Impossible de générer l\'audio. Vérifiez votre connexion.');
    } finally {
      setAudioLoading(false);
    }
  }, [isPlaying, lesson]);

  return (
    <div className="lesson-reader">

      {/* ── Barre de progression lecture (top fixed) ── */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: 4,
          zIndex: 100,
          background: 'var(--surface-secondary)',
        }}
      >
        <div
          style={{
            width: `${scrollProgress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
            transition: 'width 0.1s linear',
          }}
        />
      </div>

      {/* ── Header ── */}
      <div className="lesson-header" style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ marginBottom: 'var(--space-4)' }}>{lesson.title}</h1>

        {/* Méta-infos */}
        <div className="lesson-meta" style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
          <span className="badge badge-surface">⏱️ {lesson.estimatedMinutes} min</span>
          <span className="badge badge-surface">💪 {lesson.difficulty}</span>
          <span className="badge badge-primary">📚 {lesson.theme}</span>
        </div>

        {/* Contrôles */}
        <div className="audio-controls" style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <button
            onClick={onFavoriteToggle}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
          >
            {isFavorite ? '❤️ Retirer des favoris' : '🤍 Ajouter aux favoris'}
          </button>

          <button
            onClick={handleAudioToggle}
            className={`btn ${isPlaying ? 'btn-primary' : 'btn-secondary'}`}
            disabled={audioLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minWidth: 140 }}
          >
            {audioLoading ? (
              <>⏳ Génération audio...</>
            ) : isPlaying ? (
              <>⏹️ Arrêter</>
            ) : (
              <>🔊 Écouter</>
            )}
          </button>
        </div>
      </div>

      {/* ── Sections ── */}
      {lesson.sections.map((sec, i) => (
        <section key={i} className="lesson-section" style={{ marginBottom: 'var(--space-8)' }}>
          <h2 style={{ marginBottom: 'var(--space-4)', color: 'var(--primary)' }}>{sec.title}</h2>
          <p style={{ lineHeight: 1.8, color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
            {sec.content}
          </p>
          {sec.keyPoints?.length > 0 && (
            <ul className="key-points" style={{ listStyle: 'none', padding: 0 }}>
              {sec.keyPoints.map((kp, j) => (
                <li
                  key={j}
                  style={{
                    padding: 'var(--space-2) var(--space-3)',
                    marginBottom: 'var(--space-2)',
                    background: 'var(--surface-secondary)',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: '3px solid var(--primary)',
                    fontSize: '0.95rem',
                  }}
                >
                  ✦ {kp}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {/* ── Le saviez-vous ? ── */}
      <div
        className="did-you-know"
        style={{
          background: 'linear-gradient(135deg, rgba(var(--primary-rgb, 99, 102, 241), 0.1), rgba(var(--secondary-rgb, 168, 85, 247), 0.1))',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          marginBottom: 'var(--space-8)',
        }}
      >
        <strong className="did-you-know-label" style={{ display: 'block', marginBottom: 'var(--space-3)', color: 'var(--primary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          💡 Le saviez-vous ?
        </strong>
        <p style={{ lineHeight: 1.7, color: 'var(--text-secondary)', margin: 0 }}>{lesson.didYouKnow}</p>
      </div>

      {/* ── Résumé ── */}
      {lesson.summary && (
        <div
          style={{
            background: 'var(--surface-secondary)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-6)',
            marginBottom: 'var(--space-8)',
          }}
        >
          <strong style={{ display: 'block', marginBottom: 'var(--space-3)' }}>📋 Résumé</strong>
          <p style={{ lineHeight: 1.7, color: 'var(--text-secondary)', margin: 0 }}>{lesson.summary}</p>
        </div>
      )}

      {/* ── Bouton complétion ── */}
      <div style={{ textAlign: 'center', paddingBottom: 'var(--space-10)' }}>
        <button onClick={onComplete} className="btn btn-primary btn-lg">
          ✅ J'ai terminé cette leçon
        </button>
      </div>
    </div>
  );
}
