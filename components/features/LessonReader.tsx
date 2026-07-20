'use client';
import React, { useEffect, useState } from 'react';
import { LessonContent } from '@/lib/types';

/**
 * LessonReader
 */
export default function LessonReader({ lesson, lessonId, isFavorite, onFavoriteToggle, onComplete }: { lesson: LessonContent; lessonId: string; isFavorite: boolean; onFavoriteToggle: () => void; onComplete: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    console.log('[LESSON_READER] Mounting lesson:', lessonId);
    const handleScroll = () => {
      const scrollPx = document.documentElement.scrollTop;
      const winHeightPx = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      setProgress((scrollPx / winHeightPx) * 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lessonId]);

  const handleAudio = () => {
    const text = lesson.sections.map(s => s.content).join(' ');
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="lesson-reader">
      <div className="lesson-progress-bar" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '4px', zIndex: 50, background: '#e0e0e0' }}>
        <div className="lesson-progress-fill" style={{ width: `${progress}%`, height: '100%', background: 'blue' }}></div>
      </div>
      <div className="lesson-header">
        <h1>{lesson.title}</h1>
        <div className="lesson-meta">
          <span>⏱️ {lesson.estimatedMinutes} min</span>
          <span>💪 {lesson.difficulty}</span>
          <span>📚 {lesson.theme}</span>
        </div>
        <div className="audio-controls" style={{display: 'flex', gap: '8px', marginTop: '1rem'}}>
          <button onClick={onFavoriteToggle} className="btn">
            {isFavorite ? '❤️ Retirer' : '🤍 Favoris'}
          </button>
          <button onClick={handleAudio} className="btn">🔊 Écouter</button>
        </div>
      </div>
      
      {lesson.sections.map((sec, i) => (
        <section key={i} className="lesson-section" style={{marginTop: '2rem'}}>
          <h2>{sec.title}</h2>
          <p>{sec.content}</p>
          <ul className="key-points">
            {sec.keyPoints.map((kp, j) => <li key={j}>{kp}</li>)}
          </ul>
        </section>
      ))}

      <div className="did-you-know" style={{background: '#fef3c7', padding: '1rem', borderRadius: '8px', marginTop: '2rem'}}>
        <strong className="did-you-know-label">💡 Le saviez-vous ?</strong>
        <p>{lesson.didYouKnow}</p>
      </div>

      <div style={{marginTop: '3rem', textAlign: 'center'}}>
        <button onClick={onComplete} className="btn btn-primary btn-lg">Passer au Quiz</button>
      </div>
    </div>
  );
}
