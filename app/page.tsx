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
          <h3 className="text-3xl font-bold mb-10 text-center" style={{ background: 'linear-gradient(90deg, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textAlign: 'center', fontSize: '2rem', marginBottom: 'var(--space-10)' }}>
            Comment ça marche ?
          </h3>
          <div className="how-it-works-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-6)', width: '100%' }}>
            
            <div className="card card-glass" style={{ padding: 'var(--space-8)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)', position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '8rem', opacity: 0.05, fontWeight: 900 }}>1</div>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.8rem', fontWeight: 'bold', boxShadow: '0 8px 16px rgba(var(--primary-rgb), 0.3)' }}>
                1
              </div>
              <h4 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Choisis un thème</h4>
              <p className="text-muted" style={{ margin: 0, lineHeight: 1.5 }}>Sélectionne ce qui t'intéresse aujourd'hui parmi nos 8 domaines d'exploration.</p>
            </div>

            <div className="card card-glass" style={{ padding: 'var(--space-8)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)', position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '8rem', opacity: 0.05, fontWeight: 900 }}>2</div>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-red))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.8rem', fontWeight: 'bold' }}>
                2
              </div>
              <h4 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Lis ta leçon</h4>
              <p className="text-muted" style={{ margin: 0, lineHeight: 1.5 }}>Une pilule de savoir de 2 minutes générée sur-mesure par l'IA Gemini.</p>
            </div>

            <div className="card card-glass" style={{ padding: 'var(--space-8)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)', position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '8rem', opacity: 0.05, fontWeight: 900 }}>3</div>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-green), var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.8rem', fontWeight: 'bold' }}>
                3
              </div>
              <h4 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Teste-toi</h4>
              <p className="text-muted" style={{ margin: 0, lineHeight: 1.5 }}>Ancre tes connaissances avec un quiz rapide et nos flash cards (SM-2).</p>
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
