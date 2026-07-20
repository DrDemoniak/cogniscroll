'use client';
import React, { useState } from 'react';
import { QuizQuestion } from '@/lib/types';

/**
 * QuizEngine
 * Moteur interactif pour les quiz de fin de leçon.
 */
export default function QuizEngine({ questions, onComplete, theme }: { questions: QuizQuestion[]; onComplete: (score: number, wrongAnswers: QuizQuestion[]) => void; theme: string }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [wrongAnswers, setWrongAnswers] = useState<QuizQuestion[]>([]);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  console.log('[QUIZ_ENGINE] Init quiz. Questions:', questions.length);

  const handleSelect = (idx: number) => {
    if (selectedOpt !== null) return;
    setSelectedOpt(idx);
    const isCorrect = idx === questions[currentIdx].correctIndex;
    if (isCorrect) setScore(s => s + 1);
    else setWrongAnswers(w => [...w, questions[currentIdx]]);
  };

  const handleNext = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(c => c + 1);
      setSelectedOpt(null);
    } else {
      setFinished(true);
      onComplete(score, wrongAnswers);
    }
  };

  if (finished) {
    const stars = Math.round((score / questions.length) * 3);
    return (
      <div className="quiz-result-card">
        <h2>Quiz Terminé !</h2>
        <div className="quiz-stars">{'⭐'.repeat(stars)}</div>
        <p>Score: {score} / {questions.length}</p>
      </div>
    );
  }

  const q = questions[currentIdx];
  const progress = ((currentIdx) / questions.length) * 100;

  return (
    <div className="quiz-container">
      <div className="progress-bar"><div className="progress-bar-fill" style={{width: `${progress}%`}}></div></div>
      <div className="quiz-question">Question {currentIdx + 1}/{questions.length} : {q.question}</div>
      <div className="quiz-options">
        {q.options.map((opt, i) => {
          let className = 'quiz-option';
          if (selectedOpt !== null) {
            if (i === q.correctIndex) className += ' correct';
            else if (i === selectedOpt) className += ' incorrect';
          }
          return (
            <button key={i} className={className} onClick={() => handleSelect(i)}>
              {['A','B','C','D'][i]}. {opt}
            </button>
          );
        })}
      </div>
      {selectedOpt !== null && (
        <div className="quiz-explanation">
          <strong>Explication : </strong>{q.explanation}
          <div style={{marginTop: '1rem'}}>
            <button className="btn btn-primary" onClick={handleNext}>Question suivante</button>
          </div>
        </div>
      )}
    </div>
  );
}
