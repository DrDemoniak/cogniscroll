'use client';

/**
 * app/reviews/courses/page.tsx
 * Interface "Révise tes cours" (façon Wooflash) :
 * - Importation de PDF de cours
 * - Génération automatique de Flashcards + Quiz
 * - Gestion et organisation des cours (Ajouter / Éditer / Supprimer des questions)
 * - Session de révision dédiée (Quiz ou Flashcards) par cours
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/layout/AuthGuard';
import Navbar from '@/components/layout/Navbar';
import QuizEngine from '@/components/features/QuizEngine';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import {
  getCustomCourses,
  saveCustomCourse,
  updateCustomCourse,
  deleteCustomCourse,
  addXP,
  recordDailyStats,
  saveQuizResult,
} from '@/lib/firestore';
import type { CustomCourse, CourseQuestion } from '@/lib/types';

export default function CustomCoursesPage() {
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();

  const [courses, setCourses] = useState<CustomCourse[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulaire d'upload / création
  const [file, setFile] = useState<File | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Édition d'un cours
  const [editingCourse, setEditingCourse] = useState<CustomCourse | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<CourseQuestion | null>(null);
  const [isAddQuestionModal, setIsAddQuestionModal] = useState(false);

  // Formulaire nouvelle / édition question
  const [qQuestion, setQQuestion] = useState('');
  const [qAnswer, setQAnswer] = useState('');
  const [qOption0, setQOption0] = useState('');
  const [qOption1, setQOption1] = useState('');
  const [qOption2, setQOption2] = useState('');
  const [qOption3, setQOption3] = useState('');
  const [qCorrectIndex, setQCorrectIndex] = useState(0);
  const [qExplanation, setQExplanation] = useState('');

  // Génération de N questions supplémentaires par l'IA
  const [isGenerateMoreModal, setIsGenerateMoreModal] = useState(false);
  const [requestedCount, setRequestedCount] = useState(5);
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);

  // Mode Révision en cours
  const [activeSession, setActiveSession] = useState<{
    course: CustomCourse;
    mode: 'quiz' | 'flashcards';
  } | null>(null);

  // Flashcards state
  const [fcIndex, setFcIndex] = useState(0);
  const [fcIsFlipped, setFcIsFlipped] = useState(false);

  // ── Chargement des cours de l'utilisateur ──────────────────────────────
  useEffect(() => {
    async function load() {
      if (!user) return;
      console.log('[COURSES] Chargement des cours personnalisés pour:', user.uid);
      try {
        const data = await getCustomCourses(user.uid);
        setCourses(data);
      } catch (err) {
        console.error('[COURSES] Erreur chargement:', err);
        addToast('Erreur lors du chargement des cours', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, addToast]);

  // ── Importation PDF & Génération IA ────────────────────────────────────
  const handleUploadPDF = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !file) {
      addToast('Sélectionne un fichier PDF', 'error');
      return;
    }

    setIsUploading(true);
    console.log('[COURSES] Début envoi du PDF:', file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (courseTitle.trim()) {
        formData.append('title', courseTitle.trim());
      }

      const res = await fetch('/api/generate-course-cards', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erreur lors de la génération');
      }

      const generatedData = await res.json();
      console.log('[COURSES] Questions générées par l\'IA:', generatedData.questions.length);

      // Enregistrement dans Firestore
      const courseId = await saveCustomCourse(user.uid, {
        title: generatedData.title || courseTitle || file.name.replace(/\.pdf$/i, ''),
        description: `Créé à partir de ${file.name}`,
        questions: generatedData.questions,
        createdAt: new Date().toISOString(),
      });

      // Rafraîchit la liste
      const updatedList = await getCustomCourses(user.uid);
      setCourses(updatedList);

      // Reinitialise formulaire
      setFile(null);
      setCourseTitle('');
      addToast(`🎉 Cours "${generatedData.title}" créé avec ${generatedData.questions.length} cartes !`, 'success');
    } catch (err: any) {
      console.error('[COURSES] Erreur création cours:', err);
      addToast(err.message || 'Impossible de traiter le fichier PDF', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // ── Suppression d'un cours ─────────────────────────────────────────────
  const handleDeleteCourse = async (courseId: string, title: string) => {
    if (!user) return;
    if (window.confirm(`Supprimer définitivement le cours "${title}" et toutes ses cartes ?`)) {
      try {
        await deleteCustomCourse(user.uid, courseId);
        setCourses(c => c.filter(item => item.id !== courseId));
        if (editingCourse?.id === courseId) setEditingCourse(null);
        addToast('Cours supprimé', 'success');
      } catch (err) {
        console.error('[COURSES] Erreur suppression:', err);
        addToast('Erreur lors de la suppression', 'error');
      }
    }
  };

  // ── Ouvrir modal Ajout / Édition Question ──────────────────────────────
  const openQuestionModal = (q?: CourseQuestion) => {
    if (q) {
      setEditingQuestion(q);
      setQQuestion(q.question);
      setQAnswer(q.answer);
      setQOption0(q.options[0] || '');
      setQOption1(q.options[1] || '');
      setQOption2(q.options[2] || '');
      setQOption3(q.options[3] || '');
      setQCorrectIndex(q.correctIndex || 0);
      setQExplanation(q.explanation || '');
    } else {
      setEditingQuestion(null);
      setQQuestion('');
      setQAnswer('');
      setQOption0('');
      setQOption1('');
      setQOption2('');
      setQOption3('');
      setQCorrectIndex(0);
      setQExplanation('');
    }
    setIsAddQuestionModal(true);
  };

  // ── Sauvegarde Question (Ajout ou Édition) ─────────────────────────────
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingCourse) return;

    if (!qQuestion.trim() || !qAnswer.trim() || !qOption0.trim() || !qOption1.trim()) {
      addToast('Remplis au moins la question, la réponse et 2 options', 'error');
      return;
    }

    const options = [qOption0.trim(), qOption1.trim(), qOption2.trim() || 'N/A', qOption3.trim() || 'N/A'];

    let updatedQuestions: CourseQuestion[];

    if (editingQuestion) {
      // Édition
      updatedQuestions = editingCourse.questions.map(q =>
        q.id === editingQuestion.id
          ? {
              ...q,
              question: qQuestion.trim(),
              answer: qAnswer.trim(),
              options,
              correctIndex: qCorrectIndex,
              explanation: qExplanation.trim(),
            }
          : q
      );
    } else {
      // Ajout nouvelle question
      const newQ: CourseQuestion = {
        id: `q_user_${Date.now()}`,
        question: qQuestion.trim(),
        answer: qAnswer.trim(),
        options,
        correctIndex: qCorrectIndex,
        explanation: qExplanation.trim(),
      };
      updatedQuestions = [...editingCourse.questions, newQ];
    }

    try {
      await updateCustomCourse(user.uid, editingCourse.id, { questions: updatedQuestions });

      const updatedCourse = { ...editingCourse, questions: updatedQuestions };
      setEditingCourse(updatedCourse);
      setCourses(list => list.map(c => (c.id === editingCourse.id ? updatedCourse : c)));

      setIsAddQuestionModal(false);
      addToast(editingQuestion ? 'Question modifiée' : 'Question ajoutée avec succès', 'success');
    } catch (err) {
      console.error('[COURSES] Erreur sauvegarde question:', err);
      addToast('Erreur lors de la sauvegarde de la question', 'error');
    }
  };

  // ── Supprimer une question ─────────────────────────────────────────────
  const handleDeleteQuestion = async (qId: string) => {
    if (!user || !editingCourse) return;
    if (window.confirm('Supprimer cette question ?')) {
      const updatedQuestions = editingCourse.questions.filter(q => q.id !== qId);
      try {
        await updateCustomCourse(user.uid, editingCourse.id, { questions: updatedQuestions });
        const updatedCourse = { ...editingCourse, questions: updatedQuestions };
        setEditingCourse(updatedCourse);
        setCourses(list => list.map(c => (c.id === editingCourse.id ? updatedCourse : c)));
        addToast('Question supprimée', 'success');
      } catch (err) {
        console.error('[COURSES] Erreur suppression question:', err);
        addToast('Erreur lors de la suppression', 'error');
      }
    }
  };

  // ── Génération IA de N questions supplémentaires (Max 20) ───────────────
  const handleGenerateMoreQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingCourse) return;

    setIsGeneratingMore(true);
    console.log('[COURSES] Génération de', requestedCount, 'questions pour:', editingCourse.title);

    try {
      const res = await fetch('/api/generate-more-course-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseTitle: editingCourse.title,
          existingQuestions: editingCourse.questions,
          requestedCount: requestedCount,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur de génération');
      }

      const data = await res.json();
      if (data.questions && Array.isArray(data.questions)) {
        const updatedQuestions = [...editingCourse.questions, ...data.questions];
        await updateCustomCourse(user.uid, editingCourse.id, { questions: updatedQuestions });

        const updatedCourse = { ...editingCourse, questions: updatedQuestions };
        setEditingCourse(updatedCourse);
        setCourses(list => list.map(c => (c.id === editingCourse.id ? updatedCourse : c)));

        setIsGenerateMoreModal(false);
        addToast(`🤖 ${data.questions.length} nouvelles questions ajoutées avec succès !`, 'success');
      }
    } catch (err: any) {
      console.error('[COURSES] Erreur génération questions supplémentaires:', err);
      addToast(err.message || 'Impossible de générer des questions', 'error');
    } finally {
      setIsGeneratingMore(false);
    }
  };

  // ── Lancer la Révision d'un cours ─────────────────────────────────────
  const handleStartSession = (course: CustomCourse, mode: 'quiz' | 'flashcards') => {
    if (course.questions.length === 0) {
      addToast('Ce cours ne contient aucune question. Ajoutes-en d\'abord !', 'error');
      return;
    }
    setFcIndex(0);
    setFcIsFlipped(false);
    setActiveSession({ course, mode });
  };

  // ── Fin de session Quiz ────────────────────────────────────────────────
  const handleCourseQuizComplete = async (score: number) => {
    if (!user || !activeSession) return;
    const count = activeSession.course.questions.length;
    const xp = score * 5 + 10;

    try {
      await saveQuizResult(user.uid, {
        lessonId: activeSession.course.id,
        lessonTitle: activeSession.course.title,
        theme: 'Cours Perso',
        score,
        totalQuestions: count,
        stars: score === count ? 3 : score >= count / 2 ? 2 : 1,
        completedAt: new Date().toISOString(),
      });
      await addXP(user.uid, xp);
      await recordDailyStats(user.uid, xp);
      await refreshProfile();

      addToast(`🎉 Session terminée ! Score: ${score}/${count} (+${xp} XP)`, 'xp');
      setActiveSession(null);
    } catch (err) {
      console.error('[COURSES] Erreur fin quiz:', err);
    }
  };

  return (
    <AuthGuard>
      <Navbar />
      <div className="page-wrapper">
        <main className="page-content container max-w-4xl py-8">

          {/* ── Mode Session Active (Quiz ou Flashcards) ── */}
          {activeSession ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                <button className="btn btn-ghost" onClick={() => setActiveSession(null)}>
                  ← Quitter la révision
                </button>
                <h2>{activeSession.course.title} — {activeSession.mode === 'quiz' ? '🎯 Quiz' : '🃏 Flash Cards'}</h2>
              </div>

              {activeSession.mode === 'quiz' ? (
                <QuizEngine
                  questions={activeSession.course.questions}
                  onComplete={handleCourseQuizComplete}
                  theme="Cours Perso"
                />
              ) : (
                <div style={{ maxWidth: 600, margin: '0 auto' }}>
                  {/* Progression */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                    <span className="text-muted">Carte {fcIndex + 1} / {activeSession.course.questions.length}</span>
                    <span className="badge badge-primary">{activeSession.course.title}</span>
                  </div>

                  {/* Carte Flip 3D */}
                  {activeSession.course.questions[fcIndex] && (
                    <>
                      <div className="flashcard-scene" onClick={() => setFcIsFlipped(!fcIsFlipped)}>
                        <div className={`flashcard-card ${fcIsFlipped ? 'flipped' : ''}`}>
                          {/* Recto */}
                          <div className="flashcard-front">
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 'var(--space-4)' }}>
                              Question
                            </span>
                            <p style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {activeSession.course.questions[fcIndex].question}
                            </p>
                            <span className="flashcard-hint">👆 Clique pour voir la réponse</span>
                          </div>

                          {/* Verso */}
                          <div className="flashcard-back">
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 'var(--space-3)' }}>
                              Réponse
                            </span>
                            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: 'var(--space-3)' }}>
                              {activeSession.course.questions[fcIndex].answer}
                            </p>
                            {activeSession.course.questions[fcIndex].explanation && (
                              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                {activeSession.course.questions[fcIndex].explanation}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Controls Flashcard */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-8)' }}>
                        <button
                          className="btn btn-secondary"
                          disabled={fcIndex === 0}
                          onClick={() => { setFcIndex(i => i - 1); setFcIsFlipped(false); }}
                        >
                          ← Précédente
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={() => {
                            if (fcIndex + 1 >= activeSession.course.questions.length) {
                              addToast('Session de Flashcards terminée !', 'success');
                              setActiveSession(null);
                            } else {
                              setFcIndex(i => i + 1);
                              setFcIsFlipped(false);
                            }
                          }}
                        >
                          {fcIndex + 1 >= activeSession.course.questions.length ? 'Terminer 🎉' : 'Suivante →'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* En-tête */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-8)' }}>
                <div>
                  <h1 style={{ fontSize: '2.2rem', marginBottom: 'var(--space-2)' }}>📚 Révise tes cours</h1>
                  <p className="text-muted">Importe tes cours en PDF et révise avec tes propres Quiz et Flashcards.</p>
                </div>
                <button className="btn btn-ghost" onClick={() => router.push('/reviews')}>
                  ← Espace Révisions
                </button>
              </div>

              {/* Zone d'importation PDF */}
              <div className="card card-glass" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-8)', border: '1.5px dashed var(--primary)' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  📄 Générer un cours à partir d'un PDF
                </h3>
                <form onSubmit={handleUploadPDF} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
                    <div>
                      <label className="form-label">Titre du cours (optionnel)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ex: Anatomie Chapitre 1"
                        value={courseTitle}
                        onChange={e => setCourseTitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Fichier PDF *</label>
                      <input
                        type="file"
                        accept=".pdf"
                        className="form-input"
                        onChange={e => setFile(e.target.files?.[0] || null)}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    disabled={isUploading || !file}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    {isUploading ? (
                      <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Analyse IA en cours...</>
                    ) : (
                      '🚀 Extraire & Générer les cartes'
                    )}
                  </button>
                </form>
              </div>

              {/* Modal/Vue Éditeur d'un cours sélectionné */}
              {editingCourse ? (
                <div className="card card-elevated" style={{ padding: 'var(--space-8)', marginBottom: 'var(--space-8)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                    <div>
                      <h2 style={{ fontSize: '1.5rem', margin: 0 }}>⚙️ Gestion du cours : {editingCourse.title}</h2>
                      <p className="text-muted" style={{ margin: 0 }}>{editingCourse.questions.length} cartes créées</p>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => setIsGenerateMoreModal(true)}>
                        🤖 Générer par l'IA
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => openQuestionModal()}>
                        ➕ Manuellement
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingCourse(null)}>
                        Fermer l'éditeur
                      </button>
                    </div>
                  </div>

                  {/* Liste des questions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {editingCourse.questions.map((q, idx) => (
                      <div
                        key={q.id}
                        style={{
                          padding: 'var(--space-4)',
                          background: 'var(--surface-secondary)',
                          borderRadius: 'var(--radius-lg)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 'var(--space-4)',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                            {idx + 1}. {q.question}
                          </strong>
                          <span className="text-sm text-muted">
                            Réponse : <strong style={{ color: 'var(--primary)' }}>{q.answer}</strong>
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openQuestionModal(q)} title="Modifier">
                            ✏️
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteQuestion(q.id)} title="Supprimer" style={{ color: 'var(--accent-red)' }}>
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Modal Formulaire Question (Ajout/Édition) */}
              {isAddQuestionModal && editingCourse && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 'var(--space-4)' }}>
                  <div className="card card-elevated" style={{ maxWidth: 540, width: '100%', padding: 'var(--space-6)', maxHeight: '90vh', overflowY: 'auto' }}>
                    <h3 style={{ marginBottom: 'var(--space-4)' }}>
                      {editingQuestion ? '✏️ Modifier la question' : '➕ Ajouter une question'}
                    </h3>
                    <form onSubmit={handleSaveQuestion} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                      <div>
                        <label className="form-label">Question *</label>
                        <input
                          type="text"
                          className="form-input"
                          value={qQuestion}
                          onChange={e => setQQuestion(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="form-label">Réponse exacte (Flashcard) *</label>
                        <input
                          type="text"
                          className="form-input"
                          value={qAnswer}
                          onChange={e => setQAnswer(e.target.value)}
                          required
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                        <div>
                          <label className="form-label">Option A *</label>
                          <input type="text" className="form-input" value={qOption0} onChange={e => setQOption0(e.target.value)} required />
                        </div>
                        <div>
                          <label className="form-label">Option B *</label>
                          <input type="text" className="form-input" value={qOption1} onChange={e => setQOption1(e.target.value)} required />
                        </div>
                        <div>
                          <label className="form-label">Option C</label>
                          <input type="text" className="form-input" value={qOption2} onChange={e => setQOption2(e.target.value)} />
                        </div>
                        <div>
                          <label className="form-label">Option D</label>
                          <input type="text" className="form-input" value={qOption3} onChange={e => setQOption3(e.target.value)} />
                        </div>
                      </div>

                      <div>
                        <label className="form-label">Index de la bonne réponse (0=Option A, 1=B, 2=C, 3=D)</label>
                        <select className="form-input" value={qCorrectIndex} onChange={e => setQCorrectIndex(Number(e.target.value))}>
                          <option value={0}>Option A</option>
                          <option value={1}>Option B</option>
                          <option value={2}>Option C</option>
                          <option value={3}>Option D</option>
                        </select>
                      </div>

                      <div>
                        <label className="form-label">Explication (optionnelle)</label>
                        <textarea className="form-input" rows={2} value={qExplanation} onChange={e => setQExplanation(e.target.value)} />
                      </div>

                      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setIsAddQuestionModal(false)}>
                          Annuler
                        </button>
                        <button type="submit" className="btn btn-primary">
                          Sauvegarder
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Modal Génération de Questions Supplémentaires par l'IA */}
              {isGenerateMoreModal && editingCourse && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 'var(--space-4)' }}>
                  <div className="card card-elevated" style={{ maxWidth: 440, width: '100%', padding: 'var(--space-6)' }}>
                    <h3 style={{ marginBottom: 'var(--space-3)' }}>
                      🤖 Générer de nouvelles questions
                    </h3>
                    <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-4)', lineHeight: 1.5 }}>
                      L'IA va analyser le cours <strong>"{editingCourse.title}"</strong> et générer des cartes inédites sans répéter celles déjà existantes.
                    </p>
                    <form onSubmit={handleGenerateMoreQuestions} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                      <div>
                        <label className="form-label">Nombre de questions supplémentaires (1 à 20 max)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                          <input
                            type="range"
                            min={1}
                            max={20}
                            value={requestedCount}
                            onChange={e => setRequestedCount(Number(e.target.value))}
                            style={{ flex: 1 }}
                          />
                          <span className="badge badge-primary" style={{ minWidth: 48, justifyContent: 'center', fontSize: '1rem', fontWeight: 700 }}>
                            {requestedCount}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
                          {[3, 5, 10, 15, 20].map(num => (
                            <button
                              key={num}
                              type="button"
                              className={`btn btn-sm ${requestedCount === num ? 'btn-primary' : 'btn-ghost'}`}
                              onClick={() => setRequestedCount(num)}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setIsGenerateMoreModal(false)} disabled={isGeneratingMore}>
                          Annuler
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isGeneratingMore}>
                          {isGeneratingMore ? (
                            <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Génération...</>
                          ) : (
                            `🚀 Générer ${requestedCount} questions`
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Mes cours créés */}
              <h2 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-6)' }}>📚 Mes cours sauvegardés ({courses.length})</h2>

              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
                  <div className="spinner" />
                </div>
              ) : courses.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-6)' }}>
                  {courses.map(course => (
                    <div key={course.id} className="card card-glass" style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{course.title}</h3>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleDeleteCourse(course.id, course.title)}
                            style={{ color: 'var(--accent-red)' }}
                            title="Supprimer le cours"
                          >
                            🗑️
                          </button>
                        </div>
                        <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-4)' }}>
                          {course.questions.length} cartes • {course.description || 'Cours importé'}
                        </p>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ flex: 1 }}
                            onClick={() => handleStartSession(course, 'quiz')}
                          >
                            🎯 Quiz
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ flex: 1 }}
                            onClick={() => handleStartSession(course, 'flashcards')}
                          >
                            🃏 Flash Cards
                          </button>
                        </div>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ width: '100%' }}
                          onClick={() => setEditingCourse(course)}
                        >
                          ⚙️ Gérer & Éditer les cartes
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card card-glass" style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: 'var(--space-3)' }}>📭</div>
                  <h3 style={{ marginBottom: 'var(--space-2)' }}>Aucun cours importé</h3>
                  <p className="text-muted">Dépose ton premier fichier PDF ci-dessus pour générer tes révisions !</p>
                </div>
              )}

            </div>
          )}

        </main>
      </div>
    </AuthGuard>
  );
}
