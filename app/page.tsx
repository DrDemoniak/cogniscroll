'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Landing Page de CogniScroll
 * Page publique présentant l'application et les fonctionnalités clés.
 */
export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Règle de redirection : si l'utilisateur est déjà connecté, on l'envoie au dashboard
  useEffect(() => {
    if (!loading && user) {
      console.log('[LANDING] Utilisateur connecté détecté, redirection vers /dashboard');
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="loading-overlay flex items-center justify-center h-screen">
        <div className="spinner-lg"></div>
      </div>
    );
  }

  console.log('[LANDING] Affichage de la page d\'accueil publique');

  return (
    <div className="page-wrapper">
      <main className="page-content container flex flex-col items-center gap-6">
        
        {/* Section Hero */}
        <section className="hero-section flex flex-col items-center gap-4 text-center mt-12">
          <div className="hero-badge badge-emoji">🧠 Propulsé par l'IA Gemini</div>
          <h1 className="hero-title text-4xl font-bold">CogniScroll</h1>
          <h2 className="hero-subtitle text-xl text-gray-600">Transforme ton scrolling en superpouvoir</h2>
          <p className="max-w-2xl text-lg">
            Apprends de nouvelles choses passionnantes chaque jour. Un concept de micro-learning propulsé par l'IA avec gamification et révisions espacées.
          </p>
          <div className="hero-actions flex gap-4 mt-6">
            <Link href="/auth/register" className="btn btn-primary btn-lg">Commencer gratuitement</Link>
            <Link href="/auth/login" className="btn btn-secondary btn-lg">Se connecter</Link>
          </div>
        </section>

        {/* Section Features */}
        <section className="features-section w-full mt-16">
          <h3 className="text-2xl font-semibold mb-6 text-center">Pourquoi utiliser CogniScroll ?</h3>
          <div className="features-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="feature-card card card-glass p-6">
              <div className="feature-icon text-3xl mb-4">🤖</div>
              <h4 className="feature-title font-bold mb-2">Micro-Learning IA</h4>
              <p>Des leçons générées sur mesure, courtes et percutantes.</p>
            </div>
            <div className="feature-card card card-glass p-6">
              <div className="feature-icon text-3xl mb-4">🎯</div>
              <h4 className="feature-title font-bold mb-2">Quiz Adaptatif</h4>
              <p>Valide tes connaissances avec des quiz intelligents.</p>
            </div>
            <div className="feature-card card card-glass p-6">
              <div className="feature-icon text-3xl mb-4">🔥</div>
              <h4 className="feature-title font-bold mb-2">Streaks & XP</h4>
              <p>Gagne de l'expérience et maintiens ta flamme d'apprentissage.</p>
            </div>
            <div className="feature-card card card-glass p-6">
              <div className="feature-icon text-3xl mb-4">🧠</div>
              <h4 className="feature-title font-bold mb-2">Révision Espacée</h4>
              <p>N'oublie plus jamais ce que tu as appris grâce à l'algorithme SM-2.</p>
            </div>
            <div className="feature-card card card-glass p-6">
              <div className="feature-icon text-3xl mb-4">📚</div>
              <h4 className="feature-title font-bold mb-2">8 Thématiques</h4>
              <p>Science, Histoire, Technologie... Explore un vaste univers.</p>
            </div>
            <div className="feature-card card card-glass p-6">
              <div className="feature-icon text-3xl mb-4">📱</div>
              <h4 className="feature-title font-bold mb-2">Multi-Device</h4>
              <p>Apprends n'importe où, sur ton téléphone ou ton ordinateur.</p>
            </div>
          </div>
        </section>

        {/* Section How It Works */}
        <section className="how-it-works-section w-full mt-16 mb-16">
          <h3 className="text-2xl font-semibold mb-6 text-center">Comment ça marche ?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">1</div>
              <h4 className="font-semibold">Choisis un thème</h4>
              <p className="text-sm">Sélectionne ce qui t'intéresse aujourd'hui.</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">2</div>
              <h4 className="font-semibold">Lis ta leçon</h4>
              <p className="text-sm">Une pilule de savoir de 2 minutes.</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">3</div>
              <h4 className="font-semibold">Teste-toi</h4>
              <p className="text-sm">Ancre tes connaissances avec un quiz rapide.</p>
            </div>
          </div>
        </section>

        <footer className="w-full text-center py-6 border-t mt-auto">
          <p className="text-sm text-gray-500">© 2026 CogniScroll. Tous droits réservés.</p>
        </footer>

      </main>
    </div>
  );
}
