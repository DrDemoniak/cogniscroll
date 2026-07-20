'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

/**
 * RegisterForm
 * Formulaire d'inscription.
 */
export default function RegisterForm() {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, loginWithGoogle } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[REGISTER_FORM] Inscription');
    if (password.length < 8) return setError('Le mot de passe doit faire au moins 8 caractères.');
    if (password !== confirm) return setError('Les mots de passe ne correspondent pas.');
    
    setError('');
    setLoading(true);
    try {
      await register(email, password, firstName);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('[REGISTER_FORM] Erreur:', err);
      setError('Erreur lors de l\'inscription.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form">
      <h2>Inscription</h2>
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Prénom</label>
          <input className="form-input" type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Mot de passe</label>
          <input className="form-input" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Confirmer</label>
          <input className="form-input" type="password" required value={confirm} onChange={e => setConfirm(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>S'inscrire</button>
      </form>
      <div className="auth-divider">ou</div>
      <button onClick={loginWithGoogle} className="btn google-btn">Continuer avec Google</button>
      <div style={{marginTop: '1rem'}}>Déjà un compte ? <Link href="/auth/login">Se connecter</Link></div>
    </div>
  );
}
