'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Brand } from '@/components/Brand';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(params.get('inactive') ? 'Your membership is not active. Speak to the Treasurer.' : '');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(''); setInfo('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setError('That email and password do not match. Try again or reset your password.');
    router.replace('/');
    router.refresh();
  }

  async function reset() {
    if (!email) return setError('Type your email address first, then tap "Forgot password".');
    setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/auth/confirm?next=/account/password` });
    if (error) return setError(error.message);
    setInfo('Check your email for a link to set a new password.');
  }

  return (
    <main className="auth">
      <Brand />
      <section className="panel">
        <h2 style={{ marginBottom: 14 }}>Members log in</h2>
        <form onSubmit={login}>
          <label className="field">Email<input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="field">Password<input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <div className="row-actions">
            <button className="btn primary" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
            <button type="button" className="btn" onClick={reset}>Forgot password</button>
          </div>
          {error && <p className="err">{error}</p>}
          {info && <p className="ok">{info}</p>}
        </form>
      </section>
      <p className="muted" style={{ fontSize: '.85rem' }}>Only invited members can log in. Ask the Treasurer for an invite.</p>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
