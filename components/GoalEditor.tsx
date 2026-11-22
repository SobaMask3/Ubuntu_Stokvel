'use client';

import { useState } from 'react';
import { updateGoal } from '@/app/actions';
import { rand } from '@/lib/allocation';

export function GoalEditor({ cycleId, goal, suggested, breakdown }: { cycleId: string; goal: number; suggested: number; breakdown: string }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(goal));
  const [msg, setMsg] = useState('');
  const [pending, setPending] = useState(false);

  if (!open) return <button className="btn small" onClick={() => { setValue(String(goal)); setOpen(true); setMsg(''); }}>Adjust goal</button>;

  return (
    <form
      className="goal-edit"
      style={{ width: '100%' }}
      onSubmit={(e) => {
        e.preventDefault();
        setPending(true);
        updateGoal(cycleId, Number(value))
          .then((r) => { if (r.error) setMsg(r.error); else setOpen(false); })
          .catch(() => setMsg('Could not save. Check your connection and try again.'))
          .finally(() => setPending(false));
      }}
    >
      <label className="field" style={{ flex: '1 1 160px' }}>New goal
        <span className="money"><input id="goal" type="number" min={1} step={50} inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} autoFocus /></span>
      </label>
      <div className="row-actions" style={{ alignSelf: 'flex-end' }}>
        <button className="btn primary" disabled={pending}>{pending ? 'Saving…' : 'Save goal'}</button>
        <button type="button" className="btn" onClick={() => setValue(String(suggested))}>Use {rand(suggested)} ({breakdown})</button>
        <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
      </div>
      {msg && <p className="err" style={{ width: '100%' }}>{msg}</p>}
    </form>
  );
}
