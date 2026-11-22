'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { startNextCycle, updateCycle } from '@/app/actions';
import { rand, type Cycle } from '@/lib/allocation';

function Submit({ label, busy }: { label: string; busy: string }) {
  const { pending } = useFormStatus();
  return <button className="btn primary" disabled={pending}>{pending ? busy : label}</button>;
}
function Msg({ s }: { s: { error?: string; ok?: string } }) {
  return <>{s.error && <span className="err">{s.error}</span>}{s.ok && <span className="ok">{s.ok}</span>}</>;
}

export function CurrentCycleForm({ cycle }: { cycle: Cycle }) {
  const [state, action] = useFormState(updateCycle, {});
  const [amount, setAmount] = useState(String(cycle.monthly_amount));
  return (
    <form className="settings" action={action}>
      <input type="hidden" name="id" value={cycle.id} />
      <label className="field">Name<input name="name" defaultValue={cycle.name} /></label>
      <label className="field">First month<input name="start_month" type="month" defaultValue={cycle.start_month.slice(0, 7)} /></label>
      <label className="field">Number of months<input name="months" type="number" min={1} max={36} defaultValue={cycle.months} /></label>
      <label className="field">Monthly contribution<span className="money"><input name="monthly_amount" type="number" min={10} step={10} value={amount} onChange={(e) => setAmount(e.target.value)} /></span></label>
      <label className="field full">What the money is for<input name="purpose" defaultValue={cycle.purpose} placeholder="Decided at the end-of-cycle meeting" /></label>
      {Number(amount) !== cycle.monthly_amount && (
        <div className="full callout">Changing the monthly amount re-spreads every payment already recorded in this cycle. Members who paid ahead may cover fewer months. The goal stays as it is; adjust it on the Overview page.</div>
      )}
      <div className="full row-actions"><Submit label="Save changes" busy="Saving…" /><Msg s={state} /></div>
    </form>
  );
}

export function NextCycleForm({ current, memberCount, carryCredit, defaultName, defaultStart }: { current?: Cycle; memberCount: number; carryCredit: number; defaultName: string; defaultStart: string }) {
  const [state, action] = useFormState(startNextCycle, {});
  const [amount, setAmount] = useState(current ? String(current.monthly_amount) : '250');
  const [months, setMonths] = useState('6');
  const [confirm, setConfirm] = useState(false);
  const amt = Number(amount) || 0, ms = Number(months) || 0;
  return (
    <form className="settings" action={action}>
      <label className="field">Name<input name="name" defaultValue={defaultName} /></label>
      <label className="field">First month<input name="start_month" type="month" defaultValue={defaultStart} /></label>
      <label className="field">Number of months<input name="months" type="number" min={1} max={36} value={months} onChange={(e) => { setMonths(e.target.value); setConfirm(false); }} /></label>
      <label className="field">Monthly contribution<span className="money"><input name="monthly_amount" type="number" min={10} step={10} value={amount} onChange={(e) => { setAmount(e.target.value); setConfirm(false); }} /></span></label>
      <div className="full callout">
        Goal: <b className="num">{rand(amt * ms * memberCount)}</b> ({memberCount} × {rand(amt)} × {ms}).{' '}
        {current && amt > current.monthly_amount && <>That is {rand(amt - current.monthly_amount)} more per member per month than now. </>}
        {current && (carryCredit > 0 ? `${rand(carryCredit)} of advance credit moves into the new cycle.` : 'Nobody has credit to carry over.')}
      </div>
      <div className="full row-actions">
        {!current ? <Submit label="Start first cycle" busy="Starting…" />
          : !confirm ? <button type="button" className="btn primary" onClick={() => setConfirm(true)}>Close {current.name} and start</button>
          : <><span>Close <b>{current.name}</b>? This cannot be undone.</span><Submit label="Yes, start new cycle" busy="Starting…" /><button type="button" className="btn" onClick={() => setConfirm(false)}>Cancel</button></>}
        <Msg s={state} />
      </div>
    </form>
  );
}
