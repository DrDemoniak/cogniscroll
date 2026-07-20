'use client';

import RegisterForm from '@/components/auth/RegisterForm';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Page d'Inscription (Register)
 */
export default function RegisterPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) {
      console.log('[AUTH] Redirection car utilisateur déjà connecté');
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  console.log('[AUTH] Affichage de la page Register');

  return (
    <div className="auth-page flex h-screen container items-center justify-center">
      <div className="auth-left hidden md:flex flex-col justify-center flex-1 p-8">
        <h1 className="text-4xl font-bold mb-4">Rejoins l'aventure !</h1>
        <p className="text-lg">Crée ton compte et commence à apprendre de manière intelligente et ludique.</p>
      </div>
      <div className="auth-right flex-1 p-8 card card-glass max-w-md w-full">
        <RegisterForm />
        <div className="mt-4 text-center">
          <p className="text-sm">
            Déjà un compte ?{' '}
            <Link href="/auth/login" className="text-primary hover:underline font-semibold">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
