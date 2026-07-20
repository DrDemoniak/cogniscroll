'use client';

import LoginForm from '@/components/auth/LoginForm';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Page de Connexion (Login)
 */
export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) {
      console.log('[AUTH] Redirection car utilisateur déjà connecté');
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  console.log('[AUTH] Affichage de la page Login');

  return (
    <div className="auth-page flex h-screen container items-center justify-center">
      <div className="auth-left hidden md:flex flex-col justify-center flex-1 p-8">
        <h1 className="text-4xl font-bold mb-4">Bon retour !</h1>
        <p className="text-lg">Prêt à continuer ton apprentissage avec CogniScroll ?</p>
      </div>
      <div className="auth-right flex-1 p-8 card card-glass max-w-md w-full">
        <LoginForm />
        <div className="mt-4 text-center">
          <p className="text-sm">
            Pas encore de compte ?{' '}
            <Link href="/auth/register" className="text-primary hover:underline font-semibold">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
