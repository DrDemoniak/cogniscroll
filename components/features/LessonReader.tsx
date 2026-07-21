'use client';

/**
 * components/features/LessonReader.tsx
 * Lecteur complet de fiche de connaissance avec :
 * - Barre de progression scroll-driven
 * - Images Pexels contextuelles
 * - Sources citées avec liens cliquables
 * - Lien YouTube pour approfondir
 * - Audio Google Cloud TTS (Play/Stop)
 * - Toggle favoris
 * - Bouton "Aller plus loin" (génère un approfondissement)
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { LessonContent } from '@/lib/types';

interface PexelsImage {
  url: string;
  thumb: string;
  alt: string;
  credit: string;
  creditUrl: string;
}

interface Source {
  title: string;
  url: string;
}

interface LessonReaderProps {
  lesson: LessonContent & {
    images?: PexelsImage[];
    sources?: Source[];
    youtubeQuery?: string;
  };
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
  const router  = useRouter();
  const params  = useParams<{ theme: string }>();

  const [scrollProgress, setScrollProgress] = useState(0);
  const [isPlaying,      setIsPlaying]      = useState(false);
  const [audioLoading,   setAudioLoading]   = useState(false);
  const [goFurtherLoading, setGoFurtherLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ── Barre de progression scroll ─────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      const scrollPx    = document.documentElement.scrollTop;
      const winHeightPx = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (winHeightPx > 0) setScrollProgress((scrollPx / winHeightPx) * 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lessonId]);

  // ── Cleanup audio au démontage ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // ── Audio TTS Google ────────────────────────────────────────────────────
  const handleAudioToggle = useCallback(async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    if (audioRef.current?.src && !isPlaying) {
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }

    setAudioLoading(true);
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
      if (!res.ok) throw new Error(`TTS ${res.status}`);
      const { audioContent } = await res.json();

      const byteChars   = atob(audioContent);
      const byteNumbers = Array.from(byteChars).map(c => c.charCodeAt(0));
      const blob        = new Blob([new Uint8Array(byteNumbers)], { type: 'audio/mp3' });
      const url         = URL.createObjectURL(blob);

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);
      await audio.play();
      setIsPlaying(true);
    } catch (err) {
      console.error('[LESSON_READER] Erreur TTS:', err);
      alert("Impossible de générer l'audio.");
    } finally {
      setAudioLoading(false);
    }
  }, [isPlaying, lesson]);

  // ── Bouton "Aller plus loin" ────────────────────────────────────────────
  const handleGoFurther = useCallback(async () => {
    if (goFurtherLoading) return;
    setGoFurtherLoading(true);
    console.log('[LESSON_READER] Aller plus loin sur:', lesson.topic);

    try {
      const res = await fetch('/api/generate-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: lesson.theme,
          topic: `${lesson.topic} — approfondissement avancé`,
          themeId: lesson.theme,
          mode: 'approfondi',
        }),
      });
      if (!res.ok) throw new Error('API error');
      const { lesson: deeperLesson } = await res.json();

      sessionStorage.setItem('currentLesson',   JSON.stringify(deeperLesson));
      sessionStorage.setItem('currentLessonId', '');
      sessionStorage.setItem('isFavorite',      'false');
      router.push(`/learn/${lesson.theme}/lesson`);
    } catch (err) {
      console.error('[LESSON_READER] Erreur go further:', err);
      alert('Impossible de générer un approfondissement. Réessaie.');
    } finally {
      setGoFurtherLoading(false);
    }
  }, [lesson, router, goFurtherLoading]);

  // ── Lien YouTube ────────────────────────────────────────────────────────
  const youtubeUrl = (lesson as any).youtubeQuery
    ? `https://www.youtube.com/results?search_query=${encodeURIComponent((lesson as any).youtubeQuery)}`
    : null;

  const images: PexelsImage[]  = (lesson as any).images  || [];
  const sources: Source[]      = (lesson as any).sources || [];

  return (
    <div className="lesson-reader">

      {/* ── Barre de progression ── */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: 4, zIndex: 100, background: 'var(--surface-secondary)' }}>
        <div style={{ width: `${scrollProgress}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--secondary))', transition: 'width 0.1s linear' }} />
      </div>

      {/* ── Header ── */}
      <div className="lesson-header" style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ marginBottom: 'var(--space-4)', lineHeight: 1.3 }}>{lesson.title}</h1>

        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
          <span className="badge badge-surface">⏱️ {lesson.estimatedMinutes} min</span>
          <span className="badge badge-surface">💪 {lesson.difficulty}</span>
          <span className="badge badge-primary">📚 {lesson.theme}</span>
        </div>

        {/* Image principale (1ère image) */}
        {images[0] && (
          <div style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', marginBottom: 'var(--space-6)', position: 'relative' }}>
            <img
              src={images[0].thumb}
              alt={images[0].alt}
              style={{ width: '100%', height: 240, objectFit: 'cover', display: 'block' }}
              loading="lazy"
            />
            <a
              href={images[0].creditUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ position: 'absolute', bottom: 8, right: 10, fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', background: 'rgba(0,0,0,0.4)', padding: '2px 6px', borderRadius: 4 }}
            >
              📷 {images[0].credit} / Pexels
            </a>
          </div>
        )}

        {/* Contrôles */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <button onClick={onFavoriteToggle} className="btn btn-secondary">
            {isFavorite ? '❤️ Retirer des favoris' : '🤍 Favoris'}
          </button>
          <button onClick={handleAudioToggle} className={`btn ${isPlaying ? 'btn-primary' : 'btn-secondary'}`} disabled={audioLoading} style={{ minWidth: 130 }}>
            {audioLoading ? '⏳ Génération...' : isPlaying ? '⏹️ Arrêter' : '🔊 Écouter'}
          </button>
        </div>
      </div>

      {/* ── Sections ── */}
      {lesson.sections.map((sec, i) => (
        <section key={i} style={{ marginBottom: 'var(--space-8)' }}>
          <h2 style={{ marginBottom: 'var(--space-4)', color: 'var(--primary)' }}>{sec.title}</h2>
          <p style={{ lineHeight: 1.85, color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', fontSize: '1.02rem' }}>
            {sec.content}
          </p>

          {/* Image de section (2ème image après la 2ème section) */}
          {i === 1 && images[1] && (
            <div style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', marginBottom: 'var(--space-5)', position: 'relative' }}>
              <img
                src={images[1].thumb}
                alt={images[1].alt}
                style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
                loading="lazy"
              />
              <a
                href={images[1].creditUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ position: 'absolute', bottom: 8, right: 10, fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', background: 'rgba(0,0,0,0.4)', padding: '2px 6px', borderRadius: 4 }}
              >
                📷 {images[1].credit} / Pexels
              </a>
            </div>
          )}

          {sec.keyPoints?.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {sec.keyPoints.map((kp, j) => (
                <li key={j} style={{ padding: 'var(--space-2) var(--space-4)', background: 'var(--surface-secondary)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--primary)', fontSize: '0.95rem' }}>
                  ✦ {kp}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {/* ── Le saviez-vous ── */}
      <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.1))', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
        <strong style={{ display: 'block', marginBottom: 'var(--space-3)', color: 'var(--primary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          💡 Le saviez-vous ?
        </strong>
        <p style={{ lineHeight: 1.75, color: 'var(--text-secondary)', margin: 0 }}>{lesson.didYouKnow}</p>
      </div>

      {/* ── Résumé ── */}
      {lesson.summary && (
        <div style={{ background: 'var(--surface-secondary)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
          <strong style={{ display: 'block', marginBottom: 'var(--space-3)' }}>📋 En résumé</strong>
          <p style={{ lineHeight: 1.75, color: 'var(--text-secondary)', margin: 0 }}>{lesson.summary}</p>
        </div>
      )}

      {/* ── Sources ── */}
      {sources.length > 0 && (
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-3)', color: 'var(--text-muted)' }}>📚 Sources</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {sources.map((src, i) => (
              <a
                key={i}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-3) var(--space-4)', background: 'var(--surface-secondary)', borderRadius: 'var(--radius-lg)', textDecoration: 'none', color: 'var(--primary)', fontSize: '0.9rem', transition: 'background 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover, var(--border))')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-secondary)')}
              >
                🔗 {src.title} ↗
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── YouTube ── */}
      {youtubeUrl && (
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-3)', textDecoration: 'none', width: '100%', justifyContent: 'center' }}
          >
            <span style={{ color: '#FF0000', fontSize: '1.3rem' }}>▶</span>
            Voir des vidéos sur ce sujet
          </a>
        </div>
      )}

      {/* ── CTAs finaux ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', paddingBottom: 'var(--space-10)', alignItems: 'stretch' }}>
        <button onClick={onComplete} className="btn btn-primary btn-lg" style={{ justifyContent: 'center' }}>
          ✅ J'ai terminé cette leçon
        </button>
        <button
          onClick={handleGoFurther}
          disabled={goFurtherLoading}
          className="btn btn-secondary btn-lg"
          style={{ justifyContent: 'center' }}
        >
          {goFurtherLoading ? '⏳ Génération...' : '🚀 Aller plus loin sur ce sujet'}
        </button>
      </div>
    </div>
  );
}
