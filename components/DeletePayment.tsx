'use client';

import { useState } from 'react';
import { deletePayment } from '@/app/actions';

export function DeletePayment({ id }: { id: string }) {
  const [asking, setAsking] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  if (!asking) return <button className="btn small" onClick={() => setAsking(true)}>Remove</button>;
  return (
    <span className="row-actions">
      <button className="btn small primary" disabled={pending} onClick={async () => { setPending(true); const r = await deletePayment(id).catch(() => ({ error: 'Could not remove. Try again.' })); setPending(false); if (r.error) setError(r.error); }}>
        {pending ? 'Removing…' : 'Yes, remove'}
      </button>
      <button className="btn small" onClick={() => setAsking(false)}>Keep</button>
      {error && <span className="err">{error}</span>}
    </span>
  );
}
