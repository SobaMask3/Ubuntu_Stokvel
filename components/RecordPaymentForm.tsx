'use client';

import { useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { savePayment } from '@/app/actions';
import { allocate, rand, shortMonth, todayISO, type Cycle } from '@/lib/allocation';

type Member = { id: string; full_name: string };
const MAX = 5 * 1024 * 1024;

export function RecordPaymentForm({ cycle, members, paidSoFar }: { cycle: Cycle; members: Member[]; paidSoFar: Record<string, number> }) {
  const [memberId, setMemberId] = useState(members[0]?.id ?? '');
  const [amount, setAmount] = useState(String(cycle.monthly_amount));
  const [paidOn, setPaidOn] = useState(todayISO());
  const [reference, setReference] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [pending, setPending] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const amt = Number(amount) || 0;
  const prior = paidSoFar[memberId] ?? 0;
  const slices = useMemo(() => (amt > 0 ? allocate(cycle, prior, amt) : []), [cycle, prior, amt]);
  const name = members.find((m) => m.id === memberId)?.full_name ?? '';

  function pick(f: File | null) {
    setError('');
    if (f && f.size > MAX) { setError('That file is over 5 MB. Upload a smaller photo or PDF.'); setFile(null); if (fileInput.current) fileInput.current.value = ''; return; }
    setFile(f);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setOk('');
    if (!(amt > 0)) return setError('Enter the amount that was paid.');
    if (!paidOn) return setError('Choose the date the money was paid.');
    if (!file) return setError('Upload the proof of payment before saving.');

    void (async () => {
      setPending(true);
      try {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60);
        const path = `${memberId}/${cycle.id}/${crypto.randomUUID()}-${safe}`;
        const { error: upErr } = await createClient().storage.from('proofs').upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) return setError('The proof of payment did not upload: ' + upErr.message);
        const r = await savePayment({ memberId, cycleId: cycle.id, amount: amt, paidOn, reference, popPath: path });
        if (r.error) return setError(r.error);
        setOk(`${rand(amt)} recorded for ${name}.`);
        setFile(null); setReference(''); setAmount(String(cycle.monthly_amount));
        if (fileInput.current) fileInput.current.value = '';
      } catch {
        setError('Could not save. Check your connection and try again.');
      } finally {
        setPending(false);
      }
    })();
  }

  return (
    <form className="rec" onSubmit={submit} noValidate>
      <label className="field">Member
        <select id="member" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
          {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
        </select>
      </label>
      <label className="field">Amount paid
        <span className="money"><input id="amount" type="number" min={1} step={10} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} /></span>
      </label>
      <label className="field">Date paid<input id="paid_on" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} /></label>
      <label className="field">Reference (optional)<input id="reference" type="text" placeholder="e.g. UBUNTU-SIBO" value={reference} onChange={(e) => setReference(e.target.value)} /></label>
      <label className={`drop full ${file ? 'has' : ''}`}>
        <input ref={fileInput} id="pop" type="file" accept="image/*,application/pdf" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        {file ? <span><b>{file.name}</b><br />Tap to choose a different file</span> : <span><b>Upload proof of payment</b><br />PDF or photo, up to 5 MB</span>}
      </label>
      <div className="alloc full">
        {amt > 0 ? (
          <>
            <b>{name}</b> has paid {rand(prior)} so far this cycle. This {rand(amt)} covers:
            <div className="chips">
              {slices.map((s, i) => s.month === null
                ? <span key={i} className="chip">{rand(s.amount)} credit for next cycle</span>
                : <span key={i} className={`chip ${s.complete ? '' : 'part'}`}>{shortMonth(s.month)}{!s.complete && ` · part (${rand(s.amount)})`}</span>)}
            </div>
          </>
        ) : 'Enter an amount to see which months it covers.'}
      </div>
      <div className="full row-actions">
        <button className="btn primary" disabled={pending}>{pending ? 'Saving…' : 'Save payment'}</button>
        {error && <span className="err">{error}</span>}
        {ok && <span className="ok">{ok}</span>}
      </div>
    </form>
  );
}
