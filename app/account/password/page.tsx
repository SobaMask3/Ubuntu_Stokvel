'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Brand } from '@/components/Brand';

export default function SetPassword() {
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setError('Use at least 8 characters.');
    if (pw !== pw2) return setError('The two passwords are different.');
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setError(error.message);
    router.replace('/');
    router.refresh();
  }

  return (
    <main className="auth">
      <Brand />
      <section className="panel">
        <h2 style={{ marginBottom: 14 }}>Set your password</h2>
        <form onSubmit={save}>
          <label className="field">New password<input id="pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></label>
          <label className="field">Type it again<input id="pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></label>
          <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button>
          {error && <p className="err">{error}</p>}
        </form>
      </section>
    </main>
  );
}
